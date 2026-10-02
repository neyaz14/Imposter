import type { WebSocket } from "ws";

export interface WsSuccessResponse<T = unknown> {
  success: true;
  type: string;
  message: string;
  data?: T;
}

export interface WsErrorResponse {
  success: false;
  type: "ERROR";
  message: string;
  errorSources?: {
    path?: string;
    message: string;
  }[];
}

export function sendWsResponse<T>(
  ws: WebSocket,
  response: WsSuccessResponse<T>,
) {
  if (ws.readyState !== ws.OPEN) {
    return;
  }

  ws.send(JSON.stringify(response));
}

export function sendWsError(
  ws: WebSocket,
  response: Omit<WsErrorResponse, "success" | "type">,
) {
  if (ws.readyState !== ws.OPEN) {
    return;
  }

  const payload: WsErrorResponse = {
    success: false,
    type: "ERROR",
    ...response,
  };

  ws.send(JSON.stringify(payload));
}

// ! what client will recive 
/** 
 * {
  "success": false,
  "type": "ERROR",
  "message": "Room not found",
  "errorSources": []
}
 * 
 * 
*/