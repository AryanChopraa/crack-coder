"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScreenshots = processScreenshots;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
dotenv_1.default.config();
let openai = null;
let language = process.env.LANGUAGE || "Python";
function updateConfig(config) {
    if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
    }
    try {
        openai = new openai_1.default({
            apiKey: config.apiKey.trim(),
        });
        language = config.language || 'Python';
        // console.log('OpenAI client initialized with new config');
    }
    catch (error) {
        console.error('Error initializing OpenAI client:', error);
        throw error;
    }
}
// Initialize with environment variables if available
if (process.env.OPENAI_API_KEY) {
    try {
        updateConfig({
            apiKey: process.env.OPENAI_API_KEY,
            language: process.env.LANGUAGE || 'Python'
        });
    }
    catch (error) {
        console.error('Error initializing OpenAI with environment variables:', error);
    }
}
async function processScreenshots(screenshots) {
    if (!openai) {
        throw new Error('OpenAI client not initialized. Please configure API key first. Click CTRL/CMD + P to open settings and set the API key.');
    }
    try {
        const messages = [
            {
                role: "system",
                content: `You are an expert coding interview assistant. Analyze the coding question from the screenshots and provide a solution in ${language}.
                 Return the response in the following JSON format:
                 {
                   "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words",
                   "code": "The complete solution code",
                   "timeComplexity": "Big O analysis of time complexity with the reason",
                   "spaceComplexity": "Big O analysis of space complexity with the reason"
                 }`
            },
            {
                role: "user",
                content: [
                    { type: "text", text: "Here is a coding interview question. Please analyze and provide a solution." }
                ]
            }
        ];
        // Add screenshots as image URLs
        for (const screenshot of screenshots) {
            const base64Image = await promises_1.default.readFile(screenshot.path, { encoding: 'base64' });
            messages.push({
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/png;base64,${base64Image}`
                        }
                    }
                ]
            });
        }
        // Get response from OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: "json_object" }
        });
        const content = response.choices[0].message.content || '{}';
        return JSON.parse(content);
    }
    catch (error) {
        console.error('Error processing screenshots:', error);
        throw error;
    }
}
exports.default = {
    processScreenshots,
    updateConfig
};
