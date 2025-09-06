
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {logger} from '@/lib/logger';
import { dynamicallyInitializeGoogleAI } from '@/ai/init';

const GenerateAlertSummaryInputSchema = z.object({
  alerts: z.array(z.string()).describe('A list of recent alert messages.'),
});
export type GenerateAlertSummaryInput = z.infer<typeof GenerateAlertSummaryInputSchema>;

const GenerateAlertSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, one-sentence summary of the most critical alert.'),
  recommendation: z.string().describe('A clear, actionable recommendation for the user.'),
});
export type GenerateAlertSummaryOutput = z.infer<typeof GenerateAlertSummaryOutputSchema>;

export async function generateAlertSummary(
  input: GenerateAlertSummaryInput
): Promise<GenerateAlertSummaryOutput> {
  return generateAlertSummaryFlow(input);
}

const alertSummaryPrompt = ai.definePrompt({
  name: 'generateAlertSummaryPrompt',
  input: {schema: GenerateAlertSummaryInputSchema},
  output: {schema: GenerateAlertSummaryOutputSchema},
  model: 'gemini-2.5-flash',
  prompt: `You are an AI assistant for an off-grid power system. Your task is to analyze a list of recent alerts, identify the most critical one, and provide a clear, one-sentence summary and a single actionable recommendation.

Here are the alerts:
{{#each alerts}}
- {{this}}
{{/each}}

1.  **Identify the most critical alert.** This is the alert that indicates the most immediate threat to the system's operation (e.g., "SoC is critically low," "Inverter is overheating," "Generator is out of fuel").

2.  **Generate a one-sentence summary.** This summary should concisely describe the critical situation.

3.  **Provide a single, clear, actionable recommendation.** This recommendation should tell the user exactly what they need to do to address the problem.

**Example:**
*   **Alerts:** ["System is online," "SoC is at 95%," "Generator is out of fuel"]
*   **Summary:** The generator is out of fuel and cannot provide backup power.
*   **Recommendation:** Refuel the generator immediately to ensure system reliability.

Now, analyze the alerts I've provided and generate the summary and recommendation.`,
});

const generateAlertSummaryFlow = ai.defineFlow(
  {
    name: 'generateAlertSummaryFlow',
    inputSchema: GenerateAlertSummaryInputSchema,
    outputSchema: GenerateAlertSummaryOutputSchema,
  },
  async input => {
    logger.info('generateAlertSummaryFlow invoked with input:', input);
    dynamicallyInitializeGoogleAI();
    const {output} = await alertSummaryPrompt(input);
    if (!output) {
      throw new Error('No output from AI');
    }
    logger.info('generateAlertSummaryFlow successful.');
    return output;
  }
);
