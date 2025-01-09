import dgram from "dgram";
import { generateCode } from "./util.js";
import dotenv from 'dotenv';
dotenv.config();

function ServerData(requestID, userID, data)
{
	this.requestID = requestID;
	this.userID = userID;
	this.data = data;
}

function PlayerData(pseudo, address, userID)
{
    this.pseudo = pseudo;
    this.address = address;
    this.userID = userID;
}

function Room(code, host)
{
    this.code = code;
    this.members = [];
    this.members.push(host);
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
                targetRoom.members.push(new PlayerData("test", rinfo.address, from.userID));

                to = new ServerData(parseInt(process.env.ROOM_CONNECT, 10), from.userID, true);
                to = JSON.stringify(to);
                server.send(to, rinfo.port, rinfo.address);
                console.log("Requête envoyée : " + String(rinfo.address));

                console.log("Joueur ajouté à la room " + targetRoom.code);
                console.log("Joueurs dans la room " + targetRoom.code + " : " + targetRoom.members.length);
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
            gameRooms.push(new Room(roomCode, new PlayerData("", rinfo.address, from.userID)));

            to = new ServerData(parseInt(process.env.ROOM_CREATE, 10), from.userID, { code: roomCode });
            to = JSON.stringify(to);
            server.send(to, rinfo.port, rinfo.address);
            console.log("Requête envoyée : " + String(rinfo.address));

            console.log("Nouvelle room créée : " + String(roomCode));
            break;
        case parseInt(process.env.ROOM_START, 10):
            var index = gameRooms.findIndex(cell => cell.code === from.data.code);
            if (index !== -1)
            {
                const targetRoom = gameRooms[index];
                for (var i = 0; i < targetRoom.members.length; i++)
                {
                    to = new ServerData(parseInt(process.env.ROOM_START, 10), targetRoom.members[i].userID, true);
                    to = JSON.stringify(to);
                    server.send(to, rinfo.port, targetRoom.members[i].address);
                    console.log("Requête envoyée : " + String(targetRoom.members[i].address));
                }
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