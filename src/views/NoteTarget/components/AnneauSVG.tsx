/**
 * @file AnneauSVG.tsx
 * @description Composant View — Anneau de progression SVG.
 *
 * Affiche un cercle SVG qui se remplit progressivement en vert
 * pendant les 3 secondes de stabilisation vocale.
 *
 * Technique SVG utilisée : stroke-dasharray / stroke-dashoffset.
 * - stroke-dasharray = circonférence totale du cercle
 * - stroke-dashoffset = portion non remplie = C × (1 - progression)
 * Quand progression passe de 0 à 1, l'arc passe de 0% à 100%.
 *
 * Ce composant est purement présentationnel (Dumb Component) :
 * il ne contient aucune logique métier, uniquement du rendu visuel.
 */

import type { ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnneauSVGProps {
    /** Progression entre 0 (vide) et 1 (complet) */
    progression: number;
    /** Si false, l'anneau est invisible (opacity: 0) */
    actif: boolean;
    /** Contenu affiché au centre de l'anneau (typiquement la note cible) */
    children: ReactNode;
}

// ─── Constantes SVG ───────────────────────────────────────────────────────────

/** Rayon du cercle SVG en unités SVG (viewBox 120×120) */
const RAYON = 54;

/** Circonférence du cercle : C = 2π × r */
const CIRCONFERENCE = 2 * Math.PI * RAYON;

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Anneau SVG de progression circulaire.
 *
 * @param props.progression - Avancement de 0 à 1
 * @param props.actif - Contrôle la visibilité de l'anneau
 * @param props.children - Contenu centré dans l'anneau
 *
 * @example
 * <AnneauSVG progression={0.5} actif={true}>
 *   <span>La4</span>
 * </AnneauSVG>
 */
export default function AnneauSVG({ progression, actif, children }: AnneauSVGProps) {
    // Calcul de l'offset : 0 = cercle complet, CIRCONFERENCE = cercle vide
    const offset = CIRCONFERENCE * (1 - progression);

    return (
        <div className="note-target__cercle-wrapper">
            <svg
                className={`cercle-svg ${actif ? "cercle-svg--actif" : ""}`}
                viewBox="0 0 120 120"
                aria-hidden="true" // décoratif — pas de valeur sémantique pour les lecteurs d'écran
            >
                {/* Piste de fond grise — toujours visible */}
                <circle
                    cx="60" cy="60" r={RAYON}
                    fill="none"
                    stroke="#2a2a2a"
                    strokeWidth="4"
                />
                {/* Arc de progression vert — animé via stroke-dashoffset */}
                <circle
                    cx="60" cy="60" r={RAYON}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRCONFERENCE}
                    strokeDashoffset={offset}
                    transform="rotate(-90 60 60)" // démarre à 12h et non à 3h
                    style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
            </svg>

            {/* Contenu centré — positionné en absolu au centre du SVG */}
            {children}
        </div>
    );
}