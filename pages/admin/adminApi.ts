export async function fetchAdmin(url: string, init?: Omit<RequestInit, 'body'> & { body?: any }): Promise<Response> {
  let token = null;
  try {
    token = localStorage.getItem("admin_token") || localStorage.getItem("user_token") || localStorage.getItem("chat_user_token");
  } catch (e) {
    console.warn("[adminApi] localStorage is blocked/unavailable:", e);
  }
  const headers = new Headers(init?.headers as HeadersInit);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body = init?.body;
  if (body !== undefined && body !== null) {
    if (typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams)) {
      body = JSON.stringify(body);
    }
    if (typeof body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body } : {}),
  });

  // If an API request returns HTML (e.g. Vite SPA fallback for an invalid route or Express 500/404 HTML),
  // return a synthetic JSON response to prevent "Unexpected token '<'" parse errors.
  const contentType = response.headers.get("content-type") || "";

  if (response.ok && contentType.includes("text/html")) {
    return new Response(JSON.stringify({ 
      error: "API route returned HTML page instead of API response" 
    }), {
      status: 404,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (!response.ok && !contentType.includes("application/json")) {
    return new Response(JSON.stringify({ 
      error: `Server returned ${response.status} (${response.statusText || 'Error'})` 
    }), {
      status: response.status >= 400 ? response.status : 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  return response;
}
