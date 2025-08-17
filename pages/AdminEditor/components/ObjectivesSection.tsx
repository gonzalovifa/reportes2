
import React, { useMemo } from 'react';
import type { ConfiguracionEvaluacion } from '../../../types';
import type { Action } from '../adminEditor.logic';
import { UNIDADES, EJES_TEMATICOS, OBJETIVOS_APRENDIZAJE } from '../../../lib/data';
import { CheckmarkIcon } from '../../../components/Icons';

interface ItemToggleProps {
  state: ConfiguracionEvaluacion;
  dispatch: React.Dispatch<Action>;
  onToggleItem: (field: 'objetivosSeleccionados' | 'habilidadesSeleccionadas', id: string) => void;
}

export const ObjectivesSection: React.FC<ItemToggleProps> = ({ state, dispatch, onToggleItem }) => {
    const { nivel, asignatura } = state;
    const availableUnits = useMemo(() => UNIDADES.filter(u => u.asignatura === asignatura && u.nivel === nivel), [asignatura, nivel]);
    
    if (!asignatura) {
        return <p className="text-gray-500">Seleccione un nivel y asignatura en "Datos Generales" para ver los objetivos.</p>;
    }
    
    return (
        <div className="space-y-6">
             <div className="flex space-x-2">
                 <button onClick={() => dispatch({ type: 'TOGGLE_ALL', field: 'objetivosSeleccionados', checked: true })} className="text-sm font-medium text-primary-600 hover:text-primary-800">Seleccionar todo</button>
                 <span className="text-gray-300">/</span>
                 <button onClick={() => dispatch({ type: 'TOGGLE_ALL', field: 'objetivosSeleccionados', checked: false })} className="text-sm font-medium text-primary-600 hover:text-primary-800">Deseleccionar todo</button>
             </div>
            {availableUnits.map(unit => (
                <div key={unit.id} className="bg-white border border-gray-200 rounded-lg p-5">
                    <h4 className="font-semibold text-lg text-gray-800 border-b border-gray-200 pb-3 mb-3 flex justify-between items-center">
                        <span>{unit.nombre}</span>
                         <span className="flex space-x-1 items-center">
                            <button onClick={() => dispatch({ type: 'TOGGLE_ALL_OAS_FOR_UNIT', unitId: unit.id, checked: true })} className="text-xs font-medium text-primary-600 hover:text-primary-800">Sel. todo</button>
                            <span className="text-gray-300 text-xs">/</span>
                            <button onClick={() => dispatch({ type: 'TOGGLE_ALL_OAS_FOR_UNIT', unitId: unit.id, checked: false })} className="text-xs font-medium text-primary-600 hover:text-primary-800">Desel. todo</button>
                        </span>
                    </h4>
                    {EJES_TEMATICOS.map(eje => {
                        const oasInEje = OBJETIVOS_APRENDIZAJE.filter(oa => oa.unidadId === unit.id && oa.ejeId === eje.id);
                        if (oasInEje.length === 0) return null;
                        return (
                            <div key={eje.id} className="ml-4 mt-4">
                                <h5 className="font-medium text-gray-600">{eje.nombre}</h5>
                                {oasInEje.map(oa => (
                                    <div key={oa.id}>
                                        <label htmlFor={oa.id} className="flex items-start my-2 ml-4 cursor-pointer text-sm text-gray-700">
                                            <input 
                                                type="checkbox" 
                                                id={oa.id} 
                                                checked={state.objetivosSeleccionados.includes(oa.id)} 
                                                onChange={() => onToggleItem('objetivosSeleccionados', oa.id)} 
                                                className="peer sr-only"
                                            />
                                            <span className="w-5 h-5 mt-px bg-white border-2 border-gray-300 rounded-md peer-checked:bg-primary-500 peer-checked:border-primary-500 relative flex-shrink-0 transition-colors">
                                                <CheckmarkIcon className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden peer-checked:block" />
                                            </span>
                                            <span className="ml-3">{`${oa.codigo}: ${oa.descripcion}`}</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    );
};
