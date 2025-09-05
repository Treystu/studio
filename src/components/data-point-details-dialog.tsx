
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RawBatteryDataPoint } from "@/lib/types";
import { format } from "date-fns";

interface DataPointDetailsDialogProps {
  dataPoints: RawBatteryDataPoint[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DataPointDetailsDialog({ dataPoints, open, onOpenChange }: DataPointDetailsDialogProps) {
  if (!dataPoints || dataPoints.length === 0) {
    return null;
  }

  const firstPoint = dataPoints[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Data Point Details</DialogTitle>
          <DialogDescription>
            Individual readings for battery {firstPoint.batteryId} around {format(firstPoint.timestamp, 'MMM d, yyyy, h a')}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] mt-4">
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">SOC (%)</TableHead>
                <TableHead className="text-right">Voltage (V)</TableHead>
                <TableHead className="text-right">Current (A)</TableHead>
                <TableHead className="text-right">Power (kW)</TableHead>
                <TableHead className="text-right">Capacity (Ah)</TableHead>
                <TableHead className="text-right">Cycles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataPoints.map((point, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">{format(point.timestamp, 'p')}</TableCell>
                  <TableCell className="text-right">{point.soc.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{point.voltage.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{point.current.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{point.power.toFixed(3)}</TableCell>
                  <TableCell className="text-right">{point.remainingCapacity.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{point.cycleCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
