# phaseloop-vanilla

This is a client-side web application built to solve a specific workflow problem for musicians, particularly those using looping software like the **Endlesss** app. In such apps, exported audio stems often don't start on the musical downbeat. This tool provides a simple solution: load one or more sets of loops (referred to as "Scenes"), visually set the correct start point on any track, and have that alignment instantly synchronized across all related tracks and scenes before exporting them as a new set of perfectly aligned audio files ready for any DAW.

The intended workflow is: **Export from Looping Software → Load in Phaseloop & Fix Alignment → Export for Use in Your DAW of Choice**.

This repository contains the original version of the application, built with vanilla JavaScript (ES6+) and without a front-end framework. It features a robust, custom state management system and a performance-optimized rendering pipeline built on core web technologies.

## Live Demo

**Try the app live at: [https://phaseloop.netlify.app/](https://phaseloop.netlify.app/)**

## Key Features

* **Multi-Scene Management:** Load multiple sets of loops (e.g., from Endlesss "Rifffs") as distinct "Scenes". Scenes can be added via the file browser or by dragging and dropping folders or .zip files directly into the app.
* **Scene Groups:** Organize scenes into color-coded groups. All scenes within a group share the same color and synchronized alignment, perfect for managing different song sections. Groups can be created by "splitting" existing groups and merged by dragging and dropping tabs.
* **Synchronized Re-alignment:** Click and drag any waveform horizontally to set its correct start point against a static timeline ruler. The alignment is instantly applied to all other scenes within the same group.
* **DAW-like Mixing Controls:**
    * Global **Mute (M)** and **Solo (S)** buttons for each track that persist their state when switching between scenes.
    * Real-time **VU meters** for each track with a smoothed peak-metering algorithm for a natural representation of loudness.
* **Advanced Interaction & Workflow:**
    * **"Snap to Zero Crossing"** feature ensures that exported loops are free of audible clicks or pops by snapping the start point to the nearest point of silence.
    * **Fine-grained zoom controls**, including toolbar buttons and mouse scroll wheel support.
    * **Playback via Spacebar** provides quick keyboard access to start and stop audio.
    * **Intelligent File Loading** specifically for Endlesss users parses filenames for a track number (e.g., "8 - My Loop.wav") and automatically places the audio on the correct track.
* **Multiple Export Options**:
    * **Export as .dawproject (Recommended):** Generates a single `.dawproject` file for seamless import into compatible DAWs like Bitwig Studio and Studio One. This format includes realigned audio, auto-detected project tempo, scene colors, and sets clips to stretch mode.
    * **Export All (ZIP):** Creates a single `.zip` archive containing a sub-folder for each scene with its realigned `.wav` files.
    * **Export Selected (ZIP):** Exports only the currently active scene as a `.zip` file.
* **Progressive Web App (PWA):** The application is fully installable on desktop and mobile devices for offline access and an integrated, native-app-like experience.

## Tech Stack

* **Front-End:** Vanilla JavaScript (ES6 Modules)
* **Styling:** Tailwind CSS
* **Audio:** Web Audio API
* **Build Tool:** Vite
* **Packaging:** JSZip, fast-xml-parser

## Local Development Setup

This project uses Node.js and Vite for local development.

1.  **Clone the repository:**
    ```
    git clone [https://github.com/YOUR_USERNAME/phaseloop-vanilla.git](https://github.com/YOUR_USERNAME/phaseloop-vanilla.git)
    ```
2.  **Navigate to the project directory:**
    ```
    cd phaseloop-vanilla
    ```
3.  **Install dependencies:**
    ```
    npm install
    ```
4.  **Run the development server:**
    ```
    npm run dev
    ```
    This will start a local server (usually on `http://localhost:5173`) with live reloading.

## Acknowledgements

* This project utilizes the **DAWproject** open exchange format. Learn more at [https://github.com/bitwig/dawproject](https://github.com/bitwig/dawproject).
* The `.dawproject` exporter was derived from the excellent [dawproject-typescript](https://github.com/perivar/dawproject-typescript) library by Per Ivar Nerseth.

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
