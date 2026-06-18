/**
 * @file JaugeCents.tsx
 * @description Composant View — Jauge visuelle de l'écart en cents.
 *
 * Représente l'écart entre la fréquence chantée et la note cible
 * sur une plage de -50¢ à +50¢, avec :
 * - Une zone verte centrale (±25¢ = tolérance de justesse)
 * - Un curseur mobile indiquant la position exacte de la voix
 * - Une ligne centrale marquant 0¢ (note exacte)
 *
 * Ce composant est purement présentationnel (Dumb Component).
 * Notions du cours : Composants + Props (S2)
 */

import type { EvaluationJustesse } from "../../../models/noteModel.ts";

interface JaugeCentsProps {
    /** Écart en cents entre la voix et la note cible. Null si silence. */
    ecartCents: number | null;
    /** Évaluation courante — détermine la couleur du curseur */
    evaluation: EvaluationJustesse | null;
}

/**
 * Jauge linéaire de justesse en cents (-50¢ à +50¢).
 *
 * Conversion de l'écart en position CSS :
 * - Plage d'affichage : -50¢ à +50¢ (clampée si hors limites)
 * - Formule : position% = (écart + 50) / 100 × 100
 * - -50¢ → 0% (extrême gauche)
 * -   0¢ → 50% (centre)
 * - +50¢ → 100% (extrême droite)
 *
 * @param ecartCents - Écart mesuré en cents
 * @param evaluation - Pour coloriser le curseur (vert si juste, rouge sinon)
 *
 * @example
 * <JaugeCents ecartCents={-15} evaluation="juste" />
 * // Curseur vert légèrement à gauche du centre
 */
export default function JaugeCents({ ecartCents, evaluation }: Readonly<JaugeCentsProps>) {
    /**
     * Calcule la position du curseur en pourcentage (0% = gauche, 100% = droite).
     * Clamp l'écart entre -50 et +50 pour éviter que le curseur sorte de la jauge.
     */
    const positionCurseur = (): number => {
        if (ecartCents === null) return 50; // centré si silence
        const clamp = Math.max(-50, Math.min(50, ecartCents));
        return ((clamp + 50) / 100) * 100;
    };

    return (
        <div className="note-target__jauge-wrapper">
            <span className="jauge__label">−50¢</span>

            <div className="jauge">
                {/* Zone verte centrale = ±25¢ de tolérance (25% à 75% de la jauge) */}
                <div className="jauge__zone-juste" />

                {/* Curseur mobile — visible uniquement si une fréquence est détectée */}
                {ecartCents !== null && (
                    <div
                        className={`jauge__curseur ${
                            evaluation === "juste" ? "curseur--juste" : "curseur--hors"
                        }`}
                        style={{ left: `${positionCurseur()}%` }}
                    />
                )}

                {/* Ligne centrale = 0¢ (note exacte en tempérament égal) */}
                <div className="jauge__centre" />
            </div>

            <span className="jauge__label">+50¢</span>
        </div>
    );
}