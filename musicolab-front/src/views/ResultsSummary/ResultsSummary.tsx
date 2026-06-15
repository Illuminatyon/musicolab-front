/**
 * @file ResultsSummary.tsx
 * @description Composant View — Bilan de fin de session.
 *
 * Affiche le résultat complet d'une session d'évaluation vocale :
 * - Score global en pourcentage (coloré selon la performance)
 * - Appréciation qualitative
 * - Tableau détaillé note par note (via LigneResultat)
 * - Bouton pour démarrer une nouvelle session
 *
 * Ce composant est purement présentationnel (Dumb Component) :
 * toutes ses données viennent de la prop `bilan` générée par genererBilan().
 *
 * Notions du cours : Composants + Props (S2), Listes & Keys (S2)
 */

import "./ResultsSummary.css";
import LigneResultat from "./components/LigneResultat";
import type { BilanSession } from "../../models/noteModel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultsSummaryProps {
    /** Bilan complet généré par genererBilan() dans useNoteSession */
    bilan: BilanSession;
    /** Callback pour revenir à la configuration et démarrer une nouvelle session */
    onRecommencer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Bilan de fin de session d'évaluation vocale.
 *
 * @param props.bilan - Données de bilan calculées par le Model
 * @param props.onRecommencer - Action de retour à la configuration
 */
export default function ResultsSummary({ bilan, onRecommencer }: ResultsSummaryProps) {

    /**
     * Détermine la classe CSS du score selon sa valeur.
     * - ≥ 90% → vert   (excellent)
     * - ≥ 70% → vert clair (bien)
     * - ≥ 50% → orange (passable)
     * - < 50% → rouge  (à retravailler)
     */
    const classeScore = bilan.scorePourcentage >= 90 ? "score--excellent"
        : bilan.scorePourcentage >= 70 ? "score--bien"
            : bilan.scorePourcentage >= 50 ? "score--passable"
                : "score--faible";

    return (
        <div className="results">

            {/* ── En-tête : score et appréciation ── */}
            <div className="results__header">
                <h2 className="results__titre">Bilan de session</h2>

                <div className={`results__score ${classeScore}`}>
                    <span className="score__valeur">{bilan.scorePourcentage}</span>
                    <span className="score__unite">%</span>
                </div>

                <p className="results__appreciation">{bilan.appreciation}</p>

                <p className="results__compteur">
                    {bilan.notesJustes} note{bilan.notesJustes > 1 ? "s" : ""} juste
                    {bilan.notesJustes > 1 ? "s" : ""} sur {bilan.totalNotes}
                </p>
            </div>

            {/* ── Tableau détaillé note par note ── */}
            <div className="results__liste">
                <h3 className="results__liste-titre">Détail</h3>
                {bilan.resultats.map((r, i) => (
                    <LigneResultat key={i} resultat={r} index={i} />
                ))}
            </div>

            {/* ── Bouton nouvelle session ── */}
            <button
                className="results__btn"
                onClick={onRecommencer}
                type="button"
            >
                Nouvelle session
            </button>

        </div>
    );
}