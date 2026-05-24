/**
 * NoteTarget.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View — Composant d'affichage de la note cible et du feedback en temps réel.
 *
 * Nouveautés :
 *  - Barre de progression circulaire montrant les 3s de stabilisation
 *  - Bouton "Passer" pour skipper la note courante
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "./NoteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel";

// ─── Types des props ──────────────────────────────────────────────────────────

interface NoteTargetProps {
    note: Note;
    indexNote: number;
    totalNotes: number;
    evaluation: EvaluationJustesse | null;
    ecartCents: number | null;
    /** Progression de stabilisation entre 0 (début) et 1 (validé) */
    progressionStabilisation: number;
    /** Callback pour passer la note courante */
    onSkip: () => void;
}

// ─── Configuration des feedbacks ─────────────────────────────────────────────

const FEEDBACK_CONFIG: Record<
    EvaluationJustesse,
    { label: string; emoji: string; classe: string }
> = {
    juste:     { label: "Juste",     emoji: "✓", classe: "feedback--juste"     },
    trop_haut: { label: "Trop haut", emoji: "↑", classe: "feedback--trop-haut" },
    trop_bas:  { label: "Trop bas",  emoji: "↓", classe: "feedback--trop-bas"  },
    silence:   { label: "Silence",   emoji: "…", classe: "feedback--silence"   },
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function NoteTarget({
                                       note,
                                       indexNote,
                                       totalNotes,
                                       evaluation,
                                       ecartCents,
                                       progressionStabilisation,
                                       onSkip,
                                   }: NoteTargetProps) {

    const feedback = evaluation ? FEEDBACK_CONFIG[evaluation] : null;

    /** Convertit l'écart en position sur la jauge [0%, 100%] */
    const positionJauge = (): number => {
        if (ecartCents === null) return 50;
        const clamp = Math.max(-50, Math.min(50, ecartCents));
        return ((clamp + 50) / 100) * 100;
    };

    /**
     * Calcule les propriétés du cercle SVG de progression.
     * Utilise stroke-dasharray / stroke-dashoffset pour animer l'arc.
     */
    const RAYON = 54;
    const CIRCONFERENCE = 2 * Math.PI * RAYON;
    const offset = CIRCONFERENCE * (1 - progressionStabilisation);
    const estEnProgression = progressionStabilisation > 0 && evaluation === "juste";

    return (
        <div className="note-target">

            {/* ── Progression dans la session ── */}
            <div className="note-target__progression">
        <span className="note-target__progression-texte">
          Note {indexNote + 1} / {totalNotes}
        </span>
                <div className="note-target__barre-progression">
                    <div
                        className="note-target__barre-remplissage"
                        style={{ width: `${(indexNote / totalNotes) * 100}%` }}
                    />
                </div>
            </div>

            {/* ── Note cible avec anneau de progression ── */}
            <div className="note-target__cercle-wrapper">

                {/* SVG de progression circulaire — visible uniquement quand la note est juste */}
                <svg
                    className={`note-target__cercle-svg ${estEnProgression ? "cercle--actif" : ""}`}
                    viewBox="0 0 120 120"
                    aria-hidden="true"
                >
                    {/* Piste de fond */}
                    <circle
                        cx="60" cy="60" r={RAYON}
                        fill="none"
                        stroke="#2a2a2a"
                        strokeWidth="4"
                    />
                    {/* Arc de progression */}
                    <circle
                        cx="60" cy="60" r={RAYON}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={CIRCONFERENCE}
                        strokeDashoffset={offset}
                        transform="rotate(-90 60 60)"
                        style={{ transition: "stroke-dashoffset 0.05s linear" }}
                    />
                </svg>

                {/* Note au centre du cercle */}
                <div className="note-target__note">
                    <span className="note-target__nom">{note.nom}</span>
                    <span className="note-target__octave">{note.octave}</span>
                    <span className="note-target__frequence">
            {note.frequenceHz.toFixed(1)} Hz
          </span>
                </div>
            </div>

            {/* ── Feedback directionnel ── */}
            <div className={`note-target__feedback ${feedback ? feedback.classe : "feedback--silence"}`}>
        <span className="note-target__feedback-emoji">
          {feedback ? feedback.emoji : "…"}
        </span>
                <span className="note-target__feedback-label">
          {feedback ? feedback.label : "Chantez la note"}
        </span>
                {/* Compte à rebours numérique quand la note est juste */}
                {estEnProgression && (
                    <span className="note-target__compte-rebours">
            {(3 - progressionStabilisation * 3).toFixed(1)}s
          </span>
                )}
            </div>

            {/* ── Jauge de cents ── */}
            <div className="note-target__jauge-wrapper">
                <span className="note-target__jauge-label">−50¢</span>
                <div className="note-target__jauge">
                    <div className="note-target__jauge-zone-juste" />
                    {ecartCents !== null && (
                        <div
                            className={`note-target__jauge-curseur ${
                                evaluation === "juste" ? "curseur--juste" : "curseur--hors"
                            }`}
                            style={{ left: `${positionJauge()}%` }}
                        />
                    )}
                    <div className="note-target__jauge-centre" />
                </div>
                <span className="note-target__jauge-label">+50¢</span>
            </div>

            {ecartCents !== null && (
                <p className="note-target__ecart-valeur">
                    {ecartCents > 0 ? "+" : ""}{ecartCents} cents
                </p>
            )}

            {/* ── Bouton Skip ── */}
            <button
                className="note-target__btn-skip"
                onClick={onSkip}
                type="button"
                title="Passer cette note (comptée comme manquée)"
            >
                Passer cette note →
            </button>
        </div>
    );
}