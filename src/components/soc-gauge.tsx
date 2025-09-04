"use client";

import { useEffect, useState } from 'react';

interface SOCGaugeProps {
  soc: number;
}

export default function SOCGauge({ soc }: SOCGaugeProps) {
  const [animatedSoc, setAnimatedSoc] = useState(0);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setAnimatedSoc(soc));
    return () => cancelAnimationFrame(animation);
  }, [soc]);
  
  const getSocColor = (s: number) => {
    if (s < 30) return "hsl(var(--chart-3))"; // Red
    if (s < 70) return "hsl(var(--chart-4))"; // Yellow
    return "hsl(var(--chart-2))"; // Green
  };

  const color = getSocColor(animatedSoc);
  const radius = 85;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedSoc / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      <svg className="w-full h-full" viewBox="0 0 200 200">
        <circle
          className="text-muted"
          strokeWidth="15"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
        />
        <circle
          strokeWidth="15"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx="100"
          cy="100"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.5s ease-out',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>
          {soc.toFixed(0)}<span className="text-2xl">%</span>
        </span>
        <span className="text-sm text-muted-foreground">State of Charge</span>
      </div>
    </div>
  );
}
