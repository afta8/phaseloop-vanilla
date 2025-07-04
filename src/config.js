// src/config.js

// -- Interaction Constants --
export const DRAG_THRESHOLD = 5; // The pixel distance needed to register a drag vs. a click.

// -- Zoom Constants --
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 130;
export const ZOOM_FACTOR = 1.5;

// -- Rendering Constants --
export const TRACK_HEIGHT_PX = 112; // Fixed height to prevent layout race conditions.
// Defines the zoom level at which to switch to a more detailed waveform LOD.
export const LOD_THRESHOLDS = { coarse: 4, medium: 15, fine: 30 };

// -- Audio Processing Constants --
// Defines the block sizes for pre-computing waveform Levels of Detail (LODs).
export const LOD_BLOCK_SIZES = { coarse: 1024, medium: 256, fine: 64, superfine: 8 };

// -- File Handling Constants --
export const SUPPORTED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.aiff', '.aif', '.flac', '.ogg', '.m4a'];
export const MAX_TRACKS = 8; // The app is designed for a fixed 8-track "channel strip" layout.

// -- Metering Constants --
// Smoothing values for the VU meters to make them feel more natural.
export const METER_ATTACK = 0.6;
export const METER_RELEASE = 0.95;

// -- UI Constants --
// A curated, non-random list of color themes for the scene groups.
export const GROUP_COLORS = [
    { base: 'bg-blue-900', hover: 'bg-blue-800', active: 'bg-blue-700' },
    { base: 'bg-teal-900', hover: 'bg-teal-800', active: 'bg-teal-700' },
    { base: 'bg-purple-900', hover: 'bg-purple-800', active: 'bg-purple-700' },
    { base: 'bg-amber-900', hover: 'bg-amber-800', active: 'bg-amber-700' },
    { base: 'bg-rose-950', hover: 'bg-rose-900', active: 'bg-rose-800' },
    { base: 'bg-sky-900', hover: 'bg-sky-800', active: 'bg-sky-700' },
    { base: 'bg-lime-900', hover: 'bg-lime-800', active: 'bg-lime-700' },
    { base: 'bg-slate-800', hover: 'bg-slate-700', active: 'bg-slate-600' },
    { base: 'bg-cyan-900', hover: 'bg-cyan-800', active: 'bg-cyan-700' },
    { base: 'bg-fuchsia-900', hover: 'bg-fuchsia-800', active: 'bg-fuchsia-700' },
    { base: 'bg-red-900', hover: 'bg-red-800', active: 'bg-red-700' },
    { base: 'bg-indigo-900', hover: 'bg-indigo-800', active: 'bg-indigo-700' },
    { base: 'bg-pink-900', hover: 'bg-pink-800', active: 'bg-pink-700' },
    { base: 'bg-stone-800', hover: 'bg-stone-700', active: 'bg-stone-600' },
    { base: 'bg-emerald-900', hover: 'bg-emerald-800', active: 'bg-emerald-700' },
    { base: 'bg-zinc-800', hover: 'bg-zinc-700', active: 'bg-zinc-600' },
];