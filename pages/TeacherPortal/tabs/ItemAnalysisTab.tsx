
import React, { useState, useMemo } from 'react';
import { type AnalysisData, type ConfiguracionEvaluacion, TipoPregunta } from '../../../types';
import { ReportSection } from '../components/common';
import { FormField, Input, Select, Button } from '../../../components/UI';
import { ChartBarIcon, BeakerIcon, CheckCircleIcon } from '../../../components/Icons';
import { StatCard } from '../components/ui';
import { OBJETIVOS_APRENDIZAJE, HABILIDADES, UNIDADES } from '../../../lib/data';
import { parseRange } from '../lib/utils';
import { AnswerDistributionChart } from '../components/charts';

export const ItemAnalysisTab: React.FC<{ analysisData: AnalysisData; config: ConfiguracionEvaluacion }> = ({ analysisData, config }) => {
    const [filters, setFilters] = useState({ oaId: 'all', habilidadId: 'all', questionNumber: '' });
    const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');
    const [detailsExpanded, setDetailsExpanded] = useState(true);
    
    const questionTypeMap = useMemo(() => {
        const map = new Map<number, TipoPregunta>();
        config.bloquesPreguntas.forEach(bloque => {
            const questionsInBlock = parseRange(bloque.preguntas);
            questionsInBlock.forEach(qNum => { map.set(qNum, bloque.tipo as TipoPregunta); });
        });
        return map;
    }, [config.bloquesPreguntas]);

    const { groupedOAs, availableHabilidades } = useMemo(() => {
        const oaIds = new Set(analysisData.porPregunta.map(p => p.oaId));
        const habIds = new Set(analysisData.porPregunta.map(p => p.habilidadId));
        
        const getUnitName = (unidadId: string) => UNIDADES.find(u => u.id === unidadId)?.nombre || 'Unidad Desconocida';

        const availableOAs = OBJETIVOS_APRENDIZAJE.filter(oa => oaIds.has(oa.id));
        const oasByUnit: { [unitName: string]: { nameWithUnit: string; id: string; }[] } = {};
        
        availableOAs.forEach(oa => {
            const unitName = getUnitName(oa.unidadId);
            if (!oasByUnit[unitName]) {
                oasByUnit[unitName] = [];
            }
            oasByUnit[unitName].push({ id: oa.id, nameWithUnit: `${oa.codigo} (${unitName.replace('Unidad ', 'U')})` });
        });

        for (const unitName in oasByUnit) {
            oasByUnit[unitName].sort((a, b) => a.nameWithUnit.localeCompare(b.nameWithUnit, undefined, { numeric: true }));
        }
        
        return {
            groupedOAs: Object.entries(oasByUnit).sort((a,b) => a[0].localeCompare(b[0])),
            availableHabilidades: HABILIDADES.filter(h => habIds.has(h.id))
        }
    }, [analysisData.porPregunta]);

    const displayedItems = useMemo(() => {
        let items = [...analysisData.porPregunta];

        items = items.filter(item => {
            if (filters.questionNumber && item.numeroPregunta !== parseInt(filters.questionNumber)) return false;
            if (filters.oaId !== 'all' && item.oaId !== filters.oaId) return false;
            if (filters.habilidadId !== 'all' && item.habilidadId !== filters.habilidadId) return false;
            return true;
        });

        switch (sortOrder) {
            case 'asc': return items.sort((a, b) => a.porcentajeLogro - b.porcentajeLogro);
            case 'desc': return items.sort((a, b) => b.porcentajeLogro - a.porcentajeLogro);
            default: return items.sort((a, b) => a.numeroPregunta - b.numeroPregunta);
        }
    }, [analysisData.porPregunta, filters, sortOrder]);

    const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    return (
        <ReportSection>
            <p className="text-sm text-gray-500 mb-4">Análisis técnico de cada pregunta para evaluar su calidad y efectividad. Use los filtros para explorar los datos.</p>
            
            <div className="p-4 bg-gray-50 rounded-lg border mb-2 grid md:grid-cols-5 gap-4 items-end">
                <FormField label="Ver Pregunta Nº" htmlFor="q-num-filter">
                    <Input id="q-num-filter" type="number" placeholder={`1-${config.numeroPreguntas}`} value={filters.questionNumber} onChange={(e) => handleFilterChange('questionNumber', e.target.value)} />
                </FormField>
                 <FormField label="Filtrar por OA" htmlFor="oa-filter">
                    <Select id="oa-filter" value={filters.oaId} onChange={(e) => handleFilterChange('oaId', e.target.value)}>
                        <option value="all">Todos los OAs</option>
                        {groupedOAs.map(([unitName, oas]) => (
                            <optgroup key={unitName} label={unitName}>
                                {oas.map(oa => <option key={oa.id} value={oa.id}>{oa.nameWithUnit}</option>)}
                            </optgroup>
                        ))}
                    </Select>
                </FormField>
                <FormField label="Filtrar por Habilidad" htmlFor="hab-filter">
                    <Select id="hab-filter" value={filters.habilidadId} onChange={(e) => handleFilterChange('habilidadId', e.target.value)}>
                        <option value="all">Todas las Habilidades</option>
                        {availableHabilidades.map(h => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                    </Select>
                </FormField>
                <FormField label="Ordenar por" htmlFor="sort-order-select">
                    <Select id="sort-order-select" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
                        <option value="default">Orden de Pregunta</option>
                        <option value="desc">Mayor % Logro</option>
                        <option value="asc">Menor % Logro</option>
                    </Select>
                </FormField>
                <Button onClick={() => { setFilters({ oaId: 'all', habilidadId: 'all', questionNumber: '' }); setSortOrder('default'); }} variant="secondary">Limpiar</Button>
            </div>

            <div className="flex justify-end items-center mb-6">
                <div className="flex items-center">
                    <input
                        id="expand-details-checkbox"
                        name="expand-details-checkbox"
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                        checked={detailsExpanded}
                        onChange={(e) => setDetailsExpanded(e.target.checked)}
                    />
                    <label htmlFor="expand-details-checkbox" className="ml-2 block text-sm font-medium text-gray-700">
                        Expandir/contraer preguntas
                    </label>
                </div>
            </div>

            <div className="space-y-6">
                {displayedItems.length > 0 ? displayedItems.map(questionData => {
                    const clave = config.claves.find(c => c.numero === questionData.numeroPregunta);
                    const psychometrics = analysisData.itemAnalysis.find(i => i.numeroPregunta === questionData.numeroPregunta);
                    if (!clave) return null;
                    
                    const questionType = questionTypeMap.get(questionData.numeroPregunta);
                    const isRespuestaAbierta = questionType === TipoPregunta.RESPUESTA_ABIERTA;
                    const claveValue = isRespuestaAbierta ? "Respuesta Abierta" : clave.clave;
                    
                    const distributionStats = Object.entries(questionData.respuestasContadas).map(([answer, count]) => ({ 
                        answer: answer, 
                        count: count, 
                        isCorrect: isRespuestaAbierta ? answer === 'Correcta' : (answer.toUpperCase() === questionData.clave.toUpperCase()), 
                    })).sort((a,b) => { 
                        if (isRespuestaAbierta) { 
                            const order: { [key: string]: number } = { 'Correcta': 1, 'Incorrecta': 2, 'Omitida': 3 }; 
                            return (order[a.answer] || 99) - (order[b.answer] || 99); 
                        } else { 
                            if (a.isCorrect) return -1; 
                            if (b.isCorrect) return 1; 
                            if (a.answer === 'Omitida') return 1; 
                            if (b.answer === 'Omitida') return -1; 
                            return a.answer.localeCompare(b.answer); 
                        } 
                    });

                    return (
                        <div key={questionData.numeroPregunta} className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-bold text-gray-800 text-lg mb-3">Pregunta {questionData.numeroPregunta}</h4>
                            <div className="grid md:grid-cols-3 gap-4">
                                <StatCard icon={ChartBarIcon} label="Índice de Dificultad (p-value)" value={psychometrics?.pValue.toFixed(2) || 'N/A'} footer="> 0.75 Fácil, < 0.25 Difícil" />
                                <StatCard icon={BeakerIcon} label="Índice de Discriminación" value={psychometrics?.discriminationIndex.toFixed(2) || 'N/A'} footer="> 0.3 Óptima, < 0.1 Pobre" />
                                <StatCard icon={CheckCircleIcon} label="Clave Correcta" value={claveValue} footer={`% Logro: ${questionData.porcentajeLogro.toFixed(1)}%`} />
                            </div>
                             {detailsExpanded && (
                                <div className="mt-4">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Distribución de Respuestas (Análisis de Distractores)</h5>
                                    <AnswerDistributionChart stats={distributionStats} total={questionData.totalEstudiantes} />
                                </div>
                            )}
                        </div>
                    )
                }) : (
                    <div className="text-center py-12 text-gray-500"><p>No se encontraron preguntas que coincidan con los filtros seleccionados.</p></div>
                )}
            </div>
        </ReportSection>
    )
};
