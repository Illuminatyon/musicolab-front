/**
 * @file noteModel.ts
 * @description Couche Model (MVC) — Logique musicale pure.
 *
 * Concepts mathématiques :
 * - Tempérament égal : chaque demi-ton = facteur 2^(1/12)
 * - Cents : 1 demi-ton = 100 cents, 1 octave = 1200 cents
 * - MIDI : La4 = 69, Do4 = 60
 */

const A4_FREQUENCY = 440;
const A4_MIDI      = 69;

/** Tolérance de justesse par défaut en cents */
export const JUSTESSE_TOLERANCE_CENTS = 25;

/**
 * Noms des 12 notes en notation dièse (♯).
 * Index 0 = Do, conforme au standard MIDI.
 */
const NOMS_NOTES_DIESE: readonly string[] = [
    "Do", "Do#", "Ré", "Ré#", "Mi", "Fa",
    "Fa#", "Sol", "Sol#", "La", "La#", "Si",
];

/**
 * Noms des 12 notes en notation bémol (♭).
 * Les notes naturelles gardent leur nom ; les altérées prennent leur nom bémol.
 *
 * @remarks
 * En tempérament égal (piano), La# et Si♭ ont exactement la même fréquence.
 * En intonation juste (violon, voix), ils diffèrent d'environ 21,5 cents.
 */
const NOMS_NOTES_BEMOL: readonly string[] = [
    "Do", "Ré♭", "Ré", "Mi♭", "Mi", "Fa",
    "Sol♭", "Sol", "La♭", "La", "Si♭", "Si",
];

export interface Note {
    /** Nom en notation dièse (ex: "La#") */
    nom: string;
    /** Nom en notation bémol (ex: "Si♭") */
    nomBemol: string;
    /** Numéro d'octave */
    octave: number;
    /** Fréquence exacte en Hz (tempérament égal) */
    frequenceHz: number;
    /** Numéro MIDI (0–127) */
    midi: number;
}

export type EvaluationJustesse = "juste" | "trop_haut" | "trop_bas" | "silence";

export interface ResultatNote {
    noteCible: Note;
    frequenceDetectee: number | null;
    ecartCents: number | null;
    evaluation: EvaluationJustesse;
}

export interface BilanSession {
    resultats: ResultatNote[];
    totalNotes: number;
    notesJustes: number;
    scorePourcentage: number;
    appreciation: string;
}

/**
 * Hz → numéro MIDI. Formule : MIDI = 12 × log₂(f / 440) + 69
 *
 * @throws {Error} si frequenceHz ≤ 0
 */
export function frequenceVersMidi(frequenceHz: number): number {
    if (frequenceHz <= 0) throw new Error(`Fréquence invalide : ${frequenceHz} Hz`);
    return 12 * Math.log2(frequenceHz / A4_FREQUENCY) + A4_MIDI;
}

/** MIDI → Hz. Formule : f = 440 × 2^((MIDI − 69) / 12) */
export function midiVersFrequence(midi: number): number {
    return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * MIDI → objet Note complet, avec nom dièse ET nom bémol.
 *
 * @example
 * midiVersNote(70) // → { nom: "La#", nomBemol: "Si♭", octave: 4, ... }
 */
export function midiVersNote(midi: number): Note {
    return {
        nom:         NOMS_NOTES_DIESE[midi % 12],
        nomBemol:    NOMS_NOTES_BEMOL[midi % 12],
        octave:      Math.floor(midi / 12) - 1,
        frequenceHz: midiVersFrequence(midi),
        midi,
    };
}

/** Hz → Note la plus proche en tempérament égal */
export function frequenceVersNote(frequenceHz: number): Note {
    return midiVersNote(Math.round(frequenceVersMidi(frequenceHz)));
}

/**
 * Écart en cents entre une fréquence détectée et une note cible.
 * Δ = 1200 × log₂(f_détectée / f_cible)
 */
export function calculerEcartCents(frequenceDetectee: number, noteCible: Note): number {
    return 1200 * Math.log2(frequenceDetectee / noteCible.frequenceHz);
}

/** Évalue la justesse d'une fréquence par rapport à une note cible (±25¢) */
export function evaluerJustesse(
    frequenceDetectee: number | null,
    noteCible: Note
): EvaluationJustesse {
    if (frequenceDetectee === null) return "silence";
    const ecart = calculerEcartCents(frequenceDetectee, noteCible);
    if (Math.abs(ecart) <= JUSTESSE_TOLERANCE_CENTS) return "juste";
    return ecart > 0 ? "trop_haut" : "trop_bas";
}

/** Génère le bilan de fin de session */
export function genererBilan(resultats: ResultatNote[]): BilanSession {
    const totalNotes  = resultats.length;
    const notesJustes = resultats.filter((r) => r.evaluation === "juste").length;
    const scorePourcentage = totalNotes > 0
        ? Math.round((notesJustes / totalNotes) * 100)
        : 0;
    let appreciation: string;
    if      (scorePourcentage >= 90) appreciation = "Excellent ! Justesse remarquable.";
    else if (scorePourcentage >= 70) appreciation = "Bien ! Continuez à travailler.";
    else if (scorePourcentage >= 50) appreciation = "Passable. Des progrès à faire.";
    else                             appreciation = "À retravailler. La régularité paie !";
    return { resultats, totalNotes, notesJustes, scorePourcentage, appreciation };
}

/** Les 12 notes chromatiques d'une octave donnée */
export function getNotesOctave(octave: number): Note[] {
    const midiDebut = (octave + 1) * 12;
    return Array.from({ length: 12 }, (_, i) => midiVersNote(midiDebut + i));
}