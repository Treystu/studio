"use client";

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!data) return;
    
    async function getSummary() {
      setIsLoading(true);
      try {
        const result = await summarizeBatteryHealth({
            batteryId: data.batteryId,
            soc: data.soc,
            voltage: data.voltage,
            current: data.current,
            maxCellVoltage: data.maxCellVoltage ?? 0,
            minCellVoltage: data.minCellVoltage ?? 0,
            averageCellVoltage: data.avgCellVoltage ?? 0,
            cycleCount: data.cycleCount,
        });
        setSummary(result.summary);
      } catch (error) {
        console.error("Failed to generate health summary:", error);
        setSummary("Could not generate health summary at this time.");
      } finally {
        setIsLoading(false);
      }
    }
    getSummary();
  }, [data]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Health Summary</CardTitle>
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {summary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
