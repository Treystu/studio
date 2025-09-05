"use client";

import MetricCard from "./metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatteryDataPointWithDate } from "@/lib/types";
import { GitCommitVertical, Hourglass, RefreshCw } from "lucide-react";
import { format } from 'date-fns';

interface MetricsSectionProps {
  data: BatteryDataPointWithDate;
}

function CellVoltageCard({ title, value }: { title: string, value: number | null | undefined }) {
    if (value === null || value === undefined) {
        return null;
    }
    return (
        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${title.includes('Max') ? 'bg-chart-3' : title.includes('Min') ? 'bg-chart-1' : 'bg-chart-4'}`}></div>
                <p className="text-sm font-medium">{title}</p>
            </div>
            <p className="text-sm font-mono">{value.toFixed(3)} V</p>
        </div>
    )
}

export default function MetricsSection({ data }: MetricsSectionProps) {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="text-lg">Cell Voltages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CellVoltageCard title="Max Cell Voltage" value={data.maxCellVoltage} />
            <CellVoltageCard title="Min Cell Voltage" value={data.minCellVoltage} />
            <CellVoltageCard title="Avg Cell Voltage" value={data.avgCellVoltage} />
            {data.cellVoltageDifference !== null && data.cellVoltageDifference !== undefined && (
             <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                    <GitCommitVertical className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Cell Difference</p>
                </div>
                <p className="text-sm font-mono">{data.cellVoltageDifference.toFixed(3)} V</p>
            </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
            <MetricCard
                icon={Hourglass}
                title="Remaining Capacity"
                value={data.remainingCapacity.toFixed(2)}
                unit="Ah"
            />
            <MetricCard
                icon={RefreshCw}
                title="Cycle Count"
                value={data.cycleCount}
                unit="cycles"
            />
        </div>
        
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Balance Status</span>
                    <span className="font-bold">{data.balanceStatus}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Charge MOS</span>
                    <span className={`font-bold px-2 py-1 rounded-full text-xs ${data.mosChargeStatus === 'Charge' ? 'bg-[hsl(var(--chart-2)/0.2)] text-[hsl(var(--chart-2))]' : 'bg-[hsl(var(--chart-3)/0.2)] text-[hsl(var(--chart-3))]'}`}>{data.mosChargeStatus}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-muted-foreground">Discharge MOS</span>
                    <span className={`font-bold px-2 py-1 rounded-full text-xs ${data.mosDischargeStatus === 'Discharge' ? 'bg-[hsl(var(--chart-2)/0.2)] text-[hsl(var(--chart-2))]' : 'bg-[hsl(var(--chart-3)/0.2)] text-[hsl(var(--chart-3))]'}`}>{data.mosDischargeStatus}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="font-medium text-muted-foreground">Last Update</span>
                    <span className="font-mono">{format(new Date(data.timestamp), 'PPP p')}</span>
                </div>
            </CardContent>
        </Card>

      </div>
    </section>
  );
}
