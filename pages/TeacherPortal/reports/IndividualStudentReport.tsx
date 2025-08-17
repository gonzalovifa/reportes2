
import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import type { ConfiguracionEvaluacion, ResultadoEstudiante, AnalysisData, HistoricalResult } from '../../../types';
import { Button } from '../../../components/UI';
import { XMarkIcon, DocumentArrowDownIcon, SparklesIcon, SpinnerIcon, ClipboardDocumentListIcon, TableCellsIcon, ChartBarIcon, ArchiveBoxIcon } from '../../../components/Icons';
import { UNIDADES, EJES_TEMATICOS } from '../../../lib/data';
import { getStudentHistory } from '../../../lib/firebase';
import { getAchievementLevel, svgToImageBase64, parseRange } from '../lib/utils';
import { ReportSection, ACHIEVEMENT_LEVELS } from '../components/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AchievementGauge, RadarChart, HistoricalTrendChart } from '../components/charts';
import { GrowthTable, ReportCategoryTable } from '../components/tables';
import { StrengthWeaknessList, RecommendationBlock, ProgressBar } from '../components/ui';
import { TipoPregunta } from '../../../types';

const GroupedOaPerformanceTable: React.FC<{oaPerformanceData: any[], studentId: string}> = ({oaPerformanceData, studentId}) => {
    const groupedData = useMemo(() => {
        const groups: { [unitId: string]: { unitName: string; ejes: { [ejeId: string]: { ejeName: string; oas: any[] } } } } = {};
        oaPerformanceData.forEach(item => { const unit = UNIDADES.find(u => u.id === item.unidadId); const eje = EJES_TEMATICOS.find(e => e.id === item.ejeId); if (!unit || !eje) return; if (!groups[unit.id]) { groups[unit.id] = { unitName: unit.nombre, ejes: {} }; } if (!groups[unit.id].ejes[eje.id]) { groups[unit.id].ejes[eje.id] = { ejeName: eje.nombre, oas: [] }; } groups[unit.id].ejes[eje.id].oas.push(item); });
        return Object.values(groups).map(unitGroup => ({...unitGroup, ejes: Object.values(unitGroup.ejes)}));
    }, [oaPerformanceData]);
     if (groupedData.length === 0) return null;
    return (<div><h4 className="text-lg font-semibold text-gray-800 mb-3">Desglose por Objetivo de Aprendizaje</h4><div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg"><table className="min-w-full divide-y divide-gray-300"><thead className="bg-gray-50"><tr><th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/2">Ítem</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/4">% Logro</th><th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Detalle (C/I/O)</th></tr></thead>
        <tbody className="bg-white">{groupedData.map(unitGroup => (<React.Fragment key={unitGroup.unitName}><tr><td colSpan={3} className="bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800 sm:pl-6">{unitGroup.unitName}</td></tr>{unitGroup.ejes.map(ejeGroup => (<React.Fragment key={ejeGroup.ejeName}><tr><td colSpan={3} className="bg-gray-50 px-4 py-2 pl-8 text-sm font-semibold text-gray-700 sm:pl-10">{ejeGroup.ejeName}</td></tr>{ejeGroup.oas.map(item => { const metrics = item.metricasPorEstudiante[studentId]; if (!metrics) return null; return (<tr key={item.id}><td className="py-4 pl-12 pr-3 text-sm font-medium text-gray-900 sm:pl-14">{item.nombre}</td><td className="px-3 py-4 text-sm text-gray-500"><div className="flex items-center gap-3"><div className="w-full"><ProgressBar percentage={metrics.porcentajeLogro} /></div><span className="font-semibold w-12 text-right">{metrics.porcentajeLogro.toFixed(1)}%</span></div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500"><span className="text-green-600 font-medium">{metrics.correctas}</span> / <span className="text-red-600 font-medium">{metrics.incorrectas}</span> / <span className="text-yellow-600 font-medium">{metrics.omitidas}</span></td></tr>) })}</React.Fragment>))}</React.Fragment>))}</tbody>
    </table></div></div>);
};

interface IndividualStudentReportProps {
  student: ResultadoEstudiante;
  config: ConfiguracionEvaluacion;
  allResults: ResultadoEstudiante[];
  analysisData: AnalysisData;
  onClose: () => void;
}

export const IndividualStudentReport: React.FC<IndividualStudentReportProps> = ({ student, config, allResults, analysisData, onClose }) => {
    const [activeTab, setActiveTab] = useState('resumen');
    const [recommendations, setRecommendations] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoricalResult[] | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const studentPercentage = config.numeroPreguntas > 0 ? (student.correctas / config.numeroPreguntas) * 100 : 0;
    const achievementLevel = getAchievementLevel(studentPercentage);
    
    useEffect(() => {
        if (activeTab === 'historial') {
            const fetchHistory = async () => {
                if(!student.idEstudiante) { setIsLoadingHistory(false); setHistory([]); return; }
                setIsLoadingHistory(true);
                const studentHistory = await getStudentHistory(student.idEstudiante);
                studentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setHistory(studentHistory);
                setIsLoadingHistory(false);
            };
            fetchHistory();
        }
    }, [student.idEstudiante, activeTab]);

    const courseAveragePercentage = useMemo(() => {
        if (!allResults || allResults.length === 0 || config.numeroPreguntas === 0) return 0;
        const totalPercentageSum = allResults.reduce((sum, r) => sum + ((r.correctas / config.numeroPreguntas) * 100), 0);
        return totalPercentageSum / allResults.length;
    }, [allResults, config.numeroPreguntas]);

    const { strengths, weaknesses } = useMemo(() => {
        const studentOaPerformance = analysisData.porOA.map(item => ({ name: item.nombre, percentage: item.metricasPorEstudiante[student.idEstudiante]?.porcentajeLogro ?? 0 })).sort((a, b) => b.percentage - a.percentage);
        return { strengths: studentOaPerformance.slice(0, 3).filter(item => item.percentage > 0), weaknesses: studentOaPerformance.slice(-3).reverse().filter(item => item.percentage < 100) };
    }, [analysisData.porOA, student.idEstudiante]);
    
    const skillsRadarData = useMemo(() => ({ labels: analysisData.porHabilidad.map(h => h.nombre), studentData: analysisData.porHabilidad.map(h => h.metricasPorEstudiante[student.idEstudiante]?.porcentajeLogro ?? 0), courseData: analysisData.porHabilidad.map(h => h.metricasGenerales.porcentajeLogro) }), [analysisData.porHabilidad, student.idEstudiante]);
    const oaRadarData = useMemo(() => ({ labels: analysisData.porOA.map(oa => oa.nombre.match(/^(OA\d+\s\(U\d+\))/)?.[1] || oa.nombre.split(':')[0]), studentData: analysisData.porOA.map(oa => oa.metricasPorEstudiante[student.idEstudiante]?.porcentajeLogro ?? 0), courseData: analysisData.porOA.map(oa => oa.metricasGenerales.porcentajeLogro) }), [analysisData.porOA, student.idEstudiante]);

    const handleGenerateRecommendations = async () => {
        setIsGenerating(true); setGenerationError(null); setRecommendations(null);
        try {
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});
            const strengthsText = strengths.length > 0 ? strengths.map(s => `- ${s.name} (${s.percentage.toFixed(0)}%)`).join('\n') : 'Ninguna destacada.';
            const weaknessesText = weaknesses.length > 0 ? weaknesses.map(w => `- ${w.name} (${w.percentage.toFixed(0)}%)`).join('\n') : 'Ninguna de bajo desempeño.';
            const prompt = `Genera recomendaciones pedagógicas para un estudiante de ${config.nivel} basado en su desempeño en una prueba de ${config.asignatura}.\n\nDatos del desempeño:\n- Porcentaje de logro general: ${studentPercentage.toFixed(1)}%\n- Nivel de logro: ${achievementLevel.name}\n- Fortalezas (Objetivos de Aprendizaje con mejor desempeño):\n${strengthsText}\n- Áreas de mejora (Objetivos de Aprendizaje con menor desempeño):\n${weaknessesText}\n\nProporciona recomendaciones específicas, positivas y accionables. Devuelve la respuesta en formato JSON.`;
            const responseSchema = { type: Type.OBJECT, properties: { para_estudiante: { type: Type.ARRAY, description: "Sugerencias directas y motivadoras para el estudiante.", items: { type: Type.STRING } }, para_familia: { type: Type.ARRAY, description: "Actividades y consejos para que la familia apoye el aprendizaje en casa.", items: { type: Type.STRING } }, para_docente: { type: Type.ARRAY, description: "Estrategias y focos de atención para el profesor en el aula.", items: { type: Type.STRING } } }, required: ["para_estudiante", "para_familia", "para_docente"] };
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: "application/json", responseSchema } });
            setRecommendations(JSON.parse(response.text));
        } catch (error) { console.error("Error generating recommendations:", error); setGenerationError("No se pudieron generar las recomendaciones. Por favor, inténtelo de nuevo más tarde."); } finally { setIsGenerating(false); }
    };
    
    const questionTypeMap = useMemo(() => {
        const map = new Map<number, TipoPregunta>();
        config.bloquesPreguntas.forEach(bloque => {
            const questionsInBlock = parseRange(bloque.preguntas);
            questionsInBlock.forEach(qNum => { map.set(qNum, bloque.tipo); });
        });
        return map;
    }, [config.bloquesPreguntas]);

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const printContainer = document.createElement('div');
            printContainer.style.position = 'absolute'; printContainer.style.left = '-9999px'; printContainer.style.top = '0'; printContainer.style.width = '800px'; printContainer.style.backgroundColor = 'white'; document.body.appendChild(printContainer);
            const renderComponentToDiv = (component: React.ReactElement): Promise<HTMLDivElement> => {
                return new Promise(resolve => {
                    const componentDiv = document.createElement('div'); printContainer.appendChild(componentDiv); const root = ReactDOM.createRoot(componentDiv); root.render(component); setTimeout(() => resolve(componentDiv), 300);
                });
            };
            const [skillsRadarDiv, oaRadarDiv, historyDiv] = await Promise.all([
                renderComponentToDiv(<RadarChart labels={skillsRadarData.labels} studentData={skillsRadarData.studentData} courseData={skillsRadarData.courseData} />),
                renderComponentToDiv(<RadarChart labels={oaRadarData.labels} studentData={oaRadarData.studentData} courseData={oaRadarData.courseData} />),
                history && history.length > 0 ? renderComponentToDiv(<HistoricalTrendChart history={history} />) : Promise.resolve(null)
            ]);
            const [skillsRadarImg, oaRadarImg, historyImg] = await Promise.all([
                skillsRadarDiv ? svgToImageBase64(skillsRadarDiv.querySelector('svg')!) : Promise.resolve(null),
                oaRadarDiv ? svgToImageBase64(oaRadarDiv.querySelector('svg')!) : Promise.resolve(null),
                historyDiv ? svgToImageBase64(historyDiv.querySelector('svg')!) : Promise.resolve(null)
            ]);
            document.body.removeChild(printContainer);

            const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const margin = 40; const contentWidth = pageWidth - margin * 2; let y = 0;
            const addPageNumber = () => {
                const pageCount = (doc.internal as any).getNumberOfPages();
                doc.setFontSize(8); doc.setTextColor(150);
                for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' }); }
            };
            const addPageHeader = (isFirstPage: boolean, pageTitle?: string) => {
                y = 40; doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor('#2AB9B6'); doc.text('APRENDO', margin, y); const aprendoWidth = doc.getStringUnitWidth('APRENDO') * 18 / doc.internal.scaleFactor; doc.setTextColor('#ED6E45'); doc.text('CREANDO', margin + aprendoWidth + 4, y);
                if (isFirstPage) { y += 25; doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor('#2A63AB'); doc.text('Centro Comenius', margin, y); y += 15; doc.setFontSize(10); doc.setTextColor(100); doc.text(`Prueba: ${config.nombre}`, margin, y); }
                y = isFirstPage ? y + 20 : 40;
                if (pageTitle) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(40); doc.text(pageTitle, pageWidth / 2, y, { align: 'center' }); y += 15; }
            };
            const checkPageBreak = (spaceNeeded: number) => { if (y + spaceNeeded > pageHeight - margin) { doc.addPage(); y = 0; addPageHeader(false); y = 60; return true; } return false; };
            const addSectionTitle = (title: string) => { checkPageBreak(30); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor('#374151'); doc.text(title, margin, y); y += 18; };
            
            // ---- PAGE 1: Resumen y Diagnóstico ----
            addPageHeader(true); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(40); doc.text(`Informe Individual: ${student.nombreEstudiante}`, pageWidth/2, y, {align: 'center'}); y += 25;
            addSectionTitle('Resumen General');
            autoTable(doc, { startY: y, body: [['Puntaje Obtenido', `${student.puntajeObtenido} / ${student.puntajeTotal}`], ['Porcentaje de Logro', `${studentPercentage.toFixed(1)}%`], ['Calificación', student.calificacion], ['Nivel de Logro', { content: achievementLevel.name, styles: { fontStyle: 'bold', textColor: achievementLevel.color.substring(1) } }], ], theme: 'grid', styles: { fontSize: 10, cellPadding: 5 }, columnStyles: { 0: { fontStyle: 'bold' } }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } }); y += 15;
            addSectionTitle('Visualización de Desempeño'); const gaugeY = y; const gaugeHeight = 18; let currentX = margin; const gaugeLevels = [{ width: 40, color: ACHIEVEMENT_LEVELS.INSUFICIENTE.color }, { width: 30, color: ACHIEVEMENT_LEVELS.ELEMENTAL.color }, { width: 20, color: ACHIEVEMENT_LEVELS.ADECUADO.color }, { width: 10, color: ACHIEVEMENT_LEVELS.DESTACADO.color }, ]; gaugeLevels.forEach(level => { doc.setFillColor(level.color); doc.rect(currentX, gaugeY, contentWidth * (level.width / 100), gaugeHeight, 'F'); currentX += contentWidth * (level.width / 100); }); const pointerX = margin + contentWidth * (studentPercentage / 100); doc.setFillColor(0, 0, 0); doc.triangle(pointerX - 4, gaugeY + gaugeHeight, pointerX + 4, gaugeY + gaugeHeight, pointerX, gaugeY + gaugeHeight + 6, 'F'); y = gaugeY + gaugeHeight + 15; doc.setFontSize(8); doc.setTextColor(100); doc.text('0%', margin, y, {align: 'center'}); doc.text('40%', margin + contentWidth * 0.4, y, {align: 'center'}); doc.text('70%', margin + contentWidth * 0.7, y, {align: 'center'}); doc.text('90%', margin + contentWidth * 0.9, y, {align: 'center'}); doc.text('100%', margin + contentWidth, y, {align: 'center'}); y += 20;
            checkPageBreak(100); addSectionTitle('Diagnóstico'); const strengthsBody = strengths.map(s => ([`✅ ${s.name}`])); const weaknessesBody = weaknesses.map(w => ([`⚠️ ${w.name}`])); autoTable(doc, { startY: y, head: [['Fortalezas', 'Áreas de Mejora']], body: Array.from({ length: Math.max(strengths.length, weaknesses.length) }, (_, i) => [strengthsBody[i]?.[0] || '', weaknessesBody[i]?.[0] || '']), theme: 'grid', headStyles: { fontStyle: 'bold', fontSize: 11, fillColor: '#f3f4f6', textColor: '#374151' }, styles: { fontSize: 9 }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } });

            // --- PAGE 2: Competencias ---
            doc.addPage(); y = 0; addPageHeader(false, 'Análisis de Competencias'); if (skillsRadarImg) { addSectionTitle('Radar de Habilidades'); doc.addImage(skillsRadarImg, 'PNG', margin, y, contentWidth, contentWidth, undefined, 'FAST'); y += contentWidth + 20; }
            checkPageBreak(contentWidth + 30); if (oaRadarImg) { addSectionTitle('Radar de Objetivos de Aprendizaje'); doc.addImage(oaRadarImg, 'PNG', margin, y, contentWidth, contentWidth, undefined, 'FAST'); y += contentWidth + 20; }
            checkPageBreak(80); addSectionTitle('Desglose por Habilidad'); autoTable(doc, { startY: y, head: [['Habilidad', '% Logro', 'Detalle (C/I/O)']], body: analysisData.porHabilidad.map(item => { const metrics = item.metricasPorEstudiante[student.idEstudiante]; return [item.nombre, metrics ? metrics.porcentajeLogro.toFixed(1) + '%' : 'N/A', metrics ? `${metrics.correctas}/${metrics.incorrectas}/${metrics.omitidas}` : 'N/A' ]; }), theme: 'striped', headStyles: { fillColor: '#475569' }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } });
            
            // --- PAGE 3: Detalle de Respuestas y OAs ---
            doc.addPage(); y = 0; addPageHeader(false, 'Detalle de Resultados'); addSectionTitle('Detalle de Respuestas'); autoTable(doc, { startY: y, head: [['Pregunta', 'Clave', 'Tu Respuesta', 'Resultado']], body: Array.from({ length: config.numeroPreguntas }, (_, i) => { const qNum = i + 1; const claveInfo = config.claves.find(c => c.numero === qNum); const studentAnswer = student.respuestas[String(qNum)] || ''; const questionType = questionTypeMap.get(qNum); let status: 'Correcta' | 'Incorrecta' | 'Omitida' = 'Omitida'; if (studentAnswer !== '' && studentAnswer.toUpperCase() !== 'O') { if (questionType === TipoPregunta.RESPUESTA_ABIERTA) { status = studentAnswer === '1' ? 'Correcta' : 'Incorrecta'; } else { status = (claveInfo && studentAnswer.toUpperCase() === String(claveInfo.clave).trim().toUpperCase()) ? 'Correcta' : 'Incorrecta'; } } return [qNum, claveInfo?.clave || 'N/A', studentAnswer || '-', status]; }), theme: 'grid', headStyles: { fillColor: '#475569' }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } }); y += 20;
            checkPageBreak(80); addSectionTitle('Desglose por Objetivo de Aprendizaje'); autoTable(doc, { startY: y, head: [['Objetivo', '% Logro', 'Detalle (C/I/O)']], body: analysisData.porOA.map(item => { const metrics = item.metricasPorEstudiante[student.idEstudiante]; return [item.nombre, metrics ? metrics.porcentajeLogro.toFixed(1) + '%' : 'N/A', metrics ? `${metrics.correctas}/${metrics.incorrectas}/${metrics.omitidas}` : 'N/A']; }), theme: 'striped', headStyles: { fillColor: '#475569' }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } });
            
            // --- PAGE 4: Historial ---
            if (history && history.length > 0 && historyImg) { doc.addPage(); y = 0; addPageHeader(false, 'Historial de Desempeño'); doc.addImage(historyImg, 'PNG', margin, y, contentWidth, contentWidth * 0.5, undefined, 'FAST'); y += contentWidth * 0.5 + 20; autoTable(doc, { startY: y, head: [['Evaluación', 'Fecha', 'Puntaje', '% Logro']], body: history.map(h => [h.evaluationName, h.date, `${h.puntajeObtenido}/${h.puntajeTotal}`, `${h.percentage.toFixed(1)}%`]), theme: 'striped', headStyles: { fillColor: '#475569' }, didDrawPage: (data) => { y = data.cursor?.y ?? y; } }); }
            addPageNumber(); doc.save(`Reporte_${student.nombreEstudiante.replace(/\s/g, '_')}.pdf`);
        } catch (error) { console.error("PDF Generation failed:", error); alert("No se pudo generar el PDF. Revise la consola para más detalles."); } finally { setIsGeneratingPdf(false); }
    };
    
    const tabs = [ { id: 'resumen', label: 'Resumen', icon: ClipboardDocumentListIcon }, { id: 'detalle', label: 'Detalle de Respuestas', icon: TableCellsIcon }, { id: 'competencias', label: 'Competencias', icon: ChartBarIcon }, { id: 'diagnostico', label: 'Diagnóstico', icon: SparklesIcon }, { id: 'historial', label: 'Historial', icon: ArchiveBoxIcon }, ];
    const renderContent = () => {
        switch(activeTab) {
            case 'resumen': return ( <ReportSection> <div className="overflow-hidden border border-gray-200 rounded-lg mb-6"><table className="min-w-full divide-y divide-gray-200"><tbody className="bg-white divide-y divide-gray-200 text-sm"><tr><td className="px-4 py-2 font-medium text-gray-700 bg-gray-50 w-1/4">Estudiante</td><td className="px-4 py-2 text-gray-800">{student.nombreEstudiante}</td></tr><tr><td className="px-4 py-2 font-medium text-gray-700 bg-gray-50">Prueba</td><td className="px-4 py-2 text-gray-800">{config.nombre}</td></tr><tr><td className="px-4 py-2 font-medium text-gray-700 bg-gray-50">Fecha</td><td className="px-4 py-2 text-gray-800">{config.fecha}</td></tr></tbody></table></div> <div className="grid md:grid-cols-2 gap-6 mb-6"><div className="bg-gray-100 border border-gray-200 p-4 rounded-lg"><h4 className="font-semibold text-gray-800 mb-2">Resumen Cuantitativo</h4><p className="text-sm text-gray-600">Puntaje: <span className="font-bold text-gray-900">{student.puntajeObtenido} / {student.puntajeTotal}</span></p><p className="text-sm text-gray-600">% Logro: <span className="font-bold text-gray-900">{studentPercentage.toFixed(1)}%</span></p><p className="text-sm text-gray-600">Calificación: <span className="font-bold text-gray-900">{student.calificacion}</span></p><div className={`mt-3 p-3 rounded-md ${achievementLevel.bgColor}`}><p className={`text-sm font-bold ${achievementLevel.textColor}`}>Nivel de Logro: {achievementLevel.name}</p><p className={`mt-1 text-xs ${achievementLevel.textColor}`}>{achievementLevel.description}</p></div></div><div className="bg-gray-100 border border-gray-200 p-4 rounded-lg"><h4 className="font-semibold text-gray-800 mb-4">Comparativa</h4><div className="space-y-3 text-sm"><div><div className="flex justify-between items-center mb-1"><span className="font-medium text-blue-700">Tu Desempeño</span><span className="font-bold text-blue-700">{studentPercentage.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{width: `${studentPercentage}%`}}></div></div></div><div><div className="flex justify-between items-center mb-1"><span className="font-medium text-gray-700">Promedio Curso</span><span className="font-bold text-gray-700">{courseAveragePercentage.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-gray-400 h-4 rounded-full" style={{width: `${courseAveragePercentage}%`}}></div></div></div></div></div></div> <div><h4 className="font-semibold text-gray-800 mb-3">Visualización del Desempeño</h4><AchievementGauge percentage={studentPercentage} /></div> </ReportSection> );
            case 'detalle': 
                const totalQuestions = config.numeroPreguntas; const percCorrectas = totalQuestions > 0 ? (student.correctas / totalQuestions) * 100 : 0; const percIncorrectas = totalQuestions > 0 ? (student.incorrectas / totalQuestions) * 100 : 0; const percOmitidas = totalQuestions > 0 ? (student.omitidas / totalQuestions) * 100 : 0;
                return ( <ReportSection> <div className="space-y-6"> <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg"> <table className="min-w-full divide-y divide-gray-200"> <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Pregunta</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Respuesta Correcta</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tu Respuesta</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resultado</th></tr></thead> <tbody className="bg-white divide-y divide-gray-200"> {Array.from({ length: config.numeroPreguntas }, (_, i) => i + 1).map(qNum => { const claveInfo = config.claves.find(c => c.numero === qNum); const studentAnswer = student.respuestas[String(qNum)] || ''; const questionType = questionTypeMap.get(qNum); let status: 'Correcta' | 'Incorrecta' | 'Omitida'; let statusColor: string; if (studentAnswer === '' || studentAnswer.toUpperCase() === 'O') { status = 'Omitida'; statusColor = 'bg-yellow-100 text-yellow-800'; } else if (questionType === TipoPregunta.RESPUESTA_ABIERTA) { status = studentAnswer === '1' ? 'Correcta' : 'Incorrecta'; statusColor = studentAnswer === '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'; } else { const isCorrect = claveInfo && studentAnswer.toUpperCase() === String(claveInfo.clave).trim().toUpperCase(); status = isCorrect ? 'Correcta' : 'Incorrecta'; statusColor = isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'; } const respuestaCorrectaText = questionType === TipoPregunta.RESPUESTA_ABIERTA ? 'Respuesta Abierta' : claveInfo?.clave || 'N/A'; const tuRespuestaText = questionType === TipoPregunta.RESPUESTA_ABIERTA ? 'N/A' : (studentAnswer || '-'); return (<tr key={qNum}><td className="px-4 py-3 text-sm font-medium text-gray-800">{qNum}</td><td className="px-4 py-3 text-sm text-gray-700">{respuestaCorrectaText}</td><td className="px-4 py-3 text-sm text-gray-700">{tuRespuestaText}</td><td className="px-4 py-3 text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>{status}</span></td></tr>); })} </tbody> </table> </div> <p className="mt-4 text-xs text-gray-500 italic">*N/A = No Aplica, ya que no se tiene la respuesta del estudiante por ser Respuesta Abierta.</p> <div className="grid grid-cols-3 gap-4 text-center mt-4"> <div className="bg-green-50 p-3 rounded-lg"><p className="text-sm font-medium text-green-700">Correctas</p><p className="text-2xl font-bold text-green-800 mt-1">{student.correctas} <span className="text-lg font-medium">({percCorrectas.toFixed(1)}%)</span></p></div> <div className="bg-red-50 p-3 rounded-lg"><p className="text-sm font-medium text-red-700">Incorrectas</p><p className="text-2xl font-bold text-red-800 mt-1">{student.incorrectas} <span className="text-lg font-medium">({percIncorrectas.toFixed(1)}%)</span></p></div> <div className="bg-yellow-50 p-3 rounded-lg"><p className="text-sm font-medium text-yellow-700">Omitidas</p><p className="text-2xl font-bold text-yellow-800 mt-1">{student.omitidas} <span className="text-lg font-medium">({percOmitidas.toFixed(1)}%)</span></p></div> </div> </div> </ReportSection> );
            case 'competencias': return (<ReportSection><div className="grid md:grid-cols-2 gap-8 items-start"><div><h4 className="font-semibold text-gray-800 mb-2 text-center">Gráfico de Radar de Habilidades</h4><RadarChart labels={skillsRadarData.labels} studentData={skillsRadarData.studentData} courseData={skillsRadarData.courseData} /><div className="flex justify-center gap-6 mt-4 text-xs"><div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#6ee7b7] rounded-full"></span><span>Tu Desempeño</span></div><div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#a5b4fc] rounded-full"></span><span>Promedio Curso</span></div></div></div><div><h4 className="font-semibold text-gray-800 mb-2 text-center">Gráfico de Radar por OA</h4><RadarChart labels={oaRadarData.labels} studentData={oaRadarData.studentData} courseData={oaRadarData.courseData} /><div className="flex justify-center gap-6 mt-4 text-xs"><div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#6ee7b7] rounded-full"></span><span>Tu Desempeño</span></div><div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#a5b4fc] rounded-full"></span><span>Promedio Curso</span></div></div></div></div><div className="mt-8 space-y-8"><GroupedOaPerformanceTable oaPerformanceData={analysisData.porOA} studentId={student.idEstudiante} /><ReportCategoryTable title="Desglose por Habilidad" data={analysisData.porHabilidad} selectedStudentId={student.idEstudiante} /></div></ReportSection>);
            case 'diagnostico': return (<ReportSection><div className="grid md:grid-cols-2 gap-8"><StrengthWeaknessList title="Fortalezas" items={strengths} color="green" /><StrengthWeaknessList title="Áreas de Mejora" items={weaknesses} color="yellow" /></div><div className="mt-8 border-t pt-6"><div className="text-center">{!recommendations && !isGenerating && (<Button onClick={handleGenerateRecommendations}><SparklesIcon className="w-5 h-5 mr-2" />Generar Recomendaciones con IA</Button>)}{isGenerating && <div className="flex justify-center items-center gap-3 text-gray-600 p-8"><SpinnerIcon className="w-6 h-6 text-primary-600" /> Generando sugerencias...</div>}{generationError && <div className="text-center text-red-600 p-8">{generationError}</div>}{recommendations && (<div className="space-y-6 mt-6"><RecommendationBlock title="Para el Estudiante" items={recommendations.para_estudiante} color="blue" /><RecommendationBlock title="Para la Familia" items={recommendations.para_familia} color="green" /><RecommendationBlock title="Para el Docente" items={recommendations.para_docente} color="purple" /></div>)}</div></div></ReportSection>);
            case 'historial': return <ReportSection>{isLoadingHistory ? (<div className="flex justify-center items-center p-8"><SpinnerIcon className="w-8 h-8 text-primary-600" /></div>) : history && history.length > 0 ? (<div><h4 className="font-semibold text-gray-800 mb-4 text-center">Evolución del Aprendizaje</h4><HistoricalTrendChart history={history} /><h4 className="font-semibold text-gray-800 mt-10 mb-4 text-center">Tabla de Crecimiento</h4><GrowthTable history={history} /></div>) : (<p className="text-center text-gray-500 py-8">No hay datos históricos para este estudiante.</p>)}</ReportSection>;
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-gray-50 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b bg-white rounded-t-lg flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">Informe Individual: {student.nombreEstudiante}</h2>
                <div className="flex items-center gap-4">
                    <Button onClick={handleDownloadPdf} size="md" disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <DocumentArrowDownIcon className="w-5 h-5 mr-2" />}
                        {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
                    </Button>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-7 h-7" /></button>
                </div></header>
                <main className="flex-grow p-6 overflow-y-auto">
                    <div className="border-b border-gray-200 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`} aria-current={activeTab === tab.id ? 'page' : undefined}>
                                    <tab.icon className="w-5 h-5" /> {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};