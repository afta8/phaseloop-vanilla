// src/controllers/trackController.js

import { getTrack } from '../state/data.js';
import { updateAudioAndUI } from '../ui/uiOrchestrator.js';

export function toggleMute(trackId) {
    const track = getTrack(trackId);
    if (track) {
        track.isMuted = !track.isMuted;
        updateAudioAndUI();
    }
}

export function toggleSolo(trackId) {
    const track = getTrack(trackId);
    if (track) {
        track.isSoloed = !track.isSoloed;
        updateAudioAndUI();
    }
}