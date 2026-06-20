/**
 * App.tsx — Point d'entrée de l'application MusicoLab.
 * Configure le routeur React Router et définit les routes des 4 modules.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Home         from "./views/Home/Home";
import PitchDetector from "./views/PitchDetector/pitchDetector";
import RhythmCircle from "./views/RhythmCircle/RhythmCircle.tsx";
import AudioVisualizer from "./views/AudioVisualizer/audioVisualizer.tsx";
import MidiTranspose from "./views/MidiTranspose/midiTranspose.tsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Page d'accueil — sélection des modules */}
                <Route path="/"          element={<Home />} />
                {/* Module 2 — Cercle de rythme interactif */}
                <Route path="/module/2"  element={<RhythmCircle />} />
                {/* Module 3 — Évaluation de la justesse vocale */}
                <Route path="/module/3"  element={<PitchDetector />} />

                {/* Module 4 */}
                <Route path="/module/4"  element={< AudioVisualizer/>} />
                <Route path="/module/1" element={<MidiTranspose />} />
            </Routes>
        </BrowserRouter>
    );
}