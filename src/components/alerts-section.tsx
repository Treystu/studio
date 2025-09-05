"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface AlertsSectionProps {
  alerts: string[];
}

export default function AlertsSection({ alerts }: AlertsSectionProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* The AlertSummary component has been removed from here to avoid redundancy. 
          The main HealthSummary provides a more comprehensive overview. */}
      {alerts.map((alert, index) => (
        <Alert key={index} variant="destructive" className="animate-fade-in-down">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">Critical Alert</AlertTitle>
          <AlertDescription>
            {alert}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
