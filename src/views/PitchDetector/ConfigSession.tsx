/**
 * @file ConfigSession.tsx
 * @description Composant View — Configuration de la session.
 *
 * Modifications :
 * - Nombre de notes : champ numérique libre (1–50) avec boutons +/−
 * - Octaves : étendu de 2–5 à 2–6 (couvre sopranos et basses)
 * - Toggle ♯/♭ + InfoTemperament
 */

import { getNotesOctave, type Note } from "../../models/noteModel.ts";
import { jouerNote } from "../../models/pitchModel.ts";
import { type StatutCapture } from "../../controllers/usePitchDetection.ts";
import InfoTemperament from "./InfoTemperament.tsx";
import * as React from "react";

/** Octaves disponibles — Do2 (65 Hz) à Si6 (1975 Hz) */
const OPTIONS_OCTAVE = [2, 3, 4, 5, 6] as const;

export interface ConfigSessionProps {
    nombreNotes:        number;
    onNombreNotes:      (n: number) => void;
    octave:             number;
    onOctave:           (o: number) => void;
    selection:          Note[];
    notesOctave:        Note[];
    onToggleNote:       (note: Note) => void;
    onToutSelectionner: () => void;
    onAucun:            () => void;
    afficherBemols:     boolean;
    onAfficherBemols:   (v: boolean) => void;
    erreur:             string | null;
    statut:             StatutCapture;
    onDemarrer:         () => void;
}

export default function ConfigSession({
                                          nombreNotes, onNombreNotes,
                                          octave, onOctave,
                                          selection, notesOctave, onToggleNote,
                                          onToutSelectionner, onAucun,
                                          afficherBemols, onAfficherBemols,
                                          erreur, statut, onDemarrer,
                                      }: Readonly<ConfigSessionProps>) {

    const nomNote = (note: Note): string =>
        afficherBemols ? note.nomBemol : note.nom;

    const decrementerNotes = (): void => {
        if (nombreNotes > 1) onNombreNotes(nombreNotes - 1);
    };

    const incrementerNotes = (): void => {
        if (nombreNotes < 50) onNombreNotes(nombreNotes + 1);
    };

    const handleInputNotes = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const val = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(val) && val >= 1 && val <= 50) onNombreNotes(val);
    };

    return (
        <div className="pitch-detector__config">

            {/* ── Nombre de notes (libre) ── */}
            <div className="config__section">
                <label className="config__label" htmlFor="config-nombre-notes">
                    Nombre de notes
                </label>
                <div className="config__compteur">
                    <button
                        type="button"
                        className="config__compteur-btn"
                        onClick={decrementerNotes}
                        disabled={nombreNotes <= 1}
                        aria-label="Diminuer le nombre de notes"
                    >−</button>

                    <input
                        id="config-nombre-notes"
                        type="number"
                        className="config__compteur-input"
                        value={nombreNotes}
                        min={1}
                        max={50}
                        onChange={handleInputNotes}
                        aria-label="Nombre de notes"
                    />

                    <button
                        type="button"
                        className="config__compteur-btn"
                        onClick={incrementerNotes}
                        disabled={nombreNotes >= 50}
                        aria-label="Augmenter le nombre de notes"
                    >+</button>
                </div>
                <p className="config__info">Entre 1 et 50 notes</p>
            </div>

            {/* ── Octave ── */}
            <fieldset className="config__section config__fieldset">
                <legend className="config__label">Octave</legend>
                <div className="config__row">
                    {OPTIONS_OCTAVE.map((o) => (
                        <button key={o} type="button"
                                className={`config__btn ${octave === o ? "config__btn--actif" : ""}`}
                                onClick={() => onOctave(o)}>{o}
                        </button>
                    ))}
                </div>
                <p className="config__info">
                    Do{octave} = {getNotesOctave(octave)[0].frequenceHz.toFixed(1)} Hz
                </p>
            </fieldset>

            {/* ── Sélection des notes ── */}
            <div className="config__section">
                <div className="config__label-row">
                    <label className="config__label">
                        Notes <span className="config__count">({selection.length}/{notesOctave.length})</span>
                    </label>
                    <div className="config__actions">
                        <button
                            type="button"
                            className={`config__btn-sm ${afficherBemols ? "config__btn-sm--actif" : ""}`}
                            onClick={() => onAfficherBemols(!afficherBemols)}
                            title="Basculer notation dièse ♯ / bémol ♭"
                        >
                            {afficherBemols ? "♭" : "♯"}
                        </button>
                        <button type="button" className="config__btn-sm" onClick={onToutSelectionner}>Tout</button>
                        <button type="button" className="config__btn-sm" onClick={onAucun}>Aucun</button>
                    </div>
                </div>

                <div className="config__grille">
                    {notesOctave.map((note) => {
                        const active = selection.some((n) => n.midi === note.midi);
                        return (
                            <div key={note.midi} className={`note-item ${active ? "note-item--actif" : ""}`}>
                                <button
                                    type="button"
                                    className="note-item__select"
                                    onClick={() => onToggleNote(note)}
                                    title={`${note.frequenceHz.toFixed(1)} Hz`}
                                    aria-pressed={active}
                                >
                                    {nomNote(note)}<sub>{note.octave}</sub>
                                </button>
                                <button
                                    type="button"
                                    className="note-item__ecoute"
                                    onClick={() => jouerNote(note.frequenceHz)}
                                    aria-label={`Écouter ${nomNote(note)}${note.octave} — ${note.frequenceHz.toFixed(1)} Hz`}
                                    title={`${note.frequenceHz.toFixed(1)} Hz`}
                                >▶</button>
                            </div>
                        );
                    })}
                </div>

                {/* Note explicative sur les enharmoniques */}
                {afficherBemols && (
                    <p className="config__info config__info--bemol">
                        ♭ En tempérament égal, Si♭ et La♯ ont la même fréquence (466 Hz) — c'est normal.
                    </p>
                )}
            </div>

            {/* ── Info tempérament ── */}
            {afficherBemols && <InfoTemperament />}

            {erreur && (
                <div className="pitch-detector__erreur" role="alert">
                    <span aria-hidden="true">⚠</span>
                    <span>{erreur}</span>
                </div>
            )}

            <button
                className="pitch-detector__btn-principal"
                onClick={onDemarrer}
                disabled={statut === "chargement" || selection.length === 0}
                type="button"
            >
                {statut === "chargement" ? "Accès micro…" : "Démarrer la session"}
            </button>

            <p className="pitch-detector__mention">
                L'accès au microphone sera demandé au démarrage.
            </p>
        </div>
    );
}