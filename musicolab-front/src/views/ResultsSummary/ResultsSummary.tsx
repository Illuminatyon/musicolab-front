/**
 * ResultsSummary.tsx — couche View (MVC)
 * Composant présentationnel : bilan de fin de session.
 * Notions du cours : Composants + Props (S2), Listes & Keys (S2)
 */

import "./ResultsSummary.css";
import type { BilanSession, EvaluationJustesse } from "../../models/noteModel";

interface ResultsSummaryProps {
    bilan: BilanSession;
    onRecommencer: () => void;
}

const LABEL: Record<EvaluationJustesse, string> = {
    juste: "Juste ✓", trop_haut: "Trop haut ↑", trop_bas: "Trop bas ↓", silence: "Passé …",
};
const CLASSE: Record<EvaluationJustesse, string> = {
    juste: "badge--juste", trop_haut: "badge--erreur", trop_bas: "badge--erreur", silence: "badge--silence",
};

export default function ResultsSummary({ bilan, onRecommencer }: ResultsSummaryProps) {
    const classeScore = bilan.scorePourcentage >= 90 ? "score--excellent"
        : bilan.scorePourcentage >= 70 ? "score--bien"
            : bilan.scorePourcentage >= 50 ? "score--passable"
                : "score--faible";

    return (
        <div className="results">
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

            <div className="results__liste">
                <h3 className="results__liste-titre">Détail</h3>
                {bilan.resultats.map((r, i) => (
                    <div key={i} className="resultat">
                        <div className="resultat__note">
                            <span className="resultat__index">{i + 1}</span>
                            <span className="resultat__nom">{r.noteCible.nom}<sub>{r.noteCible.octave}</sub></span>
                            <span className="resultat__hz">{r.noteCible.frequenceHz.toFixed(1)} Hz</span>
                        </div>
                        <span className="resultat__ecart">
              {r.ecartCents !== null ? `${r.ecartCents > 0 ? "+" : ""}${r.ecartCents}¢` : "—"}
            </span>
                        <span className={`resultat__badge ${CLASSE[r.evaluation]}`}>{LABEL[r.evaluation]}</span>
                    </div>
                ))}
            </div>

            <button className="results__btn" onClick={onRecommencer} type="button">
                Nouvelle session
            </button>
        </div>
    );
}