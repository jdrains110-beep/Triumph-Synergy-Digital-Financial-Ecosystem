"use client";

/**
 * TRISYN smoke-test page — real Pi SDK payment flow via the Superior Pi SDK.
 *
 * Exercises ensurePiReady → piAuthenticate → piPay, with full live transcript
 * via setPiTelemetry. Hardcoded testnet so a sandbox payment in Pi Browser
 * round-trips through /api/pi/approve and /api/pi/complete with
 * X-Pi-Network: testnet.
 */

import { useEffect, useState } from "react";
import {
  ensurePiReady,
  getCachedPiAuth,
  piAuthenticate,
  piPay,
  setPiTelemetry,
} from "@/lib/pi/superior-sdk";

const NETWORK = "testnet" as const;

export default function TrisynTestPage() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [piStatus, setPiStatus] = useState<"loading" | "ready" | "error">("loading");
  const [user, setUser] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0.01);

  function push(line: string) {
    const ts = new Date().toISOString().substring(11, 23);
    setLog((prev) => [...prev, `[${ts}] ${line}`]);
    console.log("[trisyn-test]", line);
  }

  useEffect(() => {
    setPiTelemetry((e) => push(`SDK · ${e.type} · ${JSON.stringify(e).substring(0, 200)}`));
    ensurePiReady(NETWORK)
      .then(() => {
        setPiStatus("ready");
        push(`SDK ready (network=${NETWORK})`);
      })
      .catch((err) => {
        setPiStatus("error");
        push(`SDK init failed: ${(err as Error).message}`);
      });
  }, []);

  async function signIn() {
    setBusy(true);
    try {
      const auth = getCachedPiAuth() ?? (await piAuthenticate(["username", "payments"]));
      setUser(auth.user.username);
      push(`Authenticated as @${auth.user.username} (uid=${auth.user.uid})`);
    } catch (err) {
      push(`Auth failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    push(`Creating payment: amount=${amount} π, memo='TRISYN smoke test'`);
    const r = await piPay(
      {
        amount,
        memo: "TRISYN smoke test",
        metadata: { kind: "trisyn-smoke-test" },
      },
      {
        onApproved: (id) => push(`✓ approved server-side: ${id}`),
        onCompleted: (id, txid) => push(`✓ completed: ${id} txid=${txid}`),
        onCancel: (id) => push(`× cancelled: ${id}`),
        onError: (e) => push(`× error: ${(e as Error)?.message ?? String(e)}`),
      },
    );
    push(`piPay → ${JSON.stringify(r).substring(0, 300)}`);
    setBusy(false);
  }

  const canPay = piStatus === "ready" && !busy;

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>
        TRISYN — Testnet Payment Smoke Test
      </h1>
      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
        Real Pi SDK payment against the Pi Testnet sandbox via the Superior Pi SDK
        (<code>lib/pi/superior-sdk.ts</code>). Exercises{" "}
        <code>ensurePiReady → piAuthenticate → piPay</code> →{" "}
        <code>/api/pi/approve</code> + <code>/api/pi/complete</code> with{" "}
        <code>X-Pi-Network: {NETWORK}</code>.
      </p>

      <section
        style={{
          marginTop: 16,
          padding: 12,
          background: "#f6f6f6",
          borderRadius: 8,
        }}
      >
        <div>
          <strong>Pi SDK status:</strong> {piStatus}
        </div>
        <div>
          <strong>Signed in:</strong> {user ?? "(not yet — tap Sign in)"}
        </div>
        <div>
          <strong>Network:</strong> {NETWORK}
        </div>
      </section>

      <section style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={signIn}
          disabled={busy || piStatus !== "ready"}
          style={btnStyle(busy || piStatus !== "ready", "#1c8ad1")}
        >
          {user ? `Re-auth (${user})` : "Sign in with Pi"}
        </button>
      </section>

      <section style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>
          Amount (π — testnet, no real value)
        </label>
        <input
          type="number"
          step="0.001"
          min="0.001"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0.01)}
          style={{
            padding: 8,
            fontSize: 16,
            width: 140,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
          disabled={busy}
        />
        <button onClick={pay} disabled={!canPay} style={{ ...btnStyle(!canPay, "#6c1cd1"), marginLeft: 12 }}>
          {busy ? "Working…" : `Pay ${amount} π (testnet)`}
        </button>
      </section>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>Transcript</h2>
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 12,
            borderRadius: 8,
            fontSize: 11,
            lineHeight: 1.4,
            maxHeight: 360,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {log.length === 0 ? "(initializing…)" : log.join("\n")}
        </pre>
      </section>
    </main>
  );
}

function btnStyle(disabled: boolean, color: string): React.CSSProperties {
  return {
    padding: "10px 20px",
    fontSize: 16,
    background: disabled ? "#aaa" : color,
    color: "white",
    border: 0,
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
