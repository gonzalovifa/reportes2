
import React from 'react';
import type { AnalysisData, ResultadoEstudiante } from '../../../types';
import { ReportSection } from '../components/common';
import { OAMatrix, ReportCategoryTable, AchievementLegend } from '../components/tables';


interface AnalysisOATabProps {
    analysisData: AnalysisData; 
    students: ResultadoEstudiante[];
}
export const AnalysisOATab: React.FC<AnalysisOATabProps> = ({analysisData, students}) => {
    return (
        <ReportSection>
             <div className="mb-10">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Resumen de Logro del Curso por OA</h4>
                <ReportCategoryTable data={analysisData.porOA} />
            </div>
             <div className="pt-6 border-t">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Matriz de Desempeño por Estudiante</h4>
                <p className="text-sm text-gray-500 mb-4">Matriz de desempeño que muestra el logro de cada estudiante por cada Objetivo de Aprendizaje evaluado.</p>
                <OAMatrix analysisData={analysisData} students={students} />
                <AchievementLegend />
             </div>
        </ReportSection>
    )
};