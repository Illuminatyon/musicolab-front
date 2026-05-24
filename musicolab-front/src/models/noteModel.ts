/**
 * noteModel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Modèle de données musicales — couche Model du pattern MVC.
 *
 * Responsabilités :
 *  - Définir les types et structures de données du domaine musical
 *  - Convertir une fréquence (Hz) en note musicale (ex: La4, Do#3)
 *  - Calculer l'écart en cents entre une fréquence chantée et une note cible
 *  - Évaluer si la note chantée est juste, trop haute ou trop basse
 *
 * Ce fichier ne contient aucune logique React (pas de hooks, pas de JSX).
 * Il peut être testé indépendamment de l'interface utilisateur.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Constantes musicales ────────────────────────────────────────────────────

/**
 * Fréquence de référence du La4 en tempérament égal (norme ISO 16:1975).
 * Toutes les conversions Hz ↔ note sont calculées relativement à cette valeur.
 */
const A4_FREQUENCY = 440; // Hz

/**
 * Index MIDI du La4. Le MIDI commence à Do-1 (note 0).
 * La4 = octave 4, index 9 dans l'octave → MIDI 69.
 */
const A4_MIDI = 69;

/**
 * Tolérance en cents pour considérer une note comme "juste".
 * 1 demi-ton = 100 cents. ±25 cents représente un quart de ton,
 * seuil classiquement utilisé en pédagogie vocale.
 */
const JUSTESSE_TOLERANCE_CENTS = 25;

/**
 * Noms des 12 notes chromatiques en notation française.
 * L'index 0 correspond au Do (C), conforme au standard MIDI.
 */
const NOMS_NOTES: readonly string[] = [
    "Do", "Do#", "Ré", "Ré#", "Mi", "Fa",
    "Fa#", "Sol", "Sol#", "La", "La#", "Si",
];

// ─── Types et interfaces ─────────────────────────────────────────────────────

/**
 * Représente une note musicale identifiée.
 */
export interface Note {
    /** Nom de la note en notation française (ex: "La", "Do#") */
    nom: string;
    /** Numéro d'octave (ex: 4 pour le La4 de référence) */
    octave: number;
    /** Fréquence exacte de cette note en Hz (tempérament égal) */
    frequenceHz: number;
    /** Numéro MIDI de la note (0–127) */
    midi: number;
}

/**
 * Résultat de l'évaluation d'une note chantée par rapport à une note cible.
 */
export type EvaluationJustesse = "juste" | "trop_haut" | "trop_bas" | "silence";

/**
 * Résultat complet d'une tentative de note dans la session.
 */
export interface ResultatNote {
    /** Note que l'utilisateur devait chanter */
    noteCible: Note;
    /** Fréquence effectivement détectée (null si silence) */
    frequenceDetectee: number | null;
    /** Écart en cents entre la fréquence détectée et la note cible */
    ecartCents: number | null;
    /** Évaluation finale de la tentative */
    evaluation: EvaluationJustesse;
}

/**
 * Bilan complet d'une session d'entraînement.
 */
export interface BilanSession {
    /** Liste des résultats note par note */
    resultats: ResultatNote[];
    /** Nombre total de notes évaluées */
    totalNotes: number;
    /** Nombre de notes chantées juste */
    notesJustes: number;
    /** Score en pourcentage (0–100) */
    scorePourcentage: number;
    /** Appréciation textuelle globale */
    appreciation: string;
}

// ─── Fonctions de conversion ─────────────────────────────────────────────────

/**
 * Convertit une fréquence en Hz vers le numéro MIDI correspondant.
 *
 * Formule : MIDI = 12 × log2(f / 440) + 69
 * En tempérament égal, chaque demi-ton multiplie la fréquence par 2^(1/12).
 *
 * @param frequenceHz - Fréquence à convertir (doit être > 0)
 * @returns Numéro MIDI (peut être décimal si la fréquence n'est pas exacte)
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
 * Formule inverse : f = 440 × 2^((MIDI - 69) / 12)
 *
 * @param midi - Numéro MIDI (entier, 0–127)
 * @returns Fréquence en Hz
 */
export function midiVersFrequence(midi: number): number {
    return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

/**
 * Convertit un numéro MIDI vers un objet Note complet.
 *
 * @param midi - Numéro MIDI (entier, 0–127)
 * @returns Objet Note avec nom, octave et fréquence
 */
export function midiVersNote(midi: number): Note {
    // L'octave commence à -1 en notation MIDI standard.
    // Do0 = MIDI 12, donc : octave = Math.floor(midi / 12) - 1
    const octave = Math.floor(midi / 12) - 1;
    const indexNote = midi % 12; // position dans l'octave (0 = Do, 11 = Si)

    return {
        nom: NOMS_NOTES[indexNote],
        octave,
        frequenceHz: midiVersFrequence(midi),
        midi,
    };
}

/**
 * Convertit une fréquence en Hz vers l'objet Note le plus proche.
 *
 * @param frequenceHz - Fréquence à convertir (doit être > 0)
 * @returns Note la plus proche en tempérament égal
 */
export function frequenceVersNote(frequenceHz: number): Note {
    const midiDecimal = frequenceVersMidi(frequenceHz);
    const midiArrondi = Math.round(midiDecimal); // note la plus proche
    return midiVersNote(midiArrondi);
}

// ─── Fonctions d'évaluation ───────────────────────────────────────────────────

/**
 * Calcule l'écart en cents entre une fréquence détectée et une note cible.
 *
 * 1 demi-ton = 100 cents. L'écart est positif si la voix est trop haute,
 * négatif si trop basse.
 *
 * Formule : cents = 1200 × log2(f_détectée / f_cible)
 *
 * @param frequenceDetectee - Fréquence chantée en Hz
 * @param noteCible - Note de référence à atteindre
 * @returns Écart en cents (positif = trop haut, négatif = trop bas)
 */
export function calculerEcartCents(
    frequenceDetectee: number,
    noteCible: Note
): number {
    return 1200 * Math.log2(frequenceDetectee / noteCible.frequenceHz);
}

/**
 * Évalue la justesse d'une fréquence chantée par rapport à une note cible.
 *
 * Seuil de tolérance : ±25 cents (quart de ton).
 *
 * @param frequenceDetectee - Fréquence chantée (null si silence)
 * @param noteCible - Note de référence à atteindre
 * @returns Évaluation : "juste" | "trop_haut" | "trop_bas" | "silence"
 */
export function evaluerJustesse(
    frequenceDetectee: number | null,
    noteCible: Note
): EvaluationJustesse {
    // Cas silence : PitchFinder retourne null quand aucune hauteur n'est détectée
    if (frequenceDetectee === null) return "silence";

    const ecart = calculerEcartCents(frequenceDetectee, noteCible);

    if (Math.abs(ecart) <= JUSTESSE_TOLERANCE_CENTS) return "juste";
    if (ecart > JUSTESSE_TOLERANCE_CENTS) return "trop_haut";
    return "trop_bas";
}

/**
 * Génère un bilan complet à partir d'une liste de résultats de session.
 *
 * @param resultats - Tableau des résultats note par note
 * @returns BilanSession avec score et appréciation
 */
export function genererBilan(resultats: ResultatNote[]): BilanSession {
    const totalNotes = resultats.length;
    const notesJustes = resultats.filter((r) => r.evaluation === "juste").length;
    const scorePourcentage =
        totalNotes > 0 ? Math.round((notesJustes / totalNotes) * 100) : 0;

    // Appréciation qualitative selon le score obtenu
    let appreciation: string;
    if (scorePourcentage >= 90) appreciation = "Excellent ! Justesse remarquable.";
    else if (scorePourcentage >= 70) appreciation = "Bien ! Continuez à travailler.";
    else if (scorePourcentage >= 50) appreciation = "Passable. Des progrès à faire.";
    else appreciation = "À retravailler. La régularité paie !";

    return {
        resultats,
        totalNotes,
        notesJustes,
        scorePourcentage,
        appreciation,
    };
}

/**
 * Retourne la liste des notes disponibles dans une octave donnée.
 * Utile pour que l'utilisateur choisisse ses notes cibles.
 *
 * @param octave - Numéro d'octave (ex: 4 pour l'octave centrale)
 * @returns Tableau des 12 notes de l'octave
 */
export function getNotesOctave(octave: number): Note[] {
    // Do de l'octave = MIDI (octave + 1) × 12
    const midiDebut = (octave + 1) * 12;
    return Array.from({ length: 12 }, (_, i) => midiVersNote(midiDebut + i));
}