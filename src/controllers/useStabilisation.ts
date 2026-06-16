/**
 * @file useStabilisation.ts
 * @description Couche Controller (MVC) — Hook de stabilisation temporelle.
 *
 * Responsabilité unique : gérer le timer de 3 secondes et la progression visuelle.
 * Extrait de useNoteSession pour respecter le principe de responsabilité unique (SRP).
 *
 * Pourquoi un setInterval et non un useEffect ?
 * Un useEffect ne se re-déclenche que si ses dépendances changent de valeur.
 * Si l'évaluation reste "juste" stable pendant 3s, la valeur ne change pas
 * → le useEffect ne se relance jamais → la validation n'a pas lieu.
 * Le setInterval s'exécute toutes les 50ms indépendamment des re-renders React,
 * ce qui garantit la vérification temporelle à intervalles réguliers.
 */

import { useState, useLayoutEffect, useRef, useCallback, useEffect } from "react";

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Durée de stabilisation requise avant validation automatique (ms) */
const DUREE_STABILISATION_MS = 3_000;

/** Intervalle de mise à jour de la progression — 50ms = 20 updates/seconde */
const INTERVALLE_MS = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options de configuration du hook useStabilisation.
 */
interface UseStabilisationOptions {
    /**
     * Callback appelé exactement une fois quand les 3 secondes sont écoulées.
     * Le parent (useNoteSession) vérifie alors si la note est toujours juste
     * avant de déclencher la validation.
     */
    onValide: () => void;
}

/**
 * Valeurs et actions exposées par le hook useStabilisation.
 */
export interface UseStabilisationRetour {
    /** Progression de la stabilisation entre 0 (début) et 1 (3s écoulées) */
    progression: number;
    /** Démarre le timer — appeler quand l'évaluation passe à "juste" */
    demarrer: () => void;
    /** Arrête et réinitialise le timer — appeler quand l'évaluation change */
    arreter: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook de stabilisation temporelle pour la validation vocale.
 *
 * Gère un timer de 3 secondes avec progression visuelle (0 → 1).
 * Appelle `onValide` une fois les 3 secondes écoulées sans interruption.
 *
 * Utilisation typique dans useNoteSession :
 * ```ts
 * const { progression, demarrer, arreter } = useStabilisation({
 *   onValide: () => validerNote(freq, "juste", ecart),
 * });
 *
 * // Quand la voix est juste :
 * demarrer();
 *
 * // Quand la voix dévie :
 * arreter(); // remet le timer à zéro
 * ```
 *
 * @param options - Options du hook, notamment le callback onValide
 * @returns Progression, demarrer et arreter
 */
export function useStabilisation({ onValide }: UseStabilisationOptions): UseStabilisationRetour {

    /** Progression entre 0 et 1 — mise à jour toutes les 50ms pour un affichage fluide */
    const [progression, setProgression] = useState(0);

    /** Référence vers le setInterval actif, ou null si le timer est arrêté */
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /** Timestamp du moment où le timer a démarré */
    const debutRef = useRef<number | null>(null);

    /**
     * Référence stable vers le callback onValide.
     * Mise à jour via useLayoutEffect pour éviter les closures périmées
     * sans avoir à re-créer le setInterval à chaque render.
     */
    const onValideRef = useRef(onValide);
    useLayoutEffect(() => {
        onValideRef.current = onValide;
    });

    // Nettoyage au démontage du composant parent
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    /**
     * Arrête le timer et réinitialise la progression à 0.
     * Appelée quand l'évaluation change (voix décroche de la note juste).
     */
    const arreter = useCallback((): void => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        debutRef.current = null;
        setProgression(0);
    }, []);

    /**
     * Démarre le timer de 3 secondes.
     * Si le timer est déjà en cours, ne fait rien (idempotent).
     *
     * Le setInterval vérifie toutes les 50ms si les 3s sont écoulées.
     * Quand c'est le cas, il s'arrête lui-même et appelle onValide.
     */
    const demarrer = useCallback((): void => {
        if (intervalRef.current) return; // déjà en cours

        debutRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            if (debutRef.current === null) return;

            const ecoule = Date.now() - debutRef.current;
            setProgression(Math.min(ecoule / DUREE_STABILISATION_MS, 1));

            // Vérification des 3 secondes
            if (ecoule >= DUREE_STABILISATION_MS) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                debutRef.current    = null;
                setProgression(0);
                onValideRef.current(); // ✅ déclenche la validation dans useNoteSession
            }
        }, INTERVALLE_MS);
    }, []);

    return { progression, demarrer, arreter };
}