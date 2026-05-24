/**
 * PitchDetector.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View — Composant principal du Module 3 (Smart Component).
 *
 * Nouveautés :
 *  - Sélection des notes avant la session (toggle par note)
 *  - Transmission de onSkip et progressionStabilisation à NoteTarget
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import "./PitchDetector.css";

import { usePitchDetection } from "../../controllers/usePitchDetection";
import { useNoteSession } from "../../controllers/useNoteSession";
import type { Note } from "../../models/noteModel";

import NoteTarget from '../NoteTarget/noteTarget';
import ResultsSummary from '../ResultSummary/resultSummary';

// ─── Constantes ───────────────────────────────────────────────────────────────

const OPTIONS_NOMBRE_NOTES = [3, 5, 7, 10] as const;

// ─── Composant ───────────────────────────────────────────────────────────────

export default function PitchDetector() {

    // ── Controllers ───────────────────────────────────────────────────────────

    const {
        frequenceHz,
        statut: statutCapture,
        erreur: erreurCapture,
        demarrer: demarrerCapture,
        arreter: arreterCapture,
    } = usePitchDetection();

    const {
        phase,
        noteCourante,
        indexNote,
        totalNotes,
        evaluationTempsReel,
        ecartCentsTempsReel,
        progressionStabilisation,
        bilan,
        notesDisponibles,
        demarrerSession,
        skipNote,
        reinitialiser,
        mettreAJourFrequence,
    } = useNoteSession();

    // ── État local de configuration ───────────────────────────────────────────

    const [nombreNotesChoisi, setNombreNotesChoisi] = useState<number>(5);

    /**
     * Notes sélectionnées par l'utilisateur pour la session.
     * Par défaut : toutes les notes disponibles sont sélectionnées.
     */
    const [notesSelectionnees, setNotesSelectionnees] = useState<Note[]>(
        () => notesDisponibles
    );

    // ── Synchronisation pitch → session (useEffect — cours S4) ───────────────

    useEffect(() => {
        if (phase === "en_cours") {
            mettreAJourFrequence(frequenceHz);
        }
    }, [frequenceHz, phase, mettreAJourFrequence]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    /**
     * Ajoute ou retire une note de la sélection.
     */
    const toggleNote = (note: Note): void => {
        const dejaSelectionnee = notesSelectionnees.some((n) => n.midi === note.midi);

        if (dejaSelectionnee) {
            // Ne pas permettre de déselectionner si c'est la dernière note
            if (notesSelectionnees.length === 1) return;
            setNotesSelectionnees((prev) => prev.filter((n) => n.midi !== note.midi));
        } else {
            setNotesSelectionnees((prev) => [...prev, note]);
        }
    };

    /** Sélectionne toutes les notes disponibles */
    const toutSelectionner = (): void => setNotesSelectionnees(notesDisponibles);

    /** Désélectionne toutes les notes sauf la première */
    const toutDeselectionner = (): void =>
        setNotesSelectionnees([notesDisponibles[0]]);

    /** Lance la session avec la configuration choisie */
    const handleDemarrer = async (): Promise<void> => {
        await demarrerCapture();
        demarrerSession(notesSelectionnees, nombreNotesChoisi);
    };

    /** Arrête tout et revient à la configuration */
    const handleRecommencer = async (): Promise<void> => {
        await arreterCapture();
        reinitialiser();
    };

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="pitch-detector">

            {/* ── En-tête ── */}
            <header className="pitch-detector__header">
                <div className="pitch-detector__badge">Module 3</div>
                <h1 className="pitch-detector__titre">Justesse Vocale</h1>
                <p className="pitch-detector__sous-titre">
                    Évaluez votre précision en temps réel
                </p>
            </header>

            {/* ── Phase : configuration ── */}
            {phase === "configuration" && (
                <div className="pitch-detector__configuration">

                    {/* Sélection du nombre de notes */}
                    <div className="config__section">
                        <label className="config__label">Nombre de notes</label>
                        <div className="config__options">
                            {OPTIONS_NOMBRE_NOTES.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    className={`config__option-btn ${
                                        nombreNotesChoisi === n ? "config__option-btn--actif" : ""
                                    }`}
                                    onClick={() => setNombreNotesChoisi(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sélection des notes */}
                    <div className="config__section">
                        <div className="config__label-row">
                            <label className="config__label">
                                Notes à chanter
                                <span className="config__label-count">
                  ({notesSelectionnees.length}/{notesDisponibles.length})
                </span>
                            </label>
                            <div className="config__actions-selection">
                                <button
                                    type="button"
                                    className="config__btn-selection"
                                    onClick={toutSelectionner}
                                >
                                    Tout
                                </button>
                                <button
                                    type="button"
                                    className="config__btn-selection"
                                    onClick={toutDeselectionner}
                                >
                                    Aucun
                                </button>
                            </div>
                        </div>

                        <div className="config__notes-grille">
                            {notesDisponibles.map((note) => {
                                const selectionnee = notesSelectionnees.some(
                                    (n) => n.midi === note.midi
                                );
                                return (
                                    <button
                                        key={note.midi}
                                        type="button"
                                        className={`config__note-btn ${
                                            selectionnee ? "config__note-btn--actif" : ""
                                        }`}
                                        onClick={() => toggleNote(note)}
                                        title={`${note.frequenceHz.toFixed(1)} Hz`}
                                    >
                                        {note.nom}
                                        <sub>{note.octave}</sub>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Erreur micro */}
                    {erreurCapture && (
                        <div className="pitch-detector__erreur">
                            <span>⚠</span>
                            <span>{erreurCapture}</span>
                        </div>
                    )}

                    <button
                        className="pitch-detector__btn-principal"
                        onClick={handleDemarrer}
                        disabled={
                            statutCapture === "chargement" || notesSelectionnees.length === 0
                        }
                        type="button"
                    >
                        {statutCapture === "chargement"
                            ? "Accès micro…"
                            : "Démarrer la session"}
                    </button>

                    <p className="pitch-detector__mention-micro">
                        L'accès au microphone sera demandé au démarrage.
                    </p>
                </div>
            )}

            {/* ── Phase : session en cours ── */}
            {phase === "en_cours" && noteCourante && (
                <div className="pitch-detector__session">

                    <div className={`pitch-detector__statut-micro statut--${statutCapture}`}>
                        <span className="statut__point" />
                        <span className="statut__texte">
              {statutCapture === "actif" ? "Micro actif" : statutCapture}
            </span>
                    </div>

                    {/* NoteTarget reçoit désormais onSkip et progressionStabilisation */}
                    <NoteTarget
                        note={noteCourante}
                        indexNote={indexNote}
                        totalNotes={totalNotes}
                        evaluation={evaluationTempsReel}
                        ecartCents={ecartCentsTempsReel}
                        progressionStabilisation={progressionStabilisation}
                        onSkip={skipNote}
                    />

                    <button
                        className="pitch-detector__btn-secondaire"
                        onClick={handleRecommencer}
                        type="button"
                    >
                        Abandonner
                    </button>
                </div>
            )}

            {/* ── Phase : bilan ── */}
            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}

        </div>
    );
}