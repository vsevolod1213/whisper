import { FormEvent, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/auth";

export default function RegisterPage() {
  const title = "Регистрация Filety";
  const description = "Создайте аккаунт, чтобы транскрибировать и конвертировать файлы.";
  const router = useRouter();
  const { register } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setErrorMessage(null);
    setSubmitting(true);

    try {
      await register(email, password);
      await router.push("/account");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setErrorMessage(error.message);
        } else if ((error.status ?? 0) >= 500) {
          setErrorMessage("Произошла ошибка, попробуйте позже");
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("Произошла ошибка, попробуйте позже");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <main className="flex min-h-[80vh] items-center justify-center bg-white px-4 py-16 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200/70 bg-white/80 p-8 shadow-2xl backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70">
          <h1 className="text-3xl font-semibold">Регистрация</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Заполните форму, чтобы начать.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit} noValidate>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Email
              <input
                type="email"
                name="email"
                required
                disabled={submitting}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
              Пароль
              <input
                type="password"
                name="password"
                required
                minLength={6}
                disabled={submitting}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-purple-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-slate-900"
            >
              {submitting ? "Создаем..." : "Создать аккаунт"}
            </button>
            {errorMessage && <p className="text-sm font-medium text-red-500">{errorMessage}</p>}
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-300">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="text-purple-500">
              Войти
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
