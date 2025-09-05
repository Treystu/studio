
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a set of actionable insights for the dashboard when viewing fresh data.
 *
 * - generateDashboardInsights - A function that triggers the insight generation.
 * - GenerateDashboardInsightsInput - The input type for the function.
 * - GenerateDashboardInsightsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {logger} from '@/lib/logger';
import {getWeatherForecast} from './generate-power-recommendation'; // Re-using the weather tool
import { dynamicallyInitializeGoogleAI } from '@/ai/init';

const InsightSchema = z.object({
  title: z.string().describe('The short, headline-style question for the insight (e.g., "Will I Need the Generator?").'),
  explanation: z.string().describe('The detailed, multi-sentence answer to the question.'),
  icon: z.string().describe('A relevant Lucide icon name (e.g., "BatteryWarning", "Sun", "Droplets", "Lightbulb").'),
});

const GenerateDashboardInsightsInputSchema = z.object({
  latestData: z.object({
    soc: z.number(),
    power: z.number(),
  }),
  location: z.string(),
});
export type GenerateDashboardInsightsInput = z.infer<typeof GenerateDashboardInsightsInputSchema>;

const GenerateDashboardInsightsOutputSchema = z.object({
  insights: z.array(InsightSchema),
});
export type GenerateDashboardInsightsOutput = z.infer<typeof GenerateDashboardInsightsOutputSchema>;

export async function generateDashboardInsights(
  input: GenerateDashboardInsightsInput
): Promise<GenerateDashboardInsightsOutput> {
  return generateDashboardInsightsFlow(input);
}

const insightsPrompt = ai.definePrompt({
  name: 'generateDashboardInsightsPrompt',
  input: {schema: GenerateDashboardInsightsInputSchema},
  output: {schema: GenerateDashboardInsightsOutputSchema},
  tools: [getWeatherForecast],
  model: 'googleai/gemini-2.5-flash',
  prompt: `You are an expert power management AI for an off-grid battery system. Your goal is to provide actionable, forward-looking insights based on the battery's current state and the weather forecast.

Analyze the user's situation based on the provided data and the weather forecast obtained from the available tool. Generate exactly four insights to answer the following key questions. Be insightful and look ahead 24-48 hours.

1.  **Will I need to run the generator?**
    *   Analyze the current State of Charge (SOC).
    *   Look at the weather forecast for the next 2-3 days. If the SOC is low (e.g., under 50%) and the forecast shows multiple days of low sun_hours (e.g., under 4), the user will likely need the generator.
    *   Advise them to prepare and perhaps stock up on gasoline. If the SOC is high and the weather is sunny, state that the generator will likely not be needed.

2.  **Was solar charge comparable to expected?**
    *   (This is a trick question, as we don't have past solar data). Frame the answer for the *upcoming* day.
    *   Based on tomorrow's weather forecast (sun_hours), set an expectation. For example: "With 8 sun hours forecasted, expect a strong charge tomorrow." or "With only 3 sun hours expected, solar input will be limited."

3.  **Was power consumption comparable to expected?**
    *   (This is also a trick question about the past). Frame the answer based on the *current* power draw.
    *   A 'normal' base load for a house is typically under 1 kW. If the current power draw is high (e.g., > 2 kW), note that consumption is currently high. If it's low (e.g., < 0.5 kW), mention that consumption is low. Relate this to how it will affect the battery overnight.

4.  **Opportunity Alert / Efficiency Tip**
    *   Provide one more relevant, forward-looking insight.
    *   If the next few days are very sunny, suggest it's a great time to run heavy appliances (laundry, etc.).
    *   If the weather is poor, suggest conserving energy by deferring non-essential loads.
    *   If the system looks balanced, provide a general efficiency tip.

**Current Situation:**
*   Location: {{{location}}}
*   State of Charge (SOC): {{{latestData.soc}}}%
*   Current Power Draw: {{{latestData.power}}} kW

Use the tools available to get the weather forecast to inform your answers. Structure your response in the requested JSON format with exactly four insights.`,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema,
    outputSchema: GenerateDashboardInsightsOutputSchema,
  },
  async input => {
    logger.info('generateDashboardInsightsFlow invoked with input:', input);
    dynamicallyInitializeGoogleAI();

    const {output} = await insightsPrompt(input);
    if (!output) {
      throw new Error('No output from AI');
    }
    logger.info('generateDashboardInsightsFlow successful.');
    return output;
  }
);
