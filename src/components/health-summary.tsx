"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb } from 'lucide-react';
import { useEffect, useState } from "react";

interface HealthSummaryProps {
  summary: string;
  isLoading: boolean;
}

export default function HealthSummary({ summary, isLoading }: HealthSummaryProps) {
  const [displaySummary, setDisplaySummary] = useState(summary);

  useEffect(() => {
    if (!isLoading) {
      setDisplaySummary(summary);
    }
  }, [summary, isLoading]);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 h-full animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">AI Health Summary</CardTitle>
        <Lightbulb className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading && !displaySummary ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground pt-2">
            {displaySummary || "No health summary available yet."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
