export const EN_RESOURCES = {
  "chat.placeholder.default.reply": "Reply to Hina...",
  "chat.placeholder.default.message": "Message Hina...",
  "chat.placeholder.default.chat": "Chat with Hina...",
  "chat.placeholder.default.today": "Tell me about today...",
  "chat.placeholder.default.mind": "What's on your mind?",
  "chat.placeholder.default.practice": "Practice English with me.",
  "chat.placeholder.default.letsChat": "Let's chat.",
  "chat.placeholder.default.day": "How's your day?",
  "chat.placeholder.default.share": "Share something with me.",
  "chat.placeholder.default.listening": "I'm listening...",
  "chat.placeholder.default.happened": "What happened today?",
  "chat.placeholder.default.teach": "Teach me something today.",
  "chat.placeholder.default.story": "Tell me a story.",
  "chat.placeholder.default.newToday": "What's new today?",
  "chat.placeholder.default.anything": "Anything on your mind?",
} as const;

export type EnglishResourceKey = keyof typeof EN_RESOURCES;
