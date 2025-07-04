// src/ui/globalUI.js

import { dom, getGlobal } from '../state/data.js';
import { setGlobal } from '../state/actions.js';
import { MIN_ZOOM, MAX_ZOOM } from '../config.js';

export function showError(message) {
    dom.errorMessageDiv.textContent = message;
    dom.errorMessageDiv.classList.remove('hidden');
    dom.loadingIndicator.classList.add('hidden');
}

export function updateGlobalZoomButtons() {
    const currentZoom = getGlobal('zoomLevel');
    dom.zoomInBtn.disabled = currentZoom >= MAX_ZOOM;
    dom.zoomOutBtn.disabled = currentZoom <= MIN_ZOOM;
    dom.zoomFitBtn.disabled = currentZoom <= MIN_ZOOM;
}

export function initDragAndDrop() {
    document.addEventListener('dragover', (e) => {
        if (!getGlobal('isInternalDrag')) return;
        e.preventDefault();

        const scrollArea = dom.sceneTabsScrollArea;
        const indicator = dom.dropIndicator;
        if (!scrollArea || !indicator) return;

        indicator.style.display = 'block';

        const tabs = [...scrollArea.querySelectorAll('button')];
        const draggedSceneId = getGlobal('draggedSceneId');
        let targetTab = null;
        let dropAfter = false;

        for (const tab of tabs) {
            if (parseFloat(tab.dataset.sceneId) === draggedSceneId) {
                continue;
            }

            const rect = tab.getBoundingClientRect();
            if (e.clientX < rect.right) {
                targetTab = tab;
                dropAfter = e.clientX > rect.left + rect.width / 2;
                break;
            }
        }

        if (targetTab) {
            const targetRect = targetTab.getBoundingClientRect();
            const scrollAreaRect = scrollArea.getBoundingClientRect();
            
            // --- FIX for Scroll Bug ---
            // The indicator's position now correctly accounts for the horizontal scroll of the tab area.
            const newLeft = targetRect.left - scrollAreaRect.left + scrollArea.scrollLeft;
            const indicatorPosition = dropAfter ? newLeft + targetRect.width : newLeft;
            
            indicator.style.transform = `translateX(${indicatorPosition - 2}px)`;

            setGlobal('dropTarget', {
                sceneId: parseFloat(targetTab.dataset.sceneId),
                position: dropAfter ? 'after' : 'before'
            });
        } else if (tabs.length > 0) {
            const lastTab = tabs[tabs.length - 1];
            if (parseFloat(lastTab.dataset.sceneId) !== draggedSceneId) {
                const lastRect = lastTab.getBoundingClientRect();
                const scrollAreaRect = scrollArea.getBoundingClientRect();
                const newLeft = lastRect.left - scrollAreaRect.left + scrollArea.scrollLeft;
                indicator.style.transform = `translateX(${newLeft + lastRect.width - 2}px)`;
                setGlobal('dropTarget', {
                    sceneId: parseFloat(lastTab.dataset.sceneId),
                    position: 'after'
                });
            }
        }
    });
}