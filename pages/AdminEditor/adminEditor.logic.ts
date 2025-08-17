import { TipoPregunta } from '../../types';
import type { ConfiguracionEvaluacion, BloquePreguntas, PreguntaAsignada } from '../../types';
import { OBJETIVOS_APRENDIZAJE, UNIDADES, HABILIDADES } from '../../lib/data';


export type Action =
  | { type: 'UPDATE_FIELD'; field: keyof ConfiguracionEvaluacion; value: any }
  | { type: 'TOGGLE_ID'; field: 'objetivosSeleccionados' | 'habilidadesSeleccionadas'; id: string }
  | { type: 'TOGGLE_ALL_OAS_FOR_UNIT'; unitId: string; checked: boolean }
  | { type: 'TOGGLE_ALL'; field: 'objetivosSeleccionados' | 'habilidadesSeleccionadas'; checked: boolean }
  | { type: 'ASSIGN_QUESTION'; question: number; oaId: string; habilidadId: string }
  | { type: 'UNASSIGN_QUESTION'; question: number }
  | { type: 'UPDATE_BLOCK'; block: BloquePreguntas }
  | { type: 'ADD_BLOCK' }
  | { type: 'DELETE_BLOCK'; id: string }
  | { type: 'UPDATE_KEY'; question: number; key: string; score?: number }
  | { type: 'UPDATE_STATUS'; status: 'Borrador' | 'Completa' }
  | { type: 'MERGE_ANALYZED_DATA'; payload: Partial<ConfiguracionEvaluacion> };

export const parseRange = (rangeStr: string): number[] => {
    const numbers: number[] = [];
    if (!rangeStr) return numbers;
    const parts = rangeStr.split(',').map(p => p.trim());
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = start; i <= end; i++) {
                    numbers.push(i);
                }
            }
        } else {
            const num = Number(part);
            if (!isNaN(num)) numbers.push(num);
        }
    }
    return [...new Set(numbers)];
};

export const formatAndCompactRanges = (input: string): string => {
    const numbers = parseRange(input); 
    if (numbers.length === 0) return '';
    
    numbers.sort((a, b) => a - b);
    
    const ranges: (string|number)[] = [];
    let start = numbers[0];
    let end = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === end + 1) {
            end = numbers[i];
        } else {
            if (start === end) {
                ranges.push(start);
            } else {
                ranges.push(`${start}-${end}`);
            }
            start = numbers[i];
            end = numbers[i];
        }
    }

    if (start === end) {
        ranges.push(start);
    } else {
        ranges.push(`${start}-${end}`);
    }

    return ranges.join(', ');
};

export const mergeBloques = (bloques: BloquePreguntas[]): BloquePreguntas[] => {
    if (!bloques || !Array.isArray(bloques)) return [];

    const mergedMap: Record<string, BloquePreguntas> = {};

    bloques.forEach(block => {
        if (!block || typeof block.tipo !== 'string' || typeof block.puntaje !== 'number' || typeof block.preguntas !== 'string') {
            return; // Skip invalid blocks from AI
        }

        const key = `${block.tipo}-${block.puntaje}`;
        const existingBlock = mergedMap[key];

        if (existingBlock) {
            const combinedRanges = `${existingBlock.preguntas},${block.preguntas}`;
            mergedMap[key] = {
                ...existingBlock,
                preguntas: formatAndCompactRanges(combinedRanges),
            };
        } else {
            mergedMap[key] = { ...block };
        }
    });

    return Object.values(mergedMap);
};

export const sanitizeRangeInput = (input: string): string => {
  // Allows only numbers, commas, and hyphens.
  return input.replace(/[^0-9,-]/g, '');
};

export const reorderAndFormatRanges = (input: string): string => {
    const parts = input
        .split(',')
        .map(part => {
            const trimmedPart = part.trim();
            if (!trimmedPart) return null;

            const rangeMatch = trimmedPart.match(/^(\d+)-(\d+)$/);
            if (rangeMatch) {
                const start = parseInt(rangeMatch[1], 10);
                const end = parseInt(rangeMatch[2], 10);
                // Reorder if start > end
                return start > end ? `${end}-${start}` : `${start}-${end}`;
            }

            const numMatch = trimmedPart.match(/^\d+$/);
            if (numMatch) {
                return trimmedPart;
            }

            // Invalid parts will be filtered out
            return null;
        })
        .filter(Boolean) // Filter out null values
        .join(', ');

    return parts;
};

export function configReducer(state: ConfiguracionEvaluacion, action: Action): ConfiguracionEvaluacion {
  switch (action.type) {
    case 'UPDATE_FIELD':
      if(action.field === 'nivel'){
        return {...state, nivel: action.value, asignatura: ''}
      }
       if(action.field === 'numeroPreguntas'){
        const newNum = Number(action.value);
        if (newNum < 0) return state;
        const newClaves = Array.from({ length: newNum }, (_, i) => state.claves[i] || { numero: i + 1, clave: '', puntaje: 1 });
        return {...state, numeroPreguntas: newNum, claves: newClaves}
      }
      return { ...state, [action.field]: action.value };
    case 'TOGGLE_ID': {
      const { field, id } = action;
      const currentIds = state[field];
      const isRemoving = currentIds.includes(id);

      const newIds = isRemoving
          ? currentIds.filter(i => i !== id)
          : [...currentIds, id];

      let newAssignments = state.preguntaAsignaciones;

      // If an item is removed, clean up its assignments from the matrix.
      if (isRemoving) {
          const newAssignmentsCopy = { ...state.preguntaAsignaciones };
          const assignmentKeyProperty = field === 'objetivosSeleccionados' ? 'oaId' : 'habilidadId';
          
          for (const qNum in newAssignmentsCopy) {
              if ((newAssignmentsCopy[qNum] as any)[assignmentKeyProperty] === id) {
                  delete newAssignmentsCopy[qNum as any];
              }
          }
          newAssignments = newAssignmentsCopy;
      }

      return { ...state, [field]: newIds, preguntaAsignaciones: newAssignments };
    }
     case 'TOGGLE_ALL_OAS_FOR_UNIT': {
        const oasForUnit = OBJETIVOS_APRENDIZAJE.filter(oa => oa.unidadId === action.unitId).map(oa => oa.id);
        let newOas = [...state.objetivosSeleccionados];
        if (action.checked) {
            oasForUnit.forEach(oaId => { if (!newOas.includes(oaId)) newOas.push(oaId); });
        } else {
            newOas = newOas.filter(oaId => !oasForUnit.includes(oaId));
        }
        return { ...state, objetivosSeleccionados: newOas };
    }
    case 'TOGGLE_ALL': {
        if(action.field === 'objetivosSeleccionados'){
            const allOaIds = OBJETIVOS_APRENDIZAJE.filter(oa => UNIDADES.some(u => u.id === oa.unidadId && u.asignatura === state.asignatura)).map(oa => oa.id);
            return {...state, objetivosSeleccionados: action.checked ? allOaIds : []};
        }
        if(action.field === 'habilidadesSeleccionadas'){
            const allHabIds = HABILIDADES.map(h => h.id);
            return {...state, habilidadesSeleccionadas: action.checked ? allHabIds : []};
        }
        return state;
    }
    case 'ASSIGN_QUESTION': {
        const newAssignments = { ...state.preguntaAsignaciones };
        newAssignments[action.question] = { oaId: action.oaId, habilidadId: action.habilidadId };
        return { ...state, preguntaAsignaciones: newAssignments };
    }
    case 'UNASSIGN_QUESTION': {
        const newAssignments = { ...state.preguntaAsignaciones };
        delete newAssignments[action.question];
        return { ...state, preguntaAsignaciones: newAssignments };
    }
    case 'ADD_BLOCK': {
        const newBlock: BloquePreguntas = { id: Date.now().toString(), tipo: TipoPregunta.SELECCION_MULTIPLE_4, preguntas: '', puntaje: 1 };
        return { ...state, bloquesPreguntas: [...state.bloquesPreguntas, newBlock] };
    }
    case 'UPDATE_BLOCK': {
        const newBlocks = state.bloquesPreguntas.map(b => b.id === action.block.id ? action.block : b);
        
        const questionNumbers = parseRange(action.block.preguntas);
        const puntaje = action.block.puntaje;

        const newClaves = state.claves.map(clave => {
            if (questionNumbers.includes(clave.numero)) {
                return { ...clave, puntaje: puntaje };
            }
            return clave;
        });
        
        return { ...state, bloquesPreguntas: newBlocks, claves: newClaves };
    }
    case 'DELETE_BLOCK': {
        return { ...state, bloquesPreguntas: state.bloquesPreguntas.filter(b => b.id !== action.id) };
    }
    case 'UPDATE_KEY': {
        const newClaves = state.claves.map(c =>
            c.numero === action.question
                ? { ...c, clave: action.key, puntaje: action.score !== undefined ? action.score : c.puntaje }
                : c
        );
        return { ...state, claves: newClaves };
    }
    case 'UPDATE_STATUS':
        return { ...state, estado: action.status };
    case 'MERGE_ANALYZED_DATA': {
        const { payload } = action;
        const newState: ConfiguracionEvaluacion = { ...state, ...payload };

        if (payload.bloquesPreguntas && Array.isArray(payload.bloquesPreguntas)) {
            newState.bloquesPreguntas = mergeBloques(payload.bloquesPreguntas);
        }

        if (payload.preguntaAsignaciones && Array.isArray(payload.preguntaAsignaciones)) {
            const assignmentsMap: { [preguntaNro: number]: PreguntaAsignada } = {};
            (payload.preguntaAsignaciones as any[]).forEach(item => {
                if (item.preguntaNro && item.oaId && item.habilidadId) {
                    assignmentsMap[item.preguntaNro] = { oaId: item.oaId, habilidadId: item.habilidadId };
                }
            });
            newState.preguntaAsignaciones = assignmentsMap;
        }

        const puntajesFromBlocks = new Map<number, number>();
        newState.bloquesPreguntas.forEach(block => {
            parseRange(block.preguntas).forEach(qNum => {
                puntajesFromBlocks.set(qNum, block.puntaje);
            });
        });

        const clavesFromAI = new Map<number, string>();
        if (payload.claves) {
            payload.claves.forEach(aiKey => {
                if (aiKey.numero && typeof aiKey.clave === 'string') {
                    clavesFromAI.set(aiKey.numero, aiKey.clave);
                }
            });
        }
        
        const newNumPreguntas = newState.numeroPreguntas;
        const finalClaves = Array.from({ length: newNumPreguntas }, (_, i) => {
            const questionNumber = i + 1;
            
            const claveValue = clavesFromAI.get(questionNumber) ?? (state.claves.find(c => c.numero === questionNumber)?.clave || '');
            
            const puntajeValue = puntajesFromBlocks.get(questionNumber) ?? (state.claves.find(c => c.numero === questionNumber)?.puntaje || 1);

            return {
                numero: questionNumber,
                clave: claveValue,
                puntaje: puntajeValue,
            };
        });

        newState.claves = finalClaves;
        
        return newState;
    }
    default:
      return state;
  }
}