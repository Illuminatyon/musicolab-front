/**
 * usePitchDetection.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Controller — Hook React de détection de pitch en temps réel.
 *
 * Responsabilités :
 *  - Gérer le cycle de vie du microphone (démarrage / arrêt)
 *  - Orchestrer le pipeline audio : initialiserAudio → demarrerBoucleAnalyse
 *  - Exposer la fréquence détectée en temps réel aux composants View
 *  - Nettoyer les ressources audio à la destruction du composant (useEffect)
 *
 * Notions du cours appliquées :
 *  - useState  (S3) : état local du hook (fréquence, statut, erreur)
 *  - useEffect (S4) : nettoyage des ressources au démontage du composant
 *  - Custom Hook (S5) : logique réutilisable extraite des composants
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    initialiserAudio,
    creerDetecteurPitch,
    demarrerBoucleAnalyse,
    libererAudio,
    type SessionAudio,
} from "../models/pitchModel";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Statut possible de la session de capture audio.
 */
export type StatutCapture =
    | "inactif"     // Micro non démarré
    | "chargement"  // Demande de permission en cours
    | "actif"       // Micro actif, analyse en cours
    | "erreur";     // Erreur (permission refusée, navigateur incompatible...)

/**
 * Interface retournée par le hook — exposée aux composants View.
 */
export interface UsePitchDetectionRetour {
    /** Fréquence détectée en Hz (null si silence ou micro inactif) */
    frequenceHz: number | null;
    /** Statut actuel de la capture audio */
    statut: StatutCapture;
    /** Message d'erreur si statut === "erreur", sinon null */
    erreur: string | null;
    /** Démarre la capture microphone */
    demarrer: () => Promise<void>;
    /** Arrête la capture et libère les ressources */
    arreter: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook de détection de pitch en temps réel.
 *
 * Exemple d'utilisation dans un composant View :
 * ```tsx
 * const { frequenceHz, statut, demarrer, arreter } = usePitchDetection();
 * ```
 *
 * @returns UsePitchDetectionRetour — état et actions exposés à la View
 */
export function usePitchDetection(): UsePitchDetectionRetour {
    // ── État local (useState — cours S3) ──────────────────────────────────────

    /** Fréquence détectée à la dernière frame d'analyse */
    const [frequenceHz, setFrequenceHz] = useState<number | null>(null);

    /** Statut de la session de capture */
    const [statut, setStatut] = useState<StatutCapture>("inactif");

    /** Message d'erreur éventuel */
    const [erreur, setErreur] = useState<string | null>(null);

    // ── Références (useRef) ───────────────────────────────────────────────────
    // useRef permet de stocker des valeurs qui ne déclenchent pas de re-render
    // et qui persistent entre les renders — idéal pour les ressources audio.

    /** Session audio active (contexte, source, analyser, stream) */
    const sessionRef = useRef<SessionAudio | null>(null);

    /** Fonction d'arrêt de la boucle requestAnimationFrame */
    const arreterBoucleRef = useRef<(() => void) | null>(null);

    // ── Nettoyage automatique (useEffect — cours S4) ─────────────────────────
    // Si le composant est démonté pendant une session active,
    // on libère proprement les ressources pour éviter les fuites mémoire
    // et éteindre le voyant microphone du navigateur.

    useEffect(() => {
        return () => {
            // Fonction de nettoyage exécutée au démontage du composant
            if (arreterBoucleRef.current) {
                arreterBoucleRef.current();
            }
            if (sessionRef.current) {
                libererAudio(sessionRef.current);
            }
        };
    }, []); // [] = s'exécute uniquement au montage et au démontage

    // ── Actions (useCallback) ─────────────────────────────────────────────────
    // useCallback mémoïse les fonctions pour éviter de les recréer à chaque render.

    /**
     * Démarre la capture microphone et la boucle d'analyse.
     * Gère les erreurs de permission et d'initialisation.
     */
    const demarrer = useCallback(async (): Promise<void> => {
        // Éviter un double démarrage
        if (statut === "actif" || statut === "chargement") return;

        setStatut("chargement");
        setErreur(null);

        try {
            // Initialiser le pipeline audio (demande permission micro)
            const session = await initialiserAudio();
            sessionRef.current = session;

            // Créer le détecteur YIN
            const detecterPitch = creerDetecteurPitch();

            // Lancer la boucle d'analyse — callback appelé ~60 fois/seconde
            const arreterBoucle = demarrerBoucleAnalyse(
                session,
                detecterPitch,
                (frequence) => {
                    // Mise à jour de l'état React avec la fréquence détectée
                    setFrequenceHz(frequence);
                }
            );

            arreterBoucleRef.current = arreterBoucle;
            setStatut("actif");

        } catch (err) {
            // Cas typiques : permission refusée, navigateur incompatible
            const message =
                err instanceof Error
                    ? err.message
                    : "Impossible d'accéder au microphone.";

            setErreur(message);
            setStatut("erreur");
        }
    }, [statut]);

    /**
     * Arrête la capture microphone et libère toutes les ressources audio.
     */
    const arreter = useCallback(async (): Promise<void> => {
        // Arrêter la boucle requestAnimationFrame
        if (arreterBoucleRef.current) {
            arreterBoucleRef.current();
            arreterBoucleRef.current = null;
        }

        // Libérer les ressources Web Audio API
        if (sessionRef.current) {
            await libererAudio(sessionRef.current);
            sessionRef.current = null;
        }

        // Réinitialiser l'état
        setFrequenceHz(null);
        setStatut("inactif");
        setErreur(null);
    }, []);

    // ── Valeur retournée à la View ─────────────────────────────────────────────

    return {
        frequenceHz,
        statut,
        erreur,
        demarrer,
        arreter,
    };
}