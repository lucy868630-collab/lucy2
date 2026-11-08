import { config } from "../../../src/shared/config";
import { handle, json } from "../../../src/shared/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, { requestId }) =>
  json(
    {
      status: "ok",
      service: config.app.name,
      version: config.app.version,
      timestamp: new Date().toISOString(),
    },
    { requestId }
  )
);
