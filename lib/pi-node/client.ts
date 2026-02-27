import type { PiNodeRegistry } from "@/types/pi-node";

export async function fetchPiNodeRegistry(): Promise<PiNodeRegistry> {
  const response = await fetch("/api/pi/node/registry", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Pi node registry");
  }

  return response.json();
}

export async function verifyPiNodeSignature(params: {
  publicKey: string;
  message: string;
  signature: string;
}): Promise<boolean> {
  const response = await fetch("/api/pi/node/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Pi node signature verification failed");
  }

  const payload = await response.json();
  return Boolean(payload.verified);
}
