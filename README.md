# 🎵 MusicoLab — Front-end

Application web d'aide aux musiciens développée dans le cadre du BUT Informatique S4 — IUT de Montreuil.

## Module 3 — Évaluation de la justesse vocale
Détection de pitch en temps réel via microphone, 
avec retour visuel note par note et bilan de session.

## Stack
- React 18 + Vite
- Tailwind CSS
- PitchFinder (algorithme YIN)
- Web Audio API

## Lancer le projet

# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Build production
npm run build

## Prérequis
- Node.js >= 18
- Un navigateur moderne avec accès au microphone

## Structure du projet
src/
├── models/       → logique métier (pitch, notes)
├── controllers/  → hooks React
└── views/        → composants + CSS
