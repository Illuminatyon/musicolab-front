/**
 * LigneResultat.tsx
 * Une ligne du tableau de bilan — composant réutilisable.
 */

import type { ResultatNote, EvaluationJustesse } from "../../../models/noteModel";

const LABEL: Record<EvaluationJustesse, string> = {
    juste: "Juste ✓", trop_haut: "Trop haut ↑",
    trop_bas: "Trop bas ↓", silence: "Passé …",
};
const CLASSE: Record<EvaluationJustesse, string> = {
    juste: "badge--juste", trop_haut: "badge--erreur",
    trop_bas: "badge--erreur", silence: "badge--silence",
};

interface LigneResultatProps {
    resultat: ResultatNote;
    index: number;
}

export default function LigneResultat({ resultat, index }: LigneResultatProps) {
    return (
        <div className="resultat">
            <div className="resultat__note">
                <span className="resultat__index">{index + 1}</span>
                <span className="resultat__nom">
          {resultat.noteCible.nom}<sub>{resultat.noteCible.octave}</sub>
        </span>
                <span className="resultat__hz">{resultat.noteCible.frequenceHz.toFixed(1)} Hz</span>
            </div>
            <span className="resultat__ecart">
        {resultat.ecartCents !== null
            ? `${resultat.ecartCents > 0 ? "+" : ""}${resultat.ecartCents}¢`
            : "—"}
      </span>
            <span className={`resultat__badge ${CLASSE[resultat.evaluation]}`}>
        {LABEL[resultat.evaluation]}
      </span>
        </div>
    );
}