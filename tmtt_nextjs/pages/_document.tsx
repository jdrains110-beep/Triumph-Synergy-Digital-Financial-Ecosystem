import { Head, Html, Main, NextScript } from "next/document";

/**
 * Custom Document for Next.js
 * Sets up HTML structure with Pi Network SDK
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta
          content="Triumph-Synergy Entertainment Hub with Pi Network Payment Integration"
          name="description"
        />
        <link href="/favicon.ico" rel="icon" />

        {/* Pi Network SDK Integration */}
        <script src="https://sdk.minepi.com/pi-sdk.js" />
      </Head>
      <body className="bg-gray-900 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
