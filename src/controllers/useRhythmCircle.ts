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
 * Pattern d'auto-référence pour requestAnimationFrame :
 * La fonction `animer` doit s'appeler elle-même récursivement, mais la règle
 * ESLint react-hooks/immutability interdit la référence directe d'un const
 * dans son propre corps (TDZ statique, même si valide à l'exécution car
 * l'appel est asynchrone). Solution : on passe par `animerRef`, une ref
 * toujours synchronisée sur la dernière version de `animer` via
 * useLayoutEffect. Le corps de `animer` appelle `animerRef.current()`
 * plutôt que `animer` directement.
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

const LOOKAHEAD_TIME = 0.1;
const SCHEDULER_INTERVAL = 25;

// ─── Types internes ───────────────────────────────────────────────────────────

interface EtatPlanificateur {
    prochainTemps: number;
    prochainIndex: number;
}

// ─── Interface publique ───────────────────────────────────────────────────────

export interface UseRhythmCircleRetour {
    bpm: number;
    pistes: Piste[];
    phase: PhaseRythme;
    pasCourtants: number[];
    demarrerPause: () => Promise<void>;
    reinitialiser: () => Promise<void>;
    modifierBPM: (bpm: number) => void;
    basculerPasPiste: (idPiste: number, indexPas: number) => void;
    modifierNombrePasPiste: (idPiste: number, nouveauNombrePas: number) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRhythmCircle(): UseRhythmCircleRetour {

    // ── État React ────────────────────────────────────────────────────────────

    const [bpm, setBpm]       = useState(BPM_DEFAUT);
    const [pistes, setPistes] = useState<Piste[]>(PISTES_INITIALES);
    const [phase, setPhase]   = useState<PhaseRythme>("arret");
    const [pasCourtants, setPasCourtants] = useState<number[]>([-1, -1, -1]);

    // ── Refs miroirs ──────────────────────────────────────────────────────────

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

    const planificateurRef = useRef<EtatPlanificateur[]>([
        { prochainTemps: 0, prochainIndex: 0 },
        { prochainTemps: 0, prochainIndex: 0 },
        { prochainTemps: 0, prochainIndex: 0 },
    ]);

    const debutSegmentRef = useRef<number>(0);
    const tempsCumulRef   = useRef<number>(0);

    /**
     * Ref vers la dernière version de `animer`.
     * Permet l'auto-référence récursive sans violer react-hooks/immutability :
     * le corps de `animer` appelle `animerRef.current()` au lieu de `animer`
     * directement, ce qui contourne la détection statique de self-reference.
     */
    const animerRef = useRef<() => void>(() => {});

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
     *
     * L'appel récursif passe par `animerRef.current()` plutôt que par le nom
     * `animer` directement — voir le commentaire sur `animerRef` plus haut
     * pour la justification (contournement de react-hooks/immutability).
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
        animationIdRef.current = requestAnimationFrame(() => animerRef.current());
    }, []);

    /** Synchronise animerRef sur la dernière version de animer après chaque render */
    useLayoutEffect(() => {
        animerRef.current = animer;
    });

    // ── Actions principales ───────────────────────────────────────────────────

    /**
     * Démarre la lecture, met en pause ou reprend selon la phase.
     */
    const demarrerPause = useCallback(async (): Promise<void> => {

        if (phase === "arret") {
            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            if (ctx.state === "suspended") await ctx.resume();

            debutSegmentRef.current = ctx.currentTime;
            tempsCumulRef.current   = 0;

            const t0 = ctx.currentTime;
            pistesRef.current.forEach((_, i) => {
                planificateurRef.current[i] = { prochainTemps: t0, prochainIndex: 0 };
            });

            schedulerIdRef.current = setInterval(planifier, SCHEDULER_INTERVAL);
            animationIdRef.current = requestAnimationFrame(() => animerRef.current());
            setPhase("lecture");

        } else if (phase === "lecture") {
            const ctx = audioContextRef.current;
            if (!ctx) return;

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

            await ctx.resume();
            debutSegmentRef.current = ctx.currentTime;

            schedulerIdRef.current = setInterval(planifier, SCHEDULER_INTERVAL);
            animationIdRef.current = requestAnimationFrame(() => animerRef.current());
            setPhase("lecture");
        }

    }, [phase, planifier]);

    /**
     * Stoppe la lecture, ferme l'AudioContext et réinitialise les indicateurs.
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

    const modifierBPM = useCallback((nouveauBPM: number): void => {
        setBpm(Math.max(BPM_MIN, Math.min(BPM_MAX, nouveauBPM)));
    }, []);

    const basculerPasPiste = useCallback((idPiste: number, indexPas: number): void => {
        setPistes((prev) =>
            prev.map((piste) =>
                piste.id === idPiste ? basculerPas(piste, indexPas) : piste
            )
        );
    }, []);

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