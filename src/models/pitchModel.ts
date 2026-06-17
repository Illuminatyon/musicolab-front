/**
 * @file pitchModel.ts
 * @description Couche Model (MVC) — Pipeline Web Audio API.
 *
 * Ce fichier encapsule toutes les interactions avec la Web Audio API du navigateur :
 * - Accès au microphone via getUserMedia
 * - Création et gestion du contexte audio
 * - Détection de pitch par l'algorithme YIN (via PitchFinder)
 * - Lecture d'une note de référence via oscillateur
 *
 * Algorithme YIN (de Cheveigné & Kawahara, 2002) :
 * Basé sur la fonction de différence normalisée du signal audio.
 * Plus robuste que la FFT naïve pour la voix car il travaille dans le domaine
 * temporel et ne confond pas la fondamentale avec ses harmoniques.
 *
 * Aucune dépendance React — ce fichier peut être testé indépendamment.
 */

import * as Pitchfinder from "pitchfinder";

// ─── Constantes audio ─────────────────────────────────────────────────────────

/**
 * Taille du buffer d'analyse en échantillons.
 * 2048 samples à 44 100 Hz ≈ 46 ms de latence — bon compromis précision/réactivité.
 */
const BUFFER_SIZE = 2048;

/**
 * Fréquence d'échantillonnage cible en Hz.
 * 44 100 Hz est la norme CD audio, supportée universellement.
 */
const SAMPLE_RATE = 44_100;

/**
 * Fréquence minimale détectable en Hz.
 * 80 Hz correspond à la voix de basse la plus grave.
 * En dessous, on considère que c'est du bruit ou un artefact.
 */
const FREQ_MIN = 80;

/**
 * Fréquence maximale détectable en Hz.
 * 1 050 Hz correspond à la voix de soprano la plus aiguë.
 * Au-dessus, on considère que c'est du sifflement ou du bruit.
 */
const FREQ_MAX = 1_050;

// ─── Interfaces et types ──────────────────────────────────────────────────────

/**
 * Contient toutes les ressources Web Audio API d'une session active.
 * Doit être conservé en mémoire pour pouvoir les libérer correctement.
 */
export interface SessionAudio {
    /** Contexte audio principal — point d'entrée de la Web Audio API */
    contexte: AudioContext;
    /** Nœud source branché sur le flux microphone */
    source: MediaStreamAudioSourceNode;
    /** Nœud d'analyse pour extraire les données PCM brutes */
    analyser: AnalyserNode;
    /** Flux microphone brut — nécessaire pour arrêter les pistes et éteindre le voyant */
    stream: MediaStream;
}

/**
 * Fonction de callback appelée à chaque frame d'analyse (~60 fps).
 *
 * @param frequenceHz - Fréquence détectée en Hz, ou null si silence/hors plage
 */
export type CallbackPitch = (frequenceHz: number | null) => void;

// ─── Initialisation du pipeline audio ────────────────────────────────────────

/**
 * Demande l'accès au microphone et initialise le pipeline Web Audio API.
 *
 * Pipeline créé : Microphone → MediaStream → MediaStreamSource → AnalyserNode
 *
 * Note : le nœud AnalyserNode n'est PAS connecté à la destination audio
 * (haut-parleurs) pour éviter l'effet Larsen (feedback microphone).
 *
 * Les traitements automatiques du navigateur (echo cancellation, noise suppression,
 * auto gain control) sont désactivés pour obtenir le signal vocal brut,
 * indispensable à une détection de pitch fiable.
 *
 * @returns Promesse résolue avec la SessionAudio initialisée
 * @throws {Error} Si getUserMedia n'est pas supporté par le navigateur
 * @throws {DOMException} Si l'utilisateur refuse l'accès au microphone
 *
 * @example
 * const session = await initialiserAudio();
 * // session.analyser est prêt à recevoir des données
 */
export async function initialiserAudio(): Promise<SessionAudio> {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'accès au microphone.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,  // signal brut pour le pitch
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: SAMPLE_RATE,
        },
    });

    const contexte = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source   = contexte.createMediaStreamSource(stream);
    const analyser = contexte.createAnalyser();
    analyser.fftSize = BUFFER_SIZE;

    // Connexion : source → analyser (sans connecter à destination)
    source.connect(analyser);

    return { contexte, source, analyser, stream };
}

// ─── Détection de pitch ───────────────────────────────────────────────────────

/**
 * Crée et retourne un détecteur de pitch configuré avec l'algorithme YIN.
 *
 * YIN est recommandé pour la voix humaine car il :
 * - Travaille dans le domaine temporel (résistant aux harmoniques)
 * - Offre un bon équilibre précision / vitesse de calcul
 * - Est adapté à la plage vocale humaine (80–1 050 Hz)
 *
 * Le seuil de probabilité (0.15) filtre les détections peu fiables —
 * PitchFinder retourne null si la probabilité de justesse < 15%.
 *
 * @returns Fonction de détection prête à l'emploi (Float32Array → Hz | null)
 */
export function creerDetecteurPitch(): (buffer: Float32Array<ArrayBuffer>) => number | null {
    return Pitchfinder.YIN({
        sampleRate: SAMPLE_RATE,
        probabilityThreshold: 0.15,
    });
}

/**
 * Lit un buffer PCM depuis le nœud d'analyse et détecte la fréquence fondamentale.
 *
 * Filtre les résultats hors de la plage vocale (80–1 050 Hz) pour éviter
 * les fausses détections dues au bruit ambiant ou aux harmoniques.
 *
 * @param analyser - Nœud d'analyse Web Audio API actif
 * @param detecterPitch - Fonction YIN créée par creerDetecteurPitch()
 * @returns Fréquence fondamentale en Hz si dans la plage vocale, sinon null
 */
export function lirePitch(
    analyser: AnalyserNode,
    detecterPitch: (buffer: Float32Array<ArrayBuffer>) => number | null
): number | null {
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    const frequence = detecterPitch(buffer);

    if (frequence === null || frequence < FREQ_MIN || frequence > FREQ_MAX) {
        return null;
    }
    return frequence;
}

/**
 * Lance une boucle d'analyse audio en temps réel via requestAnimationFrame.
 *
 * La boucle appelle lirePitch à chaque frame (~60 fps) et transmet le résultat
 * au callback. requestAnimationFrame est préféré à setInterval car il se synchronise
 * avec le taux de rafraîchissement de l'écran et se met en pause si l'onglet
 * est inactif (économie de ressources).
 *
 * @param session - Session audio active contenant l'AnalyserNode
 * @param detecterPitch - Détecteur YIN créé par creerDetecteurPitch()
 * @param callback - Fonction appelée à chaque frame avec la fréquence détectée
 * @returns Fonction d'arrêt — appeler pour stopper la boucle proprement
 *
 * @example
 * const arreter = demarrerBoucleAnalyse(session, detecteur, (freq) => {
 *   console.log(freq); // Hz ou null
 * });
 * // Plus tard :
 * arreter(); // stoppe la boucle
 */
export function demarrerBoucleAnalyse(
    session: SessionAudio,
    detecterPitch: (buffer: Float32Array<ArrayBuffer>) => number | null,
    callback: CallbackPitch
): () => void {
    let idAnimation: number;
    let actif = true;

    const boucle = (): void => {
        if (!actif) return;
        callback(lirePitch(session.analyser, detecterPitch));
        idAnimation = requestAnimationFrame(boucle);
    };

    idAnimation = requestAnimationFrame(boucle);

    return () => {
        actif = false;
        cancelAnimationFrame(idAnimation);
    };
}

/**
 * Libère proprement toutes les ressources audio d'une session.
 *
 * Doit être appelée lorsque l'utilisateur quitte le module ou arrête la session.
 * Ne pas appeler cette fonction entraîne :
 * - Une fuite de ressources système (AudioContext non fermé)
 * - Le voyant microphone qui reste allumé dans le navigateur
 *
 * @param session - Session audio à fermer
 * @returns Promesse résolue quand le contexte audio est fermé
 */
export async function libererAudio(session: SessionAudio): Promise<void> {
    session.stream.getTracks().forEach((track) => track.stop()); // éteint le voyant micro
    session.source.disconnect();
    await session.contexte.close();
}

// ─── Lecture de note de référence ────────────────────────────────────────────

/**
 * Joue une note de référence via un oscillateur sinusoïdal.
 *
 * Permet à l'utilisateur d'entendre la note cible avant de la chanter.
 * Utilise une onde sinusoïdale (son pur, sans harmoniques) pour une
 * référence de hauteur claire et non ambiguë.
 *
 * Le fondu exponentiel en sortie (gain → 0.001) évite le "clic" audible
 * qui se produirait avec une coupure brutale du son.
 *
 * @param frequenceHz - Fréquence de la note à jouer en Hz
 * @param dureeSecondes - Durée de la note (défaut : 1 seconde)
 *
 * @example
 * jouerNote(440)     // joue La4 pendant 1 seconde
 * jouerNote(261.63, 2) // joue Do4 pendant 2 secondes
 */
export function jouerNote(frequenceHz: number, dureeSecondes = 1): void {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(frequenceHz, ctx.currentTime);

    // Fondu exponentiel pour éviter le clic à l'arrêt
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dureeSecondes);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dureeSecondes);

    // Libérer le contexte audio dès que la lecture est terminée
    osc.onended = () => ctx.close();
}