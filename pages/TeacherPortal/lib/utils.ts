
import type { ConfiguracionEvaluacion, ResultadoEstudiante, AnalysisData, AnalysisItem, AnalysisMetrics, QuestionAnalysisItem, ItemAnalysis, TipoPregunta } from '../../../types';
import { OBJETIVOS_APRENDIZAJE, HABILIDADES, UNIDADES, EJES_TEMATICOS } from '../../../lib/data';
import { ACHIEVEMENT_LEVELS } from '../components/common';
import { TipoPregunta as TipoPreguntaEnum } from '../../../types';


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

export const getAchievementLevel = (percentage: number) => {
  if (percentage >= ACHIEVEMENT_LEVELS.DESTACADO.min) return ACHIEVEMENT_LEVELS.DESTACADO;
  if (percentage >= ACHIEVEMENT_LEVELS.ADECUADO.min) return ACHIEVEMENT_LEVELS.ADECUADO;
  if (percentage >= ACHIEVEMENT_LEVELS.ELEMENTAL.min) return ACHIEVEMENT_LEVELS.ELEMENTAL;
  return ACHIEVEMENT_LEVELS.INSUFICIENTE;
};


export const calculateGrade = (puntajeObtenido: number, puntajeTotal: number, exigenciaPercentage: number): { calificacion: string, estado: 'Aprobado' | 'Reprobado' } => {
    const exigencia = (exigenciaPercentage || 60) / 100.0;
    const scorePercentage = puntajeTotal > 0 ? puntajeObtenido / puntajeTotal : 0;
    let rawGrade: number;

    if (exigencia >= 1.0) { // Handle 100% exigencia as a special case
        rawGrade = 1.0 + 6.0 * scorePercentage; // Standard linear scale from 1 to 7
    } else if (scorePercentage >= exigencia) {
        rawGrade = 4.0 + 3.0 * (scorePercentage - exigencia) / (1.0 - exigencia);
    } else {
        rawGrade = 1.0 + 3.0 * scorePercentage / exigencia;
    }
    
    rawGrade = Math.max(1.0, Math.min(7.0, rawGrade));
    const calificacion = isNaN(rawGrade) ? '1.0' : rawGrade.toFixed(1);
    const estado = parseFloat(calificacion) >= 4.0 ? 'Aprobado' : 'Reprobado';

    return { calificacion, estado };
};

export const svgToImageBase64 = (svgElement: SVGElement): Promise<string> => {
    return new Promise((resolve) => {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const DesiredWidth = 600;
            canvas.width = DesiredWidth;
            canvas.height = (img.height * DesiredWidth) / img.width;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/png', 1.0);
            URL.revokeObjectURL(url);
            resolve(dataURL);
        };
        img.onerror = () => {
             URL.revokeObjectURL(url);
             resolve(''); // Resolve with empty string on error
        }
        img.src = url;
    });
};


export const calculateAnalysisData = (
  results: ResultadoEstudiante[],
  config: ConfiguracionEvaluacion,
  questionTypeMap: Map<number, TipoPregunta>
): AnalysisData => {
  const presentStudents = results.filter(r => r.estado !== 'Ausente');
  if (presentStudents.length === 0) {
    return { porUnidad: [], porEje: [], porOA: [], porHabilidad: [], porOAyHabilidad: {}, porPregunta: [], itemAnalysis: [] };
  }
  
  const createInitialMetrics = (totalPreguntas: number = 0): AnalysisMetrics => ({ correctas: 0, incorrectas: 0, omitidas: 0, totalPreguntas, porcentajeLogro: 0, });
  
  const calculatePorcentaje = (metrics: AnalysisMetrics): number => {
    const totalPreguntasDenominador = metrics.correctas + metrics.incorrectas + metrics.omitidas;
    if (totalPreguntasDenominador === 0) return 0;
    return (metrics.correctas / totalPreguntasDenominador) * 100;
  };

  const claveMap = new Map(config.claves.map(c => [c.numero, c]));
  const questionAssignments = config.preguntaAsignaciones;

  const isAnswerCorrect = (qNum: number, studentAnswer: string): boolean => {
    if (studentAnswer === '' || studentAnswer.toUpperCase() === 'O') return false;
    const questionType = questionTypeMap.get(qNum);
    if (questionType === TipoPreguntaEnum.RESPUESTA_ABIERTA) {
        return studentAnswer === '1';
    }
    const claveInfo = claveMap.get(qNum);
    if (!claveInfo || !claveInfo.clave) return false;
    return studentAnswer.toUpperCase() === claveInfo.clave.toUpperCase();
  };
  
  const porOAyHabilidad: { [key: string]: AnalysisMetrics } = {};
  const oaHabilidadQuestionMap: { [key: string]: number[] } = {};
  Object.entries(questionAssignments).forEach(([qNum, assignment]) => { const key = `${assignment.oaId}-${assignment.habilidadId}`; if (!oaHabilidadQuestionMap[key]) { oaHabilidadQuestionMap[key] = []; } oaHabilidadQuestionMap[key].push(Number(qNum)); });
  
  for (const key in oaHabilidadQuestionMap) { 
    const questions = oaHabilidadQuestionMap[key]; 
    const metrics = createInitialMetrics(questions.length * presentStudents.length); 
    presentStudents.forEach(student => { 
        questions.forEach(qNum => { 
            const studentAnswer = student.respuestas[String(qNum)] || ''; 
            if (studentAnswer === '' || studentAnswer.toUpperCase() === 'O') { metrics.omitidas++; } 
            else if (isAnswerCorrect(qNum, studentAnswer)) { metrics.correctas++; } 
            else { metrics.incorrectas++; } 
        }); 
    }); 
    metrics.porcentajeLogro = calculatePorcentaje(metrics); 
    porOAyHabilidad[key] = metrics; 
  }
  
  const processCategory = ( items: ({ id: string, nombre: string } & Partial<any>)[], getQuestionsForItem: (itemId: string) => number[] ): AnalysisItem[] => { 
    return items.map(item => { 
        const questions = getQuestionsForItem(item.id); 
        const totalPreguntas = questions.length; 
        const analysisItem: AnalysisItem = { id: item.id, nombre: item.nombre, unidadId: item.unidadId, ejeId: item.ejeId, metricasGenerales: createInitialMetrics(totalPreguntas * presentStudents.length), metricasPorEstudiante: {} }; 
        if (totalPreguntas === 0) return analysisItem; 
        presentStudents.forEach(student => { 
            const studentMetrics = createInitialMetrics(totalPreguntas); 
            analysisItem.metricasPorEstudiante[student.idEstudiante] = studentMetrics; 
            questions.forEach(qNum => { 
                const studentAnswer = student.respuestas[String(qNum)] || ''; 
                if (studentAnswer === '' || studentAnswer.toUpperCase() === 'O') { studentMetrics.omitidas++; analysisItem.metricasGenerales.omitidas++; } 
                else if (isAnswerCorrect(qNum, studentAnswer)) { studentMetrics.correctas++; analysisItem.metricasGenerales.correctas++; }
                else { studentMetrics.incorrectas++; analysisItem.metricasGenerales.incorrectas++; } 
            }); 
            studentMetrics.porcentajeLogro = calculatePorcentaje(studentMetrics); 
        }); 
        analysisItem.metricasGenerales.porcentajeLogro = calculatePorcentaje(analysisItem.metricasGenerales); 
        return analysisItem; 
    }).filter(item => (item.metricasGenerales.correctas + item.metricasGenerales.incorrectas + item.metricasGenerales.omitidas) > 0); 
  };
  
  const getQuestionsForUnidad = (unidadId: string): number[] => { const oasInUnit = OBJETIVOS_APRENDIZAJE.filter(oa => oa.unidadId === unidadId).map(oa => oa.id); return Object.entries(questionAssignments).filter(([, assignment]) => oasInUnit.includes(assignment.oaId)).map(([qNum]) => Number(qNum)); };
  const getQuestionsForEje = (ejeId: string): number[] => { const oasInEje = OBJETIVOS_APRENDIZAJE.filter(oa => oa.ejeId === ejeId).map(oa => oa.id); return Object.entries(questionAssignments).filter(([, assignment]) => oasInEje.includes(assignment.oaId)).map(([qNum]) => Number(qNum)); };
  const getQuestionsForOA = (oaId: string): number[] => { return Object.entries(questionAssignments).filter(([, assignment]) => assignment.oaId === oaId).map(([qNum]) => Number(qNum)); };
  const getQuestionsForHabilidad = (habilidadId: string): number[] => { return Object.entries(questionAssignments).filter(([, assignment]) => assignment.habilidadId === habilidadId).map(([qNum]) => Number(qNum)); };
  
    const porPregunta: QuestionAnalysisItem[] = [];
    for (let qNum = 1; qNum <= config.numeroPreguntas; qNum++) {
        const claveInfo = claveMap.get(qNum);
        const assignment = questionAssignments[qNum];
        if (!claveInfo || !assignment) continue;

        const questionType = questionTypeMap.get(qNum);
        const isRespuestaAbierta = questionType === TipoPreguntaEnum.RESPUESTA_ABIERTA;
        
        const respuestasContadas: { [answer: string]: number } = {};
        let correctasCount = 0;

        if (!isRespuestaAbierta) {
            let options: string[] = [];
            if (questionType === TipoPreguntaEnum.SELECCION_MULTIPLE_3) options = ['A', 'B', 'C'];
            else if (questionType === TipoPreguntaEnum.SELECCION_MULTIPLE_4) options = ['A', 'B', 'C', 'D'];
            else if (questionType === TipoPreguntaEnum.SELECCION_MULTIPLE_5) options = ['A', 'B', 'C', 'D', 'E'];
            else if (questionType === TipoPreguntaEnum.VERDADERO_FALSO) options = ['V', 'F'];
            options.forEach(opt => { respuestasContadas[opt] = 0; });
        }
        
        presentStudents.forEach(student => {
            const studentAnswerRaw = student.respuestas[String(qNum)] || '';

            if (isAnswerCorrect(qNum, studentAnswerRaw)) {
                correctasCount++;
            }

            let answerForDistractorAnalysis = studentAnswerRaw.toUpperCase();
            
            if (isRespuestaAbierta) {
                if (studentAnswerRaw === '' || studentAnswerRaw.toUpperCase() === 'O') answerForDistractorAnalysis = 'Omitida';
                else answerForDistractorAnalysis = isAnswerCorrect(qNum, studentAnswerRaw) ? 'Correcta' : 'Incorrecta';
            } else {
                if (studentAnswerRaw === '' || studentAnswerRaw.toUpperCase() === 'O') answerForDistractorAnalysis = 'Omitida';
            }
            
            respuestasContadas[answerForDistractorAnalysis] = (respuestasContadas[answerForDistractorAnalysis] || 0) + 1;
        });
        
        const countedResponded = Object.values(respuestasContadas).reduce((a, b) => a + b, 0);
        const omittedCount = presentStudents.length - countedResponded;
        if(omittedCount > 0){
             respuestasContadas['Omitida'] = (respuestasContadas['Omitida'] || 0) + omittedCount;
        }

        const porcentajeLogro = presentStudents.length > 0 ? (correctasCount / presentStudents.length) * 100 : 0;

        porPregunta.push({
            numeroPregunta: qNum,
            clave: claveInfo.clave,
            porcentajeLogro,
            respuestasContadas,
            totalEstudiantes: presentStudents.length,
            oaId: assignment.oaId,
            habilidadId: assignment.habilidadId,
        });
    }

  porPregunta.sort((a, b) => a.numeroPregunta - b.numeroPregunta);
  const itemAnalysis: ItemAnalysis[] = []; if (presentStudents.length > 1) { const sortedByScore = [...presentStudents].sort((a,b) => b.puntajeObtenido - a.puntajeObtenido); const n = presentStudents.length; const cutoff = n > 5 ? Math.floor(n * 0.27) : Math.floor(n * 0.5); const highGroup = sortedByScore.slice(0, cutoff); const lowGroup = sortedByScore.slice(n - cutoff); if (highGroup.length > 0 && lowGroup.length > 0) { for (let qNum = 1; qNum <= config.numeroPreguntas; qNum++) { const claveInfo = claveMap.get(qNum); if (!claveInfo?.clave) continue; const clave = claveInfo.clave.toUpperCase(); const correctInHigh = highGroup.filter(r => isAnswerCorrect(qNum, (r.respuestas[qNum] || ''))).length; const correctInLow = lowGroup.filter(r => isAnswerCorrect(qNum, (r.respuestas[qNum] || ''))).length; const pHigh = correctInHigh / highGroup.length; const pLow = correctInLow / lowGroup.length; const discriminationIndex = pHigh - pLow; const pValueItem = porPregunta.find(p => p.numeroPregunta === qNum); const pValue = pValueItem ? pValueItem.porcentajeLogro / 100 : 0; itemAnalysis.push({ numeroPregunta: qNum, pValue, discriminationIndex, }); } } }
  const uniqueOaIds = [...new Set(Object.values(questionAssignments).map(a => a.oaId))];
  const uniqueHabilidadIds = [...new Set(Object.values(questionAssignments).map(a => a.habilidadId))];
  const uniqueOas = OBJETIVOS_APRENDIZAJE.filter(oa => uniqueOaIds.includes(oa.id));
  const uniqueUnidadIds = [...new Set(uniqueOas.map(oa => oa.unidadId))];
  const uniqueEjeIds = [...new Set(uniqueOas.map(oa => oa.ejeId))];
  const relevantUnits = UNIDADES.filter(u => uniqueUnidadIds.includes(u.id));
  const relevantEjes = EJES_TEMATICOS.filter(e => uniqueEjeIds.includes(e.id));
  const getUnitName = (unidadId: string) => { const unit = UNIDADES.find(u => u.id === unidadId); return unit ? unit.nombre.replace('Unidad ', 'U') : 'Unidad Desc.'; };
  const getOACodeNumber = (code: string) => { const match = code.match(/(\d+)/); return match ? parseInt(match[1], 10) : 999; };
  const relevantOas = uniqueOas.map(oa => ({ id: oa.id, nombre: `${oa.codigo} (${getUnitName(oa.unidadId)}): ${oa.descripcion}`, unidadId: oa.unidadId, ejeId: oa.ejeId, codigo: oa.codigo }));
  relevantOas.sort((a, b) => { const unitA = UNIDADES.find(u => u.id === a.unidadId)?.nombre || ''; const unitB = UNIDADES.find(u => u.id === b.unidadId)?.nombre || ''; if (unitA.localeCompare(unitB) !== 0) return unitA.localeCompare(unitB); const ejeA = EJES_TEMATICOS.find(e => e.id === a.ejeId)?.nombre || ''; const ejeB = EJES_TEMATICOS.find(e => e.id === b.ejeId)?.nombre || ''; if (ejeA.localeCompare(ejeB) !== 0) return ejeA.localeCompare(ejeB); return getOACodeNumber(a.codigo) - getOACodeNumber(b.codigo); });
  const relevantHabilidades = HABILIDADES.filter(h => uniqueHabilidadIds.includes(h.id));
  return { porUnidad: processCategory(relevantUnits, getQuestionsForUnidad), porEje: processCategory(relevantEjes, getQuestionsForEje), porOA: processCategory(relevantOas, getQuestionsForOA), porHabilidad: processCategory(relevantHabilidades, getQuestionsForHabilidad), porOAyHabilidad, porPregunta, itemAnalysis };
};