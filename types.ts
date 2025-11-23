export enum StrategyType {
  LONG_CALL = 'Long Call',
  LONG_PUT = 'Long Put',
  COVERED_CALL = 'Covered Call',
  CASH_SECURED_PUT = 'Cash Secured Put',
  IRON_CONDOR = 'Iron Condor',
  CREDIT_SPREAD = 'Credit Spread',
  DEBIT_SPREAD = 'Debit Spread',
  WHEEL = 'The Wheel',
}

export enum Emotion {
  CALM = 'Calm',
  ANXIOUS = 'Anxious',
  CONFIDENT = 'Confident',
  FOMO = 'FOMO',
  BORED = 'Bored',
  REVENGE = 'Revenge',
}

export enum TradeStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
}

export interface DisciplineChecklist {
  strategyMatch: boolean;
  riskDefined: boolean;
  sizeWithinLimits: boolean;
  ivConditionsMet: boolean;
  emotionalStateCheck: boolean;
}

export interface Trade {
  id: string;
  ticker: string;
  strategy: StrategyType;
  entryDate: string;
  expirationDate?: string;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number; // Realized P&L
  fees: number;
  notes: string;
  
  // Psychology & Discipline
  entryEmotion: Emotion;
  exitEmotion?: Emotion;
  checklist: DisciplineChecklist;
  disciplineScore: number; // 0 to 100 based on checklist
  violationReason?: string;
}

export interface Metrics {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  disciplineScore: number; // Average discipline score
  maxDrawdown: number;
}

export interface ArchivedSession {
  id: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalBalance: number;
  totalPnL: number;
  tradeCount: number;
  trades: Trade[];
}