// src/controllers/exportController.js

import { dom, getScenes, getActiveScene, getAudioForTrack, getGlobal, getGroup } from '../state/data.js';
import { bufferToWav, findNearestZeroCrossing } from '../audio.js';
import { showError } from '../ui/globalUI.js';

async function performExport(scenes, zipFileName) {
    const zip = new JSZip();
    const groupFinalLoopStarts = new Map();

    const groupsToProcess = [...new Set(scenes.map(s => s.groupId))];
    for (const groupId of groupsToProcess) {
        let groupLoopStart = getGroup(groupId).loopStart;
        if (dom.snapToggle.checked) {
            const firstSceneOfGroup = scenes.find(s => s.groupId === groupId && s.audioAssignments.size > 0);
            if (firstSceneOfGroup) {
                const firstAudioTrackId = firstSceneOfGroup.audioAssignments.keys().next().value;
                if (firstAudioTrackId) {
                    const audioData = firstSceneOfGroup.audioAssignments.get(firstAudioTrackId);
                    groupLoopStart = findNearestZeroCrossing(audioData, groupLoopStart);
                }
            }
        }
        groupFinalLoopStarts.set(groupId, groupLoopStart);
    }

    const audioContext = getGlobal('audioContext');

    for (const scene of scenes) {
        if (scene.audioAssignments.size === 0) continue;

        const sceneFolder = zip.folder(scene.name.replace(/[\s/]/g, '_'));
        const finalLoopStart = groupFinalLoopStarts.get(scene.groupId);

        for (const [trackId, audioData] of scene.audioAssignments.entries()) {
            const startSample = Math.floor((finalLoopStart % audioData.audioBuffer.duration) * audioData.audioBuffer.sampleRate);
            const newBuffer = audioContext.createBuffer(audioData.audioBuffer.numberOfChannels, audioData.audioBuffer.length, audioData.audioBuffer.sampleRate);

            for (let i = 0; i < audioData.audioBuffer.numberOfChannels; i++) {
                const oldChannelData = audioData.audioBuffer.getChannelData(i);
                const newChannelData = newBuffer.getChannelData(i);
                
                const firstPart = oldChannelData.subarray(startSample);
                newChannelData.set(firstPart, 0);
                
                const secondPart = oldChannelData.subarray(0, startSample);
                newChannelData.set(secondPart, firstPart.length);
            }
            const wavBlob = bufferToWav(newBuffer);
            const sanitizedFileName = audioData.name.replace(/\.[^/.]+$/, "");
            sceneFolder.file(`realigned_${sanitizedFileName}.wav`, wavBlob);
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

export async function exportAllAsZip() {
    const allScenes = getScenes();
    if (!allScenes || allScenes.length === 0) return;
    
    dom.exportBtn.disabled = true;
    dom.exportBtnText.textContent = "Exporting...";

    try {
        await performExport(allScenes, 'realigned_session.zip');
    } catch (err) {
        console.error("Error during 'Export All' zipping process:", err);
        showError("An error occurred during the export process.");
    } finally {
        dom.exportBtn.disabled = false;
        dom.exportBtnText.textContent = "Export All";
    }
}

export async function exportSelectedAsZip() {
    const activeScene = getActiveScene();
    if (!activeScene) return;

    dom.exportSelectedBtn.disabled = true;
    dom.exportSelectedBtnText.textContent = "Exporting...";

    try {
        const sanitizedSceneName = activeScene.name.replace(/[\s/]/g, '_');
        await performExport([activeScene], `realigned_${sanitizedSceneName}.zip`);
    } catch (err) {
        console.error("Error during 'Export Selected' zipping process:", err);
        showError("An error occurred during the export process.");
    } finally {
        dom.exportSelectedBtn.disabled = false;
        dom.exportSelectedBtnText.textContent = "Export Selected";
    }
}