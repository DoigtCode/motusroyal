import dgram from "dgram";
import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";
import dotenv from 'dotenv';

dotenv.config();

function ServerData(requestID, userID, data)
{
	this.requestID = requestID;
	this.userID = userID;
	this.data = data;
}

function PlayerData(pseudo, address, port, userID)
{
    this.pseudo = pseudo;
    this.address = address;
    this.port = port
    this.userID = userID;

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

const server = dgram.createSocket("udp4");

const gameRooms = [];


server.on("message", (from, rinfo) => {
    let to;
    from = JSON.parse(from); // donnée reçue en JSON
    console.log("Requête reçue : " + String(from.requestID));

    switch (from.requestID) {
        case parseInt(process.env.ROOM_CONNECT, 10):
            var index = gameRooms.findIndex(cell => cell.code === from.data.code);
            if (index !== -1)
            {
                const targetRoom = gameRooms[index];
                if (targetRoom.isOpen)
                {
                    targetRoom.members.push(new PlayerData("test", rinfo.address, rinfo.port, from.userID));

                    to = new ServerData(parseInt(process.env.ROOM_CONNECT, 10), from.userID, true);
                    to = JSON.stringify(to);
                    server.send(to, rinfo.port, rinfo.address);
                    console.log("Requête envoyée : " + String(rinfo.address));
    
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
                server.send(to, rinfo.port, rinfo.address);
                console.log("Requête envoyée : " + String(rinfo.address));

                console.log("Joueur refusé dans la room, mauvais code");
            }
            
            break;
        case parseInt(process.env.ROOM_CREATE, 10):
            const roomCode = generateCode()
            gameRooms.push(new Room(roomCode, new PlayerData("", rinfo.address, rinfo.port, from.userID)));

            to = new ServerData(parseInt(process.env.ROOM_CREATE, 10), from.userID, { code: roomCode });
            to = JSON.stringify(to);
            server.send(to, rinfo.port, rinfo.address);
            console.log("Requête envoyée : " + String(rinfo.port));

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
                    server.send(to, targetRoom.members[i].port, targetRoom.members[i].address);
                    console.log("Requête envoyée : " + String(rinfo.port));
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
                    server.send(to, targetRoom.members[i].port, targetRoom.members[i].address);
                    console.log("Requête envoyée : " + String(rinfo.port));
                }

                for (var i = targetRoom.members.length - 1; i >= 0; i--)
                {
                    if (targetRoom.members[i].nbHealth <= 0)
                    {
                        to = new ServerData(parseInt(process.env.GAME_LOOSE, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[i]});
                        to = JSON.stringify(to);
                        server.send(to, targetRoom.members[i].port, targetRoom.members[i].address);
                        console.log("Requête envoyée : " + String(rinfo.port));

                        targetRoom.members.splice(i, 1);

                        for (var j = 0; j < targetRoom.members.length; j++)
                        {
                            to = new ServerData(parseInt(process.env.ROOM_SYNC, 10), from.userID, {room : targetRoom, playerdata : targetRoom.members[j], targets : targets});
                            to = JSON.stringify(to);
                            server.send(to, targetRoom.members[j].port, targetRoom.members[j].address);
                            console.log("Requête envoyée : " + String(rinfo.port));
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
                    server.send(to, targetRoom.members[j].port, targetRoom.members[j].address);
                    console.log("Requête envoyée : " + String(rinfo.port));
                }

                console.log(targetRoom.members[0].nbTry);
                console.log(targetRoom.members[1].nbTry);

            }
            break;
        case parseInt(process.env.VERSION_CHECK, 10):
            to = new ServerData(parseInt(process.env.VERSION_CHECK, 10), from.userID, { version: (from.data.version == parseInt(process.env.VERSION, 10)) });
            to = JSON.stringify(to);
            server.send(to, rinfo.port, rinfo.address);
            console.log("Requête envoyée : " + String(rinfo.port));

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


    if (to == undefined) {
        to = { data: undefined }
        to = JSON.stringify(to);
        server.send(to, rinfo.port, rinfo.address);
        console.log("Requête envoyée : " + String(rinfo.address));
    }
})

server.bind(8080);