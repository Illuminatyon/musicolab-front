/**
 * @file midiModel.ts
 * @description Couche Model (MVC) — Communication API pour le Module 1
 */

const API_URL = "http://localhost:5000/api/midi/transpose";

export async function transposerFichierMidi(fichier: File, intervalle: number): Promise<Blob> {
    const formData = new FormData();
    formData.append("file", fichier);
    formData.append("interval", intervalle.toString());

    const reponse = await fetch(API_URL, {
        method: "POST",
        body: formData,
    });

    if (!reponse.ok) {
        const texte = await reponse.text();
        throw new Error(`Erreur serveur (${reponse.status}) : ${texte}`);
    }

    // Le serveur renvoie directement le fichier binaire (audio/midi)
    return await reponse.blob();
}