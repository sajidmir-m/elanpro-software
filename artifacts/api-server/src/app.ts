import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

function resolveAllowedOrigins(): string[] | true {
  const origins = new Set<string>();

  const raw = process.env["FRONTEND_URL"]?.trim();
  if (raw) {
    for (const origin of raw.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  for (const key of ["VERCEL_URL", "VERCEL_BRANCH_URL"] as const) {
    const host = process.env[key]?.trim();
    if (host) origins.add(`https://${host}`);
  }

  if (origins.size === 0) {
    return process.env["NODE_ENV"] === "production" ? [] : true;
  }

  return [...origins];
}

const allowedOrigins = resolveAllowedOrigins();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins === true) return callback(null, true);
      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
