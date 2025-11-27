
export enum TradeDirection {
  LONG = 'Long',
  SHORT = 'Short',
}

export enum OptionType {
  CALL = 'Call',
  PUT = 'Put',
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
  ivConditionsMet: boolean;
  emotionalStateCheck: boolean;
  maxTradesRespected: boolean;
  maxRiskRespected: boolean;
}

export interface Trade {
  id: string;
  ticker: string;
  direction: TradeDirection;
  optionType: OptionType;
  setup?: string; // Strategy/Setup Name (e.g. "Bull Flag")
  entryDate: string;
  exitDate?: string;
  expirationDate?: string;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  strikePrice?: number;
  quantity: number;
  fees?: number; // Commissions & Fees
  
  // Risk Management
  targetPrice?: number;
  stopLossPrice?: number;

  pnl?: number; // Realized P&L
  notes: string;
  
  // Psychology & Discipline
  entryEmotion: Emotion;
  exitEmotion?: Emotion;
  checklist: DisciplineChecklist;
  disciplineScore: number;
  violationReason?: string;
}

export interface Metrics {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  averagePnL: number;
  disciplineScore: number;
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

export interface UserSettings {
  defaultTargetPercent: number;
  defaultStopLossPercent: number;
  maxTradesPerDay: number;
  maxRiskPerTradePercent: number;
}

export interface UserProfile {
  id: string;
  name: string;
  trades: Trade[];
  initialCapital: number;
  startDate: string;
  settings: UserSettings;
  archives: ArchivedSession[];
  
  // Security
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
}
