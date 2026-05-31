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

import ConfigSession from "./ConfigSession";
import NoteTarget from "../NoteTarget/noteTarget.tsx";
import ResultsSummary from "../ResultsSummary/ResultsSummary";

export default function PitchDetector() {

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

    const [nombreNotes, setNombreNotes] = useState(5);
    const [octave, setOctave]           = useState(4);
    const notesOctave                   = getNotesOctave(octave);
    const [selection, setSelection]     = useState<Note[]>(notesOctave);

    useEffect(() => { setSelection(getNotesOctave(octave)); }, [octave]);

    useEffect(() => {
        if (phase === "en_cours") mettreAJourFrequence(frequenceHz);
    }, [frequenceHz, phase, mettreAJourFrequence]);

    const toggleNote = (note: Note) => {
        const existe = selection.some((n) => n.midi === note.midi);
        if (existe && selection.length === 1) return;
        setSelection((prev) =>
            existe ? prev.filter((n) => n.midi !== note.midi) : [...prev, note]
        );
    };

    const handleDemarrer = async () => {
        await demarrerCapture();
        demarrerSession(selection, nombreNotes);
    };

    const handleRecommencer = async () => {
        await arreterCapture();
        reinitialiser();
    };

    return (
        <div className="pitch-detector">

            <header className="pitch-detector__header">
                <div className="badge">Module 3</div>
                <h1 className="titre">Justesse Vocale</h1>
                <p className="sous-titre">Évaluez votre précision en temps réel</p>
            </header>

            {phase === "configuration" && (
                <ConfigSession
                    nombreNotes={nombreNotes}       onNombreNotes={setNombreNotes}
                    octave={octave}                 onOctave={setOctave}
                    selection={selection}           notesOctave={notesOctave}
                    onToggleNote={toggleNote}
                    onToutSelectionner={() => setSelection(notesOctave)}
                    onAucun={() => setSelection([notesOctave[0]])}
                    erreur={erreur}
                    statut={statut}
                    onDemarrer={handleDemarrer}
                />
            )}

            {phase === "en_cours" && noteCourante && (
                <div className="pitch-detector__session">
                    <div className={`statut-micro statut--${statut}`}>
                        <span className="statut__point" />
                        <span className="statut__texte">{statut === "actif" ? "Micro actif" : statut}</span>
                    </div>

                    <NoteTarget
                        note={noteCourante}
                        indexNote={indexNote}
                        totalNotes={totalNotes}
                        evaluation={evaluationTempsReel}
                        ecartCents={ecartCentsTempsReel}
                        progressionStabilisation={progressionStabilisation}
                        noteValidee={noteValidee}
                        onSkip={skipNote}
                    />

                    <button className="pitch-detector__btn-secondaire"
                            onClick={handleRecommencer} type="button">Abandonner</button>
                </div>
            )}

            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}
        </div>
    );
}
