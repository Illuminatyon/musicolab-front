/**
 * JaugeCents.tsx
 * Jauge visuelle de l'écart en cents (−50¢ à +50¢).
 * Composant réutilisable, aucune logique métier.
 */

interface JaugeCentsProps {
    ecartCents: number | null;
    evaluation: string | null;
}

export default function JaugeCents({ ecartCents, evaluation }: JaugeCentsProps) {
    const posJauge = ecartCents === null ? 50
        : ((Math.max(-50, Math.min(50, ecartCents)) + 50) / 100) * 100;

    return (
        <div className="note-target__jauge-wrapper">
            <span className="jauge__label">−50¢</span>
            <div className="jauge">
                <div className="jauge__zone-juste" />
                {ecartCents !== null && (
                    <div
                        className={`jauge__curseur ${evaluation === "juste" ? "curseur--juste" : "curseur--hors"}`}
                        style={{ left: `${posJauge}%` }}
                    />
                )}
                <div className="jauge__centre" />
            </div>
            <span className="jauge__label">+50¢</span>
        </div>
    );
}