// src/controllers/abletonAlsExporterController.js

import { getScenes, getGlobal, getGroup, getTracks } from '../state/data.js';
import { createRealignedWavBlob } from '../audio.js';
import { showError } from '../ui/globalUI.js';
import { AbletonAlsExporter } from '../lib/ableton-als-exporter.js';

/**
 * A helper function to detect the first valid BPM from any audio filename in a scene.
 * @param {Array<Scene>} scenes - The array of scenes to search through.
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
 * The main export handler that uses the AbletonAlsExporter class.
 */
export async function handleAlsExport() {
    const button = document.getElementById('export-als-btn');
    const buttonText = document.getElementById('export-als-btn-text');
    if (!button || !buttonText) return;

    const originalText = 'Export .als';
    const scenes = getScenes().filter(s => s.audioAssignments.size > 0);
    const tracks = getTracks();

    if (scenes.length === 0) return;

    button.disabled = true;
    buttonText.textContent = 'Building...';

    try {
        const exporter = new AbletonAlsExporter();
        const audioContext = getGlobal('audioContext');

        const detectedTempo = detectTempoFromFilenames(scenes) || 120;
        exporter.setTempo(detectedTempo);

        tracks.forEach(track => exporter.addTrack({ name: track.id.replace(/track_(\d+).*/, 'Track $1') }));
        
        scenes.forEach(scene => {
            const group = getGroup(scene.groupId);
            exporter.addScene({ name: scene.name, colorHex: group.colorTheme.hex });
        });

        for (const [sceneIndex, scene] of scenes.entries()) {
            const group = getGroup(scene.groupId);
            const finalLoopStart = group.loopStart;
            const trackIds = Array.from(scene.audioAssignments.keys());

            for (const [trackIndex, trackId] of tracks.map(t => t.id).entries()) {
                if (scene.audioAssignments.has(trackId)) {
                    const audioData = scene.audioAssignments.get(trackId);
                    const wavBlob = createRealignedWavBlob(audioData, finalLoopStart, audioContext);
                    const sanitizedFileName = audioData.name.replace(/\.[^/.]+$/, ".wav");
                    const audioDurationInSeconds = audioData.audioBuffer.duration;
                    const clipDurationInBeats = (audioDurationInSeconds * detectedTempo) / 60;

                    exporter.addClip(sceneIndex, trackIndex, {
                        name: sanitizedFileName,
                        file: wavBlob,
                        bpm: detectedTempo,
                        loop: true,
                        warpMode: 4, // Complex Pro
                        duration: audioDurationInSeconds,
                        lengthInBeats: clipDurationInBeats,
                    });
                }
            }
        }
        
        const projectBlob = await exporter.generateProjectZip();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(projectBlob);
        a.download = 'phaseloop-session.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);

    } catch (err) {
        console.error("Error creating .als file:", err);
        showError("Failed to create .als file.");
    } finally {
        button.disabled = false;
        buttonText.textContent = originalText;
    }
}