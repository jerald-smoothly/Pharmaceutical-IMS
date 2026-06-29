import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi-spec";

export async function GET() {
  return NextResponse.json(openapiSpec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
