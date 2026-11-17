// Token Radar, model radar-2: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and may add
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol is
// pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol); the
// snapshot's live-token protocols are kept apart and shown as the market's own values, never mixed
// into the ranked board.
//
// Implied value follows only from the snapshot's own figures, in four steps the dashboard shows:
//
//   comparable = shrunk category multiple, from live tokens in the same category
//   base       = tvl_usd x comparable
//   growth     = clamp(change_7d, -50, 80) per cent
//   growthMult = 1 + (growth / 100) x 0.6
//   maturity   = 0.75 + min(age_days, 1095) / 1095 x 0.25   (age_days unknown: 365)
//   breadth    = 0.97 + min(chains, 8) / 8 x 0.06
//   implied    = max(1, round(base x growthMult x maturity x breadth))
//
// The comparable multiple is the key change from a flat TVL multiple. For each category, take the
// live-token protocols in that category, compute each one's market-cap / TVL, winsorise each ratio
// at 1.0 (one tiny-TVL token with a huge cap must not set the category), take the median, then
// shrink it toward the whole-market median with a prior weight of 8 live protocols, and clamp the
// result to [0.08, 0.45]. A category with few live comparables therefore falls back toward the
// market median instead of trusting one outlier. No protocol name is ever special-cased: the same
// function scores every row, and the dashboard lists every category's n, median and multiple so
// a reader can check the arithmetic from the snapshot alone.
//
// Limits: the snapshot is sealed at its as_of date, so TVL and seven-day growth are figures
// from that date, not live prices. A high implied value does not mean a token is coming, and
// a farm plan does not promise an airdrop. The board is a radar: it ranks what the sealed
// figures say, and the dashboard states the same limits where a reader can see them.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  base_multiple: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  overall_median: number;
  shrink_prior: number;
  winsor_cap: number;
  comp_floor: number;
  comp_cap: number;
  breadth_floor: number;
  breadth_range: number;
  breadth_max_chains: number;
}

export const MODEL: ModelConstants = {
  base_multiple: 0.205,
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 80,
  maturity_floor: 0.75,
  maturity_range: 0.25,
  maturity_days: 1095,
  unknown_age_days: 365,
  overall_median: 0.205,
  shrink_prior: 8,
  winsor_cap: 1.0,
  comp_floor: 0.08,
  comp_cap: 0.45,
  breadth_floor: 0.97,
  breadth_range: 0.06,
  breadth_max_chains: 8,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's live comparables, as the dashboard shows them. */
export interface ComparableRow {
  category: string;
  live_n: number;
  median_mcap_tvl: number | null;
  multiple: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    comparable_multiple: number;
    category_live_n: number;
    category_median: number | null;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  comparable_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** One board's headline numbers, so the page can state what the board as a whole says. */
export interface BoardSummary {
  top_category: string;
  top_category_rows: number;
  median_implied_usd: number;
  watchlist_median_implied_usd: number;
  fastest_growth_slug: string | null;
  fastest_growth_name: string | null;
  fastest_growth_pct: number | null;
  top_tvl_slug: string | null;
  top_tvl_name: string | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  summary: BoardSummary;
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  overall_median: number;
  comparables: ComparableRow[];
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a sorted-or-not list, or null when empty. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Live comparables, grouped by category, from the snapshot alone. */
export interface ComparableStats {
  overall_median: number;
  by_category: Map<string, { n: number; median: number | null }>;
}

export function comparableStats(snapshot: Snapshot, model: ModelConstants = MODEL): ComparableStats {
  const allRatios: number[] = [];
  const byCat = new Map<string, number[]>();
  for (const p of snapshot.protocols) {
    if (isPreToken(p)) continue;
    // A $0 or negative market cap is a dead / unpriced record in the snapshot, not a market
    // value: 15 protocols carry mcap_usd 0 and one carries -1. Exclude them, or they drag
    // every median down.
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    const ratio = Math.min(p.mcap_usd / p.tvl_usd, model.winsor_cap);
    allRatios.push(ratio);
    const key = p.category ?? 'Other';
    const list = byCat.get(key) ?? [];
    list.push(ratio);
    byCat.set(key, list);
  }
  const overall = median(allRatios) ?? model.overall_median;
  const by_category = new Map<string, { n: number; median: number | null }>();
  for (const [cat, vals] of byCat) by_category.set(cat, { n: vals.length, median: median(vals) });
  return { overall_median: overall, by_category };
}

/** The shrunk, clamped comparable multiple for one category. */
export function comparableMultiple(category: string | null, stats: ComparableStats, model: ModelConstants = MODEL): { multiple: number; n: number; median: number | null } {
  const entry = category === null ? undefined : stats.by_category.get(category);
  const n = entry?.n ?? 0;
  const med = entry?.median ?? null;
  const base = med ?? stats.overall_median;
  const shrunk = (n * base + model.shrink_prior * stats.overall_median) / (n + model.shrink_prior);
  const multiple = Math.min(model.comp_cap, Math.max(model.comp_floor, shrunk));
  return { multiple, n, median: med };
}

/** The four multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  stats: ComparableStats,
): { implied: number; compMult: number; categoryN: number; categoryMedian: number | null; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = model.breadth_floor + (Math.min(Math.max(protocol.chains.length, 0), model.breadth_max_chains) / model.breadth_max_chains) * model.breadth_range;
  const { multiple: compMult, n: categoryN, median: categoryMedian } = comparableMultiple(protocol.category, stats, model);
  const base = protocol.tvl_usd * compMult;
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * breadthMult));
  return { implied, compMult, categoryN, categoryMedian, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const stats = comparableStats(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, stats);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      // Store full-precision multipliers (not rounded) so the dashboard can
      // recompute this row exactly from its own figures and agree with board.json.
      base_multiple: s.compMult,
      comparable_multiple: s.compMult,
      category_live_n: s.categoryN,
      category_median: s.categoryMedian,
      growth_pct: s.growthPct,
      growth_multiplier: s.growthMult,
      maturity_multiplier: s.maturityMult,
      breadth_multiplier: s.breadthMult,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  if (c.includes('payment')) return `Use ${name} to send $${capital} through ${chain} and keep the receipt.`;
  if (c.includes('chain')) return `Use $${capital} on ${name}'s own chain and keep a small balance for gas.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** A second, different qualifying action for the same category, so the plan is not one move repeated. */
function secondActionFor(p: SnapshotProtocol, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Borrow a small amount against the supply on ${name}, then repay it in the same week.`;
  if (c.includes('dex') || c.includes('yield')) return `Swap a small amount through ${name}'s main pool on ${chain} instead of only holding liquidity.`;
  if (c.includes('bridge')) return `Bridge a small amount back the other way through ${name} so both directions are used.`;
  if (c.includes('staking') || c.includes('restak')) return `Restake or compound the receipt from ${name} once, instead of leaving it idle.`;
  if (c.includes('curator') || c.includes('allocator')) return `Vote or signal on one ${name} vault proposal, if the vault opens one.`;
  if (c.includes('rwa')) return `Check the underlying asset report ${name} publishes and note its date in the farm log.`;
  if (c.includes('stable')) return `Hold the minted asset through one full week before moving it again.`;
  if (c.includes('insurance')) return `Read the cover terms ${name} shows for the policy and note the exclusions.`;
  return `Use one more feature of ${name} on ${chain}, such as a swap, a vote or a second deposit.`;
}

/** The main risk to name for the category, in plain words. */
function riskFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('lend') || c.includes('cdp')) return `Lending risk: a sharp price fall can liquidate a borrow, so never borrow close to the limit.`;
  if (c.includes('dex') || c.includes('yield')) return `Liquidity risk: a pool can lose value when prices move apart, so keep the position small.`;
  if (c.includes('bridge')) return `Bridge risk: a bridge pause can strand funds, so never bridge money needed this week.`;
  if (c.includes('staking') || c.includes('restak')) return `Staking risk: an unstake can take days, so keep gas and a separate balance outside it.`;
  if (c.includes('rwa')) return `Issuer risk: the off-chain asset can be frozen or repriced, so read the issuer's own report first.`;
  if (c.includes('stable')) return `Peg risk: the stable asset can trade below $1, so check its price before minting more.`;
  if (c.includes('insurance')) return `Cover risk: a claim can be refused under the policy terms, so read the exclusions before buying.`;
  return `Contract risk: the code can hold a bug, so keep the position small and never farm with borrowed money.`;
}

/** The last step: what to do the day a token is announced, so the claim is not lost to a fake link. */
function exitStep(p: SnapshotProtocol): FarmStep {
  const chain = chainOf(p);
  return {
    text: `When ${p.name} announces a token, open only the claim page its own site or docs link to, check the claim window and the token contract on ${chain}'s explorer, and claim once.`,
    cost: 'about $3 to $10 of gas for one claim',
    time: '20 minutes',
  };
}

/**
 * A protocol's farm plan: eight steps, each an action with a cost and a time. The plan is derived
 * from the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const second = secondActionFor(p, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: second,
      cost: 'about $2 to $5 of gas',
      time: '10 minutes a week',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `${riskFor(p)} Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    exitStep(p),
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    comparable_multiple: row.model.comparable_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const live = liveRows(snapshot);
  const stats = comparableStats(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const comparables: ComparableRow[] = [...stats.by_category.entries()]
    .map(([category, v]) => ({
      category,
      live_n: v.n,
      median_mcap_tvl: v.median === null ? null : round4(v.median),
      multiple: round4(comparableMultiple(category, stats, model).multiple),
    }))
    .sort((a, b) => b.live_n - a.live_n || (a.category < b.category ? -1 : 1));
  const byCategoryCount = new Map<string, number>();
  for (const r of board) {
    const key = r.category ?? 'Other';
    byCategoryCount.set(key, (byCategoryCount.get(key) ?? 0) + 1);
  }
  let topCategory = 'Other';
  let topCategoryRows = 0;
  for (const [cat, n] of byCategoryCount) {
    if (n > topCategoryRows || (n === topCategoryRows && cat < topCategory)) {
      topCategory = cat;
      topCategoryRows = n;
    }
  }
  const watchlistRows = board.filter((r) => snapshot.watchlist.includes(r.slug));
  const fastest = board
    .filter((r) => r.change_7d !== null)
    .sort((a, b) => (b.change_7d ?? -Infinity) - (a.change_7d ?? -Infinity))[0];
  const biggestTvl = board.slice().sort((a, b) => b.tvl_usd - a.tvl_usd)[0];
  const summary: BoardSummary = {
    top_category: topCategory,
    top_category_rows: topCategoryRows,
    median_implied_usd: median(board.map((r) => r.implied_value_usd)) ?? 0,
    watchlist_median_implied_usd: median(watchlistRows.map((r) => r.implied_value_usd)) ?? 0,
    fastest_growth_slug: fastest?.slug ?? null,
    fastest_growth_name: fastest?.name ?? null,
    fastest_growth_pct: fastest?.change_7d ?? null,
    top_tvl_slug: biggestTvl?.slug ?? null,
    top_tvl_name: biggestTvl?.name ?? null,
  };
  const radar: RadarData = {
    summary,
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    overall_median: round4(stats.overall_median),
    comparables,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    // The multipliers a row carries must stay inside the model's own clamps: a row outside
    // them was scored by something other than this model, and the board must not ship it.
    const m = r.model;
    if (m.comparable_multiple < MODEL.comp_floor || m.comparable_multiple > MODEL.comp_cap) return `${r.slug} has a comparable multiple of ${m.comparable_multiple}`;
    const growthLow = 1 + (MODEL.growth_floor / 100) * MODEL.growth_weight;
    const growthHigh = 1 + (MODEL.growth_cap / 100) * MODEL.growth_weight;
    if (m.growth_multiplier < growthLow || m.growth_multiplier > growthHigh) return `${r.slug} has a growth multiplier of ${m.growth_multiplier}`;
    if (m.maturity_multiplier < MODEL.maturity_floor || m.maturity_multiplier > MODEL.maturity_floor + MODEL.maturity_range) return `${r.slug} has a maturity multiplier of ${m.maturity_multiplier}`;
    if (m.breadth_multiplier < MODEL.breadth_floor || m.breadth_multiplier > MODEL.breadth_floor + MODEL.breadth_range) return `${r.slug} has a breadth multiplier of ${m.breadth_multiplier}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
