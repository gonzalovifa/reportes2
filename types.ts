
export type NivelEducativo = '1° Básico' | '2° Básico' | '3° Básico' | '4° Básico' | '5° Básico' | '6° Básico';
export type Asignatura = 'Matemática' | 'Lenguaje y Comunicación' | 'Ciencias Naturales' | 'Historia, Geografía y Cs. Sociales';

export interface EjeTematico {
  id: string;
  nombre: string;
}

export interface Unidad {
  id:string;
  nombre: string;
  asignatura: Asignatura;
  nivel: NivelEducativo;
}

export interface ObjetivoAprendizaje {
  id: string;
  codigo: string;
  descripcion: string;
  ejeId: string;
  unidadId: string;
}

export type NivelCognitivo = 'Conocimiento Básico' | 'Aplicación' | 'Pensamiento Superior';

export interface Habilidad {
  id: string;
  nombre: string;
  nivelCognitivo: NivelCognitivo;
}

export enum TipoPregunta {
  SELECCION_MULTIPLE_3 = 'Selección Múltiple (3 opc.)',
  SELECCION_MULTIPLE_4 = 'Selección Múltiple (4 opc.)',
  SELECCION_MULTIPLE_5 = 'Selección Múltiple (5 opc.)',
  VERDADERO_FALSO = 'Verdadero/Falso',
  RESPUESTA_ABIERTA = 'Respuesta Abierta',
}

export interface BloquePreguntas {
  id: string;
  tipo: TipoPregunta;
  preguntas: string; // "1-5, 8, 10-12"
  puntaje: number;
}

export interface ClavePregunta {
  numero: number;
  clave: string; // 'A', 'B', 'V', 'F', etc.
  puntaje: number;
}

export interface PreguntaAsignada {
  oaId: string;
  habilidadId: string;
}

export interface ConfiguracionEvaluacion {
  id: string;
  nombre: string;
  nivel: NivelEducativo | '';
  asignatura: Asignatura | '';
  fecha: string;
  numeroPreguntas: number;
  porcentajeExigencia: number;
  estado: 'Borrador' | 'Completa';
  objetivosSeleccionados: string[]; // array of OA ids
  habilidadesSeleccionadas: string[]; // array of Habilidad ids
  preguntaAsignaciones: { [preguntaNro: number]: PreguntaAsignada };
  bloquesPreguntas: BloquePreguntas[];
  claves: ClavePregunta[];
  // Excel processing settings
  nombreHoja: string;
  filasEncabezadoASaltar: number;
  columnaIdEstudiante: string;
  columnaNombreEstudiante: string;
  // File storage fields
  testFileContent?: string | null;
  testFileName?: string | null;
  specFileContent?: string | null;
  specFileName?: string | null;
}

export interface ResultadoEstudiante {
  idEstudiante: string;
  nombreEstudiante: string;
  puntajeObtenido: number;
  puntajeTotal: number;
  calificacion: string;
  estado: 'Aprobado' | 'Reprobado' | 'Ausente';
  respuestas: { [preguntaNro: string]: string };
  correctas: number;
  incorrectas: number;
  omitidas: number;
}

export interface AnalysisMetrics {
  correctas: number;
  incorrectas: number;
  omitidas: number;
  totalPreguntas: number;
  porcentajeLogro: number;
}

export interface AnalysisItem {
  id: string;
  nombre: string;
  unidadId?: string;
  ejeId?: string;
  metricasGenerales: AnalysisMetrics;
  metricasPorEstudiante: {
    [idEstudiante: string]: AnalysisMetrics;
  };
}

export interface QuestionAnalysisItem {
  numeroPregunta: number;
  clave: string;
  porcentajeLogro: number;
  respuestasContadas: { [answer: string]: number };
  totalEstudiantes: number;
  oaId: string;
  habilidadId: string;
}

export interface ItemAnalysis {
    numeroPregunta: number;
    pValue: number; // Difficulty Index
    discriminationIndex: number; // Point-Biserial Correlation
}

export interface AnalysisData {
  porUnidad: AnalysisItem[];
  porEje: AnalysisItem[];
  porOA: AnalysisItem[];
  porHabilidad: AnalysisItem[];
  porOAyHabilidad: {
    [key: string]: AnalysisMetrics; // Key format: `${oaId}-${habilidadId}`
  };
  porPregunta: QuestionAnalysisItem[];
  itemAnalysis: ItemAnalysis[];
}

export interface HistoricalResult {
  evaluationId: string;
  evaluationName: string;
  date: string; // YYYY-MM-DD
  percentage: number;
  puntajeObtenido: number;
  puntajeTotal: number;
}

export interface ProcessedEvaluation {
  id: string; // A unique ID for this specific processing run, e.g., `${config.id}_${timestamp}`
  configuracion: ConfiguracionEvaluacion;
  resultados: ResultadoEstudiante[];
  analysisData: AnalysisData;
  processedAt: string; // ISO string date
  colegioId: string;
  docenteId: string;
}

export interface MisconceptionReport {
    name: string;
    description: string;
    remediation: string[];
}

export interface RiskAlert {
    studentName: string;
    studentId: string;
    riskLevel: 'Alto' | 'Medio' | 'Bajo';
    riskFactors: string[];
    interventionPlan: string[];
}

export interface ConceptualDiagnosis {
  oaName: string;
  questionNumber: number;
  errorDescription: string;
  conceptualError: string;
  remediationSuggestion: string;
}

export interface InterventionGroup {
    oaName: string;
    studentNames: string[];
}

export interface RiskStudent {
    studentName: string;
    riskLevel: 'Alto' | 'Medio';
    lowOAs: string[];
}


export interface Docente {
  id: string; // rut
  nombreCompleto: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  email: string;
  curso: string;
}

export interface JefeTecnico {
  id: string; // rut
  nombreCompleto: string;
  rut: string;
  email: string;
}

export interface Colegio {
  id: string;
  nombre: string;
  docentes: Docente[];
  jefesTecnicos?: JefeTecnico[];
}

export interface Profesional {
  id: string; // rut
  nombreCompleto: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  email: string;
}
