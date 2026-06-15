/**
 * @file usePitchDetection.ts
 * @description Couche Controller (MVC) — Hook de capture microphone.
 *
 * Responsabilité : gérer le cycle de vie complet du microphone et exposer
 * la fréquence détectée aux composants View via un état React.
 *
 * Notions du cours appliquées :
 * - useState (S3) : statut de capture, fréquence, message d'erreur
 * - useEffect (S4) : nettoyage des ressources au démontage du composant
 * - Custom Hook (S5) : logique réutilisable extraite des composants
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
    initialiserAudio,
    creerDetecteurPitch,
    demarrerBoucleAnalyse,
    libererAudio,
    type SessionAudio,
} from "../models/pitchModel.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Statut possible de la session de capture audio.
 * - `"inactif"`    : micro non démarré, état initial
 * - `"chargement"` : demande de permission en cours
 * - `"actif"`      : micro actif, analyse en cours (~60 fps)
 * - `"erreur"`     : permission refusée ou navigateur incompatible
 */
export type StatutCapture = "inactif" | "chargement" | "actif" | "erreur";

/**
 * Interface retournée par le hook — exposée aux composants View.
 */
export interface UsePitchDetectionRetour {
    /** Dernière fréquence détectée en Hz, ou null si silence ou micro inactif */
    frequenceHz: number | null;
    /** Statut actuel de la capture audio */
    statut: StatutCapture;
    /** Message d'erreur si statut === "erreur", sinon null */
    erreur: string | null;
    /** Démarre la capture — demande la permission micro et lance la boucle d'analyse */
    demarrer: () => Promise<void>;
    /** Arrête la capture et libère toutes les ressources audio */
    arreter: () => Promise<void>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook de détection de pitch en temps réel via le microphone.
 *
 * Encapsule le pipeline complet :
 * getUserMedia → AudioContext → AnalyserNode → YIN → useState
 *
 * Exemple d'utilisation dans un composant View :
 * ```tsx
 * const { frequenceHz, statut, demarrer, arreter } = usePitchDetection();
 *
 * return (
 *   <button onClick={demarrer} disabled={statut === "actif"}>
 *     {statut === "actif" ? "Micro actif" : "Démarrer"}
 *   </button>
 * );
 * ```
 *
 * @returns Fréquence détectée, statut, erreur, et actions de contrôle
 */
export function usePitchDetection(): UsePitchDetectionRetour {

    // ── État React ────────────────────────────────────────────────────────────

    /** Dernière fréquence détectée en Hz (null si silence) */
    const [frequenceHz, setFrequenceHz] = useState<number | null>(null);

    /** Statut de la capture */
    const [statut, setStatut] = useState<StatutCapture>("inactif");

    /** Message d'erreur éventuel */
    const [erreur, setErreur] = useState<string | null>(null);

    // ── Refs ──────────────────────────────────────────────────────────────────
    // useRef pour stocker les ressources audio sans déclencher de re-render

    /** Session audio active (AudioContext, AnalyserNode, MediaStream) */
    const sessionRef = useRef<SessionAudio | null>(null);

    /** Fonction d'arrêt de la boucle requestAnimationFrame */
    const arreterBoucleRef = useRef<(() => void) | null>(null);

    // ── Nettoyage au démontage (useEffect — cours S4) ────────────────────────

    /**
     * Si le composant est démonté pendant une session active,
     * on libère les ressources pour éteindre le voyant microphone.
     */
    useEffect(() => {
        return () => {
            arreterBoucleRef.current?.();
            if (sessionRef.current) libererAudio(sessionRef.current);
        };
    }, []);

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Démarre la capture microphone et la boucle d'analyse YIN.
     *
     * Séquence :
     * 1. Passe le statut à "chargement"
     * 2. Demande la permission microphone (getUserMedia)
     * 3. Initialise le pipeline Web Audio API
     * 4. Lance la boucle requestAnimationFrame
     * 5. Passe le statut à "actif"
     *
     * En cas d'erreur (permission refusée, navigateur incompatible) :
     * - Passe le statut à "erreur"
     * - Stocke le message d'erreur dans `erreur`
     *
     * @returns Promesse résolue quand le micro est actif
     */
    const demarrer = useCallback(async (): Promise<void> => {
        if (statut === "actif" || statut === "chargement") return;

        setStatut("chargement");
        setErreur(null);

        try {
            const session      = await initialiserAudio();
            sessionRef.current = session;

            const detecterPitch = creerDetecteurPitch();

            arreterBoucleRef.current = demarrerBoucleAnalyse(
                session,
                detecterPitch,
                (freq) => setFrequenceHz(freq)
            );

            setStatut("actif");
        } catch (err) {
            const message = err instanceof Error
                ? err.message
                : "Impossible d'accéder au microphone.";
            setErreur(message);
            setStatut("erreur");
        }
    }, [statut]);

    /**
     * Arrête la capture microphone et libère toutes les ressources audio.
     *
     * Séquence :
     * 1. Annule la boucle requestAnimationFrame
     * 2. Arrête les pistes du MediaStream (éteint le voyant micro)
     * 3. Ferme l'AudioContext
     * 4. Réinitialise l'état React
     *
     * @returns Promesse résolue quand toutes les ressources sont libérées
     */
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

    // ── Retour ────────────────────────────────────────────────────────────────

    return { frequenceHz, statut, erreur, demarrer, arreter };
}