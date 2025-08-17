
import React, { useState, useMemo } from 'react';
import type { ProcessedEvaluation, Colegio, Docente } from '../../../types';
import { Button, Modal, Tooltip } from '../../../components/UI';
import { SpinnerIcon, ArchiveBoxIcon, DocumentArrowDownIcon, SparklesIcon, TrashIcon, FileIcon } from '../../../components/Icons';
import { deleteProcessedEvaluation } from '../../../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI, Type } from "@google/genai";
import { OBJETIVOS_APRENDIZAJE } from '../../../lib/data';

const drawCoursePdfContent = (doc: jsPDF, evaluation: ProcessedEvaluation, selection: { colegio: Colegio; docente: Docente }) => {
    const { configuracion, resultados, analysisData } = evaluation;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 0;

    const addHeader = (pageTitle: string) => {
        y = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#2AB9B6'); // brand-aqua
        doc.text('APRENDO', margin, y);
        const aprendoWidth = doc.getStringUnitWidth('APRENDO') * 18 / doc.internal.scaleFactor;
        doc.setTextColor('#ED6E45'); // brand-orange
        doc.text('CREANDO', margin + aprendoWidth + 4, y);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(selection.docente.nombreCompleto, pageWidth - margin, y, { align: 'right' });
        
        y += 20;
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text(pageTitle, pageWidth / 2, y, { align: 'center' });
        
        y += 15;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Fecha: ${configuracion.fecha}`, pageWidth / 2, y, { align: 'center' });
        y += 25;
    };
    
    const checkPageBreak = (spaceNeeded: number) => {
        if (y + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            addHeader(`Reporte de Curso: ${configuracion.nombre}`);
            return true;
        }
        return false;
    };

    const addSectionTitle = (title: string) => {
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor('#374151');
        doc.text(title, margin, y);
        y += 20;
    };

    addHeader(`Reporte de Curso: ${configuracion.nombre}`);
    
    addSectionTitle('Resumen General del Curso');
    const presentStudents = resultados.filter(r => r.estado !== 'Ausente');
    const avgPercentage = analysisData.porOA.reduce((sum, oa) => sum + oa.metricasGenerales.porcentajeLogro, 0) / (analysisData.porOA.length || 1);
    const avgScore = presentStudents.reduce((sum, r) => sum + r.puntajeObtenido, 0) / (presentStudents.length || 1);
    const maxScore = configuracion.claves.reduce((sum, c) => sum + c.puntaje, 0);

    autoTable(doc, {
        startY: y,
        head: [['Métrica', 'Valor']],
        body: [
            ['Estudiantes Evaluados', `${presentStudents.length} de ${resultados.length}`],
            ['Puntaje Promedio', `${avgScore.toFixed(1)} de ${maxScore}`],
            ['Porcentaje de Logro Promedio', `${avgPercentage.toFixed(1)}%`],
        ],
        theme: 'grid'
    });
    y = (doc as any).lastAutoTable.finalY + 30;

    addSectionTitle('Desempeño por Objetivo de Aprendizaje');
    autoTable(doc, {
        startY: y,
        head: [['Objetivo de Aprendizaje', '% Logro']],
        body: analysisData.porOA.map(oa => [oa.nombre, `${oa.metricasGenerales.porcentajeLogro.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: '#475569' },
    });
    y = (doc as any).lastAutoTable.finalY + 30;
    
    checkPageBreak(100);

    addSectionTitle('Desempeño por Habilidad');
    autoTable(doc, {
        startY: y,
        head: [['Habilidad', '% Logro']],
        body: analysisData.porHabilidad.map(hab => [hab.nombre, `${hab.metricasGenerales.porcentajeLogro.toFixed(1)}%`]),
        theme: 'striped',
        headStyles: { fillColor: '#475569' },
    });
    y = (doc as any).lastAutoTable.finalY;

    doc.addPage();
    addHeader(`Reporte de Curso: ${configuracion.nombre}`);

    addSectionTitle('Análisis de Preguntas');
    const itemAnalysisBody = analysisData.porPregunta.map(p => {
        const itemPsycho = analysisData.itemAnalysis.find(ia => ia.numeroPregunta === p.numeroPregunta);
        return [ p.numeroPregunta, `${p.porcentajeLogro.toFixed(1)}%`, itemPsycho ? itemPsycho.discriminationIndex.toFixed(2) : 'N/A' ];
    });
    autoTable(doc, {
        startY: y,
        head: [['Pregunta Nº', '% de Respuestas Correctas (Dificultad)', 'Índice de Discriminación']],
        body: itemAnalysisBody,
        theme: 'grid'
    });
    y = (doc as any).lastAutoTable.finalY + 30;

    doc.addPage();
    addHeader(`Reporte de Curso: ${configuracion.nombre}`);

    addSectionTitle('Resultados por Estudiante');
    const studentBody = resultados.map(r => [
        r.nombreEstudiante,
        r.estado === 'Ausente' ? 'Ausente' : `${r.puntajeObtenido}/${r.puntajeTotal}`,
        r.estado === 'Ausente' ? 'N/A' : `${(r.puntajeTotal > 0 ? (r.puntajeObtenido/r.puntajeTotal*100) : 0).toFixed(1)}%`,
        r.estado === 'Ausente' ? '1.0' : r.calificacion,
    ]);
    autoTable(doc, {
        startY: y,
        head: [['Estudiante', 'Puntaje', '% Logro', 'Nota']],
        body: studentBody,
        theme: 'grid'
    });
};


interface ReportsViewProps {
    evaluations: ProcessedEvaluation[] | null;
    selection: { colegio: Colegio; docente: Docente };
    onReportDeleted: (id: string) => void;
    onSelectReport: (evaluation: ProcessedEvaluation) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ evaluations, selection, onReportDeleted, onSelectReport }) => {
    const [notification, setNotification] = useState<{message: string; type: 'success' | 'error'} | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean; id: string | null}>({isOpen: false, id: null});
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
    const [isGeneratingUnifiedReport, setIsGeneratingUnifiedReport] = useState(false);
    
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({message, type});
        setTimeout(() => setNotification(null), 4000);
    };

    const handleDeleteRequest = (id: string) => {
        setDeleteConfirmation({isOpen: true, id});
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmation.id) return;
        const evalIdToDelete = deleteConfirmation.id;
        setDeleteConfirmation({isOpen: false, id: null});

        try {
            await deleteProcessedEvaluation(evalIdToDelete);
            onReportDeleted(evalIdToDelete);
            showNotification("Reporte eliminado con éxito.", "success");
        } catch(error) {
            console.error("Error deleting report:", error);
            showNotification("No se pudo eliminar el reporte.", "error");
        }
    };

    const handleDownloadCoursePdf = async (evaluation: ProcessedEvaluation) => {
        setGeneratingPdfId(evaluation.id);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            drawCoursePdfContent(doc, evaluation, selection);
            doc.save(`Reporte_Curso_${evaluation.configuracion.nombre.replace(/\s/g, '_')}.pdf`);
        } catch(e) {
            console.error(e);
            showNotification("Error al generar PDF", "error");
        } finally {
            setGeneratingPdfId(null);
        }
    };
    
    const handleGenerateUnifiedReport = async () => {
        if (!evaluations || evaluations.length < 1) return;
        setIsGeneratingUnifiedReport(true);
        try {
            if (evaluations.length === 1) {
                handleDownloadCoursePdf(evaluations[0]);
                setIsGeneratingUnifiedReport(false);
                return;
            }

            const doc = new jsPDF({ orientation: 'landscape' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            let y = 0;

            const sortedEvals = [...evaluations].sort((a, b) => new Date(a.configuracion.fecha).getTime() - new Date(b.configuracion.fecha).getTime());
            
            let aiAnalysis: any = null;
            try {
                const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
                const dataForAI = sortedEvals.map(ev => ({ evaluationName: ev.configuracion.nombre, evaluationDate: ev.configuracion.fecha, averageAchievement: (ev.analysisData.porOA.reduce((sum, oa) => sum + oa.metricasGenerales.porcentajeLogro, 0) / (ev.analysisData.porOA.length || 1)).toFixed(1) + '%', oaPerformance: ev.analysisData.porOA.map(oa => ({ oaCode: OBJETIVOS_APRENDIZAJE.find(o => o.id === oa.id)?.codigo || oa.id, achievement: oa.metricasGenerales.porcentajeLogro.toFixed(1) + '%' })), habilidadPerformance: ev.analysisData.porHabilidad.map(h => ({ habilidadName: h.nombre, achievement: h.metricasGenerales.porcentajeLogro.toFixed(1) + '%' })) }));
                const prompt = `Eres un asesor pedagógico de élite, experto en analizar datos educativos para generar insights accionables. Analiza la siguiente serie de resultados de evaluaciones para el curso de ${selection.docente.nombreCompleto}. Proporciona un análisis comparativo exhaustivo y preciso. Datos de las evaluaciones: ${JSON.stringify(dataForAI, null, 2)} Tu tarea es devolver un objeto JSON estructurado. Sé profundo, analítico y utiliza un lenguaje profesional pero claro.`;
                const responseSchema = { type: Type.OBJECT, properties: { executiveSummary: { type: Type.STRING, description: "Un resumen ejecutivo (2-3 frases) sobre la trayectoria general del curso, destacando la tendencia principal (mejora, estancamiento, etc.)." }, longitudinalOaAnalysis: { type: Type.ARRAY, description: "Análisis de la evolución de OAs clave. Identifica 3-4 OAs con tendencias interesantes (mejora notable, declive preocupante, o estancamiento en un nivel bajo).", items: { type: Type.OBJECT, properties: { oaCode: { type: Type.STRING }, analysis: { type: Type.STRING, description: "Descripción de la tendencia y posible interpretación pedagógica." } } } }, consolidatedStrengths: { type: Type.ARRAY, description: "Lista de 2-3 fortalezas (OAs o Habilidades) que se muestran consistentemente altas a lo largo de las evaluaciones.", items: { type: Type.STRING } }, priorityAreas: { type: Type.ARRAY, description: "Lista de 2-3 áreas prioritarias de mejora (OAs o Habilidades) que se muestran consistentemente bajas o en declive.", items: { type: Type.STRING } }, strategicRecommendations: { type: Type.ARRAY, description: "Tres recomendaciones estratégicas y accionables para el docente, basadas en todo el análisis anterior.", items: { type: Type.STRING } } } };
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema } });
                aiAnalysis = JSON.parse(response.text);
            } catch (e) {
                console.error("AI Unified Report generation failed:", e);
                aiAnalysis = null;
            }

            y = margin;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.setTextColor('#2AB9B6');
            doc.text('APRENDO', margin, y);
            const aprendoWidth = doc.getStringUnitWidth('APRENDO') * 18 / doc.internal.scaleFactor;
            doc.setTextColor('#ED6E45');
            doc.text('CREANDO', margin + aprendoWidth + 4, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`${selection.colegio.nombre} | ${selection.docente.nombreCompleto}`, pageWidth - margin, y, { align: 'right' });
            y += 25;
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40);
            doc.text('Reporte Comparativo de Evaluaciones', pageWidth / 2, y, { align: 'center' });
            y += 20;

            if (aiAnalysis) {
                const addWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight = 12) => { const lines = doc.splitTextToSize(text, maxWidth); doc.text(lines, x, startY); return startY + lines.length * lineHeight; };
                doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Análisis Comparativo con IA', margin, y); y += 20;
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Resumen Ejecutivo:', margin, y); y += 15;
                doc.setFontSize(10); doc.setFont('helvetica', 'normal'); y = addWrappedText(aiAnalysis.executiveSummary, margin, y, pageWidth - margin * 2); y += 10;
            }

            doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Resumen Ejecutivo Comparativo', margin, y); y += 20;
            const summaryHead = [['Métrica', ...sortedEvals.map(ev => `${ev.configuracion.nombre.substring(0, 25)}... (${ev.configuracion.fecha})`)]];
            const summaryBody = [ ['% Logro Promedio', ...sortedEvals.map(ev => `${(ev.analysisData.porOA.reduce((sum, oa) => sum + oa.metricasGenerales.porcentajeLogro, 0) / (ev.analysisData.porOA.length || 1)).toFixed(1)}%`)], ['Nota Promedio', ...sortedEvals.map(ev => { const presentStudents = ev.resultados.filter(r => r.estado !== 'Ausente'); if (presentStudents.length === 0) return 'N/A'; const avgGrade = presentStudents.reduce((sum, r) => sum + parseFloat(r.calificacion), 0) / presentStudents.length; return avgGrade.toFixed(1); })], ['Estudiantes Evaluados', ...sortedEvals.map(ev => `${ev.resultados.filter(r => r.estado !== 'Ausente').length} de ${ev.resultados.length}`)], ];
            autoTable(doc, { startY: y, head: summaryHead, body: summaryBody, theme: 'grid', headStyles: { fillColor: '#475569' } });
            y = (doc as any).lastAutoTable.finalY + 20;
            if (y + 40 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
            
            if (aiAnalysis) {
                const addWrappedText = (text: string, x: number, startY: number, maxWidth: number, lineHeight = 12) => { const lines = doc.splitTextToSize(text, maxWidth); doc.text(lines, x, startY); return startY + lines.length * lineHeight; };
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Evolución de Objetivos Clave:', margin, y); y += 15;
                doc.setFontSize(10); doc.setFont('helvetica', 'normal'); aiAnalysis.longitudinalOaAnalysis.forEach((item: any) => { doc.setFont('helvetica', 'bold'); y = addWrappedText(`- OA ${item.oaCode}:`, margin, y, pageWidth - margin * 2); doc.setFont('helvetica', 'normal'); y = addWrappedText(item.analysis, margin + 10, y, pageWidth - margin * 2 - 10); y += 5; }); y += 10;
                if (y + 80 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Fortalezas y Áreas Prioritarias:', margin, y); y += 15;
                autoTable(doc, { startY: y, head: [['Fortalezas Consolidadas', 'Áreas Prioritarias de Mejora']], body: Array.from({ length: Math.max(aiAnalysis.consolidatedStrengths.length, aiAnalysis.priorityAreas.length) }, (_, i) => [aiAnalysis.consolidatedStrengths[i] || '', aiAnalysis.priorityAreas[i] || '']), theme: 'grid', headStyles: { fillColor: '#475569' } });
                y = (doc as any).lastAutoTable.finalY + 20;
                if (y + 40 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Recomendaciones Estratégicas:', margin, y); y += 15;
                doc.setFontSize(10); doc.setFont('helvetica', 'normal'); aiAnalysis.strategicRecommendations.forEach((rec: string) => { y = addWrappedText(`• ${rec}`, margin, y, pageWidth - margin * 2); y += 5; });
                
                doc.addPage(); y = margin;
                doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Apéndice: Análisis de Evolución por Objetivo de Aprendizaje (OA)', margin, y); y += 20;
            } else {
                 doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Análisis de Evolución por Objetivo de Aprendizaje (OA)', margin, y); y += 20;
            }

            const allOaIds = [...new Set(sortedEvals.flatMap(ev => ev.analysisData.porOA.map(oa => oa.id)))];
            const allOaDetails = allOaIds.map(id => OBJETIVOS_APRENDIZAJE.find(oa => oa.id === id)).filter((oa): oa is typeof OBJETIVOS_APRENDIZAJE[0] => !!oa);
            allOaDetails.sort((a,b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
            const evolutionHead = [['Objetivo de Aprendizaje', ...sortedEvals.map(ev => ev.configuracion.nombre.substring(0,25))] as any];
            const evolutionBody: (string | number)[][] = allOaDetails.map(oa => { const row: (string | number)[] = [oa.codigo]; let lastPerc: number | null = null; sortedEvals.forEach(ev => { const oaData = ev.analysisData.porOA.find(o => o.id === oa.id); if (oaData) { const currentPerc = oaData.metricasGenerales.porcentajeLogro; let trendIcon = ''; if (lastPerc !== null) { if (currentPerc > lastPerc + 2) trendIcon = ' ▲'; else if (currentPerc < lastPerc - 2) trendIcon = ' ▼'; else trendIcon = ' ▬'; } row.push(`${currentPerc.toFixed(1)}%${trendIcon}`); lastPerc = currentPerc; } else { row.push('N/A'); } }); return row; });
            autoTable(doc, { startY: y, head: evolutionHead, body: evolutionBody, theme: 'striped', headStyles: { fillColor: '#475569' }, didDrawCell: (data) => { if (data.section === 'body' && typeof data.cell.text?.[0] === 'string' && data.column.index > 0) { if (data.cell.text[0].includes('▲')) data.cell.styles.textColor = '#16a34a'; if (data.cell.text[0].includes('▼')) data.cell.styles.textColor = '#ef4444'; } } });
            
            doc.save(`Reporte_Unificado_${selection.docente.nombreCompleto.replace(/\s/g, '_')}.pdf`);
        } catch(e) {
            console.error(e);
            showNotification("Error al generar reporte unificado.", "error");
        } finally {
            setIsGeneratingUnifiedReport(false);
        }
    }

    const evaluationToConfirmDelete = useMemo(() => {
        if (!deleteConfirmation.id) return null;
        return evaluations?.find(e => e.id === deleteConfirmation.id);
    }, [deleteConfirmation.id, evaluations]);

    return (
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
            {notification && (
                <div 
                    className={`fixed top-5 right-5 z-[100] p-4 rounded-lg shadow-2xl text-white animate-toast ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <p className="font-semibold">{notification.message}</p>
                </div>
            )}
            {deleteConfirmation.isOpen && evaluationToConfirmDelete && (
                <Modal
                    isOpen={true}
                    onClose={() => setDeleteConfirmation({isOpen: false, id: null})}
                    title="Confirmar Eliminación"
                    footer={
                        <div className="flex justify-end space-x-3">
                            <Button variant="secondary" onClick={() => setDeleteConfirmation({isOpen: false, id: null})}>Cancelar</Button>
                            <Button variant="danger" onClick={handleConfirmDelete}>Eliminar</Button>
                        </div>
                    }
                >
                    <p>¿Está seguro de que desea eliminar permanentemente el reporte?</p>
                    <p className="mt-2 font-semibold text-gray-800">"{evaluationToConfirmDelete.configuracion.nombre}"</p>
                </Modal>
            )}

            <div className="flex justify-between items-center mb-6 flex-shrink-0 pt-8 px-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Historial de Reportes</h1>
                    <p className="text-sm text-gray-500 mt-1">{selection.colegio.nombre} | {selection.docente.nombreCompleto}</p>
                </div>
                 <Tooltip text={!evaluations || evaluations.length < 1 ? "Se necesita al menos un reporte para generar un resumen." : ""}>
                   <div className="inline-block">
                       <Button onClick={handleGenerateUnifiedReport} variant="secondary" disabled={!evaluations || evaluations.length < 1 || isGeneratingUnifiedReport}>
                           {isGeneratingUnifiedReport ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                           {isGeneratingUnifiedReport ? 'Generando...' : 'Generar Reporte Unificado'}
                       </Button>
                   </div>
               </Tooltip>
            </div>
            <div className="space-y-4 overflow-y-auto flex-grow px-8 pb-8">
                {evaluations === null ? (
                     <div className="flex flex-col items-center justify-center p-12">
                        <SpinnerIcon className="w-8 h-8 text-primary-600" />
                        <p className="mt-4 text-gray-600">Cargando reportes...</p>
                    </div>
                ) : evaluations.length > 0 ? evaluations.map(ev => (
                    <div key={ev.id} className="bg-white p-6 rounded-xl shadow-md border flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-lg text-primary-700">{ev.configuracion.nombre}</h3>
                            <p className="text-sm text-gray-500 mt-1">Procesado: {new Date(ev.processedAt).toLocaleString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            <p className="text-sm text-gray-500">Docente: {selection.docente.nombreCompleto}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button onClick={() => onSelectReport(ev)}>Ver Reporte</Button>
                             {ev.configuracion.testFileContent && (
                                <Tooltip text="Ver Prueba">
                                    <Button onClick={() => window.open(ev.configuracion.testFileContent!, '_blank')} variant="secondary" size="md" className="!p-2.5">
                                        <FileIcon className="w-5 h-5" />
                                    </Button>
                                </Tooltip>
                             )}
                             <Tooltip text="Descarga Reporte Curso">
                                <Button onClick={() => handleDownloadCoursePdf(ev)} variant="secondary" size="md" className="!p-2.5" disabled={generatingPdfId === ev.id}>
                                    {generatingPdfId === ev.id ? <SpinnerIcon className="w-5 h-5" /> : <DocumentArrowDownIcon className="w-5 h-5" />}
                                </Button>
                            </Tooltip>
                             <Tooltip text="Eliminar Reporte">
                                <Button onClick={() => handleDeleteRequest(ev.id)} variant="ghost" size="md" className="!p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50">
                                    <TrashIcon className="w-5 h-5" />
                                </Button>
                             </Tooltip>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 text-gray-500 bg-white rounded-lg border-dashed border-2">
                        <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No hay reportes procesados</h3>
                        <p className="mt-1 text-sm text-gray-500">Vaya a "Subir Resultados" para generar su primer reporte.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
