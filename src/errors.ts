export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public detail?: unknown) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown): Response {
  const e = error instanceof HttpError ? error : new HttpError(500, "INTERNAL_ERROR", "Unexpected extraction error");
  return Response.json({ success: false, error: { code: e.code, message: e.message, ...(e.detail === undefined ? {} : { detail: e.detail }) } }, { status: e.status, headers: { "cache-control": "no-store" } });
}
