// Responses, and who may read them. The site posts with simple requests (form data or text), so browsers never
// need a preflight; the CORS headers only let the site's own pages read the reply.

export function allowedOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get('Origin');
  const allowed = [env.SITE_ORIGIN, ...env.DEV_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)];
  return origin && allowed.includes(origin) ? origin : null;
}

export function withCors(response: Response, origin: string | null): Response {
  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export const noContent = () => new Response(null, { status: 204 });

export const redirect = (location: string) => new Response(null, { status: 303, headers: { Location: location } });
