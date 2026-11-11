import { NextResponse } from "next/server";
import { buildPartyIcs } from "@/lib/party-calendar";
import { getStore } from "@/lib/store";

/** Public ICS download for “Add to calendar” CTAs in guest emails. */
export async function GET() {
  const store = await getStore();
  const ics = buildPartyIcs(store.content);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="landon-jordan-80s-party.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
}
