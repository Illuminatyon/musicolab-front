/**
 * useNoteSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller — Hook React de gestion d'une session d'évaluation vocale.
 *
 * Responsabilités :
 *  - Gérer la progression dans la liste de notes cibles (N notes)
 *  - Collecter et stabiliser la fréquence détectée sur une fenêtre de 3 secondes
 *  - Permettre à l'utilisateur de passer une note (skip)
 *  - Évaluer chaque note chantée via le Model (evaluerJustesse)
 *  - Accumuler les résultats et générer le bilan final (genererBilan)
 *  - Exposer l'état de session et la progression de stabilisation aux Views
 *
 * Notions du cours appliquées :
 *  - useState  (S3) : état de la session (note courante, résultats, phase)
 *  - useEffect (S4) : réaction aux changements de fréquence détectée
 *  - Custom Hook (S5) : logique de session extraite et réutilisable
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    evaluerJustesse,
    calculerEcartCents,
    genererBilan,
    getNotesOctave,
    type Note,
    type ResultatNote,
    type BilanSession,
    type EvaluationJustesse,
} from "../models/noteModel";

// ─── Constantes de session ────────────────────────────────────────────────────

/**
 * Durée en millisecondes pendant laquelle la note doit rester juste
 * avant d'être automatiquement validée.
 */
const DUREE_STABILISATION_MS = 3_000;

/** Intervalle de mise à jour de la progression (ms) — affichage fluide */
const INTERVALLE_PROGRESSION_MS = 50;

/** Nombre de notes par session par défaut */
const NOMBRE_NOTES_DEFAUT = 5;

/** Octave utilisée pour les notes disponibles */
const OCTAVE_DEFAUT = 4;

// ─── Types ───────────────────────────────────────────────────────────────────

export type PhaseSession =
    | "configuration"
    | "en_cours"
    | "terminee";

export interface UseNoteSessionRetour {
    phase: PhaseSession;
    noteCourante: Note | null;
    indexNote: number;
    totalNotes: number;
    evaluationTempsReel: EvaluationJustesse | null;
    ecartCentsTempsReel: number | null;
    /** Progression de la stabilisation entre 0 et 1 (pour la barre de 3s) */
    progressionStabilisation: number;
    resultats: ResultatNote[];
    bilan: BilanSession | null;
    notesDisponibles: Note[];
    /** Démarre une session avec les notes choisies par l'utilisateur */
    demarrerSession: (notesChoisies: Note[], nombreNotes: number) => void;
    /** Passe la note courante sans l'évaluer (comptée comme silence dans le bilan) */
    skipNote: () => void;
    reinitialiser: () => void;
    mettreAJourFrequence: (frequenceHz: number | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNoteSession(): UseNoteSessionRetour {
    // ── État de la session ────────────────────────────────────────────────────

    const [phase, setPhase] = useState<PhaseSession>("configuration");
    const [indexNote, setIndexNote] = useState<number>(0);
    const [totalNotes, setTotalNotes] = useState<number>(NOMBRE_NOTES_DEFAUT);
    const [notesSession, setNotesSession] = useState<Note[]>([]);
    const [resultats, setResultats] = useState<ResultatNote[]>([]);
    const [bilan, setBilan] = useState<BilanSession | null>(null);
    const [evaluationTempsReel, setEvaluationTempsReel] =
        useState<EvaluationJustesse | null>(null);
    const [ecartCentsTempsReel, setEcartCentsTempsReel] = useState<number | null>(null);

    /**
     * Progression de stabilisation entre 0 et 1.
     * Mise à jour toutes les 50ms via setInterval pour un affichage fluide.
     */
    const [progressionStabilisation, setProgressionStabilisation] = useState<number>(0);

    // ── Références ────────────────────────────────────────────────────────────

    /** Timestamp du début de la stabilisation */
    const debutStabilisationRef = useRef<number | null>(null);
    /** Dernière évaluation stable observée */
    const derniereEvaluationRef = useRef<EvaluationJustesse | null>(null);
    /** Fréquence courante reçue du détecteur */
    const frequenceCouranteRef = useRef<number | null>(null);
    /** Référence à l'intervalle de progression */
    const intervalProgressionRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Refs pour accéder à l'état actuel dans les callbacks sans re-créer les fonctions
    const resultatsRef = useRef<ResultatNote[]>([]);
    const indexNoteRef = useRef<number>(0);
    const totalNotesRef = useRef<number>(NOMBRE_NOTES_DEFAUT);
    const notesSessionRef = useRef<Note[]>([]);

    // Synchroniser les refs avec l'état
    resultatsRef.current = resultats;
    indexNoteRef.current = indexNote;
    totalNotesRef.current = totalNotes;
    notesSessionRef.current = notesSession;

    // Notes disponibles (octave centrale)
    const notesDisponibles = getNotesOctave(OCTAVE_DEFAUT);

    // Note courante dérivée de l'index
    const noteCourante: Note | null =
        phase === "en_cours" ? notesSession[indexNote] ?? null : null;

    // ── Gestion de la progression ─────────────────────────────────────────────

    const demarrerIntervalleProgression = useCallback(() => {
        if (intervalProgressionRef.current) return;
        intervalProgressionRef.current = setInterval(() => {
            if (debutStabilisationRef.current === null) {
                setProgressionStabilisation(0);
                return;
            }
            const ecoule = Date.now() - debutStabilisationRef.current;
            const progression = Math.min(ecoule / DUREE_STABILISATION_MS, 1);
            setProgressionStabilisation(progression);
        }, INTERVALLE_PROGRESSION_MS);
    }, []);

    const arreterIntervalleProgression = useCallback(() => {
        if (intervalProgressionRef.current) {
            clearInterval(intervalProgressionRef.current);
            intervalProgressionRef.current = null;
        }
        setProgressionStabilisation(0);
    }, []);

    // ── Nettoyage au démontage (useEffect — cours S4) ────────────────────────

    useEffect(() => {
        return () => {
            if (intervalProgressionRef.current) {
                clearInterval(intervalProgressionRef.current);
            }
        };
    }, []);

    // ── Validation interne ────────────────────────────────────────────────────

    /**
     * Enregistre le résultat de la note courante et avance à la suivante.
     * Utilise les refs pour accéder à l'état actuel sans dépendances instables.
     */
    const validerNoteCourante = useCallback(
        (
            frequence: number | null,
            evaluation: EvaluationJustesse,
            ecart: number | null
        ): void => {
            const noteActuelle = notesSessionRef.current[indexNoteRef.current];
            if (!noteActuelle) return;

            const resultat: ResultatNote = {
                noteCible: noteActuelle,
                frequenceDetectee: frequence,
                ecartCents: ecart !== null ? Math.round(ecart) : null,
                evaluation,
            };

            const nouveauxResultats = [...resultatsRef.current, resultat];
            setResultats(nouveauxResultats);

            const prochaineNote = indexNoteRef.current + 1;

            if (prochaineNote >= totalNotesRef.current) {
                // Session terminée
                const bilanFinal = genererBilan(nouveauxResultats);
                setBilan(bilanFinal);
                setPhase("terminee");
                setEvaluationTempsReel(null);
                setEcartCentsTempsReel(null);
            } else {
                // Note suivante
                setIndexNote(prochaineNote);
                setEvaluationTempsReel(null);
                setEcartCentsTempsReel(null);
            }
        },
        []
    );

    // ── Logique de stabilisation (useEffect — cours S4) ──────────────────────

    useEffect(() => {
        const frequence = frequenceCouranteRef.current;

        if (phase !== "en_cours" || !noteCourante) return;

        if (frequence === null) {
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;
            arreterIntervalleProgression();
            return;
        }

        const evaluation = evaluerJustesse(frequence, noteCourante);
        const ecart = calculerEcartCents(frequence, noteCourante);
        const maintenant = Date.now();

        if (evaluation !== derniereEvaluationRef.current) {
            // Évaluation changée : réinitialiser la stabilisation
            debutStabilisationRef.current = maintenant;
            derniereEvaluationRef.current = evaluation;
            arreterIntervalleProgression();

            // Lancer la progression uniquement si la note est juste
            if (evaluation === "juste") {
                demarrerIntervalleProgression();
            }
            return;
        }

        // Vérifier si la durée de 3s est atteinte
        if (
            debutStabilisationRef.current !== null &&
            evaluation === "juste" &&
            maintenant - debutStabilisationRef.current >= DUREE_STABILISATION_MS
        ) {
            validerNoteCourante(frequence, evaluation, ecart);
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;
            arreterIntervalleProgression();
        }
    }, [evaluationTempsReel, phase, noteCourante, validerNoteCourante,
        demarrerIntervalleProgression, arreterIntervalleProgression]);

    // ── Actions exposées à la View ────────────────────────────────────────────

    /**
     * Démarre une session avec les notes choisies par l'utilisateur.
     *
     * @param notesChoisies - Notes sélectionnées en configuration
     * @param nombreNotes   - Nombre total de notes dans la session
     */
    const demarrerSession = useCallback(
        (notesChoisies: Note[], nombreNotes: number): void => {
            if (notesChoisies.length === 0) return;

            // Construire la liste en tirant aléatoirement depuis le pool
            // (avec remise si nombreNotes > notesChoisies.length)
            const notesFinales: Note[] = [];
            while (notesFinales.length < nombreNotes) {
                const melange = [...notesChoisies].sort(() => Math.random() - 0.5);
                notesFinales.push(...melange);
            }

            setNotesSession(notesFinales.slice(0, nombreNotes));
            setTotalNotes(nombreNotes);
            setIndexNote(0);
            setResultats([]);
            setBilan(null);
            setEvaluationTempsReel(null);
            setEcartCentsTempsReel(null);
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;
            arreterIntervalleProgression();
            setPhase("en_cours");
        },
        [arreterIntervalleProgression]
    );

    /**
     * Passe la note courante sans la valider.
     * Elle est comptée comme "silence" dans le bilan final.
     */
    const skipNote = useCallback((): void => {
        arreterIntervalleProgression();
        debutStabilisationRef.current = null;
        derniereEvaluationRef.current = null;
        validerNoteCourante(null, "silence", null);
    }, [validerNoteCourante, arreterIntervalleProgression]);

    /**
     * Réinitialise et revient à l'écran de configuration.
     */
    const reinitialiser = useCallback((): void => {
        arreterIntervalleProgression();
        setPhase("configuration");
        setIndexNote(0);
        setTotalNotes(NOMBRE_NOTES_DEFAUT);
        setNotesSession([]);
        setResultats([]);
        setBilan(null);
        setEvaluationTempsReel(null);
        setEcartCentsTempsReel(null);
        debutStabilisationRef.current = null;
        derniereEvaluationRef.current = null;
        frequenceCouranteRef.current = null;
    }, [arreterIntervalleProgression]);

    /**
     * Reçoit la fréquence depuis usePitchDetection à chaque frame (~60fps).
     */
    const mettreAJourFrequence = useCallback(
        (frequenceHz: number | null): void => {
            frequenceCouranteRef.current = frequenceHz;

            if (phase === "en_cours" && noteCourante) {
                const evaluation = evaluerJustesse(frequenceHz, noteCourante);
                setEvaluationTempsReel(evaluation);

                if (frequenceHz !== null) {
                    setEcartCentsTempsReel(
                        Math.round(calculerEcartCents(frequenceHz, noteCourante))
                    );
                } else {
                    setEcartCentsTempsReel(null);
                }
            }
        },
        [phase, noteCourante]
    );

    // ── Retour ────────────────────────────────────────────────────────────────

    return {
        phase,
        noteCourante,
        indexNote,
        totalNotes,
        evaluationTempsReel,
        ecartCentsTempsReel,
        progressionStabilisation,
        resultats,
        bilan,
        notesDisponibles,
        demarrerSession,
        skipNote,
        reinitialiser,
        mettreAJourFrequence,
    };
}