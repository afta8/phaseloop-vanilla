// src/ui/uiOrchestrator.js

import { dom, getGlobal, getActiveScene, getScenes, getTracks, getAudioForTrack, getGroup } from '../state/data.js';
import { setGlobal, setScenes, reorderScene } from '../state/actions.js';
import { drawWaveform } from '../rendering/waveformRenderer.js';
import { drawRuler } from '../rendering/rulerRenderer.js';
import { handleDragStart } from '../controllers/waveformInteraction.js';
import { stopAllPlayback, startAllPlayback, toggleAllPlayback } from '../controllers/playbackController.js';
import { renderSceneTabs, closeContextMenu } from './sceneTabs.js';
import { createTrackShell, getWaveformAreaHTML, updateTrackMuteSoloStyles } from './trackUI.js';
import { updateGlobalZoomButtons } from './globalUI.js';

export function setupUI() {
    renderSceneTabs();
    
    if (dom.tracksContainer.childElementCount > 0) {
        updateWaveformDisplays();
    } else {
        buildFullUI();
    }
}

function buildFullUI() {
    const globalTracks = getTracks();
    
    const dropIndicator = document.createElement('div');
    dropIndicator.id = 'drop-indicator';
    dom.sceneTabsScrollArea.appendChild(dropIndicator);
    dom.dropIndicator = dropIndicator;

    globalTracks.forEach(track => {
        const trackShell = createTrackShell(track);
        dom.tracksContainer.appendChild(trackShell);
    });

    const trackElements = dom.tracksContainer.children;
    if (trackElements.length > 0) {
        const firstSlot = trackElements[0];
        firstSlot.querySelector('.flex-shrink-0').classList.add('rounded-tl-lg');
        
        const lastSlot = trackElements[trackElements.length - 1];
        lastSlot.querySelector('.flex-shrink-0').classList.add('rounded-bl-lg');
    }
    
    updateWaveformDisplays();
}

function updateWaveformDisplays() {
    const activeScene = getActiveScene();
    if (!activeScene) {
        dom.transportControls.style.display = 'none';
        dom.playButtonContainer.style.display = 'none';
        dom.mainApp.classList.add('hidden');
        dom.uploadScreen.style.display = 'block';
        if(dom.sceneTabsContainer) dom.sceneTabsContainer.innerHTML = '';
        dom.timelineRuler.style.display = 'none';
        return;
    }

    dom.timelineRuler.style.display = 'block';

    const globalTracks = getTracks();
    const group = getGroup(activeScene.groupId);

    globalTracks.forEach(track => {
        const trackElement = document.getElementById(`track-${track.id}`);
        const waveformWrapper = trackElement.querySelector('.waveform-area-wrapper');
        const audioData = activeScene.audioAssignments.get(track.id);
        
        waveformWrapper.innerHTML = getWaveformAreaHTML(track.id, audioData);
        
        const waveformMask = waveformWrapper.querySelector('.waveform-mask');
        if (waveformMask) {
            waveformMask.addEventListener('mousedown', handleDragStart);
            waveformMask.addEventListener('touchstart', handleDragStart, { passive: false });
        }
    });
    
    dom.transportControls.style.display = 'flex';
    dom.playButtonContainer.style.display = 'block';
    dom.uploadScreen.style.display = 'none';
    dom.mainApp.classList.remove('hidden');
    dom.loadingIndicator.classList.add('hidden');

    requestAnimationFrame(() => {
        drawRuler();
        globalTracks.forEach(track => {
            const audioData = getAudioForTrack(track.id);
            if (audioData) {
                drawWaveform(track, audioData, activeScene, group.loopStart);
            }
        });
        
        const hasAudio = activeScene.audioAssignments.size > 0;
        dom.exportBtn.disabled = !hasAudio;
        dom.exportSelectedBtn.disabled = !hasAudio;
        dom.playAllBtn.disabled = !hasAudio;
        updateAudioAndUI();
        updateGlobalZoomButtons();
    });
}

export function updateAudioAndUI() {
    const globalTracks = getTracks();
    if (globalTracks.length === 0) return;

    const isAnyTrackSoloed = globalTracks.some(t => t.isSoloed);
    const audioContext = getGlobal('audioContext');
    const isPlaying = getGlobal('isPlaying');

    globalTracks.forEach(track => {
        const audioData = getAudioForTrack(track.id);
        const shouldPlay = audioData && ((isAnyTrackSoloed && track.isSoloed) || (!isAnyTrackSoloed && !track.isMuted));

        if (track.gainNode) {
            track.gainNode.gain.setValueAtTime(shouldPlay ? 1 : 0, audioContext.currentTime);
        }

        const trackElement = document.getElementById(`track-${track.id}`);
        if (!trackElement) return;

        trackElement.classList.toggle('track-inactive', !shouldPlay && !!audioData);
        
        updateTrackMuteSoloStyles(track, isAnyTrackSoloed);
    });
    
    const playBtn = dom.playAllBtn;
    if (playBtn) {
        playBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700', 'bg-rose-600', 'hover:bg-rose-700');

        if (isPlaying) {
            playBtn.classList.add('bg-rose-600', 'hover:bg-rose-700');
        } else {
            playBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }
    }
    
    dom.playIcon.classList.toggle('hidden', isPlaying);
    dom.stopIcon.classList.toggle('hidden', !isPlaying);
}

export function resetApplicationState(fullReset = true) {
    if (getGlobal('isPlaying')) {
        stopAllPlayback();
    }
    closeContextMenu();
    
    if (fullReset) {
        setScenes([]);
        setGlobal('activeSceneId', null);
        setGlobal('zoomLevel', 1.0);
        getTracks().forEach(track => {
            track.isMuted = false;
            track.isSoloed = false;
        });
        dom.tracksContainer.innerHTML = '';
        dom.mainApp.classList.add('hidden');
        dom.playButtonContainer.style.display = 'none';
        dom.transportControls.style.display = 'none';
        dom.uploadScreen.style.display = 'block';
        dom.fileInput.value = '';
        dom.exportBtn.disabled = true;
        dom.exportSelectedBtn.disabled = true;
        dom.playAllBtn.disabled = true;
    }
}