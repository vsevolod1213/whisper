// frontend/src/lib/api.ts

export const API_BASE_URL = "https://api.filety.ru";

type ApiErrorPayload = {
  detail?: unknown;
  message?: string;
  error?: string;
};

export type AnonUserState = {
  uuid: string;
  dailyUsedTime: number;
  dailyLimitTime: number;
  createdAt: string;
};

type AnonUserResponse = {
  uuid: string;
  created_at: string;
  daily_used_time: number;
  daily_limit_time: number;
};

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
  if (typeof detail === "object" && "msg" in (detail as { msg?: string })) {
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
    const data: ApiErrorPayload | string = JSON.parse(raw);
    if (typeof data === "string") {
      return data;
    }
    const detailMessage = extractDetailMessage(data.detail);
    return detailMessage ?? data.message ?? data.error ?? raw;
  } catch {
    return raw;
  }
};

const mapAnonUser = (data: AnonUserResponse): AnonUserState => ({
  uuid: data.uuid,
  createdAt: data.created_at,
  dailyUsedTime: data.daily_used_time,
  dailyLimitTime: data.daily_limit_time,
});

const performAnonymousRequest = async (existingUuid?: string | null) => {
  const response = await fetch(`${API_BASE_URL}/auth/anonymous`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid: existingUuid?.trim() ? existingUuid : null }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  const data: AnonUserResponse = await response.json();
  return mapAnonUser(data);
};

export async function authAnonymous(existingUuid?: string | null): Promise<AnonUserState> {
  try {
    return await performAnonymousRequest(existingUuid);
  } catch (error) {
    throw error instanceof Error ? error : new Error("Не удалось получить данные анонимного пользователя");
  }
}
