import { IncomingMessage } from "http";
import * as cookie from "cookie";
import "dotenv/config";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import { JWT_SECRECT } from "./types";


const JWT_SECRET = JWT_SECRECT;
const COOKIE_NAME = "accessToken";

console.log('jwt', JWT_SECRET);
export interface AuthPayload {
  userId: string;
}

export async function authenticateUserFromCookie(req: IncomingMessage) {
  try {
    const rawCookies = req.headers.cookie;
    if (!rawCookies) {
      console.warn("WS Auth Failed: No cookie header found in handshake.");
      return null;
    }

    // Call parse directly
    const parsedCookies = cookie.parseCookie(rawCookies);
    const token = parsedCookies[COOKIE_NAME];

    if (!token) {
      console.warn(`WS Auth Failed: '${COOKIE_NAME}' not found in cookies.`);
      return null;
    }

    if (!JWT_SECRET) {
      console.error("WS Auth Failed: JWT_SECRET is not configured.");
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload
    if (!decoded.userId || typeof decoded.userId !== "string") {
      console.warn("WS Auth Failed: Token payload missing a valid userId.");
      return null;
    }

    // Query database here
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
      },
    });

    if (!user) {
      console.warn(`WS Auth Failed: User ${decoded.userId} not found in database.`);
      return null;
    }

    return user; // Returns { id: string, username: string }
    
  } catch (error) {
    console.error("WS Auth Failed: Invalid or expired token.", error);
    return null;
  }
}