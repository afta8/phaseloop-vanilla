// src/fileHandler.js

import JSZip from 'jszip';
import { dom, getScenes, getTracks, getGlobal, getActiveScene, getGroup } from './state/data.js';
import { addScene, setGlobal } from './state/actions.js';
import { generatePeakData } from './audio.js';
import { setupUI } from './ui/uiOrchestrator.js';
import { showError } from './ui/globalUI.js';
import { stopAllPlayback, startAllPlayback } from './controllers/playbackController.js';
import { LOD_BLOCK_SIZES, SUPPORTED_AUDIO_EXTENSIONS, MAX_TRACKS } from './config.js';

function isAudioFile(filename) {
    const lowercased = filename.toLowerCase();
    if (lowercased.startsWith('__macosx/') || lowercased.endsWith('.ds_store')) {
        return false;
    }
    return SUPPORTED_AUDIO_EXTENSIONS.some(ext => lowercased.endsWith(ext));
}

function parseTrackNumber(filename) {
    const match = filename.match(/^(\d+)\s+.*/);
    if (match && match[1]) {
        const trackNum = parseInt(match[1], 10);
        if (trackNum >= 1 && trackNum <= MAX_TRACKS) {
            return trackNum - 1;
        }
    }
    return null;
}

export function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    handleFiles(files);
}

export async function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    dom.uploadBox.classList.remove('bg-gray-600');
    const items = event.dataTransfer.items;
    const files = [];
    const promises = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
            promises.push(traverseFileTree(entry, files));
        }
    }
    await Promise.all(promises);
    handleFiles(files);
}

function traverseFileTree(item, fileList) {
    return new Promise(resolve => {
        if (item.isFile) {
            item.file(file => {
                fileList.push(file);
                resolve();
            });
        } else if (item.isDirectory) {
            const dirReader = item.createReader();
            const readEntries = () => {
                dirReader.readEntries(entries => {
                    if (entries.length > 0) {
                        const promises = [];
                        for (const entry of entries) {
                            promises.push(traverseFileTree(entry, fileList));
                        }
                        Promise.all(promises).then(() => readEntries());
                    } else {
                        resolve();
                    }
                });
            };
            readEntries();
        } else {
            resolve();
        }
    });
}

export async function handleFiles(incomingFiles) {
    if (!incomingFiles || incomingFiles.length === 0) return;

    dom.loadingIndicator.classList.remove('hidden');
    dom.errorMessageDiv.classList.add('hidden');

    let allFiles = [];
    const zipPromises = [];

    for (const file of incomingFiles) {
        if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
            zipPromises.push(JSZip.loadAsync(file).then(zip => {
                const audioFilePromises = [];
                zip.forEach((relativePath, zipEntry) => {
                    if (!zipEntry.dir && isAudioFile(zipEntry.name)) {
                        const promise = zipEntry.async('blob').then(blob => new File([blob], zipEntry.name, { type: blob.type }));
                        audioFilePromises.push(promise);
                    }
                });
                return Promise.all(audioFilePromises);
            }));
        } else {
            allFiles.push(file);
        }
    }

    try {
        const extractedFileArrays = await Promise.all(zipPromises);
        extractedFileArrays.forEach(fileArray => {
            allFiles.push(...fileArray);
        });
    } catch (err) {
        console.error("Error processing ZIP file:", err);
        showError("Could not read the ZIP file. It might be corrupt.");
        dom.loadingIndicator.classList.add('hidden');
        return;
    }

    const audioFiles = allFiles.filter(file => file.type.startsWith('audio/') || isAudioFile(file.name));

    if (audioFiles.length === 0) {
        showError("No supported audio files were found in the upload.");
        dom.loadingIndicator.classList.add('hidden');
        return;
    }

    const audioContext = getGlobal('audioContext');

    const decodePromises = audioFiles.map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                audioContext.decodeAudioData(e.target.result)
                    .then(async buffer => {
                        const peakDataLevels = {
                            coarse: await generatePeakData(buffer, LOD_BLOCK_SIZES.coarse),
                            medium: await generatePeakData(buffer, LOD_BLOCK_SIZES.medium),
                            fine: await generatePeakData(buffer, LOD_BLOCK_SIZES.fine),
                            superfine: await generatePeakData(buffer, LOD_BLOCK_SIZES.superfine),
                        };
                        resolve({ file, buffer, peakDataLevels });
                    })
                    .catch(err => reject({ file, err, message: `Could not decode audio from: ${file.name}` }));
            };
            reader.onerror = () => reject({ file, err: 'File could not be read.'});
            reader.readAsArrayBuffer(file);
        });
    });

    try {
        const results = await Promise.all(decodePromises);

        const wasPlaying = getGlobal('isPlaying');

        if (wasPlaying) {
            stopAllPlayback();
        }

        const globalTracks = getTracks();
        const newAudioAssignments = new Map();
        const unassignedFiles = [];

        results.forEach(result => {
            const trackIndex = parseTrackNumber(result.file.name);
            const audioData = {
                name: result.file.name,
                audioBuffer: result.buffer,
                peakDataLevels: result.peakDataLevels,
            };

            if (trackIndex !== null) {
                const targetTrack = globalTracks[trackIndex];
                if (targetTrack && !newAudioAssignments.has(targetTrack.id)) {
                    newAudioAssignments.set(targetTrack.id, audioData);
                } else {
                    unassignedFiles.push(audioData);
                }
            } else {
                unassignedFiles.push(audioData);
            }
        });

        unassignedFiles.forEach(audioData => {
            const nextAvailableTrack = globalTracks.find(track => !newAudioAssignments.has(track.id));
            if (nextAvailableTrack) {
                newAudioAssignments.set(nextAvailableTrack.id, audioData);
            }
        });
        
        let maxDuration = 0;
        for (const audioData of newAudioAssignments.values()) {
            if (audioData.audioBuffer.duration > maxDuration) {
                maxDuration = audioData.audioBuffer.duration;
            }
        }
        
        const existingScenes = getScenes();
        const newScene = addScene({
            audioAssignments: newAudioAssignments,
            masterDuration: maxDuration,
        });

        if (existingScenes.length > 0) {
            const firstGroup = getGroup(existingScenes[0].groupId);
            const newGroup = getGroup(newScene.groupId);
            if (firstGroup && newGroup) {
                newGroup.loopStart = firstGroup.loopStart;
            }
        }
        
        setGlobal('activeSceneId', newScene.id);
        setupUI();

        if (wasPlaying) {
            startAllPlayback();
        }

    } catch (error) {
        console.error("Error decoding audio files:", error);
        showError(error.message || `An audio file might be corrupt or in an unsupported format.`);
    }
}