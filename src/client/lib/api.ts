interface ApiErrorShape {
  error?: { code?: string; message?: string; issues?: unknown[] };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let payload: ApiErrorShape = {};
    try {
      payload = (await response.json()) as ApiErrorShape;
    } catch {
      // The status text remains a useful fallback for non-JSON proxy errors.
    }
    throw new ApiError(
      response.status,
      payload.error?.code ?? "REQUEST_FAILED",
      payload.error?.message ?? response.statusText ?? "Request failed",
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

