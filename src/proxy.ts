import { NextResponse, type NextRequest } from "next/server";
import { localeFrom } from "./app/_lib/locale.ts";
import { LOCALE_HEADER } from "./app/_lib/application.ts";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, localeFrom(request.nextUrl.searchParams.get("lang")));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: "/" };
