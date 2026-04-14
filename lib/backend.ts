const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000"

type BackendErrorPayload = {
  message?: string
}

function getBackendUrl() {
  return BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL
}

export function getBackendBaseUrl() {
  return getBackendUrl()
}

export async function fetchBackendJson<T>(
  pathname: string,
  init: RequestInit = {}
) {
  let response: Response

  try {
    response = await fetch(`${getBackendUrl()}${pathname}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    })
  } catch (error) {
    throw new Error(
      `Backend is unreachable at ${getBackendUrl()}. ${
        error instanceof Error ? error.message : "Request failed."
      }`
    )
  }

  if (!response.ok) {
    let message = `Backend request failed for ${pathname}.`

    try {
      const payload = (await response.json()) as BackendErrorPayload
      message = payload.message ?? message
    } catch {}

    throw new Error(message)
  }

  return (await response.json()) as T
}

export async function postBackendJson<T>(
  pathname: string,
  body: Record<string, unknown> = {}
) {
  return fetchBackendJson<T>(pathname, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
