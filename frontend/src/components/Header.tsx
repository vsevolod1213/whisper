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
          className="text-lg font-semibold tracking-tight text-slate-900 transition hover:text-purple-500 dark:text-white dark:hover:text-purple-300"
        >
          Filety
        </Link>

        <nav className="relative flex items-center gap-2 rounded-full border border-slate-200/60 bg-slate-100/60 px-1 py-1 dark:border-slate-800/60 dark:bg-slate-900/60">
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
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
            >
              Войти
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-purple-600 dark:bg-white dark:text-slate-900"
            >
              Регистрация
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
