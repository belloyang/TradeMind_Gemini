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
    type: `${t.direction} ${t.optionType}`,
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

export const getPriceEstimate = async (trade: Trade): Promise<{ text: string; price?: number; sources?: {title: string, uri: string}[] }> => {
  const client = getClient();
  if (!client) return { text: "API Key configuration missing." };

  const isOption = trade.strikePrice && trade.optionType && trade.expirationDate;
  
  let query = "";
  if (isOption) {
    query = `Current price of ${trade.ticker} ${trade.strikePrice} ${trade.optionType} expiring ${trade.expirationDate}`;
  } else {
    query = `Current stock price of ${trade.ticker}`;
  }

  const prompt = `
    Search for the current market price for: "${query}".
    
    If it is an option contract, try to find the specific "Last Price" or "Premium". 
    If exact option data is not found or is outdated, strictly return the current underlying stock price of ${trade.ticker} and explicitly state that it is the underlying price.

    Output format:
    "Price: $[number]"
    "Summary: [Brief details about what was found (e.g. 'Option last price' or 'Underlying stock price')]"
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "No results found.";
    
    // Simplistic price extraction from the AI's formatted response
    const priceMatch = text.match(/Price:\s*\$([0-9,]+\.?[0-9]*)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    // Extract sources from grounding metadata
    // @ts-ignore - groundingMetadata types might be inferred differently depending on SDK version
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => c.web)
      .filter((w: any) => w && w.uri && w.title);

    return { text, price, sources };
  } catch (error) {
    console.error("Search Error:", error);
    return { text: "Unable to search market data at this time." };
  }
};

export const getCurrentVix = async (): Promise<{ value: number; timestamp: string } | null> => {
  const client = getClient();
  if (!client) return null;

  const prompt = `
    Find the current CBOE Volatility Index (VIX) value right now.
    Return ONLY the numeric value (e.g., 18.45). Do not add any text.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    // Try to parse the first number found
    const match = text.match(/([0-9]+\.?[0-9]*)/);
    if (match) {
      return {
        value: parseFloat(match[1]),
        timestamp: new Date().toISOString()
      };
    }
    return null;
  } catch (error) {
    console.error("VIX Fetch Error:", error);
    return null;
  }
};