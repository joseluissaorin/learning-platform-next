import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini client with a placeholder API key
// The actual key will be set per request in the components
const gemini = new GoogleGenerativeAI('placeholder-key');

export default gemini; 