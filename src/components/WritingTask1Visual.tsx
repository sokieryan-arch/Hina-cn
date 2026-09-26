import { ArrowRight } from "lucide-react";
import type { WritingTask1Visual as Task1VisualData } from "../shared/practiceTypes";

const SERIES_COLORS = ["#2F7468", "#D58A21", "#C75C6A", "#5A77A8"];
const MAP_TONES = {
  green: "border-[#8EB9A2] bg-[#DDEDE3] text-[#315E58] dark:border-[#507663] dark:bg-[#233b32] dark:text-[#b8e0c9]",
  blue: "border-[#8AB6CA] bg-[#DDEDF3] text-[#315A6D] dark:border-[#456c7d] dark:bg-[#1e3440] dark:text-[#b8dce8]",
  amber: "border-[#D9B978] bg-[#F7EBCF] text-[#71551F] dark:border-[#7b6439] dark:bg-[#3b3020] dark:text-[#f0d697]",
  rose: "border-[#D8A3AA] bg-[#F5E0E3] text-[#824A53] dark:border-[#7c4f5a] dark:bg-[#40252f] dark:text-[#efbdc5]",
  neutral: "border-[#C9C1B5] bg-[#EEEAE3] text-[#625B56] dark:border-[#5b5262] dark:bg-[#332a38] dark:text-[#d7cce0]",
} as const;

function AxisChart({ visual }: { visual: Extract<Task1VisualData, { kind: "line" | "bar" }> }) {
  const width = 720;
  const height = 330;
  const left = 64;
  const right = 22;
  const top = 24;
  const bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(...visual.series.flatMap((series) => series.values));
  const axisMaximum = Math.ceil(maximum / (visual.unit === "%" ? 10 : 100)) * (visual.unit === "%" ? 10 : 100);
  const y = (value: number) => top + plotHeight - (value / axisMaximum) * plotHeight;
  const x = (index: number) => left + (visual.labels.length === 1 ? 0 : (index / (visual.labels.length - 1)) * plotWidth);
  const ticks = Array.from({ length: 5 }, (_, index) => (axisMaximum / 4) * index);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${visual.title}, measured in ${visual.unit}`} className="w-full overflow-visible">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="currentColor" className="text-[#E4DDD1] dark:text-[#45364f]" />
            <text x={left - 12} y={y(tick) + 4} textAnchor="end" className="fill-[#8A817C] text-[11px] dark:fill-[#a58ebd]">{tick}{visual.unit === "%" ? "%" : ""}</text>
          </g>
        ))}
        {visual.labels.map((label, index) => (
          <text key={label} x={visual.kind === "bar" ? left + ((index + 0.5) / visual.labels.length) * plotWidth : x(index)} y={height - 18} textAnchor="middle" className="fill-[#6D6560] text-[12px] font-semibold dark:fill-[#c7b8d1]">{label}</text>
        ))}
        {visual.kind === "line" ? visual.series.map((series, seriesIndex) => {
          const points = series.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
          return (
            <g key={series.name}>
              <polyline points={points} fill="none" stroke={SERIES_COLORS[seriesIndex]} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
              {series.values.map((value, index) => <circle key={`${series.name}-${visual.labels[index]}`} cx={x(index)} cy={y(value)} r="5" fill={SERIES_COLORS[seriesIndex]} />)}
            </g>
          );
        }) : visual.series.flatMap((series, seriesIndex) => {
          const groupWidth = plotWidth / visual.labels.length;
          const barWidth = Math.min(34, (groupWidth - 20) / visual.series.length);
          return series.values.map((value, labelIndex) => {
            const barX = left + labelIndex * groupWidth + (groupWidth - barWidth * visual.series.length) / 2 + seriesIndex * barWidth;
            return <rect key={`${series.name}-${visual.labels[labelIndex]}`} x={barX} y={y(value)} width={barWidth - 3} height={top + plotHeight - y(value)} rx="2" fill={SERIES_COLORS[seriesIndex]} />;
          });
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2">
        {visual.series.map((series, index) => (
          <span key={series.name} className="flex items-center gap-2 text-xs font-semibold text-[#6D6560] dark:text-[#c7b8d1]"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} />{series.name}</span>
        ))}
      </div>
    </div>
  );
}

function PieCharts({ visual }: { visual: Extract<Task1VisualData, { kind: "pie" }> }) {
  const gradient = (values: Array<{ value: number }>) => {
    let start = 0;
    const stops = values.map((item, index) => {
      const end = start + item.value;
      const stop = `${SERIES_COLORS[index]} ${start}% ${end}%`;
      start = end;
      return stop;
    });
    return `conic-gradient(${stops.join(", ")})`;
  };

  return (
    <div className="grid gap-7 sm:grid-cols-2">
      {visual.sets.map((set) => (
        <div key={set.label} className="flex flex-col items-center">
          <strong className="text-sm text-[#413B37] dark:text-white">{set.label}</strong>
          <div className="mt-3 aspect-square w-36 rounded-full border-8 border-white shadow-sm dark:border-[#291a33]" style={{ background: gradient(set.values) }} role="img" aria-label={`${set.label}: ${set.values.map((item) => `${item.name} ${item.value}%`).join(", ")}`} />
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            {set.values.map((item, index) => <span key={item.name} className="flex items-center gap-2 text-[11px] text-[#6D6560] dark:text-[#c7b8d1]"><span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} />{item.name} {item.value}%</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ visual }: { visual: Extract<Task1VisualData, { kind: "table" }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-left text-sm">
        <caption className="sr-only">{visual.title}, measured in {visual.unit}</caption>
        <thead><tr className="border-b border-[#CFC6B8] dark:border-[#55445f]"><th className="px-3 py-3 text-xs uppercase text-[#7A6F68] dark:text-[#bda9ca]">Subject</th>{visual.columns.map((column) => <th key={column} className="px-3 py-3 text-right text-xs uppercase text-[#7A6F68] dark:text-[#bda9ca]">{column}</th>)}</tr></thead>
        <tbody>{visual.rows.map((row) => <tr key={row.label} className="border-b border-[#E8E2D6] last:border-0 dark:border-[#3a2347]"><th className="px-3 py-3 font-semibold text-[#3E3935] dark:text-white">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${visual.columns[index]}`} className="px-3 py-3 text-right tabular-nums text-[#315E58] dark:text-[#a9ddd3]">{value.toLocaleString()}</td>)}</tr>)}</tbody>
      </table>
      <p className="mt-2 text-right text-[11px] text-[#958A83]">Unit: {visual.unit}</p>
    </div>
  );
}

function MapComparison({ visual }: { visual: Extract<Task1VisualData, { kind: "map" }> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {visual.panels.map((panel) => (
        <div key={panel.label}>
          <strong className="block text-center text-sm text-[#413B37] dark:text-white">{panel.label}</strong>
          <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-lg border border-[#D8CDBB] bg-white dark:border-[#4b4054] dark:bg-[#291a33]">
            {panel.features.map((feature) => (
              <span key={feature.label} className={`absolute flex items-center justify-center border px-1 text-center text-[10px] font-semibold leading-3 ${MAP_TONES[feature.tone]}`} style={{ left: `${feature.x}%`, top: `${feature.y}%`, width: `${feature.width}%`, height: `${feature.height}%` }}>{feature.label}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProcessDiagram({ visual }: { visual: Extract<Task1VisualData, { kind: "process" }> }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {visual.steps.map((step, index) => (
        <li key={step.title} className="relative flex min-h-28 flex-col border-t-2 border-[#86BDB1] px-2 py-3 dark:border-[#5aa394]">
          <span className="text-xs font-bold text-[#2F7468] dark:text-[#a9ddd3]">{index + 1}</span>
          <strong className="mt-2 text-sm text-[#35312F] dark:text-white">{step.title}</strong>
          <span className="mt-1 text-[11px] leading-4 text-[#746B66] dark:text-[#bda9ca]">{step.detail}</span>
          {index < visual.steps.length - 1 ? <ArrowRight size={15} className="absolute -right-2 top-3 hidden text-[#B5A48B] lg:block" /> : null}
        </li>
      ))}
    </ol>
  );
}

export function WritingTask1Visual({ visual }: { visual: Task1VisualData }) {
  return (
    <figure className="border-y border-[#E8E2D6] bg-[#FAF7F1] px-3 py-5 dark:border-[#3a2347] dark:bg-[#24172c] sm:px-6">
      <figcaption className="mb-5 text-center font-display text-lg font-semibold text-[#35312F] dark:text-white">{visual.title}</figcaption>
      <div className="mx-auto max-w-3xl">
        {visual.kind === "line" || visual.kind === "bar" ? <AxisChart visual={visual} /> : null}
        {visual.kind === "pie" ? <PieCharts visual={visual} /> : null}
        {visual.kind === "table" ? <DataTable visual={visual} /> : null}
        {visual.kind === "map" ? <MapComparison visual={visual} /> : null}
        {visual.kind === "process" ? <ProcessDiagram visual={visual} /> : null}
      </div>
      <p className="mt-5 text-center text-[11px] text-[#9A8F88] dark:text-[#8e7b9b]">Original practice data created for Hina.</p>
    </figure>
  );
}


