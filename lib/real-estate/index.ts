// lib/real-estate/index.ts — Sovereign Real Estate Platform barrel exports

export * from "./sovereign-re-types";
export { scanPropertyLoopholes } from "./re-loophole-scanner";
export {
  createListing,
  tokenizeProperty,
  createPiTransaction,
  createDAOProposal,
  distributeRentalYield,
  getListing,
  getAllListings,
  getToken,
  getTransaction,
  getDAOProposal,
  getYieldHistory,
  getPlatformStats,
  seedDemoListings,
  type CreateListingInput,
} from "./sovereign-re-engine";
