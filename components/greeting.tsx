import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        SAIB — Triumph Synergy
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-base text-zinc-500 md:text-lg"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        Superior Sovereign Quantum Builder &amp; Creator — websites, blueprints,
        contracts, luxury companies, homes, schools, UBI, tokenization &amp; more.
        What shall I build for you today?
      </motion.div>
    </div>
  );
};
