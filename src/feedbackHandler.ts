import { ChatOpenAI } from "langchain/chat_models/openai"; // Adjusted path for version 0.0.179
import { PromptTemplate } from "langchain/prompts";
import * as dotenv from "dotenv";
dotenv.config();

const model = new ChatOpenAI({ temperature: 0 });

const prompt = PromptTemplate.fromTemplate(`
Analyze this customer feedback:
"{feedback}"

Classify:
- Sentiment (positive/neutral/negative)
- Urgency (low/medium/high)

Respond as JSON with fields "sentiment" and "urgency".
`);

export async function enrichFeedback(
  feedback: string
): Promise<{ sentiment: string; urgency: string }> {
  const formatted = await prompt.format({ feedback });
  const response = await model.invoke(formatted);

  const json = JSON.parse(response.content.trim());
  return json;
}
