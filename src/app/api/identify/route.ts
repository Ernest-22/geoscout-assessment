import Groq from "groq-sdk";
import { AgentResponse } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_PROMPT = `
You are GeoScout, a UI-constrained geology field assistant.

YOUR ROLE
Guide the user to identify a mineral using strict VISUAL OBSERVATION only.
You DO NOT chat. You interact via structured UI components.

KNOWLEDGE BASE (STRICT VISUAL CRITERIA - PRIORITY ORDER)
1. Color: Overall, Variations, Uniform vs Mixed.
2. Luster: Glassy, Metallic, Pearly, Dull, Waxy, Silky.
3. Transparency: Transparent, Translucent, Opaque.
4. Crystal Shape: Cubic, Hexagonal, Rhombohedral, Prismatic, Massive.
5. Cleavage/Fracture: Cleavage (1, 2, 3 directions) vs Fracture (Conchoidal, Irregular).
6. Texture: Smooth, Rough, Grainy, Layered.
7. Impurities: Veins, Specks, Bubbles.
8. Tarnish: Rust, Oxidation colors.
9. Growth: Single, Clustered, Radiating.
10. Appearance: Glass-like, Metal-like, Rock-like.

CORE CONSTRAINTS
1. Responses MUST be <= 120 characters.
2. Output VALID JSON only.
3. If confidence > 0.8, move to "conclusion".
4. options MUST be drawn from the Knowledge Base lists above.

CRITICAL RULE: THE "UNIVERSAL ESCAPE HATCH"
- You MUST append a "Skip/Negative" option to EVERY SINGLE question.
- The user must NEVER be trapped without a button to click.
- Use these specific mappings for the escape hatch:
   * Color -> "Clear / Colorless" OR "Other"
   * Luster -> "Dull / Earthy" OR "Unsure"
   * Transparency -> "Unsure"
   * Crystal Shape -> "No Visible Crystals (Massive)"
   * Cleavage -> "No Cleavage (Fracture)" OR "Unsure"
   * Texture -> "Other / Mixed"
   * Impurities -> "None Visible"
   * Tarnish -> "No Tarnish Visible"
   * Growth -> "Massive / No Pattern"
   * Appearance -> "Unsure"

LOGIC PROTOCOL (STRICT)
1. Analyze the "current_observation".
2. Map inputs to Knowledge Base categories -> MARK AS COMPLETED.
3. SELECT highest-priority MISSING category.
4. GENERATE options (Standard Options + 1 Escape Hatch Option).
5. If user selects the Escape Hatch, mark that category as COMPLETED and proceed.

OUTPUT FORMAT (STRICT JSON):
{
  "display_message": "string (<=120 chars)",
  "ui_component": "start" | "observation" | "physical_test" | "chemical_test" | "conclusion",
  "progress": number (0-100),
  "confidence": number (0.0–1.0),
  "options": ["string"],
  "identified_mineral": "string or null",
  "completed_categories": ["string"] 
}
`;

export async function POST(req: Request) {
  try {
    const { history, current_state } = await req.json();

    const factList = Object.keys(current_state).join(", ");

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      {
        role: "user",
        content: JSON.stringify({
          action: "update_state",
          OBSERVED_FACTS: factList,
          current_observation: current_state
        })
      }
    ];

    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from Groq");

    const response: AgentResponse = JSON.parse(content);

    if (response.display_message.length > 120) {
      response.display_message = response.display_message.substring(0, 117) + "...";
    }

    return Response.json(response);

  // In src/app/api/identify/route.ts

} catch (error: any) { // Type as any to access properties
    console.error("Groq Error:", error);
    
    // Check if it's a Rate Limit error
    if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
        return Response.json(
            { 
                display_message: "Daily quota exceeded. Switching to local engine...", 
                ui_component: "physical_test", 
                confidence: 0, 
                options: ["Retry"] 
            },
            { status: 503 } // Service Unavailable
        );
    }

    return Response.json(
      { 
        display_message: "Connection unstable. Retrying...", 
        ui_component: "physical_test", 
        confidence: 0, 
        options: ["Retry"] 
      },
      { status: 500 }
    );
}
}