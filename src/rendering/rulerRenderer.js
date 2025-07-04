// src/rendering/rulerRenderer.js

import { dom } from '../state/data.js';

export function drawRuler() {
    const canvas = dom.timelineRuler;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#9ca3af'; // gray-400

    const totalDivisions = 16; // 16 subdivisions = 17 ticks

    for (let i = 0; i <= totalDivisions; i++) {
        // Ensure the last tick is drawn exactly at the end.
        const x = (i === totalDivisions) ? width - 1 : Math.floor((i / totalDivisions) * width);

        let tickHeight;
        if (i % 4 === 0) {
            tickHeight = height * 0.75; // Quarter note ticks are most prominent
        } else if (i % 2 === 0) {
            tickHeight = height * 0.5;  // Eighth note ticks
        } else {
            tickHeight = height * 0.3;  // Sixteenth note ticks
        }
        
        ctx.fillRect(x, height - tickHeight, 1, tickHeight);
    }
}