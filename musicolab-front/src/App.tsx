import { useState } from "react";
import "./App.css";
import PitchDetector from "./views/PitchDetector/pitchDetector";
import AudioVisualizer from "./views/AudioVisualizer/audioVisualizer";

type ModuleActif = "m3" | "m4";

const MODULES: { id: ModuleActif; label: string }[] = [
    { id: "m3", label: "Module 3 — Justesse Vocale" },
    { id: "m4", label: "Module 4 — Visualisation Audio" },
];

export default function App() {
    const [moduleActif, setModuleActif] = useState<ModuleActif>("m4");

    return (
        <main>
            <nav className="app-nav">
                {MODULES.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        className={`app-nav__btn ${moduleActif === id ? "app-nav__btn--actif" : ""}`}
                        onClick={() => setModuleActif(id)}
                    >
                        {label}
                    </button>
                ))}
            </nav>
            {moduleActif === "m3" && <PitchDetector />}
            {moduleActif === "m4" && <AudioVisualizer />}
        </main>
    );
}
