---
name: trading-analysis
description: |
  Market data analysis for Kevin's trading workspace. Fetches quotes via yf,
  runs technical analysis patterns, generates trade reports. Integrates with
  Paperclip for trade decision tracking and Polymarket for event-based positions.
allowed-tools:
  - Bash
  - Read
  - Write
---

# Trading Analysis

## When to Use
- Daily market review
- Evaluating a specific trade idea
- Portfolio analysis
- Polymarket opportunity scanning

## Data Sources

### Yahoo Finance (yf CLI)
```bash
yf quote 'AAPL'           # Current quote
yf quote 'AAPL MSFT NVDA' # Multiple tickers
```

### Web Research
```bash
# SEC filings, earnings, news
web_fetch "https://finance.yahoo.com/quote/AAPL"
```

### Polymarket (if running)
```bash
# Check Polymarket dashboard
curl -s http://localhost:3005/api/positions 2>/dev/null
```

## Analysis Framework

### Quick Scan (5 min)
1. Fetch quote for ticker(s)
2. Check: price vs 50/200 DMA, RSI, volume
3. Output: 1-line verdict (buy/hold/sell/watch)

### Deep Dive (15 min)
1. Fetch full history + key metrics
2. Technical: support/resistance, trend, momentum
3. Fundamental: P/E, revenue growth, margins
4. Catalyst: upcoming earnings, events, macro
5. Output: `~/reports/trading/YYYY-MM-DD-{ticker}.md`

### Portfolio Review
1. Fetch all positions
2. P&L by position
3. Sector exposure + risk assessment
4. Rebalancing recommendations

## Output Format
```markdown
# Trade Report: {TICKER}
**Date:** YYYY-MM-DD | **Price:** $X.XX | **Verdict:** BUY/HOLD/SELL

## Technical
- Trend: Up/Down/Sideways
- Support: $X | Resistance: $X
- RSI: XX (overbought/oversold/neutral)
- Volume: Above/below average

## Fundamental
- P/E: XX | Revenue growth: XX%
- Key metric for sector: XX

## Catalysts
- Upcoming events that could move price

## Risk
- Downside scenario: $X (-XX%)
- Position size recommendation: X% of portfolio

## Decision
- [ ] Open position / Add / Trim / Close
- Entry: $X | Stop: $X | Target: $X
```

## Gotchas
- Kevin trades CAD and USD — always note currency
- All tax implications are Canadian (TFSA, RRSP, taxable)
- Polymarket positions are event-based — different risk model than equities
- Never give financial advice — present analysis, Kevin decides
