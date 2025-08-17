import React from 'react';
import { AdminEditor as AdminEditorComponent } from './AdminEditor/index';
import type { ConfiguracionEvaluacion } from '../types';

interface AdminEditorProps {
    initialState: ConfiguracionEvaluacion;
    onUpdate: (config: ConfiguracionEvaluacion) => void;
    onClose: () => void;
    onCancel: () => void;
    allConfigurations: ConfiguracionEvaluacion[];
}

export const AdminEditor: React.FC<AdminEditorProps> = (props) => {
    return <AdminEditorComponent {...props} />;
};
