/**
 * @file noteTarget.tsx
 * @description Composant View — Note cible + feedback + piano clavier.
 *
 * Nouveautés :
 * - prop afficherBemols : alterne La# / Si♭ dans l'affichage
 * - Composant PianoKeyboard intégré sous la jauge
 */

import "./noteTarget.css";
import type { Note, EvaluationJustesse } from "../../models/noteModel.ts";
import AnneauSVG            from "./components/AnneauSVG.tsx";
import FeedbackDirectionnel from "./components/FeedbackDirectionnel.tsx";
import JaugeCents           from "./components/JaugeCents.tsx";
import PianoKeyboard        from "./components/PianoKeyboard.tsx";

export interface NoteTargetProps {
    note: Note;
    indexNote: number;
    totalNotes: number;
    evaluation: EvaluationJustesse | null;
    ecartCents: number | null;
    progressionStabilisation: number;
    noteValidee: boolean;
    onSkip: () => void;
    /** true = afficher Si♭, false = La# */
    afficherBemols: boolean;
}

/**
 * Affiche la note cible, le feedback temps réel et le clavier de piano.
 *
 * @param props - Les propriétés du composant.
 * @param props.note - Note musicale à chanter (ex: "C4", "A#3").
 * @param props.indexNote - L'index de la note actuelle dans l'exercice.
 * @param props.totalNotes - Le nombre total de notes à chanter dans l'exercice.
 * @param props.evaluation - Le résultat de l'évaluation ou le statut du chant en temps réel.
 * @param props.ecartCents - L'écart en cents par rapport à la note cible pour le retour sur la justesse.
 * @param props.progressionStabilisation - Le niveau de progression (souvent en pourcentage) pour valider la stabilisation sur la note.
 * @param props.noteValidee - Indique si la note actuelle a été validée avec succès.
 * @param props.onSkip - Fonction de rappel (callback) déclenchée lorsque l'utilisateur passe la note actuelle.
 * @param props.afficherBemols - Flag déterminant si l'affichage utilise la notation bémol (♭) ou dièse (♯).
 */

export default function NoteTarget({
                                       note, indexNote, totalNotes,
                                       evaluation, ecartCents,
                                       progressionStabilisation, noteValidee,
                                       onSkip,
                                       afficherBemols,
                                   }: Readonly<NoteTargetProps>) {

    const anneauActif = progressionStabilisation > 0 && evaluation === "juste";
    const nomAffiche  = afficherBemols ? note.nomBemol : note.nom;

    return (
        <div className="note-target">

            {/* ── Overlay de validation ── */}
            {noteValidee && (
                <div className="note-target__overlay">
                    <span className="overlay__icone">✓</span>
                    <span className="overlay__texte">Note validée !</span>
                </div>
            )}

            {/* ── Progression session ── */}
            <div className="note-target__progression">
                <span className="progression__texte">Note {indexNote + 1} / {totalNotes}</span>
                <div className="progression__barre">
                    <div
                        className="progression__remplissage"
                        style={{ width: `${(indexNote / totalNotes) * 100}%` }}
                    />
                </div>
            </div>

            {/* ── Anneau SVG + nom de la note ── */}
            <AnneauSVG progression={progressionStabilisation} actif={anneauActif}>
                <div className="note-target__note">
                    <span className="note__nom">{nomAffiche}</span>
                    <span className="note__octave">{note.octave}</span>
                    <span className="note__frequence">{note.frequenceHz.toFixed(1)} Hz</span>
                </div>
            </AnneauSVG>

            {/* ── Feedback directionnel ── */}
            <FeedbackDirectionnel
                evaluation={evaluation}
                progression={progressionStabilisation}
            />

            {/* ── Jauge de cents ── */}
            <JaugeCents ecartCents={ecartCents} evaluation={evaluation} />

            {ecartCents !== null && (
                <p className="note-target__ecart">
                    {ecartCents > 0 ? "+" : ""}{ecartCents} cents
                </p>
            )}

            {/* ── Piano clavier ── */}
            <PianoKeyboard
                noteCible={note}
                octave={note.octave}
                afficherBemols={afficherBemols}
            />

            {/* ── Bouton skip ── */}
            <button
                className="note-target__btn-skip"
                onClick={onSkip}
                disabled={noteValidee}
                type="button"
                aria-label="Passer cette note sans la valider"
            >
                Passer cette note →
            </button>

        </div>
    );
}