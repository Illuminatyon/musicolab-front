/**
 * @file noteModel.ts
 * @description Couche Model (MVC) — Logique musicale pure.
 *
 * Ce fichier regroupe toutes les fonctions de conversion et d'évaluation
 * musicale utilisées par le Module 3. Il ne contient aucune dépendance React
 * et peut être testé de façon unitaire sans navigateur.
 *
 * Concepts mathématiques utilisés :
 * - Tempérament égal : chaque demi-ton = facteur 2^(1/12) en fréquence
 * - Cents : unité logarithmique, 1 demi-ton = 100 cents, 1 octave = 1200 cents
 * - MIDI : encodage numérique des notes (La4 = 69, Do4 = 60)
 */

// ─── Constantes musicales ─────────────────────────────────────────────────────

/** Fréquence de référence du La4 en Hz (norme ISO 16:1975) */
const A4_FREQUENCY = 440;

/** Numéro MIDI du La4 */
const A4_MIDI = 69;

/**
 * Tolérance de justesse en cents.
 * ±25 cents = un quart de demi-ton, seuil standard des accordeurs professionnels.
 */
const JUSTESSE_TOLERANCE_CENTS = 25;

/**
 * Noms des 12 notes chromatiques en notation française.
 * Index 0 = Do (C), conforme au standard MIDI.
 */
const NOMS_NOTES: readonly string[] = [
    "Do", "Do#", "Ré", "Ré#", "Mi", "Fa",
    "Fa#", "Sol", "Sol#", "La", "La#", "Si",
];

// ─── Interfaces et types ──────────────────────────────────────────────────────

/**
 * Représente une note musicale identifiée dans le système de tempérament égal.
 */
export interface Note {
    /** Nom de la note en notation française (ex: "La", "Do#") */
    nom: string;
    /** Numéro d'octave (ex: 4 pour le La4 de référence) */
    octave: number;
    /** Fréquence exacte de la note en Hz selon le tempérament égal */
    frequenceHz: number;
    /** Numéro MIDI de la note (0–127, La4 = 69) */
    midi: number;
}

/**
 * Résultat de l'évaluation de la justesse d'une note chantée.
 * - `"juste"`     : dans la tolérance de ±25 cents
 * - `"trop_haut"` : plus de +25 cents au-dessus de la cible
 * - `"trop_bas"`  : plus de -25 cents en dessous de la cible
 * - `"silence"`   : aucune fréquence détectée (micro silencieux)
 */
export type EvaluationJustesse = "juste" | "trop_haut" | "trop_bas" | "silence";

/**
 * Résultat complet d'une tentative sur une note dans la session.
 */
export interface ResultatNote {
    /** Note que l'utilisateur devait chanter */
    noteCible: Note;
    /** Fréquence détectée par le micro en Hz, ou null si silence */
    frequenceDetectee: number | null;
    /** Écart en cents entre la fréquence détectée et la note cible, ou null si silence */
    ecartCents: number | null;
    /** Évaluation finale de la tentative */
    evaluation: EvaluationJustesse;
}

/**
 * Bilan complet d'une session d'évaluation vocale.
 */
export interface BilanSession {
    /** Liste ordonnée des résultats note par note */
    resultats: ResultatNote[];
    /** Nombre total de notes évaluées dans la session */
    totalNotes: number;
    /** Nombre de notes évaluées comme "juste" */
    notesJustes: number;
    /** Score en pourcentage arrondi à l'entier (0–100) */
    scorePourcentage: number;
    /** Appréciation qualitative selon le score obtenu */
    appreciation: string;
}

// ─── Fonctions de conversion Hz ↔ MIDI ───────────────────────────────────────

/**
 * Convertit une fréquence en Hz vers le numéro MIDI correspondant.
 *
 * Formule : MIDI = 12 × log₂(f / 440) + 69
 *
 * @param frequenceHz - Fréquence à convertir (doit être strictement positive)
 * @returns Numéro MIDI (peut être décimal si la fréquence n'est pas une note exacte)
 * @throws {Error} Si la fréquence est inférieure ou égale à 0
 *
 * @example
 * frequenceVersMidi(440)    // → 69  (La4, exact)
 * frequenceVersMidi(261.63) // → 60  (Do4, approx)
 * frequenceVersMidi(450)    // → 69.39 (entre La4 et La#4)
 */
export function frequenceVersMidi(frequenceHz: number): number {
    if (frequenceHz <= 0) {
        throw new Error(`Fréquence invalide : ${frequenceHz} Hz (doit être > 0)`);
    }
    return 12 * Math.log2(frequenceHz / A4_FREQUENCY) + A4_MIDI;
}

/**
 * Convertit un numéro MIDI vers la fréquence exacte en Hz.
 *
 * Formule inverse : f = 440 × 2^((MIDI − 69) / 12)
 *
 * @param midi - Numéro MIDI (entier entre 0 et 127)
 * @returns Fréquence en Hz selon le tempérament égal
 *
 * @example
 * midiVersFrequence(69) // → 440    (La4)
 * midiVersFrequence(60) // → 261.63 (Do4)
 * midiVersFrequence(57) // → 220    (La3)
 */
export function midiVersFrequence(midi: number): number {
    return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convertit un numéro MIDI vers un objet Note complet.
 *
 * L'octave est calculée selon la convention MIDI : Do4 = MIDI 60.
 * Formule : octave = Math.floor(midi / 12) - 1
 *
 * @param midi - Numéro MIDI (entier, 0–127)
 * @returns Objet Note avec nom, octave, fréquence et numéro MIDI
 *
 * @example
 * midiVersNote(69) // → { nom: "La", octave: 4, frequenceHz: 440, midi: 69 }
 * midiVersNote(60) // → { nom: "Do", octave: 4, frequenceHz: 261.63, midi: 60 }
 */
export function midiVersNote(midi: number): Note {
    return {
        nom: NOMS_NOTES[midi % 12],
        octave: Math.floor(midi / 12) - 1,
        frequenceHz: midiVersFrequence(midi),
        midi,
    };
}

/**
 * Convertit une fréquence en Hz vers l'objet Note le plus proche.
 *
 * Arrondit le numéro MIDI décimal à l'entier le plus proche
 * pour identifier la note la plus proche en tempérament égal.
 *
 * @param frequenceHz - Fréquence à convertir (doit être > 0)
 * @returns Note la plus proche en tempérament égal
 *
 * @example
 * frequenceVersNote(440)  // → Note La4
 * frequenceVersNote(445)  // → Note La4 (dans la tolérance)
 */
export function frequenceVersNote(frequenceHz: number): Note {
    return midiVersNote(Math.round(frequenceVersMidi(frequenceHz)));
}

// ─── Fonctions d'évaluation ───────────────────────────────────────────────────

/**
 * Calcule l'écart en cents entre une fréquence détectée et une note cible.
 *
 * Formule : Δ = 1200 × log₂(f_détectée / f_cible)
 * - Résultat positif : la voix est trop haute
 * - Résultat négatif : la voix est trop basse
 * - Résultat nul : la voix est parfaitement juste
 *
 * @param frequenceDetectee - Fréquence chantée en Hz (doit être > 0)
 * @param noteCible - Note de référence à atteindre
 * @returns Écart en cents (positif = trop haut, négatif = trop bas)
 *
 * @example
 * const la4 = midiVersNote(69); // 440 Hz
 * calculerEcartCents(440, la4)  // → 0    (parfaitement juste)
 * calculerEcartCents(450, la4)  // → ~38  (trop haut)
 * calculerEcartCents(430, la4)  // → ~-40 (trop bas)
 */
export function calculerEcartCents(frequenceDetectee: number, noteCible: Note): number {
    return 1200 * Math.log2(frequenceDetectee / noteCible.frequenceHz);
}

/**
 * Évalue si une fréquence chantée est juste par rapport à une note cible.
 *
 * Applique la règle de décision à ±25 cents :
 * - |Δ| ≤ 25 cents → "juste"
 * - Δ > +25 cents  → "trop_haut"
 * - Δ < -25 cents  → "trop_bas"
 * - freq null      → "silence"
 *
 * @param frequenceDetectee - Fréquence chantée en Hz, ou null si silence
 * @param noteCible - Note de référence à atteindre
 * @returns Évaluation de la justesse
 *
 * @example
 * const do4 = midiVersNote(60);
 * evaluerJustesse(261.63, do4) // → "juste"
 * evaluerJustesse(270,    do4) // → "trop_haut"
 * evaluerJustesse(null,   do4) // → "silence"
 */
export function evaluerJustesse(
    frequenceDetectee: number | null,
    noteCible: Note
): EvaluationJustesse {
    if (frequenceDetectee === null) return "silence";
    const ecart = calculerEcartCents(frequenceDetectee, noteCible);
    if (Math.abs(ecart) <= JUSTESSE_TOLERANCE_CENTS) return "juste";
    return ecart > 0 ? "trop_haut" : "trop_bas";
}

/**
 * Génère un bilan complet à partir d'une liste de résultats de session.
 *
 * Calcule le score en pourcentage et attribue une appréciation qualitative :
 * - ≥ 90% → "Excellent ! Justesse remarquable."
 * - ≥ 70% → "Bien ! Continuez à travailler."
 * - ≥ 50% → "Passable. Des progrès à faire."
 * - < 50% → "À retravailler. La régularité paie !"
 *
 * @param resultats - Tableau des résultats note par note de la session
 * @returns BilanSession avec score, compteurs et appréciation
 *
 * @example
 * genererBilan([]) // → { scorePourcentage: 0, totalNotes: 0, ... }
 */
export function genererBilan(resultats: ResultatNote[]): BilanSession {
    const totalNotes    = resultats.length;
    const notesJustes   = resultats.filter((r) => r.evaluation === "juste").length;
    const scorePourcentage = totalNotes > 0
        ? Math.round((notesJustes / totalNotes) * 100)
        : 0;

    let appreciation: string;
    if (scorePourcentage >= 90)      appreciation = "Excellent ! Justesse remarquable.";
    else if (scorePourcentage >= 70) appreciation = "Bien ! Continuez à travailler.";
    else if (scorePourcentage >= 50) appreciation = "Passable. Des progrès à faire.";
    else                             appreciation = "À retravailler. La régularité paie !";

    return { resultats, totalNotes, notesJustes, scorePourcentage, appreciation };
}

/**
 * Retourne les 12 notes chromatiques d'une octave donnée.
 *
 * Utile pour construire la grille de sélection dans l'interface de configuration.
 * Les notes vont de Do (index 0) à Si (index 11).
 *
 * @param octave - Numéro d'octave souhaité (ex: 4 pour Do4–Si4)
 * @returns Tableau de 12 Notes dans l'ordre chromatique croissant
 *
 * @example
 * getNotesOctave(4) // → [Do4, Do#4, Ré4, ..., Si4]
 * getNotesOctave(4)[0].frequenceHz // → 261.63 Hz (Do4)
 */
export function getNotesOctave(octave: number): Note[] {
    const midiDebut = (octave + 1) * 12; // Do de l'octave en MIDI
    return Array.from({ length: 12 }, (_, i) => midiVersNote(midiDebut + i));
}