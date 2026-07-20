export async function fetchAdmin(url: string, init?: Omit<RequestInit, 'body'> & { body?: any }): Promise<Response> {
  const token = localStorage.getItem("admin_token");
  const headers = new Headers(init?.headers as HeadersInit);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = init?.body;
  // If body is a plain object, automatically stringify it and set content-type
  if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
    body = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
    ...(body !== undefined ? { body } : {}),
  });

  // If the response is OK but not JSON (e.g. intercepted by proxy or SPA fallback), 
  // pretend it failed to prevent JSON parse errors.
  const contentType = response.headers.get("content-type");
  if (response.ok && contentType && !contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Invalid content type received" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return response;
}
