/**
 * @file SessionEnCours.tsx — Phase de session active.
 * Transmet afficherBemols à NoteTarget.
 */

import type { Note, EvaluationJustesse } from "../../models/noteModel.ts";
import NoteTarget from "../NoteTarget/noteTarget.tsx";

export interface SessionEnCoursProps {
    statut: string;
    noteCourante: Note;
    indexNote: number;
    totalNotes: number;
    evaluation: EvaluationJustesse | null;
    ecartCents: number | null;
    progressionStabilisation: number;
    noteValidee: boolean;
    onSkip: () => void;
    onAbandonner: () => void;
    afficherBemols: boolean;
}

export default function SessionEnCours({
                                           statut, noteCourante, indexNote, totalNotes,
                                           evaluation, ecartCents,
                                           progressionStabilisation, noteValidee,
                                           onSkip, onAbandonner,
                                           afficherBemols,
                                       }: Readonly<SessionEnCoursProps>) {
    return (
        <div className="pitch-detector__session">
            <div className={`statut-micro statut--${statut}`} role="status" aria-live="polite">
                <span className="statut__point" aria-hidden="true" />
                <span className="statut__texte">
                    {statut === "actif" ? "Micro actif" : statut}
                </span>
            </div>

            <NoteTarget
                note={noteCourante}
                indexNote={indexNote}
                totalNotes={totalNotes}
                evaluation={evaluation}
                ecartCents={ecartCents}
                progressionStabilisation={progressionStabilisation}
                noteValidee={noteValidee}
                onSkip={onSkip}
                afficherBemols={afficherBemols}
            />

            <button className="pitch-detector__btn-secondaire"
                    onClick={onAbandonner} type="button">
                Abandonner
            </button>
        </div>
    );
}