<div align="center">

```
███╗   ███╗██╗   ██╗███████╗██╗ ██████╗ ██████╗ ██╗      █████╗ ██████╗
████╗ ████║██║   ██║██╔════╝██║██╔════╝██╔═══██╗██║     ██╔══██╗██╔══██╗
██╔████╔██║██║   ██║███████╗██║██║     ██║   ██║██║     ███████║██████╔╝
██║╚██╔╝██║██║   ██║╚════██║██║██║     ██║   ██║██║     ██╔══██║██╔══██╗
██║ ╚═╝ ██║╚██████╔╝███████║██║╚██████╗╚██████╔╝███████╗██║  ██║██████╔╝
╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝
```

**Application web d'aide aux musiciens et chanteurs**

*SAE S4 — BUT Informatique 2025–2026 — IUT de Montreuil, Université Paris 8*

---

[![CI](https://github.com/Illuminatyon/musicolab-front/actions/workflows/ci.yml/badge.svg)](https://github.com/Illuminatyon/musicolab-front/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![ESLint](https://img.shields.io/badge/ESLint-0%20erreurs-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/)
[![License](https://img.shields.io/badge/Licence-Éducatif-C8102E)](./LICENSE)

---

[🎹 Module 1](#-module-1--transposition-midi) •
[🥁 Module 2](#-module-2--cercle-de-rythme) •
[🎤 Module 3](#-module-3--évaluation-de-la-justesse-vocale) •
[🎵 Module 4](#-module-4--analyse-fréquentielle) •
[🚀 Lancement](#-lancement)

</div>

---

## 🎯 Vue d'ensemble

MusicoLab est une **application React multi-modules** dédiée à l'apprentissage musical. Chaque module est développé de façon indépendante selon un patron **MVC strict**, avec des modèles purement fonctionnels (zéro dépendance React), des controllers sous forme de hooks, et des vues présentationnelles.

```
┌─────────────────────────────────────────────────────────────┐
│                       MusicoLab                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Module 1 │  │ Module 2 │  │ Module 3 │  │ Module 4 │   │
│  │  🎹 MIDI │  │ 🥁 Rythme│  │🎤 Voix   │  │🎵 Spectre│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           React Router v7 — App.tsx                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Backend Flask (API REST)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎹 Module 1 — Transposition MIDI

> Développé par **Teddy ASOUSSEAU**

Importez un fichier MIDI, choisissez un intervalle de transposition en demi-tons et téléchargez immédiatement le fichier transposé.

**Fonctionnalités :**
- Import de fichier `.mid` / `.midi`
- Transposition par demi-tons (positif ou négatif)
- Export du fichier transposé

---

## 🥁 Module 2 — Cercle de rythme interactif

> Développé par **Esteban PEREIRA**

Séquenceur rythmique polyrhythmique à 3 pistes. Chaque piste est représentée par un anneau SVG cliquable. Les 3 anneaux tournent simultanément avec des divisions différentes, produisant des polyrhythmes. Le son est synthétisé en temps réel — aucun fichier audio.

**Fonctionnalités :**
- 🔵 **3 anneaux SVG** cliquables, segment par segment
- 🎛️ **Polyrhythme** — 4 / 6 / 8 / 12 / 16 pas configurables par piste
- 🎧 **Synthèse audio** — kick, tom, hi-hat via Web Audio API (sans fichier audio)
- ⏱️ **Scheduler à lookahead** — battements planifiés 100 ms à l'avance, zéro drift
- ⏯️ **Transport complet** — play / pause propre / stop / BPM 40–220
- 💫 **Animation ~60 fps** synchronisée avec l'horloge audio

---

## 🎤 Module 3 — Évaluation de la justesse vocale

> Développé par **Fabio GUERREIRO MARQUES** & **Marvin JEAN-FORT**

Détection de pitch en temps réel via microphone. L'utilisateur choisit des notes cibles, chante, et reçoit un retour immédiat sur sa justesse. La note est validée après **3 secondes de stabilisation** dans la zone juste (±25¢).

**Fonctionnalités :**

| Catégorie | Détail |
|---|---|
| 🎛️ **Session configurable** | Nombre de notes libre (1–50), octave 2–6, sélection par note |
| 🎹 **Piano interactif** | Clavier visuel — note cible surlignée, chaque touche jouable |
| ♯♭ **Notation dièse / bémol** | Toggle pour basculer La# ↔ Si♭ sur toute l'interface |
| 📚 **Info tempérament** | Panneau éducatif : tempérament égal vs intonation juste |
| 🎧 **Écoute de référence** | Bouton ▶ — oscillateur sinusoïdal à la fréquence exacte |
| 📊 **Feedback temps réel** | Jauge −50¢ à +50¢, indicateur directionnel coloré, compte à rebours |
| 🔵 **Anneau SVG** | Progression des 3s de stabilisation animée |
| ✅ **Validation** | Overlay animé + skip possible |
| 📋 **Bilan de session** | Score %, détail note par note, appréciation qualitative |
| 📱 **Responsive** | Desktop et mobile |

<details>
<summary>🧮 Algorithme YIN — Détection de pitch</summary>

L'algorithme **YIN** (de Cheveigné & Kawahara, 2002) opère dans le domaine temporel via la **fonction de différence normalisée**, plus robuste aux harmoniques que la FFT naïve — particulièrement adapté à la voix humaine.

```
Fréquence d'échantillonnage : 44 100 Hz
Taille du buffer            : 2 048 samples (~46 ms de latence)
Plage vocale détectée       : 80 Hz – 1 050 Hz
Tolérance de justesse       : ±25 cents
Seuil de probabilité YIN    : 0.15
```

**Pipeline :**
```
Microphone → getUserMedia → MediaStream → AnalyserNode → YIN → Hz | null
                                                                    ↓
                                                           evaluerJustesse ±25¢
```

</details>

<details>
<summary>📐 Architecture interne Module 3</summary>

```
models/
  noteModel.ts              → Hz ↔ MIDI ↔ Note, cents, évaluation, bilan
  pitchModel.ts             → Web Audio API, YIN, oscillateur

controllers/
  usePitchDetection.ts      → cycle de vie microphone
  useNoteSession.ts         → session N notes, validation, bilan
  useStabilisation.ts       → timer 3s isolé (SRP)

views/PitchDetector/
  pitchDetector.tsx         → Smart Component
  ConfigSession.tsx         → configuration (notes, octave, toggle ♯/♭)
  SessionEnCours.tsx        → phase d'évaluation
  InfoTemperament.tsx       → panneau éducatif repliable

views/NoteTarget/
  noteTarget.tsx            → note cible + feedback + piano
  components/
    AnneauSVG.tsx           → anneau SVG de progression
    FeedbackDirectionnel.tsx→ emoji + label + compte à rebours
    JaugeCents.tsx          → jauge −50¢/+50¢
    PianoKeyboard.tsx       → clavier interactif 1 octave
```

</details>

---

## 🎵 Module 4 — Analyse fréquentielle

> Développé par **Parchemal NGUINGO**

Importez un fichier audio et visualisez son contenu fréquentiel. Le module génère une **analyse spectrale complète** via FFT permettant d'identifier les composantes fréquentielles dominantes de la piste.

**Fonctionnalités :**
- 📂 **Import de fichier audio** — MP3, WAV, OGG, FLAC…
- 📈 **Analyse spectrale FFT** — visualisation du spectre fréquentiel
- 🎯 **Fréquences dominantes** — identification des pics spectraux
- ⚡ **Visualisation temps réel** — spectre mis à jour à chaque frame

---

## 🚀 Lancement

> ⚠️ **`npm run dev` ne lance que le frontend Vite** — le backend Flask ne démarre pas.
> Pour avoir l'application complète (front + back), utilisez **Docker Compose**.

### Mode recommandé — Docker Compose (front + back)

**Prérequis :** Docker installé et démarré

```bash
# Cloner le dépôt
git clone https://github.com/Illuminatyon/musicolab-front.git
cd musicolab-front

# Lancer front + back en une commande
docker compose up
```

| Service | URL |
|---|---|
| 🌐 Application | http://localhost:8081 |
| ⚙️ API Backend | http://localhost:5000 |

```bash
# Arrêter
docker compose down

# Forcer le rebuild de l'image front
docker compose up --build
```

---

### Mode développement — hot reload

Pour modifier le code frontend avec rechargement automatique :

```bash
# Terminal 1 — backend Flask en Docker
docker compose up back

# Terminal 2 — frontend Vite avec hot reload
npm install
npm run dev
# → http://localhost:5173
```

---

### Prérequis Docker par système d'exploitation

<details>
<summary>🪟 Windows</summary>

| Prérequis | Détail |
|---|---|
| Windows 10/11 64-bit | Versions récentes |
| **Docker Desktop** | Inclut Docker Engine + Compose |
| **WSL 2** | Backend Linux pour Docker Desktop |
| Virtualisation BIOS | VT-x / AMD-V activé |

```powershell
# 1. Installer WSL 2 (PowerShell administrateur)
wsl --install

# 2. Installer Docker Desktop depuis https://docker.com
# 3. Démarrer Docker Desktop

# 4. Vérifier
docker --version
docker compose version
```

> ⚠️ Docker Desktop **doit être démarré** avant toute commande `docker`.

</details>

<details>
<summary>🍎 macOS</summary>

| Prérequis | Détail |
|---|---|
| macOS récent | Intel **ou** Apple Silicon (M1/M2/M3) |
| **Docker Desktop pour Mac** | Choisir la bonne puce |

```bash
# Après installation de Docker Desktop
docker compose version
```

</details>

<details>
<summary>🐧 Linux (Ubuntu / Debian)</summary>

```bash
sudo apt update
sudo apt install docker.io docker-compose-plugin
sudo systemctl enable --now docker
docker compose version
```

> Docker tourne **nativement** sur Linux — le plus simple des trois systèmes.

</details>

---

## 🛠️ Scripts disponibles

```bash
npm run dev            # Serveur de développement Vite (frontend uniquement)
npm run build          # Build de production
npm run preview        # Prévisualiser le build
npm run lint           # Analyse statique ESLint — doit retourner 0 erreur
npm run test           # Tests unitaires Vitest
npm run test:coverage  # Tests + rapport de couverture lcov
```

---

## 🏗️ Stack technique

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend                                                        │
│  React 19 · TypeScript 6 · Vite 8 · React Router 7             │
│  Tailwind CSS 3 · PostCSS · Autoprefixer                        │
├─────────────────────────────────────────────────────────────────┤
│  Audio                                                           │
│  Web Audio API (natif) · PitchFinder (YIN) · Oscillateur        │
├─────────────────────────────────────────────────────────────────┤
│  Qualité                                                         │
│  ESLint · TypeScript strict · Vitest · GitHub Actions CI        │
│  Qodana · WCAG AA (contrastes ≥ 4,5:1)                         │
├─────────────────────────────────────────────────────────────────┤
│  Infra                                                           │
│  Docker + nginx · Docker Compose · Vercel                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du projet

```
musicolab-front/
├── .github/
│   └── workflows/
│       └── ci.yml              ← GitHub Actions (lint + tests)
├── src/
│   ├── config/
│   │   └── appConfig.ts        ← Configuration centralisée (URL API)
│   ├── models/                 ← Logique métier pure — zéro dépendance React
│   │   ├── rhythmModel.ts
│   │   ├── noteModel.ts
│   │   └── pitchModel.ts
│   ├── controllers/            ← Hooks React orchestrant les models
│   │   ├── useRhythmCircle.ts
│   │   ├── usePitchDetection.ts
│   │   ├── useNoteSession.ts
│   │   └── useStabilisation.ts
│   └── views/                  ← Composants présentationnels
│       ├── Home/
│       ├── RhythmCircle/
│       ├── PitchDetector/
│       ├── NoteTarget/
│       └── ResultsSummary/
├── Dockerfile                  ← Build multi-stage Node → nginx
├── docker-compose.yml          ← Lance front + back ensemble
├── nginx.conf                  ← Serveur nginx (SPA routing + cache)
├── postcss.config.js
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## 🎨 Charte graphique

<div align="center">

| | Couleur | Usage | Hex |
|---|---|---|---|
| ⬛ | Noir | Fond principal | `#0a0a0a` |
| ⬜ | Blanc | Texte principal | `#ffffff` |
| 🟥 | Rouge IUT | Accents, navigation, sélection | `#C8102E` |
| 🟩 | Vert | Note juste, validation | `#22c55e` |
| 🟧 | Orange | Chargement, avertissement | `#f59e0b` |

*Police : **Courier New** — monospace sur toute l'interface*

</div>

---

## ✅ Qualité logicielle

| Outil | Résultat |
|---|---|
| ESLint (TypeScript + React Hooks) | 0 erreur |
| Vitest — Tests unitaires | 30 tests ✅ |
| GitHub Actions CI | lint + tests sur chaque push |
| Qodana | 0 problème critique |
| WCAG AA | Contrastes ≥ 4,5:1 sur tous les textes |


---

## 👥 Équipe

<div align="center">

| Contributeur | Module |
|---|---|
| 🎹 **Teddy ASOUSSEAU** | Module 1 — Transposition MIDI |
| 🥁 **Esteban PEREIRA** | Module 2 — Cercle de rythme interactif |
| 🎤 **Fabio GUERREIRO MARQUES** | Module 3 — Évaluation de la justesse vocale |
| 🎤 **Marvin JEAN-FORT** | Module 3 — Évaluation de la justesse vocale |
| 🎵 **Parchemal NGUINGO** | Module 4 — Analyse fréquentielle |

</div>

---

<div align="center">

Projet éducatif — BUT Informatique Parcours Réalisation d'Applications (2027)

**IUT de Montreuil, Université Paris 8 — 2025–2026**

</div>
