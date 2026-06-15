/**
 * ResultsSummary.tsx — couche View (MVC)
 * Composant présentationnel : bilan de fin de session.
 * Notions du cours : Composants + Props (S2), Listes & Keys (S2)
 */

import "./ResultsSummary.css";
import LigneResultat from "./components/LigneResultat";
import type { BilanSession } from "../../models/noteModel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultsSummaryProps {
    bilan: BilanSession;
    onRecommencer: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ResultsSummary({ bilan, onRecommencer }: ResultsSummaryProps) {

    const classeScore = bilan.scorePourcentage >= 90 ? "score--excellent"
        : bilan.scorePourcentage >= 70 ? "score--bien"
            : bilan.scorePourcentage >= 50 ? "score--passable"
                : "score--faible";

    return (
        <div className="results">

            {/* En-tête — score global et appréciation */}
            <div className="results__header">
                <h2 className="results__titre">Bilan de session</h2>
                <div className={`results__score ${classeScore}`}>
                    <span className="score__valeur">{bilan.scorePourcentage}</span>
                    <span className="score__unite">%</span>
                </div>
                <p className="results__appreciation">{bilan.appreciation}</p>
                <p className="results__compteur">
                    {bilan.notesJustes} note{bilan.notesJustes > 1 ? "s" : ""} juste{bilan.notesJustes > 1 ? "s" : ""} sur {bilan.totalNotes}
                </p>
            </div>

            {/* Liste des résultats note par note */}
            <div className="results__liste">
                <h3 className="results__liste-titre">Détail</h3>
                {bilan.resultats.map((r, i) => (
                    <LigneResultat key={i} resultat={r} index={i} />
                ))}
            </div>

            <button className="results__btn" onClick={onRecommencer} type="button">
                Nouvelle session
            </button>

        </div>
    );
}