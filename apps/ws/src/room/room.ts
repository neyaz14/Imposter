import type {ServerEvent} from "@repo/common";
import { sendJson } from "../connection/socket";
import type { WebSocket } from "ws";

type RoomStatus = "LOBBY" | "REVEAL" | "DISCISSION" | "VOTING" | "RESULT" | "FINISHED" | "WAITING"

export interface Player {
    userId: string,
    name: string,
    isOnline: boolean,
    isReady: boolean
}

export interface Game {
    category: string;
    normalWord: string;
    imposterWord: string;
    impostersId: Set<string>;
}

export interface Round {
    votes: Map<string, string>; // voterId -> suspectId
    imposterIds: string[];
    normalWord: string;
    imposterWord: string;
    eliminatedId: string | null;
    wasImposter: boolean | null;
}

export const createRound = (): Round => ({
    votes: new Map(),
    imposterIds: [],
    normalWord: "",
    imposterWord: "",
    eliminatedId: null,
    wasImposter: null,
})

export interface Runtime {
    connections: Map<string, WebSocket>; // userId -> socket
    timer: NodeJS.Timeout | null;
    countdownEndsAt: number | null;      // ms timestamp, for reconnect
}

export interface RoomSettings {

}
export class Room {

    public status: RoomStatus = "LOBBY";
    public players = new Map<string, Player>();
    public game: Game | null = null;
    public currentRound: 0 | 1 = 0;
    public rounds: [Round, Round] = [createRound(), createRound()];

    public runtime: Runtime = {
        connections: new Map(),
        timer: null,
        countdownEndsAt: null,
    };



    constructor(
        public readonly roomCode: string,
        public hostId: string,
        public settings: RoomSettings
    ) { }

    // ---- helpers ----
    get round(): Round {
        return this.rounds[this.currentRound];
    }

    getOnlinePlayers(): Player[] {
        return [...this.players.values()].filter((p) => p.isOnline);
    }

    // ---- messaging ----
    broadcast(event: ServerEvent) {
        for (const ws of this.runtime.connections.values())  {
            sendJson(ws, event);
        }
    }

    sendTo(userId: string, event: ServerEvent) {
        const ws = this.runtime.connections.get(userId);
        if (ws) sendJson(ws, event);
    }

}