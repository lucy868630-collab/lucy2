import { handle } from "../../../src/shared/http";
import { analyzeInsights, listInsights } from "../../../src/features/insights/controller";

export const dynamic = "force-dynamic";

export const GET = handle(listInsights);
export const POST = handle(analyzeInsights);
