/**
 * @file SessionEnCours.tsx
 * @description Composant View — Affichage de la session active.
 *
 * Regroupe tous les éléments visuels de la phase "en_cours" :
 * - Indicateur de statut du microphone
 * - Composant NoteTarget (note + feedback + jauge + anneau)
 * - Bouton d'abandon
 *
 * Ce composant est purement présentationnel (Dumb Component) :
 * il ne contient aucune logique métier, toutes ses données viennent des props.
 * Extrait de PitchDetector pour respecter le principe de responsabilité unique.
 *
 * Notions du cours : Composants + Props (S2)
 */

import type { Note, EvaluationJustesse } from "../../models/noteModel";
import NoteTarget from "../NoteTarget/noteTarget";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionEnCoursProps {
    /** Statut du microphone — détermine la couleur de l'indicateur */
    statut: string;
    /** Note que l'utilisateur doit chanter actuellement */
    noteCourante: Note;
    /** Index de la note courante dans la session */
    indexNote: number;
    /** Nombre total de notes dans la session */
    totalNotes: number;
    /** Évaluation temps réel de la voix */
    evaluation: EvaluationJustesse | null;
    /** Écart en cents entre la voix et la note cible */
    ecartCents: number | null;
    /** Progression de stabilisation entre 0 et 1 */
    progressionStabilisation: number;
    /** Vrai pendant 1s après validation — affiche l'overlay de succès */
    noteValidee: boolean;
    /** Callback pour passer la note courante */
    onSkip: () => void;
    /** Callback pour abandonner la session et revenir à la configuration */
    onAbandonner: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Phase "en_cours" de la session d'évaluation.
 *
 * @param props - SessionEnCoursProps
 */
export default function SessionEnCours({
                                           statut, noteCourante, indexNote, totalNotes,
                                           evaluation, ecartCents,
                                           progressionStabilisation, noteValidee,
                                           onSkip, onAbandonner,
                                       }: SessionEnCoursProps) {
    return (
        <div className="pitch-detector__session">

            {/* ── Indicateur de statut microphone ── */}
            <div
                className={`statut-micro statut--${statut}`}
                role="status"
                aria-live="polite"
            >
                <span className="statut__point" aria-hidden="true" />
                <span className="statut__texte">
                    {statut === "actif" ? "Micro actif" : statut}
                </span>
            </div>

            {/* ── Composant principal d'évaluation ── */}
            <NoteTarget
                note={noteCourante}
                indexNote={indexNote}
                totalNotes={totalNotes}
                evaluation={evaluation}
                ecartCents={ecartCents}
                progressionStabilisation={progressionStabilisation}
                noteValidee={noteValidee}
                onSkip={onSkip}
            />

            {/* ── Bouton d'abandon ── */}
            <button
                className="pitch-detector__btn-secondaire"
                onClick={onAbandonner}
                type="button"
            >
                Abandonner
            </button>

        </div>
    );
}