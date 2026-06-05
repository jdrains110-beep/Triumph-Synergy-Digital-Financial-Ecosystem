#!/usr/bin/env python3
"""
generate_ecosystem.py
Generates html_storefronts/ directory tree for the 22 Triumph Synergy .pi domains.
Each domain folder receives an index.html with branded GCV checkout UI.
Run once from the repo root:  python3 generate_ecosystem.py
"""

import os
import html as html_escape

# ─── 22 Premium .pi Domains ─────────────────────────────────────────────────
DOMAINS = [
    # Explicitly defined brands
    {"slug": "wingstop",                  "name": "Wingstop",                       "category": "Food & Dining"},
    {"slug": "gru",                       "name": "Gainesville Regional Utilities",  "category": "Utilities"},
    {"slug": "netjets",                   "name": "NetJets",                        "category": "Private Aviation"},
    {"slug": "sonnysbbq",                 "name": "Sonny's BBQ",                    "category": "Food & Dining"},
    {"slug": "shands",                    "name": "Shands Hospital",                "category": "Healthcare"},
    {"slug": "ufhealth",                  "name": "UF Health",                      "category": "Healthcare"},
    {"slug": "ufl",                       "name": "University of Florida",          "category": "Education"},
    {"slug": "putnamclerk",               "name": "Putnam County Clerk",            "category": "Government"},
    {"slug": "checkbeck",                 "name": "Checkbeck",                      "category": "Financial Services"},
    {"slug": "daytonainternationalspeedway", "name": "Daytona International Speedway", "category": "Sports & Entertainment"},
    {"slug": "gracekennedy",              "name": "GraceKennedy",                   "category": "Conglomerate"},
    {"slug": "winnebago",                 "name": "Winnebago",                      "category": "Recreation & Travel"},
    {"slug": "palatkaha",                 "name": "Palatka Home Alliance",          "category": "Real Estate"},
    {"slug": "circuit7",                  "name": "Circuit 7 Court",                "category": "Legal"},
    {"slug": "magellanjets",              "name": "Magellan Jets",                  "category": "Private Aviation"},
    {"slug": "rulonco",                   "name": "Rulonco",                        "category": "Technology"},
    {"slug": "appleandeve",               "name": "Apple & Eve",                    "category": "Food & Beverage"},
    {"slug": "seprod",                    "name": "Seprod Group",                   "category": "Manufacturing"},
    {"slug": "jamrockmart",               "name": "JamrockMart",                    "category": "Retail"},
    # Three additional sovereign domains to reach 22
    {"slug": "triumphsynergy",            "name": "Triumph Synergy",                "category": "Sovereign Finance"},
    {"slug": "sovereignpay",              "name": "SovereignPay",                   "category": "Sovereign Finance"},
    {"slug": "pioscapital",               "name": "Pi-OS Capital",                  "category": "Sovereign Finance"},
]

# ─── Constants ───────────────────────────────────────────────────────────────
GCV_USD          = "314,159.00"       # Gold Canonical Value per Pi (display)
GCV_DECIMAL      = "314159.00"        # machine-readable
GOLD_OZ_PER_PI   = "134.54"
BASE_DIR         = os.path.join(os.path.dirname(__file__), "html_storefronts")


def _category_icon(category: str) -> str:
    icons = {
        "Food & Dining":           "🍗",
        "Utilities":               "⚡",
        "Private Aviation":        "✈️",
        "Healthcare":              "🏥",
        "Education":               "🎓",
        "Government":              "🏛️",
        "Financial Services":      "💳",
        "Sports & Entertainment":  "🏁",
        "Conglomerate":            "🌐",
        "Recreation & Travel":     "🚐",
        "Real Estate":             "🏠",
        "Legal":                   "⚖️",
        "Technology":              "💻",
        "Food & Beverage":         "🍎",
        "Manufacturing":           "🏭",
        "Retail":                  "🛒",
        "Sovereign Finance":       "🔱",
    }
    return icons.get(category, "🌟")


def render_storefront(domain: dict) -> str:
    slug     = domain["slug"]
    name     = html_escape.escape(domain["name"])
    category = html_escape.escape(domain["category"])
    icon     = _category_icon(domain["category"])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{name} | Pi Sovereign Storefront</title>
  <style>
    :root {{
      --gold:   #c9a227;
      --deep:   #0b0e1a;
      --card:   #111827;
      --accent: #1e3a5f;
      --text:   #e8ddb5;
      --radius: 12px;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--deep);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }}
    .card {{
      background: var(--card);
      border: 1px solid var(--gold);
      border-radius: var(--radius);
      max-width: 560px;
      width: 100%;
      padding: 2.5rem 2rem;
      box-shadow: 0 0 40px rgba(201,162,39,.15);
    }}
    .icon {{ font-size: 3rem; text-align: center; margin-bottom: .5rem; }}
    h1 {{
      font-size: 1.75rem;
      color: var(--gold);
      text-align: center;
      margin-bottom: .25rem;
    }}
    .category {{
      text-align: center;
      font-size: .85rem;
      opacity: .65;
      margin-bottom: 1.5rem;
    }}
    .gcv-badge {{
      background: var(--accent);
      border-radius: 8px;
      padding: .75rem 1rem;
      margin-bottom: 1.5rem;
      font-size: .9rem;
    }}
    .gcv-badge strong {{ color: var(--gold); }}
    label {{ display: block; font-size: .85rem; margin-bottom: .35rem; opacity: .8; }}
    input {{
      width: 100%;
      padding: .6rem .75rem;
      background: #1a2332;
      border: 1px solid #2d4a6e;
      border-radius: 8px;
      color: var(--text);
      font-size: 1rem;
      margin-bottom: 1rem;
    }}
    input:focus {{ outline: 2px solid var(--gold); border-color: transparent; }}
    .usd-equiv {{
      font-size: .8rem;
      opacity: .6;
      margin-top: -.75rem;
      margin-bottom: 1rem;
    }}
    button {{
      width: 100%;
      padding: .85rem;
      background: linear-gradient(135deg, var(--gold), #a07918);
      color: #0b0e1a;
      font-size: 1rem;
      font-weight: 700;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: opacity .2s;
    }}
    button:hover  {{ opacity: .9; }}
    button:active {{ opacity: .75; }}
    #status {{
      margin-top: 1rem;
      min-height: 1.5rem;
      font-size: .85rem;
      text-align: center;
    }}
    .ok  {{ color: #4ade80; }}
    .err {{ color: #f87171; }}
    footer {{
      margin-top: 2rem;
      font-size: .75rem;
      opacity: .4;
      text-align: center;
    }}
    a {{ color: var(--gold); text-decoration: none; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">{icon}</div>
    <h1>{name}</h1>
    <p class="category">{category} &mdash; <code>{slug}.pi</code></p>

    <div class="gcv-badge">
      <strong>Gold Canonical Value:</strong> 1 Pi&nbsp;=&nbsp;$314,159.00&nbsp;USD<br/>
      Gold backing: {GOLD_OZ_PER_PI}&nbsp;troy&nbsp;oz&nbsp;per&nbsp;Pi&nbsp;&bull;&nbsp;Sovereign settlement layer
    </div>

    <form id="payForm" onsubmit="handlePay(event)">
      <label for="wallet">Pi Wallet Address</label>
      <input id="wallet" type="text" placeholder="pi:// or @username" required
             autocomplete="off" spellcheck="false" />

      <label for="piAmount">Pi Amount</label>
      <input id="piAmount" type="number" step="0.000001" min="0.000001"
             placeholder="e.g. 0.001" required />
      <p class="usd-equiv" id="usdEquiv">&nbsp;</p>

      <button type="submit" id="payBtn">&#960;&nbsp;Pay with Pi</button>
    </form>

    <div id="status"></div>
  </div>

  <footer>
    Powered by <a href="http://triumphsynergy.pi">Triumph Synergy</a> &bull;
    Sovereign Pi-OS Ecosystem &bull; GCV $314,159/Pi
  </footer>

  <script>
    const GCV = {GCV_DECIMAL};
    const domain = "{slug}";

    document.getElementById('piAmount').addEventListener('input', function () {{
      const pi  = parseFloat(this.value) || 0;
      const usd = (pi * GCV).toLocaleString('en-US', {{ style: 'currency', currency: 'USD' }});
      document.getElementById('usdEquiv').textContent =
        pi > 0 ? `≈ ${{usd}} USD at GCV` : '\\u00a0';
    }});

    async function handlePay(e) {{
      e.preventDefault();
      const wallet   = document.getElementById('wallet').value.trim();
      const piAmount = parseFloat(document.getElementById('piAmount').value);
      const btn      = document.getElementById('payBtn');
      const status   = document.getElementById('status');

      if (!wallet || !(piAmount > 0)) return;

      btn.disabled  = true;
      btn.textContent = 'Processing…';
      status.className = '';
      status.textContent = '';

      try {{
        const res = await fetch('/api/settlement', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ domain, wallet, pi_amount: piAmount }})
        }});

        const data = await res.json();

        if (res.ok && data.status === 'settled') {{
          status.className = 'ok';
          status.textContent =
            `✓ Settled ${{piAmount}} Pi (${{(piAmount * GCV).toLocaleString('en-US',
              {{ style: 'currency', currency: 'USD' }})}}) — Ref: ${{data.cryptographic_proof?.slice(0, 16) ?? 'N/A'}}…`;
        }} else {{
          status.className = 'err';
          status.textContent = `✗ ${{data.detail ?? data.error ?? 'Settlement failed'}}`;
        }}
      }} catch (err) {{
        status.className = 'err';
        status.textContent = `✗ Network error: ${{err.message}}`;
      }} finally {{
        btn.disabled = false;
        btn.textContent = '\\u03c0\\u00a0Pay with Pi';
      }}
    }}
  </script>
</body>
</html>
"""


def render_master_hub(domains: list) -> str:
    domain_links = "\n".join(
        f'      <li><a href="http://{d["slug"]}.pi">'
        f'{_category_icon(d["category"])} {html_escape.escape(d["name"])}'
        f'</a> <span class="tag">{html_escape.escape(d["category"])}</span></li>'
        for d in domains
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Triumph Synergy | Sovereign Pi-OS Ecosystem</title>
  <style>
    :root {{
      --gold: #c9a227; --deep: #0b0e1a; --card: #111827;
      --text: #e8ddb5; --radius: 12px;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: var(--deep);
      color: var(--text);
      min-height: 100vh;
      padding: 3rem 2rem;
    }}
    h1 {{ color: var(--gold); font-size: 2.2rem; text-align: center; margin-bottom: .5rem; }}
    .subtitle {{ text-align: center; opacity: .6; margin-bottom: .25rem; }}
    .gcv {{ text-align: center; color: var(--gold); font-size: 1.1rem; margin-bottom: 2.5rem; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
      max-width: 960px;
      margin: 0 auto;
    }}
    .grid li {{
      list-style: none;
      background: var(--card);
      border: 1px solid #2d4a6e;
      border-radius: var(--radius);
      padding: .9rem 1rem;
      transition: border-color .2s;
    }}
    .grid li:hover {{ border-color: var(--gold); }}
    .grid a {{ color: var(--text); text-decoration: none; font-weight: 600; }}
    .tag {{
      display: block;
      font-size: .75rem;
      opacity: .5;
      margin-top: .25rem;
    }}
    footer {{ text-align: center; margin-top: 3rem; opacity: .35; font-size: .8rem; }}
  </style>
</head>
<body>
  <h1>&#128081; Triumph Synergy</h1>
  <p class="subtitle">Sovereign Pi-OS Digital Financial Ecosystem</p>
  <p class="gcv">Gold Canonical Value &mdash; 1 Pi = $314,159.00 USD &bull; {GOLD_OZ_PER_PI}&nbsp;troy&nbsp;oz gold</p>

  <ul class="grid">
{domain_links}
  </ul>

  <footer>
    22 Sovereign .pi Domains &bull; GCV $314,159/Pi &bull; Triumph Synergy &copy; 2025
  </footer>
</body>
</html>
"""


def main() -> None:
    os.makedirs(BASE_DIR, exist_ok=True)

    # Generate per-domain storefronts
    for domain in DOMAINS:
        domain_dir = os.path.join(BASE_DIR, domain["slug"])
        os.makedirs(domain_dir, exist_ok=True)
        index_path = os.path.join(domain_dir, "index.html")
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(render_storefront(domain))
        print(f"  ✓  {domain['slug']:35s}  →  {index_path}")

    # Generate master hub
    hub_dir = os.path.join(BASE_DIR, "master_hub")
    os.makedirs(hub_dir, exist_ok=True)
    hub_path = os.path.join(hub_dir, "index.html")
    with open(hub_path, "w", encoding="utf-8") as f:
        f.write(render_master_hub(DOMAINS))
    print(f"\n  ✓  master_hub                         →  {hub_path}")

    total = len(DOMAINS) + 1  # domains + master_hub
    print(f"\nGenerated {total} storefronts under {BASE_DIR}/")


if __name__ == "__main__":
    main()
