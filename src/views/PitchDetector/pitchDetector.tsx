/**
 * @file pitchDetector.tsx — Smart Component du Module 3.
 * Gère l'état afficherBemols et le distribue aux composants enfants.
 */

import { useState, useEffect } from "react";
import "./pitchDetector.css";

import { usePitchDetection } from "../../controllers/usePitchDetection.ts";
import { useNoteSession }    from "../../controllers/useNoteSession.ts";
import { getNotesOctave, type Note } from "../../models/noteModel.ts";

import BoutonRetour  from "./BoutonRetour.tsx";
import ConfigSession from "./ConfigSession.tsx";
import SessionEnCours from "./SessionEnCours.tsx";
import ResultsSummary from "../ResultsSummary/ResultsSummary.tsx";

export default function PitchDetector() {

    const {
        frequenceHz, statut, erreur,
        demarrer: demarrerCapture,
        arreter: arreterCapture,
    } = usePitchDetection();

    const {
        phase, noteCourante, indexNote, totalNotes,
        evaluationTempsReel, ecartCentsTempsReel,
        progressionStabilisation, noteValidee, bilan,
        demarrerSession, skipNote, reinitialiser, mettreAJourFrequence,
    } = useNoteSession();

    const [nombreNotes, setNombreNotes]       = useState(5);
    const [octave, setOctave]                 = useState(4);
    const [selection, setSelection]           = useState<Note[]>(() => getNotesOctave(4));
    /** Contrôle la notation ♯/♭ dans toute l'interface */
    const [afficherBemols, setAfficherBemols] = useState(false);

    const handleOctaveChange = (nouvelOctave: number): void => {
        setOctave(nouvelOctave);
        setSelection(getNotesOctave(nouvelOctave));
    };

    useEffect(() => {
        if (phase === "en_cours") mettreAJourFrequence(frequenceHz);
    }, [frequenceHz, phase, mettreAJourFrequence]);

    const toggleNote = (note: Note): void => {
        const existe = selection.some((n) => n.midi === note.midi);
        if (existe && selection.length === 1) return;
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

    const notesOctave = getNotesOctave(octave);

    return (
        <div className="pitch-detector">

            <BoutonRetour />

            <header className="pitch-detector__header">
                <div className="badge">Module 3</div>
                <h1 className="titre">Justesse Vocale</h1>
                <p className="sous-titre">Évaluez votre précision en temps réel</p>
            </header>

            {phase === "configuration" && (
                <ConfigSession
                    nombreNotes={nombreNotes}   onNombreNotes={setNombreNotes}
                    octave={octave}             onOctave={handleOctaveChange}
                    selection={selection}       notesOctave={notesOctave}
                    onToggleNote={toggleNote}
                    onToutSelectionner={() => setSelection(notesOctave)}
                    onAucun={() => setSelection([notesOctave[0]])}
                    afficherBemols={afficherBemols}
                    onAfficherBemols={setAfficherBemols}
                    erreur={erreur}
                    statut={statut}
                    onDemarrer={handleDemarrer}
                />
            )}

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
                    afficherBemols={afficherBemols}
                />
            )}

            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}
        </div>
    );
}