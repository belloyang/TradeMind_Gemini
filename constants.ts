import { Trade, StrategyType, Emotion, TradeStatus } from './types';

export const STRATEGIES = Object.values(StrategyType);
export const EMOTIONS = Object.values(Emotion);

export const INITIAL_TRADES: Trade[] = [
  {
    id: '1',
    ticker: 'SPY',
    strategy: StrategyType.IRON_CONDOR,
    entryDate: '2024-05-01T10:30:00',
    expirationDate: '2024-05-15',
    status: TradeStatus.CLOSED,
    entryPrice: 2.50,
    exitPrice: 1.20,
    quantity: 5,
    pnl: 650, // (2.50 - 1.20) * 5 * 100
    fees: 10,
    notes: 'Classic mechanic entry. High IV rank.',
    entryEmotion: Emotion.CALM,
    checklist: {
      strategyMatch: true,
      riskDefined: true,
      sizeWithinLimits: true,
      ivConditionsMet: true,
      emotionalStateCheck: true,
    },
    disciplineScore: 100,
  },
  {
    id: '2',
    ticker: 'NVDA',
    strategy: StrategyType.LONG_CALL,
    entryDate: '2024-05-03T14:00:00',
    status: TradeStatus.CLOSED,
    entryPrice: 15.00,
    exitPrice: 10.00,
    quantity: 1,
    pnl: -500,
    fees: 2,
    notes: 'Chased the breakout. Should have waited for retest.',
    entryEmotion: Emotion.FOMO,
    checklist: {
      strategyMatch: false, // Violation
      riskDefined: true,
      sizeWithinLimits: true,
      ivConditionsMet: false, // Violation
      emotionalStateCheck: false, // Violation
    },
    disciplineScore: 40,
    violationReason: 'Chasing momentum without strategy alignment',
  },
  {
    id: '3',
    ticker: 'TSLA',
    strategy: StrategyType.CASH_SECURED_PUT,
    entryDate: '2024-05-10T09:45:00',
    status: TradeStatus.OPEN,
    entryPrice: 3.20,
    quantity: 2,
    fees: 2,
    notes: 'Selling puts at support level.',
    entryEmotion: Emotion.CONFIDENT,
    checklist: {
      strategyMatch: true,
      riskDefined: true,
      sizeWithinLimits: true,
      ivConditionsMet: true,
      emotionalStateCheck: true,
    },
    disciplineScore: 100,
  },
];