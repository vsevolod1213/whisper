// src/components/Header.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

const NAV_ITEMS = [
  { href: "/transcribe", label: "Транскрипция" },
  { href: "/convert", label: "Конвертация" },
];

export default function Header() {
  const { pathname } = useRouter();
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [userLabel] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("filety-user");
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeIndex = useMemo(
    () => NAV_ITEMS.findIndex(({ href }) => pathname.startsWith(href)),
    [pathname],
  );
  const showIndicator = activeIndex >= 0;

  useEffect(() => {
    const updateIndicator = () => {
      if (!showIndicator) {
        setIndicator({ left: 0, width: 0 });
        return;
      }
      const el = linkRefs.current[activeIndex];
      if (el) {
        setIndicator({
          left: el.offsetLeft,
          width: el.offsetWidth,
        });
      }
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeIndex, showIndicator]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800/70 dark:bg-slate-950/80">
      <div className="container mx-auto flex items-center justify-between gap-6 px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center rounded-full px-10 py-5 text-lg font-semibold tracking-tight text-slate-900 transition hover:text-purple-500 dark:text-white dark:hover:text-purple-300"
        >
          Filety
        </Link>

        <nav className="relative hidden items-center gap-2 rounded-full border border-slate-200/60 bg-slate-100/60 px-1 py-1 dark:border-slate-800/60 dark:bg-slate-900/60 sm:flex">
          <span
            className={`absolute left-0 top-0 h-full rounded-full bg-slate-900 text-white transition-all duration-300 ease-out dark:bg-white ${
              showIndicator ? "opacity-100" : "opacity-0"
            }`}
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
            aria-hidden
          />
          {NAV_ITEMS.map(({ href, label }, index) => {
            const active = index === activeIndex;
            return (
              <Link
                key={href}
                href={href}
                ref={(node) => {
                  linkRefs.current[index] = node;
                }}
                className={`relative z-10 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "text-white dark:text-slate-900"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700 dark:text-slate-200 sm:hidden"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label="Меню"
        >
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="sr-only">Открыть меню</span>
        </button>

        {userLabel ? (
          <Link
            href="/account"
            className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
          >
            Кабинет
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
            >
              Войти
            </Link>
            <Link
              href="/auth/register"
              className="hidden rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95 sm:inline-flex"
            >
              Регистрация
            </Link>
          </div>
        )}
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div
            className="fixed inset-0 z-[19] bg-slate-900/60 backdrop-blur"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden
          />
          <div className="fixed left-0 top-0 z-20 flex h-full w-64 flex-col gap-4 bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-950 dark:text-slate-50">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Навигация</p>
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-800"
              >
                {label}
              </Link>
            ))}
            {!userLabel && (
              <div className="mt-auto space-y-3">
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-full bg-purple-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-95"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
