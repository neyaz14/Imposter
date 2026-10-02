export interface ErrorSource {
  path?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errorSources: {
    path?: string;
    message: string;
  }[] = [];

  constructor(
    statusCode: number,
    code: string,
    message: string,
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;

    Error.captureStackTrace(this, AppError);
  }
}


// ! What will it return 
/**
 * throw new AppError(404, "Room not found");
 * 
 * 
 * throw new AppError(400, "Invalid game state", [
  {
    path: "status",
    message: "Game has already started",
  },
]);
 * 
*/