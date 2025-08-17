
import React from 'react';
import type { ConfiguracionEvaluacion } from '../../../types';
import type { Action } from '../adminEditor.logic';
import { NIVELES_COGNITIVOS, HABILIDADES } from '../../../lib/data';
import { CheckmarkIcon } from '../../../components/Icons';

interface ItemToggleProps {
  state: ConfiguracionEvaluacion;
  dispatch: React.Dispatch<Action>;
  onToggleItem: (field: 'objetivosSeleccionados' | 'habilidadesSeleccionadas', id: string) => void;
}

export const HabilitiesSection: React.FC<ItemToggleProps> = ({ state, dispatch, onToggleItem }) => (
    <div>
        <div className="flex space-x-2 mb-4">
            <button onClick={() => dispatch({ type: 'TOGGLE_ALL', field: 'habilidadesSeleccionadas', checked: true })} className="text-sm font-medium text-primary-600 hover:text-primary-800">Seleccionar todo</button>
            <span className="text-gray-300">/</span>
            <button onClick={() => dispatch({ type: 'TOGGLE_ALL', field: 'habilidadesSeleccionadas', checked: false })} className="text-sm font-medium text-primary-600 hover:text-primary-800">Deseleccionar todo</button>
        </div>
        {NIVELES_COGNITIVOS.map(nivel => (
            <div key={nivel} className="mt-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2 mb-2">{nivel}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {HABILIDADES.filter(h => h.nivelCognitivo === nivel).map(habilidad => (
                        <div key={habilidad.id}>
                            <label htmlFor={habilidad.id} className="inline-flex items-center cursor-pointer text-sm text-gray-700">
                                <input 
                                    type="checkbox" 
                                    id={habilidad.id} 
                                    checked={state.habilidadesSeleccionadas.includes(habilidad.id)} 
                                    onChange={() => onToggleItem('habilidadesSeleccionadas', habilidad.id)} 
                                    className="peer sr-only" 
                                />
                                <span className="w-5 h-5 bg-white border-2 border-gray-300 rounded-md peer-checked:bg-primary-500 peer-checked:border-primary-500 relative flex-shrink-0 transition-colors">
                                    <CheckmarkIcon className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden peer-checked:block" />
                                </span>
                                <span className="ml-3">{habilidad.nombre}</span>
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);
