/**
 * Base64URL encoding/decoding utilities
 * Used for WebAuthn credential handling
 */

export const base64url = {
  /**
   * Encode buffer to base64url string
   */
  fromBuffer(buffer: ArrayBuffer | Uint8Array): string {
    const bytes =
      buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  },

  /**
   * Decode base64url string to buffer
   */
  toBuffer(str: string): ArrayBuffer {
    // Add padding if needed
    let padded = str;
    while (padded.length % 4 !== 0) {
      padded += "=";
    }

    const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
  },

  /**
   * Check if string is valid base64url
   */
  isValid(str: string): boolean {
    try {
      this.toBuffer(str);
      return true;
    } catch {
      return false;
    }
  },
};
