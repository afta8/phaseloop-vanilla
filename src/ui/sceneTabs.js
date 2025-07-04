// src/ui/sceneTabs.js

import { dom, getGlobal, getScenes, getActiveScene, getGroup } from '../state/data.js';
import { setGlobal, updateSceneName, deleteScene, reorderScene, splitGroupAfter } from '../state/actions.js';
import { stopAllPlayback, startAllPlayback, toggleAllPlayback } from '../controllers/playbackController.js';
import { setupUI, resetApplicationState } from './uiOrchestrator.js';

function closeContextMenu() {
    const existingMenu = document.getElementById('scene-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    window.removeEventListener('click', closeContextMenu, { capture: true });
}

function openContextMenu(event, scene) {
    event.preventDefault();
    closeContextMenu();

    const menu = document.createElement('div');
    menu.id = 'scene-context-menu';
    menu.className = 'custom-context-menu';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const renameButton = document.createElement('button');
    renameButton.textContent = 'Rename';
    renameButton.className = 'context-menu-item';
    renameButton.onclick = () => {
        closeContextMenu();
        const tab = document.querySelector(`[data-scene-id="${scene.id}"]`);
        if (tab) {
            const sceneId = scene.id;
            const currentName = scene.name;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'bg-gray-600 text-white text-center w-full h-full p-0 m-0 border-0 focus:ring-2 focus:ring-emerald-500 outline-none';
            tab.innerHTML = '';
            tab.appendChild(input);
            input.focus();
            input.select();
            const saveName = () => {
                updateSceneName(sceneId, input.value);
                renderSceneTabs();
            };
            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (keyEvent) => {
                if (keyEvent.key === 'Enter') { saveName(); } 
                else if (keyEvent.key === 'Escape') { renderSceneTabs(); }
            });
        }
    };

    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'context-menu-item';
    deleteButton.onclick = () => {
        closeContextMenu();
        handleSceneDelete(scene.id);
    };

    menu.appendChild(renameButton);
    menu.appendChild(deleteButton);
    document.body.appendChild(menu);

    setTimeout(() => window.addEventListener('click', closeContextMenu, { capture: true }), 0);
}

function handleSceneDelete(sceneId) {
    const wasPlaying = getGlobal('isPlaying');
    if (wasPlaying) {
        stopAllPlayback();
    }

    deleteScene(sceneId);

    if (getScenes().length === 0) {
        resetApplicationState(true);
    } else {
        setupUI();
        if (wasPlaying) {
            startAllPlayback();
        }
    }
}

export function renderSceneTabs() {
    const scenes = getScenes();
    const activeSceneId = getGlobal('activeSceneId');
    
    const scrollArea = dom.sceneTabsScrollArea;
    const mainContainer = dom.sceneTabsContainer;

    const oldElements = scrollArea.querySelectorAll('div, button');
    oldElements.forEach(el => el.remove());

    const oldAddBtn = mainContainer.querySelector('.add-scene-btn');
    if (oldAddBtn) mainContainer.removeChild(oldAddBtn);
    
    const contentFragment = document.createDocumentFragment();

    scenes.forEach((scene, index) => {
        const prevScene = scenes[index - 1];
        if (index > 0) {
            if (scene.groupId !== prevScene.groupId) {
                const gap = document.createElement('div');
                gap.className = 'group-gap';
                contentFragment.appendChild(gap);
            } else {
                const divider = document.createElement('div');
                divider.className = 'scene-divider';

                let hoverTimeout;
                divider.addEventListener('mouseenter', () => {
                    hoverTimeout = setTimeout(() => {
                        divider.classList.add('divider-hover-active');
                    }, 150);
                });

                divider.addEventListener('mouseleave', () => {
                    clearTimeout(hoverTimeout);
                    divider.classList.remove('divider-hover-active');
                });
                
                divider.addEventListener('click', (e) => {
                    e.stopPropagation();
                    splitGroupAfter(prevScene.id);
                    setupUI();
                });
                contentFragment.appendChild(divider);
            }
        }

        const tab = document.createElement('button');
        tab.dataset.sceneId = scene.id;
        tab.textContent = scene.name;
        
        tab.className = 'w-24 truncate px-4 py-2 text-sm font-bold transition-colors flex-shrink-0 text-white';

        const isFirstInGroup = index === 0 || scenes[index - 1].groupId !== scene.groupId;
        const isLastInGroup = index === scenes.length - 1 || scenes[index + 1].groupId !== scene.groupId;

        if (isFirstInGroup && isLastInGroup) {
            tab.classList.add('rounded-md');
        } else if (isFirstInGroup) {
            tab.classList.add('rounded-l-md');
        } else if (isLastInGroup) {
            tab.classList.add('rounded-r-md');
        }
        
        const group = getGroup(scene.groupId);
        const theme = group ? group.colorTheme : { base: 'bg-gray-700', hover: 'bg-gray-600', active: 'bg-emerald-500' };

        if (scene.id === activeSceneId) {
            tab.classList.add(theme.active);
        } else {
            tab.classList.add(theme.base);
            tab.addEventListener('mouseenter', () => {
                tab.classList.remove(theme.base);
                tab.classList.add(theme.hover);
            });
            tab.addEventListener('mouseleave', () => {
                tab.classList.remove(theme.hover);
                tab.classList.add(theme.base);
            });
        }
        
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('scene-divider')) return;
            if (e.button !== 0 || scene.id === getGlobal('activeSceneId')) return;

            const wasPlaying = getGlobal('isPlaying');
            
            if (wasPlaying) {
                stopAllPlayback();
            }

            setGlobal('activeSceneId', scene.id);
            setupUI();
            
            if (wasPlaying) {
                startAllPlayback();
            }
        });

        tab.addEventListener('contextmenu', (e) => openContextMenu(e, scene));
        tab.setAttribute('draggable', true);
        tab.addEventListener('dragstart', (e) => {
            setGlobal('isInternalDrag', true);
            setGlobal('draggedSceneId', scene.id);
            e.dataTransfer.setData('text/plain', scene.id);
            e.dataTransfer.effectAllowed = 'move';
        });

        contentFragment.appendChild(tab);
    });
    
    scrollArea.appendChild(contentFragment);
    
    const addSceneBtn = document.createElement('button');
    addSceneBtn.className = 'add-scene-btn w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ml-auto';
    addSceneBtn.textContent = '+';
    addSceneBtn.addEventListener('click', () => dom.fileInput.click());
    mainContainer.appendChild(addSceneBtn);

    if (dom.dropIndicator) {
        scrollArea.appendChild(dom.dropIndicator);
    }
}

export { closeContextMenu };