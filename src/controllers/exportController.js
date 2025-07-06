// src/controllers/exportController.js

import JSZip from 'jszip';
import { dom, getScenes, getActiveScene, getGlobal, getGroup } from '../state/data.js';
import { createRealignedWavBlob } from '../audio.js';
import { showError } from '../ui/globalUI.js';

async function performExport(scenes, zipFileName) {
    const zip = new JSZip();
    const audioContext = getGlobal('audioContext');

    for (const scene of scenes) {
        if (scene.audioAssignments.size === 0) continue;

        const sceneFolder = zip.folder(scene.name.replace(/[\s/]/g, '_'));
        const group = getGroup(scene.groupId);
        const finalLoopStart = group.loopStart;

        for (const [trackId, audioData] of scene.audioAssignments.entries()) {
            const wavBlob = createRealignedWavBlob(audioData, finalLoopStart, audioContext);
            const sanitizedFileName = audioData.name.replace(/\.[^/.]+$/, "");
            sceneFolder.file(`realigned_${sanitizedFileName}.wav`, wavBlob);
        }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}


async function handleExport(exportType) {
    const isAll = exportType === 'all';
    const button = isAll ? dom.exportBtn : dom.exportSelectedBtn;
    const buttonText = isAll ? dom.exportBtnText : dom.exportSelectedBtnText;
    const originalText = isAll ? 'Export All' : 'Export Selected';
    const scenesToExport = isAll ? getScenes() : [getActiveScene()];

    if (!scenesToExport || scenesToExport.length === 0 || !scenesToExport[0]) return;

    button.disabled = true;
    buttonText.textContent = "Exporting...";

    try {
        const zipName = isAll ? 'realigned_session.zip' : `realigned_${scenesToExport[0].name.replace(/[\s/]/g, '_')}.zip`;
        await performExport(scenesToExport, zipName);
    } catch (err) {
        console.error(`Error during '${exportType}' export:`, err);
        showError("An error occurred during the export process.");
    } finally {
        button.disabled = false;
        buttonText.textContent = originalText;
    }
}

export { handleExport };