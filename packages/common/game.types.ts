export type ClientEvent =
  | "room:create"
  | "room:join"
  | "room:leave"
  | "game:start"
  | "game:answer";

export type ServerEvent =
  | "room:created"
  | "room:joined"
  | "player:joined"
  | "player:left"
  | "game:started"
  | "game:question"
  | "game:score"
  | "game:finished"
  | "error";


 export enum FriendStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export enum OperationSign {
  PLUS = "PLUS",
  MINUS = "MINUS",
  MULTIPLY = "MULTIPLY",
  DIVIDE = "DIVIDE",
}

export enum GameMemberStatus {
  WON = "WON",
  LOSS = "LOSS",
}

export enum GameStatus {
  RUNNING = "RUNNING",
  OVER = "OVER",
  SEARCHING_FOR_PLAYER = "SEARCHING_FOR_PLAYER",
}

export interface GameQuestion {
  id: string;
  operation1: number;
  operation2: number;
  sign: OperationSign;
}

export interface GameQuestion {
  id: string;
  operation1: number;
  operation2: number;
  sign: OperationSign;
}

export interface GameInfo {
  gameId: string;
  status: GameStatus;
  timeLimit: number;
  startedAt: string | null;
  endsAt: string | null;
}

export interface GamePlayer {
  userId: string;
  username: string;
  score: number;
}

export interface GameMember {
  userId: string;
  username: string;
  status: GameMemberStatus;
}

export interface GameResult {
  gameId: string;

  winnerId: string | null;

  players: {
    userId: string;
    username: string;
    score: number;
    status: GameMemberStatus;
  }[];
}

export interface JoinRoomPayload {
  gameId: string;
}

export interface LeaveRoomPayload {
  gameId: string;
}

export interface StartGamePayload {
  gameId: string;
}

export interface SubmitAnswerPayload {
  gameId: string;
  questionId: string;
  answer: number;
}

export interface RoomJoinedPayload {
  gameId: string;
  players: GamePlayer[];
}

export interface PlayerJoinedPayload {
  player: GamePlayer;
}

export interface PlayerLeftPayload {
  userId: string;
}

export interface PlayerLeftPayload {
  userId: string;
}

export interface GameStartedPayload {
  gameId: string;
  startedAt: string;
  endsAt: string;
}

export interface GameQuestionPayload {
  question: GameQuestion;
  questionNumber: number;
  totalQuestions: number;
  endsAt: string;
}

export interface ScoreUpdatedPayload {
  scores: Record<string, number>;
}

export interface GameFinishedPayload {
  result: GameResult;
}

export interface ClientMessageFe<T = unknown> {
  type: ClientEvent;
  payload: T;
}

export type ClientMessage =
  | {
      type: "room:join";
      payload: JoinRoomPayload;
    }
  | {
      type: "room:leave";
      payload: LeaveRoomPayload;
    }
  | {
      type: "game:start";
      payload: StartGamePayload;
    }
  | {
      type: "game:answer";
      payload: SubmitAnswerPayload;
    };

export interface ServerMessageWs<T = unknown> {
  type: ServerEvent;
  payload: T;
}

export type ServerMessage =
  | {
      type: "room:joined";
      payload: RoomJoinedPayload;
    }
  | {
      type: "room:left";
      payload: {
        gameId: string;
      };
    }
  | {
      type: "player:joined";
      payload: PlayerJoinedPayload;
    }
  | {
      type: "player:left";
      payload: PlayerLeftPayload;
    }
  | {
      type: "game:started";
      payload: GameStartedPayload;
    }
  | {
      type: "game:question";
      payload: GameQuestionPayload;
    }
  | {
      type: "game:score_updated";
      payload: ScoreUpdatedPayload;
    }
  | {
      type: "game:finished";
      payload: GameFinishedPayload;
    }
  | {
      type: "error";
      payload: {
        code: string;
        message: string;
      };
    };