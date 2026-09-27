import { Router } from "express";
import { prisma } from "@repo/db";
import { zobject, zodErrorMessage } from "@repo/common";
import { compare, hash } from "bcrypt";
import { sign } from "jsonwebtoken";
import { authMiddleware } from "./autmiddleware";

export const authRouter = Router();

const JWT_SECRECT = process.env.JWT_SECRECT!;

authRouter.post("/register", async (req, res) => {
  const result = zobject.registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: zodErrorMessage({ error: result.error }),
    });
  }

  const { email, password } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? "Email already in use" : "Username already taken",
      });
    }

    const username = email.split("@")[0] ?? "user";
    const hashedPassword = await hash(password, 5);

    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, username },
    });

    return res.status(201).json({
      success: true,
      message: "Registration Successfull",
      data: newUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

authRouter.post("/login", async (req, res) => {
  const result = zobject.loginSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: zodErrorMessage({ error: result.error }),
    });
  }

  const { email, password } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const isPasswordValid = compare(password, existingUser?.password as string);

    if (!isPasswordValid) {
      res.status(403).json({ message: "invalid Password" });
      return;
    }

    const token = sign({ userId: existingUser?.id }, JWT_SECRECT);

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {},
      message: "Login Successfull ",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const userId = req.user;

  const user = await prisma.user.findFirst({
    where: { id: userId?.userId },
    omit: {
      password: true,
    },
    include: {
      rating: true,
      gameMembers: {
        include: {
          game: true
        }
      }
    }
  });

  return res.status(200).json({
    success: true,
    message: "User Found",
    data: user,
  });
});

