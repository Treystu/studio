
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

// IMPORTANT: We do NOT initialize any plugins here globally for production.
// Doing so would require the API key at build time, which is not available in Netlify.
// The `ai` object is used ONLY to define flows with `ai.defineFlow(...)`.
// The actual AI model initialization must happen inside each flow dynamically.
export const ai = genkit({
  plugins: [],
});
