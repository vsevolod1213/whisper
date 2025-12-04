// frontend/src/components/FileUploader.tsx
import { useId, useRef, useState } from "react";
import { useUsage } from "@/hooks/useUsage";
import { API_BASE_URL } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { computeUsage, isUsageDepleted } from "@/lib/usage";

type FileUploaderProps = {
  onUploadStart?: () => void;
  onUploadSuccess?: (text: string) => void;
  onUploadError?: (message: string) => void;
};

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

const LIMIT_MESSAGE =
  "Запись длиннее доступного лимита. Сократите файл или обновите тариф, чтобы продолжить расшифровку.";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type UploadPhase = Extract<UploadState, "uploading" | "processing">;

export async function uploadToServer(
  file: File,
  anonUuid: string,
  onPhaseChange?: (phase: UploadPhase) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("anon_uuid", anonUuid);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);
  const token = getAccessToken();
  onPhaseChange?.("uploading");

  try {
    const startResponse = await fetch(`${API_BASE_URL}/translate/start`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
      signal: controller.signal,
    });

    if (!startResponse.ok) {
      const message = await startResponse.text();
      throw new Error(message || "Failed to start transcription");
    }

    const data = await startResponse.json();
    onPhaseChange?.("processing");
    const taskId = data.task_id;
    if (!taskId) {
      throw new Error("task_id is missing in response");
    }

    while (true) {
      await delay(3500);
      const statusResponse = await fetch(`${API_BASE_URL}/translate/status?task_id=${taskId}`);
      if (!statusResponse.ok) {
        const message = await statusResponse.text();
        throw new Error(message || "Failed to check status");
      }
      const statusData = await statusResponse.json();
      if (statusData.status === "done") {
        return { transcription: statusData.transcription };
      }
      if (statusData.status === "error") {
        throw new Error(statusData.error || "Transcription failed");
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}

const STATUS_TEXT: Record<UploadState, string> = {
  idle: "Выберите аудио или видео, чтобы начать.",
  uploading: "Файл загружается на сервер…",
  processing: "Преобразуем аудио в текст…",
  done: "Готово! Расшифровка получена.",
  error: "Не удалось загрузить файл. Попробуйте снова.",
};

export default function FileUploader({ onUploadStart, onUploadSuccess, onUploadError }: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { usage, refreshUsage, anonUser, user } = useUsage();
  const limitReached = isUsageDepleted(usage);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} МБ`);
    onUploadStart?.();
    setStatusErrorMessage(null);

    try {
      let anonState = anonUser;
      let userState = user;
      try {
        const refreshed = await refreshUsage({ force: true });
        if (refreshed.anon) {
          anonState = refreshed.anon;
        }
        if (refreshed.user) {
          userState = refreshed.user;
        }
      } catch (refreshError) {
        console.error("[Usage] Failed to refresh quota before upload", refreshError);
      }

      if (!anonState?.uuid) {
        throw new Error("Не удалось получить данные анонимного пользователя");
      }

      const latestUsage = computeUsage({ anon: anonState, user: userState });
      if (isUsageDepleted(latestUsage)) {
        setStatus("error");
        setStatusErrorMessage(LIMIT_MESSAGE);
        onUploadError?.(LIMIT_MESSAGE);
        return;
      }

      setStatus("uploading");
      const result = await uploadToServer(file, anonState.uuid, (phase) => {
        setStatus(phase);
      });
      onUploadSuccess?.(result.transcription ?? "Нет текста. Попробуйте другой файл.");
      setStatus("done");
      void refreshUsage({ force: true }).catch(() => {
        // обновим лимит позже, ошибки логируются внутри контекстов/хуков
      });
    } catch (error) {
      const rawMessage = (error as Error).message || "Ошибка при загрузке файла.";
      const friendlyMessage = /daily limit/i.test(rawMessage)
        ? "Файл не помещается в оставшийся лимит. Сократите запись или обновите тариф."
        : rawMessage;
      setStatus("error");
      setStatusErrorMessage(friendlyMessage);
      onUploadError?.(friendlyMessage);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 text-center shadow-2xl shadow-brand-700/20 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">Загрузка</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Перетащите аудио или видео</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Файлы до 20 МБ, обработка сразу на сервере.</p>

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) {
            void processFile(file);
          }
        }}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 transition dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 ${
          isDragging
            ? "border-brand-700 bg-brand-50/80 text-brand-700 shadow-lg shadow-brand-700/30"
            : "border-slate-300/60 bg-slate-50/70 text-slate-500 hover:border-brand-700/60"
        } ${limitReached ? "opacity-60" : ""}`}
      >
        <svg width="48" height="48" fill="none" stroke="currentColor" className="mb-4 text-brand-700">
          <path strokeWidth="1.5" d="M24 10v28M12 24h24" />
        </svg>

        {fileName ? (
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {fileName.length > 48 ? `${fileName.slice(0, 45)}…` : fileName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300">{fileSize}</p>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                inputRef.current?.click();
              }}
              className="mt-3 inline-flex items-center rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-purple-400 hover:text-purple-500 dark:border-slate-600 dark:text-slate-200"
            >
              Выбрать другой файл
            </button>
          </div>
        ) : (
          <>
            <span className="text-base font-medium text-slate-700 dark:text-white">Нажмите или перетащите файл</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">поддержка audio/video</span>
          </>
        )}
      </label>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="sr-only"
        onChange={handleChange}
      />

      <div className="mt-4 min-h-[56px] rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-600 shadow-inner transition dark:bg-slate-900/40 dark:text-slate-200">
        {status === "idle" && <p>{STATUS_TEXT.idle}</p>}

        {(status === "uploading" || status === "processing") && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="font-medium text-brand-700">{STATUS_TEXT[status]}</p>
          </div>
        )}

        {status === "done" && <p className="text-emerald-600 dark:text-emerald-400">{STATUS_TEXT.done}</p>}

        {status === "error" && (
          <p className="text-rose-600 dark:text-rose-400">{statusErrorMessage ?? STATUS_TEXT.error}</p>
        )}

        {limitReached && (
          <p className="mt-2 text-xs font-medium text-rose-500 dark:text-rose-300">
            {LIMIT_MESSAGE}
          </p>
        )}
      </div>
    </div>
  );
}
