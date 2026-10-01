import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { authenticateUserFromCookie } from "./authentication";
import "dotenv/config";
import { JWT_SECRECT } from "./types";
const JWT_SECRET = JWT_SECRECT;
const wss = new WebSocketServer({ port: 8081 });

export interface AuthenticatedSocket extends WebSocket {
    userId: string;
    username: string;
    roomId?: string;
}




// -------------------------------------------------------------
// Connection Lifecycle
// -------------------------------------------------------------
wss.on("connection", (rawSocket, req) => {
    // console.log("raw", rawSocket);
    // console.log("req --------->>>>", req);
    const ws = rawSocket as AuthenticatedSocket;
    // console.log('ws as authenticated socket ----->>', ws);


    // ! 1 -  Authenticate 
    // ! 2 - Attach identity of user in the ws

    // ! ping pong

    // * every msg lands from here 
    ws.on("message", (raw) => {
        try {

            const event = JSON.parse(raw.toString());
            console.log("inside the authenticated ws =========>>>>>> ", event);
        } catch (error) {
            // ! create proper error handling
            console.log("Error from index.ts ws.on.msg", error);
        }
    })

    // ! close browser
    // ! erroe 

})

console.log("WebSocket server listening on ws://localhost:8081");


