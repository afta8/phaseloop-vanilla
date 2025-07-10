// src/state/data.js

export const dom = {
    uploadScreen: document.getElementById('upload-screen'),
    mainApp: document.getElementById('main-app'),
    fileInput: document.getElementById('audio-file'),
    tracksContainer: document.getElementById('tracks-container'),
    exportBtn: document.getElementById('export-btn'),
    exportBtnText: document.getElementById('export-btn-text'),
    exportAlsBtn: document.getElementById('export-als-btn'),
    exportAlsBtnText: document.getElementById('export-als-btn-text'),
    exportDawProjectBtn: document.getElementById('export-dawproject-btn'),
    exportDawProjectBtnText: document.getElementById('export-dawproject-btn-text'),
    resetBtn: document.getElementById('reset-btn'),
    loadingIndicator: document.getElementById('loading-indicator'),
    errorMessageDiv: document.getElementById('error-message'),
    exportOptionsBtn: document.getElementById('export-options-btn'),
    exportOptionsMenu: document.getElementById('export-options-menu'),
    exportSelectedMenuItem: document.getElementById('export-selected-menu-item'),
    snapToggle: document.getElementById('snap-toggle'),
    playAllBtn: document.getElementById('play-all-btn'),
    playIcon: document.getElementById('play-icon'),
    stopIcon: document.getElementById('stop-icon'),
    playButtonContainer: document.getElementById('play-button-container'),
    transportControls: document.getElementById('transport-controls'),
    uploadBox: document.getElementById('upload-box'),
    zoomInBtn: document.getElementById('zoom-in-global-btn'),
    zoomOutBtn: document.getElementById('zoom-out-global-btn'),
    zoomFitBtn: document.getElementById('zoom-fit-global-btn'),
    timelineRuler: document.getElementById('timeline-ruler'),
    sceneTabsContainer: document.getElementById('scene-tabs-container'),
    sceneTabsScrollArea: document.getElementById('scene-tabs-scroll-area'),
    globalPlayhead: document.getElementById('global-playhead'),
    dropIndicator: null,
};

export const state = {
    global: {
        audioContext: null,
        isPlaying: false,
        playbackStartTime: null,
        zoomLevel: 1.0,
        isDragging: false,
        activeDragTrackId: null,
        didMove: false,
        wasPlayingBeforeDrag: false,
        startX: 0,
        lastX: 0,
        animationFrameId: null,
        activeSceneId: null,
        isInternalDrag: false, 
        draggedSceneId: null,
        dropTarget: { sceneId: null, position: 'before' },
        colorIndex: 0,
        exportSelectedOnly: false,
    },
    tracks: [],
    scenes: [],
    groups: new Map(),
    sourceNodes: new Map(),
};

// --- GETTERS ---
export function getGlobal(key) { return state.global[key]; }
export function getTracks() { return state.tracks; }
export function getTrack(trackId) { return state.tracks.find(t => t.id === trackId); }
export function getScenes() { return state.scenes; }
export function getScene(sceneId) { return state.scenes.find(s => s.id === sceneId); }
export function getActiveScene() { if (!state.global.activeSceneId) return null; return getScene(state.global.activeSceneId); }
export function getGroup(groupId) { return state.groups.get(groupId); }
export function getAudioForTrack(trackId) { const activeScene = getActiveScene(); if (!activeScene) return null; return activeScene.audioAssignments.get(trackId); }
export function getSourceNode(trackId) { return state.sourceNodes.get(trackId); }
export function forEachSourceNode(callback) { state.sourceNodes.forEach(callback); }