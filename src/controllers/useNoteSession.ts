/**
 * @file useNoteSession.ts
 * @description Couche Controller (MVC) — Hook de gestion de session vocale.
 *
 * Responsabilité : orchestrer une session d'évaluation de N notes.
 * La logique de stabilisation (timer 3s) est déléguée à useStabilisation
 * conformément au principe de responsabilité unique (SRP).
 *
 * Flux de la session :
 * configuration → [demarrerSession] → en_cours → (3s juste | skip) → terminee
 *
 * Pattern de refs miroirs :
 * Les callbacks (intervals, timeouts) ont besoin d'accéder à l'état courant
 * sans recréer les fonctions à chaque render. On utilise des refs synchronisées
 * via useLayoutEffect qui s'exécute de façon synchrone après chaque render.
 *
 * Notions du cours appliquées :
 * - useState (S3) : phase, index, résultats, bilan
 * - useEffect (S4) : nettoyage du timeout au démontage
 * - Custom Hook (S5) : logique de session réutilisable
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import {
    evaluerJustesse, calculerEcartCents, genererBilan, getNotesOctave,
    type Note, type ResultatNote, type BilanSession, type EvaluationJustesse,
} from "../models/noteModel.ts";
import { useStabilisation } from "./useStabilisation.ts";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Durée d'affichage de l'overlay "Note validée !" en ms */
const DUREE_FEEDBACK_VALIDE_MS = 1_000;

/** Nombre de notes par session si l'utilisateur ne change pas la valeur */
const NOMBRE_NOTES_DEFAUT = 5;

/** Octave par défaut pour notesDisponibles (utilisée dans useNoteSession) */
const OCTAVE_DEFAUT = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Phase courante de la session d'évaluation.
 * - `"configuration"` : écran de configuration initial
 * - `"en_cours"`      : session active, note en attente d'évaluation
 * - `"terminee"`      : toutes les notes ont été évaluées, bilan disponible
 */
export type PhaseSession = "configuration" | "en_cours" | "terminee";

/**
 * Interface complète retournée par le hook useNoteSession.
 */
export interface UseNoteSessionRetour {
    /** Phase actuelle de la session */
    phase: PhaseSession;
    /** Note que l'utilisateur doit chanter actuellement (null si hors session) */
    noteCourante: Note | null;
    /** Index de la note courante dans la session (commence à 0) */
    indexNote: number;
    /** Nombre total de notes dans la session */
    totalNotes: number;
    /** Évaluation temps réel de la note chantée */
    evaluationTempsReel: EvaluationJustesse | null;
    /** Écart en cents entre la voix et la note cible (null si silence) */
    ecartCentsTempsReel: number | null;
    /** Progression de la stabilisation entre 0 et 1 (fournie par useStabilisation) */
    progressionStabilisation: number;
    /** Vrai pendant 1s après validation — déclenche l'overlay de succès */
    noteValidee: boolean;
    /** Résultats accumulés au fil de la session */
    resultats: ResultatNote[];
    /** Bilan final disponible uniquement quand phase === "terminee" */
    bilan: BilanSession | null;
    /** Notes disponibles pour la configuration (octave par défaut) */
    notesDisponibles: Note[];
    /**
     * Lance une nouvelle session.
     * @param notesChoisies - Notes sélectionnées par l'utilisateur
     * @param nombreNotes - Nombre total de notes dans la session
     */
    demarrerSession: (notesChoisies: Note[], nombreNotes: number) => void;
    /** Passe la note courante — comptée comme "silence" dans le bilan */
    skipNote: () => void;
    /** Réinitialise la session et retourne à la configuration */
    reinitialiser: () => void;
    /**
     * Met à jour la fréquence détectée — appelée ~60fps par usePitchDetection.
     * @param frequenceHz - Fréquence en Hz ou null si silence
     */
    mettreAJourFrequence: (frequenceHz: number | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook de gestion d'une session d'évaluation vocale.
 *
 * S'utilise conjointement avec usePitchDetection :
 * ```tsx
 * const { frequenceHz } = usePitchDetection();
 * const { mettreAJourFrequence, noteCourante } = useNoteSession();
 *
 * useEffect(() => {
 *   if (phase === "en_cours") mettreAJourFrequence(frequenceHz);
 * }, [frequenceHz]);
 * ```
 *
 * @returns État complet de la session et actions de contrôle
 */
export function useNoteSession(): UseNoteSessionRetour {

    // ── État React ────────────────────────────────────────────────────────────

    const [phase, setPhase]               = useState<PhaseSession>("configuration");
    const [indexNote, setIndexNote]       = useState(0);
    const [totalNotes, setTotalNotes]     = useState(NOMBRE_NOTES_DEFAUT);
    const [notesSession, setNotesSession] = useState<Note[]>([]);
    const [resultats, setResultats]       = useState<ResultatNote[]>([]);
    const [bilan, setBilan]               = useState<BilanSession | null>(null);
    const [evaluationTempsReel, setEvaluation] = useState<EvaluationJustesse | null>(null);
    const [ecartCentsTempsReel, setEcart]      = useState<number | null>(null);
    const [noteValidee, setNoteValidee]        = useState(false);

    // ── Refs miroirs ──────────────────────────────────────────────────────────
    // Permettent d'accéder à l'état courant depuis les callbacks (setInterval,
    // setTimeout) sans créer de dépendances instables dans useCallback.
    // Synchronisées après chaque render via useLayoutEffect (synchrone).

    const frequenceRef    = useRef<number | null>(null);
    const derniereEvalRef = useRef<EvaluationJustesse | null>(null);
    const timeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteValideeRef  = useRef(false);
    const resultatsRef    = useRef<ResultatNote[]>([]);
    const indexRef        = useRef(0);
    const totalRef        = useRef(NOMBRE_NOTES_DEFAUT);
    const notesRef        = useRef<Note[]>([]);
    const phaseRef        = useRef<PhaseSession>("configuration");

    /** Synchronisation des refs après chaque render */
    useLayoutEffect(() => {
        resultatsRef.current   = resultats;
        indexRef.current       = indexNote;
        totalRef.current       = totalNotes;
        notesRef.current       = notesSession;
        phaseRef.current       = phase;
        noteValideeRef.current = noteValidee;
    });

    const notesDisponibles = getNotesOctave(OCTAVE_DEFAUT);
    const noteCourante     = phase === "en_cours" ? notesSession[indexNote] ?? null : null;

    // ── Nettoyage au démontage ────────────────────────────────────────────────

    useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    // ── Validation ────────────────────────────────────────────────────────────

    /**
     * Enregistre le résultat de la note courante et avance à la suivante.
     *
     * Si la note était juste :
     * 1. Affiche l'overlay de validation pendant DUREE_FEEDBACK_VALIDE_MS (1s)
     * 2. Avance à la note suivante (ou termine la session)
     *
     * Si la note était skippée (silence) :
     * - Avance immédiatement sans délai d'affichage
     *
     * @param freq - Fréquence chantée en Hz, ou null si skip
     * @param evaluation - Évaluation de la note
     * @param ecart - Écart en cents, ou null si skip
     */
    const validerNote = useCallback(
        (freq: number | null, evaluation: EvaluationJustesse, ecart: number | null): void => {
            const noteActuelle = notesRef.current[indexRef.current];
            if (!noteActuelle) return;

            const resultat: ResultatNote = {
                noteCible: noteActuelle,
                frequenceDetectee: freq,
                ecartCents: ecart !== null ? Math.round(ecart) : null,
                evaluation,
            };
            const nouveaux = [...resultatsRef.current, resultat];
            setResultats(nouveaux);

            if (evaluation === "juste") {
                setNoteValidee(true);
                noteValideeRef.current = true;
            }

            const delai = evaluation === "juste" ? DUREE_FEEDBACK_VALIDE_MS : 0;

            timeoutRef.current = setTimeout(() => {
                setNoteValidee(false);
                noteValideeRef.current = false;

                if (indexRef.current + 1 >= totalRef.current) {
                    // Dernière note — générer et afficher le bilan
                    setBilan(genererBilan(nouveaux));
                    setPhase("terminee");
                } else {
                    // Note suivante
                    setIndexNote((i) => i + 1);
                }
                setEvaluation(null);
                setEcart(null);
            }, delai);
        },
        []
    );

    /** Ref stable vers validerNote — accessible depuis le callback de useStabilisation */
    const validerNoteRef = useRef(validerNote);
    useLayoutEffect(() => { validerNoteRef.current = validerNote; });

    // ── Délégation à useStabilisation ────────────────────────────────────────

    /**
     * Callback appelé par useStabilisation quand les 3s de stabilisation sont écoulées.
     * Vérifie une dernière fois que la voix est toujours juste avant de valider.
     */
    const handleValide = useCallback((): void => {
        const freq = frequenceRef.current;
        const note = notesRef.current[indexRef.current];
        if (freq === null || !note) return;

        const eval_ = evaluerJustesse(freq, note);
        if (eval_ === "juste") {
            validerNoteRef.current(freq, eval_, calculerEcartCents(freq, note));
        }
    }, []);

    const {
        progression: progressionStabilisation,
        demarrer: demarrerStab,
        arreter: arreterStab,
    } = useStabilisation({ onValide: handleValide });

    // ── Mise à jour de la fréquence ───────────────────────────────────────────

    /**
     * Reçoit la fréquence détectée à chaque frame (~60 fps) depuis usePitchDetection.
     *
     * Logique :
     * - Met à jour l'évaluation et l'écart en temps réel
     * - Si l'évaluation change ET passe à "juste" → démarre le timer de 3s
     * - Si l'évaluation change ET quitte "juste" → réinitialise le timer
     *
     * @param frequenceHz - Fréquence en Hz ou null si silence
     */
    const mettreAJourFrequence = useCallback(
        (frequenceHz: number | null): void => {
            frequenceRef.current = frequenceHz;

            if (phaseRef.current !== "en_cours" || noteValideeRef.current) return;

            const note = notesRef.current[indexRef.current];
            if (!note) return;

            const evaluation = evaluerJustesse(frequenceHz, note);
            setEvaluation(evaluation);
            setEcart(
                frequenceHz !== null
                    ? Math.round(calculerEcartCents(frequenceHz, note))
                    : null
            );

            if (evaluation !== derniereEvalRef.current) {
                derniereEvalRef.current = evaluation;
                if (evaluation === "juste") { demarrerStab(); } else { arreterStab(); }
            }
        },
        [demarrerStab, arreterStab]
    );

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Réinitialise tous les états et refs partagés entre demarrerSession et reinitialiser.
     * Factorisée pour éviter la duplication de code (DRY).
     */
    const reinitialiserEtatCommun = useCallback((): void => {
        arreterStab();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setResultats([]);
        setBilan(null);
        setEvaluation(null);
        setEcart(null);
        setNoteValidee(false);
        noteValideeRef.current  = false;
        derniereEvalRef.current = null;
        frequenceRef.current    = null;
    }, [arreterStab]);

    /**
     * Lance une nouvelle session avec les notes choisies par l'utilisateur.
     *
     * Les notes sont mélangées aléatoirement et répétées si le nombre de notes
     * demandé dépasse le nombre de notes disponibles dans la sélection.
     *
     * @param notesChoisies - Notes sélectionnées en configuration
     * @param nombreNotes - Nombre total de notes souhaitées pour la session
     */
    const demarrerSession = useCallback(
        (notesChoisies: Note[], nombreNotes: number): void => {
            if (!notesChoisies.length) return;

            // Construction du pool avec répétition si nécessaire
            const pool: Note[] = [];
            while (pool.length < nombreNotes) {
                pool.push(...[...notesChoisies].sort(() => Math.random() - 0.5));
            }

            reinitialiserEtatCommun();
            setNotesSession(pool.slice(0, nombreNotes));
            setTotalNotes(nombreNotes);
            setIndexNote(0);
            setPhase("en_cours");
        },
        [reinitialiserEtatCommun]
    );

    /**
     * Passe la note courante sans l'évaluer.
     * Elle sera enregistrée comme "silence" dans le bilan final.
     * Désactivée si une validation est déjà en cours (noteValideeRef).
     */
    const skipNote = useCallback((): void => {
        if (noteValideeRef.current) return;
        arreterStab();
        derniereEvalRef.current = null;
        validerNote(null, "silence", null);
    }, [validerNote, arreterStab]);

    /**
     * Réinitialise complètement la session et retourne à l'écran de configuration.
     */
    const reinitialiser = useCallback((): void => {
        reinitialiserEtatCommun();
        setPhase("configuration");
        setIndexNote(0);
        setTotalNotes(NOMBRE_NOTES_DEFAUT);
        setNotesSession([]);
    }, [reinitialiserEtatCommun]);

    // ── Retour ────────────────────────────────────────────────────────────────

    return {
        phase, noteCourante, indexNote, totalNotes,
        evaluationTempsReel, ecartCentsTempsReel,
        progressionStabilisation, noteValidee,
        resultats, bilan, notesDisponibles,
        demarrerSession, skipNote, reinitialiser, mettreAJourFrequence,
    };
}