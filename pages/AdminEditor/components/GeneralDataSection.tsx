
import React, { useState, useRef } from 'react';
import { Button, FormField, Input, Select } from '../../../components/UI';
import { NIVELES_EDUCATIVOS, ASIGNATURAS } from '../../../lib/data';
import type { ConfiguracionEvaluacion } from '../../../types';
import type { Action } from '../adminEditor.logic';
import { CalendarDaysIcon, CheckCircleIcon, SparklesIcon, SpinnerIcon, UploadIcon } from '../../../components/Icons';

interface FileUploadComponentProps {
  label: string;
  file: File | null;
  fileName?: string | null;
  onFileChange: (file: File | null) => void;
  onClear: () => void;
  accept: string;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ label, file, fileName, onFileChange, onClear, accept }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fileExists = file || fileName;
    const displayName = file ? file.name : fileName;

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileChange(e.target.files[0]);
        }
        if(e.target) e.target.value = '';
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div
                className={`relative mt-1 flex flex-col justify-center items-center w-full p-4 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {fileExists ? (
                    <div className="text-center">
                        <CheckCircleIcon className="w-10 h-10 text-green-500 mx-auto" />
                        <p className="mt-2 text-sm font-medium text-gray-800 break-all">{displayName}</p>
                        {file && <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>}
                        <button type="button" onClick={onClear} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800">
                            Quitar archivo
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <UploadIcon className="w-8 h-8 text-gray-400 mx-auto"/>
                         <label htmlFor={`file-upload-${label}`} className="relative cursor-pointer">
                            <span className="text-sm font-medium text-primary-600 hover:text-primary-800">
                                Seleccione un archivo
                            </span>
                             <span className="text-sm text-gray-600"> o arrástrelo aquí</span>
                            <input id={`file-upload-${label}`} ref={inputRef} onChange={handleFileChange} type="file" className="sr-only" accept={accept} />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">Soporta: {accept}</p>
                    </div>
                )}
            </div>
        </div>
    );
};


interface GeneralDataSectionProps {
  state: ConfiguracionEvaluacion;
  dispatch: React.Dispatch<Action>;
  nameValidationError: string | null;
  files: { testFile: File | null; specFile: File | null };
  onFilesChange: (files: { testFile?: File | null; specFile?: File | null }) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysisError: string | null;
}

export const GeneralDataSection: React.FC<GeneralDataSectionProps> = ({ state, dispatch, nameValidationError, files, onFilesChange, onAnalyze, isAnalyzing, analysisError }) => {
    const { nombre, nivel, asignatura, numeroPreguntas, fecha, porcentajeExigencia } = state;
    const availableAsignaturas = nivel ? ASIGNATURAS[nivel] : [];
    
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <FormField label="Nombre de la Evaluación" htmlFor="nombre">
                    <Input 
                        id="nombre" 
                        value={nombre} 
                        onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'nombre', value: e.target.value})} 
                        placeholder="Ej: Evaluación de Matemática - Unidad 1"
                        className={nameValidationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                    />
                    {nameValidationError && <p className="mt-1 text-sm text-red-600">{nameValidationError}</p>}
                </FormField>
                
                <FormField label="Fecha" htmlFor="fecha">
                    <div className="relative">
                        <Input id="fecha" type="date" value={fecha} onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'fecha', value: e.target.value})} placeholder="19/07/2025" />
                        <CalendarDaysIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                </FormField>

                <FormField label="Nivel Educativo" htmlFor="nivel">
                    <Select id="nivel" value={nivel} onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'nivel', value: e.target.value})}>
                        <option value="">Selecciona un nivel...</option>
                        {NIVELES_EDUCATIVOS.map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                </FormField>
                
                <FormField label="Asignatura" htmlFor="asignatura">
                    <Select id="asignatura" value={asignatura} onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'asignatura', value: e.target.value})} disabled={!nivel}>
                        <option value="">Selecciona una asignatura...</option>
                        {availableAsignaturas.map(a => <option key={a} value={a}>{a}</option>)}
                    </Select>
                </FormField>

                <div>
                    <FormField label="Número de Preguntas" htmlFor="numeroPreguntas">
                        <Input id="numeroPreguntas" type="number" min="1" value={numeroPreguntas} onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'numeroPreguntas', value: Number(e.target.value)})}/>
                    </FormField>
                    <p className="text-sm text-gray-500 mt-1">Define cuántas preguntas tendrá la evaluación.</p>
                </div>

                <div>
                    <FormField label="Porcentaje de Exigencia (%)" htmlFor="porcentajeExigencia">
                        <Input 
                            id="porcentajeExigencia" 
                            type="number" 
                            min="1" 
                            max="99" 
                            value={porcentajeExigencia} 
                            onChange={e => dispatch({type: 'UPDATE_FIELD', field: 'porcentajeExigencia', value: Math.max(1, Math.min(99, Number(e.target.value)))})}
                        />
                    </FormField>
                    <p className="text-sm text-gray-500 mt-1">Porcentaje de puntaje para obtener la nota mínima de aprobación (4.0). Usualmente 60%.</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-base font-semibold leading-7 text-gray-900">
                    Asistente de Configuración con IA (Opcional)
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                    Sube la prueba y/o la tabla de especificaciones para que la IA complete la configuración automáticamente.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FileUploadComponent
                        label="Prueba"
                        file={files.testFile}
                        fileName={state.testFileName}
                        onFileChange={(file) => onFilesChange({ testFile: file })}
                        onClear={() => onFilesChange({ testFile: null })}
                        accept=".pdf,image/*,.txt"
                    />
                    <FileUploadComponent
                        label="Tabla de Especificaciones"
                        file={files.specFile}
                        fileName={state.specFileName}
                        onFileChange={(file) => onFilesChange({ specFile: file })}
                        onClear={() => onFilesChange({ specFile: null })}
                        accept=".xlsx,.xls,.csv,.pdf"
                    />
                </div>

                { (files.testFile || files.specFile) && (
                    <div className="mt-6">
                        <Button type="button" onClick={onAnalyze} disabled={isAnalyzing}>
                            {isAnalyzing ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <SparklesIcon className="w-5 h-5 mr-2" />}
                            {isAnalyzing ? 'Analizando Archivos...' : 'Analizar y Llenar Formulario'}
                        </Button>
                    </div>
                )}

                {analysisError && (
                    <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm whitespace-pre-wrap">
                        <p className="font-bold">Error de análisis:</p>
                        <p>{analysisError}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
