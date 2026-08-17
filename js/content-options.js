// content-options.js — OWNS: the options curriculum.
// Four units: foundations, vertical spreads, multi-leg structures, and
// adjustment/undefined risk. Pure data, no imports.

const options_one = {
  id: 'options1', phase: 3, title: 'Options — why buying calls loses money',
  mins: 25, unlocks: [],
  sections: [
    { h: 'What you are actually buying',
      p: [
        'A call gives you the right, not the obligation, to buy the underlying at a fixed strike price until expiry. A put is the same for selling. You pay a premium for that right.',
        'The premium has two components. Intrinsic value: how far in-the-money the option already is. If Nifty is at 24,500 and you hold a 24,000 call, ₹500 of the premium is intrinsic — it is real, it cannot decay.',
        'Extrinsic value: everything else. This is payment for the possibility that the option becomes more valuable before expiry. It is entirely a function of time remaining and expected volatility, and it decays to exactly zero at expiry. Always. Without exception.',
        'An at-the-money or out-of-the-money option is 100% extrinsic value. You have bought a wasting asset whose entire worth evaporates on a known schedule. Understanding this one sentence prevents most of the money beginners lose in options.'
      ] },
    { h: 'Three variables, all of which must be right',
      p: [
        'Buy a stock and you need one thing: direction. It can take as long as it likes and you still profit.',
        'Buy a naked call and you need three. Direction — it must go up. Magnitude — it must go up enough to cover the premium you paid. Timing — it must do so before expiry.',
        'Worked example. Nifty at 24,500. You buy a 24,700 call for ₹120. At expiry you need Nifty above 24,820 just to break even — the strike plus the premium. Nifty finishing at 24,750, a correct directional call, loses you ₹70 of the ₹120.',
        'This is why being right about direction and still losing money is not bad luck in options. It is the normal, expected outcome of a three-variable bet where only one variable was correct.',
        'It is also why this system teaches spreads before naked options, even though naked options are simpler to understand. Simpler to understand is not the same as easier to profit from.'
      ] },
    { h: 'The Greeks, operationally',
      p: [
        'Delta: how much the option price moves for a ₹1 move in the underlying. A 0.30 delta call gains roughly ₹0.30 per ₹1 rise. Also a rough approximation of the probability of finishing in-the-money — a 0.30 delta option has roughly a 30% chance. That second reading is the useful one for position selection.',
        'Theta: how much value the option loses per day, all else equal. This is the rent. For an option buyer theta is a constant cost; for a seller it is constant income. Theta accelerates as expiry nears, and in the final week it becomes brutal.',
        'Vega: how much the option price changes for a 1-point change in implied volatility. Long options are long vega — you benefit if uncertainty rises and suffer if it falls. This is the variable that catches people out around events.',
        'Gamma: how fast delta itself changes. Near expiry and near the strike, gamma is enormous — an option\'s behaviour flips from barely moving to moving like the underlying itself within a few points. Gamma is why expiry-day trading is a separate, later phase in this system.',
        'You do not need to calculate any of these. You need to know which ones are working for you and which against, in every position you hold. If you cannot answer that, do not place the trade.'
      ] },
    { h: 'Implied volatility and IV crush',
      p: [
        'Implied volatility is the market\'s collective estimate of how much the underlying will move, backed out from the option\'s price. High IV means options are expensive; low IV means cheap.',
        'IV percentile puts today\'s IV in context: is 18% high or low for this instrument? Compared to the last year, 18% might be the 90th percentile or the 10th. Without that context, the absolute number tells you nothing.',
        'IV crush: before a known event — company results, a policy decision, an election outcome — uncertainty is high, so IV is high, so options are expensive. The moment the event passes, the uncertainty resolves regardless of the outcome, IV collapses, and every long option loses vega value instantly.',
        'The consequence people meet the hard way: you buy a call before results, results are good, the stock rises 3%, and your option is worth less than you paid. You were right and you lost money, because you bought expensive uncertainty and it stopped being uncertain.',
        'The general principle: buy options when IV is low relative to its own history, sell them when it is high. Doing the opposite — which is the natural instinct, because high IV periods feel exciting — is systematically expensive.'
      ] },
    { h: 'The option chain and open interest',
      p: [
        'The chain lists every strike with its calls and puts, showing price, volume, and open interest. Open interest is the number of contracts currently outstanding — positions that exist right now, as opposed to volume, which counts today\'s transactions.',
        'Rising open interest with rising price suggests new positions being built in that direction. Falling open interest suggests positions being closed. This is genuinely informative about participation, and genuinely over-interpreted by most retail commentary.',
        'Large open interest at a strike is often described as support or resistance. Treat this cautiously — it identifies where positions are concentrated, not where price must stop. It is context, not a signal.',
        'What the chain is unambiguously useful for: checking liquidity before you trade. Wide bid-ask spreads and thin open interest at your chosen strike mean your fills will be poor and your exit may be worse. Unit 5\'s slippage discussion applies with more force here than anywhere else.'
      ] },
    { h: 'Why spreads come first',
      p: [
        'A spread means buying one option and selling another simultaneously. The sold option pays for part of the bought one.',
        'A bull call spread: buy a 24,500 call, sell a 24,800 call. You pay less than the naked call cost. Your maximum profit is capped at the difference between strikes minus what you paid. Your maximum loss is what you paid.',
        'What you gave up: the unlimited upside, which in practice you were unlikely to capture anyway. What you gained is more important — the sold option has theta and vega working in your favour, partially cancelling the theta and vega working against your bought option.',
        'Concretely: a naked call bleeds value every day and collapses if IV falls. A spread bleeds far less and is far less sensitive to IV. You have converted a three-variable bet into something much closer to a one-variable bet on direction.',
        'That is the entire reason this system teaches spreads first, condors second, and ratio structures last. Each step reintroduces a variable, and you should only take on a variable you already understand from the previous step.'
      ] },
    { h: 'Defined risk versus undefined risk',
      p: [
        'Defined risk means your worst case is known and capped when you enter — you can state the maximum loss in rupees before placing the order. Every long option and every vertical spread is defined risk.',
        'Undefined risk means the worst case is theoretically very large. Selling a naked call has no upper bound on losses. Short strangles and straddles are undefined risk.',
        'Undefined-risk strategies often have high win rates, which is exactly what makes them dangerous. A strategy that wins 90% of the time and occasionally loses ten times the average win is not a good strategy; it is a good-feeling strategy with a hidden tail.',
        'This is why Phase 3 is defined risk only, and undefined risk is a separate Phase 4 trial with a ₹10,00,000 minimum and its own 60-trade probation. The capital requirement is not about affording the margin. It is about being able to survive the tail when it arrives, because it will.'
      ] },
    { h: 'Regime: the same strategy, right and wrong',
      p: [
        'An iron condor is an excellent strategy in a rangebound, high-IV market and a reliable way to lose money in a trending one. Nothing about the strategy changed; the market did.',
        'This is the single commonest options failure among people who have already learned the strategies: correct execution of a strategy that did not belong in that market.',
        'Hence the Regime Classifier in the app. Before any options trade you tag the market — Trending, Rangebound, Event, High-IV, Low-IV, Expiry — and the app shows only strategies legal in that regime and hides the rest.',
        'The discipline this enforces is not "pick the best strategy". It is "do not take a strategy the conditions forbid", which is a much easier question and prevents a much larger share of losses.',
        'Broadly: buy premium in low IV when you expect a move. Sell premium in high IV when you expect a range. Use directional spreads in trends. Avoid selling premium into events unless you specifically understand what you are being paid for.'
      ] },
    { h: 'What the app cannot backtest for you, and why',
      p: [
        'Backtesting option strategies requires historical option premiums at every strike, which free broker APIs generally do not provide with useful depth.',
        'So Phase 3 uses forward paper trading instead: 100 trades papered in real time rather than marked from history. Slower, and honest about being slower.',
        'This is not merely a limitation. Paper trading options in real time teaches something backtesting cannot — how a position feels while theta grinds against you for four days and nothing happens. That is the actual experience of holding options, and it is the part that produces the panicked adjustment that turns a small loss into a large one.',
        'There is a dedicated Phase 4 module on when to adjust versus when to simply exit. The short version, worth knowing now: most adjustments are hope wearing the clothes of strategy. Exiting a losing position and re-entering a good one is usually better than turning a bad position into a complicated bad position.'
      ] }
  ],
  qs: [
    { q: 'You buy a call before results. The stock rises 3%. Your option loses money. Most likely cause:',
      o: ['You misread the chart', 'IV crush after the event', 'The broker mispriced it', 'Theta over one day'],
      a: 1, why: 'Uncertainty was priced in beforehand. When the event resolves, that premium evaporates regardless of direction.' },
    { q: 'How many things must go right for a naked long call to profit?',
      o: ['One — direction', 'Two — direction and magnitude', 'Three — direction, magnitude and timing'],
      a: 2, why: 'This is precisely why defined-risk spreads are taught first.' },
    { q: 'Nifty at 24,500. You buy a 24,700 call for ₹120. Your break-even at expiry is:',
      o: ['24,700', '24,820', '24,620', '24,380'],
      a: 1, why: 'Strike plus premium. A correct directional call that finishes at 24,750 still loses money.' },
    { q: 'An at-the-money option one week from expiry consists of:',
      o: ['Mostly intrinsic value', 'Entirely extrinsic value, which decays to zero', 'Equal parts of both'],
      a: 1, why: 'With no intrinsic value, the whole premium is payment for possibility, and it expires worthless on a known schedule.' },
    { q: 'A 0.30 delta call is roughly:',
      o: ['30% likely to finish in-the-money', '30% of the underlying\'s value', '30 days from expiry'],
      a: 0, why: 'Delta doubles as a rough probability estimate, which is the more useful reading for position selection.' },
    { q: 'Theta for an option buyer is:',
      o: ['Income', 'A constant cost that accelerates near expiry', 'Irrelevant for short holds'],
      a: 1, why: 'It is the rent you pay for holding the right. It becomes brutal in the final week.' },
    { q: 'A bull call spread compared to a naked call:',
      o: ['More upside, more risk', 'Capped upside, far less sensitivity to timing and IV', 'Identical risk profile'],
      a: 1, why: 'You sell away extreme upside to buy independence from two of the three variables.' },
    { q: 'IV at 18% tells you the option is expensive:',
      o: ['Yes, 18% is high', 'Only in the context of that instrument\'s own IV history — IV percentile', 'No, 18% is always cheap'],
      a: 1, why: 'The absolute number is meaningless without knowing where it sits in its own range.' },
    { q: 'A strategy wins 90% of the time and occasionally loses ten times the average win. This is:',
      o: ['An excellent strategy', 'A good-feeling strategy with a hidden tail', 'Impossible'],
      a: 1, why: 'High win rate with undefined risk is exactly the profile that ends accounts. Expectancy, not win rate, is the measure.' },
    { q: 'An iron condor in a strongly trending market is:',
      o: ['A good strategy applied in the wrong regime', 'Always wrong as a strategy', 'Safer than in a range'],
      a: 0, why: 'The strategy did not change; the market did. This is the commonest failure among people who already know the strategies.' },
    { q: 'The main reason gamma matters near expiry:',
      o: ['It increases theta income', 'Delta changes extremely fast, so behaviour flips within a few points', 'It reduces margin'],
      a: 1, why: 'This is why expiry-day trading is a separate later phase rather than part of Phase 3.' },
    { q: 'Before choosing a strike, the chain is most reliably useful for:',
      o: ['Identifying guaranteed support from open interest', 'Checking liquidity — spread width and open interest at your strike', 'Predicting expiry level'],
      a: 1, why: 'Thin strikes produce poor fills and worse exits. Slippage hurts more in options than anywhere else.' },
    { q: 'Phase 3 uses forward paper trading rather than backtesting because:',
      o: ['Backtesting options is unnecessary', 'Historical option premiums by strike are not available with useful depth from free APIs', 'Paper trading is more accurate'],
      a: 1, why: 'An honest limitation. It also teaches how theta feels over days, which backtesting cannot.' },
    { q: 'Most adjustments to losing option positions are:',
      o: ['Sophisticated risk management', 'Hope wearing the clothes of strategy', 'Required by margin rules'],
      a: 1, why: 'Exiting and re-entering a good position usually beats turning a bad position into a complicated bad position.' }
  ]
};

const options_two = {
  id: 'options2', phase: 3, title: 'Vertical spreads — the only structures you should start with',
  mins: 25,
  unlocks: ['bull call spread', 'bear put spread', 'bull put spread', 'bear call spread'],
  sections: [
    { h: 'Why verticals and nothing else, at first',
      p: [
        'A vertical spread is two options of the same type and same expiry at different strikes: one bought, one sold. That is the entire structure. Four of them exist and they are the only options positions you should hold for your first hundred trades.',
        'The reason is not caution. It is that a vertical has exactly one moving part you must be right about — direction, by a certain date — while every other structure adds a second or third. You cannot learn to manage three unfamiliar variables at once, and attempting it is what makes people conclude options do not work.',
        'Every vertical is defined risk. You can state your maximum loss in rupees before you place the order. If you cannot, you have built it wrong and should not place it.',
        'The four: bull call spread and bear put spread are debits — you pay to enter. Bull put spread and bear call spread are credits — you are paid to enter. Two are bullish, two bearish, one of each per direction. Which you use depends almost entirely on implied volatility, and that is the substance of this unit.'
      ] },

    { h: 'Bull call spread, in full',
      p: [
        'Structure: buy a call, sell a higher-strike call, same expiry. Bullish. You pay a net debit.',
        'Worked example. Nifty at 24,500, monthly expiry three weeks out. Buy the 24,500 call at ₹280, sell the 24,800 call at ₹170. Net debit ₹110. Because the lot is 75, you have paid ₹8,250 and that is your maximum loss, known before you enter.',
        'Maximum profit is the strike width minus the debit: 300 − 110 = ₹190, or ₹14,250 on the lot. Break-even is the long strike plus the debit: 24,610. Risk-reward is 190 to 110, roughly 1.7 to 1.',
        'What the short leg bought you: the naked 24,500 call cost ₹280 and would have bled roughly ₹9 a day in theta. The spread cost ₹110 and bleeds perhaps ₹3, because your short leg is decaying in your favour. If implied volatility falls 4 points, the naked call loses meaningfully; the spread barely notices, because both legs lose vega together.',
        'What you gave up: everything above 24,800. If Nifty runs to 25,400, the naked call makes far more. In practice you were unlikely to hold for that anyway, and the trades where you would have are outnumbered by the ones where theta and IV quietly ate a correct directional call.',
        'Strike selection, which is where most of the skill is. The long strike goes at or slightly below the money — near the level you expect price to clear. The short strike goes at your actual target, not far beyond it. A short strike at 25,500 when you expect 24,800 costs you almost nothing in premium received and turns the position back into something close to a naked call.',
        'When it belongs: low or moderate IV, a directional view, and a catalyst or structure that gives the move a reason to happen before expiry.',
        'How it fails: the move happens but after expiry. Spreads still expire. It also fails when you choose an expiry that is too near — a two-week view expressed in a one-week option leaves no room for the ordinary pause that every move contains.',
        'Management: with three weeks to run and the spread at 70–80% of maximum profit, take it. The last 20% takes disproportionate time and carries the full remaining risk. This single habit separates people who make money on verticals from those who watch winners decay back to nothing.'
      ] },

    { h: 'Bear put spread, in full',
      p: [
        'Structure: buy a put, sell a lower-strike put, same expiry. Bearish. Net debit. It is the exact mirror of the bull call spread and everything above applies inverted.',
        'Worked example. Nifty at 24,500. Buy the 24,500 put at ₹260, sell the 24,200 put at ₹150. Debit ₹110, maximum profit ₹190, break-even 24,390.',
        'One asymmetry worth knowing: markets fall faster than they rise. Downside moves tend to arrive with a volatility spike, which helps a long put and hurts a short one. In a bear put spread these partly cancel, so you capture less of a volatility expansion than a naked put would.',
        'The practical consequence: if you are positioned for a sharp fall driven by fear rather than drift, a spread is less efficient than a naked put. If you are positioned for an ordinary decline, the spread is better because it does not depend on the fear arriving.',
        'In India there is a structural point too. Retail is overwhelmingly long-biased, index puts are frequently bid relative to calls, and a bear put spread pays less than the mirror-image bull call spread would. Compare the two before assuming symmetry.'
      ] },

    { h: 'Bull put spread, in full',
      p: [
        'Structure: sell a put, buy a lower-strike put, same expiry. Bullish or neutral. You receive a net credit.',
        'Worked example. Nifty at 24,500. Sell the 24,200 put at ₹95, buy the 24,000 put at ₹55. Credit ₹40, width 200, so maximum loss is 200 − 40 = ₹160. On a 75 lot: you receive ₹3,000 and risk ₹12,000.',
        'Read that ratio slowly, because it is the thing beginners misjudge and the thing that ends accounts. You are risking four rupees to make one. That is fine — it is the correct structure for a high-probability trade — but it means your win rate must be genuinely high and it means one loss erases four wins.',
        'The arithmetic. At a 78% win rate: (0.78 × 40) − (0.22 × 160) = 31.2 − 35.2 = −4. That trade is a loser despite winning nearly four times in five. At 85%: (0.85 × 40) − (0.15 × 160) = 34 − 24 = +10. Between those two win rates lies the entire difference between a business and a slow bleed, and neither feels different while you are trading it.',
        'This is why credit spreads must be sold when IV is high. In high IV that same 200-wide spread might pay ₹70 instead of ₹40, which moves break-even from 80% down to about 65% — a win rate you can actually sustain. Selling the identical structure in low IV is the same maximum loss for half the credit, and it is the commonest way experienced-feeling traders lose money slowly.',
        'Strike selection: the short strike goes below a level you genuinely believe holds — a support zone, a prior swing low, a moving average that has been respected. Delta is a rough guide to probability, so a 0.20-delta short put implies roughly an 80% chance of expiring worthless. Do not sell strikes so close to the money that a normal day threatens them.',
        'Width selection: wider spreads collect more credit but risk more. The ratio barely improves; what changes is how much a single loss costs. Narrower is more forgiving while you are learning.',
        'Management: close at 50% of maximum profit. Holding a credit spread to expiry for the last few rupees means carrying assignment risk and gamma risk for almost no remaining reward. Also close, without argument, if the short strike is breached — a defended loser becomes a maximum loser faster than you expect.',
        'How it fails: a fast move through the short strike, and events landing inside the expiry. Never sell premium into a scheduled event unless you specifically understand that you are being paid to absorb that event.'
      ] },

    { h: 'Bear call spread, in full',
      p: [
        'Structure: sell a call, buy a higher-strike call, same expiry. Bearish or neutral. Net credit. Mirror of the bull put spread.',
        'Worked example. Nifty at 24,500. Sell the 24,800 call at ₹85, buy the 25,000 call at ₹45. Credit ₹40, width 200, maximum loss ₹160.',
        'The asymmetry runs the other way here. Upward moves tend to be slower and accompanied by falling volatility, which helps a short call position twice: price does not reach you, and the premium decays faster. That makes bear call spreads slightly more forgiving than bull put spreads of the same width and delta.',
        'The offsetting danger is the gap. Indian indices gap on global overnight moves, and a gap through your short call cannot be managed — you wake up already at or near maximum loss. This is precisely why the long leg is not optional, and why "I will close it if it goes against me" is not a risk plan.',
        'Where it fits practically: as the upper half of a condor, or on its own when a level overhead has repeatedly rejected price and IV is elevated.'
      ] },

    { h: 'Choosing between debit and credit',
      p: [
        'The decision is not about your directional conviction. Both express the same direction. It is about implied volatility and about what kind of win rate you can psychologically sustain.',
        'Low IV, directional view: use a debit spread. You are buying cheap premium and the structure profits from the move rather than from time.',
        'High IV, directional or neutral view: use a credit spread. You are selling expensive premium and time is working for you.',
        'IV percentile is the tool for this, not the raw IV number. India VIX at 14 might be the 20th percentile of the past year or the 60th, and those imply opposite choices.',
        'The psychological dimension is real and underrated. A debit spread loses often and wins bigger; a credit spread wins often and loses bigger. People who cannot tolerate frequent small losses gravitate to credit spreads and then size them too large, because winning feels constant right up until it does not. If you know that is you, that is an argument for debit spreads, not for bigger credit ones.'
      ] },

    { h: 'Indian market specifics you must not learn the hard way',
      p: [
        'Contract sizes and expiry structure have been revised repeatedly by SEBI since 2024. Never assume a lot size or margin figure from memory or from an old article — check it on the exchange or in your broker before you size anything.',
        'Weekly expiries concentrate enormous gamma into the final hours. A spread that is comfortable on Tuesday can be at maximum loss by Thursday afternoon without price doing anything dramatic.',
        'STT on exercised options has historically been charged on settlement value rather than premium. Letting a deep in-the-money long option expire instead of selling it has produced losses larger than the option was worth. Square off; do not let anything exercise by accident.',
        'Liquidity thins fast away from the index and away from near-the-money strikes. Check the bid-ask spread and open interest at your chosen strike before you commit — a spread you cannot exit at a fair price is a worse position than one with slightly worse theoretical parameters.',
        'Margin for credit spreads is blocked on the position, not merely on the maximum loss, and the amount can change intraday. Do not build a position that leaves you unable to close it.'
      ] }
  ],
  qs: [
    { q: 'Buy 24,500 call at ₹280, sell 24,800 call at ₹170. Maximum profit per unit?',
      o: ['₹110', '₹190', '₹300', 'Unlimited'], a: 1,
      why: 'Width 300 minus the ₹110 debit paid.' },
    { q: 'Same spread. Break-even at expiry?',
      o: ['24,500', '24,610', '24,800', '24,390'], a: 1,
      why: 'Long strike plus the debit. A correct call that finishes at 24,590 still loses.' },
    { q: 'Sell 24,200 put at ₹95, buy 24,000 put at ₹55. Maximum loss per unit?',
      o: ['₹40', '₹160', '₹200', 'Unlimited'], a: 1,
      why: 'Width 200 minus the ₹40 credit. You risk four to make one.' },
    { q: 'That credit spread wins 78% of the time. Expectancy per unit?',
      o: ['+₹31', '−₹4', '+₹40', '+₹10'], a: 1,
      why: '(0.78 × 40) − (0.22 × 160) = −4. Winning four times in five and still losing money.' },
    { q: 'Why must credit spreads be sold in high IV specifically?',
      o: ['Margin is lower', 'Same maximum loss, much larger credit — it moves the break-even win rate to something sustainable', 'The exchange requires it'],
      a: 1, why: 'In low IV you take identical risk for half the payment. That is the slow bleed.' },
    { q: 'Your bull call spread is at 75% of maximum profit with three weeks left. You:',
      o: ['Hold for the last 25%', 'Close it', 'Roll it up'],
      a: 1, why: 'The last 25% takes disproportionate time and carries the full remaining risk.' },
    { q: 'Placing the short strike far beyond your actual target:',
      o: ['Increases profit meaningfully', 'Collects almost nothing and turns it back into a near-naked call', 'Reduces risk'],
      a: 1, why: 'You pay full price for protection you priced at nothing. Strike selection is most of the skill.' },
    { q: 'Which structure suits low IV with a directional view?',
      o: ['Bull put spread', 'Bull call spread', 'Iron condor'],
      a: 1, why: 'Buy cheap premium in low IV; sell expensive premium in high IV.' },
    { q: 'A credit spread\'s short strike is breached. The correct action is:',
      o: ['Defend it by rolling', 'Close it', 'Add a second spread to average'],
      a: 1, why: 'A defended loser becomes a maximum loser faster than expected. Adding is a second bad trade.' },
    { q: 'Why is the long leg of a bear call spread not optional?',
      o: ['Margin rules', 'Indian indices gap on overnight global moves, and a gap through a naked short call cannot be managed', 'It improves the credit'],
      a: 1, why: '"I will close it if it goes against me" is not a plan against a gap.' },
    { q: 'Letting a deep in-the-money long option expire rather than selling it risks:',
      o: ['Higher brokerage', 'STT charged on settlement value, which has exceeded the option\'s worth', 'Nothing'],
      a: 1, why: 'Square off. Do not let anything exercise by accident.' },
    { q: 'A trader who cannot tolerate frequent small losses should:',
      o: ['Prefer credit spreads and size up', 'Recognise the pull toward credit spreads and consider debit spreads instead', 'Trade naked options'],
      a: 1, why: 'That temperament plus credit spreads plus size is a specific, common way accounts end.' }
  ]
};

const options_three = {
  id: 'options3', phase: 3, title: 'Multi-leg structures — condors, butterflies, calendars',
  mins: 25,
  unlocks: ['iron condor', 'iron butterfly', 'calendar spread', 'diagonal spread',
    'covered call', 'cash-secured put'],
  sections: [
    { h: 'What you are selling when you sell a range',
      p: [
        'An iron condor is a bull put spread and a bear call spread placed together. You are paid a credit and you keep it if price finishes between the two short strikes.',
        'What you are actually selling is the market\'s estimate of movement. Implied volatility is a forecast of how far price will travel; you profit when realised movement comes in below that forecast, and you lose when it exceeds it. Everything else — strike choice, width, management — is detail around that one bet.',
        'This reframing matters because it tells you exactly when the trade belongs: when the forecast is expensive relative to what usually happens, and when there is no reason for an unusually large move. High IV and a rangebound market, both. Neither alone.',
        'High IV in a trending market means you are being paid well to take a bad bet. That is the most expensive sentence in this unit.'
      ] },

    { h: 'Iron condor, in full',
      p: [
        'Worked example. Nifty at 24,500, IV percentile around 75, monthly expiry four weeks out. Sell the 24,000 put and buy the 23,800 put. Sell the 25,000 call and buy the 25,200 call. Both wings 200 wide.',
        'Suppose the put spread pays ₹55 and the call spread ₹45, so total credit ₹100. Maximum loss is one wing\'s width minus the total credit: 200 − 100 = ₹100. Only one side can lose, which is why you subtract the whole credit from a single width.',
        'That is an unusually good ratio — risking 100 to make 100 — and it exists only because IV is high. In low IV the same structure might pay ₹45, so you would be risking 155 to make 45, needing a 78% win rate just to break even.',
        'Break-evens: 24,000 − 100 = 23,900 on the downside, 25,000 + 100 = 25,100 on the upside. Price has a 1,200-point corridor. Compare that to the expected move implied by IV; if the corridor is narrower than the expected move, the trade is priced against you no matter how comfortable the strikes look.',
        'Strike selection: 0.15 to 0.20 delta on each short leg is a common starting point, implying roughly 80–85% probability of each side expiring worthless. Anchor them to structure as well as delta — a short strike beyond a level that has repeatedly held is worth more than one chosen purely from a delta table.',
        'Management, and this is where condors are won or lost. Close at 50% of maximum profit. Close the untested side if it collapses to near zero, so you are not carrying risk for a rupee. If a short strike is breached, close that side. Do not roll it out in time hoping for a reprieve — that converts a defined loss into an open-ended commitment, and it is the single most common way a condor trader turns a manageable month into a bad year.',
        'Never hold a condor into expiry week. Gamma near expiry means the position can travel from comfortable to maximum loss in an afternoon without price doing anything remarkable.',
        'The specific trap: condors win roughly 80% of the time and feel safe, so people size them large. A strategy that wins nine times for ₹100 and loses once for ₹900 is break-even, and it feels like a winning strategy for months before the tenth trade arrives.'
      ] },

    { h: 'Iron butterfly',
      p: [
        'Same idea as the condor with both short strikes at the same price, at the money. You collect much more credit for a much narrower profit zone.',
        'Worked example. Nifty at 24,500. Sell the 24,500 call and the 24,500 put, buy the 24,800 call and the 24,200 put. Suppose the credit is ₹190 against a 300-wide wing, so maximum loss is ₹110 and break-evens are 24,310 and 24,690 — a 380-point corridor rather than the condor\'s 1,200.',
        'The trade-off is explicit: better risk-reward, much lower probability. You are betting price finishes near where it is now, which is a genuine forecast rather than a general expectation of calm.',
        'When it belongs: high IV and a strong reason to think price pins near a level — a heavily traded strike with large open interest, or the tail end of an established range.',
        'How it fails: any real move. It also fails on management, because the position sits at the money, meaning gamma is against you the entire time and the position changes character quickly.',
        'For a first hundred options trades, prefer the condor. The butterfly is the same instinct expressed more aggressively, and aggression is not what you are short of at that stage.'
      ] },

    { h: 'Calendar spreads',
      p: [
        'Structure: sell a near-dated option and buy a further-dated option at the same strike. You pay a net debit.',
        'The mechanism: theta is not linear. A weekly option decays far faster per day than a monthly one. You are short the fast-decaying option and long the slow one, so ordinary passing time works for you.',
        'Worked example. Nifty at 24,500. Sell the weekly 24,500 call at ₹90, buy the monthly 24,500 call at ₹280. Net debit ₹190, which is also your maximum loss. Profit is maximised if price sits at 24,500 when the near leg expires.',
        'The new variable, and the reason this sits at step four rather than step one: you are now exposed to the relationship between two expiries\' implied volatilities, not merely to IV itself. If front-month IV rises relative to back-month — which is exactly what happens as an event approaches — your short leg gains value faster than your long leg and the position loses despite your view on direction being correct.',
        'So the condition is specific: low front-month IV, an expectation of quiet drift near the strike, and no event landing inside the near expiry. Check the event calendar before placing one. Results, policy decisions and major data releases all break the assumption.',
        'A diagonal is the same structure with different strikes, which adds a directional lean. It is a calendar with an opinion, and it should be attempted only after ordinary calendars are familiar.',
        'How it fails: a large fast move in either direction, which is the opposite of the calendar\'s ideal. And volatility term structure shifting against you, which is invisible on a price chart and is why this structure surprises people.'
      ] },

    { h: 'Covered calls and cash-secured puts',
      p: [
        'Covered call: you own the shares — one full lot equivalent — and sell a call against them. You collect premium and cap your upside at the strike.',
        'Cash-secured put: you sell a put and hold enough cash to buy the shares if assigned. You collect premium and may be obliged to buy at the strike.',
        'These are the only short-option structures appropriate before Phase 4, because the risk you are taking is one you were willing to take anyway: you already own the stock, or you already wanted to.',
        'The honest catch on covered calls, which is rarely stated plainly. You have sold your best outcome. Over a long horizon, capping the upside on your winners while retaining the full downside on your losers is a materially worse return profile than simply holding — unless the premium genuinely compensates, which it only does when IV is high. Selling calls for a small premium every month on a stock you believe in is a slow way to convert a good investment into a mediocre one.',
        'The honest catch on cash-secured puts. This is only income if you actually want the shares at the strike. If you would not buy the stock there, you are running a naked short position with a comforting story attached. The test is simple: if you are assigned tomorrow, are you pleased or dismayed? Dismayed means do not place the trade.',
        'Where these genuinely fit: a stock you intend to hold long-term, elevated IV, and a strike at a price where you would be content with either outcome. That last condition is what makes them different from every other short-premium trade in this unit.'
      ] },

    { h: 'Position sizing for multi-leg structures',
      p: [
        'Unit 1\'s arithmetic applies unchanged, but the inputs differ and people get this wrong. Your risk is the maximum loss of the structure, not the margin blocked and not the credit received.',
        'For the condor above: maximum loss ₹100 per unit, lot size 75, so ₹7,500 per lot. At 0.5% of a ₹6,00,000 account you may risk ₹3,000 — which means you cannot take even one lot. That is not a reason to take it anyway. It is the account telling you the trade is too large.',
        'This is also why Phase 3 requires ₹3,00,000 minimum, and why the number is not arbitrary. Below it, a single defined-risk index structure is too large a fraction of the account, and you would be forced to either oversize or to abandon the risk rules that keep you alive.',
        'Margin is a separate constraint from risk. A credit spread may block far more margin than its maximum loss, and the block can change intraday. Never build a position that leaves you without the margin to close it.'
      ] }
  ],
  qs: [
    { q: 'What are you fundamentally selling with an iron condor?',
      o: ['Direction', 'The market\'s estimate of movement — you win when realised movement is less than implied', 'Time'],
      a: 1, why: 'Everything else is detail around that one bet.' },
    { q: 'Condor: both wings 200 wide, total credit ₹100. Maximum loss?',
      o: ['₹100', '₹200', '₹300', '₹400'], a: 0,
      why: 'One width minus the whole credit. Only one side can lose, so you subtract the total credit from a single width.' },
    { q: 'The same condor structure in low IV pays ₹45 instead of ₹100. This means:',
      o: ['Slightly less profit', 'Risking 155 to make 45 — needing about a 78% win rate just to break even', 'Nothing material'],
      a: 1, why: 'Identical risk for less than half the payment. This is the slow bleed.' },
    { q: 'An iron condor requires which conditions?',
      o: ['High IV alone', 'A range alone', 'Both a rangebound market and high IV'],
      a: 2, why: 'High IV in a trend means being paid well to take a bad bet.' },
    { q: 'Your condor is at 50% of maximum profit with two weeks left. You:',
      o: ['Hold to expiry', 'Close it', 'Roll the untested side closer'],
      a: 1, why: 'The remaining credit does not compensate for the gamma and assignment risk of expiry week.' },
    { q: 'A short strike is breached. Rolling that side out in time:',
      o: ['Is standard defensive management', 'Converts a defined loss into an open-ended commitment', 'Reduces risk'],
      a: 1, why: 'The most common way a manageable month becomes a bad year.' },
    { q: 'An iron butterfly compared to a condor:',
      o: ['Lower credit, wider profit zone', 'Higher credit, much narrower profit zone and lower probability', 'Identical'],
      a: 1, why: 'Better risk-reward bought with a genuine forecast that price pins near a level.' },
    { q: 'A calendar spread\'s distinctive risk is:',
      o: ['Assignment', 'Front-month IV rising relative to back-month, which loses money even when direction is right', 'Brokerage'],
      a: 1, why: 'Invisible on a price chart, which is why it surprises people.' },
    { q: 'Before placing a calendar you must check:',
      o: ['Open interest only', 'That no event lands inside the near expiry', 'The 200 EMA'],
      a: 1, why: 'Results and policy decisions break the term-structure assumption the trade rests on.' },
    { q: 'The honest cost of a covered call programme is:',
      o: ['Brokerage', 'You cap upside on winners while keeping full downside on losers', 'Assignment risk'],
      a: 1, why: 'A slow way to convert a good investment into a mediocre one unless IV genuinely compensates.' },
    { q: 'The test for whether a cash-secured put is appropriate:',
      o: ['Is the premium attractive?', 'If assigned tomorrow, would I be pleased or dismayed?', 'Is IV above 20?'],
      a: 1, why: 'Dismayed means it is a naked short with a comforting story attached.' },
    { q: 'Sizing a condor with ₹100 maximum loss, lot 75, on a ₹6,00,000 account at 0.5% risk:',
      o: ['Take one lot', 'You cannot take even one lot — the trade is too large for the account', 'Take two lots'],
      a: 1, why: '₹7,500 risk against a ₹3,000 allowance. The account is telling you something.' },
    { q: 'Your risk on a multi-leg structure is:',
      o: ['The margin blocked', 'The credit received', 'The maximum loss of the structure'],
      a: 2, why: 'Margin is a separate constraint, and it can change intraday.' },
    { q: 'Condors win about 80% of the time. The specific danger this creates is:',
      o: ['Boredom', 'They feel safe, so people size them large — nine wins of ₹100 and one loss of ₹900 is break-even', 'Nothing'],
      a: 1, why: 'It feels like a winning strategy for months before the tenth trade arrives.' }
  ]
};

const options_four = {
  id: 'options4', phase: 4, title: 'Adjustment, undefined risk, expiry day, and scalping',
  mins: 25,
  unlocks: ['ratio spread', 'broken-wing butterfly', 'jade lizard',
    'short strangle', 'short straddle'],
  sections: [
    { h: 'Adjustment versus exit — the one test',
      p: [
        'A position goes against you. You can close it, or you can adjust it: roll a strike, add a leg, convert it into something else.',
        'Most adjustments are hope wearing the clothes of strategy. The tell is mechanical, not emotional: the adjustment increases your risk or extends your time in the trade, and it is chosen because closing would realise a loss.',
        'The test, applied before any adjustment: if I had no position right now, would I open this adjusted structure at these prices? If the answer is no, close instead. That single question cuts through almost every rationalisation available.',
        'A legitimate adjustment reduces risk or takes profit off the table. Closing an untested side that has collapsed to near zero is legitimate. Rolling a profitable short leg further out is legitimate. Adding a losing leg to give a position room is not an adjustment; it is a second bad trade attached to the first.',
        'The arithmetic case for exiting: an adjusted position almost always has worse risk-reward than a fresh position expressing the same view, because you are constrained by strikes and expiries chosen for a situation that no longer exists.',
        'And the compounding case. Adjustment errors on a defined-risk position cost you the defined amount. Adjustment errors on an undefined-risk position have no such limit, which is the entire reason the next section exists as a separate phase with its own capital requirement.'
      ] },

    { h: 'Ratios, broken wings, jade lizards',
      p: [
        'These sell more contracts than they buy, or deliberately leave one side unprotected, to improve the credit or remove risk on one side.',
        'A broken-wing butterfly widens one wing so the structure carries no risk on that side, financed by more risk on the other. Used correctly it turns a butterfly into a position that cannot lose if price moves the way you least expect.',
        'A jade lizard combines a short call spread with a short put so that the total credit exceeds the call spread width. Done properly there is no upside risk at all: the credit covers the maximum call-side loss. The downside is naked and that is where the entire risk lives.',
        'A ratio spread buys one option and sells two further out. The credit is good and the position profits across a wide range — until price runs past the short strikes, at which point the unhedged extra short behaves like a naked option.',
        'The rule for this stage, without exception: before entering, state your maximum loss in rupees and state which side it comes from. If you cannot do both instantly, you do not understand the position well enough to hold it. Misconstructing an unbalanced position produces a risk you have misunderstood, which is a worse category of error than being wrong about direction.',
        'And from the costs unit: four legs pay four sets of charges on entry and potentially four on exit. The theoretical improvement must exceed a very real additional cost, and on Indian retail brokerage it frequently does not.'
      ] },

    { h: 'Undefined risk — short strangles and straddles',
      p: [
        'A short strangle sells an out-of-the-money call and an out-of-the-money put with no protection. A short straddle does the same at the same strike. Both collect substantial premium. Both have theoretically unlimited loss on the call side.',
        'They win often. That is precisely what makes them dangerous: a strategy that wins 88% of the time and occasionally loses fifteen times the average win is not a good strategy, it is a good-feeling one, and the arithmetic only reveals itself on the day it does not work.',
        'The failure is not gradual. Undefined-risk positions are destroyed by gaps, not by drifts. An overnight global event, a policy surprise, a geopolitical shock — the position is at a catastrophic loss before any management is possible. "I will adjust if it moves against me" assumes a continuous market, and markets are not continuous.',
        'This is why Phase 4A requires ₹10,00,000 minimum, its own 60-trade probation, and a written adjustment protocol before the first trade. The capital requirement is not about affording the margin. It is about being able to survive the tail, because over enough trades the tail arrives.',
        'If you take one thing from this section: the correct question is never "how often does this win" but "what happens on the worst day, and can I still trade afterwards".'
      ] },

    { h: 'Expiry day and 0-DTE',
      p: [
        'On expiry day, gamma is enormous. An option\'s delta can travel from 0.2 to 0.8 within a few index points, meaning the position\'s character changes faster than you can react.',
        'Pin risk: price finishing exactly at or very near a short strike leaves assignment genuinely uncertain, and you can end up with an unhedged position you did not choose.',
        'The 14:30 to 15:15 window is where expiry-day accounts are damaged. Time value collapses toward zero, spreads widen, and small index moves produce enormous percentage swings in option prices. It feels like opportunity and it behaves like a coin flip with fees.',
        'The rule this system enforces: defined risk only until 200 logged expiry-day trades. Not because expiry trading cannot work, but because it is the environment where a small mistake produces the largest possible consequence, and you should meet it with a capped downside.',
        'Weekly expiries in India concentrate this effect every week rather than monthly, which means far more opportunities to make the same mistake.'
      ] },

    { h: 'Scalping and the cost wall',
      p: [
        'Scalping comes last in this system, and the reason is arithmetic rather than snobbery.',
        'Costs scale with the number of trades, not with the size of your edge. Twenty round trips a day is roughly 5,000 a year. At ₹100 per round trip that is ₹5,00,000 annually before you are right about anything.',
        'So a scalper working with a 0.15% gross edge against a 0.12% round-trip cost is running a business on a 0.03% margin. Any deterioration in fills, any widening of spreads, any missed exit, and the margin is gone. There is no cushion.',
        'The app runs the Cost Wall before scalping unlocks: a simulation using your broker\'s actual charges, showing what your own record looks like gross versus net. The point is to make the number concrete before it costs money rather than after.',
        'The second reason it comes last: scalping punishes hesitation and rewards mechanical execution — exactly the qualities the earlier phases build. Attempting it first means learning the hardest style with the weakest habits, which is why so many people start there and stop trading within a year.'
      ] },

    { h: 'What Phase 4 asks of you',
      p: [
        '4A, undefined risk: ₹10,00,000 minimum, a written adjustment protocol before the first trade, its own 60-trade probation, and a module on when to adjust versus when to simply exit.',
        '4B, expiry day: defined risk only until 200 logged expiry-day trades exist.',
        '4C, scalping: the Cost Wall computed from your real charges, acknowledged, before it unlocks at all.',
        'Each is a separate trial after Phase 3 passes. None of them is a promotion. They are three different ways to take on more risk, and the honest position is that most people should stop after Phase 2 or Phase 3 and get very good at one thing instead.',
        'If your equity swing numbers are strong and options never produce an edge for you, trading equity and dropping options is the correct answer, not a failure. The Edge Finder will say so plainly, and it has no ego invested in the outcome.'
      ] }
  ],
  qs: [
    { q: 'The test before any adjustment to a losing position:',
      o: ['Is the loss within my daily cap?', 'If I had no position now, would I open this adjusted structure at these prices?', 'Has IV changed?'],
      a: 1, why: 'If the answer is no, close instead. It cuts through almost every rationalisation.' },
    { q: 'Adding a losing leg to give a position room is:',
      o: ['A legitimate adjustment', 'A second bad trade attached to the first', 'Standard for condors'],
      a: 1, why: 'Legitimate adjustments reduce risk or take profit off. This does neither.' },
    { q: 'Before entering a ratio or broken-wing structure you must state:',
      o: ['The break-evens only', 'Maximum loss in rupees and which side it comes from, instantly', 'The Greeks to two decimals'],
      a: 1, why: 'Misconstructing an unbalanced position produces a risk you have misunderstood.' },
    { q: 'A jade lizard, correctly constructed, has:',
      o: ['No downside risk', 'No upside risk, with all the risk on the naked put side', 'No risk at all'],
      a: 1, why: 'The credit covers the maximum call-side loss. The downside is naked.' },
    { q: 'Undefined-risk positions are typically destroyed by:',
      o: ['Slow drifts against you', 'Gaps, which allow no management', 'Theta'],
      a: 1, why: '"I will adjust if it moves against me" assumes a continuous market.' },
    { q: 'A strategy wins 88% of the time and occasionally loses fifteen times the average win. It is:',
      o: ['Excellent', 'A good-feeling strategy whose arithmetic only reveals itself on the bad day', 'Impossible'],
      a: 1, why: 'The right question is never how often it wins but what happens on the worst day.' },
    { q: 'Why does Phase 4A require ₹10,00,000?',
      o: ['To afford the margin', 'To survive the tail, because over enough trades it arrives', 'Regulatory requirement'],
      a: 1, why: 'Margin is a separate constraint. Survival is the point.' },
    { q: 'The 14:30–15:15 window on expiry day:',
      o: ['Offers the best risk-reward of the week', 'Behaves like a coin flip with fees, because time value collapses and spreads widen', 'Is quiet'],
      a: 1, why: 'It feels like opportunity. Gamma makes it something else.' },
    { q: 'Expiry-day trading in this system is restricted to defined risk until:',
      o: ['Phase 4 begins', '200 logged expiry-day trades', 'You reach ₹10,00,000'],
      a: 1, why: 'The environment where a small mistake produces the largest consequence should be met with a capped downside.' },
    { q: 'Scalping 20 times a day at ₹100 per round trip costs roughly:',
      o: ['₹50,000 a year', '₹5,00,000 a year', '₹1,00,000 a year'],
      a: 1, why: 'About 5,000 round trips annually. Costs scale with frequency, not with edge.' },
    { q: 'The second reason scalping comes last:',
      o: ['It is less profitable', 'It punishes hesitation and rewards mechanical execution — the qualities earlier phases build', 'Brokers discourage it'],
      a: 1, why: 'Starting there means learning the hardest style with the weakest habits.' },
    { q: 'Your equity numbers are strong and options never produce an edge. The correct answer is:',
      o: ['Keep retrying options until it works', 'Trade equity and drop options', 'Move to Phase 4 anyway'],
      a: 1, why: 'A legitimate outcome, not a failure. The Edge Finder has no ego invested in it.' }
  ]
};

export const OPTIONS_UNITS = [options_one, options_two, options_three, options_four];
