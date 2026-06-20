/**
 * @file rhythmModel.ts
 * @description Couche Model (MVC) — Logique pure du cercle de rythme.
 *
 * Encapsule les types, constantes, fonctions pures et génération sonore
 * du séquenceur rythmique polyrhythmique à 3 pistes.
 *
 * Architecture polyrhythmique :
 * Toutes les pistes partagent le même cycle temporel (1 mesure = 4 × 60/BPM s).
 * Chaque piste divise ce cycle en N pas égaux. La superposition de pistes avec
 * des N différents (ex. 8 vs 12 vs 16) produit un vrai polyrhythme.
 *
 * Aucune dépendance React — testable indépendamment du navigateur.
 */

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Tempo par défaut en BPM */
export const BPM_DEFAUT = 120;

/** Tempo minimum autorisé */
export const BPM_MIN = 40;

/** Tempo maximum autorisé */
export const BPM_MAX = 220;

/** Options disponibles pour le nombre de pas par piste */
export const OPTIONS_PAS = [4, 6, 8, 12, 16] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Valeurs autorisées pour le nombre de pas */
export type NombrePas = (typeof OPTIONS_PAS)[number];

/**
 * Représente une piste du séquenceur — un anneau concentrique avec ses pas.
 */
export interface Piste {
    /** Identifiant (0 = anneau externe, 2 = anneau interne) */
    id: number;
    /** Nombre de pas par cycle */
    nombrePas: number;
    /** État de chaque pas : true = actif (joué), false = silencieux */
    pas: boolean[];
    /** Couleur CSS de l'anneau */
    couleur: string;
    /** Nom court affiché dans les contrôles */
    nom: string;
}

/**
 * Phase de lecture du séquenceur.
 * - `"arret"`   : stoppé, indicateurs visuels à -1
 * - `"lecture"` : en cours, animation et son actifs
 * - `"pause"`   : suspendu via AudioContext.suspend(), reprise possible
 */
export type PhaseRythme = "arret" | "lecture" | "pause";

// ─── Fonctions de création ────────────────────────────────────────────────────

/**
 * Crée une piste vierge avec tous les pas inactifs.
 *
 * @param id - Identifiant de la piste
 * @param nombrePas - Nombre de pas initiaux
 * @param couleur - Couleur CSS de l'anneau
 * @param nom - Nom affiché dans l'interface
 */
export function creerPiste(id: number, nombrePas: number, couleur: string, nom: string): Piste {
    return {
        id,
        nombrePas,
        pas: Array(nombrePas).fill(false) as boolean[],
        couleur,
        nom,
    };
}

/** Pistes par défaut au chargement du module */
export const PISTES_INITIALES: Piste[] = [
    creerPiste(0, 8,  '#C8102E', 'Piste A'),   // rouge — anneau externe
    creerPiste(1, 12, '#22c55e', 'Piste B'),   // vert  — anneau intermédiaire
    creerPiste(2, 16, '#a0a0a0', 'Piste C'),   // gris  — anneau interne
];

// ─── Fonctions pures ──────────────────────────────────────────────────────────

/**
 * Active ou désactive un pas dans une piste (immutable).
 *
 * @param piste - Piste source
 * @param indexPas - Index du pas à basculer (0 → nombrePas - 1)
 * @returns Nouvelle piste avec le pas modifié
 */
export function basculerPas(piste: Piste, indexPas: number): Piste {
    const nouveauxPas = [...piste.pas];
    nouveauxPas[indexPas] = !nouveauxPas[indexPas];
    return { ...piste, pas: nouveauxPas };
}

/**
 * Redimensionne une piste à un nouveau nombre de pas.
 * Les pas existants sont conservés ; les nouveaux sont inactifs.
 *
 * @param piste - Piste source
 * @param nouveauNombrePas - Nouveau nombre de pas
 */
export function redimensionnerPiste(piste: Piste, nouveauNombrePas: number): Piste {
    const nouveauxPas = Array(nouveauNombrePas)
        .fill(false)
        .map((_, i) => (i < piste.pas.length ? piste.pas[i] : false)) as boolean[];
    return { ...piste, nombrePas: nouveauNombrePas, pas: nouveauxPas };
}

/**
 * Calcule la durée d'un cycle complet (1 mesure en 4/4) à un BPM donné.
 *
 * @param bpm - Tempo en battements par minute
 * @returns Durée du cycle en secondes
 *
 * @example
 * calculerDureeCycle(120) // → 2.0  (4 beats × 0.5s)
 */
export function calculerDureeCycle(bpm: number): number {
    return (4 * 60) / bpm;
}

/**
 * Calcule la durée d'un pas pour une piste donnée.
 *
 * @param bpm - Tempo en BPM
 * @param nombrePas - Nombre de pas dans le cycle
 * @returns Durée d'un pas en secondes
 *
 * @example
 * calculerDureePas(120, 8)  // → 0.25
 * calculerDureePas(120, 12) // → 0.167
 */
export function calculerDureePas(bpm: number, nombrePas: number): number {
    return calculerDureeCycle(bpm) / nombrePas;
}

// ─── Audio — génération des battements ───────────────────────────────────────

/**
 * Configuration sonore des 3 pistes.
 * Chaque timbre est distinct pour que le polyrythme soit clairement audible.
 */
const SONS_PISTES: ReadonlyArray<{
    frequenceDebut: number;
    frequenceFin: number;
    type: OscillatorType;
    gainMax: number;
    duree: number;
}> = [
    // Piste 0 — Kick : sinusoïde avec chute rapide de fréquence
    { frequenceDebut: 150, frequenceFin: 55,  type: 'sine',     gainMax: 0.7,  duree: 0.18 },
    // Piste 1 — Tom : triangle medium
    { frequenceDebut: 280, frequenceFin: 140, type: 'triangle', gainMax: 0.45, duree: 0.09 },
    // Piste 2 — Hi-hat : carré court et aigu
    { frequenceDebut: 900, frequenceFin: 600, type: 'square',   gainMax: 0.12, duree: 0.04 },
];

/**
 * Planifie la lecture d'un battement au temps précis de l'AudioContext.
 *
 * Le timing repose sur audioContext.currentTime (horloge audio de précision
 * sub-milliseconde), pas sur setInterval. Cela garantit zéro drift même sur
 * de longues sessions.
 *
 * @param ctx - Contexte audio actif
 * @param tempsPlanifie - Heure exacte de lecture (audioContext.currentTime)
 * @param idPiste - Index de la piste (0–2) pour le choix du timbre
 */
export function jouerBattement(ctx: AudioContext, tempsPlanifie: number, idPiste: number): void {
    const config = SONS_PISTES[idPiste];
    if (!config) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequenceDebut, tempsPlanifie);
    osc.frequency.exponentialRampToValueAtTime(config.frequenceFin, tempsPlanifie + config.duree);

    gain.gain.setValueAtTime(config.gainMax, tempsPlanifie);
    gain.gain.exponentialRampToValueAtTime(0.001, tempsPlanifie + config.duree);

    osc.start(tempsPlanifie);
    osc.stop(tempsPlanifie + config.duree);
}
