import type { WebSocket } from "ws";

import { wsErrorHandler } from "./errorHandler";

type AsyncWsHandler<TArgs extends unknown[] = unknown[]> = (
  ws: WebSocket,
  ...args: TArgs
) => Promise<void>;

export function tryCatch<TArgs extends unknown[]>(
  handler: AsyncWsHandler<TArgs>,
): AsyncWsHandler<TArgs> {
  return async (ws: WebSocket, ...args: TArgs) => {
    try {
      await handler(ws, ...args);
    } catch (error) {
      wsErrorHandler(error, ws);
    }
  };
}