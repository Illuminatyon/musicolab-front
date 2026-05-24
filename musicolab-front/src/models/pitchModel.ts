/**
 * pitchModel.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Modèle de capture audio — couche Model du pattern MVC.
 *
 * Responsabilités :
 *  - Demander l'accès au microphone de l'utilisateur
 *  - Initialiser le pipeline Web Audio API (contexte → source → analyser)
 *  - Extraire des échantillons audio sous forme de Float32Array
 *  - Appliquer l'algorithme YIN de PitchFinder pour détecter la fréquence
 *  - Libérer proprement les ressources audio
 *
 * Algorithme choisi : YIN
 *  Meilleur compromis précision/vitesse selon la documentation PitchFinder.
 *  Adapté à la voix humaine (80 Hz – 1 000 Hz).
 *  Inconvénient connu : peut produire des valeurs aberrantes ponctuelles,
 *  atténuées ici par un seuil de fréquence minimum/maximum.
 *
 * Ce fichier ne contient aucune logique React (pas de hooks, pas de JSX).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as Pitchfinder from "pitchfinder";

// ─── Constantes audio ────────────────────────────────────────────────────────

/**
 * Taille du buffer d'analyse audio en échantillons.
 * 2048 échantillons à 44 100 Hz = ~46 ms de son analysé par frame.
 * Valeur standard : bon équilibre latence / précision de détection.
 */
const BUFFER_SIZE = 2048;

/**
 * Fréquence d'échantillonnage cible.
 * 44 100 Hz est la norme CD audio, supportée par tous les navigateurs modernes.
 */
const SAMPLE_RATE = 44_100;

/**
 * Fréquence minimale détectable (Hz).
 * La voix humaine grave commence autour de 80 Hz (basse profonde).
 * En dessous, on considère qu'il s'agit de bruit.
 */
const FREQ_MIN = 80;

/**
 * Fréquence maximale détectable (Hz).
 * La voix humaine aiguë plafonne autour de 1 050 Hz (soprano).
 * Au-dessus, on considère qu'il s'agit de bruit ou de sifflement.
 */
const FREQ_MAX = 1_050;

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Contient toutes les ressources Web Audio API actives.
 * Doit être conservé en mémoire pour pouvoir les libérer proprement.
 */
export interface SessionAudio {
    /** Contexte audio principal — point d'entrée de la Web Audio API */
    contexte: AudioContext;
    /** Source audio branchée sur le flux microphone */
    source: MediaStreamAudioSourceNode;
    /** Nœud d'analyse permettant d'extraire les données PCM */
    analyser: AnalyserNode;
    /** Flux microphone brut — nécessaire pour arrêter les pistes */
    stream: MediaStream;
}

/**
 * Callback appelé à chaque frame d'analyse avec la fréquence détectée.
 * @param frequenceHz - Fréquence en Hz, ou null si aucun pitch détecté
 */
export type CallbackPitch = (frequenceHz: number | null) => void;

// ─── Initialisation du pipeline audio ────────────────────────────────────────

/**
 * Demande l'accès au microphone et initialise le pipeline Web Audio API.
 *
 * Pipeline créé :
 *   Microphone → MediaStream → MediaStreamAudioSourceNode → AnalyserNode
 *
 * @returns SessionAudio contenant toutes les ressources initialisées
 * @throws Error si l'utilisateur refuse l'accès au microphone
 * @throws Error si le navigateur ne supporte pas la Web Audio API
 */
export async function initialiserAudio(): Promise<SessionAudio> {
    // Vérification de compatibilité navigateur
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
            "Votre navigateur ne supporte pas l'accès au microphone (getUserMedia)."
        );
    }

    // Demande d'accès au microphone — déclenche la popup de permission
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            // Désactiver les traitements automatiques du navigateur
            // pour obtenir le signal brut, plus adapté à la détection de pitch
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: SAMPLE_RATE,
        },
    });

    // Création du contexte audio — moteur de traitement du signal
    const contexte = new AudioContext({ sampleRate: SAMPLE_RATE });

    // Création de la source à partir du flux microphone
    const source = contexte.createMediaStreamSource(stream);

    // Création du nœud d'analyse — permet de lire les données PCM brutes
    const analyser = contexte.createAnalyser();
    analyser.fftSize = BUFFER_SIZE;

    // Connexion du pipeline : source → analyser
    // Note : on ne connecte PAS à la destination (haut-parleurs)
    // pour éviter un effet Larsen (feedback microphone)
    source.connect(analyser);

    return { contexte, source, analyser, stream };
}

// ─── Détection de pitch ───────────────────────────────────────────────────────

/**
 * Crée un détecteur de pitch configuré avec l'algorithme YIN.
 *
 * YIN (Yet another pitch detection Algorithm) — Cheveigé & Klapuri, 2002.
 * Basé sur la fonction de différence normalisée du signal audio.
 *
 * @returns Fonction de détection prête à l'emploi
 */
export function creerDetecteurPitch(): (buffer: Float32Array) => number | null {
    return Pitchfinder.YIN({
        sampleRate: SAMPLE_RATE,
        // Seuil de probabilité : ignorer les détections peu fiables.
        // 0.15 = rejeter si la probabilité de justesse est < 15%.
        probabilityThreshold: 0.15,
    });
}

/**
 * Lit un buffer PCM depuis le nœud d'analyse et détecte la fréquence.
 *
 * Cette fonction est conçue pour être appelée en boucle via requestAnimationFrame.
 *
 * @param analyser - Nœud d'analyse Web Audio API actif
 * @param detecterPitch - Fonction YIN créée par creerDetecteurPitch()
 * @returns Fréquence en Hz si détectée dans la plage vocale, sinon null
 */
export function lirePitch(
    analyser: AnalyserNode,
    detecterPitch: (buffer: Float32Array) => number | null
): number | null {
    // Buffer pour stocker les données PCM brutes
    const buffer = new Float32Array(analyser.fftSize);

    // Remplir le buffer avec les données audio actuelles
    analyser.getFloatTimeDomainData(buffer);

    // Appliquer l'algorithme YIN
    const frequence = detecterPitch(buffer);

    // Filtrer les valeurs hors plage vocale humaine
    if (frequence === null) return null;
    if (frequence < FREQ_MIN || frequence > FREQ_MAX) return null;

    return frequence;
}

// ─── Boucle d'analyse en temps réel ─────────────────────────────────────────

/**
 * Lance une boucle d'analyse audio en temps réel via requestAnimationFrame.
 *
 * À chaque frame (~60 fois par seconde), le signal microphone est analysé
 * et la fréquence détectée est transmise au callback.
 *
 * @param session - Session audio active
 * @param detecterPitch - Détecteur YIN créé par creerDetecteurPitch()
 * @param callback - Fonction appelée à chaque frame avec la fréquence détectée
 * @returns Fonction d'arrêt — appeler pour stopper la boucle proprement
 */
export function demarrerBoucleAnalyse(
    session: SessionAudio,
    detecterPitch: (buffer: Float32Array) => number | null,
    callback: CallbackPitch
): () => void {
    let idAnimation: number;
    let actif = true;

    const analyser = (): void => {
        if (!actif) return;

        const frequence = lirePitch(session.analyser, detecterPitch);
        callback(frequence);

        // Planifier la prochaine analyse à la prochaine frame
        idAnimation = requestAnimationFrame(analyser);
    };

    // Lancer la première frame
    idAnimation = requestAnimationFrame(analyser);

    // Retourner la fonction d'arrêt
    return () => {
        actif = false;
        cancelAnimationFrame(idAnimation);
    };
}

// ─── Libération des ressources ────────────────────────────────────────────────

/**
 * Libère proprement toutes les ressources audio d'une session.
 *
 * Doit être appelé lorsque l'utilisateur quitte le module ou arrête la session.
 * Ne pas appeler cette fonction entraîne une fuite de ressources système
 * et laisse le voyant microphone allumé dans le navigateur.
 *
 * @param session - Session audio à fermer
 */
export async function libererAudio(session: SessionAudio): Promise<void> {
    // Arrêter toutes les pistes du flux microphone (éteint le voyant micro)
    session.stream.getTracks().forEach((track) => track.stop());

    // Déconnecter le nœud source du pipeline audio
    session.source.disconnect();

    // Fermer le contexte audio et libérer les ressources système
    await session.contexte.close();
}