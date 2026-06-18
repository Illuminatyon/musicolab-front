/**
 * App.tsx — Point d'entrée de l'application MusicoLab.
 * Configure le routeur React Router et définit les routes des 4 modules.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Home         from "./views/Home/Home";
import PitchDetector from "./views/PitchDetector/pitchDetector";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Page d'accueil — sélection des modules */}
                <Route path="/"          element={<Home />} />
                {/* Module 3 — Évaluation de la justesse vocale */}
                <Route path="/module/3"  element={<PitchDetector />} />
                {/* Les autres modules seront ajoutés par les autres membres */}
                {/* <Route path="/module/1" element={<MidiTranspose />} /> */}
                {/* <Route path="/module/2" element={<RhythmCircle />} /> */}
                {/* <Route path="/module/4" element={<AudioVisualizer />} /> */}
            </Routes>
        </BrowserRouter>
    );
}