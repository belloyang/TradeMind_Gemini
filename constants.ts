import { Trade, TradeDirection, OptionType, Emotion, TradeStatus } from './types';

export const DIRECTIONS = Object.values(TradeDirection);
export const OPTION_TYPES = Object.values(OptionType);
export const EMOTIONS = Object.values(Emotion);

export const POPULAR_TICKERS = [
  'SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'SLV', 'TLT', 'HYG', 'VXX',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NFLX',
  'AMD', 'INTC', 'MU', 'AVGO', 'TSM', 'ARM', 'SMCI', 'PLTR',
  'COIN', 'MSTR', 'MARA', 'RIOT', 'HOOD',
  'JPM', 'BAC', 'C', 'WFC', 'GS', 'MS',
  'XOM', 'CVX', 'OXY',
  'LLY', 'UNH', 'JNJ', 'PFE', 'MRK',
  'BA', 'CAT', 'DE',
  'GME', 'AMC', 'RIVN', 'LCID',
  'BABA', 'JD', 'PDD'
].sort();

export const INITIAL_TRADES: Trade[] = [
  {
    id: '1',
    ticker: 'SPY',
    direction: TradeDirection.SHORT,
    optionType: OptionType.PUT,
    entryDate: '2024-05-01T10:30:00',
    expirationDate: '2024-05-15',
    status: TradeStatus.CLOSED,
    entryPrice: 2.50,
    exitPrice: 1.20,
    strikePrice: 510,
    quantity: 5,
    pnl: 650, // (2.50 - 1.20) * 5 * 100
    notes: 'Selling puts at support level. High IV rank.',
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
    direction: TradeDirection.LONG,
    optionType: OptionType.CALL,
    entryDate: '2024-05-03T14:00:00',
    expirationDate: '2024-06-21',
    status: TradeStatus.CLOSED,
    entryPrice: 15.00,
    exitPrice: 10.00,
    strikePrice: 900,
    quantity: 1,
    pnl: -500,
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
    direction: TradeDirection.SHORT,
    optionType: OptionType.PUT,
    entryDate: '2024-05-10T09:45:00',
    expirationDate: '2024-05-24',
    status: TradeStatus.OPEN,
    entryPrice: 3.20,
    strikePrice: 170,
    quantity: 2,
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