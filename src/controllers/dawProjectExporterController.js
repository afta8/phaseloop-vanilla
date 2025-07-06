// src/controllers/dawProjectExporterController.js

import { getScenes, getGlobal, getGroup, getTracks, dom } from '../state/data.js';
import { createRealignedWavBlob } from '../audio.js';
import { showError } from '../ui/globalUI.js';
import { SimpleDawProjectExporter } from '../lib/daw-project-exporter.js';

/**
 * A helper function to generate all the necessary realigned audio blobs for the session.
 * @param {Array} scenes - The scenes to process.
 * @returns {Promise<Map<string, Map<string, {name: string, blob: Blob}>>>}
 */
async function createRealignedWavBlobs(scenes) {
    const audioContext = getGlobal('audioContext');
    const blobs = new Map();

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
        blobs.set(scene.id, sceneBlobs);
    }
    return blobs;
}

/**
 * Iterates through scenes to find the first filename containing a BPM value.
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
 * The main export handler that uses the SimpleDawProjectExporter class.
 */
export async function handleDawProjectExport() {
    const button = dom.exportDawProjectBtn;
    const buttonText = document.getElementById('export-dawproject-btn-text');
    if (!button || !buttonText) return;

    const originalText = 'Export .dawproject';
    const scenes = getScenes().filter(s => s.audioAssignments.size > 0);
    const tracks = getTracks();

    if (scenes.length === 0) return;

    button.disabled = true;
    buttonText.textContent = 'Building...';

    try {
        const exporter = new SimpleDawProjectExporter();

        const detectedTempo = detectTempoFromFilenames(scenes) || 120;
        exporter.setTempo(detectedTempo);

        tracks.forEach((track, index) => {
            const trackName = `Track ${index + 1}`;
            exporter.addTrack(trackName);
        });

        scenes.forEach(scene => {
            const group = getGroup(scene.groupId);
            const sceneColor = group ? group.colorTheme.hex : undefined;
            exporter.addScene(scene.name, { color: sceneColor });
        });

        const allWavBlobs = await createRealignedWavBlobs(scenes);

        for (const scene of scenes) {
            const sceneBlobs = allWavBlobs.get(scene.id);
            if (sceneBlobs) {
                for (const [trackId, { name, blob }] of sceneBlobs.entries()) {
                    const trackIndex = tracks.findIndex(t => t.id === trackId);
                    const appTrackAudioData = scene.audioAssignments.get(trackId);

                    if (trackIndex !== -1 && appTrackAudioData) {
                        const trackName = `Track ${trackIndex + 1}`;
                        
                        const audioDurationInSeconds = appTrackAudioData.audioBuffer.duration;
                        const beatsPerSecond = detectedTempo / 60;
                        const clipDurationInBeats = Math.round(audioDurationInSeconds * beatsPerSecond);

                        exporter.addAudioClip(
                            trackName, 
                            scene.name, 
                            blob, 
                            name, 
                            clipDurationInBeats, 
                            audioDurationInSeconds, 
                            { playStartInSeconds: 0 }
                        );
                    }
                }
            }
        }

        const projectBlob = await exporter.generateProjectBlob();

        const a = document.createElement('a');
        a.href = URL.createObjectURL(projectBlob);
        a.download = 'phaseloop-session.dawproject';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

    } catch (err) {
        console.error("Error creating .dawproject file:", err);
        showError("Failed to create .dawproject file.");
    } finally {
        button.disabled = false;
        buttonText.textContent = originalText;
    }
}