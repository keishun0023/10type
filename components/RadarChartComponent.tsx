'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { Axis, AXES, AXIS_LABELS } from '@/data/questions';

interface Props {
  axisScores: Record<Axis, number>;
}

export default function RadarChartComponent({ axisScores }: Props) {
  const data = AXES.map(axis => ({
    axis: AXIS_LABELS[axis],
    value: Math.round(axisScores[axis]),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e7e5e4" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fontSize: 11, fill: '#57534e', fontWeight: 500 }}
        />
        <Radar
          dataKey="value"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
