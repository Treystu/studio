"use client";

import { Card, CardContent } from "@/components/ui/card";
import SOCGauge from "@/components/soc-gauge";
import type { BatteryDataPointWithDate } from "@/lib/types";
import MetricCard from "./metric-card";
import { ArrowRightLeft, Bolt, Zap, AlertCircle } from "lucide-react";
import HealthSummary from "./health-summary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { formatDistanceToNow } from 'date-fns';


interface OverviewSectionProps {
  data: BatteryDataPointWithDate;
  healthSummary: string;
}

export default function OverviewSection({ data, healthSummary }: OverviewSectionProps) {
  const isDataFresh = new Date().getTime() - new Date(data.timestamp).getTime() < 4 * 60 * 60 * 1000;
  const timeAgo = formatDistanceToNow(new Date(data.timestamp), { addSuffix: true });

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
          <HealthSummary summary={healthSummary} isLoading={!healthSummary && isDataFresh}/>
        </div>
      </div>
      
      {isDataFresh ? (
        metrics
      ) : (
        <Card>
            <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="font-semibold">Live metrics unavailable</p>
                                <p className="text-sm text-muted-foreground font-normal">
                                    Last reading was {timeAgo}. Expand to see stale data.
                                </p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                        {metrics}
                    </AccordionContent>
                </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
      )}
    </section>
  );
}
