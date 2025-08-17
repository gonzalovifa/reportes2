
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ConfiguracionEvaluacion } from '../../../types';
import type { Action } from '../adminEditor.logic';
import { Button, FormField, Input, Select, Tooltip } from '../../../components/UI';
import { TipoPregunta } from '../../../types';
import { parseRange, sanitizeRangeInput, reorderAndFormatRanges } from '../adminEditor.logic';
import { TrashIcon, PlusCircleIcon, DocumentArrowDownIcon, ChevronDownIcon } from '../../../components/Icons';
import { OBJETIVOS_APRENDIZAJE, EJES_TEMATICOS, HABILIDADES } from '../../../lib/data';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SectionProps {
  state: ConfiguracionEvaluacion;
  dispatch: React.Dispatch<Action>;
}

interface KeysSectionProps extends SectionProps {
    isMatrixComplete: boolean;
}

export const KeysSection: React.FC<KeysSectionProps> = ({ state, dispatch, isMatrixComplete }) => {
    const { bloquesPreguntas, claves, numeroPreguntas } = state;
    const [specTableMenuOpen, setSpecTableMenuOpen] = useState(false);
    const specTableMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (specTableMenuRef.current && !specTableMenuRef.current.contains(event.target as Node)) {
                setSpecTableMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const overlappingQuestions = useMemo(() => {
        const questionToBlockIds = new Map<number, string[]>();
        bloquesPreguntas.forEach(block => {
            const questions = parseRange(block.preguntas);
            questions.forEach(qNum => {
                if (qNum > numeroPreguntas || qNum < 1) return; // Ignore questions outside the valid range
                if (!questionToBlockIds.has(qNum)) {
                    questionToBlockIds.set(qNum, []);
                }
                questionToBlockIds.get(qNum)!.push(block.id);
            });
        });

        const overlaps = new Set<number>();
        for (const [qNum, blockIds] of questionToBlockIds.entries()) {
            if (blockIds.length > 1) {
                overlaps.add(qNum);
            }
        }
        return overlaps;
    }, [bloquesPreguntas, numeroPreguntas]);
    
    const questionTypes: { [key: number]: TipoPregunta } = useMemo(() => {
        const types: { [key: number]: TipoPregunta } = {};
        bloquesPreguntas.forEach(block => {
            parseRange(block.preguntas).forEach(num => {
                types[num] = block.tipo;
            });
        });
        return types;
    }, [bloquesPreguntas]);

    const handleExportSpecificationTable = (format: 'xlsx' | 'pdf') => {
        const data = Array.from({ length: state.numeroPreguntas }, (_, i) => {
            const qNum = i + 1;
            const assignment = state.preguntaAsignaciones[qNum];
            const oa = OBJETIVOS_APRENDIZAJE.find(o => o.id === assignment?.oaId);
            const eje = EJES_TEMATICOS.find(e => e.id === oa?.ejeId);
            const habilidad = HABILIDADES.find(h => h.id === assignment?.habilidadId);
            const tipoPregunta = questionTypes[qNum] || '';
            const clave = state.claves.find(c => c.numero === qNum);

            return {
                'Nº de ítem': qNum,
                'Eje': eje?.nombre || 'N/A',
                'Número de OA': oa?.codigo || 'N/A',
                'Descripción OA': oa?.descripcion || 'N/A',
                'Habilidad': habilidad?.nombre || 'N/A',
                'Tipo de Pregunta': tipoPregunta,
                'Clave (respuesta correcta)': clave?.clave || '',
            };
        });

        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            worksheet['!cols'] = [
                { wch: 10 }, // Nº de ítem
                { wch: 25 }, // Eje
                { wch: 15 }, // Número de OA
                { wch: 70 }, // Descripción OA
                { wch: 30 }, // Habilidad
                { wch: 30 }, // Tipo de Pregunta
                { wch: 25 }, // Clave
            ];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Tabla de Especificaciones");
            XLSX.writeFile(workbook, "tabla-de-especificaciones.xlsx");
        } else { // pdf
            const doc = new jsPDF({ orientation: 'landscape' });
            const headers = [
                'Nº',
                'Eje',
                'OA',
                'Descripción OA',
                'Habilidad',
                'Tipo de Pregunta',
                'Clave'
            ];
            autoTable(doc, {
                head: [headers],
                body: data.map(row => [
                    row['Nº de ítem'],
                    row['Eje'],
                    row['Número de OA'],
                    row['Descripción OA'],
                    row['Habilidad'],
                    row['Tipo de Pregunta'],
                    row['Clave (respuesta correcta)'],
                ].map(v => String(v))),
                 didDrawPage: function (data) {
                    doc.setFontSize(18);
                    doc.setTextColor(40);
                    doc.text('Tabla de Especificaciones', data.settings.margin.left, 15);
                    doc.setFontSize(10);
                    doc.text(`Evaluación: ${state.nombre}`, data.settings.margin.left, 21);
                },
                margin: { top: 25 },
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fillColor: [59, 130, 246] }, // primary-600
                columnStyles: {
                    0: { cellWidth: 8 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 12 },
                    3: { cellWidth: 'auto' }, // Descripcion OA
                    4: { cellWidth: 28 },
                    5: { cellWidth: 30 },
                    6: { cellWidth: 12 },
                }
            });
            doc.save("tabla-de-especificaciones.pdf");
        }
        setSpecTableMenuOpen(false);
    };

    const renderKeyInput = (qNum: number, currentKey: string) => {
        const type = questionTypes[qNum];
        const optionsMap = {
            [TipoPregunta.SELECCION_MULTIPLE_3]: ['A', 'B', 'C'],
            [TipoPregunta.SELECCION_MULTIPLE_4]: ['A', 'B', 'C', 'D'],
            [TipoPregunta.SELECCION_MULTIPLE_5]: ['A', 'B', 'C', 'D', 'E'],
            [TipoPregunta.VERDADERO_FALSO]: ['V', 'F'],
        };
        const options = optionsMap[type as keyof typeof optionsMap];

        if (!options) {
             return <span className="text-gray-500 italic text-sm">No requiere clave</span>;
        }

        return options.map(opt => 
            <Button key={opt} size="sm" variant={currentKey.toUpperCase() === opt ? 'primary' : 'secondary'} onClick={() => dispatch({ type: 'UPDATE_KEY', question: qNum, key: opt })}>{opt}</Button>
        );
    };
    
    if (numeroPreguntas === 0) {
        return <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">Ajuste el número de preguntas en "Datos Generales" para definir las claves.</p>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Definir Bloques de Preguntas</h3>
                <div className="space-y-4">
                    {bloquesPreguntas.map(block => {
                        const blockQuestions = parseRange(block.preguntas);
                        const overlapsInThisBlock = blockQuestions.filter(q => overlappingQuestions.has(q));
                        const invalidQuestions = blockQuestions.filter(q => q < 1 || q > numeroPreguntas);
                        const rangeError = invalidQuestions.length > 0 ? `Preguntas fuera de rango (1-${numeroPreguntas}): ${invalidQuestions.join(', ')}` : null;

                        return (
                            <div key={block.id}>
                                <div className="grid grid-cols-1 md:grid-cols-[2fr,2fr,1fr,auto] gap-4 items-end p-4 border rounded-md bg-gray-50">
                                    <FormField label="Tipo de Pregunta" htmlFor={`type-${block.id}`}>
                                        <Select id={`type-${block.id}`} value={block.tipo} onChange={e => dispatch({ type: 'UPDATE_BLOCK', block: { ...block, tipo: e.target.value as TipoPregunta } })}>
                                            {Object.values(TipoPregunta).map(t => <option key={t} value={t}>{t}</option>)}
                                        </Select>
                                    </FormField>
                                    <FormField label="Nº de Preguntas" htmlFor={`range-${block.id}`}>
                                        <Input
                                          id={`range-${block.id}`}
                                          placeholder="Ej: 1-5, 8, 10-12"
                                          value={block.preguntas}
                                          onChange={e => {
                                            dispatch({ type: 'UPDATE_BLOCK', block: { ...block, preguntas: sanitizeRangeInput(e.target.value) } });
                                          }}
                                          onBlur={e => {
                                              dispatch({ type: 'UPDATE_BLOCK', block: { ...block, preguntas: reorderAndFormatRanges(e.target.value) } });
                                          }}
                                          className={rangeError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                                        />
                                        {rangeError && <p className="mt-1 text-sm text-red-600">{rangeError}</p>}
                                    </FormField>
                                    <FormField label="Puntaje" htmlFor={`score-${block.id}`}>
                                        <Input id={`score-${block.id}`} type="number" min="0" value={block.puntaje} onChange={e => dispatch({ type: 'UPDATE_BLOCK', block: { ...block, puntaje: Number(e.target.value) } })} />
                                    </FormField>
                                     <Button variant="danger" onClick={() => dispatch({ type: 'DELETE_BLOCK', id: block.id })}>
                                        <TrashIcon className="w-5 h-5"/>
                                    </Button>
                                </div>
                                {overlapsInThisBlock.length > 0 && !rangeError && (
                                    <p className="mt-2 px-1 text-sm text-red-600 font-medium">
                                        ¡Advertencia! Preguntas superpuestas: {overlapsInThisBlock.sort((a, b) => a - b).join(', ')}. Estas preguntas están definidas en múltiples bloques.
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={() => dispatch({ type: 'ADD_BLOCK' })}
                    className="group mt-4 inline-flex items-center gap-2 justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm transition-all duration-200 ease-in-out hover:bg-accent hover:text-white hover:border-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                    <PlusCircleIcon className="w-5 h-5 text-gray-700 transition-colors duration-200 group-hover:text-white" />
                    <span>Añadir Bloque</span>
                </button>
            </div>
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Editor de Claves y Puntajes</h3>
                    <div className="relative" ref={specTableMenuRef}>
                         <Tooltip text={!isMatrixComplete ? "Debe completar la Matriz de Especificaciones primero." : ""}>
                            <div className="inline-block"> {/* Wrapper to catch mouse events on a disabled button */}
                                <Button 
                                    onClick={() => setSpecTableMenuOpen(p => !p)} 
                                    size="sm" 
                                    variant="secondary" 
                                    disabled={!isMatrixComplete}
                                >
                                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                                    Tabla de Especificaciones
                                    <ChevronDownIcon className={`w-4 h-4 ml-2 transition-transform ${specTableMenuOpen && isMatrixComplete ? 'rotate-180' : ''}`} />
                                </Button>
                            </div>
                        </Tooltip>
                        {specTableMenuOpen && isMatrixComplete && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-40">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleExportSpecificationTable('xlsx'); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como Excel (.xlsx)</a>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleExportSpecificationTable('pdf'); }} className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100" role="menuitem">Como PDF</a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="space-y-2">
                    {claves.map(clave => (
                        <div key={clave.numero} className="grid grid-cols-[auto,1fr,auto] gap-x-6 gap-y-2 items-center p-3 border rounded-md">
                           <span className="font-medium text-gray-800">Pregunta {clave.numero}</span>
                           <div className="flex flex-wrap gap-2">{renderKeyInput(clave.numero, clave.clave)}</div>
                           <div className="w-32">
                               <FormField label="Puntaje" htmlFor={`score-q-${clave.numero}`}>
                                   <Input type="number" min="0" id={`score-q-${clave.numero}`} value={clave.puntaje} onChange={e => dispatch({ type: 'UPDATE_KEY', question: clave.numero, key: clave.clave, score: Number(e.target.value)})}/>
                               </FormField>
                           </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
