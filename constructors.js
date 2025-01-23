import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";

export function ServerData(requestID, userID, data)
{
    this.requestID = requestID;
    this.userID = userID;
    this.data = data;
}

export function PlayerData(pseudo, address, port, userID, socket)
{
    this.pseudo = pseudo;
    this.address = address;
    this.port = port
    this.userID = userID;
    this.socket = socket

    this.tries = [];
    this.nbTry = 0;
    this.nbHealth = 10;
    this.nbHealthShow = 10;
    this.nbArmor = 0;
    this.nbArmorShow = 0;
    this.nbAttack = 0;
    this.nbWords = 0;

    this.isDead = false;
}

export function Room(code, host)
{
    this.code = code;
    this.members = [];
    this.members.push(host);
    this.isOpen = true;
    
    this.words = normalizeWords(selectionnerMotsAleatoires(chargerDictionnaire("./mots.txt"), 100, 3, 6));
    this.nbTryMax = 10;
}