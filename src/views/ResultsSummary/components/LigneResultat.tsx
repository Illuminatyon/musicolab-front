/**
 * @file LigneResultat.tsx
 * @description Composant View — Une ligne du tableau de bilan.
 *
 * Affiche le résultat d'une note dans la liste de bilan :
 * - Numéro, nom et fréquence de la note cible
 * - Écart mesuré en cents (ou "—" si la note a été passée)
 * - Badge coloré selon l'évaluation
 *
 * Ce composant est purement présentationnel (Dumb Component).
 * Extrait de ResultsSummary pour respecter le principe de responsabilité unique.
 * Notions du cours : Composants + Props (S2)
 */

import type { ResultatNote, EvaluationJustesse } from "../../../models/noteModel.ts";

// ─── Configuration d'affichage ────────────────────────────────────────────────

/** Labels affichés dans le badge selon l'évaluation */
const LABEL: Record<EvaluationJustesse, string> = {
    juste:     "Juste ✓",
    trop_haut: "Trop haut ↑",
    trop_bas:  "Trop bas ↓",
    silence:   "Passé …",
};

/** Classes CSS du badge selon l'évaluation */
const CLASSE: Record<EvaluationJustesse, string> = {
    juste:     "badge--juste",
    trop_haut: "badge--erreur",
    trop_bas:  "badge--erreur",
    silence:   "badge--silence",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface LigneResultatProps {
    /** Résultat complet de la tentative sur cette note */
    resultat: ResultatNote;
    /** Position dans la session (commence à 0, affiché à partir de 1) */
    index: number;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Ligne individuelle du tableau de bilan de session.
 *
 * @param props.resultat - Données de résultat pour cette note
 * @param props.index - Index 0-based (affiché +1 dans l'UI)
 *
 * @example
 * <LigneResultat
 *   resultat={{ noteCible: la4, ecartCents: -8, evaluation: "juste" }}
 *   index={0}
 * />
 * // Affiche : "1  La₄  440.0 Hz  -8¢  Juste ✓"
 */
export default function LigneResultat({ resultat, index }: LigneResultatProps) {
    return (
        <div className="resultat">

            {/* ── Informations sur la note cible ── */}
            <div className="resultat__note">
                <span className="resultat__index">{index + 1}</span>
                <span className="resultat__nom">
                    {resultat.noteCible.nom}
                    <sub>{resultat.noteCible.octave}</sub>
                </span>
                <span className="resultat__hz">
                    {resultat.noteCible.frequenceHz.toFixed(1)} Hz
                </span>
            </div>

            {/* ── Écart mesuré en cents ── */}
            {/* Affiche "—" si la note a été passée (ecartCents null) */}
            <span className="resultat__ecart">
                {resultat.ecartCents !== null
                    ? `${resultat.ecartCents > 0 ? "+" : ""}${resultat.ecartCents}¢`
                    : "—"}
            </span>

            {/* ── Badge d'évaluation coloré ── */}
            <span className={`resultat__badge ${CLASSE[resultat.evaluation]}`}>
                {LABEL[resultat.evaluation]}
            </span>

        </div>
    );
}