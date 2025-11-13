import Head from "next/head";
import Link from "next/link";
import FileUploader from "@/components/FileUploader";

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
              <FileUploader />
              <div className="rounded-3xl border border-white/20 bg-white/10 p-5 text-sm text-white/90 backdrop-blur">
                <p className="font-semibold">Результат сохранится здесь</p>
                <p className="mt-1 text-white/70">После интеграции API покажем текст, длительность и ссылки на export.</p>
              </div>
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
