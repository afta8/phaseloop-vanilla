# phaseloop-vanilla

This is a client-side web application built to solve a specific workflow problem for musicians using the **Endlesss** looper app. In Endlesss, a collection of related stems is called a "Rifff". Due to the nature of continuous looping, stems exported from these Rifffs often don't start on the first downbeat. This tool provides a simple solution: load one or more Rifffs (referred to as "Scenes" in this app), visually set the correct start point, and export a new set of perfectly aligned audio files ready for any DAW.

The intended workflow is: **Export from Endlesss → Load in phaseloop & fix alignment → Export for use in your DAW of choice.** You can load files by using the file browser, or simply by dragging and dropping a folder, a ZIP file, or even the Rifffs directly from the Endlesss desktop app into the app.

This repository contains the original version of the application, built with vanilla JavaScript (ES6+). The resulting application is built on core web technologies and features a robust, custom state management system and a performance-optimized rendering pipeline, all without the use of a front-end framework.

## Live Demo

**Try the app live at: [https://phaseloop.netlify.app/](https://phaseloop.netlify.app/)**

## Key Features

* **Multi-Rifff/Scene Management:** Load multiple Rifffs from Endlesss (represented as "Scenes" in the UI). Group scenes together with distinct colors to share a synchronized alignment, perfect for different song sections.
* **Synchronized Re-alignment:** Drag any waveform to set the correct start point. All other scenes within the same color-coded group are instantly realigned in perfect sync.
* **DAW-like Mixing Controls:** Global Mute/Solo controls that persist across scenes, and real-time VU meters for each track.
* **Advanced Interaction:** "Snap to Zero Crossing" feature to ensure click-free loop points, and fine-grained zoom controls (including scroll-to-zoom) for precise edits.
* **Multiple Export Options:**
    * **Export as .dawproject:** Export the entire session as a single `.dawproject` file for seamless import into compatible DAWs (e.g. Bitwig Studio, Cubase, Studio One).
    * **Export All (ZIP):** Export the entire session as a single `.zip` file, with each scene's realigned `.wav` files organized into its own sub-folder.
    * **Export Selected (ZIP):** Export only the currently active scene as a `.zip` file.
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
