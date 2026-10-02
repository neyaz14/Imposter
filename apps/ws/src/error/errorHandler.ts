
import type { WebSocket } from "ws";

import { AppError } from "./AppError";
import { sendWsError } from "../utils/wsResponse";
import { Prisma } from "@repo/db";

export function wsErrorHandler(
  error: unknown,
  ws: WebSocket,
) {
  console.error("WebSocket Error:", error);

  // --------------------------------
  // AppError
  // --------------------------------

  if (error instanceof AppError) {
    sendWsError(ws, {
      message: error.message,
      errorSources: error.errorSources,
    });

    return;
  }

 

  // --------------------------------
  // Prisma Errors
  // --------------------------------

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        sendWsError(ws, {
          message: "Duplicate resource",
          errorSources: [
            {
              message: "A resource with this value already exists",
            },
          ],
        });
        return;

      case "P2025":
        sendWsError(ws, {
          message: "Resource not found",
        });
        return;

      case "P2003":
        sendWsError(ws, {
          message: "Invalid related resource",
        });
        return;

      default:
        sendWsError(ws, {
          message: "Database operation failed",
        });
        return;
    }
  }

  // --------------------------------
  // Prisma Validation Error
  // --------------------------------

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendWsError(ws, {
      message: "Invalid database operation",
    });

    return;
  }

  // --------------------------------
  // Unknown Error
  // --------------------------------

  sendWsError(ws, {
    message: "Internal server error",
  });
}