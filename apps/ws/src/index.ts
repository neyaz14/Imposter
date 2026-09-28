import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { authenticateUserFromCookie } from "./authentication";
import "dotenv/config";
import { JWT_SECRECT } from "./types";
const JWT_SECRET =JWT_SECRECT ;
const wss = new WebSocketServer({ port: 8081 });

export interface ExtendedWS extends WebSocket {
    userId: string;
    username: string;
    roomId?: string;
}

// Global state trackers
const onlineUsers = new Map<string, ExtendedWS>();
const rooms = new Map<string, Set<ExtendedWS>>();



// -------------------------------------------------------------
// Helper: Broadcast utilities
// -------------------------------------------------------------
function broadcastToRoom(roomId: string, message: object, senderWs?: WebSocket) {
    const roomClients = rooms.get(roomId);
    if (!roomClients) return;

    const payload = JSON.stringify(message);
    for (const client of roomClients) {
        // If senderWs is provided, optionally exclude sender; otherwise send to all
        if (client.readyState === WebSocket.OPEN && client !== senderWs) {
            client.send(payload);
        }
    }
}

function sendPrivate(targetUserId: string, message: object) {
    const targetWs = onlineUsers.get(targetUserId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify(message));
        return true;
    }
    return false;
}

// -------------------------------------------------------------
// Connection Lifecycle
// -------------------------------------------------------------
wss.on("connection",async (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as ExtendedWS;

    const auth =await authenticateUserFromCookie(req);
console.log('auth inside the index of ws', auth);
    // If cookie is missing, expired, or invalid, abort connection immediately
    if (!auth) {
        ws.send(JSON.stringify({ type: "ERROR", message: "Unauthorized" }));
        ws.close(4001, "Unauthorized");
        return;
    }

    // Successfully authenticated
    ws.userId = auth.id;
    ws.username = auth.username;

    console.log(`[Authenticated] User: ${ws.username} (ID: ${ws.userId})`);

  
    onlineUsers.set(ws.userId, ws);

    console.log(`[Connected] ${ws.username} (${ws.userId})`);

    // Handle incoming client messages
    ws.on("message", (rawEvent) => {
        try {
            const data = JSON.parse(rawEvent.toString());

            switch (data.type) {
                // Room Setup: Join Room
                case "JOIN_ROOM": {
                    const { roomId } = data.payload;
                    ws.roomId = roomId;

                    if (!rooms.has(roomId)) {
                        rooms.set(roomId, new Set());
                    }
                    rooms.get(roomId)!.add(ws);

                    // 4. Server-to-all room message (System announcement)
                    broadcastToRoom(roomId, {
                        type: "SERVER_ANNOUNCEMENT",
                        payload: {
                            system: true,
                            message: `${ws.username} joined the room.`,
                            timestamp: new Date().toISOString()
                        }
                    });
                    break;
                }

                // 2. User sends message to all users in the room
                case "SEND_ROOM_MSG": {
                    if (!ws.roomId) {
                        ws.send(JSON.stringify({ type: "ERROR", message: "You are not in a room" }));
                        return;
                    }

                    // Broadcast to everyone else in the room
                    broadcastToRoom(
                        ws.roomId,
                        {
                            type: "ROOM_MSG",
                            payload: {
                                from: ws.username,
                                userId: ws.userId,
                                message: data.payload.message,
                                timestamp: new Date().toISOString()
                            }
                        },
                        ws // Pass `ws` to skip sending back to sender, or remove to include sender
                    );
                    break;
                }

                // 3. Private message (server directs message to a specific user)
                case "SEND_PRIVATE_MSG": {
                    const { targetUserId, message } = data.payload;

                    const delivered = sendPrivate(targetUserId, {
                        type: "PRIVATE_MSG",
                        payload: {
                            from: ws.username,
                            senderId: ws.userId,
                            message: message,
                            timestamp: new Date().toISOString()
                        }
                    });

                    if (!delivered) {
                        ws.send(
                            JSON.stringify({
                                type: "ERROR",
                                message: `User ${targetUserId} is offline or not found.`
                            })
                        );
                    }
                    break;
                }

                default:
                    ws.send(JSON.stringify({ type: "ERROR", message: "Unknown event type" }));
            }
        } catch (e) {
            ws.send(JSON.stringify({ type: "ERROR", message: "Malformed JSON" }));
        }
    });

    // Cleanup on disconnect
    ws.on("close", () => {
        onlineUsers.delete(ws.userId);

        if (ws.roomId && rooms.has(ws.roomId)) {
            const roomClients = rooms.get(ws.roomId)!;
            roomClients.delete(ws);

            // Server notifies remaining players
            broadcastToRoom(ws.roomId, {
                type: "SERVER_ANNOUNCEMENT",
                payload: {
                    system: true,
                    message: `${ws.username} left the room.`,
                    timestamp: new Date().toISOString()
                }
            });

            if (roomClients.size === 0) {
                rooms.delete(ws.roomId);
            }
        }

        console.log(`[Disconnected] ${ws.username} (${ws.userId})`);
    });
});

console.log("WebSocket server listening on ws://localhost:8081");