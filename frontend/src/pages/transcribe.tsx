// frontend/src/pages/transcribe.tsx
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { useAnonUser } from "@/context/AnonUserContext";
import { formatDuration } from "@/lib/utils";

const stats = [
  { label: "Файл", value: "до 2 ГБ" },
  { label: "Языки", value: "RU · EN" },
  { label: "Экспорт", value: "TXT · SRT · VTT" },
];

const bullets = [
  "Автоопределение громкости",
  "Сохраняем таймкоды",
  "Работаем с часовыми файлами",
];

const steps = [
  { title: "1. Загрузка", text: "Перетащите аудио или видео. Проверим формат и размер." },
  { title: "2. Обработка", text: "Сервер извлекает аудио, запускает faster-whisper и делит на сегменты." },
  { title: "3. Результат", text: "Получаете текст, язык, длительность и готовые файлы для экспорта." },
];

export default function TranscribePage() {
  const title = "Filety Транскрипция — аудио и видео в текст";
  const description = "Загрузите запись и получите чистый текст с таймкодами и экспортом.";
  const url = "https://filety.ru/transcribe";
  const ogImage = "https://filety.ru/og.png";
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const { remainingSeconds, loading: anonLoading, error: anonError, refreshAnonUser } = useAnonUser();
  const limitReached = typeof remainingSeconds === "number" && remainingSeconds <= 0;
  const remainingText =
    typeof remainingSeconds === "number" ? formatDuration(remainingSeconds) : "—";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Filety Transcribe",
    description,
    provider: { "@type": "Organization", name: "Filety", url: "https://filety.ru" },
    areaServed: "RU",
    url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
  };

  const handleUploadStart = () => {
    setResultText("");
    setError("");
    setCopied(false);
    setProcessing(true);
  };

  const handleUploadSuccess = (text: string) => {
    setResultText(text);
    setProcessing(false);
  };

  const handleUploadError = (message: string) => {
    setResultText("");
    setError(message);
    setProcessing(false);
  };

  const handleCopy = async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "filety-transcription.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Filety" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <main className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <section className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-slate-950 via-purple-800 to-rose-500 text-white dark:border-slate-800/60">
          <div className="absolute inset-0 opacity-30" aria-hidden>
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.4),_transparent_60%)]" />
          </div>
          <div className="container relative mx-auto grid gap-10 px-4 py-20 sm:py-24 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.4em]">Transcribe</p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
                Загрузите файл — получите текст
              </h1>
              <p className="text-base text-white/80 sm:text-lg">Filety расшифровывает длинные записи, сохраняет структуру и выдаёт файлы для монтажа.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                    <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-white/80">
                {bullets.map((bullet) => (
                  <span key={bullet} className="rounded-full border border-white/30 px-3 py-1">
                    {bullet}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Посмотреть тарифы
                </Link>
                <Link
                  href="/convert"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Конвертация
                </Link>
              </div>
            </div>
            <div id="upload" className="space-y-4">
              <FileUploader
                onUploadStart={handleUploadStart}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
              <div className="rounded-3xl border border-white/30 bg-white/95 p-5 text-sm text-slate-900 shadow-xl dark:border-white/10 dark:bg-white/10 dark:text-white">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">Лимит бесплатной версии</p>
                  <button
                    type="button"
                    onClick={() => {
                      void refreshAnonUser({ force: true });
                    }}
                    className="text-xs font-semibold text-purple-600 transition hover:text-purple-400 disabled:opacity-40 dark:text-purple-200"
                    disabled={anonLoading}
                  >
                    Обновить
                  </button>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Сегодня осталось</p>
                <p className={`mt-1 text-lg font-semibold ${limitReached ? "text-rose-600 dark:text-rose-400" : ""}`}>
                  {anonLoading ? "Обновляем..." : limitReached ? "0 секунд" : remainingText}
                </p>
                {limitReached && !anonLoading && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">
                    Лимит исчерпан — авторизуйтесь или попробуйте завтра.
                  </p>
                )}
                {anonError && !anonLoading && (
                  <p className="mt-2 rounded-2xl bg-rose-100/60 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                    {anonError}
                  </p>
                )}
              </div>
              {(resultText || error || processing) && (
                <div className="rounded-[28px] border border-white/30 bg-white/95 p-5 text-sm text-slate-900 shadow-xl dark:border-white/10 dark:bg-white/10 dark:text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900 dark:text-white">Готовый текст</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!resultText}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-purple-400 hover:text-purple-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      >
                        {copied ? "Скопировано" : "Копировать"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!resultText}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-purple-400 hover:text-purple-500 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                      >
                        Скачать TXT
                      </button>
                    </div>
                  </div>

                  {processing && !resultText && !error && (
                    <div className="mt-4 flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-200">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-brand-700 shadow dark:bg-white/10">
                        <span className="h-3 w-3 animate-ping rounded-full bg-brand-600" />
                        <span>Обрабатываем в Whisper…</span>
                      </div>
                    </div>
                  )}

                  {error && (
                    <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
                      {error}
                    </p>
                  )}

                  {resultText && (
                    <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm leading-relaxed shadow-inner dark:border-white/20 dark:bg-white/5">
                      <p className="whitespace-pre-line">{resultText}</p>
                    </div>
                  )}

                  {!processing && !resultText && !error && (
                    <p className="mt-4 text-sm text-slate-500 dark:text-white/70">
                      После загрузки покажем текст, длительность и ссылки на экспорт.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 dark:bg-slate-950">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.title}
                className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-6 text-slate-900 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-50"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{step.title}</p>
                <p className="mt-3 text-base text-slate-700 dark:text-slate-200">{step.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
