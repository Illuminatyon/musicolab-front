/**
 * @file ControlesBPM.tsx
 * @description Composant View — Transport et contrôle du tempo.
 *
 * Affiche le curseur BPM, la valeur numérique et les boutons
 * de lecture/pause/stop.
 * Composant purement présentationnel (Dumb Component).
 */

import { BPM_MIN, BPM_MAX, type PhaseRythme } from "../../../models/rhythmModel.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlesBPMProps {
    /** Tempo courant en BPM */
    bpm: number;
    /** Phase de lecture courante */
    phase: PhaseRythme;
    /** Démarrer / mettre en pause / reprendre */
    onDemarrerPause: () => void;
    /** Stopper et réinitialiser */
    onReinitialiser: () => void;
    /** Changer le tempo */
    onModifierBPM: (bpm: number) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Barre de transport et contrôle du tempo.
 *
 * @param props.bpm - Tempo courant en BPM
 * @param props.phase - Phase de lecture courante
 * @param props.onDemarrerPause - Lancer / pause / reprendre
 * @param props.onReinitialiser - Stopper
 * @param props.onModifierBPM - Changer le tempo
 */
export default function ControlesBPM({
    bpm, phase, onDemarrerPause, onReinitialiser, onModifierBPM
}: ControlesBPMProps) {
    const enLecture = phase === "lecture";
    const arrete    = phase === "arret";

    return (
        <div className="controles-bpm">

            {/* Valeur numérique du tempo */}
            <div className="controles-bpm__tempo">
                <span className="controles-bpm__nombre">{bpm}</span>
                <span className="controles-bpm__unite">BPM</span>
            </div>

            {/* Curseur BPM */}
            <div className="controles-bpm__slider-wrapper">
                <input
                    type="range"
                    className="controles-bpm__slider"
                    min={BPM_MIN}
                    max={BPM_MAX}
                    value={bpm}
                    onChange={(e) => onModifierBPM(Number(e.target.value))}
                    aria-label="Tempo en BPM"
                />
                <div className="controles-bpm__bornes">
                    <span>{BPM_MIN}</span>
                    <span>{BPM_MAX}</span>
                </div>
            </div>

            {/* Boutons transport */}
            <div className="controles-bpm__transport">
                <button
                    className={`controles-bpm__btn-principal ${enLecture ? 'controles-bpm__btn--pause' : ''}`}
                    onClick={onDemarrerPause}
                >
                    {enLecture ? '⏸ Pause' : phase === "pause" ? '▶ Reprendre' : '▶ Démarrer'}
                </button>
                <button
                    className="controles-bpm__btn-stop"
                    onClick={onReinitialiser}
                    disabled={arrete}
                    title="Stopper et réinitialiser"
                >
                    ■ Stop
                </button>
            </div>

        </div>
    );
}
