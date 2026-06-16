/**
 * noteModel.ts — couche Model (MVC)
 * Logique musicale pure : conversion Hz ↔ note, calcul cents, évaluation justesse.
 * Aucune dépendance React.
 */

const A4_FREQUENCY = 440;
const A4_MIDI = 69;
const JUSTESSE_TOLERANCE_CENTS = 25;
const NOMS_NOTES: readonly string[] = [
    "Do","Do#","Ré","Ré#","Mi","Fa","Fa#","Sol","Sol#","La","La#","Si",
];

export interface Note {
    nom: string;
    octave: number;
    frequenceHz: number;
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

export function frequenceVersMidi(frequenceHz: number): number {
    if (frequenceHz <= 0) throw new Error(`Fréquence invalide : ${frequenceHz}`);
    return 12 * Math.log2(frequenceHz / A4_FREQUENCY) + A4_MIDI;
}

export function midiVersFrequence(midi: number): number {
    return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function midiVersNote(midi: number): Note {
    return {
        nom: NOMS_NOTES[midi % 12],
        octave: Math.floor(midi / 12) - 1,
        frequenceHz: midiVersFrequence(midi),
        midi,
    };
}

export function frequenceVersNote(frequenceHz: number): Note {
    return midiVersNote(Math.round(frequenceVersMidi(frequenceHz)));
}

export function calculerEcartCents(frequenceDetectee: number, noteCible: Note): number {
    return 1200 * Math.log2(frequenceDetectee / noteCible.frequenceHz);
}

export function evaluerJustesse(
    frequenceDetectee: number | null,
    noteCible: Note
): EvaluationJustesse {
    if (frequenceDetectee === null) return "silence";
    const ecart = calculerEcartCents(frequenceDetectee, noteCible);
    if (Math.abs(ecart) <= JUSTESSE_TOLERANCE_CENTS) return "juste";
    return ecart > 0 ? "trop_haut" : "trop_bas";
}

export function genererBilan(resultats: ResultatNote[]): BilanSession {
    const totalNotes = resultats.length;
    const notesJustes = resultats.filter((r) => r.evaluation === "juste").length;
    const scorePourcentage = totalNotes > 0 ? Math.round((notesJustes / totalNotes) * 100) : 0;
    let appreciation: string;
    if (scorePourcentage >= 90) appreciation = "Excellent ! Justesse remarquable.";
    else if (scorePourcentage >= 70) appreciation = "Bien ! Continuez à travailler.";
    else if (scorePourcentage >= 50) appreciation = "Passable. Des progrès à faire.";
    else appreciation = "À retravailler. La régularité paie !";
    return { resultats, totalNotes, notesJustes, scorePourcentage, appreciation };
}

export function getNotesOctave(octave: number): Note[] {
    const midiDebut = (octave + 1) * 12;
    return Array.from({ length: 12 }, (_, i) => midiVersNote(midiDebut + i));
}