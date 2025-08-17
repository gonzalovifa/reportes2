
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { LoginPage } from './pages/LoginPage';
import { SelectionPage } from './pages/LandingPage';
import { TeacherPortal } from './pages/TeacherPortal';
import { AdminPortal } from './pages/AdminPortal';
import { AdminEditor } from './pages/AdminEditor';
import { TipoPregunta } from './types';
import type { ConfiguracionEvaluacion, Colegio, Docente, Profesional, ProcessedEvaluation } from './types';
import { loadConfigurationsFromFirestore, saveConfigurationsToFirestore, hasCloudBackend, LOCAL_STORAGE_BACKUP_KEY, firebaseNotConfigured, loadAllProcessedEvaluations } from './lib/firebase';
import { ADMIN_RUT, PROFESIONALES_DATA, COLEGIOS_DATA } from './lib/data';
import { SpinnerIcon, ShieldIcon, ArrowUturnLeftIcon } from './components/Icons';

type View = 'login' | 'selection' | 'upload' | 'reports' | 'admin_list' | 'admin_editor';
type SelectionContext = { colegio: Colegio; docente: Docente };
type User = {
  rut: string;
  role: 'admin' | 'professional' | 'teacher' | 'jefe_tecnico';
  name: string;
  context?: { colegio: Colegio; docente?: Docente };
};

const normalizeRut = (rut: string): string => {
  if (!rut) return '';
  return rut.replace(/[\.\-]/g, '').toUpperCase();
}

const initialConfigs: ConfiguracionEvaluacion[] = [
    {
        id: 'config-1',
        nombre: 'Prueba de Matemática 2° Básico - Unidad 1',
        nivel: '2° Básico',
        asignatura: 'Matemática',
        fecha: '2024-05-10',
        numeroPreguntas: 5,
        porcentajeExigencia: 60,
        estado: 'Completa',
        objetivosSeleccionados: ['oa-u1-1', 'oa-u1-2'],
        habilidadesSeleccionadas: ['hab-1', 'hab-3'],
        preguntaAsignaciones: {
            1: { oaId: 'oa-u1-1', habilidadId: 'hab-1' },
            2: { oaId: 'oa-u1-1', habilidadId: 'hab-3' },
            3: { oaId: 'oa-u1-2', habilidadId: 'hab-1' },
            4: { oaId: 'oa-u1-2', habilidadId: 'hab-3' },
            5: { oaId: 'oa-u1-2', habilidadId: 'hab-3' },
        },
        bloquesPreguntas: [{ id: '1', tipo: TipoPregunta.SELECCION_MULTIPLE_4, preguntas: '1-5', puntaje: 2 }],
        claves: [
            { numero: 1, clave: 'A', puntaje: 2 },
            { numero: 2, clave: 'C', puntaje: 2 },
            { numero: 3, clave: 'B', puntaje: 2 },
            { numero: 4, clave: 'D', puntaje: 2 },
            { numero: 5, clave: 'A', puntaje: 2 },
        ],
        nombreHoja: "Respuestas",
        filasEncabezadoASaltar: 0,
        columnaIdEstudiante: "RUT",
        columnaNombreEstudiante: "Nombre Completo",
    },
    {
        id: 'config-2',
        nombre: 'Diagnóstico Lenguaje 3° Básico',
        nivel: '3° Básico',
        asignatura: 'Lenguaje y Comunicación',
        fecha: '2024-03-15',
        numeroPreguntas: 10,
        porcentajeExigencia: 60,
        estado: 'Borrador',
        objetivosSeleccionados: [],
        habilidadesSeleccionadas: [],
        preguntaAsignaciones: {},
        bloquesPreguntas: [],
        claves: Array.from({ length: 10 }, (_, i) => ({ numero: i + 1, clave: '', puntaje: 1 })),
        nombreHoja: "Respuestas",
        filasEncabezadoASaltar: 0,
        columnaIdEstudiante: "ID Estudiante",
        columnaNombreEstudiante: "Nombre",
    }
];

const newConfigTemplate = (): ConfiguracionEvaluacion => ({
    id: `config-${Date.now()}`,
    nombre: '',
    nivel: '',
    asignatura: '',
    fecha: new Date().toISOString().split('T')[0],
    numeroPreguntas: 20,
    porcentajeExigencia: 60,
    estado: 'Borrador',
    objetivosSeleccionados: [],
    habilidadesSeleccionadas: [],
    preguntaAsignaciones: {},
    bloquesPreguntas: [
        { id: '1', tipo: TipoPregunta.SELECCION_MULTIPLE_4, preguntas: '', puntaje: 1 },
    ],
    claves: Array.from({ length: 20 }, (_, i) => ({ numero: i + 1, clave: '', puntaje: 1 })),
    nombreHoja: "Respuestas",
    filasEncabezadoASaltar: 0,
    columnaIdEstudiante: "RUT",
    columnaNombreEstudiante: "Nombre Completo",
    testFileContent: null,
    testFileName: null,
    specFileContent: null,
    specFileName: null,
});

function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [view, setView] = useState<View>('login');
    const [selection, setSelection] = useState<SelectionContext | null>(null);
    const [configurations, setConfigurations] = useState<ConfiguracionEvaluacion[]>([]);
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [initialActiveEvaluation, setInitialActiveEvaluation] = useState<ProcessedEvaluation | null>(null);
    const [loadedEvaluations, setLoadedEvaluations] = useState<ProcessedEvaluation[] | null>(null);
    
    const isFirstRenderAfterLoad = useRef(true);
    const debounceTimeoutRef = useRef<number | null>(null);

    // Firebase config warning
    useEffect(() => {
        if (firebaseNotConfigured) {
          toast.error(
            "Firebase no está configurado. El trabajo se guardará localmente. Para habilitar la nube, añada sus credenciales en lib/firebase.ts.",
            {
              duration: Infinity,
              id: 'firebase-config-warning',
            }
          );
        }
      }, []);

    // Initial data loading
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const firebaseData = await loadConfigurationsFromFirestore();
            
            if (firebaseData) {
                setConfigurations(firebaseData);
                toast.success('Datos cargados desde la nube.');
            } else {
                console.warn('Failed to load from Firestore. Falling back to local backup.');
                try {
                    const localData = window.localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
                    setConfigurations(localData ? JSON.parse(localData) : initialConfigs);
                    if (hasCloudBackend) {
                       toast.error('No se pudo conectar. Cargando desde respaldo local.');
                    }
                } catch (e) {
                    console.error("Local backup is corrupted or invalid. Using initial data.", e);
                    setConfigurations(initialConfigs);
                }
            }
            setIsLoading(false);
            isFirstRenderAfterLoad.current = true;
        };
        loadData();
    }, []);
    
    // Debounced saving
    useEffect(() => {
        if (isLoading || isFirstRenderAfterLoad.current) {
            if (!isLoading) {
                isFirstRenderAfterLoad.current = false;
            }
            return;
        }

        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        const toastId = 'sync-toast';
        toast.loading('Guardando...', { id: toastId });

        debounceTimeoutRef.current = window.setTimeout(async () => {
            window.localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(configurations));

            if (hasCloudBackend) {
                try {
                    await saveConfigurationsToFirestore(configurations);
                    toast.success('¡Guardado en la nube!', { id: toastId });
                } catch (err) {
                    console.error("Failed to save to Firestore. Data is backed up locally.", err);
                    toast.error('Estás sin conexión. Guardado localmente.', { id: toastId });
                }
            } else {
                toast.success('Cambios guardados localmente.', { id: toastId });
            }
        }, 1500);

        return () => {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        };
    }, [configurations, isLoading]);
    
    const handleLogin = async (rut: string): Promise<boolean> => {
        const normalizedRut = normalizeRut(rut);
        
        // 1. Check Admin
        if (normalizedRut === normalizeRut(ADMIN_RUT)) {
            setCurrentUser({ rut: ADMIN_RUT, role: 'admin', name: 'Gonzalo (Admin)' });
            setView('admin_list');
            return true;
        }

        // 2. Check Professional
        const professional = PROFESIONALES_DATA.find(p => normalizeRut(p.rut) === normalizedRut);
        if (professional) {
            setCurrentUser({ rut: professional.rut, role: 'professional', name: professional.nombreCompleto });
            setView('selection');
            return true;
        }

        // 3. Check Jefe Tecnico
        for (const colegio of COLEGIOS_DATA) {
            if (colegio.jefesTecnicos) {
                const jefeTecnico = colegio.jefesTecnicos.find(jt => normalizeRut(jt.rut) === normalizedRut);
                if (jefeTecnico) {
                    setCurrentUser({
                        rut: jefeTecnico.rut,
                        role: 'jefe_tecnico',
                        name: `${jefeTecnico.nombreCompleto} (Jefe Técnico)`,
                        context: { colegio },
                    });
                    setView('selection');
                    return true;
                }
            }
        }

        // 4. Check Teacher - Special flow
        let teacherLoginInfo: { colegio: Colegio, docente: Docente } | null = null;
        for (const colegio of COLEGIOS_DATA) {
            const docente = colegio.docentes.find(d => normalizeRut(d.rut) === normalizedRut);
            if (docente) {
                teacherLoginInfo = { colegio, docente };
                break;
            }
        }
        
        if (teacherLoginInfo) {
            setIsLoading(true);
            const { colegio, docente } = teacherLoginInfo;

            const allEvals = await loadAllProcessedEvaluations();
            const teacherEvals = allEvals.filter(e => e.colegioId === colegio.id && e.docenteId === docente.id);
            const count = teacherEvals.length;
            
            setCurrentUser({ rut: docente.rut, role: 'teacher', name: docente.nombreCompleto, context: teacherLoginInfo });
            setSelection(teacherLoginInfo);
            setLoadedEvaluations(allEvals);

            if (count === 0) {
                setView('upload');
            } else if (count === 1) {
                setInitialActiveEvaluation(teacherEvals[0]);
                setView('reports');
            } else {
                setView('reports');
            }
            
            setIsLoading(false);
            return true;
        }
        
        return false;
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setSelection(null);
        setView('login');
        setInitialActiveEvaluation(null);
        setLoadedEvaluations(null);
    };

    const handleCreate = useCallback(() => {
        const newConfig = newConfigTemplate();
        setConfigurations(prev => [...prev, newConfig]);
        setEditingConfigId(newConfig.id);
        setView('admin_editor');
    }, []);

    const handleEdit = useCallback((id: string) => {
        if (configurations.find(c => c.id === id)) {
            setEditingConfigId(id);
            setView('admin_editor');
        }
    }, [configurations]);

    const handleDelete = useCallback((id: string) => {
        setConfigurations(prev => prev.filter(c => c.id !== id));
    }, []);

    const handleUpdate = useCallback((config: ConfiguracionEvaluacion) => {
        try {
            const cleanConfig = JSON.parse(JSON.stringify(config));
            setConfigurations(prev => prev.map(c => c.id === cleanConfig.id ? cleanConfig : c));
        } catch (error) {
            console.error("Error sanitizing updated configuration. Update aborted.", error);
            toast.error("Error: No se pudo guardar la configuración debido a un formato de datos inesperado.");
        }
    }, []);
    
    const handleCloseEditor = useCallback(() => {
        setEditingConfigId(null);
        setView('admin_list');
    }, []);
    
    const handleImport = useCallback((importedConfigs: ConfiguracionEvaluacion[]) => {
        if (window.confirm('¿Está seguro de que desea importar estas configuraciones? Se sobrescribirán todas las configuraciones actuales.')) {
            try {
                const cleanConfigs = JSON.parse(JSON.stringify(importedConfigs));
                setConfigurations(cleanConfigs);
                toast.success('¡Configuraciones importadas con éxito!');
            } catch(error) {
                 console.error("Error sanitizing imported configurations. Import aborted.", error);
                 toast.error("No se pudieron importar las configuraciones debido a un error de formato.");
            }
        }
    }, []);
    
    const configToEdit = configurations.find(c => c.id === editingConfigId);

    const handleSelection = (context: SelectionContext, targetView: 'upload' | 'reports') => {
        setSelection(context);
        setView(targetView);
    };

    const handleBackFromTeacherPortal = () => {
        if (currentUser?.role === 'professional' || currentUser?.role === 'jefe_tecnico') {
            setSelection(null);
            setView('selection');
        } else {
            handleLogout();
        }
    };

    const renderHeader = () => {
        if (!currentUser || view === 'admin_editor' || view === 'upload' || view === 'reports') {
            return null;
        }

        const showAdminButton = currentUser.role !== 'admin';

        return (
            <header className="bg-white shadow-sm sticky top-0 z-50">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-2">
                            <svg className="h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.697 50.697 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                            </svg>
                            <span className="text-xl font-bold text-gray-800">GradeRight</span>
                        </div>
                        <div className="flex items-center space-x-6">
                             <span className="text-sm text-gray-700 font-medium">{currentUser.name}</span>
                             {showAdminButton && (
                                <button onClick={() => setView('admin_list')} className={`text-sm font-medium ${view.startsWith('admin') ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <ShieldIcon className="w-5 h-5 inline-block mr-1" />
                                    Admin
                                </button>
                             )}
                             <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 flex items-center gap-1">
                                <ArrowUturnLeftIcon className="w-5 h-5" />
                                Salir
                            </button>
                        </div>
                    </div>
                </nav>
            </header>
        );
    }

    const renderView = () => {
        if (!currentUser) {
            return <LoginPage onLogin={handleLogin} />;
        }

        switch(view) {
            case 'login':
                return <LoginPage onLogin={handleLogin} />;
            case 'selection':
                return <SelectionPage user={currentUser} onNavigate={handleSelection} onNavigateToAdmin={() => setView('admin_list')} />;
            case 'upload':
            case 'reports':
                if (selection) return <TeacherPortal 
                                        configurations={configurations} 
                                        selection={selection} 
                                        onBack={handleBackFromTeacherPortal} 
                                        mode={view} 
                                        onNavigateHome={handleLogout}
                                        initialEvaluations={loadedEvaluations}
                                        initialActiveEvaluation={initialActiveEvaluation}
                                        onInitialEvaluationConsumed={() => setInitialActiveEvaluation(null)}
                                     />;
                break;
            case 'admin_list':
                return <AdminPortal configurations={configurations} onCreate={handleCreate} onEdit={handleEdit} onDelete={handleDelete} onImport={handleImport} />;
            case 'admin_editor':
                if (configToEdit) {
                    return <AdminEditor 
                        initialState={configToEdit} 
                        onUpdate={handleUpdate} 
                        onClose={handleCloseEditor}
                        onCancel={handleCloseEditor}
                        allConfigurations={configurations} 
                    />;
                }
                handleCloseEditor(); // Close if config is not found
                return null;
        }
        
        handleLogout();
        return null;
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-600">
                <SpinnerIcon className="w-12 h-12 text-primary-600 mb-4" />
                <h1 className="text-2xl font-bold">Cargando GradeRight...</h1>
                <p className="text-lg mt-2">Personalizando su experiencia...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Toaster position="bottom-right" />
            {renderHeader()}
            <main className="w-full">
                {renderView()}
            </main>
        </div>
    );
}

export default App;
