// src/controllers/playbackController.js

import { getGlobal, getActiveScene, getTracks, getAudioForTrack, forEachSourceNode, getGroup } from '../state/data.js';
import { setGlobal, setSourceNode, clearSourceNodes } from '../state/actions.js';
import { updateAudioAndUI } from '../ui/uiOrchestrator.js';
import { runAnimationFrame } from '../rendering/animationLoop.js';

export async function toggleAllPlayback() {
    if (getGlobal('isPlaying')) {
        stopAllPlayback();
    } else {
        const audioContext = getGlobal('audioContext');
        if (audioContext.state === 'suspended') await audioContext.resume();
        
        setGlobal('playbackStartTime', audioContext.currentTime);
        startAllPlayback();
    }
}

export function startAllPlayback() {
    const activeScene = getActiveScene();
    if (!activeScene || activeScene.audioAssignments.size === 0) return;

    if (getGlobal('isPlaying')) {
        stopAllPlayback();
    }

    const audioContext = getGlobal('audioContext');
    setGlobal('isPlaying', true);

    const masterStartTime = getGlobal('playbackStartTime');
    if (masterStartTime === null) {
        console.error("Playback started without a master start time.");
        setGlobal('isPlaying', false); // Revert playing state
        return;
    }
    const elapsed = audioContext.currentTime - masterStartTime;
    
    const group = getGroup(activeScene.groupId);
    const groupPlayheadPosition = group.loopStart + elapsed;

    const globalTracks = getTracks();

    // --- BUG FIX ---
    // The key change is here. We now create an audio source for EVERY track that has audio,
    // regardless of its mute or solo state. The audibility is controlled entirely by the
    // gainNode, which is managed by updateAudioAndUI().

    globalTracks.forEach(track => {
        const audioData = getAudioForTrack(track.id);
        // We only check if audioData exists.
        if (audioData) {
            const source = audioContext.createBufferSource();
            source.buffer = audioData.audioBuffer;
            source.loop = true;
            source.loopStart = 0;
            source.loopEnd = audioData.audioBuffer.duration;
            source.connect(track.gainNode);
            
            const offset = groupPlayheadPosition % audioData.audioBuffer.duration;
            source.start(0, offset);
            setSourceNode(track.id, source);
        }
    });

    updateAudioAndUI();
    runAnimationFrame();
}

export function stopAllPlayback() {
    if (!getGlobal('isPlaying')) return; 

    forEachSourceNode(node => {
        try {
            node.stop();
            node.disconnect();
        } catch (e) {}
    });
    clearSourceNodes();
    setGlobal('isPlaying', false);
    updateAudioAndUI();
    runAnimationFrame();
}