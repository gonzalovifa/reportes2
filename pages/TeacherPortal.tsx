
import React from 'react';
import { TeacherPortal as TeacherPortalComponent } from './TeacherPortal/index';
import type { ConfiguracionEvaluacion, Colegio, Docente, ProcessedEvaluation } from '../types';

interface TeacherPortalProps {
  configurations: ConfiguracionEvaluacion[];
  selection: { colegio: Colegio; docente: Docente };
  onBack: () => void;
  mode: 'upload' | 'reports';
  onNavigateHome: () => void;
  initialEvaluations?: ProcessedEvaluation[] | null;
  initialActiveEvaluation?: ProcessedEvaluation | null;
  onInitialEvaluationConsumed?: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = (props) => {
    return <TeacherPortalComponent {...props} />;
};
