import { getNotesOctave, type Note } from "../../models/noteModel.ts";
import { jouerNote } from "../../models/pitchModel.ts";
import { type StatutCapture } from "../../controllers/usePitchDetection.ts";

const OPTIONS_NOTES  = [3, 5, 7, 10] as const;
const OPTIONS_OCTAVE = [2, 3, 4, 5]  as const;

interface Props {
    nombreNotes:       number;
    onNombreNotes:     (n: number) => void;
    octave:            number;
    onOctave:          (o: number) => void;
    selection:         Note[];
    notesOctave:       Note[];
    onToggleNote:      (note: Note) => void;
    onToutSelectionner: () => void;
    onAucun:           () => void;
    erreur:            string | null;
    statut:            StatutCapture;
    onDemarrer:        () => void;
}

export default function ConfigSession({
    nombreNotes, onNombreNotes,
    octave, onOctave,
    selection, notesOctave, onToggleNote, onToutSelectionner, onAucun,
    erreur, statut, onDemarrer,
}: Props) {
    return (
        <div className="pitch-detector__config">

            <div className="config__section">
                <label className="config__label">Nombre de notes</label>
                <div className="config__row">
                    {OPTIONS_NOTES.map((n) => (
                        <button key={n} type="button"
                                className={`config__btn ${nombreNotes === n ? "config__btn--actif" : ""}`}
                                onClick={() => onNombreNotes(n)}>{n}</button>
                    ))}
                </div>
            </div>

            <div className="config__section">
                <label className="config__label">Octave</label>
                <div className="config__row">
                    {OPTIONS_OCTAVE.map((o) => (
                        <button key={o} type="button"
                                className={`config__btn ${octave === o ? "config__btn--actif" : ""}`}
                                onClick={() => onOctave(o)}>{o}</button>
                    ))}
                </div>
                <p className="config__info">
                    Do{octave} = {getNotesOctave(octave)[0].frequenceHz.toFixed(1)} Hz
                </p>
            </div>

            <div className="config__section">
                <div className="config__label-row">
                    <label className="config__label">
                        Notes <span className="config__count">({selection.length}/{notesOctave.length})</span>
                    </label>
                    <div className="config__actions">
                        <button type="button" className="config__btn-sm" onClick={onToutSelectionner}>Tout</button>
                        <button type="button" className="config__btn-sm" onClick={onAucun}>Aucun</button>
                    </div>
                </div>

                <div className="config__grille">
                    {notesOctave.map((note) => {
                        const active = selection.some((n) => n.midi === note.midi);
                        return (
                            <div key={note.midi} className={`note-item ${active ? "note-item--actif" : ""}`}>
                                <button type="button" className="note-item__select"
                                        onClick={() => onToggleNote(note)}
                                        title={`${note.frequenceHz.toFixed(1)} Hz`}>
                                    {note.nom}<sub>{note.octave}</sub>
                                </button>
                                <button type="button" className="note-item__ecoute"
                                        onClick={() => jouerNote(note.frequenceHz)}
                                        title={`Écouter ${note.nom}${note.octave}`}>▶</button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {erreur && <div className="pitch-detector__erreur"><span>⚠</span><span>{erreur}</span></div>}

            <button className="pitch-detector__btn-principal"
                    onClick={onDemarrer}
                    disabled={statut === "chargement" || selection.length === 0}
                    type="button">
                {statut === "chargement" ? "Accès micro…" : "Démarrer la session"}
            </button>

            <p className="pitch-detector__mention">L'accès au microphone sera demandé au démarrage.</p>
        </div>
    );
}
