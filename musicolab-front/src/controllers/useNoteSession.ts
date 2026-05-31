/**
 * useNoteSession.ts — couche Controller (MVC)
 * Hook React : gère la session N notes (stabilisation 3s, skip, validation, bilan).
 *
 * Fix : la validation est gérée dans le setInterval (toutes les 50ms)
 * et non dans un useEffect, ce qui évite le bug où le check des 3s
 * ne se déclenche pas quand evaluationTempsReel reste identique.
 *
 * Notions du cours : useState (S3), useEffect (S4), Custom Hook (S5)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    evaluerJustesse, calculerEcartCents, genererBilan, getNotesOctave,
    type Note, type ResultatNote, type BilanSession, type EvaluationJustesse,
} from "../models/noteModel";

// ─── Constantes ───────────────────────────────────────────────────────────────

const DUREE_STABILISATION_MS   = 3_000;
const INTERVALLE_MS            = 50;
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

    const [phase, setPhase]                     = useState<PhaseSession>("configuration");
    const [indexNote, setIndexNote]             = useState(0);
    const [totalNotes, setTotalNotes]           = useState(NOMBRE_NOTES_DEFAUT);
    const [notesSession, setNotesSession]       = useState<Note[]>([]);
    const [resultats, setResultats]             = useState<ResultatNote[]>([]);
    const [bilan, setBilan]                     = useState<BilanSession | null>(null);
    const [evaluationTempsReel, setEvaluation]  = useState<EvaluationJustesse | null>(null);
    const [ecartCentsTempsReel, setEcart]       = useState<number | null>(null);
    const [progressionStabilisation, setProgression] = useState(0);
    const [noteValidee, setNoteValidee]         = useState(false);

    // ── Refs (données stables entre renders sans déclencher de re-render) ─────

    const frequenceRef        = useRef<number | null>(null);
    const debutStabRef        = useRef<number | null>(null);
    const derniereEvalRef     = useRef<EvaluationJustesse | null>(null);
    const intervalRef         = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
    const noteValideeRef      = useRef(false);

    // Miroirs de l'état pour accès dans les callbacks sans dépendances instables
    const resultatsRef        = useRef<ResultatNote[]>([]);
    const indexRef            = useRef(0);
    const totalRef            = useRef(NOMBRE_NOTES_DEFAUT);
    const notesRef            = useRef<Note[]>([]);
    const phaseRef            = useRef<PhaseSession>("configuration");

    resultatsRef.current = resultats;
    indexRef.current     = indexNote;
    totalRef.current     = totalNotes;
    notesRef.current     = notesSession;
    phaseRef.current     = phase;
    noteValideeRef.current = noteValidee;

    const notesDisponibles = getNotesOctave(OCTAVE_DEFAUT);
    const noteCourante = phase === "en_cours" ? notesSession[indexNote] ?? null : null;

    // ── Nettoyage au démontage (useEffect — cours S4) ────────────────────────

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current)  clearTimeout(timeoutRef.current);
        };
    }, []);

    // ── Validation + feedback ─────────────────────────────────────────────────

    /**
     * Enregistre le résultat, affiche le feedback de validation (1s si juste),
     * puis avance à la note suivante ou termine la session.
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

            // Afficher l'overlay vert si la note était juste
            if (evaluation === "juste") {
                setNoteValidee(true);
                noteValideeRef.current = true;
            }

            const delai = evaluation === "juste" ? DUREE_FEEDBACK_VALIDE_MS : 0;

            timeoutRef.current = setTimeout(() => {
                setNoteValidee(false);
                noteValideeRef.current = false;

                if (indexRef.current + 1 >= totalRef.current) {
                    // Fin de session
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

    // Ref stable vers validerNote pour l'utiliser dans l'interval
    const validerNoteRef = useRef(validerNote);
    validerNoteRef.current = validerNote;

    // ── Arrêt de l'intervalle ─────────────────────────────────────────────────

    const stopInterval = useCallback(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        setProgression(0);
        debutStabRef.current = null;
    }, []);

    // ── Démarrage de l'intervalle ─────────────────────────────────────────────

    /**
     * Lance l'intervalle de progression (50ms).
     *
     * C'est ici que la validation des 3s se produit — dans l'intervalle,
     * pas dans un useEffect — pour garantir que le check s'exécute
     * même si evaluationTempsReel ne change pas entre deux frames.
     */
    const startInterval = useCallback(() => {
        if (intervalRef.current) return;

        intervalRef.current = setInterval(() => {
            // Ne rien faire si session inactive ou note en cours de validation
            if (phaseRef.current !== "en_cours" || noteValideeRef.current) return;
            if (debutStabRef.current === null) { setProgression(0); return; }

            const ecoule = Date.now() - debutStabRef.current;
            setProgression(Math.min(ecoule / DUREE_STABILISATION_MS, 1));

            // Vérification des 3 secondes
            if (ecoule >= DUREE_STABILISATION_MS) {
                const freq = frequenceRef.current;
                const note = notesRef.current[indexRef.current];

                if (freq !== null && note) {
                    const eval_ = evaluerJustesse(freq, note);
                    if (eval_ === "juste") {
                        // ✅ Note validée après 3s
                        validerNoteRef.current(freq, eval_, calculerEcartCents(freq, note));
                    }
                }

                // Arrêter l'intervalle dans tous les cas
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                debutStabRef.current = null;
                derniereEvalRef.current = null;
                setProgression(0);
            }
        }, INTERVALLE_MS);
    }, []);

    // ── Mise à jour de la fréquence (appelée ~60fps par usePitchDetection) ────

    const mettreAJourFrequence = useCallback(
        (frequenceHz: number | null): void => {
            frequenceRef.current = frequenceHz;

            if (phaseRef.current !== "en_cours" || noteValideeRef.current) return;

            const note = notesRef.current[indexRef.current];
            if (!note) return;

            const evaluation = evaluerJustesse(frequenceHz, note);

            setEvaluation(evaluation);
            setEcart(frequenceHz !== null ? Math.round(calculerEcartCents(frequenceHz, note)) : null);

            if (evaluation !== derniereEvalRef.current) {
                // L'évaluation a changé : réinitialiser la stabilisation
                derniereEvalRef.current = evaluation;

                if (evaluation === "juste") {
                    // Nouvelle note juste : démarrer le compteur et l'intervalle
                    debutStabRef.current = Date.now();
                    startInterval();
                } else {
                    // Plus juste : arrêter
                    stopInterval();
                }
            }
        },
        [startInterval, stopInterval]
    );

    // ── Actions ───────────────────────────────────────────────────────────────

    const reinitialiserEtatCommun = useCallback((): void => {
        stopInterval();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setResultats([]);
        setBilan(null);
        setEvaluation(null);
        setEcart(null);
        setProgression(0);
        setNoteValidee(false);
        noteValideeRef.current   = false;
        debutStabRef.current     = null;
        derniereEvalRef.current  = null;
        frequenceRef.current     = null;
    }, [stopInterval]);

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

    const skipNote = useCallback((): void => {
        if (noteValideeRef.current) return;
        stopInterval();
        debutStabRef.current    = null;
        derniereEvalRef.current = null;
        validerNote(null, "silence", null);
    }, [validerNote, stopInterval]);

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