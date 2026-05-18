"use client";

/**
 * @fileoverview Web3 Provider — React context for decentralized wallet & identity state
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Wraps the entire app with Web3 context: wallet connection, on-chain identity,
 * DID resolution, and real-time blockchain state. Integrates with Pi SDK Provider
 * for Pi Browser environments and StellarWallet for direct Stellar access.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { WalletState } from "./stellar-wallet";

export type Web3Context = {
  /** Whether the Web3 layer is initialized */
  isReady: boolean;
  /** Connected wallet public key */
  publicKey: string | null;
  /** DID string if identity is established */
  did: string | null;
  /** Network (mainnet or testnet) */
  network: "mainnet" | "testnet";
  /** Wallet balance and state */
  walletState: WalletState | null;
  /** Connect wallet via Pi SDK */
  connectPiWallet: () => Promise<void>;
  /** Disconnect wallet */
  disconnect: () => void;
  /** Sign a message with the connected wallet */
  signMessage: (message: string) => Promise<string>;
  /** Verify a transaction on-chain */
  verifyTransaction: (txHash: string) => Promise<boolean>;
  /** Current blockchain height */
  ledgerSequence: number | null;
  /** Whether the user is in Pi Browser */
  isPiBrowser: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
};

const Web3Ctx = createContext<Web3Context | undefined>(undefined);

function detectNetwork(): "mainnet" | "testnet" {
  if (typeof window === "undefined") return "testnet";
  const hostname = window.location.hostname;
  if (
    hostname.includes("mainnet") ||
    hostname === "triumphsynergyab2099.pinet.com" ||
    hostname.includes("7386.pinet.com")
  ) {
    return "mainnet";
  }
  return "testnet";
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [walletState, setWalletState] = useState<WalletState | null>(null);
  const [ledgerSequence, setLedgerSequence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [network] = useState(detectNetwork);
  const [isPiBrowser, setIsPiBrowser] = useState(false);

  // Detect Pi Browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    setIsPiBrowser(ua.includes("PiBrowser") || !!(window as any).Pi);
    setIsReady(true);
  }, []);

  // Stream ledger updates for real-time blockchain awareness
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancel: (() => void) | null = null;

    (async () => {
      try {
        const { OnChainVerifier } = await import("./on-chain-verifier");
        const verifier = new OnChainVerifier(network);
        const latest = await verifier.getLatestLedger();
        setLedgerSequence(latest.sequence);

        cancel = verifier.streamLedgers((ledger: any) => {
          setLedgerSequence(ledger.sequence);
        });
      } catch {
        // Horizon unavailable — non-fatal
      }
    })();

    return () => {
      cancel?.();
    };
  }, [network]);

  const connectPiWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if ((window as any).Pi) {
        // Pi Browser — use Pi SDK authenticate
        const Pi = (window as any).Pi;
        const authResult = await Pi.authenticate(["username", "payments"], () => {});
        const uid = authResult.user.uid;
        setPublicKey(uid);
        setDid(`did:pi:${uid}`);

        // Fetch wallet state from Horizon
        try {
          const { StellarWallet } = await import("./stellar-wallet");
          const wallet = new StellarWallet(network);
          wallet.restoreFromPublicKey(uid);
          const state = await wallet.getWalletState();
          setWalletState(state);
        } catch {
          // Wallet may not have a Stellar account yet
        }
      } else {
        setError("Pi Browser required for wallet connection");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  }, [network]);

  const disconnect = useCallback(() => {
    setPublicKey(null);
    setDid(null);
    setWalletState(null);
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!publicKey) throw new Error("No wallet connected");
      // In Pi Browser, we use the server-side challenge-response flow
      const response = await fetch("/api/web3/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, message }),
      });
      if (!response.ok) throw new Error("Signing failed");
      const { signature } = await response.json();
      return signature;
    },
    [publicKey]
  );

  const verifyTransaction = useCallback(
    async (txHash: string): Promise<boolean> => {
      try {
        const { OnChainVerifier } = await import("./on-chain-verifier");
        const verifier = new OnChainVerifier(network);
        const result = await verifier.verifyTransaction(txHash);
        return result.verified;
      } catch {
        return false;
      }
    },
    [network]
  );

  const value = useMemo<Web3Context>(
    () => ({
      isReady,
      publicKey,
      did,
      network,
      walletState,
      connectPiWallet,
      disconnect,
      signMessage,
      verifyTransaction,
      ledgerSequence,
      isPiBrowser,
      isLoading,
      error,
    }),
    [
      isReady,
      publicKey,
      did,
      network,
      walletState,
      connectPiWallet,
      disconnect,
      signMessage,
      verifyTransaction,
      ledgerSequence,
      isPiBrowser,
      isLoading,
      error,
    ]
  );

  return <Web3Ctx.Provider value={value}>{children}</Web3Ctx.Provider>;
}

export function useWeb3(): Web3Context {
  const ctx = useContext(Web3Ctx);
  if (!ctx) {
    throw new Error("useWeb3 must be used within a <Web3Provider>");
  }
  return ctx;
}
