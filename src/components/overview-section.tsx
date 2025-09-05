"use client";

import { Card } from "@/components/ui/card";
import SOCGauge from "@/components/soc-gauge";
import type { BatteryDataPointWithDate } from "@/lib/types";
import MetricCard from "./metric-card";
import { ArrowRightLeft, Bolt, Zap } from "lucide-react";
import HealthSummary from "./health-summary";

interface OverviewSectionProps {
  data: BatteryDataPointWithDate;
  healthSummary: string;
  isSummaryLoading: boolean;
  onGenerateSummary: () => void;
}

export default function OverviewSection({ data, healthSummary, isSummaryLoading, onGenerateSummary }: OverviewSectionProps) {
  const metrics = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      <MetricCard
        icon={Zap}
        title="Voltage"
        value={data.voltage.toFixed(2)}
        unit="V"
        description="Total pack voltage"
      />
      <MetricCard
        icon={ArrowRightLeft}
        title="Current"
        value={data.current.toFixed(2)}
        unit="A"
        description={data.current > 0 ? "Discharging" : "Charging"}
      />
      <MetricCard
        icon={Bolt}
        title="Power"
        value={data.power.toFixed(3)}
        unit="kW"
        description="Current power draw"
      />
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <SOCGauge soc={data.soc} />
        </Card>
        <div className="lg:col-span-2">
          <HealthSummary summary={healthSummary} isLoading={isSummaryLoading} onGenerate={onGenerateSummary} />
        </div>
      </div>
      {metrics}
    </section>
  );
}
