type LogValue = Record<string, unknown> | undefined;

function emit(level: string, first: LogValue | string, second?: string) {
  if (typeof first === "string") {
    console.log(JSON.stringify({ level, msg: first }));
    return;
  }

  console.log(
    JSON.stringify({
      level,
      ...(first ?? {}),
      ...(second ? { msg: second } : {}),
    }),
  );
}

const serverlessLogger = {
  info(first: LogValue | string, second?: string) {
    emit("info", first, second);
  },
  error(first: LogValue | string, second?: string) {
    emit("error", first, second);
  },
  warn(first: LogValue | string, second?: string) {
    emit("warn", first, second);
  },
  debug(first: LogValue | string, second?: string) {
    emit("debug", first, second);
  },
  child() {
    return serverlessLogger;
  },
};

function createNodeLogger() {
  // Loaded lazily so Vercel bundles can tree-shake pino entirely.
  const pino = globalThis.require("pino") as typeof import("pino").default;
  const isProduction = process.env.NODE_ENV === "production";

  return pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "res.headers['set-cookie']",
    ],
    ...(isProduction
      ? {}
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }),
  });
}

export const logger = process.env.VERCEL ? serverlessLogger : createNodeLogger();
