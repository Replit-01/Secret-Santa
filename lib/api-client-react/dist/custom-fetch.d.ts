export type CustomFetchOptions = RequestInit & {
    responseType?: "json" | "text" | "blob" | "auto";
};
export type BodyType<T> = T;
export declare class ApiError<T = unknown> extends Error {
    readonly status: number;
    readonly data: T;
    constructor(status: number, data: T);
}
export type ErrorType<T = unknown> = ApiError<T>;
export type AuthTokenGetter = () => Promise<string | null> | string | null;
export declare function setBaseUrl(url: string | null): void;
export declare function setAuthTokenGetter(getter: AuthTokenGetter | null): void;
export declare function customFetch<T = unknown>(input: RequestInfo | URL, options?: CustomFetchOptions): Promise<T>;
//# sourceMappingURL=custom-fetch.d.ts.map