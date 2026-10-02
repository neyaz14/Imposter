
import { WebSocket } from "ws";
export interface AuthenticatedSocket extends WebSocket {
    userId : string,
    username: string,
    isAlive: boolean,
    roomCode?: string
}