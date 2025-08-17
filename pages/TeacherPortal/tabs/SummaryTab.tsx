import React, { useMemo } from 'react';
import type { ResultadoEstudiante, ConfiguracionEvaluacion } from '../../../types';
import { StatCard } from '../components/ui';
import { DoughnutChart, Histogram } from '../components/charts';
import { getAchievementLevel } from '../lib/utils';
import { ACHIEVEMENT_LEVELS } from '../components/common';

const CourseSummaryDashboard: React.FC<{
    results: ResultadoEstudiante[];
    config: ConfiguracionEvaluacion;
}> = ({results, config}) => {
    
    const memoizedStats = useMemo(() => {
        const presentStudents = results.filter(r => r.estado !== 'Ausente');
        if (presentStudents.length === 0) return null;

        const percentages = presentStudents.map(r => r.puntajeTotal > 0 ? (r.puntajeObtenido / r.puntajeTotal) * 100 : 0);
        const scores = presentStudents.map(r => r.puntajeObtenido);

        const sum = scores.reduce((a, b) => a + b, 0);
        const averageScore = scores.length > 0 ? sum / scores.length : 0;
        const averagePercentage = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
        const sortedScores = [...scores].sort((a,b) => a - b);
        const mid = Math.floor(sortedScores.length / 2);
        const median = sortedScores.length % 2 === 0 ? (sortedScores.length > 0 ? (sortedScores[mid-1] + sortedScores[mid]) / 2 : 0) : sortedScores[mid];
        const variance = scores.length > 0 ? scores.reduce((acc, score) => acc + Math.pow(score - averageScore, 2), 0) / scores.length : 0;
        const stdDev = Math.sqrt(variance);

        // Cálculo correcto para histograma de niveles de logro
        const histoCounts: Record<string, number> = { 'Insuficiente': 0, 'Elemental': 0, 'Adecuado': 0, 'Destacado': 0 };
        percentages.forEach(p => { 
            const level = getAchievementLevel(p); 
            histoCounts[level.name]++; 
        });
        
        const histogramData = [
            { name: 'Insuficiente', count: histoCounts.Insuficiente, color: ACHIEVEMENT_LEVELS.INSUFICIENTE.color, range: '0% - 39.9%' },
            { name: 'Elemental', count: histoCounts.Elemental, color: ACHIEVEMENT_LEVELS.ELEMENTAL.color, range: '40% - 69.9%' },
            { name: 'Adecuado', count: histoCounts.Adecuado, color: ACHIEVEMENT_LEVELS.ADECUADO.color, range: '70% - 89.9%' },
            { name: 'Destacado', count: histoCounts.Destacado, color: ACHIEVEMENT_LEVELS.DESTACADO.color, range: '90% - 100%' },
        ];
        const predominantLevel = Object.entries(histoCounts).reduce((a, b) => b[1] >= a[1] ? b : a, ["", 0])[0];
        
        const totalStudents = presentStudents.length;
        
        // Cálculo correcto para cuartiles (rangos de puntaje, no porcentajes)
        const quartileCounts = { '75-100%': 0, '50-75%': 0, '25-50%': 0, '0-25%': 0 };
        percentages.forEach(p => {
            if (p >= 75) quartileCounts['75-100%']++;
            else if (p >= 50) quartileCounts['50-75%']++;
            else if (p >= 25) quartileCounts['25-50%']++;
            else quartileCounts['0-25%']++;
        });

        const doughnutChartData = [
            { 
                label: '75-100%', 
                value: totalStudents > 0 ? (quartileCounts['75-100%'] / totalStudents) * 100 : 0, 
                count: quartileCounts['75-100%'], 
                color: '#3b82f6'
            },
            { 
                label: '50-75%', 
                value: totalStudents > 0 ? (quartileCounts['50-75%'] / totalStudents) * 100 : 0, 
                count: quartileCounts['50-75%'], 
                color: '#16a34a'
            },
            { 
                label: '25-50%', 
                value: totalStudents > 0 ? (quartileCounts['25-50%'] / totalStudents) * 100 : 0, 
                count: quartileCounts['25-50%'], 
                color: '#f97316'
            },
            { 
                label: '0-25%', 
                value: totalStudents > 0 ? (quartileCounts['0-25%'] / totalStudents) * 100 : 0, 
                count: quartileCounts['0-25%'], 
                color: '#ef4444'
            }
        ];

        const totalCorrect = presentStudents.reduce((s, r) => s + r.correctas, 0);
        const totalIncorrect = presentStudents.reduce((s, r) => s + r.incorrectas, 0);
        const totalOmitted = presentStudents.reduce((s, r) => s + r.omitidas, 0);
        const totalAnswers = totalCorrect + totalIncorrect + totalOmitted;

        return { 
            averageScore, averagePercentage, median, stdDev, predominantLevel,
            histogramData, doughnutChartData, 
            totalCorrect, totalIncorrect, totalOmitted, totalAnswers, totalStudents,
            maxScore: config.claves.reduce((sum, c) => sum + c.puntaje, 0),
        };
    }, [results, config]);

    if (!memoizedStats) {
        return <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-200"><p className="text-gray-500 italic">No hay suficientes datos de estudiantes para generar el resumen del curso.</p></div>;
    }
    
    const { 
        averageScore, averagePercentage, median, stdDev, predominantLevel,
        histogramData, doughnutChartData, 
        totalCorrect, totalIncorrect, totalOmitted, totalAnswers, totalStudents,
        maxScore
    } = memoizedStats;

    return (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Stats Cards */}
            <div className="md:col-span-2">
                <StatCard label="PUNTAJE PROMEDIO" value={averageScore.toFixed(1)} valueColor="text-brand-blue" footer={`Sobre un total de ${maxScore} puntos`} />
            </div>
            <div className="md:col-span-2">
                 <StatCard label="% LOGRO PROMEDIO" value={`${averagePercentage.toFixed(1)}%`} valueColor="text-brand-aqua" footer="Promedio de porcentajes de logro." />
            </div>
            <div className="md:col-span-2">
                 <StatCard label="MEDIANA" value={median.toFixed(1)} valueColor="text-purple-600" footer={`Desv. Estándar: ${stdDev.toFixed(1)}`} />
            </div>

            {/* Histograma de Niveles de Logro */}
            <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-md ring-1 ring-gray-900/5">
                <h3 className="text-lg font-semibold text-gray-800">Histograma de Niveles de Logro</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Distribución del número de estudiantes por cada nivel de desempeño.</p>
                <div className="h-64">
                    <Histogram data={histogramData} />
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                        {histogramData.map(level => (
                           <div key={level.name} className="flex items-center gap-2">
                               <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{backgroundColor: level.color}}></span>
                               <span className="text-sm text-gray-600 font-medium">{level.name} ({level.count})</span>
                           </div>
                       ))}
                    </div>
                </div>
            </div>

            {/* Distribución de Puntajes por Cuartiles */}
            <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-md ring-1 ring-gray-900/5 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-800">Distribución de Puntajes por Cuartiles</h3>
                 <p className="text-sm text-gray-500 mt-1 mb-4">Porcentaje de estudiantes que se ubican en cada rango de puntaje.</p>
                 <div className="flex-grow flex items-center justify-center min-h-[200px]">
                    <DoughnutChart data={doughnutChartData} totalLabel={String(totalStudents)} />
                 </div>
            </div>

            {/* Distribución de Respuestas */}
            <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-md ring-1 ring-gray-900/5">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Distribución de Respuestas</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-600">Correctas:</span><span className="font-bold text-lg text-green-600">{totalCorrect} ({(totalAnswers > 0 ? (totalCorrect/totalAnswers * 100).toFixed(1) : 0)}%)</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-600">Incorrectas:</span><span className="font-bold text-lg text-red-600">{totalIncorrect} ({(totalAnswers > 0 ? (totalIncorrect/totalAnswers * 100).toFixed(1) : 0)}%)</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-600">Omitidas:</span><span className="font-bold text-lg text-yellow-600">{totalOmitted} ({(totalAnswers > 0 ? (totalOmitted/totalAnswers * 100).toFixed(1) : 0)}%)</span></div>
                </div>
            </div>

            {/* Estadísticas Adicionales */}
            <div className="md:col-span-3 bg-white p-6 rounded-xl shadow-md ring-1 ring-gray-900/5">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Estadísticas Adicionales</h3>
                 <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center"><span className="text-gray-600">Total de Estudiantes:</span><span className="font-bold text-lg text-gray-800">{totalStudents}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-600">Puntaje Máximo:</span><span className="font-bold text-lg text-gray-800">{maxScore} puntos</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-600">Nivel Predominante:</span><span className="font-bold text-lg text-gray-800">{predominantLevel}</span></div>
                </div>
            </div>
        </div>
    );
};

export const SummaryTab: React.FC<{
    results: ResultadoEstudiante[];
    config: ConfiguracionEvaluacion;
}> = ({ results, config }) => {
    return <CourseSummaryDashboard results={results} config={config} />;
};