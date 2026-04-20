import { compare } from "bcrypt-ts";
import NextAuth, { type DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { DUMMY_PASSWORD } from "@/lib/constants";
import { createGuestUser, getUser } from "@/lib/db/queries";
import { Web3Auth } from "@/lib/web3/web3-auth";
import {
  SovereignCitizenEngine,
  type SovereignTitle,
  type SovereignTier,
} from "@/lib/sovereign-finance";
import { authConfig } from "./auth.config";

export type UserType = "guest" | "regular" | "wallet";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      /** Stellar / Pi public key (Web3 sessions) */
      publicKey?: string;
      /** DID string (Web3 sessions) */
      did?: string;
      /** Sovereign citizen status — auto-granted on Pi KYC */
      isSovereign?: boolean;
      /** Sovereign title: King, Queen, or Sovereign */
      sovereignTitle?: SovereignTitle;
      /** Sovereign tier based on Pi engagement */
      sovereignTier?: SovereignTier;
      /** Full styled sovereign name */
      sovereignName?: string;
    } & DefaultSession["user"];
  }

  // biome-ignore lint/nursery/useConsistentTypeDefinitions: "Required"
  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
    publicKey?: string;
    did?: string;
    isSovereign?: boolean;
    sovereignTitle?: SovereignTitle;
    sovereignTier?: SovereignTier;
    sovereignName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
    publicKey?: string;
    did?: string;
    isSovereign?: boolean;
    sovereignTitle?: SovereignTitle;
    sovereignTier?: SovereignTier;
    sovereignName?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    // =========================================================
    // PRIMARY: Pi Network wallet identity (sovereign Web3 auth)
    // Verified via Pi Platform API accessToken or
    // Stellar challenge-response signature.
    // =========================================================
    Credentials({
      id: "wallet",
      credentials: {},
      async authorize({ accessToken, publicKey, challenge, signature, network }: any) {
        try {
          let session;
          if (accessToken) {
            // Pi Browser flow — verify via Pi Platform API
            session = await Web3Auth.verifyPiAuth(accessToken, network || "testnet");
          } else if (publicKey && challenge && signature) {
            // Direct Stellar wallet flow — challenge-response
            session = Web3Auth.verifyChallenge(publicKey, challenge, signature, network || "testnet");
          } else {
            return null;
          }
          return {
            id: session.uid || session.publicKey,
            email: null,
            type: "wallet" as const,
            publicKey: session.publicKey,
            did: `did:pi:${session.publicKey}`,
          };
        } catch (error) {
          console.error("Wallet auth error:", error);
          return null;
        }
      },
    }),
    // =========================================================
    // GUEST: Ephemeral sovereign session (no identity required)
    // =========================================================
    Credentials({
      id: "guest",
      credentials: {},
      async authorize() {
        try {
          const [guestUser] = await createGuestUser();
          return { ...guestUser, type: "guest" };
        } catch (error) {
          console.error("Guest auth error:", error);
          return {
            id: "guest-" + Date.now(),
            email: "guest@local",
            type: "guest",
          };
        }
      },
    }),
    // =========================================================
    // LEGACY FALLBACK: Email + password (only for users who
    // registered before the sovereign migration).
    // New registrations should use Pi wallet.
    // =========================================================
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        try {
          const users = await getUser(email);

          if (users.length === 0) {
            await compare(password, DUMMY_PASSWORD);
            return null;
          }

          const [user] = users;

          if (!user.password) {
            await compare(password, DUMMY_PASSWORD);
            return null;
          }

          const passwordsMatch = await compare(password, user.password);

          if (!passwordsMatch) {
            return null;
          }

          return { ...user, type: "regular" };
        } catch (error) {
          console.error("Auth credentials error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
        if (user.publicKey) token.publicKey = user.publicKey;
        if (user.did) token.did = user.did;

        // Auto-detect sovereign status for wallet users (Pi KYC'd)
        if (user.type === "wallet" && user.publicKey) {
          try {
            const engine = SovereignCitizenEngine.getInstance();
            const identity = engine.getByWallet(user.publicKey);
            if (identity && identity.status === "active") {
              token.isSovereign = true;
              token.sovereignTitle = identity.title;
              token.sovereignTier = identity.tier;
              token.sovereignName = identity.sovereignName;
            }
          } catch {
            // Non-blocking — sovereign lookup failure doesn't break auth
          }
        }

        // Also carry through if user object already has sovereign fields
        if (user.isSovereign) {
          token.isSovereign = user.isSovereign;
          if (user.sovereignTitle) token.sovereignTitle = user.sovereignTitle;
          if (user.sovereignTier) token.sovereignTier = user.sovereignTier;
          if (user.sovereignName) token.sovereignName = user.sovereignName;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
        if (token.publicKey) session.user.publicKey = token.publicKey;
        if (token.did) session.user.did = token.did;

        // Expose sovereign status in session
        if (token.isSovereign) {
          session.user.isSovereign = token.isSovereign;
          session.user.sovereignTitle = token.sovereignTitle;
          session.user.sovereignTier = token.sovereignTier;
          session.user.sovereignName = token.sovereignName;
        }
      }

      return session;
    },
  },
});
