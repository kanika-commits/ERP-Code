import type { Handler, HandlerEvent } from '@netlify/functions';

export function routeFromNetlifyHandler(handler: Handler) {
  return async function adaptedRoute(request: Request) {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    const response = await handler(
      {
        body,
        headers,
        httpMethod: request.method,
      } as HandlerEvent,
      {} as never,
    );

    if (!response) {
      return Response.json({ error: 'No response from API route.' }, { status: 500 });
    }

    return new Response(response.body ?? '', {
      headers: {
        'content-type': 'application/json',
        ...(response.headers as Record<string, string> | undefined),
      },
      status: response.statusCode,
    });
  };
}
