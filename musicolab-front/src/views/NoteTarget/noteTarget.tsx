/**
 * NoteTarget.tsx — couche View (MVC)
 * Composant présentationnel : note cible, feedback temps réel, jauge cents,
 * anneau de progression 3s, overlay de validation, bouton skip.
 * Notions du cours : Composants + Props (S2), Rendu Conditionnel (S2)
 */

import "./NoteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel";
import JaugeCents from "./components/JaugeCents";
import AnneauSVG from "./components/AnneauSVG";
import FeedbackDirectionnel from "./components/FeedbackDirectionnel";

interface NoteTargetProps {
    note: Note;
    indexNote: number;
    totalNotes: number;
    evaluation: EvaluationJustesse | null;
    ecartCents: number | null;
    progressionStabilisation: number;
    noteValidee: boolean;
    onSkip: () => void;
}

export default function NoteTarget({ note, indexNote, totalNotes, evaluation,
                                       ecartCents, progressionStabilisation, noteValidee, onSkip }: NoteTargetProps) {

    return (
        <div className="note-target">
            {noteValidee && (
                <div className="note-target__overlay">
                    <span className="overlay__icone">✓</span>
                    <span className="overlay__texte">Note validée !</span>
                </div>
            )}

            {/* Progression session */}
            <div className="note-target__progression">
                <span className="progression__texte">Note {indexNote + 1} / {totalNotes}</span>
                <div className="progression__barre">
                    <div className="progression__remplissage"
                         style={{ width: `${(indexNote / totalNotes) * 100}%` }} />
                </div>
            </div>

            {/* Anneau + note */}
            <AnneauSVG progression={progressionStabilisation} actif={evaluation === "juste" && progressionStabilisation > 0}>
                <div className="note-target__note">
                    <span className="note__nom">{note.nom}</span>
                    <span className="note__octave">{note.octave}</span>
                    <span className="note__frequence">{note.frequenceHz.toFixed(1)} Hz</span>
                </div>
            </AnneauSVG>

            <FeedbackDirectionnel evaluation={evaluation} progression={progressionStabilisation} />

            <JaugeCents ecartCents={ecartCents} evaluation={evaluation} />

            {ecartCents !== null && (
                <p className="note-target__ecart">{ecartCents > 0 ? "+" : ""}{ecartCents} cents</p>
            )}

            <button className="note-target__btn-skip"
                    onClick={onSkip} disabled={noteValidee} type="button">
                Passer cette note →
            </button>
        </div>
    );
}