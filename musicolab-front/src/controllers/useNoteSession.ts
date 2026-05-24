/**
 * useNoteSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller — Hook React de gestion d'une session d'évaluation vocale.
 *
 * Responsabilités :
 *  - Gérer la progression dans la liste de notes cibles (N notes)
 *  - Collecter et stabiliser la fréquence détectée sur une fenêtre de temps
 *  - Évaluer chaque note chantée via le Model (evaluerJustesse)
 *  - Accumuler les résultats et générer le bilan final (genererBilan)
 *  - Exposer l'état de session aux composants View
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
    frequenceVersNote,
    getNotesOctave,
    type Note,
    type ResultatNote,
    type BilanSession,
    type EvaluationJustesse,
} from "../models/noteModel";

// ─── Constantes de session ────────────────────────────────────────────────────

/**
 * Durée en millisecondes pendant laquelle la fréquence doit être stable
 * avant de valider une note. Évite les faux positifs liés aux transitoires.
 */
const DUREE_STABILISATION_MS = 1_500;

/**
 * Nombre de notes par session par défaut.
 * L'utilisateur peut le modifier via l'interface.
 */
const NOMBRE_NOTES_DEFAUT = 5;

/**
 * Octave utilisée pour générer les notes cibles par défaut.
 * L'octave 4 (Do4–Si4) correspond à la tessiture centrale, vocalement accessible.
 */
const OCTAVE_DEFAUT = 4;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Phase de la session d'évaluation.
 */
export type PhaseSession =
    | "configuration"  // L'utilisateur configure la session (nombre de notes)
    | "en_cours"       // Session active, notes en attente
    | "evaluation"     // Évaluation de la note courante en cours
    | "terminee";      // Session terminée, bilan disponible

/**
 * Interface retournée par le hook — exposée aux composants View.
 */
export interface UseNoteSessionRetour {
    /** Phase actuelle de la session */
    phase: PhaseSession;
    /** Note que l'utilisateur doit chanter actuellement */
    noteCourante: Note | null;
    /** Index de la note courante dans la session (commence à 0) */
    indexNote: number;
    /** Nombre total de notes dans la session */
    totalNotes: number;
    /** Évaluation en temps réel de la note en cours */
    evaluationTempsReel: EvaluationJustesse | null;
    /** Écart en cents en temps réel (pour affichage d'une jauge) */
    ecartCentsTempsReel: number | null;
    /** Résultats accumulés au fil de la session */
    resultats: ResultatNote[];
    /** Bilan final disponible quand phase === "terminee" */
    bilan: BilanSession | null;
    /** Liste des notes disponibles pour la configuration */
    notesDisponibles: Note[];
    /** Démarrer une nouvelle session */
    demarrerSession: (nombreNotes?: number) => void;
    /** Réinitialiser et revenir à la configuration */
    reinitialiser: () => void;
    /** Mettre à jour la fréquence détectée (appelé par usePitchDetection) */
    mettreAJourFrequence: (frequenceHz: number | null) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook de gestion d'une session d'évaluation vocale.
 *
 * Ce hook s'utilise conjointement avec usePitchDetection :
 * ```tsx
 * const { frequenceHz } = usePitchDetection();
 * const session = useNoteSession();
 *
 * // Brancher la détection sur la session
 * useEffect(() => {
 *   session.mettreAJourFrequence(frequenceHz);
 * }, [frequenceHz]);
 * ```
 *
 * @returns UseNoteSessionRetour — état et actions exposés à la View
 */
export function useNoteSession(): UseNoteSessionRetour {
    // ── État de la session (useState — cours S3) ──────────────────────────────

    const [phase, setPhase] = useState<PhaseSession>("configuration");
    const [indexNote, setIndexNote] = useState<number>(0);
    const [totalNotes, setTotalNotes] = useState<number>(NOMBRE_NOTES_DEFAUT);
    const [notesSession, setNotesSession] = useState<Note[]>([]);
    const [resultats, setResultats] = useState<ResultatNote[]>([]);
    const [bilan, setBilan] = useState<BilanSession | null>(null);
    const [evaluationTempsReel, setEvaluationTempsReel] =
        useState<EvaluationJustesse | null>(null);
    const [ecartCentsTempsReel, setEcartCentsTempsReel] = useState<number | null>(
        null
    );

    // ── Références pour la stabilisation ─────────────────────────────────────
    // On utilise useRef pour stocker des données sans déclencher de re-render

    /** Timestamp du début de la stabilisation de la note courante */
    const debutStabilisationRef = useRef<number | null>(null);

    /** Dernière évaluation stable observée */
    const derniereEvaluationRef = useRef<EvaluationJustesse | null>(null);

    /** Fréquence courante reçue du détecteur */
    const frequenceCouranteRef = useRef<number | null>(null);

    // ── Notes disponibles ─────────────────────────────────────────────────────

    /** Liste des 12 notes de l'octave centrale — pour l'affichage en configuration */
    const notesDisponibles = getNotesOctave(OCTAVE_DEFAUT);

    // ── Note courante dérivée de l'index ─────────────────────────────────────

    const noteCourante: Note | null =
        phase === "en_cours" || phase === "evaluation"
            ? notesSession[indexNote] ?? null
            : null;

    // ── Logique de stabilisation (useEffect — cours S4) ──────────────────────
    // Surveille les changements de fréquence et valide une note
    // si elle reste stable pendant DUREE_STABILISATION_MS.

    useEffect(() => {
        const frequence = frequenceCouranteRef.current;

        // Ne rien faire si la session n'est pas en cours ou si pas de note cible
        if (phase !== "en_cours" || !noteCourante) return;

        if (frequence === null) {
            // Silence détecté : réinitialiser la stabilisation
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;
            setEvaluationTempsReel("silence");
            setEcartCentsTempsReel(null);
            return;
        }

        // Calculer l'évaluation et l'écart en temps réel
        const evaluation = evaluerJustesse(frequence, noteCourante);
        const ecart = calculerEcartCents(frequence, noteCourante);

        setEvaluationTempsReel(evaluation);
        setEcartCentsTempsReel(Math.round(ecart));

        const maintenant = Date.now();

        if (evaluation !== derniereEvaluationRef.current) {
            // L'évaluation a changé : réinitialiser le compteur de stabilisation
            debutStabilisationRef.current = maintenant;
            derniereEvaluationRef.current = evaluation;
            return;
        }

        // L'évaluation est stable — vérifier si la durée est atteinte
        if (
            debutStabilisationRef.current !== null &&
            maintenant - debutStabilisationRef.current >= DUREE_STABILISATION_MS
        ) {
            // Note validée — enregistrer le résultat
            validerNoteCourante(frequence, evaluation, ecart);

            // Réinitialiser la stabilisation pour la prochaine note
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;
        }
    }, [evaluationTempsReel, phase, noteCourante]);

    // ── Fonctions internes ────────────────────────────────────────────────────

    /**
     * Enregistre le résultat de la note courante et avance à la suivante.
     */
    const validerNoteCourante = (
        frequence: number,
        evaluation: EvaluationJustesse,
        ecart: number
    ): void => {
        if (!noteCourante) return;

        const resultat: ResultatNote = {
            noteCible: noteCourante,
            frequenceDetectee: frequence,
            ecartCents: Math.round(ecart),
            evaluation,
        };

        const nouveauxResultats = [...resultats, resultat];
        setResultats(nouveauxResultats);

        const prochaineNote = indexNote + 1;

        if (prochaineNote >= totalNotes) {
            // Toutes les notes ont été évaluées — générer le bilan
            const bilanFinal = genererBilan(nouveauxResultats);
            setBilan(bilanFinal);
            setPhase("terminee");
            setEvaluationTempsReel(null);
            setEcartCentsTempsReel(null);
        } else {
            // Passer à la note suivante
            setIndexNote(prochaineNote);
            setEvaluationTempsReel(null);
            setEcartCentsTempsReel(null);
        }
    };

    // ── Actions exposées à la View (useCallback) ──────────────────────────────

    /**
     * Démarre une nouvelle session avec N notes choisies aléatoirement
     * dans les notes disponibles de l'octave centrale.
     *
     * @param nombreNotes - Nombre de notes à évaluer (défaut : 5)
     */
    const demarrerSession = useCallback(
        (nombreNotes: number = NOMBRE_NOTES_DEFAUT): void => {
            // Sélectionner N notes aléatoires parmi les notes disponibles
            const notesAleatoires = [...notesDisponibles]
                .sort(() => Math.random() - 0.5)
                .slice(0, nombreNotes);

            setNotesSession(notesAleatoires);
            setTotalNotes(nombreNotes);
            setIndexNote(0);
            setResultats([]);
            setBilan(null);
            setEvaluationTempsReel(null);
            setEcartCentsTempsReel(null);
            debutStabilisationRef.current = null;
            derniereEvaluationRef.current = null;

            setPhase("en_cours");
        },
        [notesDisponibles]
    );

    /**
     * Réinitialise complètement la session et revient à la configuration.
     */
    const reinitialiser = useCallback((): void => {
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
    }, []);

    /**
     * Reçoit la fréquence détectée depuis usePitchDetection.
     * Appelé à chaque frame d'analyse (~60 fois/seconde).
     *
     * @param frequenceHz - Fréquence en Hz ou null si silence
     */
    const mettreAJourFrequence = useCallback(
        (frequenceHz: number | null): void => {
            frequenceCouranteRef.current = frequenceHz;

            // Forcer un re-render pour déclencher le useEffect de stabilisation
            // en mettant à jour l'évaluation temps réel
            if (phase === "en_cours" && noteCourante) {
                const evaluation = evaluerJustesse(frequenceHz, noteCourante);
                setEvaluationTempsReel(evaluation);

                if (frequenceHz !== null) {
                    const ecart = calculerEcartCents(frequenceHz, noteCourante);
                    setEcartCentsTempsReel(Math.round(ecart));
                } else {
                    setEcartCentsTempsReel(null);
                }
            }
        },
        [phase, noteCourante]
    );

    // ── Valeur retournée à la View ────────────────────────────────────────────

    return {
        phase,
        noteCourante,
        indexNote,
        totalNotes,
        evaluationTempsReel,
        ecartCentsTempsReel,
        resultats,
        bilan,
        notesDisponibles,
        demarrerSession,
        reinitialiser,
        mettreAJourFrequence,
    };
}