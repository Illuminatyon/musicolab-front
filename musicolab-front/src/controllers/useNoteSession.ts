/**
 * useNoteSession.ts — couche Controller (MVC)
 * Hook React : gère la session N notes (skip, validation, bilan).
 *
 * La logique de stabilisation (timer 3s + progression) est déléguée
 * au hook useStabilisation, conformément au principe de responsabilité unique.
 *
 * Notions du cours : useState (S3), useEffect (S4), Custom Hook (S5)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    evaluerJustesse, calculerEcartCents, genererBilan, getNotesOctave,
    type Note, type ResultatNote, type BilanSession, type EvaluationJustesse,
} from "../models/noteModel";
import { useStabilisation } from "./useStabilisation";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DUREE_FEEDBACK_VALIDE_MS = 1_000;
const NOMBRE_NOTES_DEFAUT      = 5;
const OCTAVE_DEFAUT            = 4;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhaseSession = "configuration" | "en_cours" | "terminee";

export interface UseNoteSessionRetour {
    phase: PhaseSession;
    noteCourante: Note | null;
    indexNote: number;
    totalNotes: number;
    evaluationTempsReel: EvaluationJustesse | null;
    ecartCentsTempsReel: number | null;
    /** Progression de stabilisation entre 0 et 1 — gérée par useStabilisation */
    progressionStabilisation: number;
    noteValidee: boolean;
    resultats: ResultatNote[];
    bilan: BilanSession | null;
    notesDisponibles: Note[];
    demarrerSession: (notesChoisies: Note[], nombreNotes: number) => void;
    skipNote: () => void;
    reinitialiser: () => void;
    mettreAJourFrequence: (frequenceHz: number | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNoteSession(): UseNoteSessionRetour {

    // ── État ──────────────────────────────────────────────────────────────────

    const [phase, setPhase]                          = useState<PhaseSession>("configuration");
    const [indexNote, setIndexNote]                  = useState(0);
    const [totalNotes, setTotalNotes]                = useState(NOMBRE_NOTES_DEFAUT);
    const [notesSession, setNotesSession]            = useState<Note[]>([]);
    const [resultats, setResultats]                  = useState<ResultatNote[]>([]);
    const [bilan, setBilan]                          = useState<BilanSession | null>(null);
    const [evaluationTempsReel, setEvaluation]       = useState<EvaluationJustesse | null>(null);
    const [ecartCentsTempsReel, setEcart]            = useState<number | null>(null);
    const [noteValidee, setNoteValidee]              = useState(false);

    // ── Refs miroirs (accès stable dans les callbacks) ────────────────────────

    const frequenceRef     = useRef<number | null>(null);
    const derniereEvalRef  = useRef<EvaluationJustesse | null>(null);
    const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteValideeRef   = useRef(false);
    const resultatsRef     = useRef<ResultatNote[]>([]);
    const indexRef         = useRef(0);
    const totalRef         = useRef(NOMBRE_NOTES_DEFAUT);
    const notesRef         = useRef<Note[]>([]);
    const phaseRef         = useRef<PhaseSession>("configuration");

    resultatsRef.current   = resultats;
    indexRef.current       = indexNote;
    totalRef.current       = totalNotes;
    notesRef.current       = notesSession;
    phaseRef.current       = phase;
    noteValideeRef.current = noteValidee;

    const notesDisponibles = getNotesOctave(OCTAVE_DEFAUT);
    const noteCourante     = phase === "en_cours" ? notesSession[indexNote] ?? null : null;

    // ── Nettoyage au démontage (useEffect — cours S4) ────────────────────────

    useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    // ── Validation + feedback ─────────────────────────────────────────────────

    /**
     * Enregistre le résultat de la note courante, affiche l'overlay de validation
     * pendant 1s si juste, puis avance à la note suivante ou termine la session.
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

            // Afficher l'overlay vert uniquement si la note était juste
            if (evaluation === "juste") {
                setNoteValidee(true);
                noteValideeRef.current = true;
            }

            const delai = evaluation === "juste" ? DUREE_FEEDBACK_VALIDE_MS : 0;

            timeoutRef.current = setTimeout(() => {
                setNoteValidee(false);
                noteValideeRef.current = false;

                if (indexRef.current + 1 >= totalRef.current) {
                    setBilan(genererBilan(nouveaux));
                    setPhase("terminee");
                } else {
                    setIndexNote((i) => i + 1);
                }
                setEvaluation(null);
                setEcart(null);
            }, delai);
        },
        []
    );

    // Ref stable vers validerNote — utilisée depuis le callback useStabilisation
    const validerNoteRef      = useRef(validerNote);
    validerNoteRef.current    = validerNote;

    // ── useStabilisation — timer 3s délégué ──────────────────────────────────

    /**
     * Callback appelé par useStabilisation quand les 3s sont écoulées.
     * On vérifie une dernière fois que la note est toujours juste avant de valider.
     */
    const handleValide = useCallback(() => {
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

    // ── Mise à jour de la fréquence (~60fps via usePitchDetection) ────────────

    /**
     * Reçoit la fréquence détectée à chaque frame.
     * Déclenche ou arrête la stabilisation selon l'évaluation.
     */
    const mettreAJourFrequence = useCallback(
        (frequenceHz: number | null): void => {
            frequenceRef.current = frequenceHz;

            // Ne rien faire si session inactive ou overlay de validation affiché
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

            // Réagir uniquement si l'évaluation a changé
            if (evaluation !== derniereEvalRef.current) {
                derniereEvalRef.current = evaluation;

                if (evaluation === "juste") {
                    demarrerStab(); // ▶ lance le timer 3s
                } else {
                    arreterStab();  // ■ réinitialise le timer
                }
            }
        },
        [demarrerStab, arreterStab]
    );

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Réinitialise tous les états et refs communs entre demarrerSession
     * et reinitialiser, pour éviter la duplication de code.
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
     * Mélange aléatoirement et répète si nécessaire pour atteindre nombreNotes.
     */
    const demarrerSession = useCallback(
        (notesChoisies: Note[], nombreNotes: number): void => {
            if (!notesChoisies.length) return;

            const pool: Note[] = [];
            while (pool.length < nombreNotes)
                pool.push(...[...notesChoisies].sort(() => Math.random() - 0.5));

            reinitialiserEtatCommun();
            setNotesSession(pool.slice(0, nombreNotes));
            setTotalNotes(nombreNotes);
            setIndexNote(0);
            setPhase("en_cours");
        },
        [reinitialiserEtatCommun]
    );

    /**
     * Passe la note courante sans la valider.
     * Elle sera comptée comme "silence" dans le bilan.
     */
    const skipNote = useCallback((): void => {
        if (noteValideeRef.current) return;
        arreterStab();
        derniereEvalRef.current = null;
        validerNote(null, "silence", null);
    }, [validerNote, arreterStab]);

    /**
     * Réinitialise complètement la session et revient à l'écran de configuration.
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