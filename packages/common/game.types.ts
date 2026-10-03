/**
 * STEP 0 — packages/common/src/index.ts
 * -----------------------------------------------------------
 * SHARED DICTIONARY. FE, BE and WS all import from here so that
 * everybody speaks the same "language" (same event names, same shapes).
 *
 * Naming rule:
 *   ClientEvent  = messages FE  -> WS   (uses `payload`)
 *   ServerEvent  = messages WS  -> FE   (uses `data`)
 */

// ---------- Game phases (the state machine) ----------
// LOBBY -> REVEAL -> DISCUSSION -> VOTING -> RESULT -> (next round) -> FINISHED
export type RoomStatus =
  | "LOBBY"
  | "REVEAL"
  | "DISCUSSION"
  | "VOTING"
  | "RESULT"
  | "FINISHED";

// ---------- Settings host chooses when creating a room ----------
export interface RoomSettings {
  totalPlayers: number;       // 3 - 20
  numImposters: number;       // 1 - 3 (max = players / 3)
  categories: string[];       // e.g. ["animals", "food"]
  roomType: "PUBLIC" | "PRIVATE";
  discussionDuration: number; // seconds
  votingDuration: number;     // seconds
}

// ---------- What the FE is allowed to know about a player ----------
export interface PublicPlayer {
  userId: string;
  name: string;
  isOnline: boolean;
  isReady: boolean;
}

// ---------- Safe version of the Room (NO secrets inside) ----------
export interface PublicRoomState {
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: PublicPlayer[];
  playerCount: number;
  maxPlayers: number;
  currentRound: number; // 0 = round 1, 1 = round 2
}

// ---------- FE -> WS ----------
export type ClientEvent =
  | { type: "CREATE_ROOM"; payload: { settings: RoomSettings } }
  | { type: "JOIN_ROOM"; payload: { roomCode: string } }
  | { type: "PLAYER_READY" }
  | { type: "START_GAME" }
  | { type: "START_VOTE" }
  | { type: "VOTE_IMPOSTER"; payload: { suspectId: string } }
  | { type: "LEAVE_ROOM" };

// ---------- WS -> FE ----------
export type ServerEvent =
  | { type: "ROOM_STATE"; data: PublicRoomState }
  | { type: "PLAYER_JOINED"; data: PublicRoomState }
  | { type: "PLAYER_STATUS_CHANGED"; data: { userId: string; isOnline: boolean } }
  | { type: "GAME_STARTED"; data: { round: number } }
  // PRIVATE: sent to ONE player only
  | {
    type: "YOUR_CARD";
    data: { role: "PLAYER" | "IMPOSTER"; word: string; category: string };
  }
  | { type: "TIMER_UPDATE"; data: { secondsLeft: number } }
  | { type: "DISCUSSION_STARTED"; data: { duration: number } }
  | {
    type: "VOTING_OPEN";
    data: { players: { userId: string; name: string }[]; duration: number };
  }
  | { type: "VOTING_UPDATE"; data: { votedCount: number; total: number } }
  | {
    type: "ROUND_RESULT";
    data: {
      round: number;
      eliminatedId: string | null; // null = tie, nobody eliminated
      wasImposter: boolean;
      imposterIds: string[];
      voteCounts: Record<string, number>;
      normalWord: string;
      imposterWord: string;
    };
  }
  | { type: "GAME_FINISHED"; data: Record<string, never> }
  | { type: "ERROR"; data: { message: string } };
