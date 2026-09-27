import express from "express";
import { prisma } from "@repo/db";
import "dotenv/config";
import { authRouter } from "./routes/auth.router";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRouter);

// 2. Fetch all users API endpoint (wrapped in try/catch)
app.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});

