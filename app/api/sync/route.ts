import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const SYNC_KEY = "stock-dashboard:state";

function getClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function passcodeOk(req: NextRequest): boolean {
  const expected = process.env.SYNC_PASSCODE;
  if (!expected) return false;
  const provided = req.headers.get("x-sync-passcode");
  return provided === expected;
}

export async function GET(req: NextRequest) {
  const redis = getClient();
  if (!redis || !process.env.SYNC_PASSCODE) {
    return NextResponse.json({ error: "동기화가 설정되지 않았습니다." }, { status: 503 });
  }
  if (!passcodeOk(req)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const payload = await redis.get(SYNC_KEY);
  return NextResponse.json({ payload: payload ?? null });
}

export async function POST(req: NextRequest) {
  const redis = getClient();
  if (!redis || !process.env.SYNC_PASSCODE) {
    return NextResponse.json({ error: "동기화가 설정되지 않았습니다." }, { status: 503 });
  }
  if (!passcodeOk(req)) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  await redis.set(SYNC_KEY, body);
  return NextResponse.json({ ok: true });
}
