"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BatteryDataPointWithDate } from "@/lib/types";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendsSectionProps {
  data: BatteryDataPointWithDate[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/80 backdrop-blur-sm p-2 border border-border rounded-lg shadow-lg">
        <p className="label font-bold">{`${format(new Date(label), 'MMM d, h:mm a')}`}</p>
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.value.toFixed(2)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TrendsSection({ data }: TrendsSectionProps) {
  const chartData = data.map(d => ({
    ...d,
    timestamp: d.timestamp.getTime(),
    name: format(d.timestamp, 'HH:mm'),
  }));

  const renderChart = (dataKey: keyof BatteryDataPointWithDate, title: string, color: string, unit: string) => (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(time) => format(new Date(time), 'HH:mm')}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12} 
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 1', 'dataMax + 1']}
            tickFormatter={(value) => `${value.toFixed(1)}${unit}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey={dataKey as string} name={title} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <section>
      <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg">Historical Trends</CardTitle>
          <CardDescription>Data is averaged hourly to smooth trend lines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="font-semibold mb-2 text-center text-sm">State of Charge (%)</h3>
              {renderChart('soc', 'SOC', 'hsl(var(--chart-1))', '%')}
            </div>
            <div className="lg:col-span-1">
              <h3 className="font-semibold mb-2 text-center text-sm">Voltage (V)</h3>
              {renderChart('voltage', 'Voltage', 'hsl(var(--chart-2))', 'V')}
            </div>
            <div className="lg:col-span-1">
              <h3 className="font-semibold mb-2 text-center text-sm">Remaining Capacity (Ah)</h3>
              {renderChart('remainingCapacity', 'Capacity', 'hsl(var(--chart-5))', 'Ah')}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
