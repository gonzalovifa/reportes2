
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldIcon, BookOpenIcon, UploadIcon, SpinnerIcon } from '../components/Icons';
import { Button, FormField, Select } from '../components/UI';
import { COLEGIOS_DATA } from '../lib/data';
import type { Colegio, Docente, ProcessedEvaluation, Profesional } from '../types';
import { loadAllProcessedEvaluations } from '../lib/firebase';

// This is a bit of a hack since we don't have a full user type from App
type User = {
  rut: string;
  role: 'admin' | 'professional' | 'teacher' | 'jefe_tecnico';
  name: string;
  context?: { colegio: Colegio; docente?: Docente };
};

interface SelectionPageProps {
  user: User;
  onNavigate: (context: { colegio: Colegio; docente: Docente }, targetView: 'upload' | 'reports') => void;
  onNavigateToAdmin: () => void;
}

export const SelectionPage: React.FC<SelectionPageProps> = ({ user, onNavigate, onNavigateToAdmin }) => {
  const isJefeTecnico = user.role === 'jefe_tecnico';
  const fixedColegioForJefe = isJefeTecnico ? COLEGIOS_DATA.find(c => c.id === user.context?.colegio.id) : null;

  const [selectedColegioId, setSelectedColegioId] = useState(fixedColegioForJefe?.id || '');
  const [selectedDocenteId, setSelectedDocenteId] = useState('');

  const [allEvaluations, setAllEvaluations] = useState<ProcessedEvaluation[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
      loadAllProcessedEvaluations().then(data => {
          setAllEvaluations(data);
          setIsLoadingReports(false);
      });
  }, []);

  const selectedColegio = useMemo(() => COLEGIOS_DATA.find(c => c.id === selectedColegioId), [selectedColegioId]);
  const availableDocentes = useMemo(() => selectedColegio?.docentes || [], [selectedColegio]);
  const selectedDocente = useMemo(() => availableDocentes.find(d => d.id === selectedDocenteId), [availableDocentes, selectedDocenteId]);

  const hasReportsForTeacher = useMemo(() => {
      if (!selectedDocenteId || !selectedColegioId) return false;
      return allEvaluations.some(e => e.colegioId === selectedColegioId && e.docenteId === selectedDocenteId);
  }, [allEvaluations, selectedColegioId, selectedDocenteId]);

  const handleColegioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedColegioId(e.target.value);
    setSelectedDocenteId('');
  };

  const handleDocenteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDocenteId(e.target.value);
  };

  const handleSubmit = (targetView: 'upload' | 'reports') => {
    if (selectedColegio && selectedDocente) {
      onNavigate({ colegio: selectedColegio, docente: selectedDocente }, targetView);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="text-center">
             <svg className="h-16 w-16 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.697 50.697 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-gray-800">
              Portal de Selección
            </h1>
            <p className="mt-3 max-w-xl mx-auto text-lg text-gray-600">
              Seleccione un profesor para comenzar a subir resultados o ver informes.
            </p>
          </div>

          <div className="mt-10 bg-white p-8 rounded-2xl shadow-lg">
            <div className="space-y-6">
              <FormField label={isJefeTecnico ? "Colegio (asignado)" : "1. Seleccione Colegio"} htmlFor="colegio-select">
                <Select id="colegio-select" value={selectedColegioId} onChange={handleColegioChange} disabled={isJefeTecnico}>
                    {!isJefeTecnico && <option value="" disabled>-- Seleccionar establecimiento --</option>}
                    {isJefeTecnico && fixedColegioForJefe ? (
                        <option value={fixedColegioForJefe.id}>{fixedColegioForJefe.nombre}</option>
                    ) : (
                        COLEGIOS_DATA.map(colegio => (
                            <option key={colegio.id} value={colegio.id}>{colegio.nombre}</option>
                        ))
                    )}
                </Select>
              </FormField>

              <FormField label={isJefeTecnico ? "1. Seleccione Docente" : "2. Seleccione Docente"} htmlFor="docente-select">
                 <Select id="docente-select" value={selectedDocenteId} onChange={handleDocenteChange} disabled={!selectedColegioId}>
                    <option value="" disabled>-- Seleccionar docente --</option>
                    {availableDocentes.map(docente => (
                        <option key={docente.id} value={docente.id}>{docente.nombreCompleto}</option>
                    ))}
                 </Select>
              </FormField>
              
              {selectedDocente && (
                <div className="p-4 bg-primary-50 border-l-4 border-primary-400 rounded-r-md">
                    <h3 className="font-semibold text-primary-800">Contexto Seleccionado</h3>
                    <p className="text-sm text-gray-700">Nivel: 2° Básico</p>
                    <p className="text-sm text-gray-700">Curso: {selectedDocente.curso}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <Button size="md" onClick={() => handleSubmit('upload')} disabled={!selectedDocente} className="w-full !py-3 text-base">
                <UploadIcon className="w-5 h-5 mr-2" />
                Subir Resultados
              </Button>
              <Button size="md" onClick={() => handleSubmit('reports')} disabled={!selectedDocente || isLoadingReports || !hasReportsForTeacher} className="w-full !py-3 text-base">
                 {isLoadingReports ? <SpinnerIcon className="w-5 h-5 mr-2" /> : <BookOpenIcon className="w-5 h-5 mr-2" />}
                 {isLoadingReports ? 'Cargando...' : 'Ver Reportes'}
              </Button>
            </div>
          </div>
          
           <div className="mt-8 text-center">
                <button onClick={onNavigateToAdmin} className="text-sm font-medium text-gray-600 hover:text-primary-600 inline-flex items-center gap-2">
                    <ShieldIcon className="w-5 h-5"/>
                    <span>Portal de Administración de Plantillas</span>
                </button>
            </div>
        </div>
      </div>

       <footer className="w-full text-center py-6 text-gray-500 text-sm">
        Copyright © 2025 Centro Comenius. Todos los derechos reservados.
      </footer>
    </div>
  );
};
