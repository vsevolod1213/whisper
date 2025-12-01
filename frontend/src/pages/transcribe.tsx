import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import { useAnonUser } from "@/context/AnonUserContext";
import { formatDuration } from "@/lib/utils";

const stats = [
  { label: "Размер файла", value: "до 20 МБ" },
  { label: "Форматы", value: "MP3, WAV, M4A, MP4" },
  { label: "Результат", value: "копирование текста или TXT" },
];

const highlights = [
  "Принимаем популярные аудио и видео контенты",
  "Обрабатываем на сервере — браузер остаётся отзывчивым",
  "Получаете чистый текст сразу после загрузки",
];

const steps = [
  { title: "1. Подготовка файла", text: "Перетащите аудио или видео в загрузчик. Поддерживаем все популярные форматы и автоматически проверяем размер." },
  { title: "2. Обработка на сервере", text: "Filety извлекает звук, запускает Whisper и строит структуру речи — в браузере ничего не зависает." },
  { title: "3. Готовый текст + экспорт", text: "Получаете очищенный текст, длительность, язык и ссылки на выгрузку в TXT, SRT или VTT." },
];

export default function TranscribePage() {
  const title = "Транскрипция аудио и видео онлайн — Filety";
  const description = "Переводите интервью, лекции, созвоны и подкасты в текст. Бесплатный дневной лимит, загрузка без регистрации, копирование результата или скачивание TXT.";
  const url = "https://filety.ru/transcribe";
  const ogImage = "https://filety.ru/og-transcribe.png";

  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { remainingSeconds, loading: anonLoading, error: anonError, refreshAnonUser } = useAnonUser();
  const limitReached = typeof remainingSeconds === "number" && remainingSeconds <= 0;
  const remainingText = typeof remainingSeconds === "number" ? formatDuration(remainingSeconds) : "—";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Transcription",
    category: ["Speech-to-Text", "Audio Transcription", "Video Transcription"],
    name: "Filety — транскрипция аудио и видео",
    description,
    provider: { "@type": "Organization", name: "Filety", url: "https://filety.ru" },
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "RUB",
        description: "Free daily limit. Paid plans available for long files.",
      },
    ],
    url,
    areaServed: "RU",
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
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "filety-transcription.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
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
        <section className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-slate-950 via-purple-800 to-rose-500 text-white dark:border-slate-800/50">
          <div className="absolute inset-0 opacity-40" aria-hidden>
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)]" />
          </div>
          <div className="container relative mx-auto grid gap-10 px-4 py-20 sm:py-24 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.4em]">Transcribe</p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">Транскрипция аудио и видео в текст</h1>
              <p className="text-base text-white/80 sm:text-lg">
                Загрузите интервью, лекцию, созвон или голосовое сообщение — Filety быстро превратит запись в читаемый текст прямо в браузере.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">{stat.label}</p>
                    <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-white/80">
                {highlights.map((item) => (
                  <span key={item} className="rounded-full border border-white/30 px-3 py-1">
                    {item}
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
                  Перейти к конвертации
                </Link>
              </div>
            </div>

            <div id="upload" className="space-y-4">
              <FileUploader onUploadStart={handleUploadStart} onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />

              <div className="rounded-3xl border border-white/30 bg-white/95 p-5 text-sm text-slate-900 shadow-xl dark:border-white/10 dark:bg-white/10 dark:text-white">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">Сколько осталось бесплатно</p>
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
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-white/60">Сегодня доступно</p>
                <p className={`mt-1 text-lg font-semibold ${limitReached ? "text-rose-600 dark:text-rose-400" : ""}`}>
                  {anonLoading ? "Обновляем…" : limitReached ? "0 секунд" : remainingText}
                </p>
                {limitReached && !anonLoading && (
                  <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">Лимит израсходован — войдите или приходите завтра.</p>
                )}
                {anonError && !anonLoading && (
                  <p className="mt-2 rounded-2xl bg-rose-100/60 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">{anonError}</p>
                )}
              </div>

              {(resultText || error || processing) && (
                <div className="rounded-[28px] border border-white/30 bg-white/95 p-5 text-sm text-slate-900 shadow-xl dark:border-white/10 dark:bg-white/10 dark:text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900 dark:text-white">Результат транскрипции</p>
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
                        <span>Преобразуем аудио в Whisper…</span>
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
                    <p className="mt-4 text-sm text-slate-500 dark:text-white/70">После обработки здесь появится текст и ссылки на выгрузку.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200/60 bg-white py-12 dark:border-slate-800/60 dark:bg-slate-950">
          <div className="container mx-auto space-y-4 px-4 text-slate-700 dark:text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Скоро в Filety</p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Что появится следующим</h2>
            <ul className="list-disc space-y-2 pl-6 text-sm">
              <li>Сохранение таймкодов и экспорт субтитров</li>
              <li>Разделение текста по говорящим</li>
              <li>Поддержка длинных проектов и лекций</li>
            </ul>
            <p className="text-sm">
              Мы постепенно включаем эти функции. Подписывайтесь на новости в личном кабинете или ТГ-канале, чтобы узнать первыми.
            </p>
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

        {/* SEO-блок */}
        <section className="border-t border-slate-200/60 bg-white py-16 dark:border-slate-800/60 dark:bg-slate-950">
          <div className="container mx-auto max-w-3xl space-y-5 px-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Кому полезен Filety</h2>
            <p>
              Если вы регулярно работаете с интервью, лекциями, звонками или подкастами, Filety снимает рутину. Сервис принимает записи размером до ~20&nbsp;МБ,
              обрабатывает их на сервере и возвращает текст, который можно тут же скопировать или скачать в TXT. Не нужно ставить на паузу и вручную печатать —
              достаточно загрузить файл и дождаться готового результата.
            </p>
            <p>
              Filety подходит журналистам, монтажёрам, маркетологам, преподавателям, студентам и всем, кто хочет экономить время на расшифровке. Бесплатный дневной
              лимит позволяет протестировать качество, а более крупные проекты можно проводить постепенно, сохраняя прогресс. Серверная обработка гарантирует, что
              браузер остаётся отзывчивым, а файлы не попадают в сторонние сервисы.
            </p>
            <p>
              Мы продолжаем развивать платформу и добавлять функции, которые чаще всего просят пользователи. Следите за обновлениями — Filety постепенно станет
              полноценным рабочим столом для тех, кто работает с аудио и видео.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
