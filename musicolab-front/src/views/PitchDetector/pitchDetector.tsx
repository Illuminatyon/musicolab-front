/**
 * PitchDetector.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * View — Composant principal du Module 3 (Smart Component).
 *
 * Responsabilités :
 *  - Connecter les deux Controllers (usePitchDetection + useNoteSession)
 *  - Orchestrer l'affichage selon la phase de session
 *  - Gérer l'écran de configuration (choix du nombre de notes)
 *  - Transmettre les données aux composants enfants via les props
 *
 * C'est le seul composant "intelligent" du module :
 * il consomme les hooks et distribue les données aux composants enfants
 * (NoteTarget, ResultsSummary) qui sont purement présentationnels.
 *
 * Notions du cours appliquées :
 *  - Composants (S2) : arborescence PitchDetector > NoteTarget / ResultsSummary
 *  - Props (S2) : données passées aux enfants
 *  - useState (S3) : état local de configuration
 *  - useEffect (S4) : synchronisation pitch → session
 *  - Custom Hooks (S5) : usePitchDetection + useNoteSession
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import "./PitchDetector.css";

import { usePitchDetection } from "../../controllers/usePitchDetection";
import { useNoteSession } from "../../controllers/useNoteSession";

import NoteTarget from "../NoteTarget/NoteTarget";
import ResultsSummary from "../ResultsSummary/ResultsSummary";

// ─── Constantes de configuration ─────────────────────────────────────────────

/** Options de nombre de notes proposées à l'utilisateur */
const OPTIONS_NOMBRE_NOTES = [3, 5, 7, 10] as const;

// ─── Composant ───────────────────────────────────────────────────────────────

/**
 * Composant principal du module d'évaluation de justesse vocale.
 * Point d'entrée unique du Module 3.
 */
export default function PitchDetector() {

    // ── Controllers ───────────────────────────────────────────────────────────

    const {
        frequenceHz,
        statut: statutCapture,
        erreur: erreurCapture,
        demarrer: demarrerCapture,
        arreter: arreterCapture,
    } = usePitchDetection();

    const {
        phase,
        noteCourante,
        indexNote,
        totalNotes,
        evaluationTempsReel,
        ecartCentsTempsReel,
        bilan,
        notesDisponibles,
        demarrerSession,
        reinitialiser,
        mettreAJourFrequence,
    } = useNoteSession();

    // ── État local de configuration ───────────────────────────────────────────

    /** Nombre de notes sélectionné par l'utilisateur avant le démarrage */
    const [nombreNotesChoisi, setNombreNotesChoisi] = useState<number>(5);

    // ── Synchronisation pitch → session (useEffect — cours S4) ───────────────
    // À chaque nouvelle fréquence détectée, on l'envoie au Controller de session.

    useEffect(() => {
        if (phase === "en_cours") {
            mettreAJourFrequence(frequenceHz);
        }
    }, [frequenceHz, phase, mettreAJourFrequence]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    /**
     * Lance la session : démarre le micro et initialise la session de notes.
     */
    const handleDemarrer = async (): Promise<void> => {
        await demarrerCapture();
        demarrerSession(nombreNotesChoisi);
    };

    /**
     * Arrête tout et revient à l'écran de configuration.
     */
    const handleRecommencer = async (): Promise<void> => {
        await arreterCapture();
        reinitialiser();
    };

    // ── Rendu conditionnel selon la phase (cours S2 — Rendu Conditionnel) ────

    return (
        <div className="pitch-detector">

            {/* ── En-tête du module ── */}
            <header className="pitch-detector__header">
                <div className="pitch-detector__badge">Module 3</div>
                <h1 className="pitch-detector__titre">Justesse Vocale</h1>
                <p className="pitch-detector__sous-titre">
                    Évaluez votre précision en temps réel
                </p>
            </header>

            {/* ── Phase : configuration ── */}
            {phase === "configuration" && (
                <div className="pitch-detector__configuration">

                    <div className="config__section">
                        <label className="config__label">
                            Nombre de notes à chanter
                        </label>
                        <div className="config__options">
                            {OPTIONS_NOMBRE_NOTES.map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    className={`config__option-btn ${
                                        nombreNotesChoisi === n ? "config__option-btn--actif" : ""
                                    }`}
                                    onClick={() => setNombreNotesChoisi(n)}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Aperçu des notes disponibles */}
                    <div className="config__section">
                        <label className="config__label">Notes utilisées (octave 4)</label>
                        <div className="config__notes-disponibles">
                            {notesDisponibles.map((note) => (
                                <span key={note.midi} className="config__note-tag">
                  {note.nom}{note.octave}
                </span>
                            ))}
                        </div>
                    </div>

                    {/* Message d'erreur micro */}
                    {erreurCapture && (
                        <div className="pitch-detector__erreur">
                            <span>⚠</span>
                            <span>{erreurCapture}</span>
                        </div>
                    )}

                    <button
                        className="pitch-detector__btn-principal"
                        onClick={handleDemarrer}
                        disabled={statutCapture === "chargement"}
                        type="button"
                    >
                        {statutCapture === "chargement"
                            ? "Accès micro…"
                            : "Démarrer la session"}
                    </button>

                    <p className="pitch-detector__mention-micro">
                        L'accès au microphone sera demandé au démarrage.
                    </p>
                </div>
            )}

            {/* ── Phase : session en cours ── */}
            {phase === "en_cours" && noteCourante && (
                <div className="pitch-detector__session">

                    {/* Indicateur du statut micro */}
                    <div className={`pitch-detector__statut-micro statut--${statutCapture}`}>
                        <span className="statut__point" />
                        <span className="statut__texte">
              {statutCapture === "actif" ? "Micro actif" : statutCapture}
            </span>
                    </div>

                    {/* Composant enfant NoteTarget — reçoit les données via props */}
                    <NoteTarget
                        note={noteCourante}
                        indexNote={indexNote}
                        totalNotes={totalNotes}
                        evaluation={evaluationTempsReel}
                        ecartCents={ecartCentsTempsReel}
                    />

                    <button
                        className="pitch-detector__btn-secondaire"
                        onClick={handleRecommencer}
                        type="button"
                    >
                        Abandonner
                    </button>
                </div>
            )}

            {/* ── Phase : session terminée ── */}
            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    {/* Composant enfant ResultsSummary — reçoit le bilan via props */}
                    <ResultsSummary
                        bilan={bilan}
                        onRecommencer={handleRecommencer}
                    />
                </div>
            )}

        </div>
    );
}