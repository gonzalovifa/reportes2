
import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { ConfiguracionEvaluacion, PreguntaAsignada } from '../../../types';
import type { Action } from '../adminEditor.logic';
import { Button, Tooltip } from '../../../components/UI';
import { OBJETIVOS_APRENDIZAJE, HABILIDADES, UNIDADES } from '../../../lib/data';
import { ChevronLeftIcon, ChevronRightIcon, CheckmarkIcon, DocumentArrowDownIcon, ChevronDownIcon } from '../../../components/Icons';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SectionProps {
  state: ConfiguracionEvaluacion;
  dispatch: React.Dispatch<Action>;
}

export const SpecMatrixSection: React.FC<SectionProps> = ({ state, dispatch }) => {
    const { objetivosSeleccionados, habilidadesSeleccionadas, preguntaAsignaciones, numeroPreguntas } = state;
    const [activeCell, setActiveCell] = React.useState<{ oaId: string | null; habilidadId: string | null }>({ oaId: null, habilidadId: null });

    const questionsScrollRef = useRef<HTMLDivElement>(null);
    const matrixScrollRef = useRef<HTMLDivElement>(null);
    const [exportTotalsMenuOpen, setExportTotalsMenuOpen] = useState(false);
    const exportTotalsMenuRef = useRef<HTMLDivElement>(null);
    const [exportQuestionsMenuOpen, setExportQuestionsMenuOpen] = useState(false);
    const exportQuestionsMenuRef = useRef<HTMLDivElement>(null);

    const oas = useMemo(() => OBJETIVOS_APRENDIZAJE.filter(oa => objetivosSeleccionados.includes(oa.id)), [objetivosSeleccionados]);
    const habilidades = useMemo(() => HABILIDADES.filter(h => habilidadesSeleccionadas.includes(h.id)), [habilidadesSeleccionadas]);

    const groupedOas = useMemo(() => {
        const selectedOas = OBJETIVOS_APRENDIZAJE.filter(oa => objetivosSeleccionados.includes(oa.id));
        const unitsWithSelectedOas = UNIDADES.filter(u => selectedOas.some(oa => oa.unidadId === u.id));

        return unitsWithSelectedOas.map(unit => ({
            ...unit,
            objetivos: selectedOas
                .filter(oa => oa.unidadId === unit.id)
                .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: 'base' }))
        })).filter(unit => unit.objetivos.length > 0);
    }, [objetivosSeleccionados]);
    
    const cellAssignments: { [key: string]: number[] } = useMemo(() => {
        const cells: { [key: string]: number[] } = {};
        Object.entries(preguntaAsignaciones).forEach(([qNum, assignment]) => {
            const key = `${(assignment as PreguntaAsignada).oaId}-${(assignment as PreguntaAsignada).habilidadId}`;
            if (!cells[key]) cells[key] = [];
            cells[key].push(Number(qNum));
        });
        return cells;
    }, [preguntaAsignaciones]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportTotalsMenuRef.current && !exportTotalsMenuRef.current.contains(event.target as Node)) {
                setExportTotalsMenuOpen(false);
            }
            if (exportQuestionsMenuRef.current && !exportQuestionsMenuRef.current.contains(event.target as Node)) {
                setExportQuestionsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleScroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
        if (ref.current) {
            const scrollAmount = ref.current.clientWidth * 0.75;
            ref.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    const activeOa = useMemo(() => oas.find(oa => oa.id === activeCell.oaId), [oas, activeCell.oaId]);
    const activeHabilidad = useMemo(() => habilidades.find(h => h.id === activeCell.habilidadId), [habilidades, activeCell.habilidadId]);

    useEffect(() => {
        // Automatically select the first cell if no cell is selected.
        if (!activeCell.oaId && groupedOas.length > 0 && groupedOas[0].objetivos.length > 0) {
            setActiveCell(prev => ({ ...prev, oaId: groupedOas[0].objetivos[0].id }));
        }
        if (!activeCell.habilidadId && habilidades.length > 0) {
            setActiveCell(prev => ({ ...prev, habilidadId: habilidades[0].id }));
        }
    }, [groupedOas, habilidades, activeCell.oaId, activeCell.habilidadId]);

    const handleExport = (format: 'xlsx' | 'pdf', type: 'totals' | 'questions') => {
        const header = ['OA \\ HABILIDAD', ...habilidades.map(h => h.nombre)];
        
        const bodyForXlsx: (string | number)[][] = [];
        const bodyForPdf: any[] = [];
        const merges: any[] = [];
        let bodyRowIndex = 0;

        groupedOas.forEach(unitGroup => {
            bodyForXlsx.push([unitGroup.nombre, ...Array(habilidades.length).fill('')]);
            merges.push({ s: { r: bodyRowIndex + 1, c: 0 }, e: { r: bodyRowIndex + 1, c: header.length - 1 } });
            bodyForPdf.push([{ content: unitGroup.nombre, colSpan: header.length, styles: { fontStyle: 'bold', fillColor: '#f3f4f6', textColor: '#374151' } }]);
            bodyRowIndex++;

            unitGroup.objetivos.forEach(oa => {
                const dataRow = habilidades.map(h => {
                    const cellKey = `${oa.id}-${h.id}`;
                    const assignedHere = cellAssignments[cellKey] || [];
                    if (type === 'totals') {
                        return assignedHere.length > 0 ? String(assignedHere.length) : '';
                    } else {
                        return assignedHere.length > 0 ? assignedHere.sort((a, b) => a - b).join(', ') : '';
                    }
                });

                bodyForXlsx.push([oa.codigo, ...dataRow.map(d => String(d))]);
                bodyForPdf.push([oa.codigo, ...dataRow.map(d => String(d))]);
                bodyRowIndex++;
            });
        });

        if (format === 'xlsx') {
            const ws = XLSX.utils.aoa_to_sheet([header, ...bodyForXlsx]);
            ws['!merges'] = merges;
            ws['!cols'] = [
                { wch: 20 },
                ...habilidades.map(h => ({ wch: Math.max(15, h.nombre.length) }))
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Matriz');
            XLSX.writeFile(wb, `matriz-especificaciones-${type}.xlsx`);

        } else { // pdf
            const doc = new jsPDF({ orientation: 'landscape' });
            
            autoTable(doc, {
                head: [header],
                body: bodyForPdf,
                didDrawPage: function (data: any) {
                    doc.setFontSize(18);
                    doc.setTextColor(40);
                    doc.text('Matriz de Especificaciones', data.settings.margin.left, 15);
                    doc.setFontSize(10);
                    doc.text(`Evaluación: ${state.nombre}`, data.settings.margin.left, 21);
                    doc.text(`Tipo: ${type === 'totals' ? 'Totales por celda' : 'Preguntas por celda'}`, data.settings.margin.left, 26);
                },
                margin: { top: 30 },
            });
            doc.save(`matriz-especificaciones-${type}.pdf`);
        }
    };
    
    if (oas.length === 0 || habilidades.length === 0) {
        return <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">Seleccione al menos un Objetivo de Aprendizaje y una Habilidad para ver la matriz.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm p-4 border rounded-lg z-30">
                <h3 className="text-lg font-semibold text-gray-800">Selector de Preguntas</h3>
                {activeOa && activeHabilidad ? (
                    <p className="text-sm text-gray-600 my-2">
                        Asignando preguntas para OA: <span className="font-semibold text-primary-700">{activeOa.codigo}</span> y Habilidad: <span className="font-semibold text-primary-700">{activeHabilidad.nombre}</span>.
                    </p>
                ) : (
                    <p className="text-sm text-gray-500 my-2">
                        Haga clic en una celda de la tabla para activarla y comenzar a asignar preguntas.
                    </p>
                )}
                
                <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white">
                     <div className="relative">
                        <div ref={questionsScrollRef} className="overflow-x-auto pb-2 scroll-smooth px-12" style={{ scrollbarWidth: 'none' }}>
                            <div className="flex flex-nowrap items-center gap-4">
                                {Array.from({ length: numeroPreguntas }, (_, i) => i + 1).map(qNum => {
                                    const assignment = preguntaAsignaciones[qNum];
                                    const isSelectedInActiveCell = activeCell.oaId && activeCell.habilidadId && assignment?.oaId === activeCell.oaId && assignment?.habilidadId === activeCell.habilidadId;
                                    const isAssignedElsewhere = assignment && !isSelectedInActiveCell;

                                    const handleClick = () => {
                                        if (isAssignedElsewhere) return;
                                        if (!activeCell.oaId || !activeCell.habilidadId) {
                                            alert("Por favor, seleccione una celda de la matriz primero.");
                                            return;
                                        }
                                        if (isSelectedInActiveCell) {
                                            dispatch({ type: 'UNASSIGN_QUESTION', question: qNum });
                                        } else {
                                            dispatch({ type: 'ASSIGN_QUESTION', question: qNum, oaId: activeCell.oaId, habilidadId: activeCell.habilidadId });
                                        }
                                    };

                                    return (
                                        <button
                                            key={qNum}
                                            type="button"
                                            onClick={handleClick}
                                            disabled={isAssignedElsewhere}
                                            className="flex-shrink-0 flex items-center gap-2 rounded-lg transition-colors duration-150 p-0 border-0 bg-transparent cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                            aria-pressed={isSelectedInActiveCell}
                                            aria-label={`Asignar pregunta ${qNum}`}
                                        >
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                                isSelectedInActiveCell 
                                                    ? 'bg-primary-600 border-primary-600' 
                                                    : isAssignedElsewhere 
                                                        ? 'bg-gray-300 border-gray-400' 
                                                        : 'bg-white border-primary-500'
                                            }`}>
                                                {isSelectedInActiveCell && <CheckmarkIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <div
                                                className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${
                                                    isSelectedInActiveCell
                                                        ? 'bg-primary-50 text-primary-700 border-primary-200'
                                                        : isAssignedElsewhere
                                                            ? 'bg-gray-200 text-gray-500 border-gray-300'
                                                            : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                            >
                                                P{qNum}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="!absolute top-1/2 -translate-y-1/2 left-2 !rounded-full !p-1 h-8 w-8 shadow-md bg-white/70 backdrop-blur-sm"
                            onClick={() => handleScroll(questionsScrollRef, 'left')}
                            aria-label="Desplazar preguntas a la izquierda"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="!absolute top-1/2 -translate-y-1/2 right-2 !rounded-full !p-1 h-8 w-8 shadow-md bg-white/70 backdrop-blur-sm"
                            onClick={() => handleScroll(questionsScrollRef, 'right')}
                            aria-label="Desplazar preguntas a la derecha"
                        >
                            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end items-center gap-2 py-2">
                <div className="relative" ref={exportTotalsMenuRef}>
                    <Button onClick={() => setExportTotalsMenuOpen(p => !p)} size="sm" variant="secondary">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        Exportar Totales
                        <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${exportTotalsMenuOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {exportTotalsMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExport('xlsx', 'totals'); setExportTotalsMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como Excel (.xlsx)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExport('pdf', 'totals'); setExportTotalsMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como PDF</a>
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative" ref={exportQuestionsMenuRef}>
                    <Button onClick={() => setExportQuestionsMenuOpen(p => !p)} size="sm" variant="secondary">
                        <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                        Exportar Preguntas
                        <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${exportQuestionsMenuOpen ? 'rotate-180' : ''}`} />
                    </Button>
                    {exportQuestionsMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExport('xlsx', 'questions'); setExportQuestionsMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como Excel (.xlsx)</a>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleExport('pdf', 'questions'); setExportQuestionsMenuOpen(false); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como PDF</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative">
                <div ref={matrixScrollRef} className="overflow-x-auto border rounded-lg scroll-smooth px-12" style={{ scrollbarWidth: 'none' }}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="sticky left-0 bg-gray-100 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">OA \\ HABILIDAD</th>
                                {habilidades.map(h => <th key={h.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{h.nombre}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {groupedOas.map(unitGroup => (
                                <React.Fragment key={unitGroup.id}>
                                    <tr>
                                        <td colSpan={habilidades.length + 1} className="bg-gray-50 px-6 py-2 text-sm font-semibold text-gray-700 sticky left-0 z-10">
                                            {unitGroup.nombre}
                                        </td>
                                    </tr>
                                    {unitGroup.objetivos.map(oa => (
                                        <tr key={oa.id}>
                                            <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 z-10">{oa.codigo}</td>
                                            {habilidades.map(h => {
                                                const cellKey = `${oa.id}-${h.id}`;
                                                const assignedHere = cellAssignments[cellKey] || [];
                                                const isActive = activeCell.oaId === oa.id && activeCell.habilidadId === h.id;
                                                return (
                                                    <td key={h.id} 
                                                        className={`px-6 py-4 text-center cursor-pointer transition-colors ${isActive ? 'bg-primary-50 ring-2 ring-primary-500' : 'hover:bg-gray-50'}`}
                                                        onClick={() => setActiveCell({ oaId: oa.id, habilidadId: h.id })}
                                                    >
                                                        {assignedHere.length > 0 ? (
                                                            <Tooltip text={`Preguntas: ${assignedHere.sort((a,b)=> a-b).join(', ')}`}>
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-500 text-white font-bold text-sm">
                                                                    {assignedHere.length}
                                                                </span>
                                                            </Tooltip>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    className="!absolute top-1/2 -translate-y-1/2 left-2 !rounded-full !p-1 h-8 w-8 shadow-md bg-white/70 backdrop-blur-sm"
                    onClick={() => handleScroll(matrixScrollRef, 'left')}
                    aria-label="Desplazar habilidades a la izquierda"
                >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    className="!absolute top-1/2 -translate-y-1/2 right-2 !rounded-full !p-1 h-8 w-8 shadow-md bg-white/70 backdrop-blur-sm"
                    onClick={() => handleScroll(matrixScrollRef, 'right')}
                    aria-label="Desplazar habilidades a la derecha"
                >
                    <ChevronRightIcon className="w-5 h-5 text-gray-600" />
                </Button>
            </div>
        </div>
    );
};
