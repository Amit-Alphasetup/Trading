// content-equity.js — OWNS: the equity and intraday curriculum.
// Pure data: each unit is sections + a question bank. No logic, no imports.

const risk = {
  id: 'risk', phase: 1, title: 'Risk first, everything else second',
  mins: 18, unlocks: [],
  sections: [
    { h: 'The only job',
      p: [
        'Your job is not to predict what the market will do. Nobody can do that reliably, and the people who sell you the idea that they can are selling the idea, not the skill.',
        'Your job is to survive long enough for a small statistical edge to express itself. Everything in this unit follows from that single sentence. If a technique helps you survive, it stays. If it does not, it goes, no matter how clever it sounds.',
        'Why survival is the goal: an edge is a small number. If your system wins 45% of the time with winners twice the size of losers, you make money — but only across hundreds of trades. Across ten trades, that same system loses money about a third of the time purely by chance. If ten bad trades can end you, your edge never gets the chance to appear.'
      ] },
    { h: 'The three numbers you must know before every trade',
      p: [
        'Entry: the price at which your idea becomes valid.',
        'Stop: the price at which your idea is proven wrong. Not "where I would feel bad", not "10% below" — the price at which the reason you entered no longer exists.',
        'Rupee risk: exactly how much money you lose if the stop hits. This is the number almost nobody calculates, and it is the only one that determines whether you survive.',
        'If you cannot state all three before entering, you are not trading. You are taking a position and hoping. The pre-trade card in this app refuses to save without all three for exactly this reason.'
      ] },
    { h: 'Position sizing is arithmetic, not judgement',
      p: [
        'The formula: Quantity = (Capital × Risk%) ÷ (Entry − Stop).',
        'Worked example. Capital ₹2,00,000. You risk 0.5% per trade, so ₹1,000. Entry ₹500, stop ₹480, so the stop distance is ₹20. Quantity = 1,000 ÷ 20 = 50 shares. Your position is worth ₹25,000, but your risk is ₹1,000.',
        'Second example, same account, tighter stop. Entry ₹500, stop ₹495, distance ₹5. Quantity = 1,000 ÷ 5 = 200 shares. Position value ₹1,00,000 — half your account — but your risk is still ₹1,000.',
        'Notice what happened: the position size changed by 4× while the risk stayed identical. This is the entire point. Beginners fix the quantity ("I always buy 100 shares") and let risk float wildly. Professionals fix the risk and let quantity float.',
        'Notice also what never entered the calculation: how confident you felt, how good the chart looked, how much you needed the money. None of it belongs. The moment feeling enters sizing, you will be largest exactly when you are most wrong.'
      ] },
    { h: 'Why losses hurt more than gains help',
      p: [
        'Lose 10%, you need 11.1% to recover. Lose 20%, you need 25%. Lose 33%, you need 50%. Lose 50%, you need 100%. Lose 75%, you need 300%.',
        'The curve is not linear — it turns vertical. This is why the difference between risking 1% and risking 5% per trade is not "five times more risk". It is the difference between a survivable bad run and a terminal one.',
        'Ten losses in a row at 1% leaves you with 90% of your capital: annoying, recoverable. Ten losses in a row at 5% leaves you with 60%: you now need a 67% gain to get level, and psychologically you are unlikely to trade well while trying.',
        'Ten losses in a row is not a freak event. In a system that wins 45% of the time, a 10-loss streak appears roughly once in every 500 trades. If you trade for years, you will meet it. The only question is what size you are wearing when it arrives.'
      ] },
    { h: 'Risk of ruin, in plain terms',
      p: [
        'Risk of ruin is the probability that a losing streak ends your account before your edge shows up. It depends on three things: your win rate, your win-to-loss ratio, and your risk per trade.',
        'The rough shape: at 1% risk per trade with any genuine edge, ruin is close to impossible. At 2%, it is small. At 5%, it becomes a real number even with a good system. At 10%, a modest system is more likely than not to blow up eventually.',
        'This is why the risk table in this app falls as capital rises, and why trial risk is fixed at 0.5%. Not because 0.5% is magic, but because during a trial you are simultaneously least skilled and most likely to make execution errors. Small size buys you the right to be wrong while learning.',
        'The Monte Carlo tool in the Edge tab computes your personal ruin probability from your own results — but only after 100 closed trades, because before that the input is noise.'
      ] },
    { h: 'The stop is a promise made by the calm version of you',
      p: [
        'You place a stop before you have money on the line. At that moment you are rational: you can see the level, you can see what invalidates the idea.',
        'Twenty minutes later, price is approaching the stop and you are not the same person. Now you have a loss on screen, a story about why the level "does not really matter", and a strong physical urge to make the discomfort stop.',
        'Moving the stop at that moment is not analysis. It is the frightened version of you overruling the calm one. It usually works — the first three or four times. That is what makes it dangerous: the habit gets reinforced right up until the trade that does not come back.',
        'A widened stop also silently destroys your position sizing. You sized for a ₹20 risk. If you widen to ₹40, you have doubled your risk after the fact without deciding to.',
        'This is why the adherence checklist has a separate line for "stop was never widened". It is the single most common and most expensive rule break in retail trading.'
      ] },
    { h: 'R — the unit that makes everything comparable',
      p: [
        'R is your risk on a trade, expressed as 1. If you risked ₹1,000 and made ₹2,000, that is +2R. Lost ₹1,000, that is −1R. Made ₹500, that is +0.5R.',
        'Why this matters: R makes trades comparable across different account sizes, different stocks, and different times. "I made ₹4,000" tells you nothing. "I made 2R" tells you everything.',
        'Expectancy is your average R across many trades. Positive expectancy means the system makes money over time. This is the only number that matters, and it is the number this app computes for you — but refuses to show until you have 30 trades in a category, because an average of six numbers is not an average, it is an anecdote.',
        'A system with 40% wins at +3R and 60% losses at −1R has expectancy of (0.4 × 3) + (0.6 × −1) = +0.6R. You lose more often than you win and make money comfortably. This is why win rate alone is a useless statistic.'
      ] },
    { h: 'Daily and streak limits',
      p: [
        'Per-trade risk is not enough on its own. Three consecutive losses at 2% is 6% of your account in one afternoon, and by the third one you are not making good decisions.',
        'So there is a second layer: a daily loss cap. Hit it and the account locks for the day, regardless of what setups appear. The setups will still be there tomorrow. Your judgement, after three losses, will not be.',
        'A third layer: after a losing streak, size does not increase to "win it back". That instinct — increasing size after losses to recover faster — is called martingale, and it is mathematically guaranteed to eventually meet a streak long enough to end the account.',
        'The opposite instinct is also wrong. Cutting size after three normal losses means you are small when your edge finally shows up. If the losses were correctly executed, nothing is broken and nothing should change.'
      ] },
    { h: 'What this looks like in practice',
      p: [
        'Before the market opens you know your capital and your risk percentage. That gives you your rupee risk for the day, fixed.',
        'A setup appears. You identify entry and the price that invalidates it. You divide. You get a quantity. You do not adjust that quantity because the setup "looks especially good".',
        'You place the order and the stop together. Not the order now and the stop "once it settles" — together, or you are unprotected in exactly the window where gaps happen.',
        'You do not watch it tick by tick. Nothing you learn from watching improves the outcome, and everything you feel while watching degrades the next decision.'
      ] }
  ],
  qs: [
    { q: 'Capital ₹2,00,000, risking 0.5%, entry ₹500, stop ₹480. Quantity?',
      o: ['50', '20', '200', '400'], a: 0,
      why: '0.5% of 2,00,000 = ₹1,000 risk. Stop distance ₹20. 1,000 ÷ 20 = 50 shares.' },
    { q: 'Same account and risk, but the stop is at ₹495. Quantity?',
      o: ['50', '100', '200', '400'], a: 2,
      why: 'Distance is now ₹5. 1,000 ÷ 5 = 200 shares. Quantity quadrupled; risk is unchanged at ₹1,000.' },
    { q: 'You lose 50% of your account. What return returns you to even?',
      o: ['50%', '75%', '100%', '150%'], a: 2,
      why: '₹100 falls to ₹50. Gaining ₹50 on a ₹50 base is a 100% return. The recovery curve turns vertical.' },
    { q: 'A system wins 40% of the time, winners +3R, losers −1R. Expectancy?',
      o: ['−0.2R', '+0.6R', '+1.2R', 'Cannot be calculated'], a: 1,
      why: '(0.4 × 3) + (0.6 × −1) = 1.2 − 0.6 = +0.6R. Losing more often than you win is perfectly profitable.' },
    { q: 'Price approaches your stop. You are now convinced the level is not important. You:',
      o: ['Widen the stop — new information', 'Let the stop execute', 'Close half and widen the rest'],
      a: 1, why: 'No new information arrived; only discomfort did. Widening also silently doubles the risk you sized for.' },
    { q: 'You feel unusually certain about a setup. What changes about position size?',
      o: ['Increase it', 'Nothing', 'Decrease it', 'Increase it but tighten the stop'],
      a: 1, why: 'Confidence is not information. Your own Edge Finder will most likely show your highest-confidence trades underperform.' },
    { q: 'After three losses in a row, all correctly executed, you should:',
      o: ['Increase size to recover', 'Cut size until confidence returns', 'Change nothing', 'Stop trading permanently'],
      a: 2, why: 'Correctly executed losses are variance, not evidence. Increasing size is martingale; cutting size leaves you small when the edge arrives.' },
    { q: 'Why is risk of ruin at 5% per trade so much worse than at 1%?',
      o: ['It is five times worse', 'Losing streaks compound against a shrinking base, so the damage grows faster than linearly', 'It is not meaningfully different'],
      a: 1, why: 'Each loss shrinks the base the next loss is taken from, and the recovery requirement rises non-linearly.' },
    { q: 'You risked ₹800 and made ₹2,400. In R terms:',
      o: ['+1R', '+2R', '+3R', '+2,400R'], a: 2,
      why: '2,400 ÷ 800 = 3. R makes results comparable across account sizes and instruments.' },
    { q: 'When should the stop order be placed?',
      o: ['At the same time as the entry', 'Once the position settles', 'Only if the trade moves against you'],
      a: 0, why: 'The unprotected window is exactly where gaps and fast moves do their damage.' }
  ]
};

const structure = {
  id: 'structure', phase: 1, title: 'Market structure — reading what price is doing',
  mins: 20, unlocks: ['consolidation breakout', 'pullback to 20/50 EMA'],
  sections: [
    { h: 'Three states, and only three',
      p: [
        'Remove every indicator from a chart and price is doing one of three things. Higher highs and higher lows: uptrend. Lower highs and lower lows: downtrend. Neither: a range.',
        'That is the whole framework, and it is enough. Most losing trades are not caused by a bad entry technique. They are caused by applying a range technique in a trend, or a trend technique in a range.',
        'Buying a pullback works beautifully in an uptrend and bleeds you dry in a downtrend, where every pullback is just a pause before the next leg down. Fading extremes works in a range and gets you run over in a trend. The technique was never the problem.',
        'So the first question on every chart is not "what is the setup" but "what state is this in". If you cannot answer that in five seconds, there is no trade.'
      ] },
    { h: 'Swing points: the vocabulary',
      p: [
        'A swing high is a candle whose high is higher than the candles immediately either side of it. A swing low is the mirror. These are the only structural facts on a chart; everything else is interpretation.',
        'An uptrend is a sequence of swing highs each higher than the last, and swing lows each higher than the last. The moment a swing low forms below the previous swing low, the uptrend has structurally ended — not "might be weakening", has ended.',
        'This gives you an objective definition rather than a feeling. "It looks weak" is not tradeable. "It printed a lower low at ₹482" is.',
        'It also gives you a stop. In an uptrend, below the most recent higher low is where the idea is wrong. That is not an arbitrary percentage; it is the price at which the reason for the trade ceases to exist.'
      ] },
    { h: 'Pullback versus reversal — the distinction that costs the most money',
      p: [
        'Price is in an uptrend and falls 6%. Is this an opportunity or an exit?',
        'The answer is mechanical, not emotional. If the fall holds above the previous swing low, it is a pullback and the trend is intact. If it breaks below, structure has changed and any long thesis based on the trend is void.',
        'Most retail damage comes from getting this backwards: treating a genuine structural break as "just a pullback" and holding, then treating an ordinary pullback as a reversal and selling the low.',
        'A useful discipline: write the invalidation price on the pre-trade card before entering. Then the question during the trade is not "how do I feel" but "has price traded below ₹482 or not". The app requires this field for exactly this reason.'
      ] },
    { h: 'Support and resistance are zones, not lines',
      p: [
        'A level is not a price. It is a small area where enough participants previously changed their minds to leave a mark on the chart.',
        'Significance comes from three things. How many times price reacted there — three touches means far more than one. How much volume traded there — a high-volume shelf means many people have positions with memories at that price. And how recent it is — a level from three weeks ago matters more than one from three years ago.',
        'Old resistance tends to become support after a decisive break, and vice versa. The mechanism is not mystical: people who sold at that level and watched it break now regret it, and buy when price returns. People who bought the breakout defend their entry.',
        'Levels are approximate. Expecting a reversal to the paisa is how you end up with stops that get clipped by noise. Give the zone room, and size smaller to compensate for the wider stop — the arithmetic from Unit 1 handles this automatically.'
      ] },
    { h: 'Moving averages: shorthand, not magic',
      p: [
        'A 20-period EMA is roughly "where price has been over the last month" on a daily chart. A 50-period EMA is roughly the last quarter. That is all they are.',
        'They matter because a large number of participants watch the same two numbers, which makes them partially self-fulfilling. That is a real reason, not a mystical one — the same reason VWAP works intraday.',
        'In a healthy uptrend, price pulls back toward the 20 EMA and resumes. In a slower trend, toward the 50. When price starts closing decisively below both and the 20 crosses under the 50, the trend character has changed.',
        'What moving averages cannot do: predict. A cross is not a signal by itself. Countless systems built purely on crossovers have been tested and found to have negative expectancy after costs. Use them as context, never as a trigger on their own.'
      ] },
    { h: 'Setup 1 — consolidation breakout',
      p: [
        'What it is: after an advance, price stops going up and trades sideways in a tightening range for several days or weeks. Then it breaks the top of that range.',
        'Why it works: a consolidation is a transfer of ownership. Impatient holders sell to patient buyers. When the sellers are exhausted, very little buying is needed to move price — so it moves fast.',
        'What qualifies: the range should be genuinely tight (the tighter the better), volume should decline through the consolidation, and the breakout candle should have clearly above-average volume. All three, not two.',
        'Entry: on the break of the range high, or on the first pullback that holds above it. Stop: below the consolidation low, or below the midpoint for a tighter version. Target: measured move — the height of the prior advance projected from the breakout, or a structural level above.',
        'How it fails: a breakout on weak volume that immediately falls back inside the range. This is so common it has a name — the false breakout — and it is why the volume condition is not optional. If you take breakouts without volume confirmation you will collect these all day.',
        'Second failure mode: taking the breakout in a stock with no prior advance. A consolidation only means something after a move. Sideways after sideways is just sideways.'
      ] },
    { h: 'Setup 2 — pullback to the 20/50 EMA',
      p: [
        'What it is: an established uptrend pulls back to a rising 20 or 50 EMA and resumes.',
        'Why it works: it is the lowest-risk entry into an existing trend. You are buying near the point where the trend is either confirmed or clearly broken, which means your stop is close and your position size can be larger for the same rupee risk.',
        'What qualifies: the trend must already exist — higher highs and higher lows on the chart before the pullback. The moving average should be rising, not flat. The pullback should be orderly: a few modest red candles, not a violent collapse. Volume should be lighter on the pullback than it was on the advance.',
        'Entry: on the first sign of resumption at the average — a strong close back up, or a break of the prior day\'s high. Do not buy simply because price touched the line; touching proves nothing.',
        'Stop: below the swing low of the pullback. Target: the prior high first, then trail.',
        'How it fails: heavy volume on the pullback means real selling, not a pause. And a pullback that slices through both averages without hesitating is not a pullback; it is the start of something else, and the trend definition from earlier in this unit tells you so.'
      ] },
    { h: 'Timeframes',
      p: [
        'A daily chart shows you the trend you are trading. A weekly chart shows you whether that trend is swimming with or against a larger tide. A 15-minute chart shows you the entry.',
        'Use them in that order — larger first. Deciding direction from a 5-minute chart and then looking for confirmation on the daily is backwards, and it is how people end up shorting inside a powerful uptrend.',
        'For swing trading, the daily chart is the decision timeframe and you need nothing faster. Adding faster timeframes mostly adds noise and reasons to interfere with a working position.'
      ] },
    { h: 'What to do with this before you trade it',
      p: [
        'Open a chart. Mark the swing highs and lows for the last six months. Label each phase as uptrend, downtrend, or range. Do this on twenty charts and the states start to be obvious rather than debatable.',
        'Then find historical examples of the two setups above and record entry, stop, and outcome in the Backtest tab. Thirty examples unlocks paper trading in that pattern. Sixty with positive expectancy unlocks live.',
        'That is not busywork. It is the difference between believing consolidation breakouts work because you read it here, and knowing what your own version of that setup actually returns.'
      ] }
  ],
  qs: [
    { q: 'Price makes a higher high, falls back, but holds above the previous swing low. This is:',
      o: ['A trend reversal', 'A pullback within an uptrend', 'A range', 'Undefined'], a: 1,
      why: 'Structure is intact until a lower low prints. Until then a fall is a pause.' },
    { q: 'The objective moment an uptrend has ended is when:',
      o: ['Price falls 10%', 'A swing low forms below the previous swing low', 'The 20 EMA flattens', 'It feels weak'],
      a: 1, why: 'You need a definition you can write on a card before entering, not one you apply afterwards.' },
    { q: 'A consolidation breaks out on volume well below average. You:',
      o: ['Take it — the level broke', 'Skip it', 'Take half size', 'Wait for a retest and take it regardless'],
      a: 1, why: 'Your setup required volume. Half size is still a rule break, just a cheaper one.' },
    { q: 'Why does a tight consolidation resolve so quickly when it does move?',
      o: ['Algorithms detect the pattern', 'Impatient sellers are exhausted, so little buying is needed to move price', 'Volatility must revert'],
      a: 1, why: 'A mechanical reason — supply has been absorbed — beats a narrative one.' },
    { q: 'A stock consolidates tightly but had no prior advance. The breakout setup:',
      o: ['Is equally valid', 'Does not qualify — consolidation only means something after a move', 'Is stronger because it is unnoticed'],
      a: 1, why: 'Sideways after sideways is just sideways. The pattern needs a prior trend to be a continuation of.' },
    { q: 'During a pullback to the 20 EMA, volume is heavier than during the prior advance. This suggests:',
      o: ['Strong hands accumulating', 'Real selling, not a pause — the setup is compromised', 'Nothing, volume is noise on pullbacks'],
      a: 1, why: 'Light volume on the pullback is what makes it a pause. Heavy volume means genuine distribution.' },
    { q: 'Price touches the rising 50 EMA. The correct action is:',
      o: ['Buy — the level held', 'Wait for evidence of resumption', 'Sell — support will break'],
      a: 1, why: 'Touching proves nothing. You need a strong close or a break of the prior day\'s high before the idea is active.' },
    { q: 'The correct order for reading timeframes is:',
      o: ['Fastest first, then confirm on the daily', 'Largest first, then down to the entry timeframe', 'Only ever one timeframe'],
      a: 1, why: 'Deciding direction on a 5-minute chart and then justifying it on the daily is how people short strong uptrends.' },
    { q: 'A level touched once versus a level touched four times:',
      o: ['Equally significant', 'The single touch is more significant — less exhausted', 'The four-touch level is more significant'],
      a: 2, why: 'Repeated reaction is evidence that many participants recognise the price. One touch could be noise.' },
    { q: 'In an uptrend, the structurally correct stop for a pullback entry is:',
      o: ['A fixed 5% below entry', 'Below the swing low of the pullback', 'At the 200 EMA', 'Wherever risk equals 1% of capital'],
      a: 1, why: 'The stop belongs where the idea is wrong. Position size then adjusts to make that distance cost the right rupees — never the reverse.' },
    { q: 'Most losing trades are caused by:',
      o: ['Poor entry timing', 'Applying a range technique in a trend, or a trend technique in a range', 'Not enough indicators'],
      a: 1, why: 'The technique is rarely the problem. Context is.' }
  ]
};

const volume = {
  id: 'volume', phase: 1, title: 'Volume and relative strength — the honest confirmations',
  mins: 18, unlocks: ['52-week-high breakout', 'VCP'],
  sections: [
    { h: 'What volume actually is',
      p: [
        'Volume is the number of shares that changed hands in a period. Nothing more mystical than that.',
        'But it answers a question price cannot: how many people were involved. A 3% move on 10 times normal volume and a 3% move on a quarter of normal volume look identical on a price chart and mean completely different things.',
        'The first says a large number of participants revalued the stock at once. The second says almost nobody was there and a few orders pushed price around in a thin book.',
        'Which is why volume is the closest thing to free confirmation available to a retail trader. It cannot be optimised, curve-fitted, or bought. It simply records what happened.'
      ] },
    { h: 'Relative volume, not absolute',
      p: [
        'Raw volume numbers are useless across stocks — a large bank trades millions of shares daily, a small-cap trades thousands. Comparing them tells you nothing.',
        'What matters is volume relative to that stock\'s own recent average. The usual reference is the 50-day average volume. Today at 3× its own average is significant whether the stock trades 5,000 shares or 5 crore.',
        'A practical threshold for breakouts: at least 1.5× the 50-day average, and ideally 2× or more. Below 1.0× on a breakout day is a warning, not a confirmation.',
        'Also watch when in the day the volume arrived. A stock that does 2× average volume because of a single block trade at 09:20 is different from one that traded heavily all session. The first is one participant; the second is a crowd.'
      ] },
    { h: 'The four combinations',
      p: [
        'Price up on high volume: genuine demand. Buyers were willing to pay more and many of them acted. This is what you want to see on a breakout.',
        'Price up on low volume: suspicious. The move happened because nobody was selling, not because many were buying. These moves tend to give back.',
        'Price down on high volume: genuine supply. Real selling, not a pause. If this happens during what you thought was a pullback, your setup has changed character.',
        'Price down on low volume: usually healthy in an uptrend. Holders are not rushing for the exit; price is drifting because buyers stepped aside temporarily. This is the volume signature of a good pullback.',
        'Learn these four and most of what people call "reading the tape" on a daily chart is already covered.'
      ] },
    { h: 'Volume dry-up: why quiet is bullish',
      p: [
        'Beginners see falling volume during a sideways period as loss of interest. Usually it is the opposite.',
        'A consolidation is a transfer: people who bought earlier and want out are selling to people willing to hold. While that transfer is happening, volume stays elevated. When volume dries up, it means the sellers are largely done — there is nobody left in a hurry to get out.',
        'Now very little buying pressure is needed to move price, because the supply that was capping it has gone. That is why quiet consolidations resolve violently.',
        'The practical signal: volume falling steadily through a tightening range, then a sharp expansion on the day price breaks out. Contraction, then expansion. If the expansion never comes, the breakout is not real.'
      ] },
    { h: 'Setup — Volatility Contraction Pattern (VCP)',
      p: [
        'VCP is a sequence of pullbacks, each shallower than the last, with volume declining throughout.',
        'A typical shape: an advance, then a 20% pullback, then recovery, then a 12% pullback, then a 6% pullback, then a 3% one — each contraction tighter, volume drying up at each stage. Then it breaks out.',
        'Why the shape means something: each contraction represents a wave of holders giving up. By the final tight one, the people left are the ones who will not sell at these prices. Supply is exhausted; the float is tightly held.',
        'What qualifies: at least two, ideally three or more contractions, each meaningfully tighter than the previous. Volume declining across the sequence. The final contraction should be genuinely tight — often under 5%. Price should be near its highs, not recovering from a collapse.',
        'Entry: on the break of the final contraction\'s high, on expanding volume. Stop: below the low of that final contraction — which is why tightness matters so much. A 3% final contraction gives you a 3% stop, and Unit 1\'s arithmetic then gives you a large position for the same rupee risk.',
        'How it fails: contractions that get wider instead of tighter, volume that stays elevated (sellers are not finished), or a breakout on flat volume. Also, VCP in a broadly falling market fails far more often — the pattern needs a market willing to bid.'
      ] },
    { h: 'Setup — 52-week-high breakout',
      p: [
        'A stock trading at its highest price in a year, breaking above that level.',
        'This feels wrong to most beginners, who are trained to buy low. That instinct is exactly why the setup persists: most people will not buy something that has already risen, so the supply of sellers at new highs is thin.',
        'The structural reason it works: at a 52-week high, nobody who owns the stock is losing money. There is no overhang of trapped holders waiting to sell at breakeven. Every previous resistance level has already been cleared.',
        'What qualifies: the high should be meaningful — a stock making new highs after a long base is far better than one grinding to marginal new highs daily. Volume on the breakout must expand. And the broader market should not be in freefall.',
        'Entry: on the break, or on the first pullback that holds above the old high. Stop: below the base, or below the breakout day\'s low for a tighter version. Target: measured move from the base height, then trail — these are the setups that occasionally run far, and cutting them at 1R defeats the purpose.',
        'How it fails: the marginal new high that immediately reverses, usually on unremarkable volume. And gaps to new highs on news, which frequently fill. If the reason for the high is a one-off event rather than sustained demand, the setup is not what it appears.'
      ] },
    { h: 'Relative strength: who is holding up?',
      p: [
        'Relative strength compares a stock to the index over the same window. The index fell 2%; this stock fell 0.3%. Somebody was buying while everyone else sold.',
        'That is information you cannot get from the stock\'s own chart in isolation. It tells you where demand is concentrated before the demand becomes obvious in price.',
        'The most useful application: mark the stocks that resisted a market decline. When the market turns, these are disproportionately the ones that lead. The stocks that fell hardest tend to keep lagging.',
        'A simple way to measure without any tool: over the last month, index return versus stock return. Positive difference means outperformance. Do this across a watchlist and the leaders separate quickly.',
        'Relative weakness is equally useful in reverse — a stock that falls on days the index rises is telling you something before the chart pattern does.'
      ] },
    { h: 'Market context sits above every setup',
      p: [
        'The best breakout in a market where the index is below its 50-day average will fail more often than a mediocre one in a healthy market. Individual stocks do not float free of the market.',
        'This is why Phase 2 includes a market filter overlay: Nifty above or below its 50 EMA sets whether long or short setups are permitted at all, and India VIX adjusts position size.',
        'The practical version: before taking any long setup, look at the index. Above a rising 50 EMA, take your setups normally. Below it, either stand aside or take half the number of trades. Not half size — half the number, which keeps your risk per trade honest while reducing exposure.',
        'Breadth adds a layer: if the index is rising but very few stocks are participating, the advance is narrow and fragile. Advances with broad participation are more durable.'
      ] },
    { h: 'What volume cannot do',
      p: [
        'Volume does not predict. A high-volume day tells you something significant happened; it does not tell you what happens next.',
        'Volume is also unreliable on illiquid stocks, where a single order distorts the picture, and around index rebalancing or expiry, where mechanical flows create volume unrelated to anyone\'s opinion.',
        'And it is worth stating plainly: every claim in this unit is a tendency, not a law. Which is exactly why the app makes you mark 30 examples before you may paper trade a pattern and 60 before live. Your own data on your own stocks beats every generalisation here, including mine.'
      ] }
  ],
  qs: [
    { q: 'A stock breaks a 3-month high on volume at 0.7× its 50-day average. You:',
      o: ['Take it — the level broke', 'Skip it', 'Take half size', 'Take it with a wider stop'],
      a: 1, why: 'Your setup required volume expansion. Without it, the move happened because nobody was selling, not because many were buying.' },
    { q: 'Volume dries up during a tight consolidation. This is:',
      o: ['Bearish — interest has gone', 'Constructive — sellers are largely finished', 'Meaningless in a range'],
      a: 1, why: 'Falling volume in a contraction usually means supply is exhausted. It is the setup, not the warning.' },
    { q: 'Price falls on volume well above average during what you thought was a pullback. This means:',
      o: ['Strong hands accumulating', 'Real selling — the setup has changed character', 'Nothing, pullback volume is noise'],
      a: 1, why: 'Light volume is what makes a decline a pause. Heavy volume means genuine distribution.' },
    { q: 'Why does a 52-week-high breakout work despite feeling wrong?',
      o: ['Momentum is a physical force', 'Nobody holding the stock is losing, so there is no overhang of trapped sellers', 'Institutions are legally required to buy'],
      a: 1, why: 'No trapped holders means no supply waiting at breakeven. A structural reason, not a narrative one.' },
    { q: 'In a VCP, the contractions should:',
      o: ['Get progressively wider', 'Get progressively tighter, with declining volume', 'Stay the same depth'],
      a: 1, why: 'Each tighter contraction represents another wave of sellers giving up. Widening contractions mean the opposite.' },
    { q: 'Why does a tight final contraction matter so much practically?',
      o: ['It looks cleaner on the chart', 'It gives a close stop, so position size can be larger for the same rupee risk', 'It guarantees a bigger move'],
      a: 1, why: 'Unit 1\'s arithmetic: smaller stop distance, same rupee risk, larger quantity.' },
    { q: 'The index fell 2% this month; a stock fell 0.3%. This is:',
      o: ['Relative weakness', 'Relative strength — someone was buying into the decline', 'Coincidence, ignore it'],
      a: 1, why: 'Demand shows up in relative performance before it becomes obvious in the stock\'s own chart.' },
    { q: 'The index is below a falling 50 EMA. The correct adjustment to long setups is:',
      o: ['Half position size', 'Half the number of trades, or none', 'No change — stock selection is what matters'],
      a: 1, why: 'Cutting size distorts your risk-per-trade data. Cutting the number of trades reduces exposure while keeping each trade honest.' },
    { q: 'Comparing raw volume between a large bank and a small-cap:',
      o: ['Tells you which is more active', 'Is meaningless — only volume relative to the stock\'s own average matters', 'Tells you which institutions prefer'],
      a: 1, why: 'Absolute volume varies by orders of magnitude across stocks. Relative volume is the comparable measure.' },
    { q: 'A stock does 2× average volume, almost all from one block trade at 09:20. This is:',
      o: ['Strong confirmation — institutions are buying', 'Weaker than the same volume spread across the session', 'Identical in meaning'],
      a: 1, why: 'One participant is not a crowd. Sustained volume across the session indicates broad revaluation.' },
    { q: 'Price up on low volume most often indicates:',
      o: ['Quiet accumulation', 'A move that happened through absence of sellers, and tends to give back', 'A guaranteed continuation'],
      a: 1, why: 'Thin advances lack the participation needed to sustain them.' }
  ]
};

const patterns = {
  id: 'patterns', phase: 1, title: 'Patterns — including the ones that do not work',
  mins: 20, unlocks: ['failed-breakdown reversal', 'earnings-gap continuation'],
  sections: [
    { h: 'Why most pattern statistics are worthless',
      p: [
        'Nearly all published win rates for chart patterns come from books and courses that exist to sell chart patterns. The incentive is obvious and the methodology is usually invisible.',
        'The common flaws: the pattern is identified after the fact, when the outcome is already known. The definition is loose enough that a failed instance can be reclassified as "not a real one". Costs are excluded. And survivorship — the examples shown are the ones that worked.',
        'This is not a claim that patterns do not work. It is a claim that you cannot know whether a specific pattern works for you, on your stocks, in your market, at your holding period, until you have measured it yourself.',
        'Hence the rule the app enforces: 30 marked examples before you may paper trade a pattern, 60 before live, 100 before it will even show you an expectancy number. Not to slow you down — to stop you inheriting a belief you never tested.'
      ] },
    { h: 'What a pattern actually is',
      p: [
        'Every pattern that survives testing has a mechanical explanation involving trapped or exhausted participants. If you cannot state who is forced to do what and why, you are looking at a shape, not a setup.',
        'Consolidation breakout: sellers exhausted, so little buying moves price. Failed breakdown: sellers trapped, forced to buy back. 52-week high: no trapped holders overhead. Pullback to a moving average: a reference point many participants act on.',
        'Now apply that test to a pattern like head-and-shoulders traded on sight. Who is trapped? What forces them to act? The usual answer is a vague story about distribution, which is not a mechanism.',
        'Use this as your filter for every pattern anyone shows you for the rest of your trading life. Mechanism or no trade.'
      ] },
    { h: 'Setup — the failed breakdown reversal',
      p: [
        'What it is: price breaks below an obvious support level, then quickly reclaims it and closes back above.',
        'Why it works, mechanically: obvious support attracts stop-loss orders below it and attracts short sellers on the break. When price reclaims the level, every one of those shorts is wrong and every stopped-out holder wants back in. Both groups must buy. That forced buying is the fuel.',
        'This is one of the cleanest mechanisms available, which is why it appears in this system despite being less famous than most patterns.',
        'What qualifies: the support level must be obvious — multiple prior touches, visible to anyone looking. The break should be genuine, not a one-tick wick. The reclaim should be prompt: same day or the next, on decent volume. A level reclaimed three weeks later is not this setup.',
        'Entry: on the reclaim, once price closes back above the level. Stop: below the low of the failed breakdown — a natural, tight stop. Target: the top of the prior range, then trail.',
        'How it fails: reclaims on weak volume, or in stocks that are in genuine downtrends where every level eventually breaks properly. The pattern needs a stock that was not fundamentally collapsing — a fake break, not a real one.',
        'A discipline point: this setup requires you to buy something that just fell, which feels bad. That discomfort is precisely why the opportunity exists. But it also means your emotional state during entry is unreliable, so the rules must be written down beforehand.'
      ] },
    { h: 'Setup — earnings-gap continuation',
      p: [
        'What it is: a stock gaps up substantially on results and continues higher over the following days and weeks rather than filling the gap.',
        'Why it works: a large earnings gap represents genuinely new information that many participants have not finished repricing. Institutions cannot buy their full position in one day without moving the price, so accumulation continues after the event.',
        'What qualifies: the gap should be large relative to the stock\'s normal range — a marginal gap is noise. Volume on the gap day should be enormous, several times average. The stock should hold the gap: closing near the day\'s high is far better than gapping up and fading. And the gap should be on genuine results, not a vague announcement.',
        'Entry: not on the gap day itself, which is chaotic and gives you no sensible stop. Wait for the first consolidation or pullback that holds above the gap day\'s low, then enter on resumption.',
        'Stop: below the gap day\'s low. If that is too far for your risk, the trade is too large — reduce quantity, never widen tolerance.',
        'How it fails: gaps that fade during the gap day itself, gaps on low volume, and gaps in a broadly falling market. Also gaps that have already run 30% before you consider entering — the repricing is done.',
        'A warning specific to India: results are often accompanied by illiquid opening auctions and wide spreads. The price you see in the first minutes may not be a price you can get. This is a slippage problem, and slippage is a cost, and costs are covered in their own unit.'
      ] },
    { h: 'Patterns that generally do not survive testing',
      p: [
        'Individual candlestick patterns in isolation. A doji, a hammer, an engulfing candle — as standalone signals these have been tested extensively and typically show no reliable edge after costs. They can be useful as confirmation within a structural setup; they are not setups themselves.',
        'Head-and-shoulders traded on sight. Widely taught, rarely tested honestly, and highly subjective — two people will disagree about whether a given chart qualifies, which alone should worry you.',
        'Anything requiring you to count waves or apply ratios to find turning points. The rules are elastic enough that a wrong call is always re-labelled rather than recorded as a loss. A system that cannot be wrong cannot be tested.',
        'Indicator crossovers as standalone triggers. Moving average crosses, MACD crosses, stochastic crosses — tested across decades and instruments, these are generally negative after costs. They lag by construction.',
        'Support and resistance drawn after the fact to explain a move that already happened. This is not analysis, it is narration.',
        'None of this means you must believe me. It means: test them yourself in the Backtest tab before risking money. If head-and-shoulders shows positive expectancy across your own 60 examples, trade it. The app will unlock it. That is the whole design.'
      ] },
    { h: 'How to mark an example honestly',
      p: [
        'The single biggest source of self-deception in backtesting is hindsight. You know what happened next, and it silently changes what you count as a valid setup.',
        'The discipline: scroll a chart from left to right with the future hidden. Stop at the candle where the setup would have been visible. Write entry, stop and target before revealing what happened. Then reveal.',
        'If you find yourself marking examples where the setup was "sort of there", you are building a dataset that will lie to you, and the lie will cost real money later. An unclear example is a no-trade, and no-trades should not be recorded as anything.',
        'Record losses with the same care as wins. A backtest with a 90% win rate almost always means the marker was excluding inconvenient examples, not that the pattern is exceptional.',
        'Mark examples across different market conditions — a rising market, a falling market, a choppy one. A pattern tested only in a bull run will look far better than it is.'
      ] },
    { h: 'When to abandon a pattern',
      p: [
        'Not after four losses. Four losses is nothing; a system winning 45% of the time produces four consecutive losses regularly.',
        'The Edge Finder hides expectancy below 30 trades in a category precisely to stop you deleting your best setup after an unlucky run. Below that sample, the number is noise.',
        'Legitimate reasons to drop a pattern: measured expectancy is negative across 60 or more of your own examples, or the structural conditions that made it work have visibly changed.',
        'Illegitimate reasons: a recent losing streak, boredom, seeing someone online say it no longer works, or wanting to trade something more exciting.',
        'And the reverse error is just as expensive: keeping a pattern with clearly negative expectancy because you like it, or because it worked when you started. The monthly recommendation in the Edge tab will name these for you. Its suggestions are worth taking seriously, because it has no ego invested in the answer.'
      ] }
  ],
  qs: [
    { q: 'Your own 60 marked examples show head-and-shoulders has negative expectancy. Videos praise it. You:',
      o: ['Trade it anyway — your sample is small', 'Drop it', 'Trade it only in strong markets', 'Trade it at half size'],
      a: 1, why: 'You may only trade what you personally proved. Adding a condition after seeing a bad result is curve fitting.' },
    { q: 'Why does a failed breakdown tend to run?',
      o: ['It signals institutional accumulation', 'Shorts and stopped-out holders are trapped and must buy back', 'It completes a recognised chart pattern'],
      a: 1, why: 'Forced buying from trapped positions. A mechanical reason beats a narrative one.' },
    { q: 'The test for whether a pattern deserves your attention is:',
      o: ['How often it appears in books', 'Whether you can state who is trapped or exhausted, and what forces them to act', 'Its published win rate'],
      a: 1, why: 'Mechanism or no trade. If you cannot name the forced participant, you are looking at a shape.' },
    { q: 'When should you enter an earnings-gap continuation?',
      o: ['At the open on gap day', 'After the first consolidation or pullback that holds above the gap day low', 'Only after the gap fills'],
      a: 1, why: 'Gap day gives no sensible stop and terrible fills. Waiting gives structure to place a stop against.' },
    { q: 'Your backtest of a pattern shows a 90% win rate. The most likely explanation is:',
      o: ['You found an exceptional edge', 'You excluded inconvenient examples, consciously or not', 'The pattern only works recently'],
      a: 1, why: 'Hindsight quietly reshapes what counts as a valid setup. Honest marking rarely produces 90%.' },
    { q: 'The correct way to mark a historical example is:',
      o: ['Find good outcomes and work backwards', 'Hide the future, mark the setup and stop, then reveal', 'Mark only clean textbook examples'],
      a: 1, why: 'Knowing the outcome changes what you accept as a setup. Hiding it is the only defence.' },
    { q: 'After four consecutive losses on your best setup, you should:',
      o: ['Suspend it', 'Continue — four losses is normal variance, well below the sample needed to judge', 'Halve the size'],
      a: 1, why: 'A 45% win-rate system produces four straight losses routinely. This is exactly why expectancy is hidden below 30 trades.' },
    { q: 'A doji appears at support. As a standalone signal this is:',
      o: ['A reliable reversal trigger', 'Not a setup — useful only as confirmation inside a structural one', 'A short signal'],
      a: 1, why: 'Individual candlestick patterns tested in isolation generally show no edge after costs.' },
    { q: 'The failed-breakdown setup requires you to buy something that just fell, which feels wrong. This means:',
      o: ['You should skip it — trust your instincts', 'The rules must be written before entry, because your emotional state at entry is unreliable', 'It only works for experienced traders'],
      a: 1, why: 'The discomfort is why the opportunity exists. Written rules are what let you act despite it.' },
    { q: 'A legitimate reason to abandon a pattern is:',
      o: ['A recent losing streak', 'Negative measured expectancy across 60+ of your own examples', 'Reading that it stopped working'],
      a: 1, why: 'Only your own sufficient sample counts. Streaks and opinions are not evidence.' },
    { q: 'You mark backtest examples only from the last two years, which were strongly rising. The risk is:',
      o: ['None — recent data is most relevant', 'The pattern will look far better than it is, because it was never tested in a hostile market', 'Sample size will be too small'],
      a: 1, why: 'A pattern tested only in a bull run inherits the bull run\'s returns and hides its own weakness.' },
    { q: 'Indicator crossovers used as standalone entry triggers generally:',
      o: ['Outperform price-based setups', 'Show negative expectancy after costs, because they lag by construction', 'Work only on intraday timeframes'],
      a: 1, why: 'A crossover is a smoothed report of what already happened. Test it yourself before believing either me or its promoters.' }
  ]
};

const intraday = {
  id: 'intraday', phase: 2, title: 'Intraday — when the clock becomes a variable',
  mins: 20,
  unlocks: ['opening range breakout 15m', 'VWAP mean reversion', 'VWAP trend pullback',
    'relative-strength pair play', 'previous-day high/low break with retest', 'failed-breakout fade'],
  sections: [
    { h: 'Intraday is not swing trading sped up',
      p: [
        'The structural difference is the close. A swing position can be wrong for three days and still work. An intraday position is closed at the bell whether or not the idea was correct — time itself is a risk you cannot manage away.',
        'That changes everything downstream. Targets must be reachable within hours. Stops must be tight enough that the arithmetic works at intraday ranges. Costs, from Unit 5, become a first-order concern rather than a footnote.',
        'It also changes the psychology. Swing trading gives you overnight to think. Intraday gives you seconds, repeatedly, all day. Every weakness covered in Unit 6 is amplified, and the app\'s tilt rules exist mostly because of this timeframe.',
        'The compensation: feedback arrives fast. You can log 40 trades in three weeks rather than three months. This is why the plan runs intraday as a separate mini-trial — it produces data quickly, which is genuinely valuable if you can survive it.'
      ] },
    { h: 'The shape of the Indian trading day',
      p: [
        '09:15 to 09:30 — the opening auction settles and overnight information gets priced. Enormous volume, wide spreads, violent moves. Most of the day\'s range often begins forming here. Also where the worst fills of the day happen.',
        '09:30 to 11:00 — the highest-quality trending period. The opening range has formed, direction is establishing, volume is still strong. If your day has a good trade, it is disproportionately here.',
        '11:30 to 13:30 — the dead zone. Volume falls, ranges compress, moves start and fail. This window bleeds accounts, not through big losses but through a steady drip of small ones taken out of boredom.',
        '13:30 to 15:00 — activity returns as the European session opens and positioning for the close begins. Trends from the morning often resume or reverse decisively.',
        '15:00 to 15:30 — closing volatility. Squaring off, MTM pressure, and on expiry days, chaos. Nothing new should be entered here.',
        'Your own Edge Finder day-and-time heatmap will confirm or refute all of this for your trading specifically, within about 60 trades. Trust that over this description.'
      ] },
    { h: 'VWAP: the intraday reference everyone uses',
      p: [
        'VWAP is the volume-weighted average price since the open. Every share traded today, averaged by how many shares traded at each price.',
        'It matters because of who watches it. Institutions executing large orders are benchmarked against VWAP — a buyer who fills below it did well, above it did badly. That creates real, mechanical behaviour: institutional buyers step in below VWAP, sellers above it.',
        'So VWAP is not a mystical line. It is a place where a specific, identifiable group of participants is motivated to act. That is the mechanism test from Unit 4, satisfied.',
        'Above VWAP with price trending, buyers are in control and pullbacks toward it are entries. Below VWAP with price trending down, the mirror. Price oscillating tightly around VWAP means neither side is in control — that is a range, and trend techniques will lose there.',
        'A caution: VWAP resets each day and is meaningless in the first few minutes when only a handful of trades have contributed to it. Give it until roughly 09:45 before treating it as a reference.'
      ] },
    { h: 'Setup — opening range breakout (15 minutes)',
      p: [
        'Define the high and low of the first 15 minutes. That range is the market\'s initial verdict on overnight information. A break of it is a decision to revise that verdict.',
        'Why it works: the opening range contains the day\'s highest-conviction participants acting on real information. Once that range is decisively broken, the participants positioned inside it are wrong and must adjust — the trapped-participant mechanism again.',
        'What qualifies: the range should be reasonably contained, not enormous — a huge opening range means the verdict was already violent and the edge is largely gone. Volume on the break should expand. Direction should agree with the broader market, not fight it.',
        'Entry: on the break, or on the retest of the range edge from the correct side. The retest version has a much better risk-reward and misses some moves — your own data should decide which you use.',
        'Stop: the opposite side of the range for the wide version, or below the retest low for the tight version. Target: a measured move equal to the range height, then trail, and flat by 15:10 regardless.',
        'How it fails: the false break that immediately returns inside the range — extremely common on quiet days, and the main reason this setup needs volume confirmation. And breaks that occur after 10:30, which are usually not opening-range events at all.'
      ] },
    { h: 'Setup — VWAP mean reversion, and VWAP trend pullback',
      p: [
        'These are opposite setups and taking the wrong one for the conditions is the classic intraday error. Which applies depends entirely on whether the day is trending or ranging.',
        'VWAP mean reversion, for range days: price extends well away from VWAP with no trend structure, then reverts toward it. Entry on evidence of reversion, stop beyond the extreme, target VWAP itself. This works when the day has no directional conviction — flat VWAP, price crossing it repeatedly, no clear higher highs or lower lows.',
        'VWAP trend pullback, for trend days: price is persistently above a rising VWAP, pulls back toward it, and resumes. Entry on the resumption, stop below the pullback low, target the prior high then trail. This works when the day has direction — VWAP sloping, price respecting it as support, structure intact.',
        'The identical chart location produces opposite trades. This is why the app requires you to tag a market regime on the pre-trade card before entry, and it is the same failure the Regime Classifier prevents in options.',
        'How to tell which day you are in, quickly: has price crossed VWAP more than three or four times since 09:45? Range day. Has it stayed on one side with VWAP sloping? Trend day. Ambiguous? No trade.'
      ] },
    { h: 'Setup — previous-day high/low break with retest',
      p: [
        'Yesterday\'s high and low are the most-watched levels on any intraday chart, because they are objective and everyone can see them.',
        'The mechanism: stop orders cluster beyond them, and breakout traders enter on the break. When the break holds and price retests the level from the other side, the level flips from resistance to support and the participants who faded the break are trapped.',
        'What qualifies: the break should occur with volume, and preferably before the midday dead zone. The retest should hold — a retest that slices straight back through is a failed break, which is a different setup entirely.',
        'Entry: on the retest holding, not on the initial break. This costs you some moves and dramatically improves your risk-reward, which is the trade-off this system generally prefers.',
        'Stop: below the retest low. Target: the next structural level, or a measured move from the previous day\'s range.',
        'The related opposite setup, failed-breakout fade, is the same mechanism inverted: price breaks the level, fails to hold, and returns inside. The breakout buyers are now trapped. Both setups come from the same level; the market tells you which one you are in.'
      ] },
    { h: 'Setup — relative-strength pair play',
      p: [
        'Take two stocks in the same sector. On a day when the sector is moving, one will lead and one will lag. The leader is where demand is concentrated.',
        'The play: when the sector turns up, buy the stock showing relative strength rather than the one that looks cheaper. Beginners consistently do the opposite, buying the laggard because it "has more room to run". The laggard is lagging for a reason.',
        'What qualifies: a clear sector move, a clear divergence in relative performance since the open, and adequate liquidity in the name you choose. This is a Phase 2 setup requiring more screen attention than the others, and it is reasonable to skip it entirely if your data does not support it.',
        'Measurement without tools: percentage change since the open for each name, compared. The one holding up during sector weakness or leading during strength is your candidate.'
      ] },
    { h: 'The hard rules, and why each exists',
      p: [
        'Maximum 3 trades per day. Not because 4 would be unprofitable in principle, but because trades 4 and beyond are overwhelmingly boredom or revenge trades. The cap removes the decision.',
        'No new entries between 11:30 and 13:30 without an A+ setup. This is the dead zone from earlier. Your own heatmap will most likely confirm it within 60 trades.',
        'Flat by 15:10. Closing-auction volatility and wide spreads make the last twenty minutes a poor place to be managing an exit under time pressure.',
        'Daily loss cap with a hard lock. After a certain loss, judgement is measurably degraded and the account closes for the day. The setups will exist tomorrow; today\'s version of you will not improve.',
        'Leverage capped at 2× regardless of what the broker offers. Brokers may offer far more. Offered leverage is a description of their risk appetite, not a recommendation for yours. At 5× leverage a 2% adverse move is 10% of your capital, and intraday 2% moves are ordinary.',
        'Each of these is a rule you would write yourself while calm and break yourself while trading. That is exactly the category of rule that belongs in software rather than in willpower.'
      ] },
    { h: 'Before you trade this at all',
      p: [
        'Intraday amplifies costs, and Unit 5\'s arithmetic applies directly: 3 trades a day is roughly 720 round trips a year. Compute what that costs at your broker before deciding this style is viable at your account size.',
        'It also demands availability. If you cannot watch the market between 09:15 and 15:30 without it damaging your income or your attention elsewhere, swing trading is not the inferior choice — it is the correct one.',
        'And be honest about why intraday appeals. If the answer involves faster results or more action, that is the same instinct that draws people to scalping, and it is worth naming before it costs money.'
      ] }
  ],
  qs: [
    { q: 'It is 12:15. A decent but not exceptional setup appears. You:',
      o: ['Take it — a setup is a setup', 'Skip it', 'Take half size', 'Take it with a wider stop'],
      a: 1, why: 'The midday dead zone is where accounts bleed through small boredom losses. Half size is still a rule break.' },
    { q: 'Why does VWAP work as a reference?',
      o: ['It is a mathematical support level', 'Large participants are benchmarked against it, so they act around it', 'It predicts direction'],
      a: 1, why: 'It matters because of who is watching and what they are measured on, not because of the formula.' },
    { q: 'Price has crossed VWAP six times since 09:45. The appropriate setup family is:',
      o: ['VWAP trend pullback', 'VWAP mean reversion', 'Opening range breakout'],
      a: 1, why: 'Repeated crossing means neither side is in control. Trend techniques lose in that condition.' },
    { q: 'The structural difference between intraday and swing trading is:',
      o: ['Intraday uses different indicators', 'You are closed at the bell whether or not the idea was correct', 'Intraday has better liquidity'],
      a: 1, why: 'Time itself becomes a risk you cannot manage away, which changes targets, stops and psychology.' },
    { q: 'The preferred entry on a previous-day-high break is:',
      o: ['On the initial break', 'On the retest holding above the level', 'At the close of the breakout candle'],
      a: 1, why: 'The retest costs you some moves and substantially improves risk-reward — the trade-off this system prefers.' },
    { q: 'Your broker offers 5× intraday leverage. This tells you:',
      o: ['5× is a reasonable level to use', 'Their risk appetite, not a recommendation for yours', 'The stock is liquid'],
      a: 1, why: 'At 5×, an ordinary 2% adverse move costs 10% of your capital.' },
    { q: 'A sector is rallying. You should buy:',
      o: ['The laggard — it has more room', 'The stock showing relative strength', 'Both equally'],
      a: 1, why: 'The laggard is lagging for a reason. Demand concentrates in leaders and tends to stay there.' },
    { q: 'The 3-trades-per-day cap exists because:',
      o: ['More than 3 is unprofitable in principle', 'Trades 4 and beyond are overwhelmingly boredom or revenge trades', 'Costs become prohibitive'],
      a: 1, why: 'The cap removes a decision you would make badly. It is not a claim about the fourth setup itself.' },
    { q: 'VWAP in the first few minutes of the session is:',
      o: ['Most reliable — freshest data', 'Meaningless, built from too few trades', 'Identical to the open price and therefore useful'],
      a: 1, why: 'Give it until roughly 09:45 before treating it as a reference.' },
    { q: 'An enormous opening range suggests:',
      o: ['A bigger opportunity', 'The violent repricing already happened and much of the edge is gone', 'A guaranteed trend day'],
      a: 1, why: 'The setup works on a contained range being decisively broken, not on chasing a move already made.' },
    { q: 'Trading 3 times a day means roughly how many round trips a year?',
      o: ['About 180', 'About 720', 'About 2,000'],
      a: 1, why: 'Roughly 240 trading days × 3. Apply your own cost per round trip before deciding this style is viable.' },
    { q: 'Price breaks yesterday\'s high, fails to hold, and returns inside the range. This is:',
      o: ['A failed setup — do nothing', 'The failed-breakout fade setup — breakout buyers are now trapped', 'A signal to buy the dip'],
      a: 1, why: 'Same level, inverted mechanism. The market tells you which of the two setups you are in.' }
  ]
};

const costs = {
  id: 'costs', phase: 2, title: 'Costs — the silent account killer',
  mins: 16, unlocks: [],
  sections: [
    { h: 'Why this unit exists',
      p: [
        'Nobody quits trading because they misunderstood a candlestick. People quit because a strategy that looked profitable was not, once the bill arrived.',
        'Costs are boring, invisible on charts, and small per trade. Those three properties together make them the most reliably underestimated risk in retail trading.',
        'The core idea: a strategy has a gross edge and a cost per round trip. Your actual edge is the difference. If your average trade makes 0.4% and costs 0.25%, you do not have a 0.4% strategy — you have a 0.15% strategy, and you are doing most of the work for the exchange and the government.'
      ] },
    { h: 'What you actually pay in India',
      p: [
        'Brokerage: what your broker charges. Discount brokers typically charge a flat amount per executed order for intraday and F&O, and often zero for delivery equity. Two sides of a trade means two orders means two charges.',
        'STT (Securities Transaction Tax): charged on the sell side for intraday equity, on both sides for delivery, and on the sell side for options — where it is charged on the premium. STT on exercised options has historically been charged on the settlement value, which is why letting deep in-the-money options expire rather than selling them has bankrupted people. Sell your options; do not let them exercise by accident.',
        'Exchange transaction charges: a small percentage of turnover, differing between NSE and BSE, and between equity and F&O.',
        'GST: charged at 18% on brokerage plus exchange charges. A tax on the fees.',
        'SEBI turnover fees and stamp duty: small, but present on every trade.',
        'Every one of these rates changes over time. Do not memorise the numbers — get your broker\'s current charge sheet and read the actual contract note. The contract note is the only document that tells you the truth.'
      ] },
    { h: 'The contract note is the real teacher',
      p: [
        'After each trading day your broker issues a contract note listing every charge on every trade. Almost nobody reads it.',
        'Read yours after your first ten trades. Add up the charges. Divide by the number of round trips. That single number — your real cost per round trip — is worth more to you than any indicator.',
        'Then compare it to your average winning trade. If your average win is ₹800 and your round trip costs ₹120, costs are consuming 15% of every winner and adding to every loser. That is the actual condition you are trading in.',
        'This is also why the app\'s Cost Wall must be computed from your broker\'s real charges, not from an example. Any figure I invented here would be obsolete and misleading.'
      ] },
    { h: 'Slippage: the cost nobody records',
      p: [
        'Slippage is the difference between the price you intended and the price you got. It appears on no statement and in no charge sheet, which is exactly why it goes untracked.',
        'Sources: the bid-ask spread, which you cross every time you use a market order. Thin order books, where your own order moves the price. Fast markets, where price moves between your decision and your fill. And size, where you consume multiple levels of the book.',
        'A stock with a ₹0.05 spread on a ₹500 share costs you 0.01% per side — trivial. A stock with a ₹2 spread on a ₹150 share costs 1.3% per side — catastrophic for anything short-term.',
        'The practical defences: trade liquid instruments, use limit orders where the setup allows it, avoid the first minutes of the session for entries unless the setup is specifically an opening one, and size down in illiquid names rather than pretending the spread does not exist.',
        'Track it. Record your intended entry on the pre-trade card and compare it to the fill. Over 50 trades you will have a real slippage number, and it will probably be larger than you expected.'
      ] },
    { h: 'The arithmetic of frequency',
      p: [
        'Costs scale with the number of trades, not the size of your edge. This single fact determines which styles are viable at which account sizes.',
        'Swing trading: 40 trades in three months. At ₹100 per round trip, that is ₹4,000 in costs over a quarter. On a ₹5,00,000 account, negligible.',
        'Intraday at 3 trades a day: roughly 60 trades a month, 720 a year. At ₹100 each, ₹72,000 a year. On a ₹5,00,000 account that is 14.4% you must earn before you break even.',
        'Scalping at 20 trades a day: roughly 5,000 a year. At ₹100 each, ₹5,00,000 — the entire account, annually, in costs alone.',
        'The conclusion is not that intraday or scalping cannot work. It is that they require a substantially larger gross edge to produce the same net result, and that the required edge grows with frequency while your skill does not automatically grow with it.'
      ] },
    { h: 'Why scalping is last in this system',
      p: [
        'Scalping is the style beginners are most drawn to — fast feedback, constant action, small stops, the appearance of control. It is also the style with the highest cost drag and the least tolerance for execution error.',
        'A scalper working with a 0.15% gross edge and a 0.12% round-trip cost is running a business with a 0.03% margin. Any deterioration in fills, any widening of spreads, any missed exit, and the margin is gone.',
        'This is why the app runs the Cost Wall before scalping unlocks: a simulation using your actual broker\'s charges, showing a gross-positive record turning net-negative. Not to discourage you — to make the number concrete before it costs you money rather than after.',
        'And it comes last for a second reason. Scalping punishes hesitation and rewards mechanical execution. Those are exactly the qualities the earlier phases build. Attempting it first means learning the hardest style with the weakest habits.'
      ] },
    { h: 'How costs change strategy design',
      p: [
        'Wider targets absorb costs better than tight ones. A setup targeting 3R can afford a cost that would destroy a setup targeting 0.5R.',
        'Fewer, better trades beat more, marginal ones — not because patience is a virtue, but because each marginal trade carries the full cost while carrying a smaller edge.',
        'Holding period matters more than most people think. Delivery equity in India often carries zero brokerage at discount brokers, so a swing trade may cost dramatically less than the same idea expressed intraday.',
        'And in options, spreads carry double the legs and therefore double the cost of a single option. That is a genuine argument against over-complicating structures — a four-leg strategy pays four sets of charges on entry and potentially four on exit.'
      ] },
    { h: 'Taxes on profits, briefly',
      p: [
        'This is not tax advice and rates change; confirm current treatment with a professional or the current rules before filing.',
        'Broadly, in India: intraday equity is treated as speculative business income, F&O as non-speculative business income, and delivery equity held longer produces capital gains, taxed differently depending on holding period.',
        'The practical consequences that matter for planning: business income allows you to deduct expenses, including brokerage and related costs; and losses in some categories can be carried forward if returns are filed on time.',
        'The reason it belongs in this unit: your net-net return after both costs and taxes is the only number that has anything to do with your life. A 20% gross year is not a 20% year.'
      ] }
  ],
  qs: [
    { q: 'A backtest shows +₹11,400 gross over 200 trades. What do you conclude?',
      o: ['It is profitable', 'Nothing until costs are subtracted', 'It needs a longer period', 'It should be traded larger'],
      a: 1, why: 'At 200 trades, even ₹60 per round trip is ₹12,000 — the entire profit and more.' },
    { q: 'Slippage is worst when:',
      o: ['Using limit orders in liquid stocks', 'Using market orders with size in illiquid stocks', 'Holding overnight'],
      a: 1, why: 'Thin book plus size plus a market order means you pay whatever price is available.' },
    { q: 'Your average win is ₹800 and your round trip costs ₹120. This means:',
      o: ['Costs are negligible', 'Costs consume 15% of every winner and worsen every loser', 'You should trade more often to spread the cost'],
      a: 1, why: 'Costs are fixed per trade, so trading more multiplies them rather than spreading them.' },
    { q: 'Why does scalping require a much larger gross edge than swing trading?',
      o: ['Because intraday moves are smaller', 'Because costs scale with the number of trades, not the size of the edge', 'Because brokers charge more intraday'],
      a: 1, why: '5,000 trades a year at ₹100 is ₹5,00,000 in costs regardless of how good each trade was.' },
    { q: 'GST in this context is charged on:',
      o: ['Your profits', 'Brokerage and exchange charges', 'Turnover'],
      a: 1, why: 'It is a tax on the fees, which is why it is easy to overlook when estimating costs.' },
    { q: 'The document that tells you your true costs is:',
      o: ['The broker\'s pricing page', 'The daily contract note', 'The P&L statement'],
      a: 1, why: 'The contract note itemises every charge on every trade. The pricing page shows headline rates only.' },
    { q: 'A four-leg option strategy compared to a single option:',
      o: ['Costs the same', 'Pays roughly four sets of charges on entry and potentially four on exit', 'Costs less due to netting'],
      a: 1, why: 'A real argument against over-complicating structures for marginal theoretical benefit.' },
    { q: 'The safest defence against slippage in an illiquid stock is:',
      o: ['A market order for speed', 'Reducing size and using limit orders', 'Trading at the open'],
      a: 1, why: 'Your own order is a large fraction of the book. Size is the variable you control.' },
    { q: 'Letting a deep in-the-money option expire rather than selling it is dangerous because:',
      o: ['Brokerage is higher on expiry', 'STT on exercise has been charged on settlement value, not premium', 'The exchange charges a penalty'],
      a: 1, why: 'This mechanism has produced losses far larger than the option\'s value. Sell rather than let it exercise by accident.' },
    { q: 'A setup targeting 0.5R versus one targeting 3R, same costs:',
      o: ['Both are equally affected', 'The 0.5R setup is far more damaged, because cost is a larger fraction of the target', 'The 3R setup is more damaged'],
      a: 1, why: 'Fixed cost against a smaller target consumes a larger share of the edge.' },
    { q: 'The correct way to establish your cost per round trip is:',
      o: ['Use the industry average', 'Total the charges on your own contract notes and divide by round trips', 'Ask your broker for an estimate'],
      a: 1, why: 'Only your own notes reflect your instruments, your order types and your actual fills.' }
  ]
};

const psych = {
  id: 'psych', phase: 1, title: 'The part that actually decides the outcome',
  mins: 20, unlocks: [],
  sections: [
    { h: 'Why knowledge is not the bottleneck',
      p: [
        'You can know every rule in this app and break all of them at 14:45 with money on the line. Almost everyone does, at least once.',
        'The gap is not intelligence. It is that trading asks you to act against instincts that serve you well everywhere else in life. Cut your losses runs against the instinct to fix a problem by trying harder. Let winners run runs against the instinct to secure a gain. Sit still runs against the instinct to do something when something is wrong.',
        'Those instincts are not defects. They are useful in most of life. Markets are one of the few environments where they systematically hurt you, which is why competent people fail at this while succeeding elsewhere.',
        'The response is not to become emotionless — that is not available. It is to build structures that make the right action the default and the wrong action expensive or impossible. That is the entire design philosophy of this app.'
      ] },
    { h: 'Process versus outcome',
      p: [
        'A good trade can lose. A bad trade can win. If you judge yourself by outcome, you will learn the wrong lesson roughly half the time.',
        'The four combinations. Good process, good outcome: reinforce it. Good process, bad outcome: this is a normal cost of business, and the correct response is nothing. Bad process, bad outcome: the easiest to learn from, because the pain and the error line up. Bad process, good outcome: the most dangerous square on the board, because you were rewarded for the wrong thing and you will do it again with more size.',
        'That last one is why the app scores adherence separately from profit, and why the rule-following-versus-profit chart exists. Over enough trades those two columns separate, and the separation is the most persuasive evidence you will ever see about your own trading.',
        'The practical habit: after each trade, ask "would I take that again with the same information?" before looking at the result. That question is answerable. "Was that a good trade?" asked after seeing the P&L is not.'
      ] },
    { h: 'Winning streaks are more dangerous than losing streaks',
      p: [
        'Losing makes you careful. Winning makes you certain, and certainty makes you large at exactly the moment your edge has not changed at all.',
        'The mechanism: three or four wins in a row feels like evidence of skill. It is usually variance. A 45% system produces three consecutive wins about once every ten sequences. But it does not feel like variance — it feels like you have finally understood something.',
        'So you size up. And the next trade, taken larger for no valid reason, is statistically identical to the previous ones. The expected value of the sequence is unchanged; the variance of your account just doubled.',
        'This is why the app caps your size at half for three trades after three consecutive wins. It is deliberately annoying. Being annoyed by a rule you wrote while calm is the rule working.',
        'The mirror error is also real: cutting size after a normal losing streak leaves you small when the edge finally shows. If the losses were correctly executed, nothing about your system changed and nothing about your sizing should.'
      ] },
    { h: 'The four ways people enter without a setup',
      p: [
        'Revenge trading. You took a loss and you want it back from the market specifically. The market does not know you exist and has no capacity to give anything back. Every revenge trade is a bet placed by the worst decision-maker in your head.',
        'Boredom trading. Nothing has happened for two hours and sitting still is uncomfortable. So you find a setup, which is not the same as finding a setup. If you look at enough charts with the intent to trade, you will always find something.',
        'FOMO. Something ran without you. The trade you planned no longer exists; entering now is a different, worse trade at a worse price with a wider stop. The regret you feel about the missed move is not reduced by taking a bad version of it — it is usually doubled.',
        'Overconfidence trading. Covered above: you are good right now, so the usual filters feel unnecessary.',
        'All four are the same act with different stories: entering because sitting still is uncomfortable. The discomfort is the job. A trader who cannot sit still is not undisciplined in some abstract sense — they are paying a fee to relieve boredom.'
      ] },
    { h: 'What tilt actually feels like',
      p: [
        'Tilt does not announce itself. It rarely feels like rage. Most often it feels like unusual clarity — a sudden certainty about what the market is going to do next, arriving shortly after a loss.',
        'Physical signs are more reliable than emotional self-assessment: shallow breathing, leaning toward the screen, checking the position far more often than the timeframe warrants, an urge to increase size, irritation at the app\'s rules.',
        'The last one is diagnostic. When the pre-market gate blocks you and your reaction is that the rule is stupid, that is the day the rule is most needed. The 100-word override exists because writing 100 words takes long enough for the urge to fade — and because a written record of your justifications, read back monthly, is uncomfortable in a useful way.',
        'The app watches for the mechanical signatures it can see: two losses inside 45 minutes, re-entry within five minutes of an exit, size deviation, off-plan setups. It cannot see the rest. That part is yours.'
      ] },
    { h: 'Money pressure destroys process',
      p: [
        'If you need ₹50,000 from the account this month, every risk rule in this system quietly breaks. You will take marginal setups because you need the trade to exist. You will size up because the correct size will not produce enough. You will hold losers because realising the loss makes the shortfall real.',
        'None of this feels like a decision. It feels like being sensible about your obligations, which is why warnings do not work and structural blocks do.',
        'This is why the pre-market gate asks "do I need money this month" and blocks trading when the answer is yes. And why the Income Gate requires 12 months of expenses saved outside the account before a single rupee is withdrawn for living costs.',
        'It is also why borrowed capital is a hard block, not a warning. Borrowed money carries a repayment date, and a repayment date is money pressure with a schedule attached.'
      ] },
    { h: 'Loss aversion, sunk cost, and the other named traps',
      p: [
        'Loss aversion: a loss hurts roughly twice as much as an equivalent gain pleases. The practical consequence is that you close winners early to lock in the good feeling and hold losers to avoid the bad one — which is precisely inverted from what a positive-expectancy system requires.',
        'Sunk cost: "I have already lost so much on this position, I cannot exit now." The money already lost is not a reason to risk more; it is not recoverable by this position or any other.',
        'Recency bias: the last three trades feel more informative than the previous thirty. They are not. This is what the Edge Finder\'s sample minimums exist to counteract.',
        'Confirmation bias: after entering, you notice evidence supporting the position and skim past evidence against it. The defence is writing the invalidation condition on the pre-trade card before entering, so the disconfirming evidence is defined in advance rather than judged in the moment.',
        'Anchoring: your entry price feels significant. It is significant to you and to nobody else. The market does not know what you paid, and "getting back to breakeven" is not a plan.'
      ] },
    { h: 'The identity that survives',
      p: [
        '"I am someone who predicts markets" is a fragile identity, because being wrong is then an attack on who you are. People with that identity cannot cut losses, because cutting a loss is admitting the prediction failed.',
        '"I am a risk manager who happens to trade" survives, because being wrong is expected and priced in. A stopped-out trade is not a failure of identity; it is the system working exactly as designed.',
        'This sounds like a slogan. It is actually the difference between someone who can hold a stop and someone who cannot, and it shows up in the adherence numbers within a month.',
        'A related discipline: the app hides daily P&L for the first 90 days and makes the process score the headline number. That is not decoration. What you measure yourself against becomes what you optimise for, and optimising for daily P&L produces a trader who cannot sit through a normal drawdown.'
      ] },
    { h: 'The Constitution, and why Sundays',
      p: [
        'You will write your own rules and the app will enforce them. They can only be amended on a Sunday, and never during a drawdown.',
        'The reason: rules written while calm are good rules. Rules amended at 14:50 on a losing Wednesday are not amendments, they are surrender with a paperwork step.',
        'Every amendment is logged with a reason, and the amendment history is itself a diagnostic. Someone who loosens their rules after every losing week is showing you the actual problem, which is not the rules.',
        'Write the first version now, before you have money at risk. It does not have to be long. Six lines you will actually follow beats two pages you will not.'
      ] }
  ],
  qs: [
    { q: 'You exited early out of fear. The trade later hit target. This is:',
      o: ['A win — you made money', 'A process failure on a profitable trade', 'Bad luck', 'Evidence your target was too far'],
      a: 1, why: 'Profit hid the error. Judge the decision, not the outcome, or you will repeat it.' },
    { q: 'Which of the four process/outcome combinations is most dangerous?',
      o: ['Good process, bad outcome', 'Bad process, bad outcome', 'Bad process, good outcome', 'Good process, good outcome'],
      a: 2, why: 'You were rewarded for the wrong behaviour, so you will repeat it with more size and no warning signal.' },
    { q: 'Three wins in a row. The greatest risk now is:',
      o: ['Overconfidence and oversizing', 'Losing your nerve', 'Nothing — you are in form', 'Reverting to the mean'],
      a: 0, why: 'Variance feels like skill. This is why the app halves your size for the next three trades.' },
    { q: 'After three correctly executed losses, the correct sizing response is:',
      o: ['Increase to recover faster', 'Decrease until confidence returns', 'No change', 'Stop trading for a month'],
      a: 2, why: 'Increasing is martingale; decreasing leaves you small when the edge arrives. Nothing about the system changed.' },
    { q: 'Tilt most commonly feels like:',
      o: ['Obvious anger', 'Sudden unusual certainty about what happens next', 'Fatigue', 'Nothing at all'],
      a: 1, why: 'It rarely announces itself as rage. Clarity arriving right after a loss is the signature to distrust.' },
    { q: 'The app blocks you and your reaction is that the rule is stupid. This indicates:',
      o: ['The rule needs changing', 'This is the day the rule is most needed', 'A software bug'],
      a: 1, why: 'Irritation at your own calm-state rules is a reliable tilt signal. Amendments belong on Sundays.' },
    { q: 'You need ₹50,000 from the account this month. The correct action is:',
      o: ['Trade bigger to cover it', 'Do not trade this month', 'Trade normally', 'Trade smaller but more often'],
      a: 1, why: 'Money pressure silently breaks every risk rule and does not feel like a decision while it happens.' },
    { q: '"I have already lost ₹30,000 on this position, I cannot exit now" is an example of:',
      o: ['Loss aversion', 'Sunk cost fallacy', 'Recency bias', 'Anchoring'],
      a: 1, why: 'Money already lost is not recoverable by this position and is not a reason to risk more.' },
    { q: 'The defence against confirmation bias during a trade is:',
      o: ['Reading more analysis', 'Writing the invalidation condition before entering', 'Checking the position more often'],
      a: 1, why: 'Disconfirming evidence must be defined in advance, because in the moment you will discount it.' },
    { q: 'You have no valid setup but feel restless. The correct action is:',
      o: ['Take a smaller position', 'Do nothing', 'Look at more charts until something appears', 'Switch timeframes'],
      a: 1, why: 'Looking until something appears guarantees you will find it. That is manufacturing a setup, not finding one.' },
    { q: 'Why can the Constitution only be amended on Sundays?',
      o: ['To create a weekly routine', 'Because rules amended mid-drawdown are surrender with a paperwork step', 'To limit database writes'],
      a: 1, why: 'Rules written calm are good rules. The timing restriction protects them from the version of you that is losing.' },
    { q: 'Hiding daily P&L for the first 90 days is intended to:',
      o: ['Reduce stress', 'Stop you optimising for the wrong measure', 'Prevent overtrading directly'],
      a: 1, why: 'What you measure yourself against becomes what you optimise for. Daily P&L produces a trader who cannot sit through a normal drawdown.' },
    { q: 'FOMO entry after a 5% move you missed is:',
      o: ['The same trade, slightly late', 'A different, worse trade at a worse price with a wider stop', 'Justified if the trend is confirmed'],
      a: 1, why: 'The trade you planned no longer exists. Taking a bad version of it usually doubles the regret rather than removing it.' }
  ]
};

export const EQUITY_UNITS = [risk, structure, volume, patterns, intraday, costs, psych];
