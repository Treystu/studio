
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';

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

const generateAlertSummaryFlow = ai.defineFlow(
  {
    name: 'generateAlertSummaryFlow',
    inputSchema: GenerateAlertSummaryInputSchema,
    outputSchema: GenerateAlertSummaryOutputSchema,
  },
  async (input) => {
    logger.info('generateAlertSummaryFlow invoked with input:', input);

    const prompt = `You are an AI assistant for an off-grid power system. Your task is to analyze a list of recent alerts, identify the most critical one, and provide a clear, one-sentence summary and a single actionable recommendation.\n\nHere are the alerts:\n${input.alerts.map(a => `- ${a}`).join('\n')}\n\n1.  **Identify the most critical alert.** This is the alert that indicates the most immediate threat to the system's operation (e.g., "SoC is critically low," "Inverter is overheating," "Generator is out of fuel").\n\n2.  **Generate a one-sentence summary.** This summary should concisely describe the critical situation.\n\n3.  **Provide a single, clear, actionable recommendation.** This recommendation should tell the user exactly what they need to do to address the problem.\n\n**Example:**\n*   **Alerts:** ["System is online," "SoC is at 95%," "Generator is out of fuel"]\n*   **Summary:** The generator is out of fuel and cannot provide backup power.\n*   **Recommendation:** Refuel the generator immediately to ensure system reliability.\n\nNow, analyze the alerts I've provided and generate the summary and recommendation.`;

    const response = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: prompt,
      output: {
        schema: GenerateAlertSummaryOutputSchema,
      },
    });

    const output = response.output;

    if (!output) {
      throw new Error('No output from AI');
    }

    logger.info('generateAlertSummaryFlow successful.');
    return output;
  }
);
