import React from 'react';
import { Tooltip } from '../../../components/UI';
import { HistoricalResult } from '../../../types';
import { ACHIEVEMENT_LEVELS } from './common';

export const AchievementGauge: React.FC<{ percentage: number }> = ({ percentage }) => {
  const levels = [
    { name: 'Insuficiente', width: 40, color: ACHIEVEMENT_LEVELS.INSUFICIENTE.color, tooltip: 'Insuficiente (0% - 39.9%)' },
    { name: 'Elemental', width: 30, color: ACHIEVEMENT_LEVELS.ELEMENTAL.color, tooltip: 'Elemental (40% - 69.9%)' },
    { name: 'Adecuado', width: 20, color: ACHIEVEMENT_LEVELS.ADECUADO.color, tooltip: 'Adecuado (70% - 89.9%)' },
    { name: 'Destacado', width: 10, color: ACHIEVEMENT_LEVELS.DESTACADO.color, tooltip: 'Destacado (90% - 100%)' },
  ];
  const boundaries = [40, 70, 90];
  return (
    <div className="w-full pt-10">
      <div className="relative">
        <div className="h-6 w-full flex shadow-inner bg-gray-200 rounded-full">
          {levels.map((level, index) => {
            const roundingClasses = `${index === 0 ? 'rounded-l-full' : ''} ${index === levels.length - 1 ? 'rounded-r-full' : ''}`;
            return (
              <Tooltip key={level.name} text={level.tooltip} style={{ width: `${level.width}%` }} className="h-full">
                <div className={`h-full w-full ${roundingClasses}`} style={{ backgroundColor: level.color }} />
              </Tooltip>
            );
          })}
        </div>
        <div className="absolute top-0 h-6 flex flex-col items-center" style={{ left: `clamp(2%, ${percentage}%, 98%)`, transform: 'translateX(-50%)' }}>
          <div className="absolute bottom-full mb-1 flex flex-col items-center">
            <div className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg whitespace-nowrap">Tu Logro: {percentage.toFixed(1)}%</div>
            <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-gray-800" />
          </div>
          <div className="w-1 h-full bg-black/80"></div>
        </div>
        <div className="relative h-4 mt-1">
           <span className="absolute text-xs text-gray-600" style={{ left: '0%' }}>0%</span>
           {boundaries.map(b => (<span key={b} className="absolute text-xs text-gray-600" style={{ left: `${b}%`, transform: 'translateX(-50%)' }}>{b}%</span>))}
           <span className="absolute text-xs text-gray-600" style={{ right: '0%' }}>100%</span>
        </div>
      </div>
    </div>
  );
};

export const RadarChart: React.FC<{ labels: string[]; studentData: number[]; courseData: number[]; }> = ({ labels, studentData, courseData }) => {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.4;
  if (labels.length < 3) {
    return (
        <div className="flex flex-col justify-center items-center text-center p-4 border rounded-lg bg-gray-50 text-gray-500 h-[300px]">
            <p className="font-semibold">Datos insuficientes para el gráfico.</p>
            <p className="text-sm mt-2">Se necesitan al menos 3 ítems en la evaluación para generar esta visualización.</p>
            {labels.length > 0 && <div className="mt-4 text-left text-xs"><p className="font-medium">Ítems evaluados:</p><ul className="list-disc list-inside">{labels.map(l => <li key={l}>{l}</li>)}</ul></div>}
        </div>
    );
  }
  const points = labels.map((_, i) => { const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2; return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) }; });
  const studentPolygon = studentData.map((value, i) => { const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2; const pointRadius = radius * (value / 100); return `${center + pointRadius * Math.cos(angle)},${center + pointRadius * Math.sin(angle)}`; }).join(' ');
  const coursePolygon = courseData.map((value, i) => { const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2; const pointRadius = radius * (value / 100); return `${center + pointRadius * Math.cos(angle)},${center + pointRadius * Math.sin(angle)}`; }).join(' ');
  return (
    <div className="flex justify-center items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map(r => (<polygon key={r} fill="none" stroke="#e5e7eb" points={points.map(p => `${center + (p.x - center) * r},${center + (p.y - center) * r}`).join(' ')} />))}
        {points.map((p, i) => (<line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e5e7eb" />))}
        <polygon points={coursePolygon} fill="#a5b4fc" fillOpacity="0.5" stroke="#6366f1" strokeWidth="2" />
        <polygon points={studentPolygon} fill="#6ee7b7" fillOpacity="0.6" stroke="#10b981" strokeWidth="2" />
        {points.map((p, i) => { const angle = (i / labels.length) * 2 * Math.PI - Math.PI / 2; const labelX = center + (radius + 20) * Math.cos(angle); const labelY = center + (radius + 20) * Math.sin(angle); return (<text key={i} x={labelX} y={labelY} textAnchor="middle" alignmentBaseline="middle" fontSize="10" fontWeight="bold" fill="#4b5563">{labels[i]}</text>)})}
      </svg>
    </div>
  );
};

export const HistoricalTrendChart: React.FC<{ history: HistoricalResult[] }> = ({ history }) => {
    const width = 600; const height = 300; const margin = { top: 20, right: 30, bottom: 50, left: 50 }; const innerWidth = width - margin.left - margin.right; const innerHeight = height - margin.top - margin.bottom;
    if (history.length < 2) { return <div className="flex justify-center items-center h-[300px] bg-gray-100 rounded-lg text-gray-500">Se necesitan al menos 2 evaluaciones para mostrar una tendencia.</div>; }
    const xScale = (index: number) => margin.left + (index / (history.length - 1)) * innerWidth; const yScale = (percentage: number) => margin.top + innerHeight - (percentage / 100) * innerHeight;
    const linePath = history.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.percentage)}`).join(' ');
    let trendPath = ''; const n = history.length; const x = history.map((_, i) => i); const y = history.map(d => d.percentage); const sumX = x.reduce((a, b) => a + b, 0); const sumY = y.reduce((a, b) => a + b, 0); const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0); const sumX2 = x.reduce((sum, val) => sum + val * val, 0); const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX); const intercept = (sumY - slope * sumX) / n;
    if(!isNaN(slope) && !isNaN(intercept)) { const trendStartY = slope * 0 + intercept; const trendEndY = slope * (n - 1) + intercept; trendPath = `M${xScale(0)},${yScale(trendStartY)} L${xScale(n - 1)},${yScale(trendEndY)}`; }
    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} aria-label="Gráfico de tendencias históricas">
            {[0, 25, 50, 75, 100].map(tick => (<g key={tick} className="text-gray-300"><line x1={margin.left} y1={yScale(tick)} x2={width - margin.right} y2={yScale(tick)} stroke="currentColor" strokeWidth="0.5" /><text x={margin.left - 8} y={yScale(tick)} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-current text-gray-500">{tick}%</text></g>))}
            <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {trendPath && <path d={trendPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" />}
            {history.map((d, i) => (<g key={d.evaluationId}><Tooltip text={`${d.evaluationName}: ${d.percentage.toFixed(1)}%`}><circle cx={xScale(i)} cy={yScale(d.percentage)} r="5" fill="#3b82f6" stroke="white" strokeWidth="2" /></Tooltip><text x={xScale(i)} y={height - margin.bottom + 20} textAnchor="middle" className="text-xs fill-current text-gray-600">{d.date}</text></g>))}
             <g className="text-sm font-medium mt-4"><text x={width - margin.right - 100} y={height-5}><tspan fill="#3b82f6">●</tspan> Desempeño</text><text x={width - margin.right} y={height-5} textAnchor="end"><tspan fill="#f59e0b">●</tspan> Línea de Tendencia</text></g>
        </svg>
    );
};

export const Histogram: React.FC<{ data: { name: string; count: number; color: string; range: string }[] }> = ({ data }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 flex justify-around items-end gap-x-2 md:gap-x-4 px-4 pb-2 pt-4" style={{ minHeight: '180px' }}>
                {data.map(item => {
                    const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    const minHeight = item.count > 0 ? 8 : 0;
                    const maxHeight = 140;
                    const barHeight = Math.max(minHeight, (heightPercent / 100) * maxHeight);
                    
                    return (
                        <div key={item.name} className="flex-1 flex flex-col items-center justify-end" style={{ height: maxHeight + 30 }}>
                            <div className="text-sm font-bold text-gray-700 mb-1 h-6 flex items-end">
                                {item.count}
                            </div>
                            
                            <Tooltip text={`${item.name} (${item.range}): ${item.count} estudiantes`}>
                                <div
                                    className="w-full rounded-t-md transition-all duration-500 ease-out"
                                    style={{
                                        height: `${barHeight}px`,
                                        backgroundColor: item.color,
                                        minWidth: '40px',
                                        maxWidth: '80px'
                                    }}
                                />
                            </Tooltip>
                            
                            <div className="text-xs text-gray-500 mt-2 text-center leading-tight" style={{ minHeight: '24px' }}>
                                {item.name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const DoughnutChart: React.FC<{ 
    data: { label: string; value: number; count: number; color: string }[]; 
    totalLabel: string; 
}> = ({ data, totalLabel }) => {
    const hasData = data.some(item => item.value > 0);
    const circumference = 2 * Math.PI * 45; // radius = 45
    let accumulatedOffset = 0;

    return (
        <div className="w-full h-full flex items-center justify-center gap-8">
            <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" className="stroke-gray-200" strokeWidth="10" fill="transparent" />
                    {hasData && data.map((item, index) => {
                        const strokeDasharray = `${(item.value / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedOffset;
                        accumulatedOffset += (item.value / 100) * circumference;

                        return (
                            <circle
                                key={index}
                                cx="50"
                                cy="50"
                                r="45"
                                stroke={item.color}
                                strokeWidth="10"
                                fill="transparent"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transform -rotate-90 origin-center transition-all duration-500"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">{totalLabel}</span>
                    <span className="text-sm text-gray-500">Estudiantes</span>
                </div>
            </div>
            
            <div className="flex flex-col justify-center space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: item.color }} />
                        <div className="flex-1 text-sm text-gray-700">
                            <span className="font-semibold">{item.label}:</span>
                            <span className="ml-2">{item.count} est. ({item.value.toFixed(1)}%)</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AnswerDistributionChart: React.FC<{ stats: { answer: string, count: number, isCorrect: boolean }[], total: number }> = ({ stats, total }) => (
    <div className="space-y-3">
        {stats.map(({ answer, count, isCorrect }) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            
            let barColor = 'bg-blue-400';
            if (isCorrect) {
                barColor = 'bg-green-500';
            } else if (answer === 'Omitida') {
                barColor = 'bg-amber-500';
            } else if (answer === 'Correcta') { // For open answer
                barColor = 'bg-green-500';
            } else if (answer === 'Incorrecta') { // for open answer
                barColor = 'bg-red-500';
            }
            
            let labelText = '';
            if (answer === 'Omitida' || answer === 'Correcta' || answer === 'Incorrecta') {
                labelText = answer;
            } else {
                labelText = `Alt. ${answer}`;
                if (isCorrect) {
                    labelText += ' (Clave)';
                }
            }

            return (
                <div key={answer} className="grid grid-cols-[10rem,1fr,3rem] gap-x-4 items-center text-sm">
                    <span className={`font-medium truncate ${isCorrect ? 'text-green-700' : 'text-gray-700'}`}>{labelText}</span>
                    
                    <Tooltip text={`${count} de ${total} estudiantes (${percentage.toFixed(1)}%)`}>
                        <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
                            <div 
                                style={{ width: `${percentage}%` }}
                                className={`${barColor} h-full ${percentage === 100 ? 'rounded-full' : 'rounded-l-full'} transition-all duration-300 flex items-center justify-center text-white text-xs font-bold`} 
                            >
                               {percentage >= 10 ? `${percentage.toFixed(0)}%` : ''}
                            </div>
                        </div>
                    </Tooltip>

                    <span className="text-right text-gray-800 font-semibold">{count}</span>
                </div>
            );
        })}
    </div>
);