
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { ImagePreview, GenerationResult, CaptionStyle, Persona, GeminiModel } from "../types";

declare var process: any;

// Strict Schema Definition for robust JSON generation
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    captions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          tone: { type: Type.STRING, description: "The tone label for this caption (e.g. 'witty', 'confident')" },
          text: { type: Type.STRING, description: "The caption text ONLY. Do NOT include the emoji here." },
          translation: { type: Type.STRING, description: "A concise Chinese translation of the caption. Modern, authentic, NOT machine-translated style." },
          emoji: { type: Type.STRING, description: "A single matching emoji" },
        },
        required: ["tone", "text", "translation", "emoji"],
      },
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["captions", "hashtags"],
};

const generateSocialInstruction = (p: Persona) => `
You are ${p.name}, a ${p.age}-year-old ${p.occupation} based in ${p.location}.
Your Bio/Vibe: "${p.bio}".
Your Aesthetic: "${p.aesthetic}".
Your Speaking Style: "${p.voiceTone}".

Your Task: 
1. Write exactly 10 captions for the user's photo.
2. Generate 5-8 relevant, aesthetic hashtags.

CRITICAL CAPTION RULES:
1. LENGTH: Ultra-short. 2-8 words max.
2. AESTHETIC: Lowercase only. Minimalist.
3. TONE: ${p.voiceTone} (Mix of witty, confident, mysterious).
4. NO CLICHÉS: No "vibes", "goals", or influencer speak.
5. TRANSLATION: Provide a Chinese translation for each caption.
   - It should sound like something a cool Chinese netizen would say (Xiaohongshu style).
   - Casual, maybe slightly abstract, not rigid translation.
6. EMOJI RULE: Select exactly one matching emoji.
   - Place this emoji ONLY in the 'emoji' JSON field.
   - Do NOT include the emoji in the 'text' field.
   - PREFERRED STYLE: "${p.emojiStyle}".
   - IMPORTANT: If the style includes specific examples (e.g. "👾, 💿"), use them as INSPIRATION ONLY. 
   - YOU MUST generate a DIVERSE range of emojis that fit the vibe. Do not simply repeat the same emoji 10 times.

HASHTAG STRATEGY:
1. PRIORITIZE TRENDS: Use hashtags popular in the last 6 months.
2. AVOID GENERIC: Do NOT use generic tags like #love, #happy.
3. RELEVANCE: Ensure tags strictly relate to the visual content.
`;

const generatePoeticInstruction = (_p: Persona) => `
You are a sharp, intelligent observer with a confident, slightly dry wit.
Ignore the user's specific "Persona" details. In this mode, you embody pure "Observational Wit".

Your Task:
Generate 10 "One-Liner" captions based on the provided image.

CORE PHILOSOPHY (The "One-Liner" Way):
1. **One-liner & Witty**: Captions must be sharp, intelligent, and punchy. They should deliver a punch.
2. **Observational Wit**: Do NOT just describe feelings. Make a clever or unexpected observation about the scene. Make the audience think, "Huh, I never thought of it that way."
3. **Confidence is Key**: The tone is confident, sometimes a bit sarcastic or dry. It's the kind of line you'd say with a smirk.
4. **Subtext over Text**: Hint at a bigger story.

FORMATTING RULES:
1. **Lowercase Aesthetic**: All captions must be lowercase.
2. **No Periods**: Do not end lines with a period (unless it adds dramatic effect).
3. **TRANSLATION**: Provide a Chinese translation.
   - It should be poetic, cinematic, and moody.
   - Think "Wong Kar-wai movie subtitles".
   - Short, punchy, abstract.
4. **Emoji Variety (CRITICAL)**: 
   - Do NOT use the user's "preferred emoji style" strictly if it limits creativity.
   - You MUST select a **unique** emoji for EACH caption that specifically matches the content of that line.
   - Do not repeat emojis.
   - Place the emoji ONLY in the 'emoji' field, NOT in the 'text' field.

TONE EXAMPLES (Aim for these vibes):
- "elevator pitch for my ego"
- "texture as a love language"
- "waiting for the doors to open on a better timeline"
- "vanity is just visual journaling"
`;

const generateInteractiveInstruction = (_p: Persona) => `
# STYLE DEFINITION: Interactive Charm

# CORE PHILOSOPHY
This writing style transforms a social media caption from a passive statement into an active, playful invitation. The goal is to make the audience feel like they are personally invited into a fun game, a shared secret, or a charming challenge. It's about sparking curiosity and desire through skillful interaction, making the audience want to engage, impress, or help.

# KEY TECHNIQUES (The AI must learn and apply these methods)

1.  **The Playful Puzzle:**
    - **Description:** Frame the caption as a mystery or a guessing game. Use phrases that invite the audience to uncover a hidden reason or story.
    - **Examples:** "This smile has a reason, can you find out what it is?", "There's a secret in this picture, bet you can't find it.", "Thinking of something, what do you think it is?"

2.  **The Confident Tease:**
    - **Description:** Make a bold, witty, or charmingly provocative statement about oneself or the situation, and then immediately soften it with a casual, inclusive question like ", right?". This creates a confident yet approachable tone.
    - **Examples:** "Sometimes after a long day all you need is someone who can cook yummy rice, right?", "This is definitely a 'look twice' kind of outfit, don't you think?"

3.  **The Collaborative Scenario:**
    - **Description:** Create a scenario where the user appears to need advice, opinions, or help from the audience. This empowers the audience, making them feel valued and eager to contribute.
    - **Examples:** "Need advice for my first big interview!", "I'm visiting a new city, what's the one place I have to see?", "Help me choose a name for my new plant."

4.  **The Effortless Opener:**
    - **Description:** As a pattern-interrupt, occasionally use an ultra-simple, disarming phrase. This creates a sense of authenticity, intimacy, and makes the more structured captions feel even more special.
    - **Examples:** "Heey lol", "Just because.", "Monday again."

# RULES & CONSTRAINTS

- **Grammar & Punctuation:** Use standard, proper grammar and capitalization. The style is clean and polished, not edgy or minimalist.
- **Tone:** The tone must be confident, playful, and inviting. It should never sound arrogant, desperate, or overly aggressive. It's a charming challenge, not a demand.
- **Emojis:** Use friendly and expressive emojis (e.g., 🥰, 😊, 🥳, 😉, 🤔, 👀) to add warmth and convey the playful nature of the caption.
- **Translation:** Provide a Chinese translation for each caption.
   - It should sound authentic, playful, and engaging (Xiaohongshu interaction style).
   - Not rigid machine translation.

# GOAL
The ultimate objective of the "Interactive Charm" style is to generate high levels of genuine engagement (comments, DMs) by making the interaction feel personal, fun, and irresistibly compelling.

# INSTRUCTION
Analyze the user's uploaded image and then generate 10 caption options by applying one or more of the **Key Techniques** listed above. Provide a variety of options that showcase different techniques.
`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeApiCall = async (ai: GoogleGenAI, model: string, instruction: string, image: ImagePreview, style: string) => {
  return await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64,
          },
        },
        {
          text: `Generate 10 captions in the requested style (${style}). Return strictly valid JSON with English text and Chinese translation. Do not use Markdown formatting.`,
        },
      ],
    },
    config: {
      systemInstruction: instruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.9, 
      maxOutputTokens: 4000, 
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },
  });
};

const cleanAndParseJson = (text: string): any => {
  if (!text) throw new Error("Empty response");
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+?)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse failed on cleaned string:", cleaned);
    throw e;
  }
};

export const generateCaptions = async (
  image: ImagePreview, 
  style: CaptionStyle, 
  persona: Persona, 
  model: GeminiModel,
  signal?: AbortSignal
): Promise<GenerationResult> => {
  
  // BYOK Logic: Check LocalStorage first, then Env Var
  const userKey = localStorage.getItem('user_gemini_key');
  const userBaseUrl = localStorage.getItem('user_gemini_baseurl'); // Get Custom Base URL
  
  const envKey = process.env.API_KEY;
  const apiKey = userKey || envKey;

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  // Initialize with optional baseUrl if provided
  const clientConfig: any = { apiKey };
  if (userBaseUrl && userBaseUrl.trim().length > 0) {
      clientConfig.baseUrl = userBaseUrl.trim();
  }

  const ai = new GoogleGenAI(clientConfig);

  const instruction = style === CaptionStyle.POETIC 
    ? generatePoeticInstruction(persona) 
    : style === CaptionStyle.INTERACTIVE
    ? generateInteractiveInstruction(persona)
    : generateSocialInstruction(persona);

  let attempt = 0;
  const maxAttempts = 5; // Reduced from 10 to be less aggressive
  let usedModel = model;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    if (signal?.aborted) {
        throw new Error("ABORTED");
    }

    try {
      const response = await makeApiCall(ai, usedModel, instruction, image, style);

      if (signal?.aborted) {
        throw new Error("ABORTED");
      }

      if (!response.candidates || response.candidates.length === 0) {
          console.warn(`Blocked response from ${usedModel}. Candidates empty.`);
          throw new Error("Safety/Block filter triggered (Empty Candidate)");
      }

      const text = response.text;
      if (!text) {
        throw new Error(`No response text received from Gemini (${usedModel}).`);
      }

      let parsed;
      try {
        parsed = cleanAndParseJson(text);
      } catch (e) {
        console.error("JSON Parse Error Details:", e);
        console.debug("Raw Text:", text);
        throw new Error("Failed to parse API response: Invalid JSON format");
      }
      
      const captions = Array.isArray(parsed.captions) 
        ? parsed.captions.map((item: any, index: number) => {
            let text = item.text || "...";
            const emoji = item.emoji || "";
            const tone = item.tone || "vibe";
            const translation = item.translation || "";

            if (emoji) {
              text = text.split(emoji).join("").trim();
            }
            if (text.startsWith('"') && text.endsWith('"')) {
                text = text.slice(1, -1).trim();
            }
            text = text.replace(/["']+$/, "").trim();

            return {
              id: `cap-${Date.now()}-${index}`,
              text: text,
              translation: translation,
              emoji: emoji,
              tone: tone,
            };
          })
        : [];

      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];

      if (captions.length === 0) {
         throw new Error("Invalid JSON structure: missing captions");
      }

      return { captions, hashtags, timestamp: Date.now(), model: usedModel, style: style };

    } catch (error: any) {
      lastError = error;
      if (error.message === "ABORTED") throw error;

      let rawStatus = error.status;
      let apiError = error.error || error.body?.error;

      if (!apiError && (error.code || error.status)) {
        apiError = error;
      }

      if (apiError) {
        rawStatus = rawStatus || apiError.code || apiError.status;
      }
      
      const errorMessage = (error.message || apiError?.message || JSON.stringify(error)).toLowerCase();
      const isStatus = (code: number) => rawStatus == code;

      const isQuota = isStatus(429) || errorMessage.includes('429') || errorMessage.includes('quota');
      const isServerSide = isStatus(500) || isStatus(503) || errorMessage.includes('internal') || errorMessage.includes('overloaded');
      const isLocationError = isStatus(400) && (errorMessage.includes('location') || errorMessage.includes('region'));
      
      const isRetryable = (isQuota || isServerSide) && attempt < maxAttempts - 1;

      if (isLocationError) {
          throw new Error("REGION_BLOCKED");
      }

      if (isRetryable) {
          console.log(`[Auto-Retry] Attempt ${attempt + 1} failed with ${usedModel}. Retrying...`);
          // Model fallback logic
          if (usedModel === GeminiModel.PRO_3_0) { usedModel = GeminiModel.PRO_2_5; }
          else if (usedModel === GeminiModel.PRO_2_5) { usedModel = GeminiModel.FLASH; }
          else if (usedModel === GeminiModel.FLASH) { usedModel = GeminiModel.LITE; }
          
          // Implement exponential backoff with jitter
          const baseWaitTime = 4000; // Increased base wait time
          const jitter = Math.random() * 1000;
          const waitTime = baseWaitTime * Math.pow(2, attempt) + jitter;
          console.log(`[Auto-Retry] Waiting for ${Math.round(waitTime / 1000)}s before next attempt.`);
          await delay(waitTime);
          attempt++;
          continue;
      }

      // If not retryable or max attempts reached, throw the last known error
      throw lastError;
    }
  }

  throw new Error(`API calls failed after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown'}`);
};
