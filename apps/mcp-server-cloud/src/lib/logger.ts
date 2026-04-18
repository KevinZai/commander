import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.nodeEnv === "production" ? "info" : "debug",
  transport:
    env.nodeEnv !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
