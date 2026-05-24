/**
 * pitchModel.ts — couche Model (MVC)
 * Pipeline Web Audio API : accès micro, détection pitch YIN, lecture note.
 * Aucune dépendance React.
 */

import * as Pitchfinder from "pitchfinder";

const BUFFER_SIZE = 2048;
const SAMPLE_RATE = 44_100;
const FREQ_MIN = 80;
const FREQ_MAX = 1_050;

export interface SessionAudio {
    contexte: AudioContext;
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    stream: MediaStream;
}

export type CallbackPitch = (frequenceHz: number | null) => void;

export async function initialiserAudio(): Promise<SessionAudio> {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Votre navigateur ne supporte pas l'accès au microphone.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: SAMPLE_RATE,
        },
    });
    const contexte = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = contexte.createMediaStreamSource(stream);
    const analyser = contexte.createAnalyser();
    analyser.fftSize = BUFFER_SIZE;
    source.connect(analyser);
    return { contexte, source, analyser, stream };
}

export function creerDetecteurPitch(): (buffer: Float32Array) => number | null {
    return Pitchfinder.YIN({ sampleRate: SAMPLE_RATE, probabilityThreshold: 0.15 });
}

export function lirePitch(
    analyser: AnalyserNode,
    detecterPitch: (buffer: Float32Array) => number | null
): number | null {
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const frequence = detecterPitch(buffer);
    if (frequence === null || frequence < FREQ_MIN || frequence > FREQ_MAX) return null;
    return frequence;
}

export function demarrerBoucleAnalyse(
    session: SessionAudio,
    detecterPitch: (buffer: Float32Array) => number | null,
    callback: CallbackPitch
): () => void {
    let idAnimation: number;
    let actif = true;
    const analyser = (): void => {
        if (!actif) return;
        callback(lirePitch(session.analyser, detecterPitch));
        idAnimation = requestAnimationFrame(analyser);
    };
    idAnimation = requestAnimationFrame(analyser);
    return () => { actif = false; cancelAnimationFrame(idAnimation); };
}

export async function libererAudio(session: SessionAudio): Promise<void> {
    session.stream.getTracks().forEach((t) => t.stop());
    session.source.disconnect();
    await session.contexte.close();
}

/**
 * Joue une note de référence via un oscillateur (onde sinusoïdale).
 * Permet à l'utilisateur d'entendre la note avant de la chanter.
 */
export function jouerNote(frequenceHz: number, dureeSecondes = 1): void {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(frequenceHz, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dureeSecondes);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dureeSecondes);
    osc.onended = () => ctx.close();
}