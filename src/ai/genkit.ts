import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

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

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
