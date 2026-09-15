export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (!["https:", "http:"].includes(parsed.protocol)) return false;
    // Next may use an internal hostname in request.url behind a reverse proxy.
    // Host is the inbound site hostname and cannot be set by browser script.
    return (
      parsed.host === (request.headers.get("host") || new URL(request.url).host)
    );
  } catch {
    return false;
  }
}
