# 🎵 MusicoLab — Front-end

> Application web d'aide aux musiciens et chanteurs — SAE S4, BUT Informatique 2025–2026  
> IUT de Montreuil, Université Paris 8

---

## Module 2 — Cercle de rythme interactif

Séquenceur rythmique polyrhythmique à 3 pistes. Chaque piste est représentée par un anneau SVG cliquable dont on active les pas. Les 3 anneaux tournent simultanément avec des divisions différentes (8, 12, 16 pas par défaut), ce qui produit des polyrhythmes. Le son est synthétisé en temps réel via la Web Audio API — aucun fichier audio.

---

## Module 3 — Évaluation de la justesse vocale

Détection de pitch en temps réel via microphone. L'utilisateur choisit des notes cibles, chante, et reçoit un retour immédiat sur sa justesse (trop haut / juste / trop bas). La note est validée automatiquement après 3 secondes de stabilisation dans la zone juste.

---

## Stack technique

| Technologie | Rôle |
|---|---|
| React 18 + Vite | Interface utilisateur |
| TypeScript | Typage statique |
| Tailwind CSS v3 | Styles utilitaires |
| PitchFinder (YIN) | Détection de pitch |
| Web Audio API | Capture microphone & oscillateur |

---

## Fonctionnalités — Module 2

- **3 anneaux concentriques** en SVG, chacun cliquable segment par segment pour activer/désactiver un pas
- **Polyrhythme** — les pistes partagent le même cycle (1 mesure) mais le divisent différemment (4 / 6 / 8 / 12 / 16 pas configurables)
- **Synthèse audio temps réel** — kick (sinusoïde), tom (triangle), hi-hat (carré) générés via Web Audio API sans fichier audio
- **Scheduler à lookahead** — battements planifiés 100ms à l'avance sur `audioContext.currentTime` pour un timing précis sans drift
- **Transport complet** — play / pause propre (`AudioContext.suspend`) / stop / BPM réglable de 40 à 220
- **Indicateur visuel** — curseur animé à ~60fps sur chaque anneau, synchronisé avec l'horloge audio

---

## Fonctionnalités — Module 3

- **Sélection de session** — nombre de notes (3 / 5 / 7 / 10), octave (2 à 5), notes à l'unité
- **Écoute de référence** — bouton ▶ pour entendre chaque note avant de la chanter
- **Feedback temps réel** — jauge de cents (−50¢ à +50¢), indicateur directionnel coloré
- **Anneau de progression** — visualisation des 3 secondes de stabilisation
- **Validation automatique** — overlay animé à la validation, skip possible
- **Bilan de session** — score, détail note par note, appréciation qualitative
- **Responsive** — fonctionne sur desktop et mobile

---

## Prérequis

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9
- Un navigateur moderne avec accès au microphone (Chrome, Firefox, Edge)

---

## Installation et lancement

```bash
# 1. Cloner le dépôt
git clone https://github.com/Illuminatyon/musicolab-front.git
cd musicolab-front

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev
```

L'application est accessible sur [http://localhost:5173](http://localhost:5173).

```bash
# Build de production
npm run build

# Prévisualiser le build
npm run preview
```

---

## Structure du projet

```
src/
├── models/
│   ├── rhythmModel.ts        # Module 2 : types, fonctions pures, synthèse audio
│   ├── noteModel.ts          # Module 3 : logique musicale Hz ↔ note, cents, bilan
│   └── pitchModel.ts         # Module 3 : pipeline audio micro, YIN, oscillateur
├── controllers/
│   ├── useRhythmCircle.ts    # Module 2 : hook scheduler, animation, transport
│   ├── usePitchDetection.ts  # Module 3 : hook cycle de vie du microphone
│   └── useNoteSession.ts     # Module 3 : hook session N notes, stabilisation 3s
└── views/
    ├── RhythmCircle/         # Module 2 : composant principal + anneaux SVG + contrôles
    │   ├── RhythmCircle.tsx
    │   ├── RhythmCircle.css
    │   └── components/
    │       ├── AnneauPiste.tsx    # Anneau SVG cliquable (Dumb Component)
    │       ├── ControlesPiste.tsx # Sélecteur de nombre de pas
    │       └── ControlesBPM.tsx   # Transport + BPM
    ├── PitchDetector/        # Module 3 : composant principal (Smart Component)
    ├── NoteTarget/           # Module 3 : note cible + feedback + jauge + anneau SVG
    └── ResultsSummary/       # Module 3 : bilan de fin de session
```

L'architecture suit le patron **MVC** :
- **Model** — logique métier pure, aucune dépendance React
- **Controller** — hooks React orchestrant les models
- **View** — composants présentationnels recevant les données via props

---

## Charte graphique

| Couleur | Usage | Hex |
|---|---|---|
| ⬛ Noir | Fond principal | `#0a0a0a` |
| ⬜ Blanc | Texte principal | `#ffffff` |
| 🔴 Rouge IUT | Accents, validation | `#C8102E` |
| 🟢 Vert | Note juste, validation | `#22c55e` |

---

## Algorithme de détection

L'algorithme **YIN** (de Cheveigné & Kawahara, 2002) est utilisé pour la détection de pitch. Il opère dans le domaine temporel via la fonction de différence normalisée, ce qui le rend plus robuste aux harmoniques que la FFT naïve — particulièrement adapté à la voix humaine.

```
Fréquence d'échantillonnage : 44 100 Hz
Taille du buffer           : 2 048 samples (~46 ms de latence)
Plage vocale détectée      : 80 Hz – 1 050 Hz
Tolérance de justesse      : ±25 cents
```

---

## Déploiement

Le front est déployé automatiquement sur **Vercel** à chaque push sur `main`.

```
Production : https://musicolab-front.vercel.app
```

---

## Contributeurs

| Nom                                        | Module |
|--------------------------------------------|---|
| EstebanPereira-dev                         | Module 2 — Cercle de rythme interactif |
| Marvin Jean-Fort & Fabio Guerreiro Marques | Module 3 — Évaluation de la justesse vocale |

---

## Licence

Projet éducatif — BUT Informatique, IUT de Montreuil, Université Paris 8 — 2025–2026.
