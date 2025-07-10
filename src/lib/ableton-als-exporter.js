/**
 * ableton-als-exporter.js
 * A self-contained, single-file JavaScript library for creating Ableton Live Set (.als) files.
 *
 * Author: Aftab Hussain
 *
 * Licensed under the MIT License.
 * Source code available at: https://github.com/afta8/ableton-project-stager
 *
 * This module is designed for a client-side web application environment
 * and depends on 'jszip' and 'pako', which are expected to be available
 * in the host application.
 */

import JSZip from 'jszip';
import pako from 'pako';

// --- Internal Constants & Helpers (Encapsulated) ---

const WARP_MODES = {
    0: 'Beats', 1: 'Tones', 2: 'Texture', 3: 'Re-Pitch', 4: 'Complex'
};

const ABLETON_COLOR_PALETTE = {
    0: '#f78f8f', 1: '#f7b08f', 2: '#f7c88f', 3: '#f7e08f', 4: '#f3f78f',
    5: '#d3f78f', 6: '#b3f78f', 7: '#93f78f', 8: '#8ff7a8', 9: '#8ff7c4',
    10: '#8ff7e0', 11: '#8ff7f7', 12: '#8fe0f7', 13: '#8fc8f7', 14: '#8fb0f7',
    15: '#938ff7', 16: '#b38ff7', 17: '#d38ff7', 18: '#f38ff7', 19: '#f78fe0',
    20: '#f78fc8', 21: '#f78fb0', 22: '#ffffff', 23: '#ec0000', 24: '#ec6e00',
    25: '#ec9a00', 26: '#ecc600', 27: '#ecec00', 28: '#9acc00', 29: '#68cc00',
    30: '#00cc00', 31: '#00cc6f', 32: '#00cc9b', 33: '#00ccc7', 34: '#00c6ec',
    35: '#009aec', 36: '#006fec', 37: '#0043ec', 38: '#6843ec', 39: '#9a43ec',
    40: '#c643ec', 41: '#ec43ec', 42: '#ec43c7', 43: '#ec439b', 44: '#ec436f',
    45: '#c3c3c3', 46: '#e06464', 47: '#e09464', 48: '#e0b064', 49: '#e0c864',
    50: '#e0e064', 51: '#b0d664', 52: '#94d664', 53: '#64d664', 54: '#64d694',
    55: '#64d6b0', 56: '#64d6c8', 57: '#64d6e0', 58: '#64c8e0', 59: '#64b0e0',
    60: '#6494e0', 61: '#6464e0', 62: '#9464e0', 63: '#b064e0', 64: '#c864e0',
    65: '#e064e0', 66: '#e064c8', 67: '#e064b0', 68: '#e06494', 69: '#7f7f7f'
};

function sanitizeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function colorDistance(rgb1, rgb2) {
    return Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) + Math.pow(rgb1.g - rgb2.g, 2) + Math.pow(rgb1.b - rgb2.b, 2));
}

function findClosestAbletonColorIndex(hexColor) {
    if (!hexColor) return 0;
    const userRgb = hexToRgb(hexColor);
    if (!userRgb) return 0;

    let closestIndex = 0;
    let minDistance = Infinity;

    for (const [index, abletonHex] of Object.entries(ABLETON_COLOR_PALETTE)) {
        const abletonRgb = hexToRgb(abletonHex);
        if (abletonRgb) {
            const distance = colorDistance(userRgb, abletonRgb);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        }
    }
    return parseInt(closestIndex, 10);
}

// --- Main Library Class ---

/**
 * A class for programmatically creating Ableton Live Set (.als) files.
 */
export class AbletonAlsExporter {
    /**
     * Initializes a new, empty project structure.
     */
    constructor() {
        this.projectTempo = 120;
        this.nextId = 20000; // Initial seed for generating unique IDs within the .als file
        this.scenes = [];
        this.tracks = [];
        this.clips = new Map(); // Using a Map to store clips by "sceneIndex-trackIndex"
        this.audioFiles = new Map(); // Stores audio file data to prevent duplicates
    }

    // --- Static Methods ---
    
    /**
     * Retrieves the available Warp Modes for clips.
     * @returns {object} An object mapping Warp Mode IDs to their names.
     */
    static getWarpModes() {
        return WARP_MODES;
    }

    /**
     * Finds the closest color in the official Ableton palette for a given hex color.
     * @param {string} hexColor - The user-selected hex color (e.g., '#FF0000').
     * @returns {string} The closest matching Ableton color as a hex string.
     */
    static getNearestAbletonColor(hexColor) {
        const index = findClosestAbletonColorIndex(hexColor);
        return ABLETON_COLOR_PALETTE[index];
    }

    // --- Public API Methods ---

    /**
     * Sets the project's global tempo.
     * @param {number} bpm - The tempo in beats per minute.
     */
    setTempo(bpm) {
        this.projectTempo = bpm;
    }

    /**
     * Adds a scene to the project.
     * @param {object} options - The scene options.
     * @param {string} options.name - The name of the scene.
     * @param {string} [options.colorHex] - The color of the scene as a hex string.
     */
    addScene({ name, colorHex }) {
        const colorIndex = findClosestAbletonColorIndex(colorHex);
        this.scenes.push({ name, colorIndex, id: this._getUniqueId() });
    }

    /**
     * Adds an audio track to the project.
     * @param {object} trackData - The track data.
     * @param {string} trackData.name - The name of the track.
     */
    addTrack(trackData) {
        this.tracks.push({ ...trackData, id: this._getUniqueId() });
    }

    /**
     * Adds an audio clip to a specific slot in the session grid.
     * @param {number} sceneIndex - The zero-based index of the scene (row).
     * @param {number} trackIndex - The zero-based index of the track (column).
     * @param {object} clipData - The clip data, including file, bpm, loop status, etc.
     */
    addClip(sceneIndex, trackIndex, clipData) {
        const key = `${sceneIndex}-${trackIndex}`;
        const clipWithId = { ...clipData, id: this._getUniqueId() };
        this.clips.set(key, clipWithId);

        // Store the audio file only once using its name as a key to avoid duplicates
        if (clipData.file && !this.audioFiles.has(clipData.name)) {
            this.audioFiles.set(clipData.name, clipData.file);
        }
    }

    /**
     * Generates the complete Ableton Live project as a .zip archive.
     * @returns {Promise<Blob>} A promise that resolves with the complete project file as a Blob.
     */
    async generateProjectZip() {
        const projectName = `Project-${Date.now()}`;
        const zip = new JSZip();
        const projectFolder = zip.folder(projectName);

        // Create the standard Ableton project folder structure
        projectFolder.folder("Ableton Project Info");
        const samplesFolder = projectFolder.folder("Samples/Imported");
        
        // Add all unique audio files to the samples folder
        for (const [name, file] of this.audioFiles.entries()) {
            samplesFolder.file(sanitizeXml(name), file);
        }

        // Generate the main .als file XML content
        const xmlString = this._generateAlsXml();
        // Gzip the XML content, as required by the .als format
        const gzippedXml = pako.gzip(xmlString);
        projectFolder.file(`${projectName}.als`, gzippedXml);

        return zip.generateAsync({ type: 'blob' });
    }

    // --- Private Methods ---

    /**
     * Gets a new unique ID for XML elements.
     * @returns {number}
     * @private
     */
    _getUniqueId() {
        return this.nextId++;
    }

    /**
     * Generates the XML for a single clip slot.
     * @private
     */
    _generateClipXml(sceneIndex, trackIndex) {
        const key = `${sceneIndex}-${trackIndex}`;
        const clip = this.clips.get(key);
        // The Id of a ClipSlot must be the zero-based index of the scene it corresponds to.
        // This is a critical requirement for avoiding "Slot Count Mismatch" errors.
        const clipSlotId = sceneIndex;

        if (!clip) {
            return `<ClipSlot Id="${clipSlotId}"><LomId Value="0"/><ClipSlot><Value/></ClipSlot><HasStop Value="true"/></ClipSlot>`;
        }

        const clipLengthInBeats = clip.lengthInBeats || 4.0;
        const sanitizedName = sanitizeXml(clip.name);

        return `
            <ClipSlot Id="${clipSlotId}">
                <LomId Value="0"/>
                <ClipSlot>
                    <Value>
                        <AudioClip Id="${clip.id}">
                            <Name Value="${sanitizedName}" />
                            <CurrentEnd Value="${clipLengthInBeats}" />
                            <IsWarped Value="true" />
                            <WarpMode Value="${clip.warpMode}" />
                            <Loop>
                                <LoopOn Value="${clip.loop}" />
                                <LoopStart Value="0.0" />
                                <LoopEnd Value="${clipLengthInBeats}" />
                                <StartRelative Value="0.0" />
                            </Loop>
                            <SampleRef>
                                <FileRef>
                                    <Name Value="${sanitizedName}" />
                                    <RelativePath Value="Samples/Imported/${sanitizedName}" />
                                    <Type Value="2" />
                                </FileRef>
                            </SampleRef>
                            <WarpMarkers>
                                <WarpMarker Id="${this._getUniqueId()}" SecTime="0" BeatTime="0" />
                                <WarpMarker Id="${this._getUniqueId()}" SecTime="${clip.duration || (60 / clip.bpm * clipLengthInBeats)}" BeatTime="${clipLengthInBeats}" />
                            </WarpMarkers>
                        </AudioClip>
                    </Value>
                </ClipSlot>
                <HasStop Value="true"/>
            </ClipSlot>
        `;
    }

    /**
     * Generates the XML for a full audio track, including all its clip slots.
     * @private
     */
    _generateTrackXml(track, trackIndex) {
        const clipSlots = this.scenes.map((_, sceneIndex) => this._generateClipXml(sceneIndex, trackIndex)).join('\n');
        // Every track requires a <FreezeSequencer> block with the same number of empty clip slots
        // as the <MainSequencer>. This is mandatory for file integrity.
        const emptyClipSlots = this.scenes.map((_, sceneIndex) => `<ClipSlot Id="${sceneIndex}"><LomId Value="0"/><ClipSlot><Value/></ClipSlot><HasStop Value="true"/></ClipSlot>`).join('\n');

        return `
            <AudioTrack Id="${track.id}">
                <LomId Value="0" />
                <Name><EffectiveName Value="${sanitizeXml(track.name)}" /></Name>
                <Color Value="${trackIndex + 10}" />
                <TrackGroupId Value="-1" />
                <DevicesListWrapper LomId="0" />
                <ClipSlotsListWrapper LomId="0" />
                <ArrangementClipsListWrapper LomId="0" />
                <TakeLanesListWrapper LomId="0" />
                <DeviceChain>
                    <MainSequencer>
                        <LomId Value="0" />
                        <ClipSlotList>
                            ${clipSlots}
                        </ClipSlotList>
                    </MainSequencer>
                    <FreezeSequencer>
                        <LomId Value="0"/>
                        <ClipSlotList>
                            ${emptyClipSlots}
                        </ClipSlotList>
                    </FreezeSequencer>
                </DeviceChain>
            </AudioTrack>
        `;
    }

    /**
     * Generates the XML for the master track.
     * @private
     */
    _generateMasterTrackXml() {
        return `
            <MainTrack>
                <LomId Value="0"/>
                <Name><EffectiveName Value="Main"/></Name>
                <DeviceChain>
                    <Mixer>
                        <LomId Value="0"/>
                        <Tempo><Manual Value="${this.projectTempo.toFixed(6)}"/></Tempo>
                    </Mixer>
                </DeviceChain>
            </MainTrack>
        `;
    }

    /**
     * Generates the XML for the PreHear (cue) track.
     * @private
     */
    _generatePreHearTrackXml() {
        return `
            <PreHearTrack>
                <LomId Value="0"/>
                <Name><EffectiveName Value="Master"/></Name>
                <DeviceChain>
                    <Mixer>
                        <Volume><Manual Value="0.5"/></Volume>
                    </Mixer>
                </DeviceChain>
            </PreHearTrack>
        `;
    }
    
    /**
     * Generates the XML for all scene definitions.
     * @private
     */
    _generateScenesXml() {
        const sceneContent = this.scenes.map((scene, index) => `
            <Scene Id="${index}">
                <LomId Value="0" />
                <Name Value="${sanitizeXml(scene.name)}" />
                <Color Value="${scene.colorIndex}" />
                <Tempo Value="${this.projectTempo}" />
                <IsTempoEnabled Value="false" />
                <ClipSlotsListWrapper LomId="0" />
            </Scene>`).join('\n');
        return `<Scenes>${sceneContent}</Scenes>`;
    }

    /**
     * Assembles the full XML string for the .als file.
     * @private
     */
    _generateAlsXml() {
        const tracksXml = this.tracks.map((track, index) => this._generateTrackXml(track, index)).join('\n');
        const masterTrackXml = this._generateMasterTrackXml();
        const preHearTrackXml = this._generatePreHearTrackXml();
        const scenesXml = this._generateScenesXml();

        // The structure of this final XML document follows the "full structural replication"
        // approach derived from a known-good ground truth file. All wrapper elements are required.
        return `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.0_12203" SchemaChangeCount="3" Creator="Ableton Project Stager">
    <LiveSet>
        <NextPointeeId Value="${this.nextId}" />
        <OverwriteProtectionNumber Value="${Math.floor(Math.random() * 4000) + 1}" />
        <LomId Value="0" />
        <Tracks>
            ${tracksXml}
        </Tracks>
        ${masterTrackXml}
        ${preHearTrackXml}
        <SendsPre />
        ${scenesXml}
        <TracksListWrapper LomId="0" />
        <ReturnTracksListWrapper LomId="0" />
        <ScenesListWrapper LomId="0" />
        <CuePointsListWrapper LomId="0" />
    </LiveSet>
</Ableton>`;
    }
}