import { NextResponse } from "next/server";
import { emptyUsageSnapshot, getUsageSummary, pricingPlans } from "@/lib/usage-billing";

export async function GET() {
  return NextResponse.json({
    usage: emptyUsageSnapshot,
    summary: getUsageSummary(emptyUsageSnapshot),
    pricingPlans
  });
}
