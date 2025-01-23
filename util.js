import fs from 'fs';

export function generateCode() {
    let lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
        let indexAleatoire = Math.floor(Math.random() * lettres.length);
        code += lettres[indexAleatoire];
    }
    return code;
}

export function chargerDictionnaire(cheminFichier) {
    try {
        const data = fs.readFileSync(cheminFichier, 'utf8');
        return data
            .split('\n')
            .map(word => word.trim())
            .filter(word => word.length > 0 && !/^[A-ZÀ-Ý]/.test(word));
    } catch (err) {
        console.error("Erreur lors de la lecture du fichier :", err);
        return [];
    }
}

export function selectionnerMotsAleatoires(dictionnaire, nombre, min, max) {
    dictionnaire = dictionnaire.filter(word => word.length >= min && word.length <= max);
    if (dictionnaire.length < nombre) {
        console.warn("Pas assez de mots dans le dictionnaire !");
        return dictionnaire;
    }
    const motsAleatoires = [];
    for (let i = 0; i < nombre; i++) {
        const index = Math.floor(Math.random() * dictionnaire.length);
        motsAleatoires.push(dictionnaire[index]);
        dictionnaire.splice(index, 1);  // Retire le mot pour éviter les doublons
    }
    return motsAleatoires;
}

export function normalizeWords(words) {
    return words.map(word => 
        word
            .toUpperCase()
            .normalize("NFD") // Décompose les accents
            .replace(/[̀-ͯ]/g, "") // Supprime les accents
    );
}