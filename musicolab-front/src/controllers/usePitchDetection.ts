/**
 * usePitchDetection.ts — couche Controller (MVC)
 * Hook React : gère le cycle de vie du microphone et expose la fréquence détectée.
 * Notions du cours : useState (S3), useEffect (S4), Custom Hook (S5)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    initialiserAudio, creerDetecteurPitch,
    demarrerBoucleAnalyse, libererAudio,
    type SessionAudio,
} from "../models/pitchModel";

export type StatutCapture = "inactif" | "chargement" | "actif" | "erreur";

export interface UsePitchDetectionRetour {
    frequenceHz: number | null;
    statut: StatutCapture;
    erreur: string | null;
    demarrer: () => Promise<void>;
    arreter: () => Promise<void>;
}

export function usePitchDetection(): UsePitchDetectionRetour {
    const [frequenceHz, setFrequenceHz] = useState<number | null>(null);
    const [statut, setStatut] = useState<StatutCapture>("inactif");
    const [erreur, setErreur] = useState<string | null>(null);

    const sessionRef = useRef<SessionAudio | null>(null);
    const arreterBoucleRef = useRef<(() => void) | null>(null);

    // Nettoyage automatique au démontage du composant (cours S4)
    useEffect(() => {
        return () => {
            arreterBoucleRef.current?.();
            if (sessionRef.current) libererAudio(sessionRef.current);
        };
    }, []);

    const demarrer = useCallback(async (): Promise<void> => {
        if (statut === "actif" || statut === "chargement") return;
        setStatut("chargement");
        setErreur(null);
        try {
            const session = await initialiserAudio();
            sessionRef.current = session;
            const detecterPitch = creerDetecteurPitch();
            arreterBoucleRef.current = demarrerBoucleAnalyse(
                session, detecterPitch, (f) => setFrequenceHz(f)
            );
            setStatut("actif");
        } catch (err) {
            setErreur(err instanceof Error ? err.message : "Impossible d'accéder au microphone.");
            setStatut("erreur");
        }
    }, [statut]);

    const arreter = useCallback(async (): Promise<void> => {
        arreterBoucleRef.current?.();
        arreterBoucleRef.current = null;
        if (sessionRef.current) {
            await libererAudio(sessionRef.current);
            sessionRef.current = null;
        }
        setFrequenceHz(null);
        setStatut("inactif");
        setErreur(null);
    }, []);

    return { frequenceHz, statut, erreur, demarrer, arreter };
}