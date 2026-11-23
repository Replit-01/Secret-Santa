export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type BodyType<T> = T;

export class ApiError<T = unknown> extends Error {
  readonly status: number;
  readonly data: T;

  constructor(status: number, data: T) {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type ErrorType<T = unknown> = ApiError<T>;
export type AuthTokenGetter = () => Promise<string | null> | string | null;

let baseUrl: string | null = null;
let authTokenGetter: AuthTokenGetter | null = null;

export function setBaseUrl(url: string | null): void {
  baseUrl = url?.replace(/\/+$/, "") ?? null;
}

export function setAuthTokenGetter(getter: AuthTokenGetter | null): void {
  authTokenGetter = getter;
}

export async function customFetch<T = unknown>(
  input: RequestInfo | URL,
  options: CustomFetchOptions = {},
): Promise<T> {
  const { responseType = "auto", ...init } = options;
  let url: RequestInfo | URL = input;
  if (baseUrl && typeof input === "string" && input.startsWith("/")) {
    url = `${baseUrl}${input}`;
  }

  const headers = new Headers(init.headers);
  if (authTokenGetter && !headers.has("authorization")) {
    const token = await authTokenGetter();
    if (token) headers.set("authorization", `Bearer ${token}`);
  }
  if (typeof init.body === "string" && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
  const rawBody = response.status === 204 ? null : await response.text();
  const mediaType = response.headers.get("content-type") ?? "";
  const wantsText = responseType === "text" || (responseType === "auto" && !mediaType.includes("json"));
  let data: unknown = rawBody;
  if (rawBody !== null && !wantsText && responseType !== "blob") {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = rawBody;
    }
  }
  if (responseType === "blob" && response.ok) {
    return (await response.blob()) as T;
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
