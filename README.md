# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aryanibos/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aryanibos/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (model radar-2): the pre-token protocols in a sealed DefiLlama snapshot, ranked by implied value, with a farm plan for each one. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

## How it works

The board covers all 40 watchlist protocols (TVL at or above $50M, no token on record) plus 160 early pre-token protocols below the floor, for 200 rows. Implied value is TVL times a category comparable multiple — the median market-cap / TVL of live tokens in the same category, winsorised at x1.00, shrunk toward the market median with a prior weight of 8, clamped to [x0.08, x0.45] — adjusted for 7-day growth, age with no token, and chain breadth. No protocol name is special-cased. Live-token protocols are set aside with their market caps shown, never mixed into the ranking.

The dashboard is a static page with no network: a sortable, filterable board, a detail view for every protocol with its model breakdown and 8-step farm plan, a live-token view, and a comparables table listing every category's live-token multiple.

## How to read the board

The board tab lists the 200 pre-token protocols, strongest implied value first. Each row shows TVL, seven-day growth, age with no token, the category comparable multiple and the implied value, with a bar scaled to the strongest row. Sort by any column, search by name, category or chain, filter to one category, to the watchlist only, or to fast growers (seven-day growth of +10% or more).

Selecting a row opens its detail view. It shows the full equation — TVL, comparable multiple with the live-token count and median behind it, growth, age and each multiplier — and recomputes the implied value in the page, so the number on screen can be checked against board.json. Below it, "Why this rank" names the inputs that move that row's value, with its rank inside its own category, and the live comparables in the category are listed with their market cap and TVL. The Live token tab sets aside the protocols that already trade, with their market caps as facts rather than a model. The Comparables tab lists every category's live-token count, median market cap / TVL and the multiple actually used, with the strongest pre-token protocol in the category beside it.

The board and the farm plans can be downloaded from the controls: the board as a CSV of the rows currently shown, the farm plans as one text file, and the current view as a link, since every filter and selection is in the page's address.

## Farm plans

Every row carries an eight-step farm plan, derived from the protocol's own record: a fresh wallet first, then the category's main action with a capital sized to the protocol's TVL, a second qualifying action, one action a week, a hold of 30 to 60 days by age, the category's main risk with a reminder to claim only from the link the protocol itself publishes, a farm log, and finally what to do the day a token is announced — open only the claim page the protocol's own site or docs link to, check the claim window and the token contract on the chain's explorer, and claim once. Every step names its cost and its time. Nothing in a plan asks for payment to claim, and no step promises a token.

## What the entry contains

- `main.ts` — the entrypoint: reads the sealed snapshot, builds the board, writes `board.json`, `data.js`, `dashboard/` and `dossier.json` to the output directory.
- `lib/model.ts` — the radar-2 model: category comparables, implied value, farm plans, board validation.
- `dashboard/` — the static page: `index.html`, `app.js` and `app.css`, with no network and no external imports.
- `screenshots/` — three renders of the dashboard at 1440x900: the board, a protocol's detail view, and a filtered view.
- `vendor/makefun-board.ts` — the make.fun library, copied unchanged, which writes `board.json` and `dossier.json`.

## Limits

The snapshot is sealed at 2026-11-14, so TVL and seven-day growth are figures from that date, not live prices. A high implied value does not mean a token is coming, and a farm plan does not promise an airdrop. The model trusts the snapshot's own records: a protocol that records no token is pre-token, and a protocol with a market cap of $0 or less is treated as an unpriced record and kept out of the comparables. The board is a radar, not advice, and the dashboard states the same limits where a reader can see them.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22.18 or later, standard library only. The program reads the sealed snapshot, writes `board.json`, `data.js`, `dashboard/` and `screenshots/` to the output directory, and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d5fyv67m&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
