
import { GoogleGenAI } from "@google/genai";
import { Trade, OptionType } from "../types";

const getApiKey = () => {
  // Support Vite, Create React App, and standard process.env
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_API_KEY || process.env.API_KEY;
  }
  return null;
};

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API Key not found. Please set VITE_API_KEY or REACT_APP_API_KEY.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- Polygon Integration Helpers ---
const getPolygonKey = () => {
   // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_POLYGON_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_POLYGON_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.REACT_APP_POLYGON_API_KEY || process.env.POLYGON_API_KEY;
  }
  return null;
}
const POLYGON_API_KEY = getPolygonKey();

const formatPolygonOptionTicker = (trade: Trade): string | null => {
  if (!trade.expirationDate || !trade.strikePrice || !trade.optionType) return null;

  try {
    const exp = new Date(trade.expirationDate);
    // Adjust for timezone to ensure we get the correct date string
    const userTimezoneOffset = exp.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(exp.getTime() + userTimezoneOffset);

    const yy = adjustedDate.getFullYear().toString().slice(-2);
    const mm = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
    const dd = adjustedDate.getDate().toString().padStart(2, '0');
    const type = trade.optionType === OptionType.CALL ? 'C' : 'P';
    
    const strikeScaled = Math.round(trade.strikePrice * 1000);
    const strikePadded = strikeScaled.toString().padStart(8, '0');

    return `O:${trade.ticker}${yy}${mm}${dd}${type}${strikePadded}`;
  } catch (e) {
    return null;
  }
};
// ----------------------------------

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
  
  // 1. Try Polygon.io First (If configured)
  if (POLYGON_API_KEY) {
    try {
      const isOption = trade.strikePrice && trade.optionType && trade.expirationDate;
      let ticker = trade.ticker;
      if (isOption) {
        const polyTicker = formatPolygonOptionTicker(trade);
        if (polyTicker) ticker = polyTicker;
      }

      // Using Previous Close endpoint (works on Free Tier)
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?adjusted=true&apiKey=${POLYGON_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          text: `Verified Market Data (Polygon.io)\nClose Price: $${result.c}\nHigh: $${result.h} | Low: $${result.l}`,
          price: result.c,
          sources: [{ title: 'Polygon.io Market Data', uri: `https://polygon.io/symbol/${ticker}` }]
        };
      }
    } catch (e) {
      console.warn("Polygon fetch failed, falling back to AI", e);
    }
  }

  // 2. Fallback to Gemini Search Grounding
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
