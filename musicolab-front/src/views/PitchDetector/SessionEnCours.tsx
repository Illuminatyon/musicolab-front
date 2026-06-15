/**
 * SessionEnCours.tsx
 * Composant présentationnel : affichage pendant la session active.
 * Reçoit toutes ses données via props — aucune logique métier.
 */

import type { Note, EvaluationJustesse } from "../../models/noteModel";
import NoteTarget from "../NoteTarget/noteTarget";

interface SessionEnCoursProps {
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
}

export default function SessionEnCours({
                                           statut, noteCourante, indexNote, totalNotes,
                                           evaluation, ecartCents, progressionStabilisation,
                                           noteValidee, onSkip, onAbandonner,
                                       }: SessionEnCoursProps) {
    return (
        <div className="pitch-detector__session">
            <div className={`statut-micro statut--${statut}`}>
                <span className="statut__point" />
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
            />

            <button className="pitch-detector__btn-secondaire"
                    onClick={onAbandonner} type="button">
                Abandonner
            </button>
        </div>
    );
}