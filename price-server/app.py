"""
Stock price proxy for the portfolio dashboard, using pykrx (KRX-listed
stocks/ETFs) and yfinance (overseas stocks). Both libraries scrape/call
public data sources that don't require an API key or IP whitelisting, so
this can run on any free host (Render, etc.) — unlike the Kiwoom Securities
API this replaces, which required a pre-registered fixed IP.

Also proxies a tiny cross-device sync store (see sync.py) so the dashboard's
localStorage-only holdings/transactions can be shared between a phone and a
laptop via a short code, without any user accounts.

Endpoints:
  GET  /health                     -> { ok: true }
  GET  /api/us-stock?symbol=AAPL   -> { price, changePercent }
  GET  /api/kr-stock?code=005930   -> { price, changePercent }
  POST /api/sync                   -> { code }               (create)
  GET  /api/sync/<code>            -> <stored JSON state>
  PUT  /api/sync/<code>            -> { ok: true }            (overwrite)
"""
import os
from datetime import datetime, timedelta

import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS
from pykrx import stock

from sync import SyncNotConfigured, SyncNotFound, SyncTooLarge, create_sync, read_sync, write_sync

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "https://huhsanghun-dot.github.io",
    "http://localhost:5173",
]
CORS(app, origins=ALLOWED_ORIGINS)


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.post("/api/sync")
def sync_create():
    try:
        code = create_sync(request.get_data(as_text=True) or "{}")
        return jsonify(code=code)
    except SyncTooLarge:
        return jsonify(error="data too large"), 413
    except SyncNotConfigured:
        return jsonify(error="sync store not configured"), 501


@app.get("/api/sync/<code>")
def sync_read(code: str):
    try:
        raw = read_sync(code)
        return app.response_class(raw, mimetype="application/json")
    except SyncNotFound:
        return jsonify(error="sync code not found"), 404
    except SyncNotConfigured:
        return jsonify(error="sync store not configured"), 501


@app.put("/api/sync/<code>")
def sync_write(code: str):
    try:
        write_sync(code, request.get_data(as_text=True) or "{}")
        return jsonify(ok=True)
    except SyncNotFound:
        return jsonify(error="sync code not found"), 404
    except SyncTooLarge:
        return jsonify(error="data too large"), 413
    except SyncNotConfigured:
        return jsonify(error="sync store not configured"), 501


@app.get("/api/us-stock")
def us_stock():
    symbol = request.args.get("symbol")
    if not symbol:
        return jsonify(error="symbol is required"), 400
    try:
        # history() pulls from Yahoo's chart API and is far more stable across
        # Yahoo's response-format changes than fast_info's summary parsing.
        hist = yf.Ticker(symbol).history(period="5d")
        closes = hist["Close"].dropna() if not hist.empty else hist
        if closes.empty:
            return jsonify(error="no price data found"), 404

        price = float(closes.iloc[-1])
        change_percent = None
        if len(closes) >= 2 and closes.iloc[-2]:
            change_percent = (price - closes.iloc[-2]) / closes.iloc[-2] * 100
        return jsonify(price=price, changePercent=change_percent)
    except Exception as err:  # noqa: BLE001 - report upstream failure to caller
        return jsonify(error=str(err)), 502


@app.get("/api/kr-stock")
def kr_stock():
    code = request.args.get("code")
    if not code:
        return jsonify(error="code is required"), 400
    try:
        today = datetime.now()
        df = None
        # Walk back up to 7 days to skip weekends/holidays with no trading data.
        for days_back in range(7):
            day = (today - timedelta(days=days_back)).strftime("%Y%m%d")
            candidate = stock.get_market_ohlcv_by_date(day, day, code)
            if candidate is not None and not candidate.empty:
                df = candidate
                break
        if df is None:
            return jsonify(error="no price data found"), 404

        row = df.iloc[-1]
        price = float(row["종가"])
        change_percent = float(row["등락률"]) if "등락률" in df.columns else None
        return jsonify(price=price, changePercent=change_percent)
    except Exception as err:  # noqa: BLE001 - report upstream failure to caller
        return jsonify(error=str(err)), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
