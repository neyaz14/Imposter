import "dotenv/config";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
});

export const JWT_SECRECT = process.env.JWT_SECRET ;