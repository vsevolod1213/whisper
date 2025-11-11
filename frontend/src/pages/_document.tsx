// frontend/src/pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ru" dir="ltr">
      <Head>
        {/* Фавиконки и PWA */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link id="site-favicon" rel="icon" type="image/png" href="/icon1.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />

        <link rel="manifest" href="/site.webmanifest" />
        <meta id="theme-color" name="theme-color" content="#f8fafc" />

        {/* Быстрые соединения под шрифты/статик */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        {/* Базовые OG, которые страницы расширят */}
        <meta property="og:site_name" content="Filety" />
        <meta property="og:type" content="website" />
      </Head>

      {/* Tailwind v4 классы можно сразу навесить на body */}
      <body className="antialiased bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
