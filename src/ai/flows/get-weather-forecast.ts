
'use server';
/**
 * @fileOverview A Genkit tool for fetching a weather forecast.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const weatherForecastSchema = z.object({
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
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;

export const getWeatherForecast = ai.defineTool(
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
    if (location.toLowerCase().includes('seattle')) {
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
