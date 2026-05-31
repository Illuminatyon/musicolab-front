import { describe, it, expect } from "vitest";
import {
    frequenceVersMidi,
    midiVersFrequence,
    midiVersNote,
    frequenceVersNote,
    calculerEcartCents,
    evaluerJustesse,
    genererBilan,
    getNotesOctave,
    type ResultatNote,
} from "./noteModel";

// ─── frequenceVersMidi ────────────────────────────────────────────────────────

describe("frequenceVersMidi", () => {
    it("convertit A4 (440 Hz) en MIDI 69", () => {
        expect(frequenceVersMidi(440)).toBeCloseTo(69);
    });

    it("convertit A3 (220 Hz) en MIDI 57", () => {
        expect(frequenceVersMidi(220)).toBeCloseTo(57);
    });

    it("lève une erreur pour 0 Hz", () => {
        expect(() => frequenceVersMidi(0)).toThrow();
    });

    it("lève une erreur pour une fréquence négative", () => {
        expect(() => frequenceVersMidi(-10)).toThrow();
    });
});

// ─── midiVersFrequence ────────────────────────────────────────────────────────

describe("midiVersFrequence", () => {
    it("convertit MIDI 69 en 440 Hz", () => {
        expect(midiVersFrequence(69)).toBeCloseTo(440);
    });

    it("convertit MIDI 57 en 220 Hz (A3)", () => {
        expect(midiVersFrequence(57)).toBeCloseTo(220);
    });

    it("aller-retour : midiVersFrequence(frequenceVersMidi(f)) ≈ f", () => {
        const freq = 523.25; // Do5
        expect(midiVersFrequence(Math.round(frequenceVersMidi(freq)))).toBeCloseTo(freq, 0);
    });
});

// ─── midiVersNote ─────────────────────────────────────────────────────────────

describe("midiVersNote", () => {
    it("MIDI 60 → Do4", () => {
        const note = midiVersNote(60);
        expect(note.nom).toBe("Do");
        expect(note.octave).toBe(4);
        expect(note.midi).toBe(60);
    });

    it("MIDI 69 → La4", () => {
        const note = midiVersNote(69);
        expect(note.nom).toBe("La");
        expect(note.octave).toBe(4);
        expect(note.midi).toBe(69);
    });

    it("MIDI 72 → Do5", () => {
        const note = midiVersNote(72);
        expect(note.nom).toBe("Do");
        expect(note.octave).toBe(5);
        expect(note.midi).toBe(72);
    });

    it("la fréquence est cohérente avec midiVersFrequence", () => {
        const note = midiVersNote(60);
        expect(note.frequenceHz).toBeCloseTo(midiVersFrequence(60));
    });
});

// ─── frequenceVersNote ────────────────────────────────────────────────────────

describe("frequenceVersNote", () => {
    it("440 Hz → La4", () => {
        const note = frequenceVersNote(440);
        expect(note.nom).toBe("La");
        expect(note.octave).toBe(4);
    });

    it("261.63 Hz → Do4 (approximatif)", () => {
        const note = frequenceVersNote(261.63);
        expect(note.nom).toBe("Do");
        expect(note.octave).toBe(4);
    });
});

// ─── calculerEcartCents ───────────────────────────────────────────────────────

describe("calculerEcartCents", () => {
    const do4 = midiVersNote(60);

    it("retourne 0 cents si la fréquence est exacte", () => {
        expect(calculerEcartCents(do4.frequenceHz, do4)).toBeCloseTo(0);
    });

    it("retourne ~100 cents pour un demi-ton au-dessus (Do# vs Do)", () => {
        const dodiese4 = midiVersFrequence(61);
        expect(calculerEcartCents(dodiese4, do4)).toBeCloseTo(100);
    });

    it("retourne ~-100 cents pour un demi-ton en dessous (Si3 vs Do4)", () => {
        const si3 = midiVersFrequence(59);
        expect(calculerEcartCents(si3, do4)).toBeCloseTo(-100);
    });

    it("retourne ~1200 cents pour une octave au-dessus (Do5 vs Do4)", () => {
        const do5 = midiVersFrequence(72);
        expect(calculerEcartCents(do5, do4)).toBeCloseTo(1200);
    });
});

// ─── evaluerJustesse ──────────────────────────────────────────────────────────

describe("evaluerJustesse", () => {
    const do4 = midiVersNote(60);

    it('retourne "silence" si la fréquence est null', () => {
        expect(evaluerJustesse(null, do4)).toBe("silence");
    });

    it('retourne "juste" pour la fréquence exacte', () => {
        expect(evaluerJustesse(do4.frequenceHz, do4)).toBe("juste");
    });

    it('retourne "juste" à 24 cents (dans la tolérance de ±25)', () => {
        const freq = do4.frequenceHz * Math.pow(2, 24 / 1200);
        expect(evaluerJustesse(freq, do4)).toBe("juste");
    });

    it('retourne "trop_haut" à 26 cents au-dessus (hors tolérance)', () => {
        const freq = do4.frequenceHz * Math.pow(2, 26 / 1200);
        expect(evaluerJustesse(freq, do4)).toBe("trop_haut");
    });

    it('retourne "trop_bas" à 26 cents en dessous (hors tolérance)', () => {
        const freq = do4.frequenceHz * Math.pow(2, -26 / 1200);
        expect(evaluerJustesse(freq, do4)).toBe("trop_bas");
    });

    it('retourne "trop_haut" pour une octave au-dessus', () => {
        expect(evaluerJustesse(do4.frequenceHz * 2, do4)).toBe("trop_haut");
    });
});

// ─── genererBilan ─────────────────────────────────────────────────────────────

describe("genererBilan", () => {
    const note = midiVersNote(60);
    const juste:   ResultatNote = { noteCible: note, frequenceDetectee: note.frequenceHz, ecartCents: 0,    evaluation: "juste"    };
    const silence: ResultatNote = { noteCible: note, frequenceDetectee: null,             ecartCents: null, evaluation: "silence"  };
    const faux:    ResultatNote = { noteCible: note, frequenceDetectee: note.frequenceHz, ecartCents: 50,   evaluation: "trop_haut"};

    it('retourne 100% et "Excellent" si toutes les notes sont justes', () => {
        const bilan = genererBilan([juste, juste, juste]);
        expect(bilan.scorePourcentage).toBe(100);
        expect(bilan.notesJustes).toBe(3);
        expect(bilan.totalNotes).toBe(3);
        expect(bilan.appreciation).toContain("Excellent");
    });

    it("retourne 0% si aucune note n'est juste", () => {
        const bilan = genererBilan([silence, faux]);
        expect(bilan.scorePourcentage).toBe(0);
        expect(bilan.notesJustes).toBe(0);
    });

    it("calcule 50% pour 1 juste sur 2", () => {
        const bilan = genererBilan([juste, silence]);
        expect(bilan.scorePourcentage).toBe(50);
    });

    it("retourne 0% et totalNotes=0 pour une liste vide", () => {
        const bilan = genererBilan([]);
        expect(bilan.scorePourcentage).toBe(0);
        expect(bilan.totalNotes).toBe(0);
    });

    it("applique les bons seuils d'appréciation", () => {
        // ≥90% → Excellent
        expect(genererBilan([juste, juste, juste, juste, juste, juste, juste, juste, juste, juste]).appreciation)
            .toContain("Excellent");
        // 70-89% → Bien
        expect(genererBilan([juste, juste, juste, juste, juste, juste, juste, faux, faux, faux]).appreciation)
            .toContain("Bien");
        // 50-69% → Passable
        expect(genererBilan([juste, juste, juste, juste, juste, faux, faux, faux, faux, faux]).appreciation)
            .toContain("Passable");
        // <50% → À retravailler
        expect(genererBilan([juste, faux, faux, faux, faux]).appreciation)
            .toContain("retravailler");
    });
});

// ─── getNotesOctave ───────────────────────────────────────────────────────────

describe("getNotesOctave", () => {
    it("retourne exactement 12 notes", () => {
        expect(getNotesOctave(4)).toHaveLength(12);
    });

    it("commence par Do et finit par Si", () => {
        const notes = getNotesOctave(4);
        expect(notes[0].nom).toBe("Do");
        expect(notes[11].nom).toBe("Si");
    });

    it("toutes les notes ont le numéro d'octave demandé", () => {
        const notes = getNotesOctave(3);
        notes.forEach((note) => expect(note.octave).toBe(3));
    });

    it("les fréquences sont strictement croissantes", () => {
        const notes = getNotesOctave(4);
        for (let i = 1; i < notes.length; i++) {
            expect(notes[i].frequenceHz).toBeGreaterThan(notes[i - 1].frequenceHz);
        }
    });

    it("Do4 a un MIDI 60 et ~261.6 Hz", () => {
        const do4 = getNotesOctave(4)[0];
        expect(do4.midi).toBe(60);
        expect(do4.frequenceHz).toBeCloseTo(261.63, 1);
    });

    it("Do5 a des fréquences deux fois plus élevées que Do4", () => {
        const do4 = getNotesOctave(4)[0];
        const do5 = getNotesOctave(5)[0];
        expect(do5.frequenceHz).toBeCloseTo(do4.frequenceHz * 2);
    });
});
