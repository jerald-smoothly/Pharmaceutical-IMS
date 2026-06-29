import { handlers } from "@/lib/auth";
import type { NextRequest } from "next/server";

type Handler = (req: NextRequest) => Promise<Response>;

export const GET = handlers.GET as unknown as Handler;
export const POST = handlers.POST as unknown as Handler;
