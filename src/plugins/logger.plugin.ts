import { Elysia } from "elysia";

const requestStarts = new WeakMap<Request, number>();
const loggedRequests = new WeakSet<Request>();

function requestPath(request: Request): string {
  const url = new URL(request.url);
  return `${url.pathname}${url.search}`;
}

function statusCode(status: number | string | undefined): number | string {
  return status ?? 200;
}

function logRequest({
  request,
  status,
  error,
}: {
  request: Request;
  status?: number | string | undefined;
  error?: unknown;
}) {
  if (loggedRequests.has(request)) {
    return;
  }

  loggedRequests.add(request);
  const startedAt = requestStarts.get(request) ?? performance.now();
  requestStarts.delete(request);

  const durationMs = Math.round(performance.now() - startedAt);
  const message = `${request.method} ${requestPath(request)} ${String(
    statusCode(status)
  )} ${String(durationMs)}ms`;

  if (error) {
    console.error(`[http] ${message}`, error);
    return;
  }

  console.info(`[http] ${message}`);
}

export const loggerPlugin = new Elysia({ name: "logger" })
  .onRequest(({ request }) => {
    requestStarts.set(request, performance.now());
  })
  .onAfterResponse(({ request, set }) => {
    logRequest({ request, status: set.status });
  })
  .onError(({ request, set, error }) => {
    logRequest({ request, status: set.status, error });
  })
  .as("global");
