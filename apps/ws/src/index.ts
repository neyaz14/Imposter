import { WebSocket, WebSocketServer } from "ws";
import { authenticationUserBeforeOnline } from "./authentication";

const wss = new WebSocketServer({ port: 8080 });

const onlineUsers = new Map();
const games: Map<string, Game> =new Map();

type ExtendedWS = WebSocket & { userId: string };

wss.on("connection", async (ws: ExtendedWS, req: Request) => {

    const verifyInfo = await authenticationUserBeforeOnline(ws, req);
    if (!verifyInfo) {
        return;
    }
    // set user or online user
    onlineUsers.set(verifyInfo.decoded.userId, {
        name: verifyInfo.user.username,
        ws,
        id: verifyInfo.user.id
    })
    // set the userId 
    ws.userId = verifyInfo.decoded.userId;
    // send this event to everyone that someone just become online
    wss.clients.forEach((wsAll) => {
        wsAll.send(JSON.stringify({
            type: "ONLINE_USERS",
            payload: {
                users: Array.from(onlineUsers)
            }
        }))
    })



    ws.on("message", (event) => {
        const parsedData = JSON.parse(event.toString());

        if (parsedData.type = "PLAY_GAME") {
            // onlineUsers.set();
            const { } = parsedData.payload;
            games.set({
                status : "SEARCHING_FOR_PLAYER",
                members:[{
                    id: verifyInfo.user.id,
                    name: verifyInfo.user.username
                }
                ],
                adminId: verifyInfo.user.id,

                questins: [],
                answers: []
            })
        }
    })
})