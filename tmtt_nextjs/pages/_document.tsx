import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document for Next.js
 * Sets up HTML structure with Pi Network SDK
 */
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Triumph-Synergy Entertainment Hub with Pi Network Payment Integration" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Pi Network SDK Integration */}
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
      </Head>
      <body className="bg-gray-900 text-white">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
