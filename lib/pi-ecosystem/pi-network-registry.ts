/**
 * Pi Network Ecosystem Registry — Master Integration Map
 * =========================================================
 * Maps every Pi Network GitHub repository to Triumph Synergy's integration layer.
 * This is the SINGLE SOURCE OF TRUTH for all Pi ecosystem connections.
 *
 * Organizations tracked:
 *   - pi-apps (56 repos) — Official Pi Network developer platform
 *   - minepi  (3 repos)  — Pi Network core organization
 *   - stellar (4 repos)  — Upstream Stellar foundation (Pi's base layer)
 *
 * Fork owner: jdrains110-beep
 * Triumph Synergy Quantum Ecosystem — Superior integration layer
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepoTier = "core" | "sdk" | "platform" | "community" | "upstream";

export type IntegrationStatus =
  | "fully-integrated"
  | "partially-integrated"
  | "forked-pending"
  | "monitored"
  | "upstream-tracked";

export type PiRepoEntry = {
  /** GitHub org/repo */
  upstream: string;
  /** Our fork URL */
  fork: string;
  /** Classification tier */
  tier: RepoTier;
  /** How deeply we integrate */
  status: IntegrationStatus;
  /** Stars on upstream */
  stars: number;
  /** Primary language */
  language: string;
  /** What Triumph Synergy integrates from this repo */
  integrationPoints: string[];
  /** Local files in our codebase that connect to this repo */
  localBindings: string[];
  /** Description */
  description: string;
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PI_ECOSYSTEM_REGISTRY: PiRepoEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: CORE — Blockchain infrastructure
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "pi-apps/stellar-core",
    fork: "jdrains110-beep/stellar-core",
    tier: "core",
    status: "fully-integrated",
    stars: 29,
    language: "C",
    description: "Pi Network's fork of Stellar Core — the consensus engine",
    integrationPoints: [
      "SCP consensus protocol",
      "Peer-to-peer networking (port 31402)",
      "Core HTTP API (port 11626)",
      "Transaction submission",
      "Ledger close monitoring",
    ],
    localBindings: [
      "docker-compose.yml (pi-central-node service)",
      "docker/scp-upgrader/",
      "lib/stellar/scp-auto-update.ts",
      "app/api/stellar/consensus/route.ts",
      "app/api/pi/node/guardian/route.ts",
    ],
  },
  {
    upstream: "pi-apps/stellar-xdr",
    fork: "jdrains110-beep/stellar-xdr",
    tier: "core",
    status: "fully-integrated",
    stars: 36,
    language: "RPC",
    description: "XDR protocol definitions for Pi/Stellar transactions",
    integrationPoints: [
      "Transaction envelope encoding/decoding",
      "Operation XDR serialization",
      "Ledger entry format",
    ],
    localBindings: [
      "lib/stellar/stellar-pi-coin-sdk.ts",
      "app/api/pi-rpc/transaction/route.ts",
      "app/api/pi/token/issue/route.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-explorer",
    fork: "jdrains110-beep/pi-explorer",
    tier: "core",
    status: "fully-integrated",
    stars: 3900,
    language: "JavaScript",
    description: "Block Explorer for Pi Network's blockchain (forked from stellarexplorer)",
    integrationPoints: [
      "Block/ledger browsing",
      "Transaction lookup",
      "Account inspection",
      "Operation history",
    ],
    localBindings: [
      "components/PiRPCExplorer.tsx",
      "app/api/pi-rpc/route.ts",
      "app/api/pi-rpc/block/route.ts",
      "app/api/pi-rpc/balance/route.ts",
      "docker/blockchain-oracle/",
    ],
  },
  {
    upstream: "pi-apps/ExplorePi",
    fork: "jdrains110-beep/ExplorePi",
    tier: "core",
    status: "partially-integrated",
    stars: 68,
    language: "JavaScript",
    description: "Mobile-friendly block explorer by Pioneers",
    integrationPoints: [
      "Mobile blockchain browsing patterns",
      "Pi-specific account display",
    ],
    localBindings: [
      "components/PiRPCExplorer.tsx",
    ],
  },
  {
    upstream: "pi-apps/PiOS",
    fork: "jdrains110-beep/PiOS",
    tier: "core",
    status: "fully-integrated",
    stars: 622,
    language: "Mixed",
    description: "Pi Operating System — core OS-level integration",
    integrationPoints: [
      "PiOS app registration",
      "OS-level payment hooks",
      "App manifest format",
      "System service discovery",
    ],
    localBindings: [
      "app/api/pios/route.ts",
      "pi-app-manifest.json",
      "LICENSE-PIOS",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: SDK — Developer toolkits & libraries
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "pi-apps/pi-platform-docs",
    fork: "jdrains110-beep/pi-platform-docs",
    tier: "sdk",
    status: "fully-integrated",
    stars: 2000,
    language: "Markdown",
    description: "Official Pi Platform documentation — payment flows, auth, app registration",
    integrationPoints: [
      "Payment lifecycle (create → approve → complete)",
      "Authentication flow (Pi.authenticate)",
      "App Platform registration",
      "Domain verification protocol",
      "Webhook event format",
    ],
    localBindings: [
      "lib/pi-sdk/pi-provider.tsx",
      "lib/quantum-pi-browser-sdk.ts",
      "lib/payments/pi-payments-official.ts",
      "app/api/pi/approve/route.ts",
      "app/api/pi/complete/route.ts",
      "app/api/webhooks/pi/route.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-js",
    fork: "jdrains110-beep/pi-sdk-js",
    tier: "sdk",
    status: "fully-integrated",
    stars: 9,
    language: "JavaScript",
    description: "Official Pi JavaScript SDK",
    integrationPoints: [
      "Pi.init() / Pi.authenticate()",
      "Pi.createPayment()",
      "Pi.openPaymentApproval()",
      "SDK version tracking",
    ],
    localBindings: [
      "lib/pi-sdk/pi-sdk-initialization.ts",
      "lib/pi-sdk/pi-sdk-script-loader.ts",
      "lib/pi-sdk/pi-sdk-verifier.ts",
      "types/pi-sdk.d.ts",
      "app/layout.tsx (loads sdk.minepi.com/pi-sdk.js)",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-nextjs",
    fork: "jdrains110-beep/pi-sdk-nextjs",
    tier: "sdk",
    status: "fully-integrated",
    stars: 23,
    language: "TypeScript",
    description: "Official Pi SDK for Next.js applications",
    integrationPoints: [
      "Next.js App Router integration",
      "Server-side payment verification",
      "Pi Provider component pattern",
      "Middleware compatibility",
    ],
    localBindings: [
      "lib/pi-sdk/pi-provider.tsx",
      "app/layout.tsx",
      "middleware.ts",
      "next.config.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-react",
    fork: "jdrains110-beep/pi-sdk-react",
    tier: "sdk",
    status: "fully-integrated",
    stars: 10,
    language: "JavaScript",
    description: "Official Pi SDK for React applications",
    integrationPoints: [
      "React hooks for Pi payments",
      "PiProvider context pattern",
      "usePiPayment hook",
    ],
    localBindings: [
      "lib/pi-sdk/use-pi-payment.ts",
      "lib/pi-sdk/pi-provider.tsx",
      "hooks/usePiSDK.ts",
      "components/PiPaymentButton.tsx",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-express",
    fork: "jdrains110-beep/pi-sdk-express",
    tier: "sdk",
    status: "partially-integrated",
    stars: 0,
    language: "JavaScript",
    description: "Pi SDK for Express.js backends",
    integrationPoints: [
      "Server-side payment approval",
      "Webhook verification middleware",
    ],
    localBindings: [
      "app/api/pi_payment/approve/route.ts",
      "app/api/pi_payment/complete/route.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-lite",
    fork: "jdrains110-beep/pi-sdk-lite",
    tier: "sdk",
    status: "partially-integrated",
    stars: 0,
    language: "TypeScript",
    description: "Lightweight Pi SDK — minimal bundle",
    integrationPoints: [
      "Lightweight payment creation",
      "Reduced bundle size option",
    ],
    localBindings: [
      "lib/pi-sdk-2026.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-sdk-rails",
    fork: "jdrains110-beep/pi-sdk-rails",
    tier: "sdk",
    status: "monitored",
    stars: 19,
    language: "JavaScript",
    description: "Pi SDK for Ruby on Rails",
    integrationPoints: ["Cross-platform payment protocol reference"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pi-sdk-django",
    fork: "jdrains110-beep/pi-sdk-django",
    tier: "sdk",
    status: "monitored",
    stars: 0,
    language: "Python",
    description: "Pi SDK for Django (Python)",
    integrationPoints: ["Python payment verification patterns"],
    localBindings: ["docker/pi-bridge-connector/ (Python service)"],
  },
  {
    upstream: "pi-apps/pi-sdk-integration-guide",
    fork: "jdrains110-beep/pi-sdk-integration-guide",
    tier: "sdk",
    status: "fully-integrated",
    stars: 46,
    language: "Markdown",
    description: "Backend SDK integration guide for Pi Apps Platform",
    integrationPoints: [
      "A2U payment flow",
      "Server-side verification",
      "Incomplete payment recovery",
      "Payment callback URL patterns",
    ],
    localBindings: [
      "lib/pi-sdk/pi-incomplete-payment-handler.ts",
      "app/api/pi_payment/incomplete/route.ts",
      "lib/payments/pi-payments-official.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-nodejs",
    fork: "jdrains110-beep/pi-nodejs",
    tier: "sdk",
    status: "fully-integrated",
    stars: 89,
    language: "TypeScript",
    description: "Official Pi Node.js backend library",
    integrationPoints: [
      "Server-side authenticate()",
      "Payment lifecycle management",
      "Pi API client wrapper",
      "Webhook signature verification",
    ],
    localBindings: [
      "lib/payments/pi-payments-official.ts",
      "lib/payments/pi-network-primary.ts",
      "app/api/pi/payment/route.ts",
      "app/api/pi/verify/route.ts",
    ],
  },
  {
    upstream: "pi-apps/pi-python",
    fork: "jdrains110-beep/pi-python",
    tier: "sdk",
    status: "partially-integrated",
    stars: 70,
    language: "Python",
    description: "Pi Python A2U Payment library",
    integrationPoints: [
      "Python payment automation",
      "Bridge connector patterns",
    ],
    localBindings: ["docker/pi-bridge-connector/"],
  },
  {
    upstream: "pi-apps/pi-rust",
    fork: "jdrains110-beep/pi-rust",
    tier: "sdk",
    status: "partially-integrated",
    stars: 9,
    language: "Rust",
    description: "Rust SDK — A2U payment, OAuth, approval, cancellation",
    integrationPoints: [
      "High-performance payment verification",
      "Cryptographic signature patterns",
    ],
    localBindings: ["services/contract-processor/ (Rust service)"],
  },
  {
    upstream: "pi-apps/pi-csharp",
    fork: "jdrains110-beep/pi-csharp",
    tier: "sdk",
    status: "monitored",
    stars: 109,
    language: "C#",
    description: "Pi Network C# client library",
    integrationPoints: ["Cross-platform API reference"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pi-go",
    fork: "jdrains110-beep/pi-go",
    tier: "sdk",
    status: "monitored",
    stars: 18,
    language: "Go",
    description: "Pi Go SDK",
    integrationPoints: ["Microservice payment patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pi-ruby",
    fork: "jdrains110-beep/pi-ruby",
    tier: "sdk",
    status: "monitored",
    stars: 47,
    language: "Ruby",
    description: "Ruby gem for Pi Network",
    integrationPoints: ["Cross-platform payment reference"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pi-php",
    fork: "jdrains110-beep/pi-php",
    tier: "sdk",
    status: "monitored",
    stars: 35,
    language: "PHP",
    description: "Pi Network PHP A2U Payment package",
    integrationPoints: ["PHP payment lifecycle reference"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pi-blazor",
    fork: "jdrains110-beep/pi-blazor",
    tier: "sdk",
    status: "monitored",
    stars: 64,
    language: "C#",
    description: "Pi Network Blazor SDK",
    integrationPoints: ["WebAssembly payment patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/demo",
    fork: "jdrains110-beep/demo",
    tier: "sdk",
    status: "fully-integrated",
    stars: 501,
    language: "TypeScript",
    description: "Official Pi demo app — reference implementation",
    integrationPoints: [
      "Payment flow reference implementation",
      "Auth callback patterns",
      "Incomplete payment handling",
      "Frontend + backend integration",
    ],
    localBindings: [
      "lib/pi-sdk/pi-provider.tsx",
      "components/PiPayExample.tsx",
      "app/api/pi_payment/",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: PLATFORM — Commerce, analytics, tokenization
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "pi-apps/tokenization-on-pi",
    fork: "jdrains110-beep/tokenization-on-pi",
    tier: "platform",
    status: "fully-integrated",
    stars: 55,
    language: "JavaScript",
    description: "Real world asset tokenization on Pi blockchain",
    integrationPoints: [
      "Domain tokenization",
      "Asset fractionalization",
      "NFT issuance on Pi/Stellar",
      "Deed registration",
    ],
    localBindings: [
      "lib/blockchain/tokenization-engine.ts",
      "lib/blockchain/allodial-deeds-connector.ts",
      "docker/tokenization-engine/",
      "app/api/tokenization/domains/route.ts",
      "app/api/tokenization/deeds/route.ts",
      "app/api/pi/token/issue/route.ts",
      "components/tokenization-dashboard.tsx",
    ],
  },
  {
    upstream: "pi-apps/pi-commerce-app",
    fork: "jdrains110-beep/pi-commerce-app",
    tier: "platform",
    status: "partially-integrated",
    stars: 54,
    language: "Mixed",
    description: "Pi Commerce Hackathon materials and mockups",
    integrationPoints: [
      "Commerce payment patterns",
      "Product listing with Pi pricing",
      "Cart/checkout Pi integration",
    ],
    localBindings: [
      "components/payment-button.tsx",
      "components/smart-payment.tsx",
      "app/api/pi/payment/route.ts",
    ],
  },
  {
    upstream: "pi-apps/local-commerce-hub",
    fork: "jdrains110-beep/local-commerce-hub",
    tier: "platform",
    status: "partially-integrated",
    stars: 24,
    language: "TypeScript",
    description: "Local commerce marketplace on Pi",
    integrationPoints: [
      "Geolocation-based commerce",
      "Local merchant discovery",
      "Pi payment rails",
    ],
    localBindings: [
      "lib/enterprise/hub-integration.ts",
      "app/api/pi/payment/route.ts",
    ],
  },
  {
    upstream: "pi-apps/door",
    fork: "jdrains110-beep/door",
    tier: "platform",
    status: "partially-integrated",
    stars: 59,
    language: "TypeScript",
    description: "Pi blockchain analytics — trends and patterns",
    integrationPoints: [
      "Blockchain trend visualization",
      "Ledger analytics patterns",
      "Network statistics",
    ],
    localBindings: [
      "docker/blockchain-oracle/",
      "docker/market-data/",
      "components/dual-value-dashboard.tsx",
    ],
  },
  {
    upstream: "pi-apps/trust-hub",
    fork: "jdrains110-beep/trust-hub",
    tier: "platform",
    status: "partially-integrated",
    stars: 18,
    language: "TypeScript",
    description: "Trust and reputation system on Pi",
    integrationPoints: [
      "Trust scoring",
      "Reputation verification",
      "KYC/KYB integration",
    ],
    localBindings: [
      "app/api/pi/kyc/route.ts",
      "app/api/pi/kyb/route.ts",
      "app/api/pi/kyc-kyb-status/route.ts",
    ],
  },
  {
    upstream: "pi-apps/orbit",
    fork: "jdrains110-beep/orbit",
    tier: "platform",
    status: "monitored",
    stars: 2,
    language: "TypeScript",
    description: "Social management tool — post, track growth, AI insights",
    integrationPoints: ["Social layer integration patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/SilkRoad",
    fork: "jdrains110-beep/SilkRoad",
    tier: "platform",
    status: "monitored",
    stars: 82,
    language: "JavaScript",
    description: "E-commerce platform by Vietnamese Pioneers",
    integrationPoints: ["Multi-vendor Pi commerce patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/geraipi",
    fork: "jdrains110-beep/geraipi",
    tier: "platform",
    status: "monitored",
    stars: 16,
    language: "JavaScript",
    description: "Indonesian P2App Marketplace — Pi Coin transactions",
    integrationPoints: ["Emerging market commerce patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/shop-online",
    fork: "jdrains110-beep/shop-online",
    tier: "platform",
    status: "monitored",
    stars: 24,
    language: "Mixed",
    description: "List products/services for Pi exchange",
    integrationPoints: ["Product listing Pi marketplace"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/pailot-for-pi",
    fork: "jdrains110-beep/pailot-for-pi",
    tier: "platform",
    status: "monitored",
    stars: 22,
    language: "TypeScript",
    description: "Pilot platform for Pi apps",
    integrationPoints: ["App discovery patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/internet-speed",
    fork: "jdrains110-beep/internet-speed",
    tier: "platform",
    status: "monitored",
    stars: 15,
    language: "CSS",
    description: "Internet speed test utility for Pi",
    integrationPoints: ["Network diagnostics"],
    localBindings: ["app/diagnostic/"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: COMMUNITY — Hackathon winners, games, utilities
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "pi-apps/LatinChain",
    fork: "jdrains110-beep/LatinChain",
    tier: "community",
    status: "monitored",
    stars: 121,
    language: "JavaScript",
    description: "Pi Hackathon 2021 winner — game with Pi payments",
    integrationPoints: ["Gamification payment patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/wepisharp",
    fork: "jdrains110-beep/wepisharp",
    tier: "community",
    status: "monitored",
    stars: 64,
    language: "C#",
    description: 'WePi — "Reddit" social network on Pi',
    integrationPoints: ["Social network Pi integration"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/crumbles",
    fork: "jdrains110-beep/crumbles",
    tier: "community",
    status: "monitored",
    stars: 39,
    language: "Python",
    description: "Community chat app with Pi auth and payments",
    integrationPoints: ["Chat/messaging Pi integration"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/NewsForPi",
    fork: "jdrains110-beep/NewsForPi",
    tier: "community",
    status: "monitored",
    stars: 40,
    language: "Mixed",
    description: "Pi Network Web3 platform — content, stats, tracking",
    integrationPoints: ["News aggregation patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/ez-invoice",
    fork: "jdrains110-beep/ez-invoice",
    tier: "community",
    status: "monitored",
    stars: 24,
    language: "TypeScript",
    description: "Invoice generator for Pi payments",
    integrationPoints: ["Invoice/billing Pi patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/qrcodepay",
    fork: "jdrains110-beep/qrcodepay",
    tier: "community",
    status: "monitored",
    stars: 8,
    language: "JavaScript",
    description: "QR code payment tool for Pioneers",
    integrationPoints: ["QR code payment flow"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/dcert",
    fork: "jdrains110-beep/dcert",
    tier: "community",
    status: "monitored",
    stars: 6,
    language: "TypeScript",
    description: "Decentralized certificate system",
    integrationPoints: ["Certificate issuance on blockchain"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/polls-for-pi",
    fork: "jdrains110-beep/polls-for-pi",
    tier: "community",
    status: "monitored",
    stars: 20,
    language: "TypeScript",
    description: "Polling/voting system for Pi community",
    integrationPoints: ["On-chain governance patterns"],
    localBindings: ["app/judicial/"],
  },
  {
    upstream: "pi-apps/dao-mall-for-pi",
    fork: "jdrains110-beep/dao-mall-for-pi",
    tier: "community",
    status: "monitored",
    stars: 20,
    language: "Mixed",
    description: "DAO-powered marketplace for Pi",
    integrationPoints: ["DAO governance + commerce"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/tippy",
    fork: "jdrains110-beep/tippy",
    tier: "community",
    status: "monitored",
    stars: 11,
    language: "Mixed",
    description: "Tipping utility for Pi",
    integrationPoints: ["Micro-payment tipping flow"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/voice-of-pi",
    fork: "jdrains110-beep/voice-of-pi",
    tier: "community",
    status: "monitored",
    stars: 13,
    language: "HTML",
    description: "Voice platform for Pi community",
    integrationPoints: ["Audio content Pi monetization"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/store-on-pi",
    fork: "jdrains110-beep/store-on-pi",
    tier: "community",
    status: "monitored",
    stars: 9,
    language: "Java",
    description: "Store/marketplace on Pi",
    integrationPoints: ["Java Pi commerce reference"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/radio-for-us",
    fork: "jdrains110-beep/radio-for-us",
    tier: "community",
    status: "monitored",
    stars: 11,
    language: "HTML",
    description: "Radio streaming platform for Pi community",
    integrationPoints: ["Streaming content monetization"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/memegen",
    fork: "jdrains110-beep/memegen",
    tier: "community",
    status: "monitored",
    stars: 8,
    language: "Kotlin",
    description: "Meme generator for Pi",
    integrationPoints: ["Content creation monetization"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/blog-for-pi",
    fork: "jdrains110-beep/blog-for-pi",
    tier: "community",
    status: "monitored",
    stars: 11,
    language: "Mixed",
    description: "Blogging platform for Pi community",
    integrationPoints: ["Content publishing Pi payments"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/trivia-on-pi",
    fork: "jdrains110-beep/trivia-on-pi",
    tier: "community",
    status: "monitored",
    stars: 11,
    language: "Mixed",
    description: "Trivia game with Pi rewards",
    integrationPoints: ["Game reward patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/math-madness",
    fork: "jdrains110-beep/math-madness",
    tier: "community",
    status: "monitored",
    stars: 8,
    language: "TypeScript",
    description: "Math game for Pi community",
    integrationPoints: ["Educational gamification"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/insult-o-meter",
    fork: "jdrains110-beep/insult-o-meter",
    tier: "community",
    status: "monitored",
    stars: 57,
    language: "HTML",
    description: "Fun insult generator — Pi Hackathon entry",
    integrationPoints: ["Pi auth integration pattern"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/toko-emas-berlian-harisa",
    fork: "jdrains110-beep/toko-emas-berlian-harisa",
    tier: "community",
    status: "monitored",
    stars: 11,
    language: "PHP",
    description: "Gold/jewelry marketplace on Pi",
    integrationPoints: ["Precious metals commerce patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/2345pi-app-nav",
    fork: "jdrains110-beep/2345pi-app-nav",
    tier: "community",
    status: "monitored",
    stars: 19,
    language: "CSS",
    description: "Pi app navigation/discovery portal",
    integrationPoints: ["App directory patterns"],
    localBindings: [],
  },
  {
    upstream: "pi-apps/carrierwave-google-storage",
    fork: "jdrains110-beep/carrierwave-google-storage",
    tier: "community",
    status: "monitored",
    stars: 6,
    language: "Ruby",
    description: "Google Cloud Storage adapter for Pi apps",
    integrationPoints: ["Cloud storage integration"],
    localBindings: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: UPSTREAM — Stellar foundation (Pi's base layer)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "stellar/stellar-core",
    fork: "jdrains110-beep/stellar-core",
    tier: "upstream",
    status: "upstream-tracked",
    stars: 3200,
    language: "C++",
    description: "Stellar Core — upstream consensus engine Pi is built on",
    integrationPoints: [
      "Protocol version tracking",
      "SCP consensus reference",
      "Captive core integration",
    ],
    localBindings: [
      "lib/stellar/scp-auto-update.ts",
      "docker/scp-upgrader/",
    ],
  },
  {
    upstream: "stellar/go",
    fork: "jdrains110-beep/go",
    tier: "upstream",
    status: "upstream-tracked",
    stars: 1400,
    language: "Go",
    description: "Stellar Go (Horizon + SDK) — upstream for Pi Horizon",
    integrationPoints: [
      "Horizon API reference",
      "Ingestion patterns",
      "REST API spec",
    ],
    localBindings: [
      "docker/horizon-guardian/",
      "lib/blockchain/docker-node-bridge.ts",
    ],
  },
  {
    upstream: "stellar/js-stellar-sdk",
    fork: "jdrains110-beep/js-stellar-sdk",
    tier: "upstream",
    status: "fully-integrated",
    stars: 600,
    language: "TypeScript",
    description: "Stellar JavaScript SDK — used directly in our app",
    integrationPoints: [
      "Transaction building",
      "Keypair generation",
      "Account operations",
      "Asset management",
      "DEX offers",
    ],
    localBindings: [
      "lib/stellar/stellar-pi-coin-sdk.ts",
      "app/api/pi/token/issue/route.ts",
      "app/api/pi/wallet/route.ts",
      "app/api/pi-dex/trading/swap/route.ts",
    ],
  },
  {
    upstream: "stellar/stellar-protocol",
    fork: "jdrains110-beep/stellar-protocol",
    tier: "upstream",
    status: "upstream-tracked",
    stars: 500,
    language: "Mixed",
    description: "Stellar protocol specifications (SEPs, CAPs)",
    integrationPoints: [
      "SEP-0010 (Web Authentication)",
      "SEP-0024 (Anchor/Deposit)",
      "CAP protocol proposals",
    ],
    localBindings: [
      "lib/stellar/smart-contract-integration.ts",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: CORE — minepi organization
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "minepi/hello-world",
    fork: "jdrains110-beep/hello-world",
    tier: "core",
    status: "monitored",
    stars: 0,
    language: "HTML",
    description: "minepi official GitHub — hello world",
    integrationPoints: ["Organization tracking"],
    localBindings: [],
  },
  {
    upstream: "minepi/minepi.github.io",
    fork: "jdrains110-beep/minepi.github.io",
    tier: "core",
    status: "monitored",
    stars: 0,
    language: "HTML",
    description: "minepi official site — Pi documentation hub",
    integrationPoints: ["Pi Network reference documentation"],
    localBindings: [],
  },
  {
    upstream: "minepi/One-KVM",
    fork: "jdrains110-beep/One-KVM",
    tier: "core",
    status: "monitored",
    stars: 0,
    language: "Python",
    description: "KVM-based remote management (Pi hardware integration)",
    integrationPoints: ["Remote Pi Node management"],
    localBindings: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRegistryStats() {
  const total = PI_ECOSYSTEM_REGISTRY.length;
  const byTier = PI_ECOSYSTEM_REGISTRY.reduce(
    (acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
      return acc;
    },
    {} as Record<RepoTier, number>
  );
  const byStatus = PI_ECOSYSTEM_REGISTRY.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<IntegrationStatus, number>
  );
  const totalStars = PI_ECOSYSTEM_REGISTRY.reduce((s, r) => s + r.stars, 0);

  return { total, byTier, byStatus, totalStars };
}

export function getFullyIntegratedRepos() {
  return PI_ECOSYSTEM_REGISTRY.filter((r) => r.status === "fully-integrated");
}

export function getReposByTier(tier: RepoTier) {
  return PI_ECOSYSTEM_REGISTRY.filter((r) => r.tier === tier);
}

export function findRepoByUpstream(upstream: string) {
  return PI_ECOSYSTEM_REGISTRY.find((r) => r.upstream === upstream);
}
