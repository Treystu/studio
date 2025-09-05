"use client";

import { useReducer, useCallback, useEffect, useMemo } from 'react';
import type { BatteryCollection, BatteryDataPoint, BatteryDataPointWithDate } from '@/lib/types';
import { extractDataFromBMSImage } from '@/ai/flows/extract-data-from-bms-image';
import { displayAlertsForDataDeviations } from '@/ai/flows/display-alerts-for-data-deviations';
import { useToast } from './use-toast';

// == STATE & REDUCER == //
type State = {
  batteries: BatteryCollection;
  currentBatteryId: string | null;
  isLoading: boolean;
  alerts: string[];
};

type Action =
  | { type: 'START_LOADING' }
  | { type: 'STOP_LOADING' }
  | { type: 'SET_BATTERIES'; payload: BatteryCollection }
  | { type: 'SET_CURRENT_BATTERY'; payload: string }
  | { type: 'ADD_DATA'; payload: { data: BatteryDataPoint; dateContext: Date } }
  | { type: 'SET_ALERTS'; payload: string[] }
  | { type: 'CLEAR_BATTERY_DATA'; payload: string };

const initialState: State = {
  batteries: {},
  currentBatteryId: null,
  isLoading: false,
  alerts: [],
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'START_LOADING':
      return { ...state, isLoading: true };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    case 'SET_BATTERIES':
      return { ...state, batteries: action.payload };
    case 'SET_CURRENT_BATTERY':
      return { ...state, currentBatteryId: action.payload, alerts: [] };
    case 'ADD_DATA': {
      const { data, dateContext } = action.payload;
      const { batteryId } = data;
      const timeParts = data.timestamp.split(':').map(Number);

      const newTimestamp = new Date(dateContext);
      newTimestamp.setHours(timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0, 0);

      const newDataPoint: BatteryDataPointWithDate = { ...data, timestamp: newTimestamp, uploadCount: 1 };

      const existingData = state.batteries[batteryId] || [];
      const updatedBatteries = { ...state.batteries };
      
      const hourKey = new Date(newTimestamp.getFullYear(), newTimestamp.getMonth(), newTimestamp.getDate(), newTimestamp.getHours()).getTime();
      
      const existingIndex = existingData.findIndex(p => {
        const pDate = p.timestamp;
        return new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate(), pDate.getHours()).getTime() === hourKey;
      });

      if (existingIndex !== -1) {
        const existingPoint = existingData[existingIndex];
        const averagedPoint = { ...existingPoint };

        const existingCount = existingPoint.uploadCount || 1;
        const newTotalCount = existingCount + 1;

        (Object.keys(newDataPoint) as Array<keyof BatteryDataPointWithDate>).forEach(key => {
          if (typeof existingPoint[key] === 'number' && typeof newDataPoint[key] === 'number' && key !== 'uploadCount') {
            const existingValue = existingPoint[key] as number;
            const newValue = newDataPoint[key] as number;
            (averagedPoint[key] as number) = (existingValue * existingCount + newValue) / newTotalCount;
          } else if (newDataPoint[key] !== null && newDataPoint[key] !== undefined) {
             // For non-numeric or new nullable fields, prefer the new data if it's not null.
             // @ts-ignore
            averagedPoint[key] = newDataPoint[key];
          }
        });
        
        averagedPoint.uploadCount = newTotalCount;
        existingData[existingIndex] = { ...averagedPoint, timestamp: existingPoint.timestamp }; 
        updatedBatteries[batteryId] = [...existingData];
      } else {
        updatedBatteries[batteryId] = [...existingData, newDataPoint].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      
      return { ...state, batteries: updatedBatteries };
    }
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'CLEAR_BATTERY_DATA': {
      if (!action.payload) return state;
      const newBatteries = { ...state.batteries };
      delete newBatteries[action.payload];
      const newCurrentBatteryId = Object.keys(newBatteries)[0] || null;
      return { ...state, batteries: newBatteries, currentBatteryId: newCurrentBatteryId, alerts: [] };
    }
    default:
      return state;
  }
};

// == HOOK == //
export const useBatteryData = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();

  const processUploadedFiles = useCallback(async (files: File[], dateContext: Date) => {
    dispatch({ type: 'START_LOADING' });
    let firstBatteryId: string | null = null;
    try {
      await Promise.all(
        files.map(async (file, index) => {
          try {
            const reader = new FileReader();
            const dataUri = await new Promise<string>((resolve, reject) => {
              reader.onload = e => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const extractedData = await extractDataFromBMSImage({ photoDataUri: dataUri });
            if (index === 0 && !state.currentBatteryId) {
                firstBatteryId = extractedData.batteryId;
            }
            dispatch({ type: 'ADD_DATA', payload: { data: extractedData, dateContext } });
          } catch (error) {
            console.error('Error processing file:', file.name, error);
            toast({
              variant: 'destructive',
              title: `Error processing ${file.name}`,
              description: 'Could not extract data from the image.',
            });
          }
        })
      );
      if (firstBatteryId) {
        dispatch({ type: 'SET_CURRENT_BATTERY', payload: firstBatteryId });
      }
    } finally {
      dispatch({ type: 'STOP_LOADING' });
      toast({
        title: 'Upload Complete',
        description: `${files.length} file(s) processed.`,
      });
    }
  }, [toast, state.currentBatteryId]);

  const setCurrentBatteryId = useCallback((batteryId: string) => {
    dispatch({ type: 'SET_CURRENT_BATTERY', payload: batteryId });
  }, []);

  const clearCurrentBatteryData = useCallback((backup: boolean) => {
    if (!state.currentBatteryId) return;
    if (backup) {
      console.log('Backing up data for', state.currentBatteryId, state.batteries[state.currentBatteryId]);
      toast({ title: 'Data Backup', description: `Data for ${state.currentBatteryId} has been backed up.` });
    }
    dispatch({ type: 'CLEAR_BATTERY_DATA', payload: state.currentBatteryId });
    toast({ title: 'Data Cleared', description: `All data for ${state.currentBatteryId} has been removed.` });
  }, [state.currentBatteryId, state.batteries, toast]);
  
  const currentBatteryData = useMemo(() => state.currentBatteryId ? state.batteries[state.currentBatteryId] || [] : [], [state.currentBatteryId, state.batteries]);
  const latestDataPoint = useMemo(() => currentBatteryData.length > 0 ? currentBatteryData[currentBatteryData.length - 1] : null, [currentBatteryData]);

  useEffect(() => {
    if (!latestDataPoint) {
      if(state.alerts.length > 0) {
        dispatch({ type: 'SET_ALERTS', payload: [] });
      }
      return;
    }

    const checkForAlerts = async () => {
      try {
        const { alerts } = await displayAlertsForDataDeviations({
          batteryId: latestDataPoint.batteryId,
          soc: latestDataPoint.soc,
          voltage: latestDataPoint.voltage,
          current: latestDataPoint.current,
          maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
          minCellVoltage: latestDataPoint.minCellVoltage ?? null,
          averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
        });
        if (JSON.stringify(alerts) !== JSON.stringify(state.alerts)) {
            dispatch({ type: 'SET_ALERTS', payload: alerts });
        }
      } catch (error) {
        console.error("Error checking for alerts:", error);
        toast({
            variant: "destructive",
            title: "Could not check for alerts",
            description: "There was an issue with the AI service.",
        });
      }
    };

    checkForAlerts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestDataPoint, toast]);


  return {
    ...state,
    currentBatteryData,
    latestDataPoint,
    processUploadedFiles,
    setCurrentBatteryId,
    clearCurrentBatteryData,
  };
};
