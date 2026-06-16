/**
 * Home.tsx — Page d'accueil MusicoLab.
 * Layout horizontal : hero à gauche, modules à droite.
 */

import { useNavigate } from "react-router-dom";
import "./Home.css";

interface ModuleConfig {
    numero: number;
    titre: string;
    description: string;
    route: string | null;
    emoji: string;
}

const MODULES: ModuleConfig[] = [
    {
        numero: 1,
        titre: "Transposition MIDI",
        description: "Chargez un fichier MIDI, choisissez un intervalle en demi-tons et téléchargez le fichier transposé.",
        route: null,
        emoji: "🎹",
    },
    {
        numero: 2,
        titre: "Rhythm Circle",
        description: "Composez des rythmes sur 3 pistes simultanées avec un cercle interactif et un tempo réglable en BPM.",
        route: null,
        emoji: "🥁",
    },
    {
        numero: 3,
        titre: "Justesse Vocale",
        description: "Évaluez votre justesse vocale en temps réel via le microphone avec un retour directionnel immédiat.",
        route: "/module/3",
        emoji: "🎤",
    },
    {
        numero: 4,
        titre: "Visualisation Audio",
        description: "Chargez un fichier audio et visualisez sa forme d'onde, son spectre fréquentiel et ses métadonnées.",
        route: null,
        emoji: "🎵",
    },
];

export default function Home() {
    const navigate = useNavigate();

    return (
        <div className="home">

            {/* ── Colonne gauche — Hero ── */}
            <aside className="home__hero">
                <div className="home__hero-inner">
                    <span className="home__badge">SAE S4 — BUT Informatique</span>

                    <h1 className="home__titre">
                        Musico<span className="home__rouge">Lab</span>
                    </h1>

                    <p className="home__desc">
                        Application web d'aide aux musiciens et chanteurs —
                        justesse vocale, rythme, transposition et visualisation audio.
                    </p>

                    <div className="home__tags">
                        {["React", "TypeScript", "Flask", "Web Audio API"].map((t) => (
                            <span key={t} className="home__tag">{t}</span>
                        ))}
                    </div>

                    <div className="home__iut">
                        <span>IUT de Montreuil</span>
                        <span className="home__sep">·</span>
                        <span>Université Paris 8</span>
                        <span className="home__sep">·</span>
                        <span>2025–2026</span>
                    </div>
                </div>
            </aside>

            {/* ── Colonne droite — Modules ── */}
            <main className="home__modules">
                <p className="home__modules-titre">Choisissez un module</p>

                <div className="home__grille">
                    {MODULES.map((module) => (
                        <article
                            key={module.numero}
                            className={`card ${module.route ? "card--actif" : "card--indispo"}`}
                            onClick={() => module.route && navigate(module.route)}
                            role={module.route ? "button" : undefined}
                            tabIndex={module.route ? 0 : undefined}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && module.route) navigate(module.route);
                            }}
                        >
                            <div className="card__header">
                                <span className="card__numero">Module {module.numero}</span>
                                <span className={`card__dot ${module.route ? "dot--vert" : "dot--gris"}`} />
                            </div>

                            <span className="card__emoji">{module.emoji}</span>
                            <h2 className="card__titre">{module.titre}</h2>
                            <p className="card__desc">{module.description}</p>

                            <div className="card__footer">
                                <span className={module.route ? "card__statut--dispo" : "card__statut--indispo"}>
                                    {module.route ? "Disponible" : "Bientôt disponible"}
                                </span>
                                {module.route && <span className="card__fleche">→</span>}
                            </div>
                        </article>
                    ))}
                </div>
            </main>

        </div>
    );
}