import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text } = body;

    const prompt = `
      Analyze the following unstructured crisis text and extract the information strictly as a JSON object.
      The JSON must contain exact keys:
      - "intent": strict string value of either "Need" or "Offer".
      - "category": strict string value (e.g., "Medical", "Food", "Shelter", "Rescue", "Other").
      - "urgency": strict string value of either "Low", "Medium", "High", or "Critical".
      - "location": the neighborhood or landmark string mentioned.

      Text to analyze: "${text}"
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
            responseMimeType: "application/json", 
        }
    });

    const jsonResult = JSON.parse(response.text || "{}");

    return NextResponse.json(jsonResult);
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    return NextResponse.json({ error: "Failed to parse distress signal" }, { status: 500 });
  }
}