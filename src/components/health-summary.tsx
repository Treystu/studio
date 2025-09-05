"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { summarizeBatteryHealth } from '@/ai/flows/summarize-battery-health';
import type { BatteryDataPointWithDate } from '@/lib/types';
import { Lightbulb } from 'lucide-react';

interface HealthSummaryProps {
  data: BatteryDataPointWithDate;
}

export default function HealthSummary({ data }: HealthSummaryProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current);
    }
    
    if (!data) return;
    
    async function getSummary() {
      setIsLoading(true);
      try {
        const result = await summarizeBatteryHealth({
            batteryId: data.batteryId,
            soc: data.soc,
            voltage: data.voltage,
            current: data.current,
            maxCellVoltage: data.maxCellVoltage ?? null,
            minCellVoltage: data.minCellVoltage ?? null,
            averageCellVoltage: data.avgCellVoltage ?? null,
            cycleCount: data.cycleCount,
        });
        setSummary(result.summary);
      } catch (error) {
        console.error("Failed to generate health summary:", error);
         if (error instanceof Error && !error.message.includes('429')) {
            setSummary("Could not generate health summary at this time.");
         } else {
            // Keep the old summary if we are just being rate limited
         }
      } finally {
        setIsLoading(false);
      }
    }

    summaryTimeoutRef.current = setTimeout(getSummary, 1500);

    return () => {
        if (summaryTimeoutRef.current) {
            clearTimeout(summaryTimeoutRef.current)
        }
    }
  }, [data]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Health Summary</CardTitle>
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading && !summary ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {summary || "Generating summary..."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
