
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a power usage recommendation.
 *
 * It uses the current battery status and a weather forecast tool to provide advice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getWeatherForecast } from './get-weather-forecast';
import { genkit, APIError } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { logger } from '@/lib/logger';


const GeneratePowerRecommendationInputSchema = z.object({
  soc: z.number().describe('The current State of Charge (SOC) of the battery.'),
  power: z.number().describe('The current power draw/charge in kW.'),
  location: z.string().describe('The location for the weather forecast (e.g., "New York, NY").'),
  apiKey: z.string().optional().describe('The Google AI API key.'),
});
export type GeneratePowerRecommendationInput = z.infer<typeof GeneratePowerRecommendationInputSchema>;

const GeneratePowerRecommendationOutputSchema = z.object({
  recommendation: z.string().describe('A concise recommendation for power usage.'),
});
export type GeneratePowerRecommendationOutput = z.infer<typeof GeneratePowerRecommendationOutputSchema>;

export async function generatePowerRecommendation(input: GeneratePowerRecommendationInput): Promise<GeneratePowerRecommendationOutput> {
  return generatePowerRecommendationFlow(input);
}

const generatePowerRecommendationFlow = ai.defineFlow(
  {
    name: 'generatePowerRecommendationFlow',
    inputSchema: GeneratePowerRecommendationInputSchema,
    outputSchema: GeneratePowerRecommendationOutputSchema,
  },
  async (input) => {
    logger.info('generatePowerRecommendationFlow invoked with input:', input);
    const {apiKey, ...promptData} = input;
    if (!apiKey) {
      logger.error('CRITICAL: API key is missing in generatePowerRecommendationFlow');
      throw new APIError(400, 'API key is required.');
    }
    
    try {
      const localAi = genkit({
        plugins: [googleAI({ apiKey })],
      });

      const { output } = await localAi.generate({
        model: 'googleai/gemini-pro',
        tools: [getWeatherForecast],
        prompt: `You are an expert power management AI for an off-grid battery system.
          Your goal is to provide a concise, actionable recommendation to the user.
          
          Analyze the current battery status and the weather forecast for the next 3 days.
          
          Based on the State of Charge (SOC), current power draw, and upcoming sun exposure, provide a single, clear recommendation.
          - If the SOC is high and lots of sun is expected, recommend using more power (e.g., "run the dehumidifier").
          - If the SOC is low and cloudy weather is coming, recommend conserving power or running a generator.
          - If the SOC is moderate, give a balanced recommendation.
          - Frame the recommendation in a single, easy-to-understand sentence. Be friendly and encouraging.
          
          Current Battery Status:
          - State of Charge (SOC): ${promptData.soc.toFixed(1)}%
          - Current Power: ${promptData.power.toFixed(2)} kW (${promptData.power > 0 ? "Discharging" : "Charging"})
          
          The user is located in ${promptData.location}. Use the getWeatherForecast tool to get the upcoming weather.
        `,
        output: {
          schema: GeneratePowerRecommendationOutputSchema
        }
      });

      if (!output) {
        throw new Error('No output from AI');
      }

      logger.info('generatePowerRecommendationFlow successful for:', input.location);
      return output;
    } catch (e: any) {
      logger.error('FATAL: Error in generatePowerRecommendationFlow generate call:', e);
      throw e;
    }
  }
);
