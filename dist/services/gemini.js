"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScreenshots = processScreenshots;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
dotenv_1.default.config();
let genAI = null;
let model = null;
let language = process.env.LANGUAGE || "Python";
function updateConfig(config) {
    if (!config.apiKey) {
        throw new Error("Google API key is required");
    }
    try {
        language = config.language || "Python";
        genAI = new generative_ai_1.GoogleGenerativeAI(config.apiKey.trim());
        model = genAI.getGenerativeModel({
            model: "gemini-1.5-pro",
        });
    }
    catch (error) {
        console.error("Error initializing Gemini client:", error);
        throw error;
    }
}
if (process.env.GOOGLE_API_KEY) {
    try {
        updateConfig({
            apiKey: process.env.GOOGLE_API_KEY,
            language: process.env.LANGUAGE || "Python",
        });
    }
    catch (error) {
        console.error("Error initializing Gemini with environment variables:", error);
    }
}
async function processScreenshots(screenshots) {
    if (!genAI || !model) {
        throw new Error("Gemini client not initialized. Please configure API key first. Click CTRL/CMD + P to open settings and set the API key.");
    }
    try {
        const parts = [];
        parts.push({
            text: `Here is a coding interview question. Please analyze and provide a solution in ${language}.
      
      Format your response with the following CLEARLY LABELED sections:
      
      === APPROACH ===
      [Your detailed explanation of the approach]
      
      === CODE ===
      [The complete solution code]
      
      === TIME COMPLEXITY ===
      [Big O analysis of time complexity]
      
      === SPACE COMPLEXITY ===
      [Big O analysis of space complexity]
      
      Please keep these exact section headings to make parsing easier.`,
        });
        for (const screenshot of screenshots) {
            const imageBytes = await promises_1.default.readFile(screenshot.path);
            parts.push({
                inlineData: {
                    data: Buffer.from(imageBytes).toString("base64"),
                    mimeType: "image/png",
                },
            });
        }
        let result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts,
                },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2000,
            },
        });
        const response = await result.response;
        const responseText = response.text();
        const approachMatch = responseText.match(/===\s*APPROACH\s*===\s*([\s\S]*?)(?===\s*CODE\s*===|$)/i);
        const codeMatch = responseText.match(/===\s*CODE\s*===\s*([\s\S]*?)(?===\s*TIME COMPLEXITY\s*===|$)/i);
        const timeMatch = responseText.match(/===\s*TIME COMPLEXITY\s*===\s*([\s\S]*?)(?===\s*SPACE COMPLEXITY\s*===|$)/i);
        const spaceMatch = responseText.match(/===\s*SPACE COMPLEXITY\s*===\s*([\s\S]*?)(?=$)/i);
        result = {
            approach: approachMatch
                ? approachMatch[1].trim()
                : "No approach provided",
            code: codeMatch ? codeMatch[1].trim() : "No code provided",
            timeComplexity: timeMatch
                ? timeMatch[1].trim()
                : "No time complexity analysis provided",
            spaceComplexity: spaceMatch
                ? spaceMatch[1].trim()
                : "No space complexity analysis provided",
        };
        if (!approachMatch && !codeMatch && !timeMatch && !spaceMatch) {
            console.log("Failed to extract structured sections, trying alternative parsing...");
            const altApproachMatch = responseText.match(/(?:Approach|Solution approach|My approach)[:]*\s*([\s\S]*?)(?=(?:Code|Solution code|Implementation|Time|Space)[:]*\s*|$)/i);
            const altCodeMatch = responseText.match(/(?:Code|Solution code|Implementation)[:]*\s*([\s\S]*?)(?=(?:Approach|Time|Space)[:]*\s*|$)/i);
            const altTimeMatch = responseText.match(/(?:Time complexity|Time analysis|Complexity analysis \(time\))[:]*\s*([\s\S]*?)(?=(?:Approach|Code|Space)[:]*\s*|$)/i);
            const altSpaceMatch = responseText.match(/(?:Space complexity|Space analysis|Complexity analysis \(space\))[:]*\s*([\s\S]*?)(?=(?:Approach|Code|Time)[:]*\s*|$)/i);
            if (altApproachMatch)
                result.approach = altApproachMatch[1].trim();
            if (altCodeMatch)
                result.code = altCodeMatch[1].trim();
            if (altTimeMatch)
                result.timeComplexity = altTimeMatch[1].trim();
            if (altSpaceMatch)
                result.spaceComplexity = altSpaceMatch[1].trim();
            if (!altApproachMatch &&
                !altCodeMatch &&
                !altTimeMatch &&
                !altSpaceMatch) {
                return {
                    approach: "Failed to parse response. Raw output:\n\n" +
                        responseText.substring(0, 1000),
                    code: "// Could not extract code from the response",
                    timeComplexity: "Unknown (parsing failed)",
                    spaceComplexity: "Unknown (parsing failed)",
                };
            }
        }
        return result;
    }
    catch (error) {
        console.error("Error processing screenshots with Gemini:", error);
        return {
            approach: "An error occurred while processing with Gemini. Please try again or check your API key.",
            code: "// Error: " + (error instanceof Error ? error.message : String(error)),
            timeComplexity: "Error occurred",
            spaceComplexity: "Error occurred",
        };
    }
}
exports.default = {
    processScreenshots,
    updateConfig,
};
