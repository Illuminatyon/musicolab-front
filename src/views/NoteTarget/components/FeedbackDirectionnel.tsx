/**
 * @file FeedbackDirectionnel.tsx
 * @description Composant View — Feedback directionnel en temps réel.
 *
 * Affiche le retour visuel immédiat sur la justesse de la voix :
 * emoji + label + compte à rebours pendant la stabilisation.
 *
 * Ce composant est purement présentationnel (Dumb Component).
 * Notions du cours : Composants + Props (S2), Rendu Conditionnel (S2)
 */

import type { EvaluationJustesse } from "../../../models/noteModel.ts";
/**
 * Mapping évaluation → données d'affichage.
 * Centralisé ici pour éviter la duplication entre composants.
 */
const FEEDBACK_CONFIG: Record<
    EvaluationJustesse,
    { label: string; emoji: string; classe: string }
> = {
    juste:     { label: "Juste",     emoji: "✓", classe: "feedback--juste"     },
    trop_haut: { label: "Trop haut", emoji: "↑", classe: "feedback--trop-haut" },
    trop_bas:  { label: "Trop bas",  emoji: "↓", classe: "feedback--trop-bas"  },
    silence:   { label: "Silence",   emoji: "…", classe: "feedback--silence"   },
};

interface FeedbackDirectionnelProps {
    /** Évaluation courante de la voix (null si session non démarrée) */
    evaluation: EvaluationJustesse | null;
    /** Progression de stabilisation entre 0 et 1 — déclenche le compte à rebours */
    progression: number;
}

/**
 * Bloc de feedback directionnel : emoji + label textuel + compte à rebours.
 *
 * Le compte à rebours (3.0s → 0.0s) n'est affiché que quand la note est juste
 * ET que la stabilisation est en cours (progression > 0).
 *
 * @param evaluation - Résultat de l'évaluation temps réel
 * @param progression - Avancement du timer de 3s (0 → 1)
 *
 * @example
 * <FeedbackDirectionnel evaluation="juste" progression={0.5} />
 * // Affiche : ✓ JUSTE  1.5s
 */
export default function FeedbackDirectionnel({
                                                 evaluation,
                                                 progression,
                                             }: Readonly<FeedbackDirectionnelProps>) {
    const fb = evaluation ? FEEDBACK_CONFIG[evaluation] : null;

    // Le compte à rebours n'est visible que pendant la stabilisation d'une note juste
    const enProgression = progression > 0 && evaluation === "juste";

    return (
        <div className={`note-target__feedback ${fb ? fb.classe : "feedback--silence"}`}>
            <span className="feedback__emoji">{fb ? fb.emoji : "…"}</span>
            <span className="feedback__label">
                {fb ? fb.label : "Chantez la note"}
            </span>
            {/* Compte à rebours : 3 - (progression × 3) secondes restantes */}
            {enProgression && (
                <span className="feedback__rebours">
                    {(3 - progression * 3).toFixed(1)}s
                </span>
            )}
        </div>
    );
}