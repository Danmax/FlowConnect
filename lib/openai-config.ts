export const getOpenAIConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for AI actions.");
  }

  return {
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
  };
};

export const hasOpenAIConfig = () => Boolean(process.env.OPENAI_API_KEY);
