
import React from 'react';
import type { ResultadoEstudiante, ConfiguracionEvaluacion, Colegio, Docente } from '../../../types';
import { FormField, Input } from '../../../components/UI';
import { ResultsTable } from '../components/tables';
import { ReportSection } from '../components/common';

interface RosterTabProps {
    results: ResultadoEstudiante[];
    config: ConfiguracionEvaluacion;
    onViewStudentReport: (s: ResultadoEstudiante) => void;
    displayExigencia: number;
    onExigenciaChange: (value: number) => void;
    selection: { colegio: Colegio; docente: Docente };
}
export const RosterTab: React.FC<RosterTabProps> = ({results, config, onViewStudentReport, displayExigencia, onExigenciaChange, selection}) => {
    const handleExigenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value, 10);
        if (isNaN(value)) {
            onExigenciaChange(50);
            return;
        }
        const clampedValue = Math.max(50, Math.min(70, value));
        onExigenciaChange(clampedValue);
    };

    return (
        <ReportSection>
             <div className="p-4 bg-gray-50 border rounded-lg mb-6 max-w-sm">
                <FormField label="Ajustar Dificultad de Calificación" htmlFor="exigencia-input">
                    <div className="flex items-center gap-2">
                        <Input
                            id="exigencia-input"
                            type="number"
                            value={displayExigencia}
                            onChange={handleExigenciaChange}
                            className="w-24 text-center"
                            min="50"
                            max="70"
                        />
                        <span className="text-lg font-medium text-gray-800">%</span>
                    </div>
                </FormField>
                <p className="text-xs text-gray-500 mt-2">Ajuste el porcentaje de exigencia (entre 50% y 70%) para recalcular las calificaciones. El valor por defecto de la prueba es {config.porcentajeExigencia}%.</p>
            </div>
             <ResultsTable initialResults={results} config={config} onViewReport={onViewStudentReport} selection={selection} />
        </ReportSection>
    );
};