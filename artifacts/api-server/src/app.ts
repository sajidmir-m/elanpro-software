import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import type { IncomingMessage, ServerResponse } from "node:http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Application = express();
const isServerless = Boolean(process.env.VERCEL);

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

if (!isServerless) {
  const { pinoHttp } = globalThis.require("pino-http") as typeof import("pino-http");
  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req: IncomingMessage & { id?: string }) {
          return {
            id: req.id,
            method: req.method,
            url: req.url?.split("?")[0],
          };
        },
        res(res: ServerResponse) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );
}

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

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Vercel rewrites can strip the /api prefix before the handler runs.
if (isServerless) {
  app.use(router);
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled API error");
  if (res.headersSent) return;
  res.status(500).json({
    error: err instanceof Error ? err.message : "Internal server error",
  });
});

export default app;
