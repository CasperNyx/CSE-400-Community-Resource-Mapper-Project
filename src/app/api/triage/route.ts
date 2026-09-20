import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 500 });
    }

    // 1. Triage with Gemini (including Threat Score)
    const prompt = `
      You are an emergency triage AI. Analyze the following distress signal and extract the structured data.
      
      Rules for Threat Score (0-10):
      - CRITICAL: If the intent is "Offer" (e.g., donating supplies), the threatScore MUST be 0.
      - 1-3: General inquiries or mild inconvenience.
      - 4-6: Urgent but not life-threatening (e.g., need food, minor structural damage).
      - 7-8: High risk (e.g., severe injury, trapped, rising flood waters).
      - 9-10: Immediate life-threatening emergency (e.g., active violence, critical medical failure).

      Respond ONLY with a valid JSON object matching this exact format:
      {
        "intent": "Need" or "Offer",
        "category": "Medical, Food, Rescue, Shelter, etc.",
        "location": "Extract the conversational location for the UI (e.g., 'roof of my house in Banani', 'Gulshan 2 roundabout')",
        "searchQuery": "The exact, official map name for OpenStreetMap. CRITICAL: You must translate conversational slang into official map terms (e.g., translate 'roundabout' to 'Circle', 'street' to 'Road'). Example: 'Gulshan 2 Circle', 'Mirpur 10'. Strip all other fluff.",
        "urgency": "High, Medium, or Low",
        "threatScore": <number between 0 and 10>
      }

      Signal: "${text}"
    `;

    // Upgraded to Gemini 3.5 Flash API endpoint
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorText}`);
    }

    const result = await geminiResponse.json();
    let rawAiText = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "{}";

    if (rawAiText.startsWith("```json")) {
      rawAiText = rawAiText.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (rawAiText.startsWith("```")) {
      rawAiText = rawAiText.replace(/```/g, "").trim();
    }

    const aiData = JSON.parse(rawAiText);

    // 2. Geocode with Nominatim
    let lat = 23.8759; // Default Dhaka latitude fallback
    let lng = 90.3795; // Default Dhaka longitude fallback

    if (aiData.location && aiData.location !== "Unknown") {
      try {
        const geoQuery = encodeURIComponent(aiData.searchQuery + ", Dhaka, Bangladesh");
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${geoQuery}`,
          { headers: { 'User-Agent': 'CSE-400-Community-Mapper/1.0' } }
        );
        const geoData = await geoRes.json();
        
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch (geoError) {
        console.warn("Server-side geocoding failed, using fallback coordinates:", geoError);
      }
    }

    // 3. Return combined payload
    return NextResponse.json({
      ...aiData,
      lat,
      lng
    });
    
  } catch (error) {
    console.error("Triage Route Error:", error);
    return NextResponse.json({ error: "Failed to process signal" }, { status: 500 });
  }
}