import { FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";

export default function LoginPage() {
  const title = "Вход в Filety";
  const description = "Авторизуйтесь, чтобы управлять файлами и лимитами.";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <main className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200/70 bg-white/80 p-8 shadow-2xl backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
          <h1 className="text-3xl font-semibold">Войти</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Продолжайте работу с файлами.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
              <input
                type="email"
                name="email"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Пароль
              <input
                type="password"
                name="password"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-purple-600 dark:bg-white dark:text-slate-900"
            >
              Войти
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-300">
            Нет аккаунта? {" "}
            <Link href="/auth/register" className="text-purple-500">
              Зарегистрируйтесь
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
