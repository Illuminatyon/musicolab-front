/**
 * @file AnneauPiste.tsx
 * @description Composant View — Anneau SVG d'une piste du séquenceur.
 *
 * Affiche un anneau concentrique avec N segments d'arc (un par pas).
 * Chaque segment est cliquable pour activer/désactiver le pas.
 *
 * Rendu SVG :
 * - Segment inactif  : gris sombre (#2a2a2a)
 * - Segment actif    : couleur de la piste à 65 % d'opacité
 * - Pas courant      : couleur à 100 %, trait plus épais
 *
 * Les angles démarrent à 12h (−π/2) et progressent dans le sens horaire,
 * comme un cercle de rythme traditionnel.
 *
 * Ce composant est purement présentationnel (Dumb Component).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnneauPisteProps {
    /** État de chaque pas (actif / inactif) */
    pas: boolean[];
    /** Couleur CSS de la piste */
    couleur: string;
    /** Rayon de l'anneau en unités SVG (viewBox 300×300) */
    rayon: number;
    /** Index du pas en cours de lecture (-1 si arrêté) */
    pasCourant: number;
    /** Épaisseur du trait SVG */
    epaisseur?: number;
    /** Déclenché au clic sur un segment */
    onBasculerPas: (indexPas: number) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Espacement angulaire entre deux segments (~4°) pour que les arcs soient séparés visuellement */
const GAP_RADIANS = 0.07;

/** Centre du viewBox SVG partagé (300×300) */
const CX = 150;
const CY = 150;

// ─── Utilitaires SVG ─────────────────────────────────────────────────────────

/**
 * Coordonnées d'un point sur le cercle à un angle donné.
 *
 * @param rayon - Rayon en unités SVG
 * @param angle - Angle en radians (−π/2 = 12h)
 */
function pointSurCercle(rayon: number, angle: number): { x: number; y: number } {
    return {
        x: CX + rayon * Math.cos(angle),
        y: CY + rayon * Math.sin(angle),
    };
}

/**
 * Commande SVG `d` pour un arc de cercle entre deux angles.
 *
 * @param rayon - Rayon en unités SVG
 * @param angleDebut - Angle de début en radians
 * @param angleFin - Angle de fin en radians
 */
function arcPath(rayon: number, angleDebut: number, angleFin: number): string {
    const debut      = pointSurCercle(rayon, angleDebut);
    const fin        = pointSurCercle(rayon, angleFin);
    const largeArc   = angleFin - angleDebut > Math.PI ? 1 : 0;
    return `M ${debut.x.toFixed(3)} ${debut.y.toFixed(3)} A ${rayon} ${rayon} 0 ${largeArc} 1 ${fin.x.toFixed(3)} ${fin.y.toFixed(3)}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Anneau SVG d'une piste du séquenceur.
 *
 * @param pas - Tableau des pas (actifs/inactifs)
 * @param couleur - Couleur CSS de la piste
 * @param rayon - Rayon de l'anneau
 * @param pasCourant - Index du pas en lecture (-1 = arrêté)
 * @param epaisseur - Épaisseur du trait (défaut : 10)
 * @param onBasculerPas - Callback clic
 *
 * @example
 * <AnneauPiste
 *   pas={[true, false, true, false]}
 *   couleur="#C8102E"
 *   rayon={118}
 *   pasCourant={0}
 *   onBasculerPas={(i) => toggle(i)}
 * />
 */
export default function AnneauPiste({
    pas, couleur, rayon, pasCourant, epaisseur = 10, onBasculerPas
}: Readonly<AnneauPisteProps>) {
    const N        = pas.length;
    const anglePas = (2 * Math.PI) / N;

    return (
        <g>
            {pas.map((actif, i) => {
                const angleDebut  = anglePas * i - Math.PI / 2;
                const angleFin    = angleDebut + anglePas - GAP_RADIANS;
                const estCourant  = pasCourant === i;

                const stroke      = actif || estCourant ? couleur : '#2a2a2a';
                const opacity     = estCourant ? 1 : actif ? 0.65 : 1;
                const strokeWidth = estCourant ? epaisseur + 3 : epaisseur;

                return (
                    <path
                        key={i}
                        d={arcPath(rayon, angleDebut, angleFin)}
                        stroke={stroke}
                        strokeOpacity={opacity}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        style={{
                            cursor: 'pointer',
                            transition: 'stroke 0.08s ease, stroke-opacity 0.08s ease, stroke-width 0.08s ease',
                        }}
                        onClick={() => onBasculerPas(i)}
                        role="checkbox"
                        aria-checked={actif}
                        aria-label={`Pas ${i + 1} sur ${N}`}
                    />
                );
            })}
        </g>
    );
}
