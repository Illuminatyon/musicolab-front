/**
 * audioModel.ts : couche Model (MVC)
 * appel API, dessin waveform/spectre.
 */

//todo verif avec Parchemal pour le localhost
const API_URL = "http://localhost:5000/analyse";

export interface AnalyseAudio {
    duration: number;
    sample_rate: number;
    channels: number;
    waveform: number[];
    freqs: number[];
    spectrum: number[];
}

export async function analyserFichierAudio(fichier: File): Promise<AnalyseAudio> {
    const formData = new FormData();
    formData.append("file", fichier);

    const reponse = await fetch(API_URL, {
        method: "POST",
        body: formData,
    });

    if (!reponse.ok) {
        const texte = await reponse.text();
        throw new Error(`Erreur serveur (${reponse.status}) : ${texte}`);
    }

    return (await reponse.json()) as AnalyseAudio;
}

export function dessinerWaveform(canvas: HTMLCanvasElement, waveform: number[]): void {
    const ctx = canvas.getContext("2d");
    if (!ctx || waveform.length === 0) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, width, height);
    //ligne au milieu << ICI
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    let maxAbs = 1e-9;
    for (const v of waveform) {
        const abs = Math.abs(v);
        if (abs > maxAbs) maxAbs = abs;
    }

    const n = waveform.length;
    ctx.strokeStyle = "#C8102E";

    if (n <= width) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        waveform.forEach((val, i) => {
            const x = (i / Math.max(n - 1, 1)) * width;
            const y = height / 2 - (val / maxAbs) * (height / 2) * 0.9;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    } else {
        ctx.lineWidth = 1;
        const step = n / width;
        for (let x = 0; x < width; x++) {
            const debut = Math.floor(x * step);
            const fin = Math.min(Math.floor((x + 1) * step), n);
            let min = 0;
            let max = 0;
            for (let i = debut; i < fin; i++) {
                const v = waveform[i] / maxAbs;
                if (v < min) min = v;
                if (v > max) max = v;
            }
            const yMin = height / 2 - max * (height / 2) * 0.9;
            const yMax = height / 2 - min * (height / 2) * 0.9;
            ctx.beginPath();
            ctx.moveTo(x + 0.5, yMin);
            ctx.lineTo(x + 0.5, Math.max(yMax, yMin + 1));
            ctx.stroke();
        }
    }
}

export function dessinerSpectre(
    canvas: HTMLCanvasElement,
    freqs: number[],
    spectrum: number[]
): void {
    const ctx = canvas.getContext("2d");
    if (!ctx || spectrum.length === 0) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#141414";
    ctx.fillRect(0, 0, width, height);

    let maxVal = 1e-9;
    for (const v of spectrum) {
        if (v > maxVal) maxVal = v;
    }

    const n = spectrum.length;
    const barWidth = width / n;

    spectrum.forEach((val, i) => {
        const normalized = val / maxVal;
        const barH = normalized * height * 0.95;
        const x = i * barWidth;
        const y = height - barH;
        const g = Math.round(normalized * 80);
        ctx.fillStyle = `rgb(200,${g},46)`;
        ctx.fillRect(x, y, Math.max(barWidth - 0.5, 0.5), barH);
    });

    if (freqs.length > 0) {
        ctx.fillStyle = "rgba(160,160,160,0.8)";
        ctx.font = "10px 'Courier New', monospace";
        const reperes = [500, 1000, 2000, 4000, 8000, 16000];
        reperes.forEach((freq) => {
            const idx = freqs.findIndex((f) => f >= freq);
            if (idx < 0 || idx >= n) return;
            const x = (idx / n) * width;
            if (x > width - 44) return;
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillText(label, x + 2, height - 4);
        });
    }
}
