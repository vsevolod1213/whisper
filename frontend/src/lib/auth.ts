import { API_BASE_URL } from "@/lib/api";

type TokenResponse = {
  access_token: string;
  token_type: string;
};

type ApiUser = {
  id: number;
  email: string;
  created_at: string;
  tariff_plan: number;
  daily_used_time: number;
};

export type User = {
  id: number;
  email: string;
  createdAt: string;
  tariffPlan: number;
  dailyUsedTime: number;
};

type RequestOptions = RequestInit & {
  auth?: boolean;
  retry?: boolean;
};

let accessToken: string | null = null;
let refreshPromise: Promise<string> | null = null;

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const extractDetailMessage = (detail: unknown): string | null => {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "string") {
      return first;
    }
    if (first && typeof first === "object" && "msg" in first) {
      const maybe = first as { msg?: string };
      if (maybe.msg) {
        return maybe.msg;
      }
    }
  }
  if (typeof detail === "object" && detail && "msg" in (detail as { msg?: string })) {
    const maybe = detail as { msg?: string };
    if (maybe.msg) {
      return maybe.msg;
    }
  }
  return null;
};

const readErrorMessage = async (response: Response) => {
  const raw = await response.text();
  if (!raw) {
    return `Request failed with status ${response.status}`;
  }

  try {
    const data: { detail?: unknown; message?: string; error?: string } | string = JSON.parse(raw);
    if (typeof data === "string") {
      return data;
    }
    const detailMessage = extractDetailMessage(data.detail);
    return detailMessage ?? data.message ?? data.error ?? raw;
  } catch {
    return raw;
  }
};

const mapUser = (data: ApiUser): User => ({
  id: data.id,
  email: data.email,
  createdAt: data.created_at,
  tariffPlan: data.tariff_plan,
  dailyUsedTime: data.daily_used_time,
});

const buildHeaders = (headers?: HeadersInit) => {
  const result = new Headers(headers ?? {});
  if (!result.has("Content-Type")) {
    result.set("Content-Type", "application/json");
  }
  return result;
};

const setAccessToken = (token: string | null) => {
  accessToken = token;
};

const refreshAccessToken = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      throw new ApiError(message, response.status);
    }

    const data: TokenResponse = await response.json();
    if (!data.access_token) {
      throw new ApiError("Ответ refresh не содержит access_token", 500);
    }

    setAccessToken(data.access_token);
    return data.access_token;
  })()
    .catch((error) => {
      setAccessToken(null);
      throw error instanceof ApiError
        ? error
        : new ApiError(error instanceof Error ? error.message : "Не удалось обновить токен", 500);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const apiFetch = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { auth, retry, headers, ...rest } = options;
  const mergedHeaders = buildHeaders(headers);

  if (auth && accessToken) {
    mergedHeaders.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
    credentials: "include",
  });

  if (response.ok) {
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined as T;
    }
  }

  if (response.status === 401 && auth && !retry) {
    await refreshAccessToken();
    return apiFetch<T>(path, { ...options, retry: true });
  }

  const message = await readErrorMessage(response);
  throw new ApiError(message, response.status);
};

export async function registerUser(email: string, password: string): Promise<User> {
  const data = await apiFetch<ApiUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return mapUser(data);
}

export async function loginUser(email: string, password: string): Promise<void> {
  const tokens = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(tokens.access_token);
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
    });
  } finally {
    setAccessToken(null);
  }
}

export async function logoutAllSessions(): Promise<void> {
  try {
    await apiFetch("/auth/logout_all", {
      method: "POST",
      auth: true,
    });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchCurrentUser(): Promise<User> {
  const data = await apiFetch<ApiUser>("/auth/me", {
    method: "GET",
    auth: true,
  });
  return mapUser(data);
}
