/**
 * @file NoteTarget.tsx
 * @description Composant View — Affichage de la note cible pendant la session.
 *
 * Orchestre l'affichage de tous les éléments visuels de l'évaluation en cours :
 * - Overlay de validation (1s après validation)
 * - Barre de progression dans la session (note X/N)
 * - Anneau SVG de stabilisation (se remplit en 3s)
 * - Note cible avec nom, octave et fréquence
 * - Feedback directionnel (juste / trop haut / trop bas)
 * - Jauge de cents (-50¢ à +50¢)
 * - Bouton "Passer cette note"
 *
 * Ce composant est purement présentationnel (Dumb Component) :
 * toutes ses données viennent des props, aucune logique métier.
 *
 * Notions du cours : Composants + Props (S2), Rendu Conditionnel (S2)
 */

import "./noteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel.ts";
import AnneauSVG            from "./components/AnneauSVG.tsx";
import FeedbackDirectionnel from "./components/FeedbackDirectionnel.tsx";
import JaugeCents           from "./components/JaugeCents.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NoteTargetProps {
    /** Note que l'utilisateur doit chanter */
    note: Note;
    /** Index de la note courante dans la session (commence à 0) */
    indexNote: number;
    /** Nombre total de notes dans la session */
    totalNotes: number;
    /** Évaluation temps réel de la voix chantée */
    evaluation: EvaluationJustesse | null;
    /** Écart en cents entre la voix et la note cible (null si silence) */
    ecartCents: number | null;
    /** Progression de stabilisation entre 0 et 1 (fournie par useStabilisation) */
    progressionStabilisation: number;
    /** Vrai pendant 1s après validation — affiche l'overlay de succès */
    noteValidee: boolean;
    /** Callback pour passer la note courante sans la valider */
    onSkip: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Composant d'affichage de la note cible et du feedback en temps réel.
 *
 * @param props - NoteTargetProps
 *
 * @example
 * <NoteTarget
 *   note={noteCourante}
 *   indexNote={2}
 *   totalNotes={5}
 *   evaluation="juste"
 *   ecartCents={-8}
 *   progressionStabilisation={0.4}
 *   noteValidee={false}
 *   onSkip={skipNote}
 * />
 */
export default function NoteTarget({
                                       note, indexNote, totalNotes,
                                       evaluation, ecartCents,
                                       progressionStabilisation, noteValidee,
                                       onSkip,
                                   }: NoteTargetProps) {

    /** L'anneau SVG est visible uniquement quand la note est juste et le timer actif */
    const anneauActif = progressionStabilisation > 0 && evaluation === "juste";

    return (
        <div className="note-target">

            {/* ── Overlay de validation ── */}
            {/* Affiché pendant DUREE_FEEDBACK_VALIDE_MS (1s) après validation */}
            {noteValidee && (
                <div className="note-target__overlay">
                    <span className="overlay__icone">✓</span>
                    <span className="overlay__texte">Note validée !</span>
                </div>
            )}

            {/* ── Progression dans la session ── */}
            <div className="note-target__progression">
                <span className="progression__texte">
                    Note {indexNote + 1} / {totalNotes}
                </span>
                <div className="progression__barre">
                    <div
                        className="progression__remplissage"
                        style={{ width: `${(indexNote / totalNotes) * 100}%` }}
                    />
                </div>
            </div>

            {/* ── Anneau SVG + note cible ── */}
            <AnneauSVG progression={progressionStabilisation} actif={anneauActif}>
                <div className="note-target__note">
                    <span className="note__nom">{note.nom}</span>
                    <span className="note__octave">{note.octave}</span>
                    <span className="note__frequence">
                        {note.frequenceHz.toFixed(1)} Hz
                    </span>
                </div>
            </AnneauSVG>

            {/* ── Feedback directionnel ── */}
            <FeedbackDirectionnel
                evaluation={evaluation}
                progression={progressionStabilisation}
            />

            {/* ── Jauge de cents ── */}
            <JaugeCents ecartCents={ecartCents} evaluation={evaluation} />

            {/* Valeur numérique de l'écart */}
            {ecartCents !== null && (
                <p className="note-target__ecart">
                    {ecartCents > 0 ? "+" : ""}{ecartCents} cents
                </p>
            )}

            {/* ── Bouton skip ── */}
            {/* Désactivé pendant l'overlay de validation pour éviter les conflits */}
            <button
                className="note-target__btn-skip"
                onClick={onSkip}
                disabled={noteValidee}
                type="button"
                aria-label="Passer cette note sans la valider"
            >
                Passer cette note →
            </button>

        </div>
    );
}