// src/main.js

import './style.css';
import { dom, getGlobal } from './state/data.js';
import { initializeState, setGlobal, reorderScene } from './state/actions.js';
import { handleFileSelect, handleFileDrop } from './fileHandler.js';
import { setupUI, resetApplicationState } from './ui/uiOrchestrator.js';
import { initDragAndDrop } from './ui/globalUI.js';
import { toggleAllPlayback } from './controllers/playbackController.js';
import { handleExport } from './controllers/exportController.js';
import { handleDawProjectExport } from './controllers/dawProjectExporterController.js'; // <-- Corrected Import
import { handleDrag, handleDragEnd, changeZoom, applyZoom, handleWheelZoom } from './controllers/waveformInteraction.js';
import { ZOOM_FACTOR } from './config.js';

function main() {

    initializeState(new (window.AudioContext || window.webkitAudioContext)());
    initDragAndDrop();

    // --- Initial Event Listeners ---
    dom.fileInput.addEventListener('change', handleFileSelect);
    dom.resetBtn.addEventListener('click', () => resetApplicationState(true));
    dom.playAllBtn.addEventListener('click', toggleAllPlayback);
    dom.exportBtn.addEventListener('click', () => handleExport('all'));
    dom.exportSelectedBtn.addEventListener('click', () => handleExport('selected'));
    
    dom.exportDawProjectBtn.addEventListener('click', handleDawProjectExport);

    dom.uploadBox.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); dom.uploadBox.classList.add('bg-gray-600'); });
    dom.uploadBox.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); dom.uploadBox.classList.remove('bg-gray-600'); });
    dom.uploadBox.addEventListener('drop', handleFileDrop);

    dom.zoomInBtn.addEventListener('click', () => changeZoom(ZOOM_FACTOR));
    dom.zoomOutBtn.addEventListener('click', () => changeZoom(1 / ZOOM_FACTOR));
    dom.zoomFitBtn.addEventListener('click', () => applyZoom(1));
    
    // --- Global Drag Listeners ---
    window.addEventListener('mousemove', handleDrag, { passive: false });
    window.addEventListener('touchmove', handleDrag, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);

    document.addEventListener('dragend', () => {
        setGlobal('isInternalDrag', false);
        setGlobal('draggedSceneId', null);
        if (dom.dropIndicator) {
            dom.dropIndicator.style.display = 'none';
        }
    });

    document.addEventListener('drop', (e) => {
        if (getGlobal('isInternalDrag')) {
            e.preventDefault();
            
            if (dom.dropIndicator) {
                dom.dropIndicator.style.display = 'none';
            }

            const draggedId = parseFloat(e.dataTransfer.getData('text/plain'));
            const { sceneId: targetId, position } = getGlobal('dropTarget');
            
            if (draggedId && targetId) {
                reorderScene(draggedId, targetId, position === 'after');
                setupUI();
            }
            
            setGlobal('isInternalDrag', false);
            setGlobal('draggedSceneId', null);
        }
    });

    window.addEventListener('keydown', (e) => {
        const target = e.target;
        const nodeName = target.nodeName;
        const textInputTypes = ['text', 'password', 'email', 'number', 'search', 'url', 'tel'];

        if (nodeName === 'TEXTAREA' || (nodeName === 'INPUT' && textInputTypes.includes(target.type))) {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            toggleAllPlayback();
        }
    });

    dom.mainApp.addEventListener('dragover', (e) => {
        if (getGlobal('isInternalDrag')) return;
        e.preventDefault();
        e.stopPropagation();
        dom.mainApp.classList.add('drop-active');
    });
    
    dom.mainApp.addEventListener('dragleave', (e) => {
        if (getGlobal('isInternalDrag')) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.relatedTarget && dom.mainApp.contains(e.relatedTarget)) {
            return;
        }
        dom.mainApp.classList.remove('drop-active');
    });

    dom.mainApp.addEventListener('drop', (e) => {
        if (getGlobal('isInternalDrag')) return;
        e.preventDefault();
        e.stopPropagation();
        dom.mainApp.classList.remove('drop-active');
        handleFileDrop(e);
    });
}

main();