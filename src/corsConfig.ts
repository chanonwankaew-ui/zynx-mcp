import type { CorsOptions } from "cors";

const rawCorsOrigin = process.env.ZYNX_CORS_ORIGIN ?? "*";
const configuredOrigins = rawCorsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowFileOrigin = process.env.NODE_ENV !== "production" && process.env.ZYNX_ALLOW_FILE_ORIGIN !== "false";

function originAllowed(origin: string | undefined) {
  if (!origin) return true;
  if (configuredOrigins.includes("*")) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (origin === "null" && (allowFileOrigin || configuredOrigins.includes("null"))) return true;

  return false;
}

export function zynxCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (originAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin "${origin}" is not allowed`));
    }
  };
}

export function describeCorsOrigins() {
  const origins = configuredOrigins.length ? configuredOrigins.join(", ") : "*";
  return allowFileOrigin ? `${origins} + file:// dev origin` : origins;
}

