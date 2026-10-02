import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { authenticateUserFromCookie } from "./authentication";
import "dotenv/config";
import { JWT_SECRECT } from "./types";
import { wsErrorHandler } from "./error/errorHandler";
import type { AuthenticatedSocket } from "./connection/socket";
import { startHeartbeat } from "./connection/startHeartbeat";
const JWT_SECRET = JWT_SECRECT;
const wss = new WebSocketServer({ port: 8081 });



//  Heartbeat code
startHeartbeat(wss)

// -------------------------------------------------------------
// Connection Lifecycle
// -------------------------------------------------------------
wss.on("connection",async (rawSocket, req: IncomingMessage) => {
    const ws = rawSocket as AuthenticatedSocket;
    // console.log('ws as authenticated socket ----->>', ws);


    // 1 -  Authenticate 
    const user = await authenticateUserFromCookie(req);
    if(!user){
        ws.close(4001, "Not found user");
        return null;
    }
    //  2 - Attach identity of user in the ws
    ws.userId = user.id;
    ws.username = user.username;
    ws.isAlive = true

    // 3) If this user was already in a room (refresh / net drop),
  //    put them back into it.
//   roomHandlers.reconnect(ws);
    //  ping pong
    ws.on("pong", ()=>{
        ws.isAlive = true
    })

    // * every msg lands from here 
    ws.on("message", (raw) => {
        try {

            const event = JSON.parse(raw.toString());
            console.log("inside the authenticated ws =========>>>>>> ", event);
        } catch (error) {
            // ! create proper error handling
            console.log("Error from index.ts ws.on.msg", error);
            wsErrorHandler(error, ws);
        }
    })

    // ! close browser
    // ! erroe 

})

console.log("WebSocket server listening on ws://localhost:8081");


