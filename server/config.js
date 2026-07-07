import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the project root .env regardless of where npm is run from
// Note: '..' assumes this file is inside a folder like 'server/' or 'src/' 
// and the .env is out in the root directory.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export const PORT = process.env.PORT || 5001;

// Prioritize standard backend keys, fall back to VITE_ prefixed keys if necessary
export const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
export const groqApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
export const scraperApiKey = process.env.SCRAPERAPI_KEY || process.env.VITE_SCRAPERAPI_KEY;

// Fail-fast checks to ensure the server doesn't run in a broken state
if (!apiKey) {
  throw new Error('CRITICAL: GEMINI_API_KEY is completely missing from process.env');
}
if (!groqApiKey) {
  throw new Error('CRITICAL: GROQ_API_KEY is completely missing from process.env');
}
if (!scraperApiKey) {
  console.warn('[Warning] SCRAPERAPI_KEY is missing in environment');
}

// Safely instantiate now that apiKey is guaranteed to exist
export const genAI = new GoogleGenerativeAI(apiKey);
export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';