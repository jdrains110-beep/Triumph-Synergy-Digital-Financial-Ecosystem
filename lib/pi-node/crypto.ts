import { Keypair } from "@stellar/stellar-sdk";

export function verifyPiNodeSignature(params: {
  publicKey: string;
  message: string;
  signature: string;
}): boolean {
  const { publicKey, message, signature } = params;

  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");

    return keypair.verify(messageBytes, signatureBytes);
  } catch (error) {
    console.error("Pi node signature verification failed:", error);
    return false;
  }
}
