
import React, { useState, useCallback, useMemo } from 'react';
import { Select, Button, FormField } from '../../../components/UI';
import { FileUploadArea } from '../components/FileUploadArea';
import { SpinnerIcon } from '../../../components/Icons';
import type { ConfiguracionEvaluacion, ResultadoEstudiante, AnalysisData, ProcessedEvaluation, Colegio, Docente } from '../../../types';
import * as XLSX from 'xlsx';
import { saveProcessedEvaluation, saveStudentResults } from '../../../lib/firebase';
import { calculateAnalysisData, calculateGrade, parseRange } from '../lib/utils';
import { TipoPregunta } from '../../../types';
import { toast } from 'react-hot-toast';

interface UploadViewProps {
    configurations: ConfiguracionEvaluacion[];
    selection: { colegio: Colegio; docente: Docente };
    onProcessComplete: (evaluation: ProcessedEvaluation) => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ configurations, selection, onProcessComplete }) => {
    const [selectedConfigId, setSelectedConfigId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingError, setProcessingError] = useState<string | null>(null);
    
    const selectedConfig = useMemo(() => configurations.find(c => c.id === selectedConfigId), [configurations, selectedConfigId]);

    const handleProcess = useCallback(async () => {
        if (!file || !selectedConfig) return;
        
        setIsProcessing(true);
        setProcessingError(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);

            let sheet;
            let sheetName = selectedConfig.nombreHoja;

            if (workbook.Sheets[sheetName]) {
                sheet = workbook.Sheets[sheetName];
            } else {
                const firstSheetName = workbook.SheetNames.find(name => {
                    const sheetProps = workbook.Workbook?.Sheets?.find(s => s.name === name);
                    return !sheetProps || sheetProps.Hidden === 0 || sheetProps.Hidden === undefined;
                });
                
                if (firstSheetName) {
                    sheet = workbook.Sheets[firstSheetName];
                    sheetName = firstSheetName;
                    console.warn(`Sheet "${selectedConfig.nombreHoja}" not found. Using first visible sheet: "${sheetName}"`);
                } else {
                    throw new Error(`No se encontró la hoja "${selectedConfig.nombreHoja}" y no hay otras hojas visibles en el archivo.`);
                }
            }

            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: selectedConfig.filasEncabezadoASaltar });

            if (jsonData.length === 0) { throw new Error("La hoja de cálculo está vacía o no tiene datos."); }
            const headers: string[] = jsonData[0].map((h: any) => String(h).trim());
            const studentIdColIndex = headers.indexOf(selectedConfig.columnaIdEstudiante);
            const studentNameColIndex = headers.indexOf(selectedConfig.columnaNombreEstudiante);

            if (studentIdColIndex === -1) { throw new Error(`La columna de ID de estudiante "${selectedConfig.columnaIdEstudiante}" no fue encontrada.`); }
            if (studentNameColIndex === -1) { throw new Error(`La columna de Nombre de estudiante "${selectedConfig.columnaNombreEstudiante}" no fue encontrada.`); }
            
            const questionTypeMap = new Map<number, TipoPregunta>();
            selectedConfig.bloquesPreguntas.forEach(bloque => {
                const questionsInBlock = parseRange(bloque.preguntas);
                questionsInBlock.forEach(qNum => { questionTypeMap.set(qNum, bloque.tipo); });
            });
            
            const results: ResultadoEstudiante[] = [];
            for (let i = 1; i < jsonData.length; i++) {
                const row: any[] = jsonData[i];
                const idEstudiante = String(row[studentIdColIndex] || '').trim();
                const nombreEstudiante = String(row[studentNameColIndex] || '').trim();
                if (!idEstudiante || !nombreEstudiante) { continue; }

                const studentData: ResultadoEstudiante = { idEstudiante, nombreEstudiante, puntajeObtenido: 0, puntajeTotal: 0, calificacion: '1.0', estado: 'Aprobado', respuestas: {}, correctas: 0, incorrectas: 0, omitidas: 0 };
                let puntajeTotalCalculado = 0;
                let isAbsent = true;
                
                selectedConfig.claves.forEach(clave => {
                    const headerIndex = headers.indexOf(`P${clave.numero}`);
                    if (headerIndex === -1) return;
                    
                    const rawAnswer = row[headerIndex];
                    const studentAnswer = rawAnswer !== undefined && rawAnswer !== null ? String(rawAnswer).trim() : '';
                    studentData.respuestas[String(clave.numero)] = studentAnswer;
                    
                    if(studentAnswer !== '') isAbsent = false;

                    puntajeTotalCalculado += clave.puntaje;

                    const questionType = questionTypeMap.get(clave.numero);
                    if (questionType === TipoPregunta.RESPUESTA_ABIERTA) {
                        if (studentAnswer === '1') { studentData.puntajeObtenido += clave.puntaje; studentData.correctas++; }
                        else if (studentAnswer === '0') { studentData.incorrectas++; }
                        else { studentData.omitidas++; }
                    } else {
                        if (studentAnswer === '' || studentAnswer.toUpperCase() === 'O') { studentData.omitidas++; }
                        else if (studentAnswer.toUpperCase() === String(clave.clave).toUpperCase()) { studentData.puntajeObtenido += clave.puntaje; studentData.correctas++; }
                        else { studentData.incorrectas++; }
                    }
                });
                studentData.puntajeTotal = puntajeTotalCalculado;
                
                if (isAbsent) {
                    studentData.estado = 'Ausente';
                    studentData.calificacion = '1.0';
                } else {
                    const { calificacion, estado } = calculateGrade(studentData.puntajeObtenido, studentData.puntajeTotal, selectedConfig.porcentajeExigencia);
                    studentData.calificacion = calificacion;
                    studentData.estado = estado;
                }
                results.push(studentData);
            }
            if(results.length === 0) { throw new Error("No se encontraron datos de estudiantes válidos en el archivo. Verifique las columnas de ID y Nombre."); }
            
            await saveStudentResults(results, selectedConfig);
            const analysisData = calculateAnalysisData(results, selectedConfig, questionTypeMap);
            
            const newEvaluation: Omit<ProcessedEvaluation, 'id'> = {
                configuracion: selectedConfig,
                resultados: results,
                analysisData: analysisData,
                processedAt: new Date().toISOString(),
                colegioId: selection.colegio.id,
                docenteId: selection.docente.id,
            };

            const savedEval = await saveProcessedEvaluation(newEvaluation, selection);
            onProcessComplete(savedEval);
            toast.success('¡Reporte generado y guardado exitosamente!');

        } catch (e: any) {
            console.error(e);
            setProcessingError(`Error al procesar: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    }, [file, selectedConfig, selection, onProcessComplete]);

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Subir Respuestas de Estudiantes</h1>
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="space-y-2">
                    <FormField label="1. Seleccione la Plantilla de Evaluación" htmlFor="config-select">
                        <Select id="config-select" value={selectedConfigId} onChange={e => setSelectedConfigId(e.target.value)}>
                            <option value="" disabled>Seleccione una configuración</option>
                            {configurations.filter(c => c.estado === 'Completa').map(config => (
                                <option key={config.id} value={config.id}>{config.nombre}</option>
                            ))}
                        </Select>
                    </FormField>
                    {selectedConfig && (
                        <div className="p-4 bg-primary-50 border-l-4 border-primary-400 rounded-r-md animate-fade-in">
                            <p className="text-sm text-gray-800"><b>Nombre:</b> {selectedConfig.nombre}</p>
                            <p className="text-sm text-gray-600"><b>Fecha:</b> {selectedConfig.fecha}</p>
                            <p className="text-sm text-gray-600"><b>Nº Preguntas:</b> {selectedConfig.numeroPreguntas}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 space-y-2">
                    <label className={`block font-medium ${!selectedConfig ? 'text-gray-400' : 'text-gray-700'}`}>
                        2. Suba el Archivo de Respuestas
                    </label>
                    <FileUploadArea onFileAccepted={setFile} file={file} disabled={!selectedConfig} />
                </div>

                {processingError && <div className="mt-4 text-sm text-red-600 p-3 bg-red-50 rounded-md">{processingError}</div>}
                
                <div className="mt-8 text-center">
                    <Button 
                        onClick={handleProcess} 
                        disabled={!file || !selectedConfig || isProcessing} 
                        className="w-full max-w-sm !py-3 !text-base"
                    >
                        {isProcessing ? <><SpinnerIcon className="w-5 h-5 mr-2"/> Procesando...</> : 'Procesar Resultados'}
                    </Button>
                </div>
            </div>
        </div>
    );
};