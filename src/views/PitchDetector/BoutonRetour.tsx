/**
 * BoutonRetour.tsx — Couche View (MVC)
 * Bouton de navigation pour revenir à la page d'accueil.
 * Utilisé dans chaque module pour permettre la navigation retour.
 */

import { useNavigate } from "react-router-dom";

export default function BoutonRetour() {
    const navigate = useNavigate();

    return (
        <button
            className="bouton-retour"
            onClick={() => navigate("/")}
            type="button"
            aria-label="Retour à l'accueil"
            style={{
                position: "fixed",
                top: "1rem",
                left: "1rem",
                padding: "0.5rem 1rem",
                background: "transparent",
                border: "1px solid #2a2a2a",
                borderRadius: "0.5rem",
                color: "#a0a0a0",
                fontSize: "0.75rem",
                fontWeight: "700",
                fontFamily: "'Courier New', monospace",
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                transition: "all 0.15s ease",
                zIndex: 100,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#C8102E";
                e.currentTarget.style.color = "#C8102E";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#2a2a2a";
                e.currentTarget.style.color = "#a0a0a0";
            }}
        >
            ← Accueil
        </button>
    );
}