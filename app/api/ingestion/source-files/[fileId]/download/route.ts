import { NextRequest, NextResponse } from "next/server"

import { getBackendBaseUrl } from "@/lib/backend"

type RouteContext = {
  params: Promise<{
    fileId: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { fileId } = await context.params
  const backendResponse = await fetch(
    `${getBackendBaseUrl()}/api/v1/source-items/file-download/${fileId}`,
    {
      cache: "no-store",
    }
  )

  if (!backendResponse.ok || !backendResponse.body) {
    const message = await backendResponse.text()

    return NextResponse.json(
      {
        message: message || "Unable to download source file.",
      },
      {
        status: backendResponse.status,
      }
    )
  }

  return new NextResponse(backendResponse.body, {
    status: 200,
    headers: {
      "Content-Type":
        backendResponse.headers.get("content-type") ??
        "application/octet-stream",
      "Content-Disposition":
        backendResponse.headers.get("content-disposition") ??
        'attachment; filename="download.bin"',
    },
  })
}
