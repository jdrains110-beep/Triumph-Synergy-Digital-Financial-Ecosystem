"""
Market Oracle — SAIB v8 Sovereign Market Intelligence
======================================================
Real-time and cached data across all major asset classes:

  Crypto    — CoinGecko public API (no key required)
              Pi Network on-chain metrics via pi-bridge-connector
  Stocks    — yfinance (Yahoo Finance, no key required)
  Bonds     — US Treasury yield curve via FRED / Treasury.gov (no key)
  Forex     — exchangerate.host free tier
  Fear/Greed — Alternative.me fear & greed index (crypto)

Data is refreshed on a configurable cadence and cached in memory.
All data is also injected into OmegaBrain for LLM context.

Endpoints exposed via app.py:
  GET  /market/snapshot       — full market snapshot (all asset classes)
  GET  /market/crypto         — top crypto prices + Pi Network
  GET  /market/stocks         — watchlist stocks (AAPL, NVDA, TSLA, BTC-USD…)
  GET  /market/bonds          — US Treasury yield curve
  GET  /market/fear-greed     — crypto fear & greed index
  POST /market/watchlist/add  — add ticker to watchlist
  GET  /market/watchlist      — current watchlist
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("sovereign.market_oracle")

# ── Config ────────────────────────────────────────────────────────────────────

_REFRESH_INTERVAL_S  = float(os.getenv("MARKET_REFRESH_INTERVAL_S",  "120"))  # 2-min default
_COINGECKO_BASE      = "https://api.coingecko.com/api/v3"
_FEAR_GREED_BASE     = "https://api.alternative.me"
_TREASURY_YIELDS_URL = "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=202506"
_EXCHANGE_RATE_BASE  = "https://open.er-api.com/v6/latest"

PI_BRIDGE_URL   = os.getenv("PI_BRIDGE_URL",   "http://triumph-pi-bridge-connector:8092")
BRIDGE_TOKEN    = os.getenv("PUBLIC_BRIDGE_TOKEN", "")

# Default crypto watchlist — Pi Network first
_DEFAULT_CRYPTO_IDS = [
    "pi-network", "bitcoin", "ethereum", "solana", "binancecoin",
    "ripple", "cardano", "dogecoin", "polkadot", "avalanche-2",
]

# Default stock watchlist
_DEFAULT_STOCK_TICKERS = [
    "AAPL", "MSFT", "NVDA", "TSLA", "GOOGL",
    "AMZN", "META", "BRK-B", "JPM", "GS",
    "SPY", "QQQ", "GLD", "TLT",
]

# ── Data Structures ───────────────────────────────────────────────────────────

@dataclass
class AssetQuote:
    symbol:     str
    name:       str
    price:      float
    change_24h: float  # percent
    market_cap: float  = 0.0
    volume_24h: float  = 0.0
    currency:   str    = "USD"
    source:     str    = ""
    ts:         float  = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol":     self.symbol,
            "name":       self.name,
            "price":      self.price,
            "change_24h": round(self.change_24h, 4),
            "market_cap": self.market_cap,
            "volume_24h": self.volume_24h,
            "currency":   self.currency,
            "source":     self.source,
            "ts":         self.ts,
        }


# ── Market Oracle engine ──────────────────────────────────────────────────────

class MarketOracle:
    """
    Sovereign market intelligence — reads crypto, stocks, bonds, forex,
    and Pi Network metrics. Zero mandatory API keys needed.
    """

    def __init__(self) -> None:
        self._crypto_cache:      Dict[str, AssetQuote] = {}
        self._stock_cache:       Dict[str, AssetQuote] = {}
        self._bond_yields:       Dict[str, float]      = {}
        self._fear_greed:        Dict[str, Any]        = {}
        self._forex:             Dict[str, float]      = {}
        self._pi_metrics:        Dict[str, Any]        = {}
        self._last_refresh:      float                 = 0.0
        self._refresh_errors:    int                   = 0
        self._brain                                    = None
        self._extra_crypto:      List[str]             = []
        self._extra_stocks:      List[str]             = []
        self._task: Optional[asyncio.Task]             = None

    def boot(self, brain=None) -> None:
        self._brain = brain
        self._task  = asyncio.create_task(self._refresh_loop())
        log.info("[MarketOracle] Booted — refresh every %.0fs", _REFRESH_INTERVAL_S)

    def add_to_watchlist(self, ticker: str, asset_type: str = "crypto") -> None:
        if asset_type == "crypto":
            if ticker not in _DEFAULT_CRYPTO_IDS and ticker not in self._extra_crypto:
                self._extra_crypto.append(ticker)
        else:
            if ticker.upper() not in _DEFAULT_STOCK_TICKERS and ticker.upper() not in self._extra_stocks:
                self._extra_stocks.append(ticker.upper())

    # ── Refresh loop ──────────────────────────────────────────────────────────

    async def _refresh_loop(self) -> None:
        # Initial short delay to let other services start
        await asyncio.sleep(5)
        while True:
            try:
                await self._refresh_all()
            except Exception as e:
                self._refresh_errors += 1
                log.warning("[MarketOracle] refresh error: %s", e)
            await asyncio.sleep(_REFRESH_INTERVAL_S)

    async def _refresh_all(self) -> None:
        t0 = time.time()
        await asyncio.gather(
            self._fetch_crypto(),
            self._fetch_stocks(),
            self._fetch_bonds(),
            self._fetch_fear_greed(),
            self._fetch_pi_metrics(),
            return_exceptions=True,
        )
        self._last_refresh = time.time()
        elapsed = round((self._last_refresh - t0) * 1000)
        log.info("[MarketOracle] Refreshed in %dms — %d crypto, %d stocks",
                 elapsed, len(self._crypto_cache), len(self._stock_cache))
        # Push snapshot into OmegaBrain
        if self._brain:
            try:
                self._brain.remember("market:snapshot", self.snapshot()[:2000] if isinstance(self.snapshot(), str) else self.snapshot())
            except Exception:
                pass

    # ── Crypto (CoinGecko free) ───────────────────────────────────────────────

    async def _fetch_crypto(self) -> None:
        ids = list(dict.fromkeys(_DEFAULT_CRYPTO_IDS + self._extra_crypto))
        ids_str = ",".join(ids)
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(
                    f"{_COINGECKO_BASE}/simple/price",
                    params={
                        "ids":                  ids_str,
                        "vs_currencies":        "usd",
                        "include_market_cap":   "true",
                        "include_24hr_vol":     "true",
                        "include_24hr_change":  "true",
                    },
                )
                if r.status_code == 429:
                    log.debug("[MarketOracle] CoinGecko rate-limited")
                    return
                r.raise_for_status()
                data = r.json()
        except Exception as e:
            log.debug("[MarketOracle] CoinGecko error: %s", e)
            return

        for cid, vals in data.items():
            self._crypto_cache[cid] = AssetQuote(
                symbol     = cid,
                name       = cid.replace("-", " ").title(),
                price      = vals.get("usd", 0.0),
                change_24h = vals.get("usd_24h_change", 0.0),
                market_cap = vals.get("usd_market_cap", 0.0),
                volume_24h = vals.get("usd_24h_vol", 0.0),
                source     = "coingecko",
            )

    # ── Stocks (yfinance via subprocess — avoids heavy dep in import path) ────

    async def _fetch_stocks(self) -> None:
        tickers = list(dict.fromkeys(_DEFAULT_STOCK_TICKERS + self._extra_stocks))
        try:
            import yfinance as yf  # type: ignore
            # Run in thread pool to avoid blocking event loop
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._yf_fetch, tickers)
            self._stock_cache.update(data)
        except ImportError:
            pass  # yfinance not installed — stocks unavailable
        except Exception as e:
            log.debug("[MarketOracle] yfinance error: %s", e)

    @staticmethod
    def _yf_fetch(tickers: List[str]) -> Dict[str, AssetQuote]:
        import yfinance as yf  # type: ignore
        result: Dict[str, AssetQuote] = {}
        try:
            data = yf.download(
                tickers=" ".join(tickers),
                period="2d",
                interval="1d",
                group_by="ticker",
                auto_adjust=True,
                progress=False,
                threads=True,
            )
            for t in tickers:
                try:
                    if len(tickers) == 1:
                        close_series = data["Close"]
                    else:
                        close_series = data[t]["Close"]
                    closes = close_series.dropna()
                    if len(closes) >= 2:
                        prev, curr = float(closes.iloc[-2]), float(closes.iloc[-1])
                        chg = ((curr - prev) / prev) * 100 if prev else 0.0
                    elif len(closes) == 1:
                        curr = float(closes.iloc[-1])
                        chg  = 0.0
                    else:
                        continue
                    result[t] = AssetQuote(
                        symbol=t, name=t, price=round(curr, 4),
                        change_24h=round(chg, 4), source="yfinance",
                    )
                except Exception:
                    continue
        except Exception:
            pass
        return result

    # ── US Treasury bonds (FRED-compatible XML) ───────────────────────────────

    async def _fetch_bonds(self) -> None:
        """Fetch US Treasury yield curve from treasury.gov."""
        try:
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(_TREASURY_YIELDS_URL)
                if not r.is_success:
                    return
                # Parse XML for the latest row
                import xml.etree.ElementTree as ET
                root = ET.fromstring(r.text)
                ns = {"m": "http://www.w3.org/2005/Atom"}
                entries = root.findall(".//m:entry", ns) or root.findall("entry")
                if not entries:
                    # fallback: find all elements with yield data
                    entries = root.findall(".//{*}entry")
                if entries:
                    last = entries[-1]
                    # Extract key yield fields
                    def _val(tag: str) -> Optional[float]:
                        el = last.find(f".//*{{*}}{tag}")
                        if el is not None and el.text:
                            try:
                                return float(el.text)
                            except ValueError:
                                pass
                        return None
                    yields = {
                        "1mo":  _val("d_1_MO"),
                        "3mo":  _val("d_3_MO"),
                        "6mo":  _val("d_6_MO"),
                        "1yr":  _val("d_1_YR"),
                        "2yr":  _val("d_2_YR"),
                        "5yr":  _val("d_5_YR"),
                        "10yr": _val("d_10_YR"),
                        "20yr": _val("d_20_YR"),
                        "30yr": _val("d_30_YR"),
                    }
                    self._bond_yields = {k: v for k, v in yields.items() if v is not None}
        except Exception as e:
            log.debug("[MarketOracle] Treasury yields error: %s", e)

    # ── Fear & Greed index ────────────────────────────────────────────────────

    async def _fetch_fear_greed(self) -> None:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"{_FEAR_GREED_BASE}/fng/")
                r.raise_for_status()
                data = r.json()
            if data.get("data"):
                d = data["data"][0]
                self._fear_greed = {
                    "value":              int(d.get("value", 0)),
                    "value_classification": d.get("value_classification", ""),
                    "timestamp":          int(d.get("timestamp", 0)),
                }
        except Exception as e:
            log.debug("[MarketOracle] Fear/Greed error: %s", e)

    # ── Pi Network metrics (via bridge) ───────────────────────────────────────

    async def _fetch_pi_metrics(self) -> None:
        try:
            headers = {}
            if BRIDGE_TOKEN:
                headers["Authorization"] = f"Bearer {BRIDGE_TOKEN}"
            async with httpx.AsyncClient(timeout=15) as c:
                r = await c.get(f"{PI_BRIDGE_URL}/bridge/status", headers=headers)
                if r.is_success:
                    data = r.json()
                    pi_node = data.get("pi_node", {})
                    self._pi_metrics = {
                        "ledger_sequence": pi_node.get("ledger_sequence"),
                        "ledger_closed_at": pi_node.get("ledger_closed_at"),
                        "network":          pi_node.get("network"),
                        "protocol_version": pi_node.get("protocol_version"),
                        "horizon_version":  pi_node.get("horizon_version"),
                        "reachable":        pi_node.get("reachable"),
                    }
        except Exception as e:
            log.debug("[MarketOracle] Pi metrics error: %s", e)

    # ── Public API ────────────────────────────────────────────────────────────

    def snapshot(self) -> Dict[str, Any]:
        return {
            "crypto":     [q.to_dict() for q in self._crypto_cache.values()],
            "stocks":     [q.to_dict() for q in self._stock_cache.values()],
            "bonds_usd":  self._bond_yields,
            "fear_greed": self._fear_greed,
            "pi_network": self._pi_metrics,
            "last_refresh": self._last_refresh,
            "refresh_errors": self._refresh_errors,
        }

    def crypto(self) -> List[Dict[str, Any]]:
        return [q.to_dict() for q in self._crypto_cache.values()]

    def stocks(self) -> List[Dict[str, Any]]:
        return [q.to_dict() for q in self._stock_cache.values()]

    def bonds(self) -> Dict[str, float]:
        return dict(self._bond_yields)

    def fear_greed(self) -> Dict[str, Any]:
        return dict(self._fear_greed)

    def watchlist(self) -> Dict[str, List[str]]:
        return {
            "crypto": _DEFAULT_CRYPTO_IDS + self._extra_crypto,
            "stocks": _DEFAULT_STOCK_TICKERS + self._extra_stocks,
        }

    def stats(self) -> Dict[str, Any]:
        return {
            "crypto_count":   len(self._crypto_cache),
            "stock_count":    len(self._stock_cache),
            "bond_tenors":    len(self._bond_yields),
            "last_refresh":   self._last_refresh,
            "refresh_errors": self._refresh_errors,
            "pi_reachable":   self._pi_metrics.get("reachable", False),
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
market_oracle = MarketOracle()
