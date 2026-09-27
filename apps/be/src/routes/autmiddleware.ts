import type { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";

const JWT_SECRECT = process.env.JWT_SECRECT!;

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token: string = req.cookies.accessToken;
  console.log(token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    // const decoded = verify(token, JWT_SECRECT) as {
    //   userId: string;
    // };
    const decoded = verifyToken(token);
    console.log("inside autmiddleware - decoded", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const verifyToken = (givenToken: string) => {
  const decodedToken = verify(givenToken, JWT_SECRECT) as {
    userId: string;
  };;

  return decodedToken;
}