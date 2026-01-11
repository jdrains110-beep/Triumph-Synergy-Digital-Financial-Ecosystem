import type { AppProps } from "next/app";
import Script from "next/script";

/**
 * Global App Component with Pi Network SDK
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      {/* Pi Network SDK Script */}
      <Script
        onLoad={() => {
          // Initialize Pi SDK
          if (typeof window !== "undefined" && (window as any).Pi) {
            const Pi = (window as any).Pi;

            Pi.init({
              version: "2.0",
              appId: "triumph-synergy-entertainment",
            })
              .then(() => {
                console.log("✅ Pi Network SDK initialized");
              })
              .catch((error: any) => {
                console.error("❌ Pi Network SDK error:", error);
              });
          }
        }}
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="beforeInteractive"
      />

      {/* Main Component */}
      <Component {...pageProps} />
    </>
  );
}
