// src/rendering/meterRenderer.js

import { METER_ATTACK, METER_RELEASE } from '../config.js';

const vuMeterLevels = new Map();

export function drawVUMeter(track) {
    const canvas = document.getElementById(`vu-meter-${track.id}`);
    if (!canvas || !track.analyserNode) return;

    const analyser = track.analyserNode;
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let peakAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
        const distance = Math.abs(dataArray[i] - 128);
        if (distance > peakAmplitude) {
            peakAmplitude = distance;
        }
    }
    
    const currentVolume = peakAmplitude / 128.0;
    const previousVolume = vuMeterLevels.get(track.id) || 0;
    let smoothedVolume;

    if (currentVolume > previousVolume) {
        smoothedVolume = previousVolume * (1 - METER_ATTACK) + currentVolume * METER_ATTACK;
    } else {
        smoothedVolume = previousVolume * METER_RELEASE;
        if (smoothedVolume < currentVolume) smoothedVolume = currentVolume;
    }

    vuMeterLevels.set(track.id, smoothedVolume);

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);

    if (smoothedVolume > 0) {
        const meterHeight = smoothedVolume * height;
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(0.75, '#f59e0b');
        gradient.addColorStop(0.9, '#ef4444');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - meterHeight, width, meterHeight);
    }
}

export function areMetersActive() {
    for (const level of vuMeterLevels.values()) {
        if (level > 0.001) {
            return true;
        }
    }
    return false;
}