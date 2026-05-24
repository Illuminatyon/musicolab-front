/**
 * ResultsSummary.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View — Composant de bilan de fin de session.
 *
 * Responsabilités :
 *  - Afficher le score global et l'appréciation
 *  - Lister les résultats note par note
 *  - Proposer de relancer une nouvelle session
 *
 * Composant purement présentationnel (Dumb Component) :
 * toute la logique vient des props passées par PitchDetector (cours S2 — Props).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "./ResultsSummary.css";
import type { BilanSession, EvaluationJustesse } from "../../models/noteModel";

// ─── Types des props ─────────────────────────────────────────────────────────

interface ResultsSummaryProps {
    /** Bilan complet généré par le Model */
    bilan: BilanSession;
    /** Callback pour relancer une nouvelle session */
    onRecommencer: () => void;
}

// ─── Configuration de l'affichage des évaluations ────────────────────────────

const LABEL_EVALUATION: Record<EvaluationJustesse, string> = {
    juste:     "Juste ✓",
    trop_haut: "Trop haut ↑",
    trop_bas:  "Trop bas ↓",
    silence:   "Silence …",
};

const CLASSE_EVALUATION: Record<EvaluationJustesse, string> = {
    juste:     "resultat__badge--juste",
    trop_haut: "resultat__badge--erreur",
    trop_bas:  "resultat__badge--erreur",
    silence:   "resultat__badge--silence",
};

// ─── Composant ───────────────────────────────────────────────────────────────

/**
 * Affiche le bilan complet d'une session d'évaluation vocale.
 *
 * @param props - ResultsSummaryProps
 */
export default function ResultsSummary({
                                           bilan,
                                           onRecommencer,
                                       }: ResultsSummaryProps) {

    /**
     * Détermine la classe CSS du score selon sa valeur.
     * Permet une couleur différente selon la performance.
     */
    const classeScore = (): string => {
        if (bilan.scorePourcentage >= 90) return "score--excellent";
        if (bilan.scorePourcentage >= 70) return "score--bien";
        if (bilan.scorePourcentage >= 50) return "score--passable";
        return "score--faible";
    };

    return (
        <div className="results-summary">

            {/* ── En-tête avec score global ── */}
            <div className="results-summary__header">
                <h2 className="results-summary__titre">Bilan de session</h2>

                <div className={`results-summary__score ${classeScore()}`}>
          <span className="results-summary__score-valeur">
            {bilan.scorePourcentage}
          </span>
                    <span className="results-summary__score-unite">%</span>
                </div>

                <p className="results-summary__appreciation">
                    {bilan.appreciation}
                </p>

                {/* Compteur notes justes / total */}
                <p className="results-summary__compteur">
                    {bilan.notesJustes} note{bilan.notesJustes > 1 ? "s" : ""} juste
                    {bilan.notesJustes > 1 ? "s" : ""} sur {bilan.totalNotes}
                </p>
            </div>

            {/* ── Résultats note par note ── */}
            <div className="results-summary__liste">
                <h3 className="results-summary__liste-titre">Détail</h3>

                {bilan.resultats.map((resultat, index) => (
                    <div key={index} className="resultat">

                        {/* Numéro et nom de la note cible */}
                        <div className="resultat__note">
                            <span className="resultat__index">{index + 1}</span>
                            <span className="resultat__nom">
                {resultat.noteCible.nom}
                                <sub>{resultat.noteCible.octave}</sub>
              </span>
                            <span className="resultat__frequence">
                {resultat.noteCible.frequenceHz.toFixed(1)} Hz
              </span>
                        </div>

                        {/* Écart en cents */}
                        <div className="resultat__ecart">
                            {resultat.ecartCents !== null ? (
                                <span className="resultat__ecart-valeur">
                  {resultat.ecartCents > 0 ? "+" : ""}
                                    {resultat.ecartCents}¢
                </span>
                            ) : (
                                <span className="resultat__ecart-valeur">—</span>
                            )}
                        </div>

                        {/* Badge d'évaluation */}
                        <span
                            className={`resultat__badge ${CLASSE_EVALUATION[resultat.evaluation]}`}
                        >
              {LABEL_EVALUATION[resultat.evaluation]}
            </span>
                    </div>
                ))}
            </div>

            {/* ── Bouton recommencer ── */}
            <button
                className="results-summary__bouton-recommencer"
                onClick={onRecommencer}
                type="button"
            >
                Nouvelle session
            </button>
        </div>
    );
}