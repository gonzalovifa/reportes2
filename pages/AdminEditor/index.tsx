import React, { useReducer, useMemo, useEffect, useState, useRef } from 'react';
import { Button, Tooltip, Modal } from '../../components/UI';
import { XMarkIcon, CheckCircleIcon, LockClosedIcon } from '../../components/Icons';
import type { ConfiguracionEvaluacion } from '../../types';
import { TipoPregunta } from '../../types';
import { configReducer, parseRange } from './adminEditor.logic';
import { GeneralDataSection } from './components/GeneralDataSection';
import { ObjectivesSection } from './components/ObjectivesSection';
import { HabilitiesSection } from './components/HabilitiesSection';
import { SpecMatrixSection } from './components/SpecMatrixSection';
import { KeysSection } from './components/KeysSection';
import { PrerequisiteMessage } from './components/PrerequisiteMessage';
import { NavigationSidebar } from './components/NavigationSidebar';
import { GoogleGenAI, Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { ASIGNATURAS, HABILIDADES, NIVELES_EDUCATIVOS, OBJETIVOS_APRENDIZAJE } from '../../lib/data';

interface AdminEditorProps {
    initialState: ConfiguracionEvaluacion;
    onUpdate: (config: ConfiguracionEvaluacion) => void;
    onClose: () => void;
    onCancel: () => void;
    allConfigurations: ConfiguracionEvaluacion[];
}

const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

export const AdminEditor: React.FC<AdminEditorProps> = ({ initialState, onUpdate, onClose, onCancel, allConfigurations }) => {
  const [state, dispatch] = useReducer(configReducer, initialState);
  const [activeSection, setActiveSection] = useState('datos');
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceTimeoutRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  const [testFile, setTestFile] = useState<File | null>(null);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'oa' | 'habilidad';
    id: string;
    count: number;
  } | null>(null);


  const nameValidationError = useMemo(() => {
    if (!state.nombre || !state.nivel || !state.asignatura) {
        return null;
    }
    const duplicate = allConfigurations.find(config =>
        config.id !== state.id &&
        config.nombre.trim().toLowerCase() === state.nombre.trim().toLowerCase() &&
        config.nivel === state.nivel &&
        config.asignatura === state.asignatura
    );
    return duplicate ? 'Ya existe una evaluación con el mismo nombre, nivel y asignatura.' : null;
  }, [state.nombre, state.nivel, state.asignatura, state.id, allConfigurations]);

  const handleFilesChange = async ({ testFile: newTestFile, specFile: newSpecFile }: { testFile?: File | null, specFile?: File | null }) => {
      if (newTestFile !== undefined) {
        setTestFile(newTestFile);
        if (newTestFile) {
            const base64 = await fileToDataURL(newTestFile);
            dispatch({ type: 'UPDATE_FIELD', field: 'testFileContent', value: base64 });
            dispatch({ type: 'UPDATE_FIELD', field: 'testFileName', value: newTestFile.name });
        } else {
            dispatch({ type: 'UPDATE_FIELD', field: 'testFileContent', value: null });
            dispatch({ type: 'UPDATE_FIELD', field: 'testFileName', value: null });
        }
      }
      if (newSpecFile !== undefined) {
        setSpecFile(newSpecFile);
        if (newSpecFile) {
            const base64 = await fileToDataURL(newSpecFile);
            dispatch({ type: 'UPDATE_FIELD', field: 'specFileContent', value: base64 });
            dispatch({ type: 'UPDATE_FIELD', field: 'specFileName', value: newSpecFile.name });
        } else {
            dispatch({ type: 'UPDATE_FIELD', field: 'specFileContent', value: null });
            dispatch({ type: 'UPDATE_FIELD', field: 'specFileName', value: null });
        }
      }
  };

  const handleAnalyzeFiles = async () => {
    if (!testFile && !specFile) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

        const fileToPart = async (file: File) => {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });
            return {
                inlineData: {
                    mimeType: file.type,
                    data: base64,
                },
            };
        };

        const parts: any[] = [];
        let specFileContentText = "";

        if (specFile) {
            const specFileType = specFile.type;
            const isExcel = specFileType.includes('sheet') || specFileType.includes('csv');
            if (isExcel) {
                const data = await specFile.arrayBuffer();
                const workbook = XLSX.read(data);
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                specFileContentText = JSON.stringify(json, null, 2);
            } else if (specFile.type === 'application/pdf' || specFile.type.startsWith('image/')) {
                parts.push(await fileToPart(specFile));
            }
        }
        
        if (testFile) {
            parts.push(await fileToPart(testFile));
        }

        const allSubjectsList = [...new Set(Object.values(ASIGNATURAS).flat())];

        const basePrompt = `
Eres un asistente pedagógico de élite. Tu misión es analizar los archivos de una evaluación (prueba y/o tabla de especificaciones) y rellenar un formulario JSON con precisión quirúrgica.

**REGLAS FUNDAMENTALES:**
1.  **RESPUESTA JSON ÚNICA:** Tu única salida debe ser un objeto JSON válido que cumpla el schema. Sin texto adicional.
2.  **LA TABLA DE ESPECIFICACIONES MANDA:** Si se provee una tabla de especificaciones (en cualquier formato), su contenido es la **VERDAD ABSOLUTA**. DEBES ignorar cualquier información contradictoria del archivo de la prueba para OAs, Habilidades y su asignación a preguntas.

**JERARQUÍA DE TAREAS (TU PRIORIDAD MÁXIMA):**
**PRIORIDAD #1: Mapeo Perfecto de OAs y Habilidades.** Tu tarea más importante es asociar cada pregunta con el \`oaId\` y \`habilidadId\` correctos, basándote en la Tabla de Especificaciones. La precisión aquí es más crítica que cualquier otra tarea.
  - **Cómo mapear OAs:** Busca el código del OA en la tabla (ej. "OA1", "OA 11"). Encuentra el objeto correspondiente en los \`OBJETIVOS_APRENDIZAJE\` que te proporciono, y usa su campo \`id\` (ej. 'oa-u1-1'). **NUNCA INVENTES UN ID.**
  - **Cómo mapear Habilidades:** Busca el nombre de la habilidad en la tabla (ej. "Analizar"). Encuentra el objeto correspondiente en \`HABILIDADES\` y usa su \`id\` (ej. 'hab-7'). **La coincidencia debe ser lo más exacta posible.**
    - **REGLA DE ORO PARA HABILIDADES:** Si la habilidad mencionada en la tabla es "Conocimiento", DEBES mapearla a la habilidad cuyo nombre es "Conocer" (id: 'hab-1'). Esta regla es para evitar la ambigüedad con "Comprender". Para todas las demás, busca la correspondencia directa.

**PRIORIDAD #2: Datos Generales.** Extrae \`nombre\`, \`nivel\`, \`asignatura\`, y \`numeroPreguntas\`.

**PRIORIDAD #3 (Tarea Secundaria): Claves y Puntajes.**
  - **A. \`bloquesPreguntas\`:** Agrupa las preguntas por tipo y puntaje. El campo 'tipo' DEBE ser uno de los valores EXACTOS del enum proporcionado. Si una pregunta no tiene alternativas claras, es '${TipoPregunta.RESPUESTA_ABIERTA}'.
  - **B. \`claves\`:** Después de asegurar el mapeo de OAs/Habilidades, si el tiempo lo permite, intenta resolver cada pregunta para encontrar su clave. **Es preferible una clave bien analizada a una inventada**. El puntaje de la clave DEBE coincidir con el del bloque al que pertenece.

**DATOS CURRICULARES DISPONIBLES (USA ESTOS IDs, SON OBLIGATORIOS):**
- **OBJETIVOS DE APRENDIZAJE:** ${JSON.stringify(OBJETIVOS_APRENDIZAJE, null, 2)}
- **HABILIDADES:** ${JSON.stringify(HABILIDADES, null, 2)}
- **NIVELES EDUCATIVOS:** ${JSON.stringify(NIVELES_EDUCATIVOS, null, 2)}
- **ASIGNATURAS DISPONIBLES:** ${JSON.stringify(allSubjectsList, null, 2)}

Si un dato no se puede inferir, omítelo de tu respuesta JSON final, a menos que el schema lo marque como requerido.
${specFileContentText ? `\n\nCONTENIDO DE LA TABLA DE ESPECIFICACIONES (en formato JSON):\n${specFileContentText}`: ''}
`;
          parts.unshift({ text: basePrompt });
          
          const schema = {
              type: Type.OBJECT,
              properties: {
                  nombre: { type: Type.STRING },
                  nivel: { type: Type.STRING },
                  asignatura: { type: Type.STRING },
                  numeroPreguntas: { type: Type.INTEGER },
                  objetivosSeleccionados: { type: Type.ARRAY, items: { type: Type.STRING } },
                  habilidadesSeleccionadas: { type: Type.ARRAY, items: { type: Type.STRING } },
                  preguntaAsignaciones: {
                      type: Type.ARRAY,
                      description: "Mapeo de cada pregunta a su OA y Habilidad. ESTA ES LA TAREA MÁS IMPORTANTE.",
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              preguntaNro: { type: Type.INTEGER },
                              oaId: { type: Type.STRING, description: "El ID exacto del OA desde la lista provista." },
                              habilidadId: { type: Type.STRING, description: "El ID exacto de la Habilidad desde la lista provista." }
                          },
                          required: ["preguntaNro", "oaId", "habilidadId"]
                      }
                  },
                  bloquesPreguntas: {
                      type: Type.ARRAY,
                      description: "Bloques de preguntas agrupados por tipo y puntaje.",
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              id: { type: Type.STRING, description: "Un ID único para el bloque, puede ser un timestamp en string." },
                              tipo: { type: Type.STRING, description: `El tipo de pregunta. DEBE ser uno de los siguientes valores exactos: ${Object.values(TipoPregunta).join(', ')}.` },
                              preguntas: { type: Type.STRING, description: "Rango de preguntas, ej: '1-5, 8'." },
                              puntaje: { type: Type.NUMBER, description: "El puntaje para cada pregunta en este bloque." }
                          },
                          required: ["id", "tipo", "preguntas", "puntaje"]
                      }
                  },
                  claves: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              numero: { type: Type.INTEGER },
                              clave: { type: Type.STRING },
                              puntaje: { type: Type.NUMBER },
                          },
                           required: ["numero", "clave", "puntaje"]
                      },
                  },
              },
          };
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: { parts },
              config: {
                  responseMimeType: "application/json",
                  responseSchema: schema,
              },
          });
          
          const analyzedData = JSON.parse(response.text);
          dispatch({ type: 'MERGE_ANALYZED_DATA', payload: analyzedData });
          alert("¡Formulario completado! Por favor, revise los datos generados por la IA.");
      } catch (e) {
          console.error(e);
          let errorMessage = "Hubo un error al analizar los archivos. Verifique que el contenido sea claro y vuelva a intentarlo.";
          if (e instanceof Error) {
            errorMessage += `\nDetalle: ${e.message}`;
          }
          setAnalysisError(errorMessage);
      } finally {
          setIsAnalyzing(false);
      }
  };
  
    const handleToggleItem = (field: 'objetivosSeleccionados' | 'habilidadesSeleccionadas', id: string) => {
        const isCurrentlySelected = state[field].includes(id);

        if (!isCurrentlySelected) {
            dispatch({ type: 'TOGGLE_ID', field, id });
            return;
        }

        const assignments = Object.values(state.preguntaAsignaciones);
        let dependentQuestionsCount = 0;
        
        if (field === 'objetivosSeleccionados') {
            dependentQuestionsCount = assignments.filter(a => a.oaId === id).length;
        } else {
            dependentQuestionsCount = assignments.filter(a => a.habilidadId === id).length;
        }

        if (dependentQuestionsCount > 0) {
            setConfirmationModal({
                isOpen: true,
                type: field === 'objetivosSeleccionados' ? 'oa' : 'habilidad',
                id: id,
                count: dependentQuestionsCount
            });
        } else {
            dispatch({ type: 'TOGGLE_ID', field, id });
        }
    };

    const handleConfirmDeselection = () => {
        if (!confirmationModal) return;

        dispatch({
            type: 'TOGGLE_ID',
            field: confirmationModal.type === 'oa' ? 'objetivosSeleccionados' : 'habilidadesSeleccionadas',
            id: confirmationModal.id
        });
        setConfirmationModal(null);
    };

    const handleCancelDeselection = () => {
        setConfirmationModal(null);
    };

  // --- Completion Logic ---
  const isGeneralDataComplete = useMemo(() => !!(state.nombre && state.nivel && state.asignatura && state.numeroPreguntas > 0 && !nameValidationError), [state, nameValidationError]);
  const areObjectivesComplete = useMemo(() => isGeneralDataComplete && state.objetivosSeleccionados.length > 0, [isGeneralDataComplete, state.objetivosSeleccionados]);
  const areHabilitiesComplete = useMemo(() => areObjectivesComplete && state.habilidadesSeleccionadas.length > 0, [areObjectivesComplete, state.habilidadesSeleccionadas]);
  const isMatrixComplete = useMemo(() => {
    if (!areHabilitiesComplete) return false;
    const assignedCount = Object.keys(state.preguntaAsignaciones).length;
    return assignedCount > 0 && assignedCount === state.numeroPreguntas;
  }, [areHabilitiesComplete, state.preguntaAsignaciones, state.numeroPreguntas]);

  const areKeysComplete = useMemo(() => {
    if (!isMatrixComplete) return false;
    const questionTypes: { [key: number]: any } = {};
    state.bloquesPreguntas.forEach(block => {
        parseRange(block.preguntas).forEach((num: number) => {
            questionTypes[num] = block.tipo;
        });
    });

    return state.claves.every(clave => {
        const type = questionTypes[clave.numero];
        if (type && type !== TipoPregunta.RESPUESTA_ABIERTA) {
            return !!clave.clave;
        }
        return true;
    });
  }, [isMatrixComplete, state.bloquesPreguntas, state.claves]);

  const isAllComplete = areKeysComplete;

  // Auto-save logic
  useEffect(() => {
      if (isInitialMount.current) {
          isInitialMount.current = false;
          return;
      }
      
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      
      if (nameValidationError) {
          setSavingStatus('error');
          return;
      }

      setSavingStatus('saving');
      debounceTimeoutRef.current = window.setTimeout(() => {
          const finalState: ConfiguracionEvaluacion = {...state, estado: isAllComplete ? 'Completa' : 'Borrador' };
          onUpdate(finalState);
          setSavingStatus('saved');
          setTimeout(() => setSavingStatus('idle'), 2000);
      }, 1000);

      return () => {
          if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      }
  }, [state, onUpdate, isAllComplete, nameValidationError]);

  const renderSavingStatus = () => {
    switch (savingStatus) {
        case 'saving': return <span className="text-sm text-gray-500 italic w-44 text-right">Guardando...</span>;
        case 'saved': return <span className="text-sm text-green-600 font-medium w-44 text-right">Todos los cambios guardados</span>;
        case 'error': return <span className="text-sm text-red-600 font-medium w-44 text-right">Error: Datos inválidos</span>;
        default: return <div className="w-44" />;
    }
  };

  const sections = [
    { id: 'datos', label: 'Datos Generales', isComplete: isGeneralDataComplete, isLocked: false, prerequisite: '' },
    { id: 'objetivos', label: 'Objetivos de Aprendizaje', isComplete: areObjectivesComplete, isLocked: !isGeneralDataComplete, prerequisite: 'Completar Datos Generales' },
    { id: 'habilidades', label: 'Habilidades Cognitivas', isComplete: areHabilitiesComplete, isLocked: !areObjectivesComplete, prerequisite: 'Seleccionar Objetivos' },
    { id: 'matriz', label: 'Matriz de Especificaciones', isComplete: isMatrixComplete, isLocked: !areHabilitiesComplete, prerequisite: 'Seleccionar Habilidades' },
    { id: 'claves', label: 'Claves y Puntajes', isComplete: areKeysComplete, isLocked: !isMatrixComplete, prerequisite: 'Completar Matriz' },
  ];

  const renderSectionContent = () => {
    switch(activeSection) {
        case 'datos': return <GeneralDataSection 
            state={state} 
            dispatch={dispatch} 
            nameValidationError={nameValidationError}
            files={{ testFile, specFile }}
            onFilesChange={handleFilesChange}
            onAnalyze={handleAnalyzeFiles}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError} 
        />;
        case 'objetivos': return !isGeneralDataComplete ? <PrerequisiteMessage message="Por favor, complete todos los campos en 'Datos Generales' para continuar." /> : <ObjectivesSection state={state} dispatch={dispatch} onToggleItem={handleToggleItem} />;
        case 'habilidades': return !areObjectivesComplete ? <PrerequisiteMessage message="Por favor, seleccione al menos un Objetivo de Aprendizaje para continuar." /> : <HabilitiesSection state={state} dispatch={dispatch} onToggleItem={handleToggleItem} />;
        case 'matriz': return !areHabilitiesComplete ? <PrerequisiteMessage message="Por favor, seleccione al menos una Habilidad Cognitiva para continuar." /> : <SpecMatrixSection state={state} dispatch={dispatch} />;
        case 'claves': return !isMatrixComplete ? <PrerequisiteMessage message="Por favor, asigne todas las preguntas en la Matriz de Especificaciones para continuar." /> : <KeysSection state={state} dispatch={dispatch} isMatrixComplete={isMatrixComplete} />;
        default: return <GeneralDataSection state={state} dispatch={dispatch} nameValidationError={nameValidationError} files={{ testFile, specFile }} onFilesChange={handleFilesChange} onAnalyze={handleAnalyzeFiles} isAnalyzing={isAnalyzing} analysisError={analysisError} />;
    }
  }
  
  return (
    <div className="fixed inset-0 bg-gray-100 z-40 flex flex-col font-sans">
      <header className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="h-16 flex justify-between items-center px-6">
            <div className="flex items-center gap-4">
                <button onClick={onCancel} className="text-gray-500 hover:text-gray-800">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">
                    {initialState.nombre ? 'Editar' : 'Crear'} Configuración de Evaluación
                </h1>
            </div>
            <div className="flex items-center gap-4">
                {renderSavingStatus()}
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Tooltip text={nameValidationError || ""}>
                  <div className="inline-block">
                    <Button variant="primary" onClick={onClose} disabled={!!nameValidationError}>Volver a la lista</Button>
                  </div>
                </Tooltip>
            </div>
          </div>
      </header>
      
      <div className="flex-grow flex p-4 md:p-6 lg:p-8 gap-6 overflow-hidden">
          <NavigationSidebar 
            sections={sections}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />

          <main className="flex-grow bg-white p-6 md:p-8 rounded-lg shadow-sm overflow-y-auto overflow-x-hidden min-w-0">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">{sections.find(s=>s.id === activeSection)?.label}</h2>
              {renderSectionContent()}
          </main>
      </div>

      {confirmationModal?.isOpen && (
          <Modal
              isOpen={true}
              onClose={handleCancelDeselection}
              title="Confirmar Desvinculación"
              footer={
                  <div className="flex justify-end space-x-3">
                      <Button variant="secondary" onClick={handleCancelDeselection}>Cancelar</Button>
                      <Button variant="danger" onClick={handleConfirmDeselection}>Confirmar y Desvincular</Button>
                  </div>
              }
          >
              <p>
                  Al deseleccionar este ítem, <strong>{confirmationModal.count} pregunta(s)</strong> se desvinculará(n) de la Matriz de Especificaciones.
              </p>
              <p className="mt-2">¿Está seguro de que desea continuar?</p>
          </Modal>
      )}
    </div>
  );
};