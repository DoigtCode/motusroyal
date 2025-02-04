import net from "net";
import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";
import dotenv from 'dotenv';
import { findRoom, membersDestroyDead, membersDistributeAttack, sendRequest, sendRequestRoom, syncRoom } from "./serverfunc.js";
import { PlayerData, Room } from "./constructors.js";

export function handleRoomConnect(socket, userID, gameRooms, data)
{
    const targetRoom = findRoom(gameRooms, data.data.code);
    if (targetRoom)
    {
        if (targetRoom.isOpen)
        {
            targetRoom.members.push(new PlayerData("test", socket.remoteAddress, socket.remotePort, userID, socket));
            sendRequest(process.env.ROOM_CONNECT, socket, userID, {state : true, code : targetRoom.code});
            console.log("Joueur ajouté à la room " + targetRoom.code + "(" + targetRoom.members.length + ")");
        }
        else
            console.log("Room fermée, joueur refusé.")
    }
    else
    {
        sendRequest(process.env.ROOM_CONNECT, socket, userID, {state : false});
        console.log("Joueur refusé dans la room, mauvais code");
    }
}

export function handleRoomCreate(gameRooms, socket, data)
{
    try
    {
        const roomCode = generateCode()
        gameRooms.push(new Room(roomCode, new PlayerData("", socket.remoteAddress, socket.remotePort, data.userID, socket)));
        sendRequest(process.env.ROOM_CREATE, socket, data.userID, { code: roomCode });
        console.log("Nouvelle room créée : " + String(roomCode));
    }
    catch(err)
    {
        console.log("Echec dans la création de la room : " + err);
    }
}

export function handleRoomStart(gameRooms, data)
{
    const targetRoom = findRoom(gameRooms, data.data.code);
    if (targetRoom)
    {
        targetRoom.isOpen = false;
        syncRoom(process.env.ROOM_START , targetRoom, [], data);
        console.log("La room a démarré : " + targetRoom.code);
    }
    else
    {
        console.log("La room n'a pas démarré, elle est introuvable.")    
    }
}

export function handleGameAttack(gameRooms, data)
{
    try
    {
        const targetRoom = findRoom(gameRooms, data.data.code);
        if (targetRoom && targetRoom.members.length > 1)
        {
            const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == data.userID);
            const nbAttack = data.data.nbAttack;
    
            targetRoom.members[indexOrigin].nbArmor += Math.floor(nbAttack / 2);
            targetRoom.members[indexOrigin].nbWords++;
            targetRoom.members[indexOrigin].nbTry = 0;
            targetRoom.members[indexOrigin].tries = [];
    
            const targets = membersDistributeAttack(nbAttack, targetRoom.members, data.userID);
    
            syncRoom(process.env.ROOM_SYNC, targetRoom, targets, data);
            membersDestroyDead(targetRoom, targetRoom.members, data, targets);
        }
        console.log("Les dégâts ont été distribués");
    }
    catch (err)
    {
        console.log("Erreur lors de la distribution des dégâts : " + err);
    }
}

export function handleGameTry(gameRooms, data)
{
    try
    {
        const targetRoom = findRoom(gameRooms, data.data.code);
        if (targetRoom)
        {
            const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == data.userID);
    
            targetRoom.members[indexOrigin].nbTry++;
            targetRoom.members[indexOrigin].tries.push(data.data.verdict_);
    
            if (targetRoom.members[indexOrigin].nbTry > targetRoom.nbTryMax)
            {
                targetRoom.members[indexOrigin].nbTry = 0;
                targetRoom.members[indexOrigin].nbWords++;
                targetRoom.members[indexOrigin].tries = [];
            }
    
            syncRoom(process.env.ROOM_SYNC, targetRoom, [], data);
        }
        console.log("Le try a été effectué et synchronisé");
    }
    catch (err)
    {
        console.log("Erreur lors du try : " + err);
    }
}

export function handleVersionCheck(socket, data)
{
    try
    {
        const isValid = (data.data.version == parseInt(process.env.VERSION, 10));
        sendRequest(process.env.VERSION_CHECK, socket, data.userID, { version: isValid });
        console.log(isValid ? "Version valide, joueur connecté au serveur" : "Version invalide, joueur rejeté");   
    }
    catch (err)
    {
        console.log("Erreur lors du check de la version");
    }
}

export function handleGameQuit(gameRooms, data)
{
    try
    {
        const index = gameRooms.findIndex(cell => cell.code === data.data.code);
        const targetRoom = findRoom(gameRooms, data.data.code);
        if (targetRoom)
        {
            const indexOrigin = targetRoom.members.findIndex((elem) => elem.userID == data.userID);
            targetRoom.members.splice(indexOrigin, 1);
            if (targetRoom.members.length <= 0)
            {
                console.log("Room vide supprimée : " + targetRoom.code);
                gameRooms.splice(index, 1);
            }
            console.log("Joueur déconnecté supprimé de la room ! Room actives : " + gameRooms.length);
        } 
    }
    catch (err)
    {
        console.log("Erreur lors du quit d'un joueur : " + err);
    }
}