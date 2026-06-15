/**
 * useStabilisation.ts — couche Controller (MVC)
 * Hook extrait de useNoteSession.
 * Responsabilité unique : gérer le timer de 3s et la progression visuelle.
 */

import { useState, useRef, useCallback, useEffect } from "react";

const DUREE_STABILISATION_MS = 3_000;
const INTERVALLE_MS = 50;

interface UseStabilisationOptions {
    /** Appelé quand les 3s sont écoulées et la note est toujours juste */
    onValide: () => void;
}

export interface UseStabilisationRetour {
    /** Progression entre 0 et 1 */
    progression: number;
    /** Démarre le timer (appeler quand evaluation === "juste") */
    demarrer: () => void;
    /** Arrête et réinitialise le timer */
    arreter: () => void;
}

export function useStabilisation({ onValide }: UseStabilisationOptions): UseStabilisationRetour {
    const [progression, setProgression] = useState(0);

    const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
    const debutRef      = useRef<number | null>(null);
    const onValideRef   = useRef(onValide);
    onValideRef.current = onValide;

    // Nettoyage au démontage
    useEffect(() => {
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    const arreter = useCallback(() => {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
        debutRef.current = null;
        setProgression(0);
    }, []);

    const demarrer = useCallback(() => {
        if (intervalRef.current) return; // déjà en cours

        debutRef.current = Date.now();

        intervalRef.current = setInterval(() => {
            if (debutRef.current === null) return;

            const ecoule = Date.now() - debutRef.current;
            setProgression(Math.min(ecoule / DUREE_STABILISATION_MS, 1));

            if (ecoule >= DUREE_STABILISATION_MS) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                debutRef.current = null;
                setProgression(0);
                onValideRef.current(); // ✅ déclenche la validation
            }
        }, INTERVALLE_MS);
    }, []);

    return { progression, demarrer, arreter };
}