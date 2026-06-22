/**
 * useAudioAnalyse.ts : couche Controller (MVC)
 */

import { useState, useCallback } from "react";
import { analyserFichierAudio, type AnalyseAudio } from "../models/audioModel";

export type StatutAnalyse = "inactif" | "chargement" | "succes" | "erreur";

export interface UseAudioAnalyseRetour {
    fichier: File | null;
    analyse: AnalyseAudio | null;
    statut: StatutAnalyse;
    erreur: string | null;
    selectionnerFichier: (fichier: File) => void;
    lancer: () => Promise<void>;
    reinitialiser: () => void;
}

export function useAudioAnalyse(): UseAudioAnalyseRetour {
    const [fichier, setFichier] = useState<File | null>(null);
    const [analyse, setAnalyse] = useState<AnalyseAudio | null>(null);
    const [statut, setStatut] = useState<StatutAnalyse>("inactif");
    const [erreur, setErreur] = useState<string | null>(null);

    const selectionnerFichier = useCallback((f: File): void => {
        setFichier(f);
        setAnalyse(null);
        setErreur(null);
        setStatut("inactif");
    }, []);

    const lancer = useCallback(async (): Promise<void> => {
        if (!fichier) return;
        setStatut("chargement");
        setErreur(null);
        try {
            const resultat = await analyserFichierAudio(fichier);
            setAnalyse(resultat);
            setStatut("succes");
        } catch (err) {
            setErreur(err instanceof Error ? err.message : "Erreur lors de l'analyse.");
            setStatut("erreur");
        }
    }, [fichier]);

    const reinitialiser = useCallback((): void => {
        setFichier(null);
        setAnalyse(null);
        setStatut("inactif");
        setErreur(null);
    }, []);

    return { fichier, analyse, statut, erreur, selectionnerFichier, lancer, reinitialiser };
}
