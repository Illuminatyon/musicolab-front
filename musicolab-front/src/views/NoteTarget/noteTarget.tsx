/**
 * NoteTarget.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View — Composant d'affichage de la note cible et du feedback en temps réel.
 *
 * Responsabilités :
 *  - Afficher la note que l'utilisateur doit chanter
 *  - Afficher le feedback directionnel (trop haut / juste / trop bas)
 *  - Afficher une jauge visuelle de l'écart en cents
 *  - Afficher la progression dans la session (note X / N)
 *
 * Ce composant est purement présentationnel (Dumb Component) :
 * il ne contient aucune logique métier, uniquement de l'affichage.
 * Toute la logique vient des props passées par PitchDetector (cours S2 — Props).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "./NoteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel";

// ─── Types des props ─────────────────────────────────────────────────────────

interface NoteTargetProps {
    /** Note que l'utilisateur doit chanter */
    note: Note;
    /** Index de la note courante dans la session (commence à 0) */
    indexNote: number;
    /** Nombre total de notes dans la session */
    totalNotes: number;
    /** Évaluation en temps réel */
    evaluation: EvaluationJustesse | null;
    /** Écart en cents entre la fréquence chantée et la note cible */
    ecartCents: number | null;
}

// ─── Configuration des feedbacks ─────────────────────────────────────────────

/**
 * Données d'affichage associées à chaque type d'évaluation.
 */
const FEEDBACK_CONFIG: Record<
    EvaluationJustesse,
    { label: string; emoji: string; classe: string }
> = {
    juste:    { label: "Juste",    emoji: "✓", classe: "feedback--juste"    },
    trop_haut:{ label: "Trop haut",emoji: "↑", classe: "feedback--trop-haut"},
    trop_bas: { label: "Trop bas", emoji: "↓", classe: "feedback--trop-bas" },
    silence:  { label: "Silence",  emoji: "…", classe: "feedback--silence"  },
};

// ─── Composant ───────────────────────────────────────────────────────────────

/**
 * Affiche la note cible et le retour visuel en temps réel.
 *
 * @param props - NoteTargetProps
 */
export default function NoteTarget({
                                       note,
                                       indexNote,
                                       totalNotes,
                                       evaluation,
                                       ecartCents,
                                   }: NoteTargetProps) {

    // Données de feedback selon l'évaluation courante
    const feedback = evaluation ? FEEDBACK_CONFIG[evaluation] : null;

    /**
     * Calcule la position de l'indicateur sur la jauge de cents (-50 à +50).
     * On clamp la valeur pour qu'elle reste dans les bornes visuelles.
     */
    const positionJauge = (): number => {
        if (ecartCents === null) return 50; // centre
        const clamp = Math.max(-50, Math.min(50, ecartCents));
        // Convertir [-50, +50] en [0%, 100%] pour le positionnement CSS
        return ((clamp + 50) / 100) * 100;
    };

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
    style={{ width: `${((indexNote) / totalNotes) * 100}%` }}
    />
    </div>
    </div>

    {/* ── Affichage de la note cible ── */}
    <div className="note-target__note">
    <span className="note-target__nom">{note.nom}</span>
        <span className="note-target__octave">{note.octave}</span>
        <span className="note-target__frequence">
        {note.frequenceHz.toFixed(1)} Hz
    </span>
    </div>

    {/* ── Feedback directionnel ── */}
    <div className={`note-target__feedback ${feedback ? feedback.classe : "feedback--silence"}`}>
    <span className="note-target__feedback-emoji">
        {feedback ? feedback.emoji : "…"}
        </span>
        <span className="note-target__feedback-label">
        {feedback ? feedback.label : "Chantez la note"}
        </span>
        </div>

    {/* ── Jauge de cents ── */}
    <div className="note-target__jauge-wrapper">
    <span className="note-target__jauge-label">−50¢</span>

    <div className="note-target__jauge">
        {/* Zone de tolérance centrale (±25 cents) */}
        <div className="note-target__jauge-zone-juste" />

        {/* Indicateur de position */}
    {ecartCents !== null && (
        <div
            className={`note-target__jauge-curseur ${
            evaluation === "juste" ? "curseur--juste" : "curseur--hors"
        }`}
        style={{ left: `${positionJauge()}%` }}
        />
    )}

    {/* Ligne centrale (0 cents = note exacte) */}
    <div className="note-target__jauge-centre" />
        </div>

        <span className="note-target__jauge-label">+50¢</span>
    </div>

    {/* Valeur numérique de l'écart */}
    {ecartCents !== null && (
        <p className="note-target__ecart-valeur">
        {ecartCents > 0 ? "+" : ""}{ecartCents} cents
    </p>
    )}
    </div>
);
}