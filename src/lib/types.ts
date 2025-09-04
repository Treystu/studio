import type { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';

export type BatteryDataPoint = Awaited<ReturnType<typeof extractDataFromBMSImage>>;

export interface BatteryDataPointWithDate extends Omit<BatteryDataPoint, 'timestamp'> {
  timestamp: Date;
  uploadCount?: number;
}

export type BatteryCollection = {
  [batteryId: string]: BatteryDataPointWithDate[];
};
