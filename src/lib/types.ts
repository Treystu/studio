import type { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';

export type BatteryDataPoint = Awaited<ReturnType<typeof extractDataFromBMSImage>>;

export interface RawBatteryDataPoint extends Omit<BatteryDataPoint, 'timestamp'> {
  timestamp: Date;
}

export interface BatteryDataPointWithDate extends Omit<BatteryDataPoint, 'timestamp'> {
  timestamp: Date;
  uploadCount: number;
}

export type BatteryCollection = {
  [batteryId: string]: BatteryDataPointWithDate[];
};

export type RawBatteryCollection = {
  [batteryId: string]: RawBatteryDataPoint[];
};
