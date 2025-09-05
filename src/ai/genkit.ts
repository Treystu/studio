import {genkit} from 'genkit';

// IMPORTANT: We do NOT initialize any plugins here globally for production.
// Doing so would require the API key at build time, which is not available in Netlify.
// The `ai` object is used ONLY to define flows with `ai.defineFlow(...)`.
// The actual AI model initialization must happen inside each flow dynamically.
export const ai = genkit({
  plugins: [],
});
