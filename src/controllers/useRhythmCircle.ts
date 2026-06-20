/**
 * @file useRhythmCircle.ts
 * @description Couche Controller (MVC) — Hook du séquenceur rythmique.
 *
 * Orchestration du playback audio et de l'animation visuelle.
 *
 * Scheduler à lookahead :
 * Un setInterval tourne toutes les SCHEDULER_INTERVAL ms et planifie les
 * battements dans une fenêtre de LOOKAHEAD_TIME secondes devant la position
 * courante. Le timing repose sur audioContext.currentTime (précision à
 * l'échantillon), pas sur setInterval lui-même → zéro drift.
 *
 * Pause propre :
 * On utilise AudioContext.suspend() / resume(). Le currentTime se fige à la
 * suspension et reprend exactement où il s'est arrêté. Les positions du
 * planificateur restent valides sans recalcul.
 *
 * Notions du cours :
 * - useState (S3) : bpm, pistes, phase, pasCourtants
 * - useRef (S4) : AudioContext, scheduler, animation, refs miroirs
 * - useLayoutEffect (S4) : synchronisation des refs après chaque render
 * - useCallback (S5) : stabilité des handlers
 * - Custom Hook (S5) : logique de séquenceur réutilisable
 */

import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react";
import {
    type Piste,
    type PhaseRythme,
    PISTES_INITIALES,
    BPM_DEFAUT, BPM_MIN, BPM_MAX,
    basculerPas, redimensionnerPiste,
    calculerDureeCycle, calculerDureePas,
    jouerBattement,
} from "../models/rhythmModel.ts";

// ─── Constantes du scheduler ──────────────────────────────────────────────────

/**
 * Fenêtre de planification en secondes.
 * Les battements sont planifiés à l'avance pour donner le temps à l'AudioContext
 * de les traiter avant l'heure de lecture.
 */
const LOOKAHEAD_TIME = 0.1;

/**
 * Intervalle de vérification du scheduler en ms.
 * 4 vérifications par fenêtre de lookahead (100ms / 25ms = 4).
 */
const SCHEDULER_INTERVAL = 25;

// ─── Types internes ───────────────────────────────────────────────────────────

/** État du planificateur pour une piste */
interface EtatPlanificateur {
    /** Temps AudioContext du prochain pas à planifier */
    prochainTemps: number;
    /** Index du prochain pas à planifier */
    prochainIndex: number;
}

// ─── Interface publique ───────────────────────────────────────────────────────

/**
 * Interface complète retournée par useRhythmCircle.
 */
export interface UseRhythmCircleRetour {
    /** Tempo courant en BPM */
    bpm: number;
    /** État des 3 pistes */
    pistes: Piste[];
    /** Phase de lecture : arret / lecture / pause */
    phase: PhaseRythme;
    /** Index du pas courant pour chaque piste (-1 si arrêté) */
    pasCourtants: number[];
    /** Démarre / met en pause / reprend selon la phase courante */
    demarrerPause: () => Promise<void>;
    /** Stoppe et remet à zéro les indicateurs visuels */
    reinitialiser: () => Promise<void>;
    /** Modifie le tempo, contraint à [BPM_MIN, BPM_MAX] */
    modifierBPM: (bpm: number) => void;
    /** Active ou désactive un pas d'une piste */
    basculerPasPiste: (idPiste: number, indexPas: number) => void;
    /** Change le nombre de pas d'une piste */
    modifierNombrePasPiste: (idPiste: number, nouveauNombrePas: number) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook principal du Module 2 — Cercle de rythme interactif.
 *
 * @returns État du séquenceur et actions de contrôle
 */
export function useRhythmCircle(): UseRhythmCircleRetour {

    // ── État React ────────────────────────────────────────────────────────────

    const [bpm, setBpm]       = useState(BPM_DEFAUT);
    const [pistes, setPistes] = useState<Piste[]>(PISTES_INITIALES);
    const [phase, setPhase]   = useState<PhaseRythme>("arret");
    const [pasCourtants, setPasCourtants] = useState<number[]>([-1, -1, -1]);

    // ── Refs miroirs ──────────────────────────────────────────────────────────
    // Permettent au scheduler et à l'animation d'accéder aux valeurs courantes
    // sans dépendances instables dans les callbacks. Synchronisées via useLayoutEffect.

    const bpmRef    = useRef(BPM_DEFAUT);
    const pistesRef = useRef<Piste[]>(PISTES_INITIALES);

    useLayoutEffect(() => {
        bpmRef.current    = bpm;
        pistesRef.current = pistes;
    });

    // ── Refs infrastructure ───────────────────────────────────────────────────

    const audioContextRef  = useRef<AudioContext | null>(null);
    const schedulerIdRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const animationIdRef   = useRef<number>(0);

    /** Positions du planificateur par piste */
    const planificateurRef = useRef<EtatPlanificateur[]>([
        { prochainTemps: 0, prochainIndex: 0 },
        { prochainTemps: 0, prochainIndex: 0 },
        { prochainTemps: 0, prochainIndex: 0 },
    ]);

    /** Temps AudioContext au début du segment de lecture en cours */
    const debutSegmentRef = useRef<number>(0);

    /** Temps de lecture cumulé avant le dernier suspend() */
    const tempsCumulRef = useRef<number>(0);

    // ── Nettoyage au démontage ────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (schedulerIdRef.current !== null) clearInterval(schedulerIdRef.current);
            cancelAnimationFrame(animationIdRef.current);
            audioContextRef.current?.close();
        };
    }, []);

    // ── Scheduler audio ───────────────────────────────────────────────────────

    /**
     * Planifie les battements à venir dans la fenêtre de lookahead.
     * Appelée par setInterval toutes les SCHEDULER_INTERVAL ms.
     *
     * Pour chaque piste, avance dans le temps en planifiant les battements
     * jusqu'à LOOKAHEAD_TIME secondes devant audioContext.currentTime.
     */
    const planifier = useCallback((): void => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        pistesRef.current.forEach((piste, i) => {
            const dureePas = calculerDureePas(bpmRef.current, piste.nombrePas);
            const etat     = planificateurRef.current[i];

            while (etat.prochainTemps < ctx.currentTime + LOOKAHEAD_TIME) {
                if (piste.pas[etat.prochainIndex]) {
                    jouerBattement(ctx, etat.prochainTemps, i);
                }
                etat.prochainIndex = (etat.prochainIndex + 1) % piste.nombrePas;
                etat.prochainTemps += dureePas;
            }
        });
    }, []);

    // ── Animation visuelle ────────────────────────────────────────────────────

    /**
     * Boucle d'animation à ~60fps.
     * Calcule le pas courant de chaque piste à partir de audioContext.currentTime
     * et met à jour pasCourtants via un setState léger (3 entiers).
     *
     * Formule :
     * tempsTotal    = cumulé + (maintenant - débutSegment)
     * tempsEnCycle  = tempsTotal % dureeCycle
     * pasCourant[i] = floor(tempsEnCycle / dureePas[i])
     */
    const animer = useCallback((): void => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const tempsTotal = tempsCumulRef.current + (ctx.currentTime - debutSegmentRef.current);
        const dureeCycle = calculerDureeCycle(bpmRef.current);

        const nouveauxPas = pistesRef.current.map((piste) => {
            const dureePas     = dureeCycle / piste.nombrePas;
            const tempsEnCycle = tempsTotal % dureeCycle;
            return Math.floor(tempsEnCycle / dureePas) % piste.nombrePas;
        });

        setPasCourtants(nouveauxPas);
        // Appel récursif : animer est stable (useCallback []) donc cette
        // référence circulaire fonctionne — animer est défini avant l'exécution.
        animationIdRef.current = requestAnimationFrame(animer);
    }, []);

    // ── Actions principales ───────────────────────────────────────────────────

    /**
     * Démarre la lecture, met en pause ou reprend selon la phase.
     *
     * arret   → crée un AudioContext frais, initialise le planificateur, démarre
     * lecture → suspend l'AudioContext (currentTime se fige), arrête les boucles
     * pause   → reprend l'AudioContext (currentTime continue), relance les boucles
     */
    const demarrerPause = useCallback(async (): Promise<void> => {

        if (phase === "arret") {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            // Active le contexte si suspendu par la politique autoplay du navigateur
            if (ctx.state === "suspended") await ctx.resume();

            debutSegmentRef.current = ctx.currentTime;
            tempsCumulRef.current   = 0;

            // Positionne chaque planificateur au temps courant, index 0
            const t0 = ctx.currentTime;
            pistesRef.current.forEach((_, i) => {
                planificateurRef.current[i] = { prochainTemps: t0, prochainIndex: 0 };
            });

            schedulerIdRef.current  = setInterval(planifier, SCHEDULER_INTERVAL);
            animationIdRef.current  = requestAnimationFrame(animer);
            setPhase("lecture");

        } else if (phase === "lecture") {
            const ctx = audioContextRef.current;
            if (!ctx) return;

            // Accumule le temps écoulé avant de geler le contexte
            tempsCumulRef.current += ctx.currentTime - debutSegmentRef.current;
            await ctx.suspend();

            if (schedulerIdRef.current !== null) {
                clearInterval(schedulerIdRef.current);
                schedulerIdRef.current = null;
            }
            cancelAnimationFrame(animationIdRef.current);
            setPhase("pause");

        } else if (phase === "pause") {
            const ctx = audioContextRef.current;
            if (!ctx) return;

            // AudioContext.resume() reprend currentTime exactement où il s'est gelé.
            // Les positions du planificateur (prochainTemps) restent valides.
            await ctx.resume();
            debutSegmentRef.current = ctx.currentTime;

            schedulerIdRef.current = setInterval(planifier, SCHEDULER_INTERVAL);
            animationIdRef.current = requestAnimationFrame(animer);
            setPhase("lecture");
        }

    }, [phase, planifier, animer]);

    /**
     * Stoppe la lecture, ferme l'AudioContext et réinitialise les indicateurs.
     * Le pattern des pas est conservé — seul le playback est réinitialisé.
     */
    const reinitialiser = useCallback(async (): Promise<void> => {
        if (schedulerIdRef.current !== null) {
            clearInterval(schedulerIdRef.current);
            schedulerIdRef.current = null;
        }
        cancelAnimationFrame(animationIdRef.current);

        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        tempsCumulRef.current = 0;
        setPasCourtants([-1, -1, -1]);
        setPhase("arret");
    }, []);

    /**
     * Modifie le tempo en BPM, contraint à [BPM_MIN, BPM_MAX].
     * Le scheduler lira la nouvelle valeur via bpmRef dès le prochain tick.
     */
    const modifierBPM = useCallback((nouveauBPM: number): void => {
        setBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, nouveauBPM)));
    }, []);

    /**
     * Bascule l'état actif/inactif d'un pas dans une piste.
     *
     * @param idPiste - Index de la piste (0–2)
     * @param indexPas - Index du pas (0–nombrePas-1)
     */
    const basculerPasPiste = useCallback((idPiste: number, indexPas: number): void => {
        setPistes((prev) =>
            prev.map((piste) =>
                piste.id === idPiste ? basculerPas(piste, indexPas) : piste
            )
        );
    }, []);

    /**
     * Modifie le nombre de pas d'une piste.
     * Les pas existants sont conservés ; les nouveaux sont inactifs.
     *
     * @param idPiste - Index de la piste (0–2)
     * @param nouveauNombrePas - Nouveau nombre de pas
     */
    const modifierNombrePasPiste = useCallback((idPiste: number, nouveauNombrePas: number): void => {
        setPistes((prev) =>
            prev.map((piste) =>
                piste.id === idPiste ? redimensionnerPiste(piste, nouveauNombrePas) : piste
            )
        );
    }, []);

    // ── Retour ────────────────────────────────────────────────────────────────

    return {
        bpm, pistes, phase, pasCourtants,
        demarrerPause, reinitialiser,
        modifierBPM, basculerPasPiste, modifierNombrePasPiste,
    };
}
