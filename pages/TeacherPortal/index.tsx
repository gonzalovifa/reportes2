
import React, { useState, useEffect, useMemo } from 'react';
import type { ConfiguracionEvaluacion, ProcessedEvaluation, Colegio, Docente } from '../../types';
import { loadAllProcessedEvaluations } from '../../lib/firebase';
import { UploadView } from './views/UploadView';
import { ReportsView } from './views/ReportsView';
import { CourseReport } from './reports/CourseReport';
import { GradeRightLogo } from './components/common';

interface TeacherPortalProps {
  configurations: ConfiguracionEvaluacion[];
  selection: { colegio: Colegio; docente: Docente };
  onBack: () => void;
  mode: 'upload' | 'reports';
  onNavigateHome: () => void;
  initialEvaluations?: ProcessedEvaluation[] | null;
  initialActiveEvaluation?: ProcessedEvaluation | null;
  onInitialEvaluationConsumed?: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ mode, configurations, selection, onBack, onNavigateHome, initialEvaluations, initialActiveEvaluation, onInitialEvaluationConsumed }) => {
    const [view, setView] = useState<'upload' | 'reports'>(mode);
    const [allProcessedEvaluations, setAllProcessedEvaluations] = useState<ProcessedEvaluation[] | null>(null);
    const [isLoading, setIsLoading] = useState(mode === 'reports');
    const [activeEvaluation, setActiveEvaluation] = useState<ProcessedEvaluation | null>(null);

    const filteredEvaluations = useMemo(() => {
        if (!allProcessedEvaluations) return null;
        return allProcessedEvaluations.filter(e => e.colegioId === selection.colegio.id && e.docenteId === selection.docente.id);
    }, [allProcessedEvaluations, selection.colegio.id, selection.docente.id]);

    useEffect(() => {
        if (view === 'reports' && allProcessedEvaluations === null) {
            if (initialEvaluations) {
                setAllProcessedEvaluations(initialEvaluations);
                setIsLoading(false);
            } else {
                setIsLoading(true);
                loadAllProcessedEvaluations()
                    .then(setAllProcessedEvaluations)
                    .catch(() => setAllProcessedEvaluations([]))
                    .finally(() => setIsLoading(false));
            }
        }
    }, [view, allProcessedEvaluations, initialEvaluations]);

    useEffect(() => {
        if (initialActiveEvaluation && onInitialEvaluationConsumed) {
            setActiveEvaluation(initialActiveEvaluation);
            onInitialEvaluationConsumed();
        }
    }, [initialActiveEvaluation, onInitialEvaluationConsumed]);

    const handleReportGenerated = (newEvaluation: ProcessedEvaluation) => {
        setAllProcessedEvaluations(prev => (prev ? [newEvaluation, ...prev] : [newEvaluation]));
        setActiveEvaluation(newEvaluation);
        setView('reports');
    };

    const handleReportDeleted = (evaluationId: string) => {
        if (activeEvaluation && activeEvaluation.id === evaluationId) {
            setActiveEvaluation(null);
        }
        setAllProcessedEvaluations(prev => prev ? prev.filter(e => e.id !== evaluationId) : []);
    };
    
    const handleBackToHistory = () => {
        setActiveEvaluation(null);
        setView('reports');
    };
    
    const showReportsList = view === 'reports' && !isLoading && !activeEvaluation;
    const showReportDetail = view === 'reports' && !isLoading && activeEvaluation;

    return (
        <div className="flex flex-col h-screen bg-gray-100 font-sans">
             <header className="flex-shrink-0 bg-white shadow-sm p-4 border-b">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <GradeRightLogo onClick={onBack} />
                    <nav className="flex items-center space-x-6">
                        <button onClick={onNavigateHome} className={`text-base font-medium transition-colors pb-1 text-gray-500 hover:text-primary-600`}>
                           Inicio
                        </button>
                         <button onClick={() => { setView('upload'); setActiveEvaluation(null); }} className={`text-base font-medium transition-colors pb-1 ${view === 'upload' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-primary-600'}`}>
                            Subir Resultados
                        </button>
                        <button 
                            disabled={!activeEvaluation}
                            className={`text-base font-medium transition-colors pb-1 ${activeEvaluation ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 cursor-not-allowed'}`}>
                            Reportes
                        </button>
                        <button onClick={handleBackToHistory} className={`text-base font-medium transition-colors pb-1 ${view === 'reports' && !activeEvaluation ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-primary-600'}`}>
                            Historial de Reportes
                        </button>
                    </nav>
                </div>
            </header>
            <main className="flex-grow overflow-hidden">
                {view === 'upload' && (
                    <UploadView
                        configurations={configurations}
                        selection={selection}
                        onProcessComplete={handleReportGenerated}
                    />
                )}
                {showReportsList && (
                    <ReportsView
                        evaluations={filteredEvaluations}
                        selection={selection}
                        onReportDeleted={handleReportDeleted}
                        onSelectReport={setActiveEvaluation}
                    />
                )}
                {showReportDetail && (
                    <CourseReport 
                        evaluation={activeEvaluation!}
                        selection={selection}
                    />
                )}
            </main>
        </div>
    );
};
