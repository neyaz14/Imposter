import type { ServerEvent } from "@repo/common";
import { WebSocket } from "ws";
export interface AuthenticatedSocket extends WebSocket {
    userId : string,
    username: string,
    isAlive: boolean,
    roomCode?: string
}

export function sendJson(ws: WebSocket, event: ServerEvent) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}