import { normalizeLanguageTips } from "../../shared/languageTips.js";
import { buildProactivePrompt } from "../proactive.js";
import type { ChatMessageInput, LanguagePartnerProvider } from "./types.js";

export class DemoLanguagePartnerProvider implements LanguagePartnerProvider {
  async chat(messages: ChatMessageInput[]) {
    const lastUser = [...messages].reverse().find((message) => message.role === "user")?.text ?? "hello";
    return {
      response: `I am in local demo mode, but I still heard you: "${lastUser}". If Hina had a tiny passport stamp for this sentence, she would add glitter.`,
      tips: normalizeLanguageTips([
        {
          type: "correction",
          title: "Tiny naturalness note",
          body: "For local testing, Hina keeps this as a gentle placeholder until ARK_API_KEY is configured.",
        },
        {
          type: "expression",
          title: "Phrase to steal",
          body: "\"I still heard you\" is a warm way to say your message came through.",
        },
      ]),
    };
  }

  async draftProactiveOpener(input: Parameters<LanguagePartnerProvider["draftProactiveOpener"]>[0]) {
    return this.chat([{ role: "user", text: buildProactivePrompt(input) }]);
  }

  async draftMoment(input: Parameters<LanguagePartnerProvider["draftMoment"]>[0]) {
    return {
      body: "I found a sunlit corner in the library today, read exactly four pages, and rewarded this heroic achievement with peach gummies. Academic excellence is a flexible concept. 📚🍑",
      occasion: input.occasion ?? null,
    };
  }

  async speak() {
    return null;
  }
}
