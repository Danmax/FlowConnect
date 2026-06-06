import { NextRequest, NextResponse } from "next/server";
import { trackEmptyUsage } from "@/lib/usage-events";
import { getRequestUserId } from "@/lib/request-user";
import type { UsageMetric } from "@/lib/usage-billing";

const usageMetrics: UsageMetric[] = [
  "workflowRuns",
  "apiCalls",
  "aiActionUsage",
  "activeWorkflows",
  "activeConnections",
  "formSubmissions",
  "storageMb"
];

export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Authenticated user id is required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    metric?: UsageMetric;
    quantity?: number;
    sourceId?: string;
  };

  if (!body.metric || !usageMetrics.includes(body.metric)) {
    return NextResponse.json({ error: "A valid usage metric is required." }, { status: 400 });
  }

  const quantity = Number(body.quantity ?? 1);

  if (!Number.isInteger(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be a positive integer." }, { status: 400 });
  }

  const result = trackEmptyUsage(userId, body.metric, quantity, body.sourceId);

  return NextResponse.json(result, { status: result.accepted ? 202 : 402 });
}
