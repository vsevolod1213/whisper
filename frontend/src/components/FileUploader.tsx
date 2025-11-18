import { useId, useRef, useState } from "react";


type FileUploaderProps = {
  onUploadStart?: () => void;
  onUploadSuccess?: (text: string) => void;
  onUploadError?: (message: string) => void;
};

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

export async function uploadToServer(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3 * 60 * 1000);

  let response: Response;
  try {
    response = await fetch("https://api.filety.online/translate", {
      method: "POST",
      body: formData,
      //signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Network response was not ok");
  }

  return response.json();
}

const STATUS_TEXT: Record<UploadState, string> = {
  idle: "Выберите аудио или видео, чтобы начать.",
  uploading: "Обрабатываем файл…",
  processing: "Whisper обрабатывает запись…",
  done: "Готово! Расшифровка получена.",
  error: "Не удалось загрузить файл. Попробуйте снова.",
};

export default function FileUploader({ onUploadStart, onUploadSuccess, onUploadError }: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} МБ`);
    setStatus("uploading");
    onUploadStart?.();

    try {
      const result = await uploadToServer(file);
      setStatus("processing");
      onUploadSuccess?.(result.transcription ?? "Нет текста. Попробуйте другой файл.");
      setStatus("done");
    } catch (error) {
      const message = (error as Error).message || "Ошибка при загрузке файла.";
      setStatus("error");
      onUploadError?.(message);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200/70 bg-white/80 p-6 text-center shadow-2xl shadow-brand-700/20 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/60">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">Загрузка</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Перетащите аудио или видео</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Файлы до 2 ГБ, обработка сразу на сервере.</p>

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
        }`}
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

        {status === "uploading" && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="font-medium text-brand-700">{STATUS_TEXT.uploading}</p>
          </div>
        )}

        {status === "processing" && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-brand-700 shadow dark:bg-white/10">
            <span className="h-2 w-2 animate-ping rounded-full bg-brand-600" />
            <span>{STATUS_TEXT.processing}</span>
          </div>
        )}

        {status === "done" && <p className="text-emerald-600 dark:text-emerald-400">{STATUS_TEXT.done}</p>}

        {status === "error" && <p className="text-rose-600 dark:text-rose-400">{STATUS_TEXT.error}</p>}
      </div>
    </div>
  );
}
