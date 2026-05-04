/**
 * Pi Network Ecosystem Registry — Master Integration Map
 * =========================================================
 * Maps every Pi Network GitHub repository to Triumph Synergy's integration layer.
 * This is the SINGLE SOURCE OF TRUTH for all Pi ecosystem connections.
 *
 * Organizations tracked:
 *   - pi-apps      (56 repos) — Official Pi Network developer platform
 *   - minepi       (3 repos)  — Pi Network core organization
 *   - stellar      (4 repos)  — Upstream Stellar foundation (Pi's base layer)
 *   - PiNetwork    (1 repo)   — Official PiRC standards (PiRC1 + PiRC2)
 *   - Pi-Defi-world(10 repos) — PiRC-compliant DeFi ecosystem (ZyraDex, ACBU, Pi Oracle)
 *   - KOSASIH      (25 repos) — Community Pi ecosystem (smart contracts, DeFi, AI, stablecoins)
 *   - Independent  (3 repos)  — Smart contracts, multisig escrow, contract generation
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: CORE — PiRC Standards (Pi Requests for Comment)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "PiNetwork/PiRC",
    fork: "jdrains110-beep/PiRC",
    tier: "core",
    status: "fully-integrated",
    stars: 25,
    language: "Markdown",
    description:
      "Official Pi Requests for Comment — PiRC1 (Token Design) & PiRC2 (Subscription Service Standard)",
    integrationPoints: [
      "PiRC1 token ecosystem design spec",
      "PiRC1 participation & allocation models",
      "PiRC1 TGE state management",
      "PiRC2 subscription lifecycle",
      "PiRC2 service management & query methods",
      "PiRC2 admin methods",
      "PiRC2 data types & error codes",
    ],
    localBindings: [
      "lib/pirc-official/ (git submodule)",
      "lib/pirc/index.ts",
      "lib/pirc/protocol-sync.ts",
      "types/pirc.ts",
      "app/api/pi/pirc/route.ts",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: PLATFORM — Pi-Defi-world (PiRC-compliant DeFi ecosystem)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "Pi-Defi-world/Zyradex-frontend",
    fork: "jdrains110-beep/Zyradex-frontend",
    tier: "platform",
    status: "forked-pending",
    stars: 5,
    language: "TypeScript",
    description:
      "ZyraDex — PiRC-compliant DeFi protocol on Pi Network (swap, liquidity, portfolio tracking)",
    integrationPoints: [
      "PiRC-compliant DeFi patterns",
      "Pi DEX swap/liquidity architecture",
      "Pi SDK authentication flow",
      "Wallet import via stellar-sdk",
      "Admin JWT auth pattern",
    ],
    localBindings: [
      "lib/pirc/index.ts",
      "lib/smart-contracts/contract-registry.ts",
    ],
  },
  {
    upstream: "Pi-Defi-world/pirc-smart-contracts-explainer",
    fork: "jdrains110-beep/pirc-smart-contracts-explainer",
    tier: "platform",
    status: "forked-pending",
    stars: 4,
    language: "Markdown",
    description:
      "PiRC Smart Contracts reference — ZyraDex features: Send/Receive, Swap, Trade, Invest, Borrow & Lend",
    integrationPoints: [
      "PiRC smart contract specification",
      "DeFi primitives on Pi (swap, lend, stake)",
      "Token economics patterns",
    ],
    localBindings: [
      "lib/smart-contracts/smart-contract-hub.ts",
      "lib/smart-contracts/contract-registry.ts",
    ],
  },
  {
    upstream: "Pi-Defi-world/acbu-smart-contract",
    fork: "jdrains110-beep/acbu-smart-contract",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "Rust",
    description: "ACBU smart contracts — Rust-based Pi Network contract implementations",
    integrationPoints: [
      "Rust smart contract patterns for Pi/Stellar",
      "Soroban contract deployment",
      "On-chain logic reference",
    ],
    localBindings: [
      "lib/smart-contracts/smart-contract-hub.ts",
      "docker/smart-contracts/",
    ],
  },
  {
    upstream: "Pi-Defi-world/acbu-frontend",
    fork: "jdrains110-beep/acbu-frontend",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "TypeScript",
    description: "ACBU frontend — Pi DeFi application UI (39 forks, active community)",
    integrationPoints: [
      "Pi DeFi UI patterns",
      "Wallet integration flow",
    ],
    localBindings: [],
  },
  {
    upstream: "Pi-Defi-world/acbu-backend",
    fork: "jdrains110-beep/acbu-backend",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "TypeScript",
    description: "ACBU backend — Pi DeFi API server (26 forks, active community)",
    integrationPoints: [
      "Pi DeFi API architecture",
      "Transaction processing patterns",
    ],
    localBindings: [],
  },
  {
    upstream: "Pi-Defi-world/pi-oracle",
    fork: "jdrains110-beep/pi-oracle",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "TypeScript",
    description: "Pi Oracle — on-chain price feed / data oracle for Pi Network",
    integrationPoints: [
      "Pi price oracle integration",
      "On-chain data feed patterns",
    ],
    localBindings: [
      "lib/pi-transaction/pi-smart-contracts.ts",
      "docker/blockchain-oracle/",
    ],
  },
  {
    upstream: "Pi-Defi-world/USDP-TEST",
    fork: "jdrains110-beep/USDP-TEST",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "TypeScript",
    description: "USDP stablecoin test implementation on Pi Network",
    integrationPoints: [
      "Pi stablecoin (USDP) patterns",
      "Token issuance on Pi mainnet",
    ],
    localBindings: [
      "lib/pi-transaction/pi-smart-contracts.ts",
    ],
  },
  {
    upstream: "Pi-Defi-world/passphrase-converter-js-typescript",
    fork: "jdrains110-beep/passphrase-converter-js-typescript",
    tier: "platform",
    status: "forked-pending",
    stars: 0,
    language: "JavaScript",
    description: "Passphrase/mnemonic to keypair converter for Pi/Stellar wallets",
    integrationPoints: [
      "Wallet key derivation",
      "Mnemonic passphrase handling",
    ],
    localBindings: [],
  },
  {
    upstream: "Pi-Defi-world/zyrachain-frontend-website",
    fork: "jdrains110-beep/zyrachain-frontend-website",
    tier: "platform",
    status: "monitored",
    stars: 0,
    language: "TypeScript",
    description: "ZyraChain marketing/docs website for Pi DeFi ecosystem",
    integrationPoints: ["Pi DeFi ecosystem documentation"],
    localBindings: [],
  },
  {
    upstream: "Pi-Defi-world/ACBU-DOCUMENTATION",
    fork: "jdrains110-beep/ACBU-DOCUMENTATION",
    tier: "platform",
    status: "monitored",
    stars: 0,
    language: "Markdown",
    description: "ACBU protocol documentation — Pi DeFi architecture reference",
    integrationPoints: ["Pi DeFi protocol documentation"],
    localBindings: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: COMMUNITY — KOSASIH Pi Network Ecosystem (smart contracts, DeFi, AI)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "KOSASIH/pi-nexus-autonomous-banking-network",
    fork: "jdrains110-beep/pi-nexus-autonomous-banking-network",
    tier: "community",
    status: "forked-pending",
    stars: 515,
    language: "Python",
    description:
      "Decentralized AI-driven autonomous banking on Pi Network (highest-starred Pi community project)",
    integrationPoints: [
      "Autonomous banking patterns",
      "AI-driven transaction routing",
      "Cross-bank Pi integration",
      "DeFi 2.0 primitives",
    ],
    localBindings: [
      "lib/smart-contracts/contract-orchestrator.ts",
    ],
  },
  {
    upstream: "KOSASIH/eulers-shield",
    fork: "jdrains110-beep/eulers-shield",
    tier: "community",
    status: "forked-pending",
    stars: 230,
    language: "Python",
    description:
      "AI-powered financial stabilization system for Pi Coin — blockchain + ML + cybersecurity",
    integrationPoints: [
      "Pi Coin value stabilization algorithms",
      "ML-based price prediction",
      "Cybersecurity audit patterns",
    ],
    localBindings: [
      "lib/pi-transaction/pi-smart-contracts.ts",
    ],
  },
  {
    upstream: "KOSASIH/pi-supernode",
    fork: "jdrains110-beep/pi-node",
    tier: "community",
    status: "forked-pending",
    stars: 154,
    language: "Python",
    description:
      "Enterprise-grade Pi supernode — cross-chain bridge, real-time explorer, production monitoring",
    integrationPoints: [
      "Supernode architecture",
      "Cross-chain bridge patterns",
      "Production monitoring",
    ],
    localBindings: [
      "docker-compose.yml (pi-central-node)",
      "lib/stellar/scp-auto-update.ts",
    ],
  },
  {
    upstream: "KOSASIH/quantum-pi-network",
    fork: "jdrains110-beep/quantum-pi-network",
    tier: "community",
    status: "forked-pending",
    stars: 154,
    language: "Python",
    description:
      "Quantum Pi mainnet project — post-quantum cryptography for Pi blockchain",
    integrationPoints: [
      "Quantum-resistant cryptography",
      "Pi blockchain extension protocols",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/stable-pi-core",
    fork: "jdrains110-beep/stable-pi-core",
    tier: "community",
    status: "forked-pending",
    stars: 114,
    language: "Python",
    description:
      "Stable-Pi-Core — quantum AI, IoT, edge computing, AR/VR for payments on Pi Network",
    integrationPoints: [
      "Stable payment protocols",
      "IoT device integration",
      "Edge computing patterns",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/nPinA-pi-network",
    fork: "jdrains110-beep/nPinA-pi-network",
    tier: "community",
    status: "forked-pending",
    stars: 88,
    language: "Python",
    description: "Neural Pi Network Architecture — AI-augmented Pi node networking",
    integrationPoints: [
      "Neural network Pi node optimization",
      "AI-driven consensus enhancement",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/PiConsensus",
    fork: "jdrains110-beep/PiConsensus",
    tier: "community",
    status: "forked-pending",
    stars: 68,
    language: "Python",
    description:
      "Decentralized AI-Powered Quantum-Resistant Stable Coin Ecosystem on Pi",
    integrationPoints: [
      "Consensus algorithm enhancements",
      "Stable coin mechanisms",
      "Quantum-resistant primitives",
    ],
    localBindings: [
      "lib/smart-contracts/contract-registry.ts",
    ],
  },
  {
    upstream: "KOSASIH/super-pi",
    fork: "jdrains110-beep/super-pi",
    tier: "community",
    status: "forked-pending",
    stars: 66,
    language: "C++",
    description:
      "Super Pi — sovereign Layer 2 blockchain with Shariah-compliant stablecoin ($SPI) and governance token ($SUPi)",
    integrationPoints: [
      "Layer 2 blockchain architecture",
      "Stablecoin pegging mechanism",
      "Governance token model",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/PiEcosystemHub",
    fork: "jdrains110-beep/PiEcosystemHub",
    tier: "community",
    status: "forked-pending",
    stars: 62,
    language: "JavaScript",
    description:
      "Comprehensive Pi dApp integration platform — interoperability & community governance",
    integrationPoints: [
      "dApp integration patterns",
      "Pi ecosystem interoperability",
      "Community governance",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/nexus-revoluter",
    fork: "jdrains110-beep/nexus-revoluter",
    tier: "community",
    status: "forked-pending",
    stars: 60,
    language: "Python",
    description:
      "Blockchain node with smart contract execution, wallet, and consensus algorithms for Pi",
    integrationPoints: [
      "Smart contract execution engine",
      "Decentralized wallet management",
      "Pi-specific consensus",
      "REST API for Pi transactions",
    ],
    localBindings: [
      "lib/smart-contracts/smart-contract-hub.ts",
      "lib/pi-transaction/pi-smart-contracts.ts",
    ],
  },
  {
    upstream: "KOSASIH/PiDualTx",
    fork: "jdrains110-beep/PiDualTx",
    tier: "community",
    status: "forked-pending",
    stars: 54,
    language: "Python",
    description:
      "Dual Value System DApp for Pi Network — internal ($314,159/Pi) vs external value transactions",
    integrationPoints: [
      "Dual value transaction model",
      "Pi pricing mechanisms",
    ],
    localBindings: [
      "components/dual-value-dashboard.tsx",
      "components/sustained-value-dashboard.tsx",
    ],
  },
  {
    upstream: "KOSASIH/pipfs-hub",
    fork: "jdrains110-beep/pipfs-hub",
    tier: "community",
    status: "forked-pending",
    stars: 50,
    language: "Python",
    description: "IPFS + Pi Network file management hub — decentralized storage integration",
    integrationPoints: [
      "IPFS file pinning on Pi",
      "Decentralized storage patterns",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/stellar-pi-coin-sdk",
    fork: "jdrains110-beep/stellar-pi-coin-sdk",
    tier: "community",
    status: "forked-pending",
    stars: 44,
    language: "Rust",
    description:
      "Hyper-Tech SDK for Pi Coin on Stellar — Soroban smart contracts, AI-verified origins, quantum-resistant crypto",
    integrationPoints: [
      "Soroban smart contract SDK",
      "Pi Coin Stellar integration",
      "Quantum-resistant crypto primitives",
    ],
    localBindings: [
      "lib/stellar/stellar-pi-coin-sdk.ts",
    ],
  },
  {
    upstream: "KOSASIH/matrix-pichain",
    fork: "jdrains110-beep/matrix-pichain",
    tier: "community",
    status: "forked-pending",
    stars: 32,
    language: "Python",
    description: "Matrix PiChain — revolutionary stablecoin ecosystem for global finance on Pi",
    integrationPoints: [
      "Stablecoin ecosystem patterns",
      "Global finance Pi integration",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/PiFinance-Core",
    fork: "jdrains110-beep/PiFinance-Core",
    tier: "community",
    status: "forked-pending",
    stars: 31,
    language: "JavaScript",
    description:
      "PiFinance stablecoin platform — mint/burn, liquidity, savings & loans, P2P lending",
    integrationPoints: [
      "Stablecoin mint/burn mechanism",
      "Liquidity pool management",
      "P2P lending smart contracts",
      "Price oracle integration",
    ],
    localBindings: [
      "lib/smart-contracts/contract-registry.ts",
      "lib/pi-transaction/pi-smart-contracts.ts",
    ],
  },
  {
    upstream: "KOSASIH/Hyper-Q",
    fork: "jdrains110-beep/Hyper-Q",
    tier: "community",
    status: "forked-pending",
    stars: 29,
    language: "Markdown",
    description:
      "World's First Quantum-Ready Smart Contract Protocol for Pi Network",
    integrationPoints: [
      "Quantum-ready smart contract architecture",
      "Post-quantum cryptography for Pi",
    ],
    localBindings: [
      "lib/smart-contracts/smart-contract-hub.ts",
    ],
  },
  {
    upstream: "KOSASIH/PiRC",
    fork: "jdrains110-beep/PiRC",
    tier: "community",
    status: "fully-integrated",
    stars: 29,
    language: "Python",
    description:
      "KOSASIH's PiRC fork — enhanced PiRC implementation with Python tooling (shared fork with PiNetwork/PiRC)",
    integrationPoints: [
      "PiRC standard extensions",
      "Python PiRC tooling",
    ],
    localBindings: [
      "lib/pirc-official/ (submodule)",
      "lib/pirc/index.ts",
      "types/pirc.ts",
    ],
  },
  {
    upstream: "KOSASIH/DAE-Core",
    fork: "jdrains110-beep/DAE-Core",
    tier: "community",
    status: "forked-pending",
    stars: 28,
    language: "JavaScript",
    description:
      "Decentralized Autonomous Economy framework — smart contracts, identity, tokenized incentives on Pi",
    integrationPoints: [
      "DAO governance smart contracts",
      "Decentralized identity verification",
      "Cross-chain interoperability protocols",
      "Tokenized incentive mechanisms",
    ],
    localBindings: [
      "lib/smart-contracts/contract-orchestrator.ts",
      "lib/smart-contracts/contract-registry.ts",
    ],
  },
  {
    upstream: "KOSASIH/NeuralMesh-Pi-Network",
    fork: "jdrains110-beep/NeuralMesh-Pi-Network",
    tier: "community",
    status: "forked-pending",
    stars: 23,
    language: "Python",
    description: "Next-gen Pi network with neural mesh optimization and AI-driven routing",
    integrationPoints: [
      "Neural mesh network topology",
      "AI node optimization",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/pi-block-explorer",
    fork: "jdrains110-beep/pi-block-explorer",
    tier: "community",
    status: "forked-pending",
    stars: 22,
    language: "Python",
    description: "Pi Block Explorer — user-friendly blockchain browsing interface",
    integrationPoints: [
      "Block explorer UI patterns",
      "Transaction data visualization",
    ],
    localBindings: [
      "components/PiRPCExplorer.tsx",
    ],
  },
  {
    upstream: "KOSASIH/pi-velocity-core",
    fork: "jdrains110-beep/pi-velocity-core",
    tier: "community",
    status: "forked-pending",
    stars: 20,
    language: "Python",
    description: "High-speed transaction processing system for Pi Network",
    integrationPoints: [
      "High-throughput transaction processing",
      "Pi transaction optimization",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/pi-coin-hyper-stablecoin",
    fork: "jdrains110-beep/pi-coin-hyper-stablecoin",
    tier: "community",
    status: "forked-pending",
    stars: 19,
    language: "Circom",
    description: "Hyper-Tech Stablecoin on Stellar Soroban — zero-knowledge proofs for Pi Coin",
    integrationPoints: [
      "Soroban stablecoin contracts",
      "ZK-proof integration",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/ultimate-pi-sdk",
    fork: "jdrains110-beep/ultimate-pi-sdk",
    tier: "community",
    status: "forked-pending",
    stars: 16,
    language: "Rust",
    description: "Ultimate hyper-tech SDK for Pi math and Pi Coin stablecoin — Soroban rs-sdk fork",
    integrationPoints: [
      "Rust Soroban SDK for Pi",
      "Stablecoin pricing logic",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/energonexus-monorepo",
    fork: "jdrains110-beep/energonexus-monorepo",
    tier: "community",
    status: "forked-pending",
    stars: 14,
    language: "Python",
    description: "Decentralized energy trading platform connecting Pi Nodes — green mining",
    integrationPoints: [
      "Energy-optimized Pi Node operation",
      "Green mining incentives",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/PiX-Pay-Integration",
    fork: "jdrains110-beep/PiX-Pay-Integration",
    tier: "community",
    status: "forked-pending",
    stars: 13,
    language: "JavaScript",
    description: "Pi Coin × Twitter (X) integration — wallet & micro-payment features",
    integrationPoints: [
      "Social media Pi payment integration",
      "Micro-payment patterns",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/PiNexus-Banking-Nexus",
    fork: "jdrains110-beep/PiNexus-Banking-Nexus",
    tier: "community",
    status: "forked-pending",
    stars: 7,
    language: "TypeScript",
    description:
      "Ultimate Decentralized AGI-Powered Ecosystem — DeFi 2.0, RWA tokenization, neural mining",
    integrationPoints: [
      "AGI-powered DeFi 2.0",
      "Real-world asset tokenization",
    ],
    localBindings: [],
  },
  {
    upstream: "KOSASIH/global-harmony-nexus-core",
    fork: "jdrains110-beep/global-harmony-nexus-core",
    tier: "community",
    status: "forked-pending",
    stars: 17,
    language: "Python",
    description: "DAO framework on Pi — global harmony governance system",
    integrationPoints: [
      "DAO governance on Pi",
      "Multi-sig governance patterns",
    ],
    localBindings: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER: COMMUNITY — Independent Pi Smart Contract repos
  // ═══════════════════════════════════════════════════════════════════════════
  {
    upstream: "derekgeisler/Pi-Network---Consensus-Smart-Contracts-Merkle-Roots",
    fork: "jdrains110-beep/Pi-Network---Consensus-Smart-Contracts-Merkle-Roots",
    tier: "community",
    status: "forked-pending",
    stars: 1,
    language: "Python",
    description:
      "Advanced Pi Coin with consensus, smart contracts (TokenSwap, Staking), Merkle trees, and digital signatures",
    integrationPoints: [
      "Merkle tree transaction verification",
      "TokenSwap & Staking contract patterns",
      "PoW consensus reference implementation",
      "Digital signature authentication",
    ],
    localBindings: [
      "lib/smart-contracts/smart-contract-hub.ts",
    ],
  },
  {
    upstream: "FireflyLaboratories/TrustedThirdParty",
    fork: "jdrains110-beep/TrustedThirdParty",
    tier: "community",
    status: "forked-pending",
    stars: 0,
    language: "TypeScript",
    description: "2-of-3 multisig escrow on Pi v23 mainnet — trusted third party protocol",
    integrationPoints: [
      "Multisig escrow patterns",
      "Pi mainnet v23 transaction signing",
    ],
    localBindings: [],
  },
  {
    upstream: "suisui0223/Pi-GLM",
    fork: "jdrains110-beep/Pi-GLM",
    tier: "community",
    status: "forked-pending",
    stars: 0,
    language: "Python",
    description: "Pi blockchain smart contract maker — automated contract generation",
    integrationPoints: [
      "Smart contract generation tooling",
      "Pi contract templates",
    ],
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
