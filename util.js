export function generateCode() {
    let lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
        let indexAleatoire = Math.floor(Math.random() * lettres.length);
        code += lettres[indexAleatoire];
    }
    return code;
}