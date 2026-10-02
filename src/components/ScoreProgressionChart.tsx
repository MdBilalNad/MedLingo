import React, { useState } from 'react';

export interface ScoreDataPoint {
  id: string;
  label: string;
  date: string;
  score: number;
  testCount: number;
  hasCritical: boolean;
}

interface ScoreProgressionChartProps {
  data: ScoreDataPoint[];
}

export function ScoreProgressionChart({ data }: ScoreProgressionChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<ScoreDataPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded p-6 text-center text-slate-500 text-xs">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          No Longitudinal Data Available
        </p>
        <p className="mt-1 text-slate-400">
          Analyze and save multiple lab reports over time to plot score progression trends.
        </p>
      </div>
    );
  }

  // Display chart
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = 560;

  const minScore = 0;
  const maxScore = 100;

  // Calculate coordinates
  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? chartWidth / 2
        : paddingX + (index / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y =
      height -
      paddingY -
      ((d.score - minScore) / (maxScore - minScore)) * (height - paddingY * 2);
    return { ...d, x, y };
  });

  const pathD =
    points.length === 1
      ? `M ${points[0].x} ${points[0].y}`
      : points.reduce(
          (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
          ''
        );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-0.5 bg-teal-600 dark:bg-teal-400" />
            Health Literacy Score (0-100)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-600" />
            Critical Alert Flag
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Showing {data.length} recorded {data.length === 1 ? 'panel' : 'panels'}
        </div>
      </div>

      <div className="relative border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-44 overflow-visible font-sans select-none"
        >
          {/* Horizontal Grid lines */}
          {[100, 75, 50, 25, 0].map((val) => {
            const y =
              height -
              paddingY -
              ((val - minScore) / (maxScore - minScore)) * (height - paddingY * 2);
            return (
              <g key={val}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-100 dark:text-slate-800"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Connect line */}
          <path
            d={pathD}
            fill="none"
            stroke="#0f766e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p) => (
            <g
              key={p.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                className={`transition-all ${
                  p.hasCritical
                    ? 'fill-rose-600 stroke-white dark:stroke-slate-900'
                    : 'fill-teal-600 dark:fill-teal-400 stroke-white dark:stroke-slate-900'
                }`}
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={height - 6}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {p.date}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white text-[11px] p-2.5 rounded shadow-sm border border-slate-700 pointer-events-none space-y-0.5">
            <div className="font-bold text-teal-400">{hoveredPoint.label}</div>
            <div className="text-slate-300">
              Score: <span className="font-bold text-white">{hoveredPoint.score}/100</span>
            </div>
            <div className="text-slate-400">
              Tests: {hoveredPoint.testCount} parameters • {hoveredPoint.date}
            </div>
            {hoveredPoint.hasCritical && (
              <div className="text-rose-400 font-bold text-[10px]">
                Requires Clinical Escalation
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
