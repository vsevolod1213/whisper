// src/components/Header.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/transcribe", label: "Транскрипция" },
  { href: "/convert", label: "Конвертация" },
];

export default function Header() {
  const router = useRouter();
  const { pathname } = router;
  const { user, loading } = useAuth();
  const headerRef = useRef<HTMLElement | null>(null);
  const navRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollY = useRef(0);
  const isAuthenticated = Boolean(user);

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
      const el = navRefs.current[activeIndex];
      if (el) {
        setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
      }
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeIndex, showIndicator]);

  useEffect(() => {
    const updateHeight = () => {
      setHeaderHeight(headerRef.current?.offsetHeight ?? 0);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current + 15 && currentY > 80) {
        setHideHeader(true);
        setIsMenuOpen(false);
        setIsAccountMenuOpen(false);
      } else if (currentY < lastScrollY.current - 15) {
        setHideHeader(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen && !isAccountMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, isAccountMenuOpen]);

  const handleToolToggle = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      if (next) setIsAccountMenuOpen(false);
      return next;
    });
  };

  const handleAccountAction = () => {
    setIsMenuOpen(false);
    if (isAuthenticated) {
      setIsAccountMenuOpen(false);
      if (pathname !== "/account") {
        void router.push("/account");
      }
    } else {
      setIsAccountMenuOpen((prev) => !prev);
    }
  };

  return (
    <header
      ref={(node) => {
        headerRef.current = node;
      }}
      className={`sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-lg transition-transform duration-300 dark:border-slate-800/70 dark:bg-slate-950/90 ${
        hideHeader ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between sm:hidden">
          <Link
            href="/"
            onClick={() => {
              setIsMenuOpen(false);
              setIsAccountMenuOpen(false);
            }}
            className="inline-flex items-center text-lg font-semibold tracking-tight text-slate-900 transition hover:text-purple-500 dark:text-white dark:hover:text-purple-300"
          >
            Filety
          </Link>
          <button
            type="button"
            onClick={handleToolToggle}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            Инструменты
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            onClick={handleAccountAction}
            aria-label={isAuthenticated ? "Открыть кабинет" : "Меню авторизации"}
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-5 w-5"
            >
              <path d="M12 12c2.623 0 4.75-2.127 4.75-4.75S14.623 2.5 12 2.5 7.25 4.627 7.25 7.25 9.377 12 12 12Z" />
              <path d="M4 20.25c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="hidden items-center justify-between gap-4 sm:flex">
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
                    navRefs.current[index] = node;
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

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="hidden h-10 w-36 rounded-full bg-slate-200/70 sm:block" aria-hidden />
            ) : isAuthenticated ? (
              <Link
                href="/account"
                className="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-500 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white sm:inline-flex"
              >
                Кабинет
              </Link>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/auth/login"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 active:scale-95"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="sm:hidden">
          <div
            className="fixed inset-x-0 z-20 bg-slate-900/40 backdrop-blur-sm"
            style={{ top: headerHeight }}
            onClick={() => setIsMenuOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-30 w-64 rounded-3xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            style={{ top: headerHeight + 16, left: "50%", transform: "translateX(-50%)" }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Навигация</p>
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMenuOpen(false)}
                className="mt-3 block rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-800"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && !isAuthenticated && isAccountMenuOpen && (
        <div className="sm:hidden">
          <div
            className="fixed inset-x-0 z-20 bg-slate-900/40 backdrop-blur-sm"
            style={{ top: headerHeight }}
            onClick={() => setIsAccountMenuOpen(false)}
            aria-hidden
          />
          <div
            className="fixed z-30 w-64 rounded-3xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            style={{ top: headerHeight + 16, left: "50%", transform: "translateX(-50%)" }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Профиль</p>
            <Link
              href="/auth/login"
              onClick={() => setIsAccountMenuOpen(false)}
              className="mt-3 block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-800"
            >
              Войти
            </Link>
            <Link
              href="/auth/register"
              onClick={() => setIsAccountMenuOpen(false)}
              className="mt-3 block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold transition hover:border-purple-400 hover:text-purple-500 active:scale-95 dark:border-slate-800"
            >
              Регистрация
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
