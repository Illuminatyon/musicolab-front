/**
 * @file InfoTemperament.tsx
 * @description Composant View — Info éducative sur le tempérament musical.
 *
 * Explique la différence entre tempérament égal (piano) et intonation juste
 * (violon, voix). Cette distinction est fondamentale pour comprendre pourquoi
 * La# et Si♭ sont la même touche sur un piano mais deux notes distinctes
 * pour un violoniste ou un chanteur.
 *
 * Affiché sous forme de panneau repliable pour ne pas encombrer l'interface.
 */

import { useState } from "react";
import "./InfoTemperament.css";

/**
 * Panneau d'information repliable sur le tempérament musical.
 * Affiché uniquement quand la notation bémol est activée (toggle ♭).
 */
export default function InfoTemperament() {
    const [ouvert, setOuvert] = useState(false);

    return (
        <div className="temperament">

            {/* ── Bouton d'ouverture ── */}
            <button
                type="button"
                className="temperament__toggle"
                onClick={() => setOuvert((v) => !v)}
                aria-expanded={ouvert}
            >
                <span className="temperament__icone">𝄞</span>
                <span>Pourquoi La♯ ≠ Si♭ pour un violoniste ?</span>
                <span className="temperament__chevron">{ouvert ? "▲" : "▼"}</span>
            </button>

            {/* ── Contenu ── */}
            {ouvert && (
                <div className="temperament__contenu">

                    <div className="temperament__section">
                        <h3 className="temperament__titre">🎹 Tempérament égal (piano)</h3>
                        <p className="temperament__texte">
                            Sur un piano, les 12 demi-tons d'une octave sont répartis
                            <strong> mathématiquement égaux</strong> : chaque demi-ton
                            = facteur 2<sup>1/12</sup> ≈ 1,0595. Dans ce système,
                            La# et Si♭ ont <strong>exactement la même fréquence</strong> :
                            466,16 Hz (pour l'octave 4).
                        </p>
                        <p className="temperament__formule">La#₄ = Si♭₄ = 440 × 2^(1/12) ≈ 466,16 Hz</p>
                    </div>

                    <div className="temperament__section">
                        <h3 className="temperament__titre">🎻 Intonation juste (violon, voix)</h3>
                        <p className="temperament__texte">
                            Un violoniste peut placer ses doigts <strong>exactement</strong>
                            où il veut. En intonation juste, les intervalles sont basés
                            sur des rapports de nombres entiers — plus consonants à l'oreille.
                            Dans ce système, La# (septième augmentée) et Si♭ (septième mineure)
                            sont <strong>deux notes différentes</strong>, séparées d'environ
                            21,5 cents (le comma syntonique).
                        </p>
                        <p className="temperament__formule">Si♭ juste ≈ 462,5 Hz · La# juste ≈ 468,8 Hz</p>
                    </div>

                    <div className="temperament__section temperament__section--info">
                        <p className="temperament__texte">
                            <strong>Pour cette application :</strong> nous utilisons le
                            tempérament égal, comme tous les accordeurs numériques. Si vous
                            chantez avec un accompagnement de violons, votre oreille tendra
                            naturellement vers l'intonation juste — c'est tout à fait normal !
                        </p>
                    </div>

                </div>
            )}

        </div>
    );
}