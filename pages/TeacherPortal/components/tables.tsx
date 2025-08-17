
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { ConfiguracionEvaluacion, ResultadoEstudiante, AnalysisData, HistoricalResult, AnalysisItem } from '../../../types';
import { Button, Tooltip } from '../../../components/UI';
import { ArrowDownTrayIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon } from '../../../components/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProgressBar } from './ui';
import { getAchievementLevel } from '../lib/utils';
import { UNIDADES, EJES_TEMATICOS, OBJETIVOS_APRENDIZAJE, HABILIDADES } from '../../../lib/data';

const getAchievementCellClass = (percentage: number): string => {
    let baseClass = "whitespace-nowrap px-3 py-4 text-sm font-medium text-center";
    const level = getAchievementLevel(percentage);
    if (level.name === 'Destacado' || level.name === 'Adecuado') return `${baseClass} bg-green-50 text-green-800`;
    if (level.name === 'Elemental') return `${baseClass} bg-orange-50 text-orange-800`;
    return `${baseClass} bg-red-50 text-red-800`;
};

export const AchievementLegend = () => (
    <div className="mt-8 pt-4 border-t border-gray-200 flex justify-center flex-wrap gap-x-6 gap-y-2">
        <h5 className="text-sm font-semibold text-gray-700">Leyenda de Desempeño:</h5>
        <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-4 h-4 block rounded-sm border border-red-300 bg-red-50"></span>
            <span>Insuficiente (0-39.9%)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-4 h-4 block rounded-sm border border-orange-400 bg-orange-50"></span>
            <span>Elemental (40-69.9%)</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="w-4 h-4 block rounded-sm border border-green-300 bg-green-50"></span>
            <span>Adecuado/Destacado (70-100%)</span>
        </div>
    </div>
);

export const GrowthTable: React.FC<{ history: HistoricalResult[] }> = ({ history }) => {
    if (history.length === 0) return null;
    return (
        <div className="overflow-x-auto mt-4">
            <table className="min-w-full divide-y divide-y-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Evaluación</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Puntaje</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Logro</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cambio</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((item, index) => {
                        let change: number | null = null; if (index > 0) { change = item.percentage - history[index - 1].percentage; }
                        const isPositive = change !== null && change > 0; const isNegative = change !== null && change < 0;
                        return (<tr key={item.evaluationId}><td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.evaluationName}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{`${item.puntajeObtenido} / ${item.puntajeTotal}`}</td><td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">{item.percentage.toFixed(1)}%</td><td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>{change !== null && (<span className="flex items-center justify-end gap-1">{isPositive ? <ArrowUpIcon className="w-4 h-4"/> : isNegative ? <ArrowDownIcon className="w-4 h-4" /> : null}{change.toFixed(1)}%</span>)}{change === null && '-'}</td></tr>);
                    })}
                </tbody>
            </table>
        </div>
    );
}

export const ResultsTable: React.FC<{
  initialResults: ResultadoEstudiante[];
  config: ConfiguracionEvaluacion;
  onViewReport: (student: ResultadoEstudiante) => void;
  selection: { colegio: any; docente: any };
}> = ({ initialResults, config, onViewReport, selection }) => {
    type SortKey = 'nombreEstudiante' | 'puntajeObtenido' | 'calificacion' | 'correctas' | 'incorrectas' | 'omitidas';
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'puntajeObtenido', direction: 'descending' });
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
    const downloadMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
                setDownloadMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortedResults = useMemo(() => {
        const sortableItems = [...initialResults];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const direction = sortConfig.direction === 'ascending' ? 1 : -1;
                if (a.estado === 'Ausente' && b.estado !== 'Ausente') return 1;
                if (a.estado !== 'Ausente' && b.estado === 'Ausente') return -1;
                if (a.estado === 'Ausente' && b.estado === 'Ausente') return a.nombreEstudiante.localeCompare(b.nombreEstudiante);

                if (sortConfig.key === 'nombreEstudiante') { return a.nombreEstudiante.localeCompare(b.nombreEstudiante) * direction; }
                let aValue = (a as any)[sortConfig.key];
                let bValue = (b as any)[sortConfig.key];

                if(sortConfig.key === 'calificacion') {
                  aValue = parseFloat(aValue);
                  bValue = parseFloat(bValue);
                }

                if (aValue < bValue) return -1 * direction;
                if (aValue > bValue) return 1 * direction;
                
                return a.nombreEstudiante.localeCompare(b.nombreEstudiante);
            });
        }
        return sortableItems;
    }, [initialResults, sortConfig]);

    const averages = useMemo(() => {
        const presentStudents = initialResults.filter(r => r.estado !== 'Ausente');
        if (presentStudents.length === 0) return null;
        const totalStudents = presentStudents.length;
        const avgPuntaje = presentStudents.reduce((sum, r) => sum + r.puntajeObtenido, 0) / totalStudents;
        const avgPuntajeTotal = presentStudents.reduce((sum, r) => sum + r.puntajeTotal, 0) / totalStudents;
        const avgCorrectas = presentStudents.reduce((sum, r) => sum + r.correctas, 0) / totalStudents;
        const avgIncorrectas = presentStudents.reduce((sum, r) => sum + r.incorrectas, 0) / totalStudents;
        const avgOmitidas = presentStudents.reduce((sum, r) => sum + r.omitidas, 0) / totalStudents;
        const avgCalificacion = presentStudents.reduce((sum, r) => sum + parseFloat(r.calificacion), 0) / totalStudents;
        const scorePercentage = avgPuntajeTotal > 0 ? (avgPuntaje / avgPuntajeTotal) * 100 : 0;
        const correctPercentage = config.numeroPreguntas > 0 ? (avgCorrectas / config.numeroPreguntas) * 100 : 0;
        const incorrectPercentage = config.numeroPreguntas > 0 ? (avgIncorrectas / config.numeroPreguntas) * 100 : 0;
        const omittedPercentage = config.numeroPreguntas > 0 ? (avgOmitidas / config.numeroPreguntas) * 100 : 0;
        return { puntaje: avgPuntaje, puntajeTotal: avgPuntajeTotal, correctas: avgCorrectas, incorrectas: avgIncorrectas, omitidas: avgOmitidas, calificacion: avgCalificacion, scorePercentage, correctPercentage, incorrectPercentage, omittedPercentage };
    }, [initialResults, config.numeroPreguntas]);

    const requestSort = (key: SortKey) => {
        let newDirection: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key) { newDirection = sortConfig.direction === 'ascending' ? 'descending' : 'ascending'; } else { newDirection = key === 'nombreEstudiante' ? 'ascending' : 'descending'; }
        setSortConfig({ key, direction: newDirection });
    };

    const handleDownload = (format: 'pdf' | 'xlsx') => {
        setDownloadMenuOpen(false);
        const reportTitle = "Tabla de Desempeño";
        const dataToExport = sortedResults.map(r => ({ 'ID Estudiante': r.idEstudiante, 'Nombre Estudiante': r.nombreEstudiante, 'Puntaje Obtenido': r.estado === 'Ausente' ? 'N/A' : r.puntajeObtenido, 'Puntaje Total': r.estado === 'Ausente' ? 'N/A' : r.puntajeTotal, '% Logro': r.estado === 'Ausente' ? 'N/A' : `${(r.puntajeTotal > 0 ? (r.puntajeObtenido / r.puntajeTotal) * 100 : 0).toFixed(1)}%`, 'Correctas': r.estado === 'Ausente' ? 'N/A' : r.correctas, 'Incorrectas': r.estado === 'Ausente' ? 'N/A' : r.incorrectas, 'Omitidas': r.estado === 'Ausente' ? 'N/A' : r.omitidas, 'Calificación': r.calificacion, 'Estado': r.estado }));
        if (format === 'pdf') {
            const doc = new jsPDF({ orientation: 'landscape' }); const pageWidth = doc.internal.pageSize.getWidth(); let y = 30;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor('#2AB9B6'); doc.text('APRENDO CREANDO', 20, y); y += 18;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor('#2A63AB'); doc.text('Centro Comenius', 20, y); y += 14;
            doc.setFont('helvetica', 'italic'); doc.setFontSize(12); doc.setTextColor('#000000'); doc.text(`Prueba: ${config.nombre}`, 20, y); y += 25;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(reportTitle, pageWidth / 2, y, { align: 'center' }); y += 16;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.text(`Profesora: ${selection.docente.nombreCompleto}`, pageWidth / 2, y, { align: 'center' }); y += 14; doc.text(`${config.nivel} – ${selection.docente.curso} – ${config.fecha}`, pageWidth / 2, y, { align: 'center' });
            autoTable(doc, { startY: y + 10, head: [Object.keys(dataToExport[0])], body: dataToExport.map(Object.values), theme: 'grid', headStyles: { fillColor: '#2A63AB', textColor: '#FFFFFF', font: 'helvetica', fontStyle: 'bold', fontSize: 10 }, styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 }, alternateRowStyles: { fillColor: '#F3F4F6' } });
            doc.save(`Reporte_Tabla_Desempeno_${config.nombre.replace(/\s/g, '_')}.pdf`);
        } else if (format === 'xlsx') {
            const wb = XLSX.utils.book_new(); const headerData = [ ['APRENDO CREANDO'], ['Centro Comenius'], [`Prueba: ${config.nombre}`], [], [reportTitle], [`Profesora: ${selection.docente.nombreCompleto}`], [`${config.nivel} – ${selection.docente.curso} – ${config.fecha}`], [] ];
            const ws = XLSX.utils.aoa_to_sheet(headerData); XLSX.utils.sheet_add_json(ws, dataToExport, { origin: 'A9' });
            const merge = (s: any, e: any) => ({ s: { r: s.r, c: s.c }, e: { r: e.r, c: e.c } }); const numCols = Object.keys(dataToExport[0]).length - 1;
            ws['!merges'] = [ merge({r:0,c:0}, {r:0,c:numCols}), merge({r:1,c:0}, {r:1,c:numCols}), merge({r:2,c:0}, {r:2,c:numCols}), merge({r:4,c:0}, {r:4,c:numCols}), merge({r:5,c:0}, {r:5,c:numCols}), merge({r:6,c:0}, {r:6,c:numCols}) ];
            ws['A1'].s = { font: { sz: 20, bold: true, color: { rgb: "2AB9B6" } } }; ws['A2'].s = { font: { sz: 14, color: { rgb: "2A63AB" } } }; ws['A3'].s = { font: { sz: 12, italic: true } }; ws['A5'].s = { font: { sz: 18, bold: true }, alignment: { horizontal: 'center' } }; ws['A6'].s = { alignment: { horizontal: 'center' } }; ws['A7'].s = { alignment: { horizontal: 'center' } };
            ws['!cols'] = [ { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 } ];
            XLSX.utils.book_append_sheet(wb, ws, 'Tabla de Desempeño'); XLSX.writeFile(wb, `Reporte_Tabla_Desempeno_${config.nombre.replace(/\s/g, '_')}.xlsx`);
        }
    };

    const SortableHeader: React.FC<{ sortKey: SortKey; children: React.ReactNode; className?: string }> = ({ sortKey, children, className = '' }) => {
        const isSorted = sortConfig.key === sortKey; const baseClasses = "py-3.5 px-3 text-sm font-semibold text-gray-900 cursor-pointer"; const alignmentClass = className?.includes('pl-') ? 'text-left' : 'text-center';
        return (<th scope="col" className={`${baseClasses} ${alignmentClass} ${className}`} onClick={() => requestSort(sortKey)}><div className={`flex items-center gap-1 ${alignmentClass === 'text-center' ? 'justify-center' : ''}`}>{children}{isSorted ? (sortConfig.direction === 'ascending' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>) : <span className="w-3 h-3"></span>}</div></th>);
    };

    return (
        <div className="mt-8"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold text-gray-900">Resultados por Estudiante</h3><div className="relative" ref={downloadMenuRef}><Button onClick={() => setDownloadMenuOpen(prev => !prev)}><ArrowDownTrayIcon className="w-5 h-5 mr-2"/>Descargar<ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${downloadMenuOpen ? 'rotate-180' : ''}`} /></Button>{downloadMenuOpen && (<div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"><div className="py-1" role="menu" aria-orientation="vertical"><button onClick={() => handleDownload('pdf')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como PDF</button><button onClick={() => handleDownload('xlsx')} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como Excel (.xlsx)</button></div></div>)}</div></div>
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300"><thead className="bg-gray-50"><tr><SortableHeader sortKey="nombreEstudiante" className="pl-4 sm:pl-6">Nombre Estudiante</SortableHeader><SortableHeader sortKey="puntajeObtenido">Puntaje</SortableHeader><SortableHeader sortKey="correctas">Correctas</SortableHeader><SortableHeader sortKey="incorrectas">Incorrectas</SortableHeader><SortableHeader sortKey="omitidas">Omitidas</SortableHeader><SortableHeader sortKey="calificacion">Calificación</SortableHeader></tr></thead>
                    <tbody className="divide-y divide-gray-200 bg-white">{sortedResults.map((result) => {
                        if (result.estado === 'Ausente') {
                            return (
                                <tr key={result.idEstudiante} className="bg-gray-50">
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-500 sm:pl-6">{result.nombreEstudiante}</td>
                                    <td colSpan={5} className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500 font-semibold italic">Ausente</td>
                                </tr>
                            );
                        }
                        const scorePercentage = result.puntajeTotal > 0 ? (result.puntajeObtenido / result.puntajeTotal) * 100 : 0;
                        const correctPercentage = config.numeroPreguntas > 0 ? (result.correctas / config.numeroPreguntas) * 100 : 0;
                        const incorrectPercentage = config.numeroPreguntas > 0 ? (result.incorrectas / config.numeroPreguntas) * 100 : 0;
                        const omittedPercentage = config.numeroPreguntas > 0 ? (result.omitidas / config.numeroPreguntas) * 100 : 0;
                        return (<tr key={result.idEstudiante}><td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium sm:pl-6"><button onClick={() => onViewReport(result)} className="text-primary-600 hover:text-primary-800 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">{result.nombreEstudiante}</button></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-medium text-gray-900">{`${result.puntajeObtenido} / ${result.puntajeTotal}`}</div><div className="text-xs text-gray-400">({scorePercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-medium text-green-700">{result.correctas}</div><div className="text-xs text-gray-400">({correctPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-medium text-red-700">{result.incorrectas}</div><div className="text-xs text-gray-400">({incorrectPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-medium text-yellow-700">{result.omitidas}</div><div className="text-xs text-gray-400">({omittedPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-800 font-semibold">{result.calificacion}</td></tr>)
                    })}</tbody>
                    {averages && (<tfoot className="bg-gray-100 border-t-2 border-gray-300"><tr><td className="py-4 pl-4 pr-3 text-sm font-bold text-gray-800 sm:pl-6">Promedio Curso</td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-bold text-gray-900">{`${averages.puntaje.toFixed(1)} / ${averages.puntajeTotal.toFixed(1)}`}</div><div className="text-xs text-gray-400">({averages.scorePercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-bold text-green-800">{averages.correctas.toFixed(1)}</div><div className="text-xs text-gray-400">({averages.correctPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-bold text-red-800">{averages.incorrectas.toFixed(1)}</div><div className="text-xs text-gray-400">({averages.incorrectPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center"><div className="font-bold text-yellow-800">{averages.omitidas.toFixed(1)}</div><div className="text-xs text-gray-400">({averages.omittedPercentage.toFixed(1)}%)</div></td><td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-800 font-bold">{averages.calificacion.toFixed(1)}</td></tr></tfoot>)}
                </table>
            </div>
        </div>
    );
};

export const ReportCategoryTable: React.FC<{ title?: string; data: any[]; selectedStudentId?: string;}> = ({ title, data, selectedStudentId }) => {
    if (data.length === 0) return null;
    return (
        <div>
            {title && <h4 className="text-lg font-semibold text-gray-800 mb-3">{title}</h4>}
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/2">Ítem</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/4">% Logro</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Detalle (C/I/O)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data.map(item => {
                            const metrics = selectedStudentId ? item.metricasPorEstudiante[selectedStudentId] : item.metricasGenerales;
                            if(!metrics) return null;
                            return (
                                <tr key={item.id}>
                                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{item.nombre}</td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-3">
                                            <div className="w-full"><ProgressBar percentage={metrics.porcentajeLogro} /></div>
                                            <span className="font-semibold w-12 text-right">{metrics.porcentajeLogro.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-500">
                                        <span className="text-green-600 font-medium">{metrics.correctas}</span> / <span className="text-red-600 font-medium">{metrics.incorrectas}</span> / <span className="text-yellow-600 font-medium">{metrics.omitidas}</span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const OAMatrix: React.FC<{ analysisData: AnalysisData; students: ResultadoEstudiante[] }> = ({ analysisData, students }) => {
    const presentStudents = useMemo(() => students.filter(s => s.estado !== 'Ausente').sort((a, b) => a.nombreEstudiante.localeCompare(b.nombreEstudiante)), [students]);
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 z-20 p-3 text-left text-sm font-semibold text-gray-900 border-b border-r">Estudiante</th>
                        {analysisData.porOA.map(oa => (<th key={oa.id} className="p-3 text-center text-sm font-semibold text-gray-900 border-b"><Tooltip text={oa.nombre}>{oa.nombre.split(':')[0]}</Tooltip></th>))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {presentStudents.map(student => (
                        <tr key={student.idEstudiante}>
                            <td className="sticky left-0 bg-white z-10 p-3 text-sm font-medium text-gray-900 border-b border-r">{student.nombreEstudiante}</td>
                            {analysisData.porOA.map(oa => {
                                const metrics = oa.metricasPorEstudiante[student.idEstudiante];
                                return (<td key={oa.id} className={`${getAchievementCellClass(metrics?.porcentajeLogro || 0)} border-b`}>{metrics ? metrics.porcentajeLogro.toFixed(0) + '%' : 'N/A'}</td>);
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const SkillsHeatmapMatrix: React.FC<{ analysisData: AnalysisData; students: ResultadoEstudiante[] }> = ({ analysisData, students }) => {
    const presentStudents = useMemo(() => students.filter(s => s.estado !== 'Ausente').sort((a, b) => a.nombreEstudiante.localeCompare(b.nombreEstudiante)), [students]);
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 z-20 p-3 text-left text-sm font-semibold text-gray-900 border-b border-r">Estudiante</th>
                        {analysisData.porHabilidad.map(hab => (<th key={hab.id} className="p-3 text-center text-sm font-semibold text-gray-900 border-b">{hab.nombre}</th>))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {presentStudents.map(student => (
                        <tr key={student.idEstudiante}>
                            <td className="sticky left-0 bg-white z-10 p-3 text-sm font-medium text-gray-900 border-b border-r">{student.nombreEstudiante}</td>
                            {analysisData.porHabilidad.map(hab => {
                                const metrics = hab.metricasPorEstudiante[student.idEstudiante];
                                return (<td key={hab.id} className={`${getAchievementCellClass(metrics?.porcentajeLogro || 0)} border-b`}>{metrics ? metrics.porcentajeLogro.toFixed(0) + '%' : 'N/A'}</td>);
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export const OAHabMatrix: React.FC<{ analysisData: AnalysisData; config: ConfiguracionEvaluacion; }> = ({ analysisData, config }) => {
     const oas = useMemo(() => OBJETIVOS_APRENDIZAJE.filter(oa => config.objetivosSeleccionados.includes(oa.id)), [config.objetivosSeleccionados]);
     const habilidades = useMemo(() => HABILIDADES.filter(h => config.habilidadesSeleccionadas.includes(h.id)), [config.habilidadesSeleccionadas]);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 z-20 p-3 text-left text-sm font-semibold text-gray-900 border-b border-r">OA \ Habilidad</th>
                        {habilidades.map(h => (<th key={h.id} className="p-3 text-center text-sm font-semibold text-gray-900 border-b">{h.nombre}</th>))}
                    </tr>
                </thead>
                 <tbody className="divide-y divide-gray-200 bg-white">
                    {oas.map(oa => (
                        <tr key={oa.id}>
                             <td className="sticky left-0 bg-white z-10 p-3 text-sm font-medium text-gray-900 border-b border-r"><Tooltip text={oa.descripcion}>{oa.codigo}</Tooltip></td>
                             {habilidades.map(h => {
                                 const key = `${oa.id}-${h.id}`;
                                 const metrics = analysisData.porOAyHabilidad[key];
                                 return (<td key={h.id} className={`${getAchievementCellClass(metrics?.porcentajeLogro || 0)} border-b`}>{metrics ? metrics.porcentajeLogro.toFixed(0) + '%' : '-'}</td>)
                             })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};