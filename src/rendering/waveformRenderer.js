// src/rendering/waveformRenderer.js

import { getGlobal } from '../state/data.js';
import { TRACK_HEIGHT_PX, LOD_THRESHOLDS } from '../config.js';

function getBestLOD(zoomLevel) {
    if (zoomLevel > LOD_THRESHOLDS.fine) return 'superfine';
    if (zoomLevel > LOD_THRESHOLDS.medium) return 'fine';
    if (zoomLevel > LOD_THRESHOLDS.coarse) return 'medium';
    return 'coarse';
}

function drawPath(ctx, topPoints, bottomPoints, width) {
    ctx.fillStyle = 'rgba(110, 231, 183, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, topPoints[0]);
    for (let x = 1; x < width; x++) ctx.lineTo(x, topPoints[x]);
    ctx.lineTo(width - 1, bottomPoints[bottomPoints.length - 1]);
    for (let x = bottomPoints.length - 2; x >= 0; x--) ctx.lineTo(x, bottomPoints[x]);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#6ee7b7';
    ctx.beginPath();
    ctx.moveTo(0, topPoints[0]);
    for(let x=1; x < topPoints.length; x++) ctx.lineTo(x, topPoints[x]);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, bottomPoints[0]);
    for(let x=1; x < bottomPoints.length; x++) ctx.lineTo(x, bottomPoints[x]);
    ctx.stroke();
}

export function drawWaveform(track, audioData, scene, loopStart) {
    const canvas = document.getElementById(`canvas-${track.id}`);
    const mask = document.getElementById(`waveform-mask-${track.id}`);
    if (!canvas || !mask || !audioData) return;

    const maskRect = mask.getBoundingClientRect();
    if (maskRect.width === 0) return;

    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = maskRect.width * dpr;
    canvas.height = TRACK_HEIGHT_PX * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.clearRect(0, 0, maskRect.width, TRACK_HEIGHT_PX);
    
    const zoomLevel = getGlobal('zoomLevel');
    const lodKey = getBestLOD(zoomLevel);
    const peakData = audioData.peakDataLevels[lodKey];
    const masterDuration = scene.masterDuration;
    const visibleDuration = masterDuration / zoomLevel;
    const amp = TRACK_HEIGHT_PX / 2;
    const topPoints = [], bottomPoints = [];

    for (let x = 0; x < maskRect.width; x++) {
        const timeOnMaster = loopStart + (x / maskRect.width) * visibleDuration;
        const timeInTrack = timeOnMaster % audioData.audioBuffer.duration;
        const percentInTrack = timeInTrack / audioData.audioBuffer.duration;
        const startIndex = Math.floor(percentInTrack * peakData.length);
        const peaksPerPixel = (visibleDuration / maskRect.width) * (peakData.length / masterDuration);
        const endIndex = startIndex + Math.ceil(peaksPerPixel);

        let min = 1.0, max = -1.0;
        for (let i = startIndex; i < endIndex; i++) {
            const peakIndex = i % peakData.length;
            const peak = peakData[peakIndex];
            if (!peak) continue;
            if (peak.min < min) min = peak.min;
            if (peak.max > max) max = peak.max;
        }
        
        topPoints.push(amp * (1 - max));
        bottomPoints.push(amp * (1 - min));
    }
    drawPath(ctx, topPoints, bottomPoints, maskRect.width);

    if (audioData.audioBuffer.duration < masterDuration) {
        ctx.save();
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);

        const pixelsPerSecond = (maskRect.width * zoomLevel) / masterDuration;
        const timeOffset = loopStart % audioData.audioBuffer.duration;
        const firstMarkerX = (audioData.audioBuffer.duration - timeOffset) * pixelsPerSecond;
        
        for (let x = firstMarkerX; x < maskRect.width; x += audioData.audioBuffer.duration * pixelsPerSecond) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, TRACK_HEIGHT_PX);
            ctx.stroke();
        }
        ctx.restore();
    }
}