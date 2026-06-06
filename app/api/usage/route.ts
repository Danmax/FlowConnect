import { NextResponse } from "next/server";
import { demoUsage, getUsageSummary, pricingPlans } from "@/lib/usage-billing";

export async function GET() {
  return NextResponse.json({
    usage: demoUsage,
    summary: getUsageSummary(demoUsage),
    pricingPlans
  });
}
