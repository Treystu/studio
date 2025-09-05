
'use server';

/**
 * @fileOverview This file defines a Genkit flow to generate a power usage recommendation.
 *
 * It uses the current battery status and a weather forecast tool to provide advice.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { genkit, APIError } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { logger } from '@/lib/logger';

// == Weather Tool Definition (Co-located) == //

const weatherForecastSchema = z.object({
  days: z.array(
    z.object({
      day: z.string().describe('The day of the week (e.g., "Monday").'),
      high: z.number().describe('The high temperature in Celsius.'),
      low: z.number().describe('The low temperature in Celsius.'),
      conditions: z
        .string()
        .describe(
          'A brief description of the weather conditions (e.g., "Sunny", "Partly Cloudy", "Rain").'
        ),
      sun_hours: z
        .number()
        .describe(
          'The predicted number of direct sun hours, taking into account cloud cover.'
        ),
    })
  ),
});

const getWeatherForecast = ai.defineTool(
  {
    name: 'getWeatherForecast',
    description: 'Returns a 3-day weather forecast for a given location.',
    inputSchema: z.object({
      location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    }),
    outputSchema: weatherForecastSchema,
  },
  async ({ location }) => {
    console.log(`Getting weather forecast for ${location}`);
    // In a real app, you would call a weather API here.
    // For this example, we'll return a mock forecast.
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Simulate a forecast based on location
    if (location.toLowerCase().includes('pahoa')) {
        return {
           days: [
               { day: days[today.getDay()], high: 28, low: 21, conditions: 'Mostly Sunny', sun_hours: 8.5 },
               { day: days[(today.getDay() + 1) % 7], high: 29, low: 22, conditions: 'Sunny with chance of showers', sun_hours: 7.0 },
               { day: days[(today.getDay() + 2) % 7], high: 28, low: 21, conditions: 'Partly Cloudy', sun_hours: 6.5 },
           ]
       };
   } else if (location.toLowerCase().includes('seattle')) {
         return {
            days: [
                { day: days[today.getDay()], high: 18, low: 10, conditions: 'Partly Cloudy', sun_hours: 4.5 },
                { day: days[(today.getDay() + 1) % 7], high: 16, low: 9, conditions: 'Light Rain', sun_hours: 2.0 },
                { day: days[(today.getDay() + 2) % 7], high: 19, low: 12, conditions: 'Partly Cloudy', sun_hours: 5.0 },
            ]
        };
    } else if (location.toLowerCase().includes('phoenix')) {
        return {
            days: [
                { day: days[today.getDay()], high: 40, low: 28, conditions: 'Sunny', sun_hours: 12.5 },
                { day: days[(today.getDay() + 1) % 7], high: 42, low: 29, conditions: 'Sunny', sun_hours: 12.8 },
                { day: days[(today.getDay() + 2) % 7], high: 41, low: 28, conditions: 'Sunny', sun_hours: 12.6 },
            ]
        };
    } else { // Default to New York
        return {
            days: [
                { day: days[today.getDay()], high: 25, low: 18, conditions: 'Sunny', sun_hours: 9.5 },
                { day: days[(today.getDay() + 1) % 7], high: 22, low: 16, conditions: 'Partly Cloudy', sun_hours: 6.0 },
                { day: days[(today.getDay() + 2) % 7], high: 20, low: 15, conditions: 'Showers', sun_hours: 3.2 },
            ]
        };
    }
  }
);

// == Sunrise/Sunset Tool Definition == //
const sunTimesSchema = z.object({
    sunrise: z.string().describe("Today's sunrise time in HH:MM AM/PM format."),
    sunset: z.string().describe("Today's sunset time in HH:MM AM/PM format."),
});

const getSunriseSunsetTimes = ai.defineTool(
    {
        name: 'getSunriseSunsetTimes',
        description: 'Returns the sunrise and sunset times for a given location and date.',
        inputSchema: z.object({
            location: z.string().describe('The city and state, e.g. Pahoa, HI'),
        }),
        outputSchema: sunTimesSchema,
    },
    async ({ location }) => {
        logger.info(`Getting sunrise/sunset for ${location}`);
        // In a real app, you would call a real API.
        // For this example, we return mock data.
        if (location.toLowerCase().includes('pahoa')) {
            return { sunrise: '6:15 AM', sunset: '6:45 PM' };
        }
        // Default values
        return { sunrise: '6:30 AM', sunset: '7:30 PM' };
    }
);


// == Power Recommendation Flow == //

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
        model: 'gemini-pro',
        tools: [getWeatherForecast, getSunriseSunsetTimes],
        prompt: `You are an expert power management AI for an off-grid battery system.
          Your goal is to provide a concise, actionable recommendation to the user.
          
          Analyze the current battery status, the weather forecast for the next 3 days, and the sunrise/sunset times.
          
          Based on the State of Charge (SOC), current power draw, and upcoming sun exposure, provide a single, clear recommendation.
          - If the SOC is high and lots of sun is expected, recommend using more power (e.g., "run the dehumidifier").
          - If the SOC is low and cloudy weather is coming, recommend conserving power or running a generator.
          - If the SOC is moderate, give a balanced recommendation.
          - Frame the recommendation in a single, easy-to-understand sentence. Be friendly and encouraging.
          
          Current Battery Status:
          - State of Charge (SOC): ${promptData.soc.toFixed(1)}%
          - Current Power: ${promptData.power.toFixed(2)} kW (${promptData.power > 0 ? "Discharging" : "Charging"})
          
          The user is located in ${promptData.location}. Use the available tools to get the upcoming weather and today's sunrise/sunset times.
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
