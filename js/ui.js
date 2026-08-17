// ui.js — OWNS: the screen table only. Every screen lives in its own file so
// that no single file is too large to paste into GitHub on a phone.

import * as core from './ui-core.js';
import * as today from './ui-today.js';
import * as learnScr from './ui-learn.js';
import * as trade from './ui-trade.js';
import * as review from './ui-review.js';

export const esc = core.esc;
export const rs = core.rs;
export const toast = core.toast;
export const confirmToast = core.confirmToast;
export const nextActions = core.nextActions;
export const CONSTITUTION_TEMPLATE = core.CONSTITUTION_TEMPLATE;
export const onboardSeen = core.seen;
export const onboardMarkSeen = core.markSeen;
export const statusHandle = today.statusHandle;

export const VIEWS = {
  start: today.startView, home: today.home, settings: today.settings,
  learn: learnScr.learnView, playbook: learnScr.playbookView,
  backtest: learnScr.backtestView, replay: learnScr.replayView,
  journal: trade.journalView, market: trade.marketView,
  broker: trade.brokerView, day: trade.dayView,
  edge: review.edgeView, focus: review.focusView,
  mind: review.mindView, drills: review.drillsView, advanced: review.advancedView
};

export const WIRE = {
  home: today.homeWire, learn: learnScr.learnWire, replay: learnScr.replayWire,
  journal: trade.journalWire, broker: trade.brokerWire, day: trade.dayWire,
  edge: review.edgeWire
};

export const HANDLERS = [
  ['o-', today.startHandle], ['l-', learnScr.learnHandle], ['k-', learnScr.backtestHandle],
  ['y-', learnScr.playbookHandle], ['v-', learnScr.replayHandle],
  ['j-', trade.journalHandle], ['r-', trade.marketHandle], ['b-', trade.brokerHandle],
  ['i-', trade.dayHandle],
  ['e-', review.edgeHandle], ['f-', review.focusHandle], ['p-', review.mindHandle],
  ['d-', review.drillsHandle], ['a-', review.advancedHandle]
];
