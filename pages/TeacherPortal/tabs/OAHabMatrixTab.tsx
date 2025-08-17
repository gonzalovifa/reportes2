
import React from 'react';
import type { AnalysisData, ConfiguracionEvaluacion } from '../../../types';
import { ReportSection } from '../components/common';
import { OAHabMatrix, AchievementLegend } from '../components/tables';

interface OAHabMatrixTabProps {
    analysisData: AnalysisData;
    config: ConfiguracionEvaluacion;
}
export const OAHabMatrixTab: React.FC<OAHabMatrixTabProps> = ({ analysisData, config }) => {
    return (
        <ReportSection>
            <p className="text-sm text-gray-500 mb-4">
                Esta matriz muestra el desempeño agregado del curso en la intersección de cada Objetivo de Aprendizaje y Habilidad evaluada.
            </p>
            <OAHabMatrix analysisData={analysisData} config={config} />
            <AchievementLegend />
        </ReportSection>
    );
};