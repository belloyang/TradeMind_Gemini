import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getTradingCoaching = async (trades: Trade[]): Promise<string> => {
  const client = getClient();
  if (!client) return "AI Coach is offline. Please check your API Key configuration.";

  const recentTrades = trades.slice(0, 10);
  const tradeSummary = JSON.stringify(recentTrades.map(t => ({
    ticker: t.ticker,
    strategy: t.strategy,
    pnl: t.pnl,
    emotion: t.entryEmotion,
    discipline: t.disciplineScore,
    notes: t.notes
  })));

  const prompt = `
    You are an elite trading performance psychologist and risk manager.
    Analyze these recent trades: ${tradeSummary}

    Provide a concise (max 150 words) coaching insight.
    Focus on:
    1. Correlation between emotions and P/L.
    2. Discipline breaches and their impact.
    3. One actionable tip for the next trading session.
    
    Do not format as a letter. Just give the insight directly using Markdown.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    return response.text || "No insight generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm currently analyzing the markets (API Error). Try again later.";
  }
};