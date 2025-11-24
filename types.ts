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
  riskDefined: boolean;
  sizeWithinLimits: boolean;
  ivConditionsMet: boolean;
  emotionalStateCheck: boolean;
}

export interface Trade {
  id: string;
  ticker: string;
  direction: TradeDirection;
  optionType: OptionType;
  entryDate: string;
  exitDate?: string; // New: Track when trade was closed
  expirationDate?: string;
  status: TradeStatus;
  entryPrice: number;
  exitPrice?: number;
  strikePrice?: number;
  quantity: number;
  
  // Risk Management
  targetPrice?: number;
  stopLossPrice?: number;

  pnl?: number; // Realized P&L
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

export interface UserSettings {
  defaultTargetPercent: number;
  defaultStopLossPercent: number;
  maxTradesPerDay: number;
}

export interface UserProfile {
  id: string;
  name: string;
  trades: Trade[];
  initialCapital: number;
  startDate: string;
  settings: UserSettings;
  archives: ArchivedSession[];
}