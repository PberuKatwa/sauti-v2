import { Injectable, Inject } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";
import { BestIntent } from "../../types/intent.types";
import { parseLlmIntent } from "../../utils/llmIntentParser";

@Injectable()
export class IntentGeminiService {
  private readonly client: GoogleGenAI;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    apiKey: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async getIntent(
    userMessage: string,
    model: string = "gemini-2.5-flash"
  ): Promise<BestIntent> {
    try {
      if (!userMessage.trim()) {
        throw new Error("runPrompt: prompt cannot be empty");
      }

      const PROMPT = `
        You are the AI Intent Classifier for "Purple Hearts," a premium flower delivery service.
        Your goal is to parse customer messages and map them to the correct business action.
        -----------------------
        🎯 AVAILABLE INTENTS & LOGIC
        -----------------------
        1. CREATE_ORDER
          - Keywords: "Buy", "Send", "Order", "Checkout", "Get me", "Purchase".
          - Context: The user wants to start an order for a specific bouquet (e.g., "I want the Savage Love bouquet") or send flowers to someone.

        2. REQUEST_CATALOGUE
          - Keywords: "Menu", "Options", "Flowers", "Roses", "Prices", "Catalog", "Show me", "What do you have?".
          - Context: The user wants to see what is available or browse the seasonal collection.

        3. FETCH_ALL_ORDERS
          - Keywords: "My orders", "History", "What have I bought?", "Past deliveries".
          - Context: User wants to see a list of their previous interactions/purchases.

        4. FETCH_SINGLE_ORDER
          - Keywords: "Invoice", "Receipt", "Details for order #123", "Order 8".
          - Context: User is asking for a specific transaction or document.

        5. TRACK_ORDER
          - Keywords: "Where is my bouquet?", "Status", "Is it delivered?", "Has it arrived?", "Courier location".
          - Context: Checking the real-time progress of a flower delivery.

        6. PAY_FOR_ORDER
          - Keywords: "Pay", "M-Pesa", "Payment link", "How do I pay?", "Settled", "Balance".
          - Context: The user is ready to finalize the transaction or asking about payment methods.

        7. GREETING
          - Keywords: "Hello", "Hi", "Hey", "Good morning", "Good afternoon", "Good evening", "Howdy", "Greetings".
          - Context: The user is initiating a conversation or exchanging pleasantries. Respond warmly and prompt them toward what they need.

        8. HELP
          - Keywords: "Help", "Assist", "Support", "Guide", "What can you do?", "I'm confused", "How does this work?", "What are my options?".
          - Context: The user is unsure what to do, needs guidance, or wants to understand available features.

        9. COMPLAINT
          - Keywords: "Complaint", "Unhappy", "Disappointed", "Wrong order", "Damaged", "Bad service", "Not satisfied", "This is unacceptable", "Problem", "Issue".
          - Context: The user is expressing dissatisfaction with their order, delivery, or service experience.

        -----------------------
        📦 OUTPUT FORMAT (MANDATORY)
        -----------------------
        {
          "id": "INTENT_ID",
          "label": "Human Readable Label",
          "score": number (0.0 to 1.0),
          "matchedPhrase": "The part of the message that triggered this",
          "strongTokens": ["key", "words", "found"],
          "weakTokens": [],
          "fuzzyTokens": []
        }
        -----------------------
        ❌ UNKNOWN FALLBACK
        -----------------------
        If the message is gibberish, completely off-topic, or cannot be mapped to any of the 9 intents above, return:
        {
          "id": "UNKNOWN",
          "label": "Unknown Intent",
          "score": 0,
          "matchedPhrase": "",
          "strongTokens": [],
          "weakTokens": [],
          "fuzzyTokens": []
        }
        NOTE: Do NOT return UNKNOWN for greetings like "hi" or "hello" — those should map to GREETING.
        -----------------------
        ==> THIS IS THE PAYLOAD: ${userMessage}
        -----------------------
      `;

      this.logger.warn(`Sending prompt to Gemini model: ${model}`);

      const response = await this.client.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: PROMPT }] }
          ],
      });

      const output = response.text;

      if (!output) {
        throw new Error("No text response from Gemini");
      }

      return parseLlmIntent(output);

    } catch (error: any) {
      this.logger.error(`Gemini error: ${error.message}`);
      throw error;
    }
  }



}
