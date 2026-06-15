/**
 * AnneauSVG.tsx
 * Anneau de progression SVG — se remplit pendant les 3s de stabilisation.
 * Composant réutilisable, aucune logique métier.
 */

interface AnneauSVGProps {
    progression: number; // 0 à 1
    actif: boolean;
    children: React.ReactNode;
}

export default function AnneauSVG({ progression, actif, children }: AnneauSVGProps) {
    const RAYON = 54;
    const CIRC  = 2 * Math.PI * RAYON;

    return (
        <div className="note-target__cercle-wrapper">
            <svg
                className={`cercle-svg ${actif ? "cercle-svg--actif" : ""}`}
                viewBox="0 0 120 120"
                aria-hidden="true"
            >
                <circle cx="60" cy="60" r={RAYON} fill="none" stroke="#2a2a2a" strokeWidth="4" />
                <circle
                    cx="60" cy="60" r={RAYON} fill="none" stroke="#22c55e" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={CIRC * (1 - progression)}
                    transform="rotate(-90 60 60)"
                    style={{ transition: "stroke-dashoffset 0.05s linear" }}
                />
            </svg>
            {children}
        </div>
    );
}