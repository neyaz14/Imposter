import type { WebSocketServer } from "ws"
import type { AuthenticatedSocket } from "./socket"


export const startHeartbeat = (wss: WebSocketServer)=>{
    const interval = setInterval(()=>{
        wss.clients.forEach((client)=>{
            const ws = client as AuthenticatedSocket;
            if(!ws.isAlive){
                ws.terminate();
                return;
            }
            ws.isAlive = false;
            ws.ping();
        })
    },30000)
}