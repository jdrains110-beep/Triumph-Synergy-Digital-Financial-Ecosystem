/**
 * Triumph-Synergy Application Domain Configuration
 * 
 * ULTIMATE SOURCE OF TRUTH: triumphsynergy0576.pinet.com
 * NO SUBDOMAINS. NO VERCEL. ONLY THE ULTIMATE URL.
 */

export const APP_CONFIG = {
  // THE ONLY URL
  ULTIMATE_URL: "https://triumphsynergy0576.pinet.com",
  
  // Get the canonical app URL
  getCanonicalUrl: (): string => {
    return APP_CONFIG.ULTIMATE_URL;
  },
  
  // Get display URL - ALWAYS the ultimate URL
  getDisplayUrl: (): string => {
    return APP_CONFIG.ULTIMATE_URL;
  },
  
  // Get the domain/hostname
  getDomain: (): string => {
    return "triumphsynergy0576.pinet.com";
  },
} as const;

export default APP_CONFIG;
