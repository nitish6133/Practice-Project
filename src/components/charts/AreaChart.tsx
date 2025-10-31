import { useMemo } from 'react';
import { AreaClosed, Line, Bar } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { GridRows, GridColumns } from '@visx/grid';
import { scaleTime, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { bisector } from 'd3-array';
import type { ChartDataPoint } from '../../types';

interface AreaChartProps {
  data: ChartDataPoint[];
  width?: number;
  height?: number;
}

const getX = (d: ChartDataPoint) => new Date(d.year, 0, 1);
const getY = (d: ChartDataPoint) => d.value;
const bisectDate = bisector<ChartDataPoint, Date>((d) => new Date(d.year, 0, 1)).left;

export const AreaChart = ({ data, width = 560, height = 250 }: AreaChartProps) => {
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<ChartDataPoint>();

  const xScale = useMemo(
    () =>
      scaleTime({
        domain: [Math.min(...data.map((d) => getX(d).getTime())), Math.max(...data.map((d) => getX(d).getTime()))],
        range: [0, innerWidth],
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

  const handleTooltip = (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
    const { x } = localPoint(event) || { x: 0 };
    const x0 = xScale.invert(x - margin.left);
    const index = bisectDate(data, x0, 1);
    const d0 = data[index - 1];
    const d1 = data[index];
    let d = d0;
    if (d1 && getX(d1)) {
      d = x0.valueOf() - getX(d0).valueOf() > getX(d1).valueOf() - x0.valueOf() ? d1 : d0;
    }
    showTooltip({
      tooltipData: d,
      tooltipLeft: xScale(getX(d)),
      tooltipTop: yScale(getY(d)),
    });
  };

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient id="area-gradient" from="#475569" to="#475569" fromOpacity={0.4} toOpacity={0.1} />
        <g transform={`translate(${margin.left},${margin.top})`}>
          <GridRows scale={yScale} width={innerWidth} strokeDasharray="3,3" stroke="#e5e7eb" strokeOpacity={0.6} />
          <GridColumns scale={xScale} height={innerHeight} strokeDasharray="3,3" stroke="#e5e7eb" strokeOpacity={0.6} />

          <AreaClosed
            data={data}
            x={(d) => xScale(getX(d))}
            y={(d) => yScale(getY(d))}
            yScale={yScale}
            strokeWidth={2}
            stroke="url(#area-gradient)"
            fill="url(#area-gradient)"
            curve={curveMonotoneX}
          />

          <Line
            from={{ x: 0, y: 0 }}
            to={{ x: 0, y: innerHeight }}
            stroke="#cbd5e1"
            strokeWidth={1}
          />
          <Line
            from={{ x: 0, y: innerHeight }}
            to={{ x: innerWidth, y: innerHeight }}
            stroke="#cbd5e1"
            strokeWidth={1}
          />

          <AxisBottom
            top={innerHeight}
            scale={xScale}
            tickFormat={(value) => new Date(Number(value)).getFullYear().toString()}
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

          <Bar
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onTouchStart={handleTooltip}
            onTouchMove={handleTooltip}
            onMouseMove={handleTooltip}
            onMouseLeave={() => hideTooltip()}
          />

          {tooltipData && (
            <g>
              <Line
                from={{ x: tooltipLeft, y: 0 }}
                to={{ x: tooltipLeft, y: innerHeight }}
                stroke="#475569"
                strokeWidth={1}
                pointerEvents="none"
                strokeDasharray="4,2"
              />
              <circle
                cx={tooltipLeft}
                cy={tooltipTop}
                r={4}
                fill="#475569"
                stroke="white"
                strokeWidth={2}
                pointerEvents="none"
              />
            </g>
          )}
        </g>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop ? tooltipTop + margin.top : 0}
          left={tooltipLeft ? tooltipLeft + margin.left : 0}
          className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs"
        >
          <div className="font-semibold">{tooltipData.label}</div>
          <div className="text-gray-300">
            {tooltipData.year}: <span className="font-semibold">{tooltipData.value.toLocaleString()}</span>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
};
