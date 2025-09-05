
"use client";

import { useReducer, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BatteryCollection, BatteryDataPoint, BatteryDataPointWithDate, Insight, RawBatteryCollection, RawBatteryDataPoint } from '@/lib/types';
import { extractDataFromBMSImages } from '@/ai/flows/extract-data-from-bms-image';
import { displayAlertsForDataDeviations } from '@/ai/flows/display-alerts-for-data-deviations';
import { summarizeBatteryHealth } from '@/ai/flows/summarize-battery-health';
import { generateDashboardInsights } from '@/ai/flows/generate-dashboard-insights';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';
import { differenceInHours } from 'date-fns';

// == STATE & REDUCER == //
type State = {
  batteries: BatteryCollection;
  rawBatteries: RawBatteryCollection;
  currentBatteryId: string | null;
  isLoading: boolean;
  alerts: string[];
  healthSummary: string;
  insights: Insight[];
  isInsightsLoading: boolean;
  uploadProgress: number | null;
  processedFileCount: number;
  totalFileCount: number;
};

type Action =
  | { type: 'START_LOADING'; payload: { totalFiles: number } }
  | { type: 'STOP_LOADING' }
  | { type: 'START_INSIGHTS_LOADING' }
  | { type: 'STOP_INSIGHTS_LOADING' }
  | { type: 'RESET_UPLOAD_STATE' }
  | { type: 'SET_BATTERIES'; payload: { batteries: BatteryCollection, rawBatteries: RawBatteryCollection } }
  | { type: 'SET_CURRENT_BATTERY'; payload: string }
  | { type: 'ADD_DATA_BATCH'; payload: { data: BatteryDataPoint[]; dateContext: Date, isFirstUpload: boolean } }
  | { type: 'SET_ALERTS'; payload: string[] }
  | { type: 'SET_HEALTH_SUMMARY'; payload: string }
  | { type: 'SET_INSIGHTS'; payload: Insight[] }
  | { type: 'CLEAR_BATTERY_DATA'; payload: string }
  | { type: 'UPDATE_UPLOAD_PROGRESS'; payload: { processed: number, total: number } };

const initialState: State = {
  batteries: {},
  rawBatteries: {},
  currentBatteryId: null,
  isLoading: false,
  alerts: [],
  healthSummary: '',
  insights: [],
  isInsightsLoading: false,
  uploadProgress: null,
  processedFileCount: 0,
  totalFileCount: 0,
};

const reducer = (state: State, action: Action): State => {
  logger.log(`ACTION: ${action.type}`, action.payload ? JSON.stringify(action.payload, null, 2).substring(0, 300) + '...' : '');
  switch (action.type) {
    case 'START_LOADING':
      logger.log(`Upload started: ${action.payload.totalFiles} files`);
      return { ...state, isLoading: true, totalFileCount: action.payload.totalFiles, processedFileCount: 0, uploadProgress: 0 };
    case 'STOP_LOADING':
      return { ...state, isLoading: false };
    case 'START_INSIGHTS_LOADING':
      return { ...state, isInsightsLoading: true };
    case 'STOP_INSIGHTS_LOADING':
        return { ...state, isInsightsLoading: false };
    case 'RESET_UPLOAD_STATE':
        return { ...state, isLoading: false, totalFileCount: 0, processedFileCount: 0, uploadProgress: null };
    case 'SET_BATTERIES':
      return { ...state, batteries: action.payload.batteries, rawBatteries: action.payload.rawBatteries };
    case 'SET_CURRENT_BATTERY':
      return { ...state, currentBatteryId: action.payload, alerts: [], healthSummary: '', insights: [] };
    case 'ADD_DATA_BATCH': {
      const { data, dateContext, isFirstUpload } = action.payload;
      logger.log(`Adding batch of ${data.length} data points.`);

      let updatedRawBatteries = { ...state.rawBatteries };
      let updatedAveragedBatteries = { ...state.batteries };
      let newCurrentBatteryId = state.currentBatteryId;

      data.forEach(dataPoint => {
        const { batteryId } = dataPoint;

        const timeParts = dataPoint.timestamp.split(':').map(Number);
        const newTimestamp = new Date(dateContext);
        if (timeParts.length >= 2) {
            newTimestamp.setHours(timeParts[0], timeParts[1], timeParts[2] || 0, 0);
        }

        const newRawDataPoint: RawBatteryDataPoint = { ...dataPoint, timestamp: newTimestamp };
        const newAveragedDataPoint: BatteryDataPointWithDate = { ...dataPoint, timestamp: newTimestamp, uploadCount: 1 };

        let existingRawData = updatedRawBatteries[batteryId] || [];
        updatedRawBatteries[batteryId] = [...existingRawData, newRawDataPoint].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
       
        let existingAveragedData = updatedAveragedBatteries[batteryId] || [];
        const hourKey = new Date(newTimestamp.getFullYear(), newTimestamp.getMonth(), newTimestamp.getDate(), newTimestamp.getHours()).getTime();
        const existingIndex = existingAveragedData.findIndex(p => new Date(p.timestamp.getFullYear(), p.timestamp.getMonth(), p.timestamp.getDate(), p.timestamp.getHours()).getTime() === hourKey);

        if (existingIndex !== -1) {
          const existingPoint = existingAveragedData[existingIndex];
          const averagedPoint = { ...existingPoint };
          const existingCount = existingPoint.uploadCount || 1;
          const newTotalCount = existingCount + 1;
          (Object.keys(newAveragedDataPoint) as Array<keyof BatteryDataPointWithDate>).forEach(key => {
            if (typeof existingPoint[key] === 'number' && typeof newAveragedDataPoint[key] === 'number' && key !== 'uploadCount') {
              const existingValue = existingPoint[key] as number;
              const newValue = newAveragedDataPoint[key] as number;
              (averagedPoint[key] as number) = (existingValue * existingCount + newValue) / newTotalCount;
            } else if (newAveragedDataPoint[key] !== null && newAveragedDataPoint[key] !== undefined) {
               (averagedPoint as any)[key] = newAveragedDataPoint[key];
            }
          });
          averagedPoint.uploadCount = newTotalCount;
          existingAveragedData[existingIndex] = { ...averagedPoint, timestamp: existingPoint.timestamp }; 
          updatedAveragedBatteries[batteryId] = [...existingAveragedData];
        } else {
          existingAveragedData.push(newAveragedDataPoint);
          updatedAveragedBatteries[batteryId] = existingAveragedData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        }

        if (isFirstUpload && !newCurrentBatteryId) {
            newCurrentBatteryId = batteryId;
        }
      });
      
      const newState = { ...state, batteries: updatedAveragedBatteries, rawBatteries: updatedRawBatteries, insights: [] };
      if (isFirstUpload && !state.currentBatteryId) {
        logger.log(`This is the first upload. Setting current battery to: ${newCurrentBatteryId}`);
        newState.currentBatteryId = newCurrentBatteryId;
      }
      return newState;
    }
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'SET_HEALTH_SUMMARY':
        return { ...state, healthSummary: action.payload };
    case 'SET_INSIGHTS':
        return { ...state, insights: action.payload };
    case 'CLEAR_BATTERY_DATA': {
      if (!action.payload) return state;
      const newBatteries = { ...state.batteries };
      delete newBatteries[action.payload];
      const newRawBatteries = { ...state.rawBatteries };
      delete newRawBatteries[action.payload];
      const newCurrentBatteryId = Object.keys(newBatteries)[0] || null;
      return { ...state, batteries: newBatteries, rawBatteries: newRawBatteries, currentBatteryId: newCurrentBatteryId, alerts: [], healthSummary: '', insights: [] };
    }
    case 'UPDATE_UPLOAD_PROGRESS':
        const { processed, total } = action.payload;
        return { ...state, processedFileCount: processed, totalFileCount: total, uploadProgress: (processed / total) * 100 };
    default:
      return state;
  }
};

// == HOOK == //
export const useBatteryData = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { toast } = useToast();

  const getAiInsights = useCallback(async () => {
    const latestDataPoint = state.currentBatteryId ? state.batteries[state.currentBatteryId]?.[state.batteries[state.currentBatteryId].length - 1] : null;
    if (!latestDataPoint) {
      logger.log("AI Insights: Skipping, no latest data point.");
      toast({ variant: 'destructive', title: 'No Data', description: 'Cannot generate insights without data.'});
      return;
    }

    const isDataFresh = differenceInHours(new Date(), new Date(latestDataPoint.timestamp)) < 12;
  
    logger.log("AI Insights: User requested insights...");
    dispatch({ type: 'START_INSIGHTS_LOADING' });
    try {
      if (isDataFresh) {
        logger.log("AI Insights: Data is fresh, getting dashboard insights.");
        const insightsResult = await generateDashboardInsights({
            latestData: { soc: latestDataPoint.soc, power: latestDataPoint.power },
            location: "Pahoa, HI" // Hardcoded for now
        });
        if (insightsResult?.insights) {
            logger.log("AI Insights: New dashboard insights received.");
            dispatch({ type: 'SET_INSIGHTS', payload: insightsResult.insights });
        }
      }

      // Always get health summary and alerts on-demand
      const commonPayload = {
        batteryId: latestDataPoint.batteryId,
        soc: latestDataPoint.soc,
        voltage: latestDataPoint.voltage,
        current: latestDataPoint.current,
        maxCellVoltage: latestDataPoint.maxCellVoltage ?? null,
        minCellVoltage: latestDataPoint.minCellVoltage ?? null,
        averageCellVoltage: latestDataPoint.avgCellVoltage ?? null,
        cycleCount: latestDataPoint.cycleCount,
      };
      
      const [healthResult, alertsResult] = await Promise.all([
        summarizeBatteryHealth(commonPayload),
        displayAlertsForDataDeviations(commonPayload)
      ]);
      
      if (healthResult?.summary) {
          logger.log("AI Insights: New health summary received.");
          dispatch({ type: 'SET_HEALTH_SUMMARY', payload: healthResult.summary });
      }
      
      if (alertsResult?.alerts) {
          logger.log("AI Insights: New alerts received.");
          dispatch({ type: 'SET_ALERTS', payload: alertsResult.alerts });
      }
      
    } catch (error: any) {
      logger.error("AI Insights: Error running tasks:", error);
      toast({ variant: 'destructive', title: 'AI Error', description: 'Could not generate AI insights.'});
    } finally {
        dispatch({ type: 'STOP_INSIGHTS_LOADING'});
    }
  }, [state.currentBatteryId, state.batteries, toast]);


  const processUploadedFiles = useCallback(async (files: File[], dateContext: Date) => {
    dispatch({ type: 'START_LOADING', payload: { totalFiles: files.length } });
    
    try {
        const dataUris = await Promise.all(
            files.map(file => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            })
        );
        dispatch({ type: 'UPDATE_UPLOAD_PROGRESS', payload: { processed: files.length / 2, total: files.length } });

        logger.log(`All files converted to data URIs. Calling 'extractDataFromBMSImages' AI flow...`);
        const extractedData = await extractDataFromBMSImages({ photoDataUris: dataUris });

        dispatch({ type: 'UPDATE_UPLOAD_PROGRESS', payload: { processed: files.length, total: files.length } });
        
        const isFirstUpload = Object.keys(state.batteries).length === 0;
        dispatch({ type: 'ADD_DATA_BATCH', payload: { data: extractedData.results, dateContext, isFirstUpload } });
        logger.log(`Successfully processed batch of ${files.length} files.`);
        
        toast({ title: 'Upload Complete', description: `${files.length} file(s) processed successfully.` });

    } catch (error: any) {
        logger.error(`Error processing files:`, error);
        toast({
            variant: 'destructive',
            title: `Error processing batch`,
            description: `Could not extract data. Check logs for details.`,
            duration: 10000,
        });
    } finally {
        setTimeout(() => {
            dispatch({ type: 'RESET_UPLOAD_STATE' });
        }, 1500);
    }
  }, [state.batteries, toast]);


  const setCurrentBatteryId = useCallback((batteryId: string) => {
    dispatch({ type: 'SET_CURRENT_BATTERY', payload: batteryId });
  }, []);

  const clearCurrentBatteryData = useCallback((backup: boolean) => {
    if (!state.currentBatteryId) return;

    if (backup) {
      const dataToBackup = {
          averagedData: state.batteries[state.currentBatteryId],
          rawData: state.rawBatteries[state.currentBatteryId],
      }
      const dataBlob = new Blob([JSON.stringify(dataToBackup, null, 2)], {type : 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.currentBatteryId}_backup_${new Date().toISOString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Data Backup', description: `Data for ${state.currentBatteryId} has been downloaded.` });
    }
    dispatch({ type: 'CLEAR_BATTERY_DATA', payload: state.currentBatteryId });
    toast({ title: 'Data Cleared', description: `All data for ${state.currentBatteryId} has been removed.` });
  }, [state.currentBatteryId, state.batteries, state.rawBatteries, toast]);
  
  const currentBatteryData = useMemo(() => state.currentBatteryId ? state.batteries[state.currentBatteryId] || [] : [], [state.currentBatteryId, state.batteries]);
  const currentBatteryRawData = useMemo(() => state.currentBatteryId ? state.rawBatteries[state.currentBatteryId] || [] : [], [state.currentBatteryId, state.rawBatteries]);
  const latestDataPoint = useMemo(() => currentBatteryData.length > 0 ? currentBatteryData[currentBatteryData.length - 1] : null, [currentBatteryData]);
  
  return {
    ...state,
    isInsightsLoading: state.isInsightsLoading,
    currentBatteryData,
    currentBatteryRawData,
    latestDataPoint,
    processUploadedFiles,
    setCurrentBatteryId,
    clearCurrentBatteryData,
    getAiInsights,
  };
};
