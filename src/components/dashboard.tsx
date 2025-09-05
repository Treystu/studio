"use client";

import { useBatteryData } from "@/hooks/use-battery-data";
import DashboardHeader from "@/components/dashboard-header";
import OverviewSection from "@/components/overview-section";
import MetricsSection from "@/components/metrics-section";
import TrendsSection from "@/components/trends-section";
import AlertsSection from "@/components/alerts-section";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Battery } from "lucide-react";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Initialize date on client to avoid hydration mismatch
    setSelectedDate(new Date());
  }, []);
  
  const {
    batteries,
    currentBatteryId,
    setCurrentBatteryId,
    latestDataPoint,
    currentBatteryData,
    currentBatteryRawData,
    processUploadedFiles,
    clearCurrentBatteryData,
    isLoading,
    alerts,
    uploadProgress,
    processedFileCount,
    totalFileCount,
  } = useBatteryData();

  const handleFileUpload = (files: File[]) => {
    if (selectedDate) {
      processUploadedFiles(files, selectedDate);
    }
  }

  const hasData = Object.keys(batteries).length > 0 && currentBatteryId && batteries[currentBatteryId]?.length > 0;
  
  const isInitialLoading = isLoading && !hasData;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <DashboardHeader
        batteryIds={Object.keys(batteries)}
        currentBatteryId={currentBatteryId}
        onBatteryChange={setCurrentBatteryId}
        onFileUpload={handleFileUpload}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onClearData={clearCurrentBatteryData}
        isLoading={isLoading}
        hasData={!!currentBatteryId}
        uploadProgress={uploadProgress}
        processedFileCount={processedFileCount}
        totalFileCount={totalFileCount}
      />
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-8">
        {isInitialLoading ? (
           <div className="space-y-8">
             <Skeleton className="h-48 w-full" />
             <Skeleton className="h-64 w-full" />
             <Skeleton className="h-96 w-full" />
           </div>
        ) : !currentBatteryId ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <Card className="w-full max-w-md text-center shadow-lg animate-fade-in">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Welcome to BatteryView</CardTitle>
                <CardDescription>Upload your BMS screenshots to get started.</CardDescription>
              </CardHeader>
              <CardContent>
                <Battery className="mx-auto h-24 w-24 text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Click the "Upload Screenshots" button in the header.</p>
              </CardContent>
            </Card>
          </div>
        ) : !hasData ? (
             <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Card className="w-full max-w-md text-center shadow-lg animate-fade-in">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">No Data Available</CardTitle>
                    <CardDescription>Upload screenshots for battery '{currentBatteryId}' using the date picker for context.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Battery className="mx-auto h-24 w-24 text-primary mb-4" />
                  </CardContent>
                </Card>
              </div>
        ) : (
          <>
            <AlertsSection alerts={alerts} />
            {latestDataPoint && (
              <div className="grid grid-cols-1 gap-8 animate-fade-in">
                <OverviewSection data={latestDataPoint} />
                <MetricsSection data={latestDataPoint} />
                <TrendsSection data={currentBatteryData} rawData={currentBatteryRawData}/>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
