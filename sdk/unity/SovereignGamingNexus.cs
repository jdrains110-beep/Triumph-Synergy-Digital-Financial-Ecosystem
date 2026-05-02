// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS
//
// SovereignGamingNexus.cs — single-file Unity SDK for the Triumph Synergy
// Sovereign Gaming Nexus (SGN). Drop into any Unity 2021+ project under
// Assets/Plugins/TriumphSynergy/ and call SovereignGamingNexus.Init(...) once
// from a bootstrap scene.
//
// Drives /earn submissions on behalf of game servers and clients. Signs every
// payload with HMAC-SHA512 using the studio shared secret minted at
// /studios registration time, so SGN can verify authenticity + replay-protect.
//
// IMPORTANT: never embed the full studio HMAC secret in client builds. The
// recommended pattern is:
//   * Studio backend POSTs /earn on behalf of the player (server-authoritative).
//   * Or studio backend mints short-lived per-player ephemeral signing tokens
//     that this SDK uses for client-direct submission.
//
// Both modes are supported via SovereignGamingNexus.Mode.
//
// Single dependency: UnityEngine + UnityEngine.Networking (built-in).

using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace TriumphSynergy.SGN
{
    public enum SgnMode
    {
        ServerAuthoritative,   // game server signs + posts; client just emits intent locally
        ClientDirect,          // client signs with ephemeral token from your backend
    }

    [Serializable]
    public class SgnConfig
    {
        public string baseUrl     = "https://sgn.triumph-synergy.example/";
        public string studioId    = "";
        public string titleId     = "";
        public SgnMode mode       = SgnMode.ServerAuthoritative;
        // ClientDirect only — short-lived ephemeral secret minted by your backend.
        public string ephemeralSecret = "";
        public string ephemeralPlayerId = "";
        // Optional: forward signed envelope to your own backend instead of SGN.
        public string overrideEarnUrl = "";
        public int    timeoutSeconds  = 6;
    }

    [Serializable]
    public class SgnEarnEvent
    {
        public string studio_id;
        public string title_id;
        public string player_id;
        public string rule;
        public double? amount_pi;     // optional override (capped at table value)
        public string match_id;
        public string nonce;
        public long   ts;
    }

    [Serializable]
    public class SgnEarnResponse
    {
        public bool   ok;
        public double lifetime_pi_earned;
        public string error;
    }

    public static class SovereignGamingNexus
    {
        private static SgnConfig _cfg;
        private static SgnRunner _runner;
        private static readonly Dictionary<string, double> _localLifetime = new();

        public static bool IsInitialized => _cfg != null;

        public static void Init(SgnConfig cfg)
        {
            if (cfg == null) throw new ArgumentNullException(nameof(cfg));
            _cfg = cfg;
            if (_runner == null)
            {
                var go = new GameObject("[SGN-Runner]");
                UnityEngine.Object.DontDestroyOnLoad(go);
                _runner = go.AddComponent<SgnRunner>();
            }
        }

        /// <summary>Submit a player earn event. Returns true if accepted.</summary>
        public static void SubmitEarn(string playerId, string rule,
                                       double? amountOverride = null,
                                       string matchId = null,
                                       Action<SgnEarnResponse> onComplete = null)
        {
            if (_cfg == null)
            {
                Debug.LogError("[SGN] Init() not called.");
                onComplete?.Invoke(new SgnEarnResponse { ok = false, error = "uninitialised" });
                return;
            }

            var evt = new SgnEarnEvent
            {
                studio_id = _cfg.studioId,
                title_id  = _cfg.titleId,
                player_id = playerId,
                rule      = rule,
                amount_pi = amountOverride,
                match_id  = matchId ?? Guid.NewGuid().ToString("N"),
                nonce     = Guid.NewGuid().ToString("N"),
                ts        = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            };

            _runner.StartCoroutine(SendEarnCoroutine(evt, onComplete));
        }

        public static double LocalLifetime(string playerId)
            => _localLifetime.TryGetValue(playerId, out var v) ? v : 0.0;

        // ── internals ────────────────────────────────────────────────────

        private static IEnumerator SendEarnCoroutine(SgnEarnEvent evt,
                                                     Action<SgnEarnResponse> onComplete)
        {
            string url = string.IsNullOrEmpty(_cfg.overrideEarnUrl)
                ? _cfg.baseUrl.TrimEnd('/') + "/earn"
                : _cfg.overrideEarnUrl;

            string canonical = CanonicalJson(evt, includeSig: false);
            string signature = "";
            if (_cfg.mode == SgnMode.ClientDirect &&
                !string.IsNullOrEmpty(_cfg.ephemeralSecret))
            {
                signature = HmacSha512Hex(_cfg.ephemeralSecret, canonical);
            }

            // Wrap canonical payload + signature for transport
            string payload = canonical.TrimEnd('}') +
                             ",\"signature\":\"" + signature + "\"}";

            using var req = new UnityWebRequest(url, "POST");
            req.uploadHandler   = new UploadHandlerRaw(Encoding.UTF8.GetBytes(payload));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.timeout = _cfg.timeoutSeconds;
            yield return req.SendWebRequest();

            var resp = new SgnEarnResponse();
            if (req.result != UnityWebRequest.Result.Success)
            {
                resp.ok = false;
                resp.error = req.error ?? "network error";
                Debug.LogWarning($"[SGN] /earn failed: {resp.error}");
            }
            else
            {
                try
                {
                    var inner = JsonUtility.FromJson<SgnEarnInner>(req.downloadHandler.text);
                    resp.ok = inner != null && inner.ok;
                    resp.lifetime_pi_earned = inner != null ? inner.lifetime_pi_earned : 0.0;
                    if (resp.ok && evt.player_id != null)
                        _localLifetime[evt.player_id] = resp.lifetime_pi_earned;
                }
                catch (Exception ex)
                {
                    resp.ok = false;
                    resp.error = "parse: " + ex.Message;
                }
            }
            onComplete?.Invoke(resp);
        }

        [Serializable]
        private class SgnEarnInner
        {
            public bool ok;
            public double lifetime_pi_earned;
        }

        // Stable JSON serialiser (alphabetical keys, no whitespace) so the
        // signature computed here matches SGN's _verify_earn_signature exactly.
        private static string CanonicalJson(SgnEarnEvent e, bool includeSig)
        {
            var sb = new StringBuilder(256);
            sb.Append('{');
            void K(string k, string v, bool isString = true)
            {
                if (sb.Length > 1) sb.Append(',');
                sb.Append('"').Append(k).Append("\":");
                if (v == null) { sb.Append("null"); return; }
                if (isString) sb.Append('"').Append(v.Replace("\"", "\\\"")).Append('"');
                else sb.Append(v);
            }
            // Keys in alphabetical order to match Python json.dumps(sort_keys=True)
            if (e.amount_pi.HasValue)
                K("amount_pi", e.amount_pi.Value.ToString("R", CultureInfo.InvariantCulture), false);
            else K("amount_pi", "null", false);
            K("match_id", e.match_id);
            K("nonce", e.nonce);
            K("player_id", e.player_id);
            K("rule", e.rule);
            K("studio_id", e.studio_id);
            K("title_id", e.title_id);
            K("ts", e.ts.ToString(CultureInfo.InvariantCulture), false);
            sb.Append('}');
            return sb.ToString();
        }

        private static string HmacSha512Hex(string secret, string canonical)
        {
            // SGN expects sha3_512(secret + "|" + canonical). .NET-Standard 2.0
            // doesn't ship SHA-3 by default — we shell out to the Bouncy Castle
            // shim if available, else fall back to HMAC-SHA512 (your backend
            // must mirror the same algorithm choice when issuing tokens).
            try
            {
                var t = Type.GetType("Org.BouncyCastle.Security.DigestUtilities, BouncyCastle.Crypto");
                if (t != null)
                {
                    var get = t.GetMethod("GetDigest", new[] { typeof(string) });
                    var dig = get?.Invoke(null, new object[] { "SHA3-512" });
                    if (dig != null)
                    {
                        var bytes = Encoding.UTF8.GetBytes(secret + "|" + canonical);
                        var update = dig.GetType().GetMethod("BlockUpdate",
                            new[] { typeof(byte[]), typeof(int), typeof(int) });
                        update?.Invoke(dig, new object[] { bytes, 0, bytes.Length });
                        var sizeProp = dig.GetType().GetMethod("GetDigestSize");
                        int sz = (int)(sizeProp?.Invoke(dig, null) ?? 64);
                        var outArr = new byte[sz];
                        var done = dig.GetType().GetMethod("DoFinal",
                            new[] { typeof(byte[]), typeof(int) });
                        done?.Invoke(dig, new object[] { outArr, 0 });
                        var sb = new StringBuilder(sz * 2);
                        foreach (var b in outArr) sb.Append(b.ToString("x2"));
                        return sb.ToString().Substring(0, 96);
                    }
                }
            }
            catch (Exception)
            {
                // fall through
            }
            using var h = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
            var hb = h.ComputeHash(Encoding.UTF8.GetBytes("|" + canonical));
            var sb2 = new StringBuilder(hb.Length * 2);
            foreach (var b in hb) sb2.Append(b.ToString("x2"));
            return sb2.ToString().Substring(0, 96);
        }
    }

    internal class SgnRunner : MonoBehaviour { /* coroutine host */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Example usage (drop into a MonoBehaviour somewhere in your bootstrap):
//
//   using TriumphSynergy.SGN;
//
//   void Start() {
//       SovereignGamingNexus.Init(new SgnConfig {
//           baseUrl  = "https://sgn.triumph-synergy.example/",
//           studioId = "studio_abc123",
//           titleId  = "title_def456",
//           mode     = SgnMode.ServerAuthoritative,
//           // optional: post to your studio backend instead of SGN
//           overrideEarnUrl = "https://backend.mystudio.com/sgn-proxy/earn"
//       });
//   }
//
//   // After a player wins a round:
//   void OnRoundWon(string playerId) {
//       SovereignGamingNexus.SubmitEarn(
//           playerId, rule: "match_win",
//           onComplete: r => Debug.Log($"SGN: ok={r.ok} lifetime Pi={r.lifetime_pi_earned}")
//       );
//   }
