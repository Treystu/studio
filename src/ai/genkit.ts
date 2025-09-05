import {genkit} from 'genkit';
import {config} from 'dotenv';

config();

// Log to confirm that the server-side environment variable is being read.
console.log(
  'Initializing Genkit... GEMINI_API_KEY available on server:',
  !!process.env.GEMINI_API_KEY
);
if (!process.env.GEMINI_API_KEY) {
  console.log(
    'GEMINI_API_KEY environment variable is not set on the server.'
  );
}

// IMPORTANT: We do NOT initialize the googleAI() plugin here globally for production.
// Doing so would require the API key at build time, which is not available in Netlify.
// Instead, each flow will dynamically initialize its own instance of the googleAI
// service using the API key passed in from the client.
// The `ai` object is used to define flows, prompts, etc.
export const ai = genkit({
  plugins: [],
});
