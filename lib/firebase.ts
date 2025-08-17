import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import type { ConfiguracionEvaluacion, ResultadoEstudiante, HistoricalResult, ProcessedEvaluation, Colegio, Docente } from '../types';

// =================================================================
// CONFIGURACIÓN DE FIREBASE
// =================================================================
// INGRESE SUS CREDENCIALES DE FIREBASE AQUÍ PARA QUE LA APP FUNCIONE
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAvZfDwweh1b8jh1rYkUPA5-1vc8YIdwz0",
  authDomain: "sistema-evaluacion-bc9e9.firebaseapp.com",
  projectId: "sistema-evaluacion-bc9e9",
  storageBucket: "sistema-evaluacion-bc9e9.firebasestorage.app",
  messagingSenderId: "650316326823",
  appId: "1:650316326823:web:830fca8f641b7c9a1bf882",
  measurementId: "G-ERCX7VSD0K", // Opcional
};
// =================================================================


// =================================================================
// No es necesario modificar nada debajo de esta línea.
// =================================================================

export const firebaseNotConfigured = !firebaseConfig.projectId || firebaseConfig.projectId === "TU_PROJECT_ID_AQUI";

let db: firebase.firestore.Firestore | null = null;
export let hasCloudBackend = false;

if (!firebaseNotConfigured) {
  try {
    // Evitar reinicialización si ya existe una instancia
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    hasCloudBackend = true;
    
    db.enablePersistence().catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[GradeRight] Persistencia offline no disponible: failed-precondition (probablemente múltiples pestañas abiertas).');
        } else if (err.code === 'unimplemented') {
           console.warn('[GradeRight] Persistencia offline no disponible: no implementado en este navegador.');
        }
    });
    
    console.log('[GradeRight] Firebase configurado correctamente.');
  } catch (error) {
    console.error('[GradeRight] Error inicializando Firebase:', error);
    hasCloudBackend = false;
  }
} else {
    console.warn('[GradeRight] Firebase no está configurado; se usará solo almacenamiento local.');
}

const CONFIG_COLLECTION = 'configurations';
const CONFIG_DOC_ID = 'main-v1';
const STUDENT_RESULTS_COLLECTION = 'studentResults';
const PROCESSED_EVALUATIONS_COLLECTION = 'processedEvaluations';
export const LOCAL_STORAGE_BACKUP_KEY = 'gradeRightConfigs_backup';
export const LOCAL_PROCESSED_EVALUATIONS_KEY = 'gradeRightProcessedEvaluations_backup';
const LOCAL_STORAGE_EVALUATION_LIMIT = 10; // Keep only the 10 most recent reports locally


/**
 * Sanitizes and formats data to ensure it is a clean, serializable array of configurations.
 * This is the primary defense against circular reference errors from Firestore's offline cache.
 * @param data The raw data to sanitize.
 * @returns A sanitized array of configurations, or null if sanitization fails.
 */
function sanitizeData(data: any): any | null {
    try {
        // The most reliable way to strip non-serializable properties and circular references.
        const cleanData = JSON.parse(JSON.stringify(data));
        return cleanData;
    } catch (error) {
        console.error("CRITICAL: Failed to sanitize data due to circular structure.", error);
        return null; // Indicates that the data is corrupted and cannot be used.
    }
}


export const loadConfigurationsFromFirestore = async (): Promise<ConfiguracionEvaluacion[] | null> => {
    if (!hasCloudBackend || !db) {
        return null;
    }

    const docRef = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID);

    try {
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const rawData = docSnap.data();
            if (rawData && rawData.configs) {
                console.log('[GradeRight] Data obtained from Firestore (server or cache). Sanitizing...');
                const sanitized = sanitizeData(rawData.configs);
                if (Array.isArray(sanitized)) {
                    return sanitized.map((config: any) => {
                        if (config && typeof config.fecha === 'string' && config.fecha.includes('T')) {
                            return { ...config, fecha: config.fecha.split('T')[0] };
                        }
                        return config;
                    });
                }
                return null;
            }
        }
        
        console.log('[GradeRight] Firestore document is empty.');
        return []; // Return empty array for a valid but empty document.

    } catch (error) {
        console.warn('[GradeRight] Failed to get document because the client is offline.', error);
        return null; // Signal failure to the caller.
    }
};

export const saveConfigurationsToFirestore = async (configs: ConfiguracionEvaluacion[]): Promise<void> => {
    if (!hasCloudBackend || !db) {
        console.log('[GradeRight] Firebase not available, performing local-only save.');
        return;
    }

    const sanitizedConfigs = sanitizeData(configs);

    if (sanitizedConfigs === null) {
        const error = new Error("Save aborted: Data contains circular references or is otherwise not serializable.");
        console.error(`[GradeRight] ${error.message}`);
        throw error;
    }

    try {
        await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC_ID).set({ configs: sanitizedConfigs });
        console.log('[GradeRight] ✅ Configurations saved to Firebase.');
    } catch (error) {
        console.error('[GradeRight] Error saving to Firebase:', error);
        throw error; // Re-throw for the UI to handle.
    }
};

export const saveProcessedEvaluation = async (evaluation: Omit<ProcessedEvaluation, 'id'>, context: { colegio: Colegio; docente: Docente }): Promise<ProcessedEvaluation> => {
    const evaluationWithContext: ProcessedEvaluation = {
        ...evaluation,
        id: `${evaluation.configuracion.id}_${context.colegio.id}_${context.docente.id}_${new Date().getTime()}`,
        colegioId: context.colegio.id,
        docenteId: context.docente.id,
    };
    
    if (!hasCloudBackend || !db) {
        console.log('[GradeRight] Firebase not available, saving processed evaluation locally.');
        const sanitizedEvaluation = sanitizeData(evaluationWithContext);
        if (!sanitizedEvaluation) {
            console.error("Save to local storage aborted: Evaluation data is not serializable.");
            return evaluationWithContext;
        }

        let evaluations: ProcessedEvaluation[] = [];
        try {
            const existingData = window.localStorage.getItem(LOCAL_PROCESSED_EVALUATIONS_KEY);
            if (existingData) {
                const parsed = JSON.parse(existingData);
                if(Array.isArray(parsed)) {
                    evaluations = parsed;
                } else {
                    console.warn('Local processed evaluations were not an array. Resetting.');
                }
            }
        } catch (error) {
            console.error('[GradeRight] Error parsing local processed evaluations. Resetting storage.', error);
            // On corruption, we start with a clean slate to ensure the new evaluation can be saved.
            evaluations = [];
        }
        
        let updatedEvaluations = [sanitizedEvaluation, ...evaluations.filter(e => e.id !== sanitizedEvaluation.id)];
        updatedEvaluations.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());

        // Trim the local storage backup to prevent exceeding quota
        if (updatedEvaluations.length > LOCAL_STORAGE_EVALUATION_LIMIT) {
            console.warn(`[GradeRight] Local storage limit reached. Keeping only the ${LOCAL_STORAGE_EVALUATION_LIMIT} most recent evaluations.`);
            updatedEvaluations = updatedEvaluations.slice(0, LOCAL_STORAGE_EVALUATION_LIMIT);
        }

        try {
            window.localStorage.setItem(LOCAL_PROCESSED_EVALUATIONS_KEY, JSON.stringify(updatedEvaluations));
            console.log(`[GradeRight] ✅ Processed evaluation report saved to Local Storage. Total reports stored: ${updatedEvaluations.length}.`);
        } catch (error) {
             console.error("Failed to save to local storage. It might be full, or the single report is too large.", error);
             alert("Error: No se pudo guardar el reporte en el almacenamiento local. Es posible que el almacenamiento esté lleno o el reporte individual sea demasiado grande.");
        }

        return evaluationWithContext;
    }

    const sanitizedEvaluation = sanitizeData(evaluationWithContext);
    if (sanitizedEvaluation === null) {
        const error = new Error("Save aborted: Processed evaluation data is not serializable.");
        console.error(`[GradeRight] ${error.message}`);
        throw error;
    }
    
    try {
        await db.collection(PROCESSED_EVALUATIONS_COLLECTION).doc(sanitizedEvaluation.id).set(sanitizedEvaluation);
        console.log(`[GradeRight] ✅ Processed evaluation report saved to Firebase with ID: ${sanitizedEvaluation.id}`);
        return evaluationWithContext;
    } catch (error) {
        console.error('[GradeRight] Error saving processed evaluation to Firebase:', error);
        throw error;
    }
};

export const loadAllProcessedEvaluations = async (): Promise<ProcessedEvaluation[]> => {
    if (!hasCloudBackend || !db) {
        console.log('[GradeRight] Firebase not available, loading processed evaluations locally.');
        try {
            const localData = window.localStorage.getItem(LOCAL_PROCESSED_EVALUATIONS_KEY);
            const evaluations = localData ? JSON.parse(localData) : [];
            if (Array.isArray(evaluations)) {
                console.log(`[GradeRight] Loaded ${evaluations.length} processed reports from Local Storage.`);
                return evaluations;
            }
            return [];
        } catch (error) {
            console.error('[GradeRight] Error loading processed evaluations from Local Storage:', error);
            return [];
        }
    }
    
    try {
        const querySnapshot = await db.collection(PROCESSED_EVALUATIONS_COLLECTION).get();
        const evaluations: ProcessedEvaluation[] = [];
        querySnapshot.forEach((docSnap) => {
            const rawData = docSnap.data();
            const sanitized = sanitizeData(rawData);
            if(sanitized) {
                evaluations.push(sanitized as ProcessedEvaluation);
            }
        });
        
        evaluations.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
        console.log(`[GradeRight] Loaded ${evaluations.length} processed evaluation reports.`);
        return evaluations;
    } catch(error) {
        console.error('[GradeRight] Error loading all processed evaluations:', error);
        return [];
    }
}

export const deleteProcessedEvaluation = async (id: string): Promise<void> => {
    if (!hasCloudBackend || !db) {
        console.log('[GradeRight] Firebase not available, deleting processed evaluation locally.');
        try {
            const existingData = window.localStorage.getItem(LOCAL_PROCESSED_EVALUATIONS_KEY);
            if (existingData) {
                const evaluations: ProcessedEvaluation[] = JSON.parse(existingData);
                if (Array.isArray(evaluations)) {
                    const updatedEvaluations = evaluations.filter(e => e.id !== id);
                    window.localStorage.setItem(LOCAL_PROCESSED_EVALUATIONS_KEY, JSON.stringify(updatedEvaluations));
                    console.log(`[GradeRight] ✅ Processed evaluation report with ID ${id} deleted from Local Storage.`);
                }
            }
        } catch (error) {
            console.error('[GradeRight] Error deleting processed evaluation from Local Storage:', error);
        }
        return;
    }

    try {
        await db.collection(PROCESSED_EVALUATIONS_COLLECTION).doc(id).delete();
        console.log(`[GradeRight] ✅ Processed evaluation report with ID: ${id} deleted from Firebase.`);
    } catch (error) {
        console.error('[GradeRight] Error deleting processed evaluation from Firebase:', error);
        throw error;
    }
};

export const getStudentHistory = async (studentId: string): Promise<HistoricalResult[]> => {
    if (!hasCloudBackend || !db) return [];
    
    const docRef = db.collection(STUDENT_RESULTS_COLLECTION).doc(studentId);
    try {
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            const sanitized = sanitizeData(data?.history);
            return Array.isArray(sanitized) ? sanitized : [];
        }
        return [];
    } catch (error) {
        console.error(`Error getting student history for ${studentId}:`, error);
        return [];
    }
};

export const saveStudentResults = async (results: ResultadoEstudiante[], config: ConfiguracionEvaluacion): Promise<void> => {
    if (!hasCloudBackend || !db) return;

    const batch = db.batch();

    for (const student of results) {
        if (!student.idEstudiante) continue;
        
        const docRef = db.collection(STUDENT_RESULTS_COLLECTION).doc(student.idEstudiante);
        
        const newResult: HistoricalResult = {
            evaluationId: config.id,
            evaluationName: config.nombre,
            date: config.fecha,
            percentage: config.numeroPreguntas > 0 ? (student.correctas / config.numeroPreguntas) * 100 : 0,
            puntajeObtenido: student.puntajeObtenido,
            puntajeTotal: student.puntajeTotal,
        };

        try {
            const docSnap = await docRef.get();
            let history: HistoricalResult[] = [];

            if (docSnap.exists) {
                const existingData = docSnap.data();
                const sanitized = sanitizeData(existingData?.history);
                if (Array.isArray(sanitized)) {
                    history = sanitized;
                }
            }

            // Remove previous result for the same evaluation to avoid duplicates
            const filteredHistory = history.filter(h => h.evaluationId !== config.id);
            filteredHistory.push(newResult);

            // Sort by date to keep it consistent
            filteredHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            batch.set(docRef, { history: filteredHistory }, { merge: true });

        } catch (error) {
            console.warn(`[GradeRight] No se pudo obtener el historial para el estudiante ${student.idEstudiante} (probablemente sin conexión). El nuevo resultado se guardará sin fusionar el historial.`);
            const historyWithOnlyNewResult = [newResult];
            batch.set(docRef, { history: historyWithOnlyNewResult }, { merge: true });
        }
    }

    try {
        await batch.commit();
        console.log(`[GradeRight] ✅ Lote de resultados de ${results.length} estudiantes escrito/encolado.`);
    } catch (error) {
        console.error('Error al confirmar el lote de resultados de estudiantes:', error);
        throw error;
    }
};