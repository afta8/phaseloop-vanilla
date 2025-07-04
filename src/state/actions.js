// src/state/actions.js

import { state } from './data.js';
import { GROUP_COLORS } from '../config.js';

// --- SETTERS / ACTIONS ---
export function setGlobal(key, value) { state.global[key] = value; }
export function setScenes(newScenes) { state.scenes = newScenes; }

function getNextColorTheme() {
    const theme = GROUP_COLORS[state.global.colorIndex];
    state.global.colorIndex = (state.global.colorIndex + 1) % GROUP_COLORS.length;
    return theme;
}

export function initializeState(audioContext) {
    if (state.tracks.length > 0) return;
    
    setGlobal('audioContext', audioContext);
    for (let i = 0; i < 8; i++) {
        const gainNode = audioContext.createGain();
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256; 
        gainNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        state.tracks.push({ id: `track_${i + 1}_${Date.now()}`, isMuted: false, isSoloed: false, gainNode: gainNode, analyserNode: analyserNode, });
    }
}

export function addScene(sceneData) {
    let groupId;
    if (state.scenes.length > 0) {
        groupId = state.scenes[state.scenes.length - 1].groupId;
    } else {
        groupId = Date.now();
        const newTheme = getNextColorTheme();
        state.groups.set(groupId, { loopStart: 0, colorTheme: newTheme });
    }

    const newScene = {
        id: Date.now() + Math.random(),
        name: `Scene ${state.scenes.length + 1}`,
        groupId: groupId,
        audioAssignments: sceneData.audioAssignments || new Map(),
        masterDuration: sceneData.masterDuration || 0,
    };
    state.scenes.push(newScene);
    if (!state.global.activeSceneId) {
        state.global.activeSceneId = newScene.id;
    }
    return newScene;
}

export function splitGroupAfter(sceneId) {
    const sceneIndex = state.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1 || sceneIndex === state.scenes.length - 1) return;

    const originalScene = state.scenes[sceneIndex];
    const originalGroupId = originalScene.groupId;
    const originalGroup = state.groups.get(originalGroupId);
    if (!originalGroup) return;
    
    const newGroupId = Date.now();
    const newTheme = getNextColorTheme();
    state.groups.set(newGroupId, { loopStart: originalGroup.loopStart, colorTheme: newTheme });

    for (let i = sceneIndex + 1; i < state.scenes.length; i++) {
        if (state.scenes[i].groupId === originalGroupId) {
            state.scenes[i].groupId = newGroupId;
        } else {
            break;
        }
    }
}

export function updateSceneName(sceneId, newName) {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (scene && newName && newName.trim()) {
        scene.name = newName.trim();
    }
}

export function deleteScene(sceneId) {
    const sceneIndex = state.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    const deletedScene = state.scenes[sceneIndex];
    const wasActive = state.global.activeSceneId === sceneId;
    
    state.scenes.splice(sceneIndex, 1);

    const groupIsEmpty = !state.scenes.some(s => s.groupId === deletedScene.groupId);
    if (groupIsEmpty) {
        state.groups.delete(deletedScene.groupId);
    }

    if (wasActive && state.scenes.length > 0) {
        const newActiveIndex = Math.max(0, sceneIndex - 1);
        state.global.activeSceneId = state.scenes[newActiveIndex].id;
    } else if (state.scenes.length === 0) {
        state.global.activeSceneId = null;
    }
}

export function reorderScene(draggedId, targetId, dropAfter) {
    if (draggedId === targetId) return;
    const scenes = state.scenes;
    const draggedItem = scenes.find(s => s.id === draggedId);
    if (!draggedItem) return;

    const originalGroupId = draggedItem.groupId;
    const remainingScenes = scenes.filter(s => s.id !== draggedId);
    let targetIndex = remainingScenes.findIndex(s => s.id === targetId);
    if (targetIndex === -1) return;

    let targetGroupId;
    if (dropAfter) {
        targetGroupId = remainingScenes[targetIndex].groupId;
        targetIndex++;
    } else {
        targetGroupId = remainingScenes[targetIndex].groupId;
    }
    
    draggedItem.groupId = targetGroupId;
    
    remainingScenes.splice(targetIndex, 0, draggedItem);
    state.scenes = remainingScenes;

    const oldGroupHasScenes = state.scenes.some(s => s.groupId === originalGroupId);
    if (!oldGroupHasScenes) {
        state.groups.delete(originalGroupId);
    }
}

export function setSourceNode(trackId, node) { state.sourceNodes.set(trackId, node); }
export function clearSourceNodes() { state.sourceNodes.clear(); }