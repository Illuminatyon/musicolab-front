/**
 * NoteTarget.tsx — couche View (MVC)
 * Composant présentationnel : note cible, feedback temps réel, jauge cents,
 * anneau de progression 3s, overlay de validation, bouton skip.
 * Notions du cours : Composants + Props (S2), Rendu Conditionnel (S2)
 */

import "./NoteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel";

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

const FEEDBACK: Record<EvaluationJustesse, { label: string; emoji: string; classe: string }> = {
    juste:     { label: "Juste",     emoji: "✓", classe: "feedback--juste"     },
    trop_haut: { label: "Trop haut", emoji: "↑", classe: "feedback--trop-haut" },
    trop_bas:  { label: "Trop bas",  emoji: "↓", classe: "feedback--trop-bas"  },
    silence:   { label: "Silence",   emoji: "…", classe: "feedback--silence"   },
};

export default function NoteTarget({
                                       note, indexNote, totalNotes,
                                       evaluation, ecartCents,
                                       progressionStabilisation, noteValidee, onSkip,
                                   }: NoteTargetProps) {

    const fb = evaluation ? FEEDBACK[evaluation] : null;
    const posJauge = ecartCents === null ? 50
        : ((Math.max(-50, Math.min(50, ecartCents)) + 50) / 100) * 100;

    const RAYON = 54;
    const CIRC = 2 * Math.PI * RAYON;
    const enProgression = progressionStabilisation > 0 && evaluation === "juste";

    return (
        <div className="note-target">

            {/* Overlay validation */}
            {noteValidee && (
                <div className="note-target__overlay">
                    <span className="overlay__icone">✓</span>
                    <span className="overlay__texte">Note validée !</span>
                </div>
            )}

            {/* Barre de progression session */}
            <div className="note-target__progression">
                <span className="progression__texte">Note {indexNote + 1} / {totalNotes}</span>
                <div className="progression__barre">
                    <div className="progression__remplissage"
                         style={{ width: `${(indexNote / totalNotes) * 100}%` }} />
                </div>
            </div>

            {/* Note + anneau SVG */}
            <div className="note-target__cercle-wrapper">
                <svg className={`cercle-svg ${enProgression ? "cercle-svg--actif" : ""}`}
                     viewBox="0 0 120 120" aria-hidden="true">
                    <circle cx="60" cy="60" r={RAYON} fill="none" stroke="#2a2a2a" strokeWidth="4" />
                    <circle cx="60" cy="60" r={RAYON} fill="none" stroke="#22c55e" strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={CIRC}
                            strokeDashoffset={CIRC * (1 - progressionStabilisation)}
                            transform="rotate(-90 60 60)"
                            style={{ transition: "stroke-dashoffset 0.05s linear" }}
                    />
                </svg>
                <div className="note-target__note">
                    <span className="note__nom">{note.nom}</span>
                    <span className="note__octave">{note.octave}</span>
                    <span className="note__frequence">{note.frequenceHz.toFixed(1)} Hz</span>
                </div>
            </div>

            {/* Feedback */}
            <div className={`note-target__feedback ${fb ? fb.classe : "feedback--silence"}`}>
                <span className="feedback__emoji">{fb ? fb.emoji : "…"}</span>
                <span className="feedback__label">{fb ? fb.label : "Chantez la note"}</span>
                {enProgression && (
                    <span className="feedback__rebours">
            {(3 - progressionStabilisation * 3).toFixed(1)}s
          </span>
                )}
            </div>

            {/* Jauge cents */}
            <div className="note-target__jauge-wrapper">
                <span className="jauge__label">−50¢</span>
                <div className="jauge">
                    <div className="jauge__zone-juste" />
                    {ecartCents !== null && (
                        <div className={`jauge__curseur ${evaluation === "juste" ? "curseur--juste" : "curseur--hors"}`}
                             style={{ left: `${posJauge}%` }} />
                    )}
                    <div className="jauge__centre" />
                </div>
                <span className="jauge__label">+50¢</span>
            </div>

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