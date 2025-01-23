import net from "net";
import { chargerDictionnaire, generateCode, normalizeWords, selectionnerMotsAleatoires } from "./util.js";
import dotenv from 'dotenv';
import { handleGameAttack, handleGameQuit, handleGameTry, handleRoomConnect, handleRoomCreate, handleRoomStart, handleVersionCheck } from "./eventHandle.js";

dotenv.config();

class RequestQueue {
    constructor() {
        this.queue = [];  // File d'attente des requêtes
        this.processing = false;  // Indicateur si une tâche est en cours
    }

    async addToQueue(task) {
        this.queue.push(task);
        if (!this.processing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const task = this.queue.shift();  // Retirer la première tâche de la file
        
        try {
            await task();  // Exécution de la tâche (fonction async)
        } catch (error) {
            console.error("Erreur dans la tâche :", error);
        }

        this.processQueue();  // Traiter la prochaine tâche
    }
}

const gameRooms = [];
const requestQueue = new RequestQueue();

const server = net.createServer(socket => {

    socket.on('data', data => {
        try
        {
            const DATA = JSON.parse(data); // donnée reçue en JSON
            console.log("Requête reçue : " + String(DATA.requestID));
            
            requestQueue.addToQueue(async () => {
                switch (DATA.requestID) {
                    case parseInt(process.env.ROOM_CONNECT, 10):
                        await handleRoomConnect(socket, DATA.userID, gameRooms, DATA);
                        break;
                    case parseInt(process.env.ROOM_CREATE, 10):
                        await handleRoomCreate(gameRooms, socket, DATA);
                        break;
                    case parseInt(process.env.ROOM_START, 10):
                        await handleRoomStart(gameRooms, DATA);
                        break;
                    case parseInt(process.env.GAME_ATTACK, 10):
                        await handleGameAttack(gameRooms, DATA);
                        break;
                    case parseInt(process.env.GAME_TRY, 10):
                        await handleGameTry(gameRooms, DATA);
                        break;
                    case parseInt(process.env.VERSION_CHECK, 10):
                        await handleVersionCheck(socket, DATA);
                        break;
                    case parseInt(process.env.GAME_QUIT, 10):
                        await handleGameQuit(gameRooms, DATA);
                        break;
                    default:
                        console.log("Requête inconnue");
                        break;
                }
            })
        }
        catch (err)
        {
            console.log("Erreur dans les données reçues par le client : " + err);
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

