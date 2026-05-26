import { NextResponse } from "next/server";

import { stackBlitzStarterUrl } from "../example-links";

export const dynamic = "force-static";

// Keep the literal starter URL visible for tests and quick source inspection:
// https://stackblitz.com/fork/github/i-afaqrashid/cms-lab/tree/main/examples/broken-prismic-demo?title=cms-lab%20Broken%20Prismic%20demo
export function GET() {
  return NextResponse.redirect(stackBlitzStarterUrl, 307);
}
