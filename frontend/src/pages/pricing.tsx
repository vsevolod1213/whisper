import Head from "next/head";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "0 ₽",
    tagline: "5 минут/день",
    features: ["Транскрипция до 30 минут", "Конвертация до 20 МБ", "Ограничение по очереди"],
    cta: "Начать бесплатно",
  },
  {
    name: "Pro",
    price: "1 990 ₽",
    tagline: "в месяц",
    features: ["До 15 часов аудио", "Приоритетная очередь", "Экспорт TXT/SRT/VTT"],
    cta: "Оформить Pro",
  },
  {
    name: "Team",
    price: "запрос",
    tagline: "API + интеграции",
    features: ["Общий лимит для команды", "Выделенный webhook", "SLA и отчёты"],
    cta: "Связаться",
  },
];

export default function PricingPage() {
  const title = "Filety Pricing — тарифы на транскрипцию и конвертацию";
  const description = "Прозрачные лимиты и планы. Бесплатный старт, Pro и корпоративный пакет.";
  const url = "https://filety.ru/pricing";
  const ogImage = "https://filety.ru/og.png";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Filety Pricing",
    description,
    url,
    itemListElement: plans.map((plan, index) => ({
      "@type": "Offer",
      position: index + 1,
      name: plan.name,
      price: plan.price,
      priceCurrency: plan.price.includes("₽") ? "RUB" : "",
      description: plan.tagline,
    })),
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <main className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <section className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-slate-950 via-purple-800 to-rose-500 text-white dark:border-slate-800/60">
          <div className="absolute inset-0 opacity-40" aria-hidden>
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.3),_transparent_60%)]" />
          </div>
          <div className="container relative mx-auto space-y-6 px-4 py-24 text-center">
            <p className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.4em]">
              Pricing
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Тарифы Filety</h1>
            <p className="text-lg text-white/80">Подберите план под свои файлы. Бесплатный старт для теста.</p>
            <div className="flex justify-center gap-4">
              <Link href="/transcribe" className="rounded-full bg-white px-6 py-3 text-base font-semibold text-slate-900">
                Использовать сейчас
              </Link>
              <a href="mailto:hi@filety.ru" className="rounded-full border border-white/60 px-6 py-3 text-base font-semibold text-white">
                Написать нам
              </a>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 dark:bg-slate-950">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className="rounded-[32px] border border-slate-200/70 bg-slate-50/80 p-6 text-slate-900 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-50"
              >
                <p className="text-sm uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">{plan.name}</p>
                <p className="mt-4 text-4xl font-semibold">{plan.price}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.tagline}</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-8 w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-purple-600 dark:bg-white dark:text-slate-900"
                >
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
