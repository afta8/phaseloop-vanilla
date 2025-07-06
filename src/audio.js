// src/audio.js

// Generates a simplified array of min/max peaks for drawing the waveform.
export async function generatePeakData(audioBuffer, blockSize) {
    const data = audioBuffer.getChannelData(0);
    const peakData = [];
    for (let i = 0; i < data.length; i += blockSize) {
        const block = data.subarray(i, i + blockSize);
        let min = 1.0, max = -1.0;
        for (let j = 0; j < block.length; j++) {
            if (block[j] < min) min = block[j];
            if (block[j] > max) max = block[j];
        }
        peakData.push({ min, max });
    }
    return peakData;
}

// Converts an AudioBuffer into a Blob representing a WAV file.
export function bufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    let pos = 0;

    const writeString = (s) => {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(pos++, s.charCodeAt(i));
        }
    };
    const setUint16 = (data) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    writeString('RIFF');
    setUint32(length - 8);
    writeString('WAVE');
    writeString('fmt ');
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    writeString('data');
    setUint32(length - pos - 4);

    const channels = [];
    for (let i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 0;
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            if (offset < channels[i].length) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
            }
            pos += 2;
        }
        offset++;
    }
    return new Blob([view], { type: 'audio/wav' });
}

/**
 * Finds the nearest sample index to the target time where the audio waveform crosses
 * the zero amplitude line. This is used to prevent clicks at loop points.
 * @param {object} audioData - The audio data object containing the AudioBuffer.
 * @param {number} targetTime - The time in seconds to search around.
 * @returns {number} The new, adjusted time in seconds.
 */
export function findNearestZeroCrossing(audioData, targetTime) {
    if (!audioData) return targetTime;

    const channelData = audioData.audioBuffer.getChannelData(0);
    const sampleRate = audioData.audioBuffer.sampleRate;
    let targetIndex = Math.round(targetTime * sampleRate);

    // Search within a 10ms window, a safe range for finding a zero-crossing
    // without perceptibly altering the timing.
    const searchRadius = Math.round(sampleRate * 0.01);

    let bestIndex = targetIndex;
    let minDistance = Infinity;

    // Search for a point where the sign of the sample value changes
    for (let i = -searchRadius; i <= searchRadius; i++) {
        const currentIndex = (targetIndex + i + channelData.length) % channelData.length;
        const nextIndex = (currentIndex + 1) % channelData.length;

        // If the product is zero or negative, a zero-crossing occurred
        if (channelData[currentIndex] * channelData[nextIndex] <= 0) {
            const distance = Math.abs(i);
            if (distance < minDistance) {
                minDistance = distance;
                // Choose the sample closer to zero as the best index
                bestIndex = Math.abs(channelData[currentIndex]) < Math.abs(channelData[nextIndex]) ? currentIndex : nextIndex;
            }
        }
    }

    if (minDistance !== Infinity) {
        return (bestIndex / sampleRate);
    }
    
    // If no zero-crossing is found, return the original time
    return targetTime;
}

/**
 * Creates a realigned WAV blob from an AudioBuffer based on a loop start time.
 * @param {object} audioData - The audio data containing the source AudioBuffer.
 * @param {number} loopStart - The desired start time in seconds for the loop.
 * @param {AudioContext} audioContext - The global AudioContext instance.
 * @returns {Blob} A blob representing the new, realigned WAV file.
 */
export function createRealignedWavBlob(audioData, loopStart, audioContext) {
    const startSample = Math.floor((loopStart % audioData.audioBuffer.duration) * audioData.audioBuffer.sampleRate);
    const newBuffer = audioContext.createBuffer(audioData.audioBuffer.numberOfChannels, audioData.audioBuffer.length, audioData.audioBuffer.sampleRate);

    for (let i = 0; i < audioData.audioBuffer.numberOfChannels; i++) {
        const oldChannelData = audioData.audioBuffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);

        const firstPart = oldChannelData.subarray(startSample);
        newChannelData.set(firstPart, 0);

        const secondPart = oldChannelData.subarray(0, startSample);
        newChannelData.set(secondPart, firstPart.length);
    }
    
    return bufferToWav(newBuffer);
}