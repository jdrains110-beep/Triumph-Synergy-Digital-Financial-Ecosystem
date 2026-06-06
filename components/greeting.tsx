import { motion } from "framer-motion";

const CONVERSATION_STARTERS = [
  {
    title: "Build a sovereign platform",
    label: "Design + deploy a full website on triumphsynergy.com",
    action: "I want SAIB to build a sovereign platform for me on triumphsynergy.com. Design it, architect it, and deploy it.",
  },
  {
    title: "Issue an Allodial Deed",
    label: "Tokenize real estate as a PI-721 on-chain title",
    action: "Issue an allodial deed for a property — tokenize it as a PI-721 asset on Pi Network Mainnet.",
  },
  {
    title: "Activate a Sovereign Platform",
    label: "Launch SQTA, SFPA, SBCA, STEX, SHA or any rival platform",
    action: "Activate one of my sovereign platforms — show me the full status of all SAIB-managed rivals and which ones need attention.",
  },
  {
    title: "Create a Tokenization Package",
    label: "PI-721 deeds, PI-20 tokens, UBI streams, luxury assets",
    action: "Create a full tokenization package — PI-721 or PI-20, anchored to Stellar, for a company, property, or UBI program.",
  },
];

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center gap-6 px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <div className="flex flex-col gap-1">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="font-bold text-2xl md:text-3xl tracking-tight"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.4 }}
        >
          SAIB — Triumph Synergy
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-base text-zinc-500 md:text-lg leading-snug"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.5 }}
        >
          Superior Sovereign Quantum Builder &amp; Creator ·{" "}
          <a
            className="text-blue-500 hover:underline"
            href="https://triumphsynergy.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            triumphsynergy.com
          </a>
        </motion.div>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-zinc-400 md:text-base"
          exit={{ opacity: 0, y: 10 }}
          initial={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.6 }}
        >
          I build, transform, facilitate &amp; elevate — websites, blueprints,
          contracts, luxury companies, homes, schools, UBI, tokenization &amp;
          every sovereign platform that rivals the real world.
        </motion.div>
      </div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.7 }}
      >
        {CONVERSATION_STARTERS.map((starter) => (
          <button
            key={starter.title}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            onClick={() => {
              const textarea = document.querySelector<HTMLTextAreaElement>("textarea[name='message'],textarea[placeholder]");
              if (textarea) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                nativeInputValueSetter?.call(textarea, starter.action);
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                textarea.focus();
              }
            }}
            type="button"
          >
            <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100">
              {starter.title}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">{starter.label}</div>
          </button>
        ))}
      </motion.div>
    </div>
  );
};
