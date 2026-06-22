/**
 * @file useMidiPlayer.ts
 * @description Couche Controller (MVC) — Lecteur MIDI dans le navigateur via Tone.js.
 *
 * Responsabilité : parser le fichier .mid et orchestrer la Web Audio API pour la prévisualisation.
 *
 * Les objets Tone.js (PolySynth, Part) sont des instances complexes liées au contexte audio
 * du navigateur. Ils ne doivent pas déclencher de re-renders React. `useRef` permet de
 * les conserver de manière mutable tout au long du cycle de vie du composant.
 *
 * Nettoyage (Cleanup) :
 * L'utilisation du `useEffect` avec un return (fonction de nettoyage) garantit que le
 * Transport audio s'arrête et que la mémoire est libérée si l'utilisateur change de page
 * pendant la lecture.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

export function useMidiPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const synthsRef = useRef<Tone.PolySynth[]>([]);
    const partsRef = useRef<Tone.Part[]>([]);

    const stop = useCallback(() => {
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        Tone.Transport.position = 0;

        partsRef.current.forEach(part => part.dispose());
        partsRef.current = [];
        synthsRef.current.forEach(synth => synth.dispose());
        synthsRef.current = [];
        setIsPlaying(false);
    }, []);

    // Nettoyage au démontage du composant
    useEffect(() => {
        return () => stop();
    }, [stop]);

    const play = useCallback(async (fichierOuBlob: File | Blob) => {
        stop();
        await Tone.start();
        setIsPlaying(true);

        try {
            const arrayBuffer = await fichierOuBlob.arrayBuffer();
            const midi = new Midi(arrayBuffer);

            Tone.Transport.position = 0;

            midi.tracks.forEach(track => {
                const synth = new Tone.PolySynth(Tone.Synth, {
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
                }).toDestination();
                synth.volume.value = -12;
                synthsRef.current.push(synth);

                const notes = track.notes.map(n => ({
                    time: n.time,
                    note: n.name,
                    duration: n.duration,
                    velocity: n.velocity
                }));

                const part = new Tone.Part((time, value) => {
                    synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
                }, notes).start(0);

                partsRef.current.push(part);
            });


            Tone.Transport.start("+0.1");

            setTimeout(() => {
                setIsPlaying(false);
                stop();
            }, midi.duration * 1000 + 1000);

        } catch (error) {
            console.error("Erreur de lecture MIDI :", error);
            setIsPlaying(false);
        }
    }, [stop]);

    return { isPlaying, play, stop };
}