
'use server';

/**
 * @fileOverview Extracts key data points from BMS screenshots using a vision model.
 *
 * - extractDataFromBMSImages - A function that handles the data extraction process for multiple images.
 * - ExtractDataFromBMSImagesInput - The input type for the function.
 * - ExtractDataFromBMSImagesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z, media } from 'genkit';
import { logger } from '@/lib/logger';

const ExtractDataFromBMSImagesInputSchema = z.object({
  photoUrls: z.array(
    z.string().describe("A URL or data URI of a photo of a BMS screenshot.")
  )
});
export type ExtractDataFromBMSImagesInput = z.infer<typeof ExtractDataFromBMSImagesInputSchema>;

const SingleBMSDataSchema = z.object({
  batteryId: z.string().describe('The unique identifier of the battery.'),
  soc: z.number().describe('The State of Charge of the battery (%).'),
  voltage: z.number().describe('The voltage of the battery (V).'),
  current: z.number().describe('The current of the battery (A).'),
  remainingCapacity: z.number().describe('The remaining capacity of the battery (Ah).'),
  maxCellVoltage: z.number().nullable().optional().describe('The maximum cell voltage (V).'),
  minCellVoltage: z.number().nullable().optional().describe('The minimum cell voltage (V).'),
  avgCellVoltage: z.number().nullable().optional().describe('The average cell voltage (V).'),
  cellVoltageDifference: z.number().nullable().optional().describe('The difference between the maximum and minimum cell voltages (V).'),
  cycleCount: z.number().describe('The number of charge cycles the battery has undergone.'),
  power: z.number().describe('The power of the battery (kW).'),
  mosChargeStatus: z.string().describe('The status of the MOS (Metal-Oxide-Semiconductor) during charging (Charge/Discharge).'),
  mosDischargeStatus: z.string().describe('The status of the MOS (Metal-Oxide-Semiconductor) during discharging (Charge/Discharge).'),
  balanceStatus: z.string().describe('The balance status of the battery.'),
  timestamp: z.string().describe('The timestamp (date and time) from the screenshot.'),
});

const ExtractDataFromBMSImagesOutputSchema = z.object({
  results: z.array(SingleBMSDataSchema)
});
export type ExtractDataFromBMSImagesOutput = z.infer<typeof ExtractDataFromBMSImagesOutputSchema>;

export async function extractDataFromBMSImages(input: ExtractDataFromBMSImagesInput): Promise<ExtractDataFromBMSImagesOutput> {
  return extractDataFromBMSImagesFlow(input);
}

const extractDataFromBMSImagesFlow = ai.defineFlow(
  {
    name: 'extractDataFromBMSImagesFlow',
    inputSchema: ExtractDataFromBMSImagesInputSchema,
    outputSchema: ExtractDataFromBMSImagesOutputSchema,
  },
  async input => {
    logger.info(`extractDataFromBMSImagesFlow invoked with ${input.photoUrls.length} images.`);

    const promptText = `You are an expert system designed to extract data from multiple Battery Management System (BMS) screenshots.\n    \n      Analyze all the provided screenshots and extract the key data points from each one. Ensure the extracted values are accurate and properly formatted. If a value is not present in a screenshot, return null for that field.\n  \n      For each image, extract:\n      - Battery ID: The unique identifier of the battery.\n      - State of Charge (SOC): (%)\n      - Voltage: (V)\n      - Current: (A)\n      - Remaining Capacity: (Ah)\n      - Max, Min, Avg Cell Voltage: (V)\n      - Cell Voltage Difference: (V)\n      - Cycle Count\n      - Power: (kW)\n      - MOS Charge & Discharge Status\n      - Balance Status\n      - Timestamp: (date and time) from the screenshot.\n  \n      Return all extracted data points in a single JSON object containing a "results" array.`;

    const promptParts: (string | z.ZodType<any, any, any>)[] = [promptText];
    input.photoUrls.forEach(url => {
      promptParts.push(media({ url }));
    });

    const response = await ai.generate({
      model: 'gemini-1.5-flash-latest',
      prompt: promptParts,
      output: {
        schema: ExtractDataFromBMSImagesOutputSchema,
      },
    });

    if (!response) {
        throw new Error('AI response is null or undefined');
    }

    const output = response.output;

    if (!output) {
      throw new Error('No output from AI');
    }

    logger.info(`extractDataFromBMSImagesFlow successful. Extracted data for ${output.results.length} images.`);
    return output;
  }
);
