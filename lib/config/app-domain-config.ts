/**
 * Triumph-Synergy Application Domain Configuration
 * 
 * AUTHORITATIVE SOURCE: triumphsynergy0576.pinet.com IS THE PRIMARY/ULTIMATE APP URL
 * 
 * The application MUST serve from and recognize ONLY the pinet domain as the canonical URL.
 * The Vercel deployment URL is an internal implementation detail and should NOT be exposed to users.
 */

export const APP_CONFIG = {
  // PRIMARY APP URL - THE ULTIMATE URL
  PINET_PRIMARY_DOMAIN: "https://triumphsynergy0576.pinet.com",
  
  // Subdomain Variants (for reference only - not primary)
  TESTNET_SUBDOMAIN: "https://triumphsynergy1991.pinet.com",
  MAINNET_SUBDOMAIN: "https://triumphsynergy7386.pinet.com",
  
  // Internal Vercel Deployment (NOT FOR USER DISPLAY)
  VERCEL_DEPLOYMENT_URL: "https://triumph-synergy.vercel.app",
  
  // Get the canonical app URL for metadata/display
  getCanonicalUrl: (): string => {
    // Always return the primary pinet domain
    return APP_CONFIG.PINET_PRIMARY_DOMAIN;
  },
  
  // Check if running in pinet domain (user-facing)
  isPinetDomain: (hostname: string): boolean => {
    return hostname.includes("pinet.com");
  },
  
  // Get display URL for user-facing interfaces
  // SHOULD ALWAYS BE THE PINET DOMAIN, NEVER THE VERCEL URL
  getDisplayUrl: (): string => {
    return APP_CONFIG.PINET_PRIMARY_DOMAIN;
  },
  
  // System status - should show ONLY pinet domain as primary
  getSystemStatus: () => ({
    name: "Triumph Synergy",
    description: "Pi Network Payment Platform",
    primaryUrl: APP_CONFIG.PINET_PRIMARY_DOMAIN,
    pinetDomain: "triumphsynergy0576.pinet.com",
    vercelDeployment: APP_CONFIG.VERCEL_DEPLOYMENT_URL,
    
    // IMPORTANT: Display only shows pinet domain to users
    // The Vercel URL is implementation detail, never shown in UI
    displayInfo: {
      appUrl: APP_CONFIG.PINET_PRIMARY_DOMAIN,
      accessPoint: "https://triumphsynergy0576.pinet.com (Pi Browser)",
      // NO MENTION OF VERCEL URL IN USER DISPLAY
    },
  }),
} as const;

// Export for use throughout the application
export default APP_CONFIG;
