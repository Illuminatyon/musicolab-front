/**
 * @file useMidiTranspose.ts
 * @description Couche Controller (MVC) — Gestion de la transposition MIDI.
 *
 * Responsabilité : faire le pont entre la Vue (UI) et le Modèle (API).
 * Gère les états locaux liés au fichier chargé, à l'intervalle choisi et au statut de l'API.
 *
 * Notions du cours appliquées :
 * - Custom Hook (S5) : encapsulation de la logique métier hors du composant visuel.
 * - useState (S3) : gestion des statuts de chargement ("inactif", "chargement", "succes", "erreur").
 * - useCallback (S5) : mémorisation des fonctions (selectionnerFichier, lancerTransposition)
 * pour éviter des re-rendus inutiles dans la vue parente.
 */

import { useState, useCallback } from "react";
import { transposerFichierMidi } from "../models/midiModel.ts";

export type StatutMidi = "inactif" | "chargement" | "succes" | "erreur";

export function useMidiTranspose() {
    const [fichierOriginal, setFichierOriginal] = useState<File | null>(null);
    const [fichierTranspose, setFichierTranspose] = useState<Blob | null>(null);
    const [intervalle, setIntervalle] = useState<number>(0);
    const [statut, setStatut] = useState<StatutMidi>("inactif");
    const [erreur, setErreur] = useState<string | null>(null);

    const selectionnerFichier = useCallback((fichier: File) => {
        setFichierOriginal(fichier);
        setFichierTranspose(null);
        setStatut("inactif");
        setErreur(null);
    }, []);

    const lancerTransposition = useCallback(async () => {
        if (!fichierOriginal) return;
        setStatut("chargement");
        setErreur(null);
        try {
            const blob = await transposerFichierMidi(fichierOriginal, intervalle);
            setFichierTranspose(blob);
            setStatut("succes");
        } catch (err) {
            setErreur(err instanceof Error ? err.message : "Erreur lors de la transposition.");
            setStatut("erreur");
        }
    }, [fichierOriginal, intervalle]);

    const telecharger = useCallback(() => {
        if (!fichierTranspose || !fichierOriginal) return;
        const url = URL.createObjectURL(fichierTranspose);
        const a = document.createElement("a");
        a.href = url;
        const signe = intervalle > 0 ? "+" : "";
        a.download = `transpose_${signe}${intervalle}_${fichierOriginal.name}`;
        a.click();
        URL.revokeObjectURL(url); // Nettoyage de la mémoire
    }, [fichierTranspose, fichierOriginal, intervalle]);

    const reinitialiser = useCallback(() => {
        setFichierOriginal(null);
        setFichierTranspose(null);
        setIntervalle(0);
        setStatut("inactif");
        setErreur(null);
    }, []);

    return {
        fichierOriginal, fichierTranspose, intervalle, statut, erreur,
        setIntervalle, selectionnerFichier, lancerTransposition, telecharger, reinitialiser
    };
}