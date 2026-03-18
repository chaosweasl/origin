import { toast } from "./toastStore";

export async function askGemini(apiKey: string, promptText: string): Promise<string | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    toast("AI request failed. Please check your API key and connection.", "error");
    return null;
  }
}

export async function generateFlashcards(apiKey: string, text: string): Promise<{ front: string; back: string }[] | null> {
  const prompt = `You are a precise study assistant. Generate flashcards from the text below.

Return ONLY a raw JSON array. No markdown fences, no preamble, no explanation — just the array.
Each object must have exactly two string fields: "front" and "back".
Aim for concise, exam-ready cards. Maximum 20 cards.

Text:
${text}`;

  const responseText = await askGemini(apiKey, prompt);

  if (!responseText) return null;

  try {
    let jsonStr = responseText.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.replace(/^```json/, "");
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```/, "");
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.replace(/```$/, "");
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Parsed result is not a non-empty array");
    }

    for (const item of parsed) {
      if (typeof item.front !== "string" || typeof item.back !== "string") {
        throw new Error("Array item missing string 'front' or 'back' field");
      }
    }

    return parsed;
  } catch (e) {
    console.error("Failed to parse flashcard JSON", e, "Raw response:", responseText);
    toast("AI returned an unexpected format. Please try again.", "error");
    return null;
  }
}

export async function summarizeCheatsheet(apiKey: string, text: string): Promise<string | null> {
  const prompt = `You are a study assistant creating a reference cheatsheet.

Summarize the text below into a strict two-column Markdown table.
- Column 1 header: Term
- Column 2 header: Definition
- Each row: one concept
- Output ONLY the Markdown table. No preamble, no explanation, no code fences.

Text:
${text}`;

  const responseText = await askGemini(apiKey, prompt);

  if (!responseText) return null;

  let outStr = responseText.trim();
  if (outStr.startsWith("```markdown")) {
    outStr = outStr.replace(/^```markdown/, "");
  } else if (outStr.startsWith("```")) {
    outStr = outStr.replace(/^```/, "");
  }
  if (outStr.endsWith("```")) {
    outStr = outStr.replace(/```$/, "");
  }
  return outStr.trim();
}
