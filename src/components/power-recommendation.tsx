"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generatePowerRecommendation } from '@/ai/flows/generate-power-recommendation';
import { BrainCircuit } from 'lucide-react';
import type { BatteryDataPointWithDate } from '@/lib/types';
import { useBatteryData } from '@/hooks/use-battery-data';

interface PowerRecommendationProps {
  latestDataPoint: BatteryDataPointWithDate;
}

export default function PowerRecommendation({ latestDataPoint }: PowerRecommendationProps) {
  const [recommendation, setRecommendation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { apiKey } = useBatteryData();

  useEffect(() => {
    async function getRecommendation() {
      if (!latestDataPoint || !apiKey) return;

      setIsLoading(true);
      try {
        const result = await generatePowerRecommendation({
            soc: latestDataPoint.soc,
            power: latestDataPoint.power,
            location: "Pahoa, HI", // Hardcoded for now
            apiKey
        });
        setRecommendation(result.recommendation);
      } catch (error) {
        console.error("Failed to generate power recommendation:", error);
        setRecommendation("Could not generate a recommendation at this time.");
      } finally {
        setIsLoading(false);
      }
    }
    getRecommendation();
  }, [latestDataPoint, apiKey]);

  return (
    <Card className="animate-fade-in-down shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <div>
            <CardTitle>AI Power Recommendation</CardTitle>
            <CardDescription>Smart advice based on battery status and weather forecasts.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 pt-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <p className="text-md">{recommendation}</p>
        )}
      </CardContent>
    </Card>
  );
}
