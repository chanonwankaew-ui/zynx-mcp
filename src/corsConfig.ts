import type { CorsOptions } from "cors";
import { agentBackendPort } from "./config.js";

const isProduction = process.env.NODE_ENV === "production";
const rawCorsOrigin = process.env.ZYNX_CORS_ORIGIN ?? (isProduction ? "" : "*");
const configuredOrigins = rawCorsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// File origin is strictly forbidden in production
const allowFileOrigin = !isProduction && process.env.ZYNX_ALLOW_FILE_ORIGIN !== "false";

// Same-origin from the backend's own port — the dashboard is served by the backend itself,
// so the browser sends Origin: http://localhost:{port}. Always allow this.
const selfOrigins = [
  ,
  ,
];

function originAllowed(origin: string | undefined) {
  if (!origin) return !isProduction;
  // Wildcard '*' is strictly forbidden in production
  if (!isProduction && configuredOrigins.includes("*")) return true;
  if (configuredOrigins.includes(origin)) return true;
  if (selfOrigins.includes(origin)) return true;
  if (origin === "null" && allowFileOrigin) return true;

  return false;
}

export function zynxCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (originAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error());
    }
  };
}

export function describeCorsOrigins() {
  const origins = configuredOrigins.length ? configuredOrigins.join(", ") : (isProduction ? "(none configured)" : "*");
  const self = selfOrigins.join(", ");
  return allowFileOrigin ?  : ;
}
