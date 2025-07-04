// src/ui/trackUI.js

import { toggleMute, toggleSolo } from '../controllers/trackController.js';

function getWaveformAreaHTML(trackId, audioData) {
    if (audioData) {
        const waveformMaskClasses = 'waveform-mask draggable bg-gray-900 h-full w-full';
        return `
            <div id="waveform-mask-${trackId}" data-track-id="${trackId}" class="${waveformMaskClasses}">
                <div class="static-start-marker"></div>
                <canvas id="canvas-${trackId}" class="waveform-canvas"></canvas>
            </div>
            <div class="absolute bottom-2 right-2 text-xs text-gray-400 font-medium pointer-events-none z-10 bg-black/80 px-2 py-1 rounded-md truncate max-w-1/2 text-right">
                ${audioData.name}
            </div>
        `;
    } else {
        const emptyWaveformClasses = 'bg-gray-900 h-full w-full';
        return `<div class="${emptyWaveformClasses}"></div>`;
    }
}

export function createTrackShell(track) {
    const trackId = track.id;
    const element = document.createElement('div');
    element.id = `track-${trackId}`;
    element.className = 'track-container flex items-stretch';
    element.style.height = '112px';

    const controlPanelClasses = 'flex-shrink-0 w-28 bg-gray-700/50 p-2 flex items-center justify-center space-x-2';
    
    element.innerHTML = `
        <div class="${controlPanelClasses}" style="height: 100%;">
            <div class="flex flex-col space-y-2">
                <button data-track-id="${trackId}" class="mute-btn w-10 h-10 text-sm font-bold rounded-md transition-colors">M</button>
                <button data-track-id="${trackId}" class="solo-btn w-10 h-10 text-sm font-bold rounded-md transition-colors">S</button>
            </div>
            <canvas id="vu-meter-${trackId}" width="12" height="92" class="bg-black/50 rounded"></canvas>
        </div>
        <div class="relative flex-grow waveform-area-wrapper">
        </div>
    `;
    
    element.querySelector('.mute-btn').addEventListener('click', () => toggleMute(trackId));
    element.querySelector('.solo-btn').addEventListener('click', () => toggleSolo(trackId));

    return element;
}

export function updateTrackMuteSoloStyles(track, isAnyTrackSoloed) {
    const trackElement = document.getElementById(`track-${track.id}`);
    if (!trackElement) return;

    const muteBtn = trackElement.querySelector('.mute-btn');
    const soloBtn = trackElement.querySelector('.solo-btn');
    if (!muteBtn || !soloBtn) return;

    muteBtn.className = 'mute-btn w-10 h-10 text-sm font-bold rounded-md transition-colors';
    soloBtn.className = 'solo-btn w-10 h-10 text-sm font-bold rounded-md transition-colors';

    if (track.isSoloed) {
        soloBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-400', 'text-black');
    } else {
        soloBtn.classList.add('bg-gray-600', 'hover:bg-gray-500');
    }
    if (track.isMuted) {
        if(isAnyTrackSoloed && !track.isSoloed) {
            muteBtn.classList.add('bg-blue-900', 'text-gray-400', 'cursor-default');
        } else {
            muteBtn.classList.add('bg-blue-600', 'hover:bg-blue-500', 'text-white');
        }
    } else {
            if(isAnyTrackSoloed) {
            muteBtn.classList.add('bg-gray-600', 'cursor-default');
            } else {
            muteBtn.classList.add('bg-gray-600', 'hover:bg-blue-500');
            }
    }
}

export { getWaveformAreaHTML };