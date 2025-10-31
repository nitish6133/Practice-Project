import { useMemo } from 'react';
import { Bar } from '@visx/shape';
import { Group } from '@visx/group';
import { GridRows } from '@visx/grid';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import type { ChartDataPoint } from '../../types';

interface BarChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
}

const getX = (d: ChartDataPoint) => d.year.toString();
const getY = (d: ChartDataPoint) => d.value;

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: '#1e293b',
  color: 'white',
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
};

export const BarChart = ({ data, width = 560, height = 250 }: BarChartProps) => {
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    tooltipOpen,
    tooltipLeft,
    tooltipTop,
    tooltipData,
    hideTooltip,
    showTooltip,
  } = useTooltip<ChartDataPoint>();

  const xScale = useMemo(
    () =>
      scaleBand({
        domain: data.map(getX),
        range: [0, innerWidth],
        padding: 0.3,
      }),
    [data, innerWidth]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [0, Math.max(...data.map(getY)) * 1.1],
        range: [innerHeight, 0],
        nice: true,
      }),
    [data, innerHeight]
  );

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={innerWidth} strokeDasharray="3,3" stroke="#e5e7eb" strokeOpacity={0.6} />

          {data.map((d) => {
            const barWidth = xScale.bandwidth();
            const barHeight = innerHeight - (yScale(getY(d)) ?? 0);
            const barX = xScale(getX(d));
            const barY = innerHeight - barHeight;

            return (
              <Bar
                key={`bar-${getX(d)}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill="#475569"
                rx={4}
                className="transition-all duration-200 hover:fill-slate-700"
                onMouseLeave={() => hideTooltip()}
                onMouseMove={(event) => {
                  const coords = localPoint(event);
                  showTooltip({
                    tooltipData: d,
                    tooltipTop: coords?.y,
                    tooltipLeft: coords?.x,
                  });
                }}
              />
            );
          })}

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="#94a3b8"
            tickStroke="#94a3b8"
            tickLabelProps={() => ({
              fill: '#64748b',
              fontSize: 11,
              textAnchor: 'middle',
            })}
          />

          <AxisLeft
            scale={yScale}
            stroke="#94a3b8"
            tickStroke="#94a3b8"
            tickLabelProps={() => ({
              fill: '#64748b',
              fontSize: 11,
              textAnchor: 'end',
              dx: -4,
            })}
          />
        </Group>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds top={tooltipTop} left={tooltipLeft} style={tooltipStyles}>
          <div className="font-semibold">{tooltipData.label}</div>
          <div className="text-gray-300 mt-1">
            {tooltipData.year}: <span className="font-semibold">{tooltipData.value.toLocaleString()}</span>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};
