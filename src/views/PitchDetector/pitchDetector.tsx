/**
 * @file pitchDetector.tsx
 * @description Couche View — Smart Component principal du Module 3.
 *
 * PitchDetector est le seul composant "intelligent" du module :
 * il consomme les hooks Controllers et distribue les données
 * aux composants enfants présentationnels via props.
 *
 * Phases gérées :
 * - "configuration" → ConfigSession (choix notes, octave, nombre)
 * - "en_cours"      → SessionEnCours (évaluation temps réel)
 * - "terminee"      → ResultsSummary (bilan final)
 *
 * Notions du cours appliquées :
 * - Composants + Props (S2) : distribution aux enfants
 * - Rendu Conditionnel (S2) : switch entre les 3 phases
 * - useState (S3) : état local de configuration
 * - useEffect (S4) : synchronisation pitch → session
 * - Custom Hooks (S5) : usePitchDetection + useNoteSession
 */

import { useState, useEffect } from "react";
import "./pitchDetector.css";

import { usePitchDetection } from "../../controllers/usePitchDetection.ts";
import { useNoteSession }    from "../../controllers/useNoteSession.ts";
import { getNotesOctave, type Note } from "../../models/noteModel.ts";

import BoutonRetour from "./BoutonRetour.tsx";
import ConfigSession  from "./ConfigSession.tsx";
import SessionEnCours from "./SessionEnCours.tsx";
import ResultsSummary from "../ResultsSummary/ResultsSummary.tsx";

// ─── Composant ────────────────────────────────────────────────────────────────

/**
 * Composant racine du Module 3 — Évaluation de la justesse vocale.
 * Point d'entrée unique monté dans App.tsx.
 */
export default function PitchDetector() {

    // ── Controllers ───────────────────────────────────────────────────────────

    const {
        frequenceHz, statut, erreur,
        demarrer: demarrerCapture,
        arreter: arreterCapture,
    } = usePitchDetection();

    const {
        phase, noteCourante, indexNote, totalNotes,
        evaluationTempsReel, ecartCentsTempsReel,
        progressionStabilisation, noteValidee, bilan,
        demarrerSession, skipNote, reinitialiser, mettreAJourFrequence,
    } = useNoteSession();

    // ── État local de configuration ───────────────────────────────────────────

    const [nombreNotes, setNombreNotes] = useState(5);
    const [octave, setOctave]           = useState(4);

    /**
     * Sélection de notes initialisée avec toutes les notes de l'octave 4.
     * Mise à jour par handleOctaveChange quand l'octave change.
     */
    const [selection, setSelection] = useState<Note[]>(() => getNotesOctave(4));

    // ── Synchronisation pitch → session ───────────────────────────────────────

    /**
     * Transmet la fréquence détectée au controller de session à chaque frame.
     * Uniquement pendant la phase "en_cours" pour éviter les calculs inutiles.
     */
    useEffect(() => {
        if (phase === "en_cours") mettreAJourFrequence(frequenceHz);
    }, [frequenceHz, phase, mettreAJourFrequence]);

    // ── Handlers ─────────────────────────────────────────────────────────────

    /**
     * Change l'octave ET réinitialise la sélection en une seule opération.
     * Évite l'anti-pattern useEffect + setState pour une dérivation d'état simple.
     *
     * @param nouvelOctave - Numéro du nouvel octave sélectionné
     */
    const handleOctaveChange = (nouvelOctave: number): void => {
        setOctave(nouvelOctave);
        setSelection(getNotesOctave(nouvelOctave));
    };

    /**
     * Ajoute ou retire une note de la sélection.
     * Empêche de déselectionner si c'est la dernière note (minimum 1).
     *
     * @param note - Note à toggler dans la sélection
     */
    const toggleNote = (note: Note): void => {
        const existe = selection.some((n) => n.midi === note.midi);
        if (existe && selection.length === 1) return;
        setSelection((prev) =>
            existe ? prev.filter((n) => n.midi !== note.midi) : [...prev, note]
        );
    };

    /**
     * Démarre la capture microphone puis lance la session.
     * L'ordre est important : le micro doit être actif avant de démarrer la session.
     */
    const handleDemarrer = async (): Promise<void> => {
        await demarrerCapture();
        demarrerSession(selection, nombreNotes);
    };

    /**
     * Arrête la capture microphone et réinitialise la session.
     * Appelé par le bouton "Abandonner" et le bouton "Nouvelle session".
     */
    const handleRecommencer = async (): Promise<void> => {
        await arreterCapture();
        reinitialiser();
    };

    const notesOctave = getNotesOctave(octave);

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <div className="pitch-detector">

            <BoutonRetour />

            {/* En-tête — affiché dans toutes les phases */}
            <header className="pitch-detector__header">
                <div className="badge">Module 3</div>
                <h1 className="titre">Justesse Vocale</h1>
                <p className="sous-titre">Évaluez votre précision en temps réel</p>
            </header>

            {/* Phase 1 — Configuration */}
            {phase === "configuration" && (
                <ConfigSession
                    nombreNotes={nombreNotes}   onNombreNotes={setNombreNotes}
                    octave={octave}             onOctave={handleOctaveChange}
                    selection={selection}       notesOctave={notesOctave}
                    onToggleNote={toggleNote}
                    onToutSelectionner={() => setSelection(notesOctave)}
                    onAucun={() => setSelection([notesOctave[0]])}
                    erreur={erreur}
                    statut={statut}
                    onDemarrer={handleDemarrer}
                />
            )}

            {/* Phase 2 — Session en cours */}
            {phase === "en_cours" && noteCourante && (
                <SessionEnCours
                    statut={statut}
                    noteCourante={noteCourante}
                    indexNote={indexNote}
                    totalNotes={totalNotes}
                    evaluation={evaluationTempsReel}
                    ecartCents={ecartCentsTempsReel}
                    progressionStabilisation={progressionStabilisation}
                    noteValidee={noteValidee}
                    onSkip={skipNote}
                    onAbandonner={handleRecommencer}
                />
            )}

            {/* Phase 3 — Bilan de fin de session */}
            {phase === "terminee" && bilan && (
                <div className="pitch-detector__bilan">
                    <ResultsSummary bilan={bilan} onRecommencer={handleRecommencer} />
                </div>
            )}

        </div>
    );
}