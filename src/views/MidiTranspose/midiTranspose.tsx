/**
 * @file midiTranspose.tsx
 * @description Couche View — Smart Component du Module 1
 */

import { useRef, useState } from "react";
import "./midiTranspose.css";
import { useMidiTranspose } from "../../controllers/useMidiTranspose.ts";
import { useMidiPlayer } from "../../controllers/useMidiPlayer.ts";
import BoutonRetour from "../PitchDetector/BoutonRetour.tsx";

const FORMATS_ACCEPTES = ".mid,.midi";

export default function MidiTranspose() {
    const {
        fichierOriginal, fichierTranspose, intervalle, statut, erreur,
        setIntervalle, selectionnerFichier, lancerTransposition, telecharger, reinitialiser
    } = useMidiTranspose();

    const playerOriginal = useMidiPlayer();
    const playerTranspose = useMidiPlayer();

    const inputFichierRef = useRef<HTMLInputElement>(null);
    const [estGlisse, setEstGlisse] = useState(false);

    const togglePlayOriginal = () => {
        if (playerTranspose.isPlaying) playerTranspose.stop();

        if (playerOriginal.isPlaying) {
            playerOriginal.stop();
        } else {
            playerOriginal.play(fichierOriginal!);
        }
    };

    const togglePlayTranspose = () => {
        if (playerOriginal.isPlaying) playerOriginal.stop();

        if (playerTranspose.isPlaying) {
            playerTranspose.stop();
        } else {
            playerTranspose.play(fichierTranspose!);
        }
    };

    const handleReinitialiser = () => {
        playerOriginal.stop();
        playerTranspose.stop();
        reinitialiser();
        if (inputFichierRef.current) {
            inputFichierRef.current.value = "";
        }
    };

    return (
        <div className="midi-transpose">
            <BoutonRetour />

            <header className="midi-transpose__header">
                <div className="badge">Module 1</div>
                <h1 className="titre">Transposition MIDI</h1>
                <p className="sous-titre">Ajustez la tonalité de vos fichiers en un clic</p>
            </header>

            {/* ── Zone de dépôt ── */}
            <div
                className={`midi-transpose__dropzone ${fichierOriginal ? "dropzone--fichier" : ""} ${estGlisse ? "dropzone--glisse" : ""}`}
                onDrop={(e) => { e.preventDefault(); setEstGlisse(false); const f = e.dataTransfer.files[0]; if (f) selectionnerFichier(f); }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setEstGlisse(true); }}
                onDragLeave={(e) => { e.preventDefault(); setEstGlisse(false); }}
                onClick={() => inputFichierRef.current?.click()}
            >
                <input
                    ref={inputFichierRef} type="file" accept={FORMATS_ACCEPTES}
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) selectionnerFichier(f); }}
                />
                {fichierOriginal ? (
                    <div className="dropzone__fichier" style={{ pointerEvents: "none", textAlign: "center" }}>
                        <span style={{ fontSize: "2rem", color: "#C8102E" }}>🎹</span>
                        <span style={{ fontWeight: 700, fontFamily: "'Courier New', monospace" }}>{fichierOriginal.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "#a0a0a0" }}>{(fichierOriginal.size / 1024).toFixed(1)} Ko</span>
                    </div>
                ) : (
                    <div className="dropzone__invite" style={{ pointerEvents: "none", textAlign: "center", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <span style={{ fontSize: "2rem", color: "#a0a0a0" }}>↑</span>
                        <span style={{ color: "#a0a0a0", fontFamily: "'Courier New', monospace" }}>Glissez un fichier MIDI ou cliquez</span>
                    </div>
                )}
            </div>

            {erreur && (
                <div className="midi-transpose__erreur">
                    <span>⚠</span> <span>{erreur}</span>
                </div>
            )}

            {/* ── Panneau de contrôle et d'actions ── */}
            {fichierOriginal && (
                <div className="midi-transpose__panel">

                    {/* Sélecteur d'intervalle */}
                    <div>
                        <h3 className="panel__section-titre">Intervalle (demi-tons)</h3>
                        <div className="slider-wrapper">
                            <span className="slider-valeur">{intervalle > 0 ? `+${intervalle}` : intervalle}</span>
                            <input
                                type="range" className="slider-input"
                                min="-24" max="24" step="1"
                                value={intervalle}
                                onChange={(e) => setIntervalle(Number(e.target.value))}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.65rem', color: '#a0a0a0' }}>
                                <span>-24 (2 oct. bas)</span>
                                <span>+24 (2 oct. haut)</span>
                            </div>
                        </div>
                    </div>

                    <div className="midi-transpose__actions">
                        {/* Prévisualisation Originale */}
                        <button
                            className={`btn-preview ${playerOriginal.isPlaying ? "btn-preview--stop" : ""}`}
                            onClick={togglePlayOriginal}
                        >
                            {playerOriginal.isPlaying ? "■ Arrêter la lecture" : "▶ Écouter l'original"}
                        </button>

                        {/* Action API */}
                        <button
                            className="btn-principal"
                            onClick={lancerTransposition}
                            disabled={statut === "chargement"}
                        >
                            {statut === "chargement" ? "Transposition en cours..." : "Transposer le fichier"}
                        </button>

                        {/* Résultats */}
                        {fichierTranspose && statut === "succes" && (
                            <>
                                <button
                                    className={`btn-preview ${playerTranspose.isPlaying ? "btn-preview--stop" : ""}`}
                                    onClick={togglePlayTranspose}
                                >
                                    {playerTranspose.isPlaying ? "■ Arrêter la lecture" : "▶ Écouter le résultat"}
                                </button>
                                <button className="btn-secondaire" onClick={telecharger}>
                                    ↓ Télécharger (.mid)
                                </button>
                            </>
                        )}
                        <button
                            className="btn-secondaire"
                            style={{ borderColor: '#2a2a2a', marginTop: '1rem' }}
                            onClick={handleReinitialiser}
                        >
                            ↺ Réinitialiser
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
}