// src/controllers/waveformInteraction.js

import { dom, getGlobal, getActiveScene, getScenes, getTracks, getTrack, getAudioForTrack, getGroup } from '../state/data.js';
import { setGlobal } from '../state/actions.js';
import { updateAudioAndUI } from '../ui/uiOrchestrator.js';
import { updateGlobalZoomButtons } from '../ui/globalUI.js';
import { drawWaveform } from '../rendering/waveformRenderer.js';
import { stopAllPlayback, toggleAllPlayback, startAllPlayback } from './playbackController.js';
import { findNearestZeroCrossing } from '../audio.js';
import { DRAG_THRESHOLD, MIN_ZOOM, MAX_ZOOM } from '../config.js';

export function changeZoom(factor) {
    let newZoom = getGlobal('zoomLevel') * factor;
    newZoom = Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM));
    if (newZoom !== getGlobal('zoomLevel')) {
        applyZoom(newZoom);
    }
}

export function applyZoom(newZoom) {
    setGlobal('zoomLevel', newZoom);
    const activeScene = getActiveScene();
    if (activeScene) {
        const group = getGroup(activeScene.groupId);
        getTracks().forEach(track => {
            const audioData = getAudioForTrack(track.id);
            if (audioData) {
                drawWaveform(track, audioData, activeScene, group.loopStart);
            }
        });
    }
    updateGlobalZoomButtons();
}

export function handlePan(deltaX) {
    const activeScene = getActiveScene();
    if (!activeScene || activeScene.audioAssignments.size === 0) return;

    const group = getGroup(activeScene.groupId);
    if (!group) return;

    const masterDuration = activeScene.masterDuration;
    const zoomLevel = getGlobal('zoomLevel');
    const visibleDuration = masterDuration / zoomLevel;
    const firstAudioTrackId = activeScene.audioAssignments.keys().next().value;
    const firstTrackMask = document.getElementById(`waveform-mask-${firstAudioTrackId}`);
    if (!firstTrackMask) return;

    const maskWidth = firstTrackMask.getBoundingClientRect().width;
    const timeDelta = (deltaX / maskWidth) * visibleDuration;
    
    group.loopStart = (group.loopStart - timeDelta + masterDuration) % masterDuration;

    requestAnimationFrame(() => {
        const scenes = getScenes();
        const tracks = getTracks();
        scenes.forEach(scene => {
            if (scene.id === activeScene.id) {
                 tracks.forEach(track => {
                    const audioData = getAudioForTrack(track.id);
                    if (audioData) {
                        drawWaveform(track, audioData, scene, group.loopStart);
                    }
                });
            }
        });
    });
}

export function handleDragStart(event) {
    const trackId = event.currentTarget.dataset.trackId;
    if (!getTrack(trackId)) return;
    event.preventDefault();
    setGlobal('wasPlayingBeforeDrag', getGlobal('isPlaying'));
    if (getGlobal('isPlaying')) {
        stopAllPlayback();
    }
    setGlobal('activeDragTrackId', trackId);
    setGlobal('isDragging', true);
    setGlobal('didMove', false);
    const startX = event.touches ? event.touches[0].pageX : event.pageX;
    setGlobal('startX', startX);
    setGlobal('lastX', startX);
    updateAudioAndUI();
}

export function handleDrag(event) {
    if (!getGlobal('isDragging') || getGlobal('activeDragTrackId') === null) return;
    event.preventDefault();
    const currentX = event.touches ? event.touches[0].pageX : event.pageX;
    if (typeof currentX !== 'number') return;
    if (!getGlobal('didMove')) {
        if (Math.abs(currentX - getGlobal('startX')) > DRAG_THRESHOLD) {
            setGlobal('didMove', true);
        }
    }
    if (getGlobal('didMove')) {
        const deltaX = currentX - getGlobal('lastX');
        setGlobal('lastX', currentX);
        handlePan(deltaX);
    }
}

export function handleDragEnd(event) {
    if (!getGlobal('isDragging')) return;

    if (getGlobal('didMove')) {
        const activeScene = getActiveScene();
        if (activeScene) {
            const group = getGroup(activeScene.groupId);
            if (dom.snapToggle.checked) {
                const draggedTrackId = getGlobal('activeDragTrackId');
                const audioData = getAudioForTrack(draggedTrackId);
                if (audioData) {
                    const finalTime = findNearestZeroCrossing(audioData, group.loopStart);
                    group.loopStart = finalTime;
                    
                    requestAnimationFrame(() => {
                        getTracks().forEach(track => {
                            const ad = getAudioForTrack(track.id);
                            if (ad) drawWaveform(track, ad, activeScene, group.loopStart);
                        });
                    });
                }
            }
        }
        if (getGlobal('wasPlayingBeforeDrag')) {
            // FIX: Call toggleAllPlayback to force a fresh play from the new start point
            toggleAllPlayback();
        }
    }
    setGlobal('isDragging', false);
    setGlobal('activeDragTrackId', null);
    updateAudioAndUI();
}