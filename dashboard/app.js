// Token Radar, model radar-2. It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, a filterable table, a per-protocol detail drawer with the
// model's own inputs and the protocol's farm plan, a live-token view, and a comparables view
// showing every category's live-token multiple. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null, watchlistOnly: false, fastOnly: false };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  // The board's Age column shows days for every row, so the column reads in one unit;
  // the drawer keeps the friendlier years form, and the cell's tooltip names it.
  function fmtAgeDays(days) {
    if (days === null || days === undefined) return 'unknown';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return 'x' + n.toFixed(3);
  }
  // The model in one function: the page recomputes a row from the snapshot figures and checks
  // the number board.json carries, so the page's code and the board's data are visibly the same
  // arithmetic. radar-2: TVL x comparable multiple x growth x maturity x breadth.
  function impliedOf(row) {
    var comp = row.comparable_multiple === undefined ? DATA.model.base_multiple : row.comparable_multiple;
    var growth = row.growth_multiplier === undefined ? 1 : row.growth_multiplier;
    var maturity = row.maturity_multiplier === undefined ? 1 : row.maturity_multiplier;
    var breadth = row.breadth_multiplier === undefined ? 1 : row.breadth_multiplier;
    return Math.max(1, Math.round(row.tvl_usd * comp * growth * maturity * breadth));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL
  // and age decide the action, the capital, the hold and every cost and time. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('bridge') >= 0) return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0 || c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('payment') >= 0) return 'Use ' + name + ' to send $' + capital + ' through ' + chain + ' and keep the receipt.';
    if (c.indexOf('chain') >= 0) return 'Use $' + capital + ' on ' + name + "'s own chain and keep a small balance for gas.";
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(p, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow a small amount against the supply on ' + name + ', then repay it in the same week.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0) return "Swap a small amount through " + name + "'s main pool on " + chain + ' instead of only holding liquidity.';
    if (c.indexOf('bridge') >= 0) return 'Bridge a small amount back the other way through ' + name + ' so both directions are used.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Restake or compound the receipt from ' + name + ' once, instead of leaving it idle.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Vote or signal on one ' + name + ' vault proposal, if the vault opens one.';
    if (c.indexOf('rwa') >= 0) return 'Check the underlying asset report ' + name + ' publishes and note its date in the farm log.';
    if (c.indexOf('stable') >= 0) return 'Hold the minted asset through one full week before moving it again.';
    if (c.indexOf('insurance') >= 0) return 'Read the cover terms ' + name + ' shows for the policy and note the exclusions.';
    return 'Use one more feature of ' + name + ' on ' + chain + ', such as a swap, a vote or a second deposit.';
  }
  function riskFor(p) {
    var c = (p.category || '').toLowerCase();
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0) return 'Lending risk: a sharp price fall can liquidate a borrow, so never borrow close to the limit.';
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0) return 'Liquidity risk: a pool can lose value when prices move apart, so keep the position small.';
    if (c.indexOf('bridge') >= 0) return 'Bridge risk: a bridge pause can strand funds, so never bridge money needed this week.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Staking risk: an unstake can take days, so keep gas and a separate balance outside it.';
    if (c.indexOf('rwa') >= 0) return "Issuer risk: the off-chain asset can be frozen or repriced, so read the issuer's own report first.";
    if (c.indexOf('stable') >= 0) return 'Peg risk: the stable asset can trade below $1, so check its price before minting more.';
    if (c.indexOf('insurance') >= 0) return 'Cover risk: a claim can be refused under the policy terms, so read the exclusions before buying.';
    return 'Contract risk: the code can hold a bug, so keep the position small and never farm with borrowed money.';
  }
  // Why this row ranks where it does: the inputs that move its implied value most, in plain
  // words, so a reader can check the model's reasoning without opening the code.
  function driversFor(row) {
    var drivers = [];
    drivers.push('TVL of ' + fmtUsd(row.tvl_usd) + ' is the base the whole value is built on');
    var topTvl = DATA.rows.slice().sort(function (a, b) { return b.tvl_usd - a.tvl_usd; })[0];
    if (topTvl && topTvl.slug === row.slug) drivers.push('It holds the largest TVL on the whole board');
    else if (row.tvl_usd >= 1e9) drivers.push('Its TVL is above $1B, so the base of the value is one of the largest on the board');
    var comp = DATA.comparables ? DATA.comparables.filter(function (c) { return c.category === row.category; })[0] : null;
    if (comp) drivers.push('The ' + (row.category || 'Other') + ' comparable multiple is ' + fmtMult(row.comparable_multiple) + ', from ' + comp.live_n + ' live tokens in the category');
    else drivers.push('The ' + (row.category || 'Other') + ' category has no live comparables, so the multiple falls back to the market median');
    if (row.change_7d !== null && Math.abs(row.change_7d) >= 5) drivers.push('Seven-day growth of ' + fmtPct(row.change_7d) + ' is large enough to move the growth multiplier');
    else if (row.change_7d !== null) drivers.push('Seven-day growth of ' + fmtPct(row.change_7d) + ' is small, so the growth multiplier stays near x1.000');
    else drivers.push('No seven-day growth is recorded, so the growth multiplier stays at x1.000');
    if (row.age_days !== null && row.age_days >= 365) drivers.push('It has run ' + fmtAge(row.age_days) + ' with no token, the longest the maturity multiplier rewards');
    else if (row.age_days !== null) drivers.push('It has run ' + fmtAge(row.age_days) + ' with no token, partway up the maturity multiplier');
    else drivers.push('Its listing date is unknown, so the model assumes a year with no token');
    if (row.comparable_multiple >= 0.45) drivers.push('The comparable multiple is at the top of its clamp, so the category median was higher than the model will use');
    else if (row.comparable_multiple <= 0.08) drivers.push('The comparable multiple is at the bottom of its clamp, so the category median was lower than the model will use');
    if (row.chains && row.chains.length >= 4) drivers.push('It is live on ' + row.chains.length + ' chains, near the top of the breadth multiplier');
    else if (row.chains && row.chains.length > 1) drivers.push('It is live on ' + row.chains.length + ' chains, partway up the breadth multiplier');
    else drivers.push('It is live on one chain, so the breadth multiplier stays near its floor');
    return drivers;
  }
  // Where the row stands inside its own category, not just on the whole board.
  function categoryRank(row) {
    var same = DATA.rows.filter(function (r) { return (r.category || 'Other') === (row.category || 'Other'); });
    same.sort(function (a, b) { return b.implied_value_usd - a.implied_value_usd; });
    var pos = 0;
    same.forEach(function (r, i) { if (r.slug === row.slug) pos = i + 1; });
    return { rank: pos, total: same.length };
  }
  // The last step, identical to the one main.ts writes: claim only from the protocol's own page.
  function exitStepText(p) {
    var chain = chainOf(p);
    return 'When ' + p.name + ' announces a token, open only the claim page its own site or docs link to, check the claim window and the token contract on ' + chain + "'s explorer, and claim once.";
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: secondActionFor(p, chain), cost: 'about $2 to $5 of gas', time: '10 minutes a week' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: riskFor(p) + " Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' },
      { text: exitStepText(p), cost: 'about $3 to $10 of gas for one claim', time: '20 minutes' }
    ].map(stepText);
  }

  // The board as a CSV download, built in the page from the rows already shown: no network.
  function downloadCsv() {
    var list = sortedRows(rows());
    var lines = ['rank,slug,name,category,chains,tvl_usd,change_7d,age_days,comparable_multiple,implied_value_usd'];
    list.forEach(function (r) {
      var cells = [r.rank, r.slug, '"' + String(r.name).replace(/"/g, '""') + '"', '"' + String(r.category || 'Other').replace(/"/g, '""') + '"', '"' + (r.chains || []).join(' ') + '"', r.tvl_usd, r.change_7d === null ? '' : r.change_7d, r.age_days === null ? '' : r.age_days, r.comparable_multiple, r.implied_value_usd];
      lines.push(cells.join(','));
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'token-radar-board.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  // Every farm plan as one text file, for a farmer who wants the plans off the page.
  function downloadFarmPlans() {
    var list = sortedRows(rows());
    var parts = ['Token Radar farm plans, snapshot ' + DATA.as_of, ''];
    list.forEach(function (r) {
      parts.push('Rank ' + r.rank + ': ' + r.name + ' (' + (r.category || 'Other') + '), implied ' + fmtUsd(r.implied_value_usd));
      farmSteps(r).forEach(function (s, i) { parts.push('  ' + (i + 1) + '. ' + s); });
      parts.push('');
    });
    var blob = new Blob([parts.join('\n')], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'token-radar-farm-plans.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('watchlist')) state.watchlistOnly = params.get('watchlist') === '1';
    if (params.get('fast')) state.fastOnly = params.get('fast') === '1';
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.selected) params.set('p', state.selected);
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.watchlistOnly) params.set('watchlist', '1');
    if (state.fastOnly) params.set('fast', '1');
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // Watchlist slugs: the board's early rows are all below the floor by construction, so the
  // board rows at or above the floor are exactly the watchlist rows.
  function watchlistSlugs() {
    return DATA.rows.filter(function (r) { return r.tvl_usd >= DATA.floor_usd; }).map(function (r) { return r.slug; });
  }

  function rows() {
    var q = state.q.trim().toLowerCase();
    var wl = watchlistSlugs();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.watchlistOnly && wl.indexOf(r.slug) < 0) return false;
      if (state.fastOnly && (r.change_7d === null || r.change_7d < 10)) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'comp') { av = a.comparable_multiple || 0; bv = b.comparable_multiple || 0; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, el('span', { class: 'mark' }), el('span', { class: 'brand-name', text: 'Token Radar' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' })
      )
    );
  }

  function lede() {
    return el('section', { class: 'lede' },
      el('div', null,
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' pre-token protocols below that floor. Implied value is a model, not a promise: it is TVL times the category comparable multiple, adjusted for growth, age and chain breadth.' })
      ),
      el('div', { class: 'facts' },
        el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
        el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) })),
        el('div', { class: 'fact' }, el('span', { text: 'Market median mcap / TVL' }), el('b', { text: 'x' + (DATA.overall_median || 0).toFixed(3) }))
      )
    );
  }

  // The median of a list of numbers, or null when empty: the summary bar states medians, not averages.
  function medianOf(values) {
    if (values.length === 0) return null;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[mid];
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  // Median seven-day growth across the board, for the qualifier under the fastest-growth cell.
  function medianGrowth7d() {
    return medianOf(DATA.rows.filter(function (r) { return r.change_7d !== null; }).map(function (r) { return r.change_7d; })) || 0;
  }
  // The board's headline numbers, from the summary main.ts computes: the largest category,
  // the median implied values, the fastest growth and the largest TVL.
  function summaryBar() {
    var s = DATA.summary;
    if (!s) return null;
    return el('section', { class: 'panel summary' },
      el('div', { class: 'fact' }, el('span', { text: 'Largest category on the board' }), el('b', { text: s.top_category + ' (' + s.top_category_rows + ' rows)' })),
      el('div', { class: 'fact' }, el('span', { text: 'Median implied value, whole board' }), el('b', { text: fmtUsd(s.median_implied_usd) })),
      el('div', { class: 'fact' }, el('span', { text: 'Median implied value, watchlist' }), el('b', { text: fmtUsd(s.watchlist_median_implied_usd) })),
      el('div', { class: 'fact' }, el('span', { text: '7d growth leader' }), el('b', { text: (s.fastest_growth_name || 'n/a') + ' ' + fmtPct(s.fastest_growth_pct) }), el('span', { class: 'qual', text: 'Board median 7d growth ' + fmtPct(medianGrowth7d()) + ' — an outlier from a low base' })),
      el('div', { class: 'fact' }, el('span', { text: 'Largest TVL on the board' }), el('b', { text: s.top_tvl_name || 'n/a' })),
      el('div', { class: 'fact' }, el('span', { text: 'Median TVL, watchlist' }), el('b', { text: fmtUsd(medianOf(DATA.rows.filter(function (r) { return r.tvl_usd >= DATA.floor_usd; }).map(function (r) { return r.tvl_usd; })) || 0) }))
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; writeHash(); render(); });
    var select = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    select.addEventListener('change', function () { state.category = select.value; writeHash(); render(); });
    var wl = el('label', { class: 'check' },
      el('input', { type: 'checkbox', checked: state.watchlistOnly ? 'checked' : null, onchange: function (e) { state.watchlistOnly = e.target.checked; writeHash(); render(); } }),
      ' Watchlist only'
    );
    var fast = el('label', { class: 'check' },
      el('input', { type: 'checkbox', checked: state.fastOnly ? 'checked' : null, onchange: function (e) { state.fastOnly = e.target.checked; writeHash(); render(); } }),
      ' Fast growers only (7d +10%)'
    );
    var csvBtn = el('button', { class: 'button', type: 'button', text: 'Download board as CSV', onclick: function () { downloadCsv(); } });
    var plansBtn = el('button', { class: 'button', type: 'button', text: 'Download farm plans', onclick: function () { downloadFarmPlans(); } });
    var shareBtn = el('button', { class: 'button', type: 'button', text: 'Copy link to this view', onclick: function () {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(window.location.href);
    } });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; writeHash(); render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; writeHash(); render(); } });
    var comp = el('button', { type: 'button', 'aria-pressed': state.tab === 'comparables' ? 'true' : 'false', text: 'Comparables', onclick: function () { state.tab = 'comparables'; writeHash(); render(); } });
    var countText = state.tab === 'pre-token' ? rows().length + ' rows shown' : state.tab === 'live' ? DATA.live.length + ' live-token protocols' : (DATA.comparables ? DATA.comparables.length + ' categories' : '');
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), select),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'View' }), el('div', { class: 'tabs' }, pre, live, comp)),
      wl,
      fast,
      csvBtn,
      plansBtn,
      shareBtn,
      el('span', { class: 'count', text: countText })
    );
  }

  function sortHeader(key, label, invert, title) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', title: title || null, onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label,
        state.sort === key ? el('span', { 'aria-hidden': 'true', text: state.dir < 0 ? (invert ? ' ∧' : ' ∨') : (invert ? ' ∨' : ' ∧') }) : null
      )
    );
  }

  function boardTable() {
    var list = sortedRows(rows());
    if (list.length === 0) {
      return el('div', { class: 'panel' }, el('div', { class: 'empty' },
        el('h2', { text: 'No protocol matches that filter' }),
        el('p', { text: 'Clear the search or pick another category to see the board again.' }),
        el('button', { class: 'button primary', type: 'button', text: 'Clear filters', onclick: function () { state.q = ''; state.category = 'all'; state.watchlistOnly = false; state.fastOnly = false; writeHash(); render(); } })
      ));
    }
    var max = list[0].implied_value_usd || 1;
    var tbody = el('tbody');
    list.forEach(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var tr = el('tr', {
        'data-selected': state.selected === r.slug ? 'true' : 'false',
        tabindex: '0',
        onclick: function () { openDetail(r.slug); },
        onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r.slug); } }
      },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null, el('div', { class: 'name' },
          el('b', { text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') })
        )),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + growthClass, text: growth }),
        el('td', { class: 'num', title: r.age_days === null ? null : 'About ' + (r.age_days / 365).toFixed(1) + ' years with no token', text: fmtAgeDays(r.age_days) }),
        el('td', { class: 'num', text: fmtMult(r.comparable_multiple) }),
        el('td', null, el('div', { class: 'implied' },
          el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { style: 'width:' + Math.max(3, Math.round((r.implied_value_usd / max) * 100)) + '%' })),
          el('span', { class: 'num', text: fmtUsd(r.implied_value_usd) })
        )),
        el('td', null, el('span', { class: 'status', text: 'Pre-token' }))
      );
      tbody.appendChild(tr);
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', { class: 'board' },
          el('caption', { class: 'sub', text: 'Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.' }),
          el('thead', null, el('tr', null,
            sortHeader('implied', 'Rank', true),
            sortHeader('name', 'Protocol'),
            sortHeader('tvl', 'TVL'),
            sortHeader('growth', '7d'),
            sortHeader('age', 'Age'),
            sortHeader('comp', 'Multiple', false, 'Comparable multiple: median market cap / TVL of live tokens in the category'),
            sortHeader('implied', 'Implied value'),
            el('th', { scope: 'col', text: 'Token' })
          )),
          tbody
        )
      )
    );
  }

  function liveTable() {
    var tbody = el('tbody');
    DATA.live.forEach(function (r) {
      tbody.appendChild(el('tr', null,
        el('td', { class: 'num', text: 'live' }),
        el('td', null, el('div', { class: 'name' }, el('b', { text: r.name }), el('span', { class: 'sub', text: (r.category || 'Other') + ' on ' + (r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain') }))),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg'), text: fmtPct(r.change_7d) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', null, el('span', { class: 'status', text: 'already trades' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Status' }), el('th', { scope: 'col', text: 'Protocol' }), el('th', { scope: 'col', text: 'TVL' }), el('th', { scope: 'col', text: '7d' }), el('th', { scope: 'col', text: 'Market cap' }), el('th', { scope: 'col', text: 'Token' }))),
          tbody
        )
      )
    );
  }

  function comparablesTable() {
    var list = (DATA.comparables || []).slice().sort(function (a, b) { return b.live_n - a.live_n; });
    var bestByCategory = {};
    DATA.rows.forEach(function (r) {
      var key = r.category || 'Other';
      if (!bestByCategory[key] || r.implied_value_usd > bestByCategory[key].implied_value_usd) bestByCategory[key] = r;
    });
    var tbody = el('tbody');
    list.forEach(function (c) {
      var best = bestByCategory[c.category] || null;
      tbody.appendChild(el('tr', null,
        el('td', null, el('b', { text: c.category })),
        el('td', { class: 'num', text: String(c.live_n) }),
        el('td', { class: 'num', text: c.median_mcap_tvl === null ? 'n/a' : 'x' + c.median_mcap_tvl.toFixed(3) }),
        el('td', { class: 'num', text: 'x' + c.multiple.toFixed(3) }),
        el('td', null, best ? el('span', { text: best.name + ' ' + fmtUsd(best.implied_value_usd) }) : el('span', { text: 'n/a' }))
      ));
    });
    return el('div', { class: 'panel' },
      el('div', { class: 'table-wrap' },
        el('table', null,
          el('caption', { class: 'sub', text: 'Live comparables by category. Median is market cap / TVL for live tokens in the category, winsorised at x1.00. Multiple shrinks that median toward the market median x' + (DATA.overall_median || 0).toFixed(3) + ' with a prior weight of 8, then clamps to [x0.08, x0.45]. Small samples fall back toward the market. Strongest pre-token is the highest implied value in the category.' }),
          el('thead', null, el('tr', null, el('th', { scope: 'col', text: 'Category' }), el('th', { scope: 'col', text: 'Live n' }), el('th', { scope: 'col', text: 'Median mcap / TVL' }), el('th', { scope: 'col', text: 'Multiple used' }), el('th', { scope: 'col', text: 'Strongest pre-token' }))),
          tbody
        )
      )
    );
  }

  function modelPanel() {
    var m = DATA.model;
    return el('section', { class: 'panel model' },
      el('h2', { text: 'How implied value is computed' }),
      el('p', { class: 'sub', text: 'Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.' }),
      el('div', { class: 'formula' },
        'implied = round( tvl_usd x comparable_multiple x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') x (' + m.breadth_floor + ' + min(chains, ' + m.breadth_max_chains + ') / ' + m.breadth_max_chains + ' x ' + m.breadth_range + ') )'
      ),
      el('p', { class: 'sub', text: 'Comparable multiple: median market cap / TVL of live tokens in the same category, winsorised at x1.00, shrunk toward the market median x' + (DATA.overall_median || 0).toFixed(3) + ' with prior weight 8, clamped to [x0.08, x0.45]. TVL and seven-day growth come from the snapshot. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days. Chain breadth rewards protocols live on more chains, up to 8. The early radar is every pre-token protocol below the watchlist floor, by TVL, and the live-token protocols are set aside with their market caps shown.' }),
      el('p', { class: 'sub', text: 'Limits: the snapshot is sealed at ' + DATA.as_of + ', so TVL and seven-day growth are figures from that date, not live prices. A high implied value does not mean a token is coming, and a farm plan does not promise an airdrop. The board is a radar, not advice.' })
    );
  }

  var dialog = el('dialog', { class: 'detail', id: 'detail', 'aria-labelledby': 'detail-title' });
  dialog.addEventListener('close', function () { state.selected = null; document.body.classList.remove('drawer-open'); writeHash(); });

  function openDetail(slug) {
    var row = DATA.rows.filter(function (r) { return r.slug === slug; })[0];
    if (!row) return;
    state.selected = slug;
    writeHash();
    dialog.textContent = '';
    var steps = farmSteps(row);
    var comp = DATA.comparables ? DATA.comparables.filter(function (c) { return c.category === row.category; })[0] : null;
    dialog.appendChild(el('div', { class: 'detail-head' },
      el('div', null,
        el('span', { class: 'brand-name', text: 'Rank ' + row.rank + ' of ' + DATA.board_size }),
        el('h2', { id: 'detail-title', text: row.name }),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' on ' + (row.chains && row.chains.length ? row.chains.join(', ') : 'an unnamed chain') + (row.tvl_usd >= DATA.floor_usd ? ' · on the watchlist' : ' · below the watchlist floor') })
      ),
      el('button', { class: 'close', type: 'button', 'aria-label': 'Close details', text: 'Close', onclick: function () { dialog.close(); } })
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Implied value' }),
      el('div', { class: 'equation' },
        el('div', null, el('span', { text: 'TVL' }), el('b', { class: 'num', text: fmtUsd(row.tvl_usd) })),
        el('div', null, el('span', { text: 'Comparable multiple' }), el('b', { class: 'num', text: fmtMult(row.comparable_multiple) + (comp ? ' (' + comp.live_n + ' live, median ' + (comp.median_mcap_tvl === null ? 'n/a' : 'x' + comp.median_mcap_tvl.toFixed(3)) + ')' : '') })),
        el('div', null, el('span', { text: 'Seven-day growth' }), el('b', { class: 'num', text: fmtPct(row.change_7d) })),
        el('div', null, el('span', { text: 'Age with no token' }), el('b', { class: 'num', text: fmtAge(row.age_days) })),
        el('div', null, el('span', { text: 'Growth multiplier' }), el('b', { class: 'num', text: String((row.growth_multiplier || 0).toFixed(4)) })),
        el('div', null, el('span', { text: 'Maturity multiplier' }), el('b', { class: 'num', text: String((row.maturity_multiplier || 0).toFixed(4)) })),
        el('div', null, el('span', { text: 'Breadth multiplier' }), el('b', { class: 'num', text: String((row.breadth_multiplier || 0).toFixed(4)) })),
        el('div', null, el('span', { text: 'Implied value' }), el('b', { class: 'num', text: fmtUsd(row.implied_value_usd) }))
      ),
      el('p', { class: 'sub disclaimer', text: 'Model ' + DATA.model_version + ': the same function scores every protocol. The page recomputes this row as ' + fmtUsd(impliedOf(row)) + (impliedOf(row) === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') + ' This is an estimate, not a price. It says the protocol records no token, never that it has none.' })
    ));
    var catRank = categoryRank(row);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Why this rank' }),
      el('p', { class: 'sub', text: 'Rank ' + catRank.rank + ' of ' + catRank.total + ' in ' + (row.category || 'Other') + ', and rank ' + row.rank + ' of ' + DATA.board_size + ' on the whole board.' }),
      el('p', { class: 'note', text: 'Each driver names one input from the snapshot and what it does to the value.' }),
      el('ul', { class: 'drivers' }, driversFor(row).map(function (d) { return el('li', { text: d }); }))
    ));
    var liveSame = DATA.live.filter(function (r) { return (r.category || 'Other') === (row.category || 'Other'); }).slice(0, 3);
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Live comparables in ' + (row.category || 'Other') }),
      liveSame.length === 0
        ? el('p', { class: 'sub', text: 'No live token in this category is among the ' + DATA.live_size + ' set aside, so the multiple falls back toward the market median.' })
        : el('ul', { class: 'live-comp' }, liveSame.map(function (r) {
          var ratio = (r.mcap_usd !== null && r.tvl_usd > 0) ? r.mcap_usd / r.tvl_usd : null;
          return el('li', null,
            el('b', { text: r.name }),
            el('span', { class: 'sub', text: 'market cap ' + fmtUsd(r.mcap_usd) + ' on TVL ' + fmtUsd(r.tvl_usd) + (ratio === null ? '' : ', mcap / TVL x' + ratio.toFixed(3)) })
          );
        }))
    ));
    dialog.appendChild(el('section', { class: 'detail-section' },
      el('h3', { text: 'Farm plan' }),
      el('ol', { class: 'steps' }, steps.map(function (s) {
        var at = s.indexOf(' Cost: ');
        var action = at >= 0 ? s.slice(0, at) : s;
        var tail = at >= 0 ? s.slice(at + 1) : '';
        return el('li', null, el('b', { text: action }), el('span', { class: 'cost', text: tail }));
      }))
    ));
    dialog.appendChild(el('div', { class: 'fade', 'aria-hidden': 'true' }));
    document.body.classList.add('drawer-open');
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    app.textContent = '';
    var shell = el('div', { class: 'shell' });
    shell.appendChild(header());
    shell.appendChild(lede());
    var summary = summaryBar();
    if (summary) shell.appendChild(summary);
    shell.appendChild(controls());
    if (state.tab === 'live') shell.appendChild(liveTable());
    else if (state.tab === 'comparables') shell.appendChild(comparablesTable());
    else shell.appendChild(boardTable());
    if (state.tab === 'pre-token') shell.appendChild(modelPanel());
    if (state.tab === 'comparables') shell.appendChild(modelPanel());
    app.appendChild(shell);
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  readHash();
  render();
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });
})();
