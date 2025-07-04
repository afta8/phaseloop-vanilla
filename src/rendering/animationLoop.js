// src/rendering/animationLoop.js

import { dom, getGlobal, getActiveScene, getTracks, getGroup } from '../state/data.js';
import { setGlobal } from '../state/actions.js';
import { drawVUMeter, areMetersActive } from './meterRenderer.js';

export function runAnimationFrame() {
    const isPlaying = getGlobal('isPlaying');
    
    getTracks().forEach(track => {
        drawVUMeter(track);
    });
    
    // Default the playhead to hidden, we'll show it only if it's in view.
    if (dom.globalPlayhead) {
        dom.globalPlayhead.style.display = 'none';
    }

    if (isPlaying) {
        const activeScene = getActiveScene();
        if (activeScene) {
            let firstWaveformMask = document.querySelector('.waveform-mask');
            const group = getGroup(activeScene.groupId);

            if (firstWaveformMask && group) {
                const maskRect = firstWaveformMask.getBoundingClientRect();
                if (maskRect.width > 0) {
                    const audioContext = getGlobal('audioContext');
                    const masterStartTime = getGlobal('playbackStartTime');
                    const elapsed = audioContext.currentTime - masterStartTime;
                    const zoomLevel = getGlobal('zoomLevel');
                    
                    // This is the true, looping time of the playhead within the scene's master duration.
                    const currentTimeInMasterLoop = (group.loopStart + elapsed) % activeScene.masterDuration;
                    
                    // This is the time at which our visible window starts.
                    const viewStartTime = group.loopStart;
                    
                    // How far into the master loop is our playhead, relative to the start of our view?
                    // This correctly handles the timeline wrapping around.
                    let timeOffsetFromViewStart = currentTimeInMasterLoop - viewStartTime;
                    if (timeOffsetFromViewStart < 0) {
                        timeOffsetFromViewStart += activeScene.masterDuration;
                    }
                    
                    const visibleDuration = activeScene.masterDuration / zoomLevel;
                    const xPosition = (timeOffsetFromViewStart / visibleDuration) * maskRect.width;

                    // Only display the playhead if it's within the visible bounds of the mask.
                    if (xPosition >= 0 && xPosition < maskRect.width) {
                        dom.globalPlayhead.style.display = 'block';
                        dom.globalPlayhead.style.transform = `translateX(${xPosition}px)`;
                    }
                }
            }
        }
    }

    if (isPlaying || areMetersActive()) {
        setGlobal('animationFrameId', requestAnimationFrame(runAnimationFrame));
    }
}