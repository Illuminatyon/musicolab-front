/**
 * @file RhythmCircle.tsx
 * @description Couche View — Smart Component principal du Module 2.
 *
 * RhythmCircle est le seul composant "intelligent" du module :
 * il consomme useRhythmCircle et distribue les données aux composants
 * enfants présentationnels via props.
 *
 * Structure de l'interface :
 *   ┌─────────────────────────────────────┐
 *   │  ← Accueil           [Module 2]    │
 *   │         Rhythm Circle              │
 *   ├─────────────────────────────────────┤
 *   │      SVG — 3 anneaux concentriques │
 *   │    (clic sur segment = toggle pas) │
 *   ├─────────────────────────────────────┤
 *   │  Piste A [4][6][8][12][16]         │
 *   │  Piste B [4][6][8][12][16]   BPM  │
 *   │  Piste C [4][6][8][12][16]  ▶ ■   │
 *   └─────────────────────────────────────┘
 *
 * Notions du cours appliquées :
 * - Composants + Props (S2) : distribution aux enfants
 * - Rendu conditionnel (S2) : indicateur visuel selon la phase
 * - Custom Hooks (S5) : useRhythmCircle
 */

import { useNavigate } from "react-router-dom";
import "./RhythmCircle.css";

import { useRhythmCircle }  from "../../controllers/useRhythmCircle.ts";
import AnneauPiste          from "./components/AnneauPiste.tsx";
import ControlesPiste       from "./components/ControlesPiste.tsx";
import ControlesBPM         from "./components/ControlesBPM.tsx";

// ─── Constantes SVG ───────────────────────────────────────────────────────────

/**
 * Rayons des 3 anneaux (externe → interne) en unités SVG (viewBox 300×300).
 * Espacement de 33 unités entre anneaux pour éviter les chevauchements
 * même à l'épaisseur maximale.
 */
const RAYONS: readonly [number, number, number] = [118, 83, 50];

/** Épaisseurs des traits — légèrement décroissantes pour la hiérarchie visuelle */
const EPAISSEURS: readonly [number, number, number] = [11, 10, 9];

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Composant racine du Module 2 — Cercle de rythme interactif.
 * Point d'entrée unique monté dans App.tsx sur la route /module/2.
 */
export default function RhythmCircle() {
    const navigate = useNavigate();

    const {
        bpm, pistes, phase, pasCourtants,
        demarrerPause, reinitialiser,
        modifierBPM, basculerPasPiste, modifierNombrePasPiste,
    } = useRhythmCircle();

    // Couleur de l'indicateur central selon la phase
    const couleurPhase =
        phase === "lecture" ? "#22c55e" :
        phase === "pause"   ? "#f59e0b" :
                              "#2a2a2a";

    const libellePhase =
        phase === "lecture" ? "PLAY" :
        phase === "pause"   ? "PAUSE" :
                              "STOP";

    return (
        <div className="rhythm-circle">

            {/* ── Bouton retour ── */}
            <button
                className="rhythm-circle__retour"
                onClick={() => navigate("/")}
                aria-label="Retour à l'accueil"
            >
                ← Accueil
            </button>

            {/* ── En-tête ── */}
            <header className="rhythm-circle__header">
                <div className="badge">Module 2</div>
                <h1 className="titre">Rhythm Circle</h1>
                <p className="sous-titre">Superposez jusqu'à 3 pistes rythmiques — cliquez sur les segments</p>
            </header>

            {/* ── Cercle SVG ── */}
            <div className="rhythm-circle__svg-wrapper">
                <svg
                    className="rhythm-circle__svg"
                    viewBox="0 0 300 300"
                    aria-label="Cercle de rythme interactif"
                    role="group"
                >
                    {/* Fond */}
                    <circle cx="150" cy="150" r="143" fill="#0d0d0d" />

                    {/* Cercle de référence central */}
                    <circle cx="150" cy="150" r="28" fill="none" stroke="#1a1a1a" strokeWidth="1" />

                    {/* Anneaux des pistes (externe → interne) */}
                    {pistes.map((piste, i) => (
                        <AnneauPiste
                            key={piste.id}
                            pas={piste.pas}
                            couleur={piste.couleur}
                            rayon={RAYONS[i]}
                            epaisseur={EPAISSEURS[i]}
                            pasCourant={pasCourtants[i] ?? -1}
                            onBasculerPas={(indexPas) => basculerPasPiste(piste.id, indexPas)}
                        />
                    ))}

                    {/* Indicateur de phase au centre */}
                    <circle
                        cx="150" cy="150" r="22"
                        fill={couleurPhase}
                        fillOpacity="0.12"
                        stroke={couleurPhase}
                        strokeWidth="1"
                        style={{ transition: 'fill 0.3s ease, stroke 0.3s ease' }}
                    />
                    <text
                        x="150" y="153"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={couleurPhase}
                        fontSize="8"
                        fontFamily="'Courier New', monospace"
                        fontWeight="700"
                        letterSpacing="0.5"
                        style={{ transition: 'fill 0.3s ease', userSelect: 'none' }}
                    >
                        {libellePhase}
                    </text>
                </svg>
            </div>

            {/* ── Panneau inférieur ── */}
            <div className="rhythm-circle__panneau">

                {/* Contrôles par piste */}
                <div className="rhythm-circle__pistes">
                    {pistes.map((piste) => (
                        <ControlesPiste
                            key={piste.id}
                            piste={piste}
                            onModifierNombrePas={(n) => modifierNombrePasPiste(piste.id, n)}
                        />
                    ))}
                </div>

                {/* Contrôles BPM et transport */}
                <ControlesBPM
                    bpm={bpm}
                    phase={phase}
                    onDemarrerPause={demarrerPause}
                    onReinitialiser={reinitialiser}
                    onModifierBPM={modifierBPM}
                />

            </div>

        </div>
    );
}
