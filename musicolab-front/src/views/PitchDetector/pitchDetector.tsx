/**
 * PitchDetector.tsx — couche View, Smart Component (MVC)
 * Orchestre les hooks Controllers et distribue les données aux composants enfants.
 * Notions du cours : Composants/Props (S2), useState (S3), useEffect (S4), Custom Hooks (S5)
 */

import { useState, useEffect } from "react";
import "./pitchDetector.css";

import { usePitchDetection } from "../../controllers/usePitchDetection";
import { useNoteSession } from "../../controllers/useNoteSession";
import { getNotesOctave, type Note } from "../../models/noteModel";

import ConfigSession   from "./ConfigSession";
import SessionEnCours  from "./SessionEnCours";
import ResultsSummary  from "../ResultsSummary/ResultsSummary";

export default function PitchDetector() {

    // ── Controllers ───────────────────────────────────────────────────────────

    const {
        frequenceHz, statut, erreur,
        demarrer: demarrerCapture, arreter: arreterCapture,
    } = usePitchDetection();

    const {
        phase, noteCourante, indexNote, totalNotes,
        evaluationTempsReel, ecartCentsTempsReel,
        progressionStabilisation, noteValidee, bilan,
        demarrerSession, skipNote, reinitialiser, mettreAJourFrequence,
    } = useNoteSession();

    // ── État local de configuration ───────────────────────────────────────────

    const [nombreNotes, setNombreNotes] = useState(5);
    const [octave, setOctave]           = useState(4);
    const notesOctave                   = getNotesOctave(octave);
    const [selection, setSelection]     = useState<Note[]>(notesOctave);

    // Réinitialise la sélection de notes quand l'octave change
    useEffect(() => { setSelection(getNotesOctave(octave)); }, [octave]);

    // Transmet la fréquence détectée au controller de session à chaque frame
    useEffect(() => {
        if (phase === "en_cours") mettreAJourFrequence(frequenceHz);
    }, [frequenceHz, phase, mettreAJourFrequence]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    const toggleNote = (note: Note): void => {
        const existe = selection.some((n) => n.midi === note.midi);
        if (existe && selection.length === 1) return; // toujours au moins une note
        setSelection((prev) =>
            existe ? prev.filter((n) => n.midi !== note.midi) : [...prev, note]
        );
    };

    const handleDemarrer = async (): Promise<void> => {
        await demarrerCapture();
        demarrerSession(selection, nombreNotes);
    };

    const handleRecommencer = async (): Promise<void> => {
        await arreterCapture();
        reinitialiser();
    };

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="pitch-detector">

            {/* En-tête fixe — visible dans toutes les phases */}
            <header className="pitch-detector__header">
                <div className="badge">Module 3</div>
                <h1 className="titre">Justesse Vocale</h1>
                <p className="sous-titre">Évaluez votre précision en temps réel</p>
            </header>

            {/* Phase 1 — Configuration */}
            {phase === "configuration" && (
                <ConfigSession
                    nombreNotes={nombreNotes}   onNombreNotes={setNombreNotes}
                    octave={octave}             onOctave={setOctave}
                    selection={selection}       notesOctave={notesOctave}
                    onToggleNote={toggleNote}
                    onToutSelectionner={() => setSelection(notesOctave)}
                    onAucun={() => setSelection([notesOctave[0]])}
                    erreur={erreur}
                    statut={statut}
                    onDemarrer={handleDemarrer}
                />
            )}

            {/* Phase 2 — Session en cours */}
            {phase === "en_cours" && noteCourante && (
                <SessionEnCours
                    statut={statut}
                    noteCourante={noteCourante}
                    indexNote={indexNote}
                    totalNotes={totalNotes}
                    evaluation={evaluationTempsReel}
                    ecartCents={ecartCentsTempsReel}
                    progressionStabilisation={progressionStabilisation}
                    noteValidee={noteValidee}
                    onSkip={skipNote}
                    onAbandonner={handleRecommencer}
                />
            )}

            {/* Phase 3 — Bilan */}
            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}

        </div>
    );
}