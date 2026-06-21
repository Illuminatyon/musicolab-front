/**
 * @file ControlesPiste.tsx
 * @description Composant View — Contrôles d'une piste individuelle.
 *
 * Affiche l'identification de la piste (couleur + nom) et le sélecteur
 * du nombre de pas par cycle.
 * Composant purement présentationnel (Dumb Component).
 */

import { OPTIONS_PAS, type Piste } from "../../../models/rhythmModel.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlesPisteProps {
    /** Données de la piste */
    piste: Piste;
    /** Changer le nombre de pas */
    onModifierNombrePas: (nombrePas: number) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Panneau de configuration d'une piste du séquenceur.
 *
 * @param props.piste - Données de la piste
 * @param props.onModifierNombrePas - Callback changement de pas
 */
export default function ControlesPiste({ piste, onModifierNombrePas }: ControlesPisteProps) {
    return (
        <div className="controles-piste">
            {/* Indicateur couleur + nom */}
            <div className="controles-piste__header">
                <span
                    className="controles-piste__dot"
                    style={{ background: piste.couleur }}
                    aria-hidden="true"
                />
                <span className="controles-piste__nom">{piste.nom}</span>
                <span className="controles-piste__info">
                    {piste.pas.filter(Boolean).length}/{piste.nombrePas} pas
                </span>
            </div>

            {/* Sélecteur de nombre de pas */}
            <div className="controles-piste__options">
                {OPTIONS_PAS.map((n) => {
                    const actif = piste.nombrePas === n;
                    return (
                        <button
                            key={n}
                            className={`controles-piste__btn ${actif ? 'controles-piste__btn--actif' : ''}`}
                            style={actif ? { borderColor: piste.couleur, color: piste.couleur } : {}}
                            onClick={() => onModifierNombrePas(n)}
                            aria-pressed={actif}
                            title={`${n} pas par cycle`}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
