// src/controllers/abletonAlsExporterController.js

import { getScenes, getGlobal, getGroup, getTracks, dom } from '../state/data.js';
import { createRealignedWavBlob } from '../audio.js';
import { showError } from '../ui/globalUI.js';
import { AbletonAlsExporter } from '../lib/ableton-als-exporter.js';

/**
 * Iterates through scenes to find the first filename containing a BPM value.
 * This is borrowed from the dawProjectExporterController.
 * @param {Array} scenes - The scenes to search through.
 * @returns {number|null} The detected BPM or null if not found.
 */
function detectTempoFromFilenames(scenes) {
    for (const scene of scenes) {
        for (const audioData of scene.audioAssignments.values()) {
            const match = audioData.name.match(/(\d{2,3}(?:\.\d+)?)\s*BPM/i);
            if (match && match[1]) {
                const tempo = parseFloat(match[1]);
                if (!isNaN(tempo)) {
                    return tempo;
                }
            }
        }
    }
    return null;
}

/**
 * A helper function to generate all the necessary realigned audio blobs for the session.
 * @param {Array} scenes - The scenes to process.
 * @returns {Promise<Map<string, Map<string, {name: string, blob: Blob}>>>}
 */
async function createAllRealignedBlobs(scenes) {
    const audioContext = getGlobal('audioContext');
    const allBlobs = new Map();

    for (const scene of scenes) {
        if (scene.audioAssignments.size === 0) continue;

        const group = getGroup(scene.groupId);
        const finalLoopStart = group.loopStart;
        const sceneBlobs = new Map();

        for (const [trackId, audioData] of scene.audioAssignments.entries()) {
            const wavBlob = createRealignedWavBlob(audioData, finalLoopStart, audioContext);
            const sanitizedFileName = audioData.name.replace(/\.[^/.]+$/, "");
            sceneBlobs.set(trackId, { name: `realigned_${sanitizedFileName}.wav`, blob: wavBlob });
        }
        allBlobs.set(scene.id, sceneBlobs);
    }
    return allBlobs;
}


/**
 * The main export handler that uses the AbletonAlsExporter class.
 */
export async function handleAbletonExport() {
    const button = dom.exportAlsBtn;
    const buttonText = dom.exportAlsBtnText;
    if (!button || !buttonText) return;

    const exportSelectedOnly = getGlobal('exportSelectedOnly');
    const originalText = buttonText.textContent;
    let scenes = exportSelectedOnly ? [getActiveScene()] : getScenes();
    scenes = scenes.filter(s => s && s.audioAssignments.size > 0);
    const tracks = getTracks();

    if (scenes.length === 0) return;

    button.disabled = true;
    buttonText.textContent = 'Building...';

    try {
        const exporter = new AbletonAlsExporter();
        
        const detectedTempo = detectTempoFromFilenames(scenes) || 120;
        exporter.setTempo(detectedTempo);

        tracks.forEach((_, index) => {
            exporter.addTrack({ name: `Track ${index + 1}` });
        });

        scenes.forEach(scene => {
            const group = getGroup(scene.groupId);
            const colorHex = group ? group.colorTheme.hex : '#8c8c8c'; // Default gray if no group
            exporter.addScene({ name: scene.name, colorHex });
        });

        const allRealignedBlobs = await createAllRealignedBlobs(scenes);

        scenes.forEach((scene, sceneIndex) => {
            const sceneBlobs = allRealignedBlobs.get(scene.id);
            if (sceneBlobs) {
                tracks.forEach((track, trackIndex) => {
                    const audioData = scene.audioAssignments.get(track.id);
                    if (audioData) {
                        const { name, blob } = sceneBlobs.get(track.id);
                        const lengthInBeats = audioData.audioBuffer.duration * (detectedTempo / 60);

                        exporter.addClip(sceneIndex, trackIndex, {
                            file: blob,
                            name: name,
                            bpm: detectedTempo,
                            loop: true,
                            warpMode: 0, // 'Beats'
                            duration: audioData.audioBuffer.duration,
                            lengthInBeats: lengthInBeats,
                        });
                    }
                });
            }
        });

        const projectZipBlob = await exporter.generateProjectZip();
        const projectName = exportSelectedOnly ? `phaseloop_${scenes[0].name.replace(/[\s/]/g, '_')}` : `phaseloop-session-${Date.now()}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(projectZipBlob);
        downloadLink.download = `${projectName}.als.zip`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);

    } catch (err) {
        console.error("Error creating Ableton Live Set:", err);
        showError("Failed to create Ableton Live Set.");
    } finally {
        button.disabled = false;
        buttonText.textContent = originalText;
    }
}