/**
 * FeedbackDirectionnel.tsx
 * Bloc de feedback : emoji + label + compte à rebours.
 * Composant réutilisable, aucune logique métier.
 */

import type { EvaluationJustesse } from "../../../models/noteModel";

const FEEDBACK: Record<EvaluationJustesse, { label: string; emoji: string; classe: string }> = {
    juste:     { label: "Juste",     emoji: "✓", classe: "feedback--juste"     },
    trop_haut: { label: "Trop haut", emoji: "↑", classe: "feedback--trop-haut" },
    trop_bas:  { label: "Trop bas",  emoji: "↓", classe: "feedback--trop-bas"  },
    silence:   { label: "Silence",   emoji: "…", classe: "feedback--silence"   },
};

interface FeedbackDirectionnelProps {
    evaluation: EvaluationJustesse | null;
    progression: number;
}

export default function FeedbackDirectionnel({ evaluation, progression }: FeedbackDirectionnelProps) {
    const fb = evaluation ? FEEDBACK[evaluation] : null;
    const enProgression = progression > 0 && evaluation === "juste";

    return (
        <div className={`note-target__feedback ${fb ? fb.classe : "feedback--silence"}`}>
            <span className="feedback__emoji">{fb ? fb.emoji : "…"}</span>
            <span className="feedback__label">{fb ? fb.label : "Chantez la note"}</span>
            {enProgression && (
                <span className="feedback__rebours">
          {(3 - progression * 3).toFixed(1)}s
        </span>
            )}
        </div>
    );
}