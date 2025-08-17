
import React, { useState, useMemo } from 'react';
import { Chat } from "@google/genai";
import type { ProcessedEvaluation, Colegio, Docente, ResultadoEstudiante, ConceptualDiagnosis, InterventionGroup, RiskStudent } from '../../types';
import { SidebarHeader, MenuIcon } from '../components/common';
import { Tooltip, Button } from '../../../components/UI';
import { BarChartIcon, ClipboardDocumentListIcon, GlobeAltIcon, TableCellsIcon, LightBulbIcon, SparklesIcon, BeakerIcon } from '../../../components/Icons';
import { SummaryTab } from '../tabs/SummaryTab';
import { RosterTab } from '../tabs/RosterTab';
import { AnalysisOATab } from '../tabs/AnalysisOATab';
import { AnalysisHabilidadTab } from '../tabs/AnalysisHabilidadTab';
import { OAHabMatrixTab } from '../tabs/OAHabMatrixTab';
import { ItemAnalysisTab } from '../tabs/ItemAnalysisTab';
import { AdvancedAnalysisTab } from '../tabs/AdvancedAnalysisTab';
import { IndividualStudentReport } from './IndividualStudentReport';
import { calculateGrade } from '../lib/utils';

interface AiCacheValue {
    diagnoses?: ConceptualDiagnosis[];
    interventionGroups?: {risks: RiskStudent[], groups: InterventionGroup[]};
    chatHistory?: {role: 'user' | 'model', text: string}[];
    chatInstance?: Chat;
}

interface CourseReportProps {
    evaluation: ProcessedEvaluation;
    selection: { colegio: Colegio; docente: Docente };
}

export const CourseReport: React.FC<CourseReportProps> = (props) => {
    const { evaluation, selection } = props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeDetailTab, setActiveDetailTab] = useState('resumen');
    const [aiCache, setAiCache] = useState<{ [evaluationId: string]: AiCacheValue }>({});
    const [selectedStudent, setSelectedStudent] = useState<ResultadoEstudiante | null>(null);
    const [displayExigencia, setDisplayExigencia] = useState(evaluation.configuracion.porcentajeExigencia);

    const recalculatedResults = useMemo(() => {
        return evaluation.resultados.map(r => {
            if (r.estado === 'Ausente') return r;
            const { calificacion, estado } = calculateGrade(r.puntajeObtenido, r.puntajeTotal, displayExigencia);
            return { ...r, calificacion, estado };
        });
    }, [evaluation, displayExigencia]);
    
    const detailTabs = [
        { id: 'resumen', label: 'Resumen Curso', icon: BarChartIcon },
        { id: 'lista-curso', label: 'Lista Curso', icon: ClipboardDocumentListIcon },
        { id: 'analisis-oa', label: 'Análisis por OA', icon: GlobeAltIcon },
        { id: 'analisis-hab', label: 'Análisis por Habilidad', icon: BeakerIcon },
        { id: 'matriz-oa-hab', label: 'Matriz OA/Habilidad', icon: TableCellsIcon },
        { id: 'analisis-item', label: 'Análisis de Ítem', icon: LightBulbIcon },
        { id: 'analisis-avanzado', label: 'Análisis con IA', icon: SparklesIcon },
    ];

    const renderContent = () => {
        const contentForTab = () => {
             switch(activeDetailTab) {
                case 'resumen': return <SummaryTab results={recalculatedResults} config={evaluation.configuracion} />;
                case 'lista-curso': return <RosterTab results={recalculatedResults} config={evaluation.configuracion} onViewStudentReport={setSelectedStudent} displayExigencia={displayExigencia} onExigenciaChange={setDisplayExigencia} selection={selection} />;
                case 'analisis-oa': return <AnalysisOATab analysisData={evaluation.analysisData} students={recalculatedResults} />;
                case 'analisis-hab': return <AnalysisHabilidadTab analysisData={evaluation.analysisData} students={recalculatedResults} />;
                case 'matriz-oa-hab': return <OAHabMatrixTab analysisData={evaluation.analysisData} config={evaluation.configuracion} />;
                case 'analisis-item': return <ItemAnalysisTab analysisData={evaluation.analysisData} config={evaluation.configuracion} />;
                case 'analisis-avanzado': return <AdvancedAnalysisTab 
                    evaluation={evaluation}
                    selection={selection}
                    aiCache={aiCache[evaluation.id] || {}}
                    setAiCache={(data) => setAiCache(prev => ({...prev, [evaluation.id]: data}))}
                    />;
                default: return null;
            }
        };

        if (activeDetailTab === 'analisis-avanzado') {
            return contentForTab();
        }

        return (
            <div className="p-4 sm:p-6 lg:p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-4">{detailTabs.find(t => t.id === activeDetailTab)?.label}</h1>
                {contentForTab()}
            </div>
        );
    };

    return (
        <div className="flex w-full h-full relative">
            {selectedStudent && (
                <IndividualStudentReport
                    student={selectedStudent}
                    config={evaluation.configuracion}
                    allResults={recalculatedResults}
                    analysisData={evaluation.analysisData}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
            <aside className={`bg-white shadow-lg transition-all duration-300 ease-in-out flex flex-col flex-shrink-0 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-[72px] p-4 border-b border-gray-200">
                    <SidebarHeader isOpen={isSidebarOpen} />
                </div>
                 <div className="p-2 border-b border-gray-200">
                    <Tooltip text={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}>
                        <Button variant="ghost" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3 rounded-md text-gray-600 hover:bg-gray-100">
                            <MenuIcon className="w-6 h-6" />
                        </Button>
                    </Tooltip>
                </div>
                 <nav className="flex flex-col gap-1 p-2 flex-grow">
                    {detailTabs.map(tab => {
                        const isCurrent = activeDetailTab === tab.id;
                        return (
                            <Tooltip key={tab.id} text={!isSidebarOpen ? tab.label : ''}>
                                <button onClick={() => setActiveDetailTab(tab.id)} className={`flex items-center gap-3 w-full text-left p-3 rounded-md text-sm font-medium transition-colors ${ isCurrent ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' } ${!isSidebarOpen && 'justify-center'}`}>
                                    <tab.icon className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`} />
                                    <span className={`flex-grow transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 sr-only'}`}>{tab.label}</span>
                                </button>
                            </Tooltip>
                        );
                    })}
                </nav>
            </aside>
            <div className="flex-grow flex flex-col">
                <header className="relative flex-shrink-0 bg-white px-6 py-3 border-b border-gray-200 h-[72px] flex items-center">
                     <div className="flex items-center justify-between w-full gap-6">
                        <div className="flex-shrink min-w-0">
                            <h2 className="text-lg font-bold text-gray-800 truncate" title={evaluation.configuracion.nombre}>
                                {evaluation.configuracion.nombre}
                            </h2>
                            <p className="text-sm text-gray-500 truncate">
                                {new Date(evaluation.configuracion.fecha + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} | {selection.docente.nombreCompleto}
                            </p>
                        </div>
                    </div>
                </header>
                <main className="flex-grow overflow-y-auto bg-gray-50">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};
