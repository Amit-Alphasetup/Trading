// playbook.js — OWNS: the per-setup checklist cards.
// Pure data plus a tiny qualification tracker. No imports beyond store.
//
// Prose in a unit is for learning. This is for 09:40 at a chart, deciding in
// thirty seconds whether the thing in front of you qualifies. Same criteria are
// used when marking backtest examples and when filling a pre-trade card — which
// is the only reason a backtest predicts anything about live trading.

import * as store from './store.js';
const { get, set, all, add } = store;

export const CARDS = {

  // ---------- SWING ----------
  'consolidation breakout': {
    family: 'swing', unit: 'structure',
    idea: 'Sellers exhaust inside a tightening range; very little buying is then needed to move price.',
    qualifies: [
      'A clear prior advance — consolidation only means something after a move',
      'Range is tight and getting tighter, ideally under 10% high to low',
      'At least 2 weeks of sideways action, so the transfer of ownership is real',
      'Volume declined through the consolidation',
      'Breakout candle closes above the range high on 1.5×+ average volume',
      'Index is above its 50 EMA'
    ],
    disqualifies: [
      'Sideways action with no prior trend — that is just sideways',
      'Breakout volume at or below average',
      'Range is widening rather than contracting',
      'Earnings inside the next 5 sessions'
    ],
    trigger: 'Close above the range high, or the first pullback that holds above it.',
    stop: 'Below the consolidation low. Tighter version: below the breakout candle low.',
    target: 'Measured move — the height of the prior advance projected from the breakout. Then trail.',
    fails: [
      'False breakout: closes back inside the range within 1–2 sessions. This is why volume is not optional.',
      'Breaks out into obvious overhead supply from an older high.',
      'The market rolls over — individual breakouts fail en masse in a falling index.'
    ]
  },

  'pullback to 20/50 EMA': {
    family: 'swing', unit: 'structure',
    idea: 'The lowest-risk entry into an existing trend: your stop is close, so size can be larger for the same rupee risk.',
    qualifies: [
      'Uptrend already visible — higher highs and higher lows before the pullback',
      'The moving average is rising, not flat',
      'Pullback is orderly: a few modest red candles, not a collapse',
      'Volume lighter on the pullback than on the prior advance',
      'Price holds above the previous swing low throughout',
      'Evidence of resumption: strong close, or a break of the prior day\'s high'
    ],
    disqualifies: [
      'Volume heavier on the pullback than the advance — that is real selling',
      'Price slices through both averages without hesitating',
      'A lower low has printed: structure has changed, this is no longer a pullback',
      'The average is flat or falling'
    ],
    trigger: 'First sign of resumption at the average. Touching the line alone proves nothing.',
    stop: 'Below the swing low of the pullback.',
    target: 'The prior high first, then trail behind each new higher low.',
    fails: [
      'Buying the touch instead of the resumption — the commonest error on this setup.',
      'The "pullback" was the first leg of a reversal.',
      'A gap through the average overnight leaves no chance to act on the stop.'
    ]
  },

  'VCP': {
    family: 'swing', unit: 'volume',
    idea: 'Successive contractions, each shallower, mean each wave of sellers has given up. Supply is exhausted and the float is tightly held.',
    qualifies: [
      'At least 2, ideally 3+ contractions, each meaningfully tighter than the last',
      'Volume declining across the whole sequence',
      'Final contraction is genuinely tight, often under 5%',
      'Price near its highs, not recovering from a collapse',
      'Breakout on clearly expanding volume',
      'Market in a constructive state'
    ],
    disqualifies: [
      'Contractions getting wider instead of tighter',
      'Volume staying elevated — sellers are not finished',
      'Deep final contraction, which destroys the tight stop that makes the setup worth taking',
      'Broad market falling'
    ],
    trigger: 'Break of the final contraction high on expanding volume.',
    stop: 'Below the low of the final contraction. Tightness is the entire point.',
    target: 'Measured move from the base. Trail — these are the ones that occasionally run far.',
    fails: [
      'Marking a shape as VCP when the contractions are not actually tightening.',
      'Taking it in a hostile market, where the pattern fails far more often.',
      'Chasing after the breakout has already run 8–10%.'
    ]
  },

  '52-week-high breakout': {
    family: 'swing', unit: 'volume',
    idea: 'At a 52-week high nobody who owns the stock is losing. There is no overhang of trapped holders waiting to sell at breakeven.',
    qualifies: [
      'Genuine new high after a long base, not a marginal daily grind higher',
      'Volume expansion on the breakout day',
      'Broader market not in freefall',
      'The stock has shown relative strength versus the index recently',
      'A defined base below to place a stop against'
    ],
    disqualifies: [
      'Marginal new high on unremarkable volume',
      'News gap to the high — those frequently fill',
      'No identifiable base, so no sensible stop',
      'Stock has already run 30%+ in a few weeks'
    ],
    trigger: 'Break of the old high, or the first pullback holding above it.',
    stop: 'Below the base, or below the breakout day low for a tighter version.',
    target: 'Measured move from the base height, then trail. Do not cut these at 1R.',
    fails: [
      'The immediate reversal back below the old high.',
      'Buying because it "looks strong" without the base, which leaves the stop arbitrary.'
    ]
  },

  'failed-breakdown reversal': {
    family: 'swing', unit: 'patterns',
    idea: 'Shorts who sold the break and holders stopped out are both wrong at once. Both must buy. That forced buying is the fuel.',
    qualifies: [
      'The support level is obvious — multiple prior touches, visible to anyone',
      'A genuine break below it, not a one-tick wick',
      'Prompt reclaim: same day or the next',
      'Reclaim happens on decent volume',
      'The stock was not in a genuine collapse — this is a fake break, not a real one'
    ],
    disqualifies: [
      'Reclaim takes a week or more',
      'Weak volume on the reclaim',
      'Stock is in a clear downtrend where every level eventually breaks properly',
      'The break came on fundamental news'
    ],
    trigger: 'Close back above the level after the break.',
    stop: 'Below the low of the failed breakdown. Naturally tight.',
    target: 'Top of the prior range, then trail.',
    fails: [
      'The second breakdown, which is usually real.',
      'Acting on the wick rather than a close.',
      'It feels bad to buy something that just fell. That discomfort is why the edge exists — and why the rules must be written before you are in it.'
    ]
  },

  'earnings-gap continuation': {
    family: 'swing', unit: 'patterns',
    idea: 'A large gap on results is genuinely new information. Institutions cannot buy their full position in one day without moving price, so accumulation continues.',
    qualifies: [
      'Gap is large relative to the stock\'s normal range',
      'Volume several times average on the gap day',
      'Stock holds the gap and closes near the day\'s high',
      'The gap is on actual results, not a vague announcement',
      'It has not already run 30% since the gap'
    ],
    disqualifies: [
      'Gap fades during the gap day itself',
      'Low volume gap',
      'Broad market falling hard',
      'You are looking at it two weeks late'
    ],
    trigger: 'NOT the gap day. Wait for the first consolidation or pullback holding above the gap day low, then enter on resumption.',
    stop: 'Below the gap day low. If that is too far for your risk, reduce quantity — never widen tolerance.',
    target: 'Prior structural levels, then trail.',
    fails: [
      'Entering at the open on gap day: chaotic, terrible fills, no sensible stop.',
      'Indian results often bring wide spreads at the open. The price you see may not be a price you can get.'
    ]
  },

  'sector rotation momentum': {
    family: 'swing', unit: 'volume',
    idea: 'Money moves between sectors in waves. Buying the leading stock in a newly leading sector puts you where demand is concentrated.',
    qualifies: [
      'The sector is outperforming the index over the last 2–4 weeks',
      'Multiple names in the sector are strong, not just one',
      'Your chosen name is a leader within that sector, not a laggard',
      'It has its own valid chart setup — the sector is context, not a trigger'
    ],
    disqualifies: [
      'Only one stock in the sector is moving',
      'The rotation is already 6+ weeks old and extended',
      'You are buying the laggard because it "has more room"'
    ],
    trigger: 'A standard structural entry on the leading name.',
    stop: 'Per the underlying setup.',
    target: 'Per the underlying setup, exiting earlier if sector leadership breaks down.',
    fails: [
      'Sector rotation is context, never a signal by itself.',
      'Rotations reverse without warning on policy or commodity news.'
    ]
  },

  // ---------- INTRADAY ----------
  'opening range breakout 15m': {
    family: 'intraday', unit: 'intraday',
    idea: 'The first 15 minutes are the market\'s initial verdict on overnight information. Breaking it forces those positioned inside to revise.',
    qualifies: [
      'Opening range is contained, not enormous',
      'Volume expansion on the break',
      'Direction agrees with the broader market that day',
      'Break occurs before 10:30',
      'Market filter logged and permitting this direction'
    ],
    disqualifies: [
      'Huge opening range — the violent repricing already happened',
      'Break on thin volume',
      'Fighting the index direction',
      'After 10:30, when it is no longer an opening-range event'
    ],
    trigger: 'Break of the range edge, or the retest from the correct side. The retest is lower risk and misses some moves — let your own data decide.',
    stop: 'Opposite side of the range, or below the retest low for the tighter version.',
    target: 'Measured move equal to the range height, then trail. Flat by 15:10 regardless.',
    fails: [
      'The false break that immediately returns inside — very common on quiet days.',
      'Both directions triggering within minutes on a choppy open.'
    ]
  },

  'VWAP mean reversion': {
    family: 'intraday', unit: 'intraday',
    idea: 'On a day with no directional conviction, price stretched far from VWAP tends to revert to it.',
    qualifies: [
      'RANGE day: price has crossed VWAP repeatedly since 09:45',
      'VWAP is flat, not sloping',
      'No clear higher highs or lower lows on the day',
      'Price is meaningfully extended from VWAP',
      'Evidence of reversion has begun — not just distance'
    ],
    disqualifies: [
      'Price has stayed on one side of a sloping VWAP: this is a TREND day and this setup is the wrong one',
      'Before 09:45, when VWAP is built from too few trades',
      'A major event or result is due today'
    ],
    trigger: 'Reversal evidence at the extreme, not distance alone.',
    stop: 'Beyond the extreme of the move.',
    target: 'VWAP itself. Do not hold for more.',
    fails: [
      'Taking this on a trend day is the classic intraday error. Same chart location, opposite correct trade.',
      'Fading a genuine breakout and adding to it as it runs.'
    ]
  },

  'VWAP trend pullback': {
    family: 'intraday', unit: 'intraday',
    idea: 'On a trending day, institutions benchmarked to VWAP step in around it, so pullbacks to it resume.',
    qualifies: [
      'TREND day: price persistently on one side of VWAP since 09:45',
      'VWAP is sloping in the trade direction',
      'Structure intact — higher highs and higher lows on the day for longs',
      'Pullback to VWAP is orderly',
      'Resumption evidence before entry'
    ],
    disqualifies: [
      'Price crossing VWAP repeatedly — that is a range, use the other setup',
      'Pullback slices straight through VWAP with force',
      'Midday dead zone without an A+ qualification'
    ],
    trigger: 'Resumption at or just past VWAP.',
    stop: 'Below the pullback low, or the far side of VWAP.',
    target: 'Day high, then trail. Flat by 15:10.',
    fails: [
      'The first VWAP loss of a trend day usually marks the trend ending — stop trading the direction.',
      'Trend days often reverse hard after 14:00.'
    ]
  },

  'previous-day high/low break with retest': {
    family: 'intraday', unit: 'intraday',
    idea: 'The most-watched objective levels on any intraday chart. Stops cluster beyond them; when the break holds, the faders are trapped.',
    qualifies: [
      'The level breaks with volume',
      'Break occurs before the midday dead zone',
      'Price retests the level from the other side and holds',
      'Market filter permits the direction'
    ],
    disqualifies: [
      'The retest slices back through — that is a failed break, a different setup',
      'Break on thin volume',
      'Late-day break with no time to work'
    ],
    trigger: 'The retest holding, NOT the initial break. This costs some moves and greatly improves risk-reward.',
    stop: 'Below the retest low.',
    target: 'Next structural level, or a measured move from the previous day range.',
    fails: [
      'Entering on the break and being stopped by the retest.',
      'On quiet days the level breaks and does nothing.'
    ]
  },

  'failed-breakout fade': {
    family: 'intraday', unit: 'intraday',
    idea: 'The inverse of the retest setup: price breaks a level, fails to hold, and returns inside. The breakout buyers are now trapped.',
    qualifies: [
      'A clear, watched level was broken',
      'Price returns decisively inside within a short time',
      'Volume on the failure is real',
      'The day has no strong directional conviction'
    ],
    disqualifies: [
      'A strong trend day — do not fade a trending market',
      'The level was not obvious enough for anyone to be trapped',
      'Slow drift back rather than a decisive rejection'
    ],
    trigger: 'Decisive return inside the range.',
    stop: 'Beyond the failed extreme.',
    target: 'Opposite side of the range or VWAP.',
    fails: [
      'The break was real and only paused. Fading trends is how intraday accounts die.',
      'Requires speed and good fills — costs matter more here than anywhere.'
    ]
  },

  'relative-strength pair play': {
    family: 'intraday', unit: 'intraday',
    idea: 'When a sector moves, one name leads and one lags. Demand is concentrated in the leader.',
    qualifies: [
      'A clear sector-wide move today',
      'Measurable divergence in percentage change since the open',
      'Adequate liquidity in the name chosen',
      'The leader has its own valid entry structure'
    ],
    disqualifies: [
      'Buying the laggard because it looks cheaper',
      'No real sector move, just one stock',
      'Thin name where slippage will eat the edge'
    ],
    trigger: 'A standard intraday entry on the leading name.',
    stop: 'Per the underlying entry structure.',
    target: 'Per the underlying structure, exiting if sector leadership flips.',
    fails: [
      'Needs more screen attention than the other intraday setups. Skipping it entirely is reasonable.',
      'Leadership can rotate intraday.'
    ]
  }
};

export const cardFor = setup => CARDS[setup] || null;
export const families = () => [...new Set(Object.values(CARDS).map(c => c.family))];
export const setupsIn = family => Object.keys(CARDS).filter(k => CARDS[k].family === family);

// ---------- qualification tracker ----------
// If he ticks 4 of 6 conditions and takes the trade anyway, that is the finding.
// Recorded per attempt so the Edge Finder can later show what partial
// qualification actually costs him.
export async function recordQualification(setup, ticked, total, taken) {
  await add('qualifications', {
    setup, ticked, total, taken: !!taken,
    full: ticked === total, at: new Date().toISOString()
  });
}

export async function qualificationStats(setup) {
  const rows = (await all('qualifications')).filter(q => !setup || q.setup === setup);
  if (!rows.length) return { n: 0 };
  const taken = rows.filter(q => q.taken);
  const partial = taken.filter(q => !q.full);
  return {
    n: rows.length, taken: taken.length,
    skipped: rows.length - taken.length,
    partialTaken: partial.length,
    partialPct: taken.length ? Math.round(partial.length / taken.length * 100) : 0
  };
}
