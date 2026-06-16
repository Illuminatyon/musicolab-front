/**
 * AudioVisualizer.tsx — couche View, Smart Component (MVC)
 * Module 4 : chargement d'un fichier audio, affichage des métadonnées,
 * waveform et spectre fréquentiel sur canvas.
 * Notions du cours : useRef (S4), useEffect (S4), Custom Hook (S5)
 */

import { useRef, useEffect, useState } from "react";
import "./audioVisualizer.css";
import { useAudioAnalyse } from "../../controllers/useAudioAnalyse";
import { dessinerWaveform, dessinerSpectre } from "../../models/audioModel";

const FORMATS_ACCEPTES = ".wav,.mp3,.ogg";

export default function AudioVisualizer() {
    const {
        fichier, analyse, statut, erreur,
        selectionnerFichier, lancer, reinitialiser,
    } = useAudioAnalyse();

    const canvasWaveformRef = useRef<HTMLCanvasElement>(null);
    const canvasSpectreRef = useRef<HTMLCanvasElement>(null);
    const inputFichierRef = useRef<HTMLInputElement>(null);
    const [estGlisse, setEstGlisse] = useState(false);

    // Dessiner les canvas dès que l'analyse arrive
    useEffect(() => {
        if (!analyse) return;
        if (canvasWaveformRef.current) {
            dessinerWaveform(canvasWaveformRef.current, analyse.waveform);
        }
        if (canvasSpectreRef.current) {
            dessinerSpectre(canvasSpectreRef.current, analyse.freqs, analyse.spectrum);
        }
    }, [analyse]);

    const classeDropzone = [
        "audio-visualizer__dropzone",
        fichier ? "dropzone--fichier" : "",
        estGlisse ? "dropzone--glisse" : "",
    ].filter(Boolean).join(" ");

    return (
        <div className="audio-visualizer">

            <header className="audio-visualizer__header">
                <div className="badge">Module 4</div>
                <h1 className="titre">Visualisation Audio</h1>
                <p className="sous-titre">Analysez la forme d'onde et le spectre de votre fichier</p>
            </header>

            {/* ── Zone de dépôt ── */}
            <div
                className={classeDropzone}
                onDrop={(e) => {
                    e.preventDefault();
                    setEstGlisse(false);
                    const f = e.dataTransfer.files[0];
                    if (f) selectionnerFichier(f);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setEstGlisse(true); }}
                onDragLeave={(e) => { e.preventDefault(); setEstGlisse(false); }}
                onClick={() => inputFichierRef.current?.click()}
            >
                <input
                    ref={inputFichierRef}
                    type="file"
                    accept={FORMATS_ACCEPTES}
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) selectionnerFichier(f);
                    }}
                    className="dropzone__input"
                    aria-label="Sélectionner un fichier audio"
                />
                {fichier ? (
                    <div className="dropzone__fichier">
                        <span className="dropzone__icone">♪</span>
                        <span className="dropzone__nom">{fichier.name}</span>
                        <span className="dropzone__taille">
                            {(fichier.size / 1024).toFixed(1)} Ko
                        </span>
                    </div>
                ) : (
                    <div className="dropzone__invite">
                        <span className="dropzone__icone">↑</span>
                        <span className="dropzone__texte">
                            {estGlisse ? "Relâchez le fichier" : "Glissez un fichier ou cliquez"}
                        </span>
                        <span className="dropzone__formats">.wav · .mp3 · .ogg</span>
                    </div>
                )}
            </div>

            {/* ── Erreur ── */}
            {erreur && (
                <div className="audio-visualizer__erreur">
                    <span>⚠</span>
                    <span>{erreur}</span>
                </div>
            )}

            {/* ── Actions ── */}
            <div className="audio-visualizer__actions">
                <button
                    className="audio-visualizer__btn-principal"
                    onClick={lancer}
                    disabled={!fichier || statut === "chargement"}
                    type="button"
                >
                    {statut === "chargement" ? "Analyse en cours…" : "Analyser le fichier"}
                </button>
                {(fichier !== null || analyse !== null) && (
                    <button
                        className="audio-visualizer__btn-secondaire"
                        onClick={reinitialiser}
                        type="button"
                    >
                        Réinitialiser
                    </button>
                )}
            </div>

            {/* ── Résultats ── */}
            {analyse && (
                <div className="audio-visualizer__resultats">

                    {/* Métadonnées */}
                    <div className="meta">
                        <div className="meta__item">
                            <span className="meta__label">Durée</span>
                            <span className="meta__valeur">{analyse.duration.toFixed(2)} s</span>
                        </div>
                        <div className="meta__item">
                            <span className="meta__label">Sample rate</span>
                            <span className="meta__valeur">
                                {analyse.sample_rate.toLocaleString("fr-FR")} Hz
                            </span>
                        </div>
                        <div className="meta__item">
                            <span className="meta__label">Canaux</span>
                            <span className="meta__valeur">
                                {analyse.channels === 1
                                    ? "Mono"
                                    : analyse.channels === 2
                                    ? "Stéréo"
                                    : String(analyse.channels)}
                            </span>
                        </div>
                    </div>

                    {/* Waveform */}
                    <div className="canvas-section">
                        <h2 className="canvas-section__titre">Forme d'onde</h2>
                        <canvas
                            ref={canvasWaveformRef}
                            className="canvas-section__canvas"
                            width={800}
                            height={160}
                            aria-label="Forme d'onde du fichier audio"
                        />
                    </div>

                    {/* Spectre */}
                    <div className="canvas-section">
                        <h2 className="canvas-section__titre">Spectre fréquentiel moyen</h2>
                        <canvas
                            ref={canvasSpectreRef}
                            className="canvas-section__canvas"
                            width={800}
                            height={180}
                            aria-label="Spectre fréquentiel moyen du fichier audio"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
