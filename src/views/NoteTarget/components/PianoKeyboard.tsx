/**
 * @file PianoKeyboard.tsx
 * @description Composant View — Clavier de piano interactif.
 *
 * Affiche une octave complète (7 touches blanches + 5 touches noires).
 * - Surligne la note cible en rouge
 * - Permet de cliquer sur une touche pour l'entendre
 * - Supporte la notation ♯ et ♭
 *
 * Architecture visuelle :
 * Touches blanches  : Do Ré Mi Fa Sol La Si (indices MIDI mod 12 : 0,2,4,5,7,9,11)
 * Touches noires    : Do# Ré# Fa# Sol# La# (indices : 1,3,6,8,10)
 *
 * Les touches noires sont positionnées via des classes CSS dédiées
 * pour éviter tout style inline.
 */

import "./PianoKeyboard.css";
import { jouerNote } from "../../../models/pitchModel.ts";
import type { Note } from "../../../models/noteModel.ts";
import { getNotesOctave } from "../../../models/noteModel.ts";

/** Indices (mod 12) des touches blanches dans l'ordre */
const INDICES_BLANCHES = [0, 2, 4, 5, 7, 9, 11];

/** Indices (mod 12) des touches noires avec leur classe de position CSS */
const TOUCHES_NOIRES: { readonly indexMod12: number; readonly classePosition: string }[] = [
    { indexMod12: 1,  classePosition: "piano__noire--pos-0" }, // Do#
    { indexMod12: 3,  classePosition: "piano__noire--pos-1" }, // Ré#
    { indexMod12: 6,  classePosition: "piano__noire--pos-2" }, // Fa#
    { indexMod12: 8,  classePosition: "piano__noire--pos-3" }, // Sol#
    { indexMod12: 10, classePosition: "piano__noire--pos-4" }, // La#
];

export interface PianoKeyboardProps {
    /** Note que l'utilisateur doit chanter — sera surlignée en rouge */
    readonly noteCible: Note;
    /** Octave affichée sur le clavier */
    readonly octave: number;
    /** true = afficher les noms bémols (Si♭), false = dièses (La#) */
    readonly afficherBemols: boolean;
}

/**
 * Clavier de piano interactif sur une octave.
 *
 * @param noteCible - Note à surligner en rouge
 * @param octave - Octave à afficher
 * @param afficherBemols - Notation ♯ ou ♭
 */
export default function PianoKeyboard({ noteCible, octave, afficherBemols }: PianoKeyboardProps) {
    const notes = getNotesOctave(octave);

    /** Retourne la note correspondant à un index mod 12 */
    const getNoteParIndex = (indexMod12: number): Note =>
        notes[indexMod12];

    /** Détermine si une note est la note cible */
    const estCible = (note: Note): boolean =>
        note.midi === noteCible.midi;

    /** Nom à afficher selon la notation choisie */
    const nomNote = (note: Note): string =>
        afficherBemols ? note.nomBemol : note.nom;

    return (
        <div className="piano" aria-label="Clavier de piano — une octave">

            {/* ── Légende informative ── */}
            <p className="piano__legende">
                Touche surlignée = note cible · Cliquez pour écouter
            </p>

            {/* ── Clavier ── */}
            <div className="piano__clavier">

                {/* Touches blanches */}
                {INDICES_BLANCHES.map((idx) => {
                    const note = getNoteParIndex(idx);
                    return (
                        <button
                            key={note.midi}
                            type="button"
                            className={`piano__touche piano__blanche ${estCible(note) ? "piano__touche--cible" : ""}`}
                            onClick={() => jouerNote(note.frequenceHz)}
                            aria-label={`${nomNote(note)}${note.octave} — ${note.frequenceHz.toFixed(1)} Hz`}
                            title={`${nomNote(note)}${note.octave}`}
                        >
                            <span className="piano__nom">{nomNote(note)}</span>
                        </button>
                    );
                })}

                {/* Touches noires — positionnées en absolu */}
                {TOUCHES_NOIRES.map(({ indexMod12, classePosition }) => {
                    const note = getNoteParIndex(indexMod12);
                    return (
                        <button
                            key={note.midi}
                            type="button"
                            className={`piano__touche piano__noire ${classePosition} ${estCible(note) ? "piano__touche--cible" : ""}`}
                            onClick={() => jouerNote(note.frequenceHz)}
                            aria-label={`${nomNote(note)}${note.octave} — ${note.frequenceHz.toFixed(1)} Hz`}
                            title={`${nomNote(note)}${note.octave}`}
                        >
                            <span className="piano__nom piano__nom--noire">
                                {nomNote(note)}
                            </span>
                        </button>
                    );
                })}

            </div>

            {/* ── Note cible affichée en texte ── */}
            <p className="piano__note-active">
                Note à chanter : <strong>{nomNote(noteCible)}{noteCible.octave}</strong> — {noteCible.frequenceHz.toFixed(1)} Hz
            </p>

        </div>
    );
}