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
import { jouerNote } from "../../models/pitchModel";

import NoteTarget from "../NoteTarget/noteTarget.tsx";
import ResultsSummary from "../ResultsSummary/ResultsSummary";

const OPTIONS_NOTES = [3, 5, 7, 10] as const;
const OPTIONS_OCTAVE = [2, 3, 4, 5] as const;

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
    const [octave, setOctave] = useState(4);
    const notesOctave = getNotesOctave(octave);
    const [selection, setSelection] = useState<Note[]>(notesOctave);

    // Réinitialiser la sélection quand l'octave change
    useEffect(() => { setSelection(getNotesOctave(octave)); }, [octave]);

    // Brancher la détection sur la session
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

            {/* ── Configuration ── */}
            {phase === "configuration" && (
                <div className="pitch-detector__config">

                    <div className="config__section">
                        <label className="config__label">Nombre de notes</label>
                        <div className="config__row">
                            {OPTIONS_NOTES.map((n) => (
                                <button key={n} type="button"
                                        className={`config__btn ${nombreNotes === n ? "config__btn--actif" : ""}`}
                                        onClick={() => setNombreNotes(n)}>{n}</button>
                            ))}
                        </div>
                    </div>

                    <div className="config__section">
                        <label className="config__label">Octave</label>
                        <div className="config__row">
                            {OPTIONS_OCTAVE.map((o) => (
                                <button key={o} type="button"
                                        className={`config__btn ${octave === o ? "config__btn--actif" : ""}`}
                                        onClick={() => setOctave(o)}>{o}</button>
                            ))}
                        </div>
                        <p className="config__info">
                            Do{octave} = {getNotesOctave(octave)[0].frequenceHz.toFixed(1)} Hz
                        </p>
                    </div>

                    <div className="config__section">
                        <div className="config__label-row">
                            <label className="config__label">
                                Notes <span className="config__count">({selection.length}/{notesOctave.length})</span>
                            </label>
                            <div className="config__actions">
                                <button type="button" className="config__btn-sm" onClick={() => setSelection(notesOctave)}>Tout</button>
                                <button type="button" className="config__btn-sm" onClick={() => setSelection([notesOctave[0]])}>Aucun</button>
                            </div>
                        </div>

                        <div className="config__grille">
                            {notesOctave.map((note) => {
                                const active = selection.some((n) => n.midi === note.midi);
                                return (
                                    <div key={note.midi} className={`note-item ${active ? "note-item--actif" : ""}`}>
                                        <button type="button" className="note-item__select"
                                                onClick={() => toggleNote(note)}
                                                title={`${note.frequenceHz.toFixed(1)} Hz`}>
                                            {note.nom}<sub>{note.octave}</sub>
                                        </button>
                                        <button type="button" className="note-item__ecoute"
                                                onClick={() => jouerNote(note.frequenceHz)}
                                                title={`Écouter ${note.nom}${note.octave}`}>▶</button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {erreur && <div className="pitch-detector__erreur"><span>⚠</span><span>{erreur}</span></div>}

                    <button className="pitch-detector__btn-principal"
                            onClick={handleDemarrer}
                            disabled={statut === "chargement" || selection.length === 0}
                            type="button">
                        {statut === "chargement" ? "Accès micro…" : "Démarrer la session"}
                    </button>

                    <p className="pitch-detector__mention">L'accès au microphone sera demandé au démarrage.</p>
                </div>
            )}

            {/* ── Session ── */}
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

            {/* ── Bilan ── */}
            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}
        </div>
    );
}