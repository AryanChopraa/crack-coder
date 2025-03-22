// @ts-nocheck
import dotenv from "dotenv";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;
let language = process.env.LANGUAGE || "Python";

interface Config {
  apiKey: string;
  language: string;
}

function updateConfig(config: Config) {
  if (!config.apiKey) {
    throw new Error("Gemini API key is required");
  }

  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-pro-exp-02-05" });
    language = config.language || "Python";
  } catch (error) {
    console.error("Error initializing Gemini client:", error);
    throw error;
  }
}

// Initialize with environment variables if available

console.log({
  key: process.env.GEMINI_API_KEY,
  language: process.env.LANGUAGE
});
if (process.env.GEMINI_API_KEY) {
  try {
    updateConfig({
      apiKey: process.env.GEMINI_API_KEY,
      language: process.env.LANGUAGE || "Python"
    });
  } catch (error) {
    console.error(
      "Error initializing Gemini with environment variables:",
      error
    );
  }
}

interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export async function processScreenshots(
  screenshots: { path: string }[]
): Promise<ProcessedSolution> {
  if (!genAI || !model) {
    throw new Error(
      "Gemini client not initialized. Please configure API key first. Click CTRL/CMD + P to open settings and set the API key."
    );
  }

  try {
    // Create the prompt text
    const systemPrompt = `You are an expert coding interview assistant. Analyze the coding question from the screenshots and provide a solution in ${language}.
                 Return the response in the following JSON format:
                 {
                   "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words",
                   "code": "The complete optimal solution code",
                   "timeComplexity": "Big O analysis of time complexity with the reason",
                   "spaceComplexity": "Big O analysis of space complexity with the reason"
                 }`;

    const userText =
      "Here is a coding interview question. Please analyze and provide a solution.";

    // Prepare content parts for Gemini
    const parts = [{ text: systemPrompt + "\n\n" + userText }];

    // Add screenshots as image parts
    for (const screenshot of screenshots) {
      const imageData = await fs.readFile(screenshot.path);
      parts.push({
        inlineData: {
          data: Buffer.from(imageData).toString("base64"),
          mimeType: "image/png"
        }
      });
    }

    // Generate content with Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts }]
    });

    const response = result.response;
    const content = response.text();

    // Extract JSON from the response
    const jsonMatch =
      content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);

    const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;

    return JSON.parse(jsonContent) as ProcessedSolution;
  } catch (error) {
    console.error("Error processing screenshots:", error);
    throw error;
  }
}

export default {
  processScreenshots,
  updateConfig
};
