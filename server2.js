import net from "net";
import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";
import dotenv from 'dotenv';

dotenv.config();

function ServerData(requestID, userID, data)
{
    this.requestID = requestID;
    this.userID = userID;
    this.data = data;
}

function PlayerData(pseudo, address, port, userID, socket)
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

function Room(code, host)
{
    this.code = code;
    this.members = [];
    this.members.push(host);
    this.isOpen = true;
    
    this.words = normalizeWords(selectionnerMotsAleatoires(chargerDictionnaire("./mots.txt"), 100, 3, 6));
    this.nbTryMax = 10;
}

let client;

const server = net.createServer(socket => {

    socket.on('data', data => {
        let to;
        const from = JSON.parse(data); // donnée reçue en JSON
        console.log("Requête reçue : " + String(from.requestID));

        switch (from.requestID) {
            case parseInt(process.env.ROOM_CONNECT, 10):
                var index = gameRooms.findIndex(cell => cell.code === from.data.code);
                if (index !== -1)
                {
                    const targetRoom = gameRooms[index];
                    if (targetRoom.isOpen)
                    {
                        targetRoom.members.push(new PlayerData("test", socket.remoteAddress, socket.remotePort, from.userID, socket));

                        to = new ServerData(parseInt(process.env.ROOM_CONNECT, 10), from.userID, true);
                        to = JSON.stringify(to);
                        socket.write(to);
                        console.log("Requête envoyée : " + String(socket.remoteAddress));
        
                        console.log("Joueur ajouté à la room " + targetRoom.code);
                        console.log("Joueurs dans la room " + targetRoom.code + " : " + targetRoom.members.length);
                    }
                    else
                        console.log("Room fermée, joueur refusé.")
                }
                else
                {
                    to = new ServerData(parseInt(process.env.ROOM_CONNECT, 10), from.userID, false);
                    to = JSON.stringify(to);
                    socket.write(to);
                    console.log("Requête envoyée : " + String(socket.remoteAddress));

                    console.log("Joueur refusé dans la room, mauvais code");
                }
                break;
            case parseInt(process.env.ROOM_CREATE, 10):
                const roomCode = generateCode()
                gameRooms.push(new Room(roomCode, new PlayerData("", socket.remoteAddress, socket.remotePort, from.userID, socket)));
    
                to = new ServerData(parseInt(process.env.ROOM_CREATE, 10), from.userID, { code: roomCode });
                to = JSON.stringify(to);
                socket.write(to);
                console.log("Requête envoyée : " + String(socket.remoteAddress));
    
                console.log("Nouvelle room créée : " + String(roomCode));
                break;
            case parseInt(process.env.ROOM_START, 10):
                var index = gameRooms.findIndex(cell => cell.code === from.data.code);
                if (index !== -1)
                {
                    const targetRoom = gameRooms[index];
                    targetRoom.isOpen = false;
                    for (var i = 0; i < targetRoom.members.length; i++)
                    {
                        to = new ServerData(parseInt(process.env.ROOM_START, 10), targetRoom.members[i].userID, {state : true, room : targetRoom, playerdata : targetRoom.members[i]});
                        to = JSON.stringify(to);
                        targetRoom.members[i].socket.write(to);
                        console.log("Requête envoyée : " + String(targetRoom.members[i].address));
                    }
                }
                break;
            case parseInt(process.env.GAME_ATTACK, 10):
                var index = gameRooms.findIndex(cell => cell.code === from.data.code);
                if (index !== -1 && gameRooms[index].members.length > 1)
                {
                    const targetRoom = gameRooms[index];
                    const targets = [];
                    let nbAttack = from.data.nbAttack;
                    const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == from.userID);
                    targetRoom.members[indexOrigin].nbArmor += Math.floor(nbAttack / 2);
                    targetRoom.members[indexOrigin].nbWords++;
                    targetRoom.members[indexOrigin].nbTry = 0;
                    targetRoom.members[indexOrigin].tries = [];
                    while (nbAttack > 0) // Distribuer dégâts
                    {
                        var randIndex = Math.floor(Math.random() * targetRoom.members.length);
                        var member = targetRoom.members[randIndex]
                        if (member.userID != from.userID)
                        {
                            targets.push(member.userID);
                            if (member.nbArmor > 0)
                                member.nbArmor--;
                            else
                                member.nbHealth--;
    
                            nbAttack--;
                        }
                    }
    
                    for (var i = 0; i < targetRoom.members.length; i++)
                    {
                        to = new ServerData(parseInt(process.env.ROOM_SYNC, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[i], targets : targets});
                        to = JSON.stringify(to);
                        targetRoom.members[i].socket.write(to);
                        console.log("Requête envoyée : " + String(targetRoom.members[i].address));
                    }
    
                    for (var i = targetRoom.members.length - 1; i >= 0; i--)
                    {
                        if (targetRoom.members[i].nbHealth <= 0)
                        {
                            to = new ServerData(parseInt(process.env.GAME_LOOSE, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[i]});
                            to = JSON.stringify(to);
                            targetRoom.members[i].socket.write(to);
                            console.log("Requête envoyée : " + String(targetRoom.members[i].address));
    
                            targetRoom.members.splice(i, 1);
    
                            for (var j = 0; j < targetRoom.members.length; j++)
                            {
                                to = new ServerData(parseInt(process.env.ROOM_SYNC, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[j], targets : targets});
                                to = JSON.stringify(to);
                                targetRoom.members[j].socket.write(to);
                                console.log("Requête envoyée : " + String(targetRoom.members[i].address));
                            }
                        }
                    }
    
                }
                break;
            case parseInt(process.env.GAME_TRY, 10):
                var index = gameRooms.findIndex(cell => cell.code === from.data.code);
                if (index !== -1)
                {
                    const targetRoom = gameRooms[index];
                    const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == from.userID);
                    targetRoom.members[indexOrigin].nbTry++;
                    targetRoom.members[indexOrigin].tries.push(from.data.verdict_);
    
                    if (targetRoom.members[indexOrigin].nbTry > targetRoom.nbTryMax)
                    {
                        targetRoom.members[indexOrigin].nbTry = 0;
                        targetRoom.members[indexOrigin].nbWords++;
                        targetRoom.members[indexOrigin].tries = [];
                    }
    
                    for (var j = 0; j < targetRoom.members.length; j++)
                    {
                        to = new ServerData(parseInt(process.env.GAME_TRY, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[j]});
                        to = JSON.stringify(to);
                        targetRoom.members[j].socket.write(to);
                        console.log("Requête envoyée : " + String(targetRoom.members[j].address));
                    }
                }
                break;
            case parseInt(process.env.VERSION_CHECK, 10):
                to = new ServerData(parseInt(process.env.VERSION_CHECK, 10), from.userID, { version: (from.data.version == parseInt(process.env.VERSION, 10)) });
                to = JSON.stringify(to);
                socket.write(to);
                console.log("Requête envoyée : " + String(socket.remoteAddress));
    
                console.log((from.data.version == parseInt(process.env.VERSION)) ? "Version valide, joueur connecté au serveur" : "Version invalide, joueur rejeté");
                break;
            case parseInt(process.env.GAME_QUIT, 10):
                var index = gameRooms.findIndex(cell => cell.code === from.data.code);
                if (index !== -1) {
                    const targetRoom = gameRooms[index];
                    const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == from.userID);
                    targetRoom.members.splice(indexOrigin, 1);
                    if (targetRoom.members.length <= 0)
                        gameRooms.splice(index, 1);
                    console.log("Joueur déconnecté supprimé de la room ! Room actives : " + gameRooms.length);
                }
                break;
        }
    });

    socket.on('end', () => {
        console.log('client left');
    });
    socket.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            console.warn('Connexion réinitialisée par le client.');
        } else {
            console.error('Erreur de socket:', err);
        }
    });
})

server.listen(8080, '0.0.0.0');

const gameRooms = [];