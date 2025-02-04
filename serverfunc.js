import net from "net";
import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";
import dotenv from 'dotenv';
import { ServerData } from "./constructors.js";

export function sendRequest(requestID, socket, userID, data)
{
    try
    {
        var to = new ServerData(parseInt(requestID, 10), userID, data);
        to = JSON.stringify(to);
        const res = socket.write(to);

        if (res)
        console.log("Requête de type " + String(requestID) + " envoyée : " + String(socket.remoteAddress) + ":" + String(socket.remotePort));
    }
    catch (err)
    {
        console.log("Requête de type " + String(requestID) + " non-envoyée : " + err);
    }
}

export function sendRequestRoom(requestID, targetRoom, data)
{
    for (var i = 0; i < targetRoom.members.length; i++)
    {
        sendRequest(requestID, targetRoom.members[i].socket, targetRoom.members[i].userID, data);
    }
}

export function syncRoom(requestID, targetRoom, targets, data)
{
    for (var i = 0; i < targetRoom.members.length; i++)
    {
        sendRequest(requestID, targetRoom.members[i].socket, data.userID, { room: targetRoom, playerdata: targetRoom.members[i], targets: targets });
    }
    console.log("SYNC !");
}

export function findRoom(gameRooms, code)
{
    const index = gameRooms.findIndex(cell => cell.code === code);
    return gameRooms[index];
}

export function membersDistributeAttack(nbAttack, members, originUserID)
{
    const targets = [];
    try
    {
        let attempts = members.length * 2;
        while (nbAttack > 0 || attempts > 0) // Distribuer dégâts
        {
            var randIndex = Math.floor(Math.random() * members.length);
            var member = members[randIndex]
            if (member.userID != originUserID)
            {
                targets.push(member.userID);
                if (member.nbArmor > 0)
                    member.nbArmor--;
                else
                    member.nbHealth--;
    
                nbAttack--;
            }
            attempts--;
        }
        console.log("Dégâts distribués");
    }
    catch (err)
    {
        console.log("Erreur lors de la distribution des dégâts : " + err);
    }
    
    return targets;
}

export function membersDestroyDead(targetRoom, members, data, targets)
{
    try
    {
        for (var i = (members.length - 1); i >= 0; i--)
        {
            if (members[i].nbHealth <= 0)
            {
                sendRequest(process.env.GAME_LOOSE, members[i].socket, data.userID, { isLoose : true });
                members.splice(i, 1);
                sendRequestRoom(process.env.ROOM_SYNC, targetRoom, { room: targetRoom, playerdata: members[i], targets: targets });
                console.log("Joueur mort : " + members[i].address);
            }
        }
    }
    catch (err)
    {
        console.log("Erreur lors de l'élimination de joueurs : " + err);
    }
}