
import React, { useMemo } from 'react';
import type { AnalysisData, ResultadoEstudiante } from '../../../types';
import { ReportSection } from '../components/common';
import { SkillsHeatmapMatrix, ReportCategoryTable, AchievementLegend } from '../components/tables';

interface AnalysisHabilidadTabProps {
    analysisData: AnalysisData;
    students: ResultadoEstudiante[];
}
export const AnalysisHabilidadTab: React.FC<AnalysisHabilidadTabProps> = ({analysisData, students}) => {
    const sortedHabilidades = useMemo(() => 
        [...analysisData.porHabilidad].sort((a,b) => a.nombre.localeCompare(b.nombre)), 
        [analysisData.porHabilidad]
    );
    
    return (
        <ReportSection>
            <div className="mb-10">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Resumen de Habilidades del Curso</h4>
                <ReportCategoryTable data={sortedHabilidades} />
            </div>

            <h4 className="text-lg font-semibold text-gray-800 mb-3 pt-6 border-t">Mapa de Calor por Estudiante</h4>
            <p className="text-sm text-gray-500 mb-4">Matriz visual del dominio de cada estudiante por habilidad, permitiendo un diagnóstico rápido de fortalezas y debilidades a nivel individual y grupal.</p>
            <SkillsHeatmapMatrix analysisData={analysisData} students={students} />
            <AchievementLegend />
        </ReportSection>
    )
};