import { NextResponse } from "next/server";

const DISABLED_MESSAGE =
  "Webhooks are disabled until provider verification and handlers are implemented.";

function disabledResponse() {
  return NextResponse.json(
    {
      error: DISABLED_MESSAGE
    },
    { status: 501 }
  );
}

export async function POST() {
  return disabledResponse();
}

export async function GET() {
  return disabledResponse();
}
