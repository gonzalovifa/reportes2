
import React, { useState, useRef } from 'react';
import type { ConfiguracionEvaluacion } from '../types';
import { Button, Modal } from '../components/UI';
import { PlusIcon, PencilIcon, TrashIcon, UploadIcon, ArrowDownTrayIcon } from '../components/Icons';

interface AdminPortalProps {
  configurations: ConfiguracionEvaluacion[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onImport: (configs: ConfiguracionEvaluacion[]) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ configurations, onEdit, onDelete, onCreate, onImport }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openDeleteModal = (id: string) => {
    setConfigToDelete(id);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setConfigToDelete(null);
    setIsModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (configToDelete) {
      onDelete(configToDelete);
    }
    closeDeleteModal();
  };

  const handleExport = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(configurations, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "graderight-configuraciones.json";
    link.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const inputElement = event.target;

    if (!file) {
      if (inputElement) inputElement.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const importedConfigs = JSON.parse(text);
          // Validation: ensure it's an array of objects with id and nombre
          if (Array.isArray(importedConfigs) && importedConfigs.every(c => typeof c === 'object' && c !== null && c.id && c.nombre)) {
              onImport(importedConfigs);
          } else {
            throw new Error("El archivo no contiene un array de configuraciones válido.");
          }
        }
      } catch (error) {
        console.error("Error al importar el archivo:", error);
        alert(`Error al importar el archivo: ${error instanceof Error ? error.message : 'Formato incorrecto.'}`);
      }
    };
    reader.onerror = () => {
        alert('Error al leer el archivo.');
    }
    reader.readAsText(file);

    if (inputElement) {
        inputElement.value = '';
    }
  };
  
  const configBeingDeleted = configurations.find(c => c.id === configToDelete);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Portal de Administración</h1>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            className="hidden"
            accept=".json"
          />
          <Button variant="secondary" onClick={handleImportClick}>
            <UploadIcon className="w-5 h-5 mr-2" />
            Importar
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={configurations.length === 0}>
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Exportar
          </Button>
          <Button onClick={onCreate}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Crear Nueva
          </Button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Nombre</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Asignatura</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha Creación</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Nº Preguntas</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {configurations.map((config) => (
                    <tr key={config.id}>
                      <td className="whitespace-nowrap py-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{config.nombre}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{config.asignatura}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{config.fecha}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{config.numeroPreguntas}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.estado === 'Completa' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {config.estado}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                        <button onClick={() => onEdit(config.id)} className="text-primary-600 hover:text-primary-900"><PencilIcon className="w-5 h-5"/></button>
                        <button onClick={() => openDeleteModal(config.id)} className="text-red-600 hover:text-red-900"><TrashIcon className="w-5 h-5"/></button>
                      </td>
                    </tr>
                  ))}
                   {configurations.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No hay configuraciones creadas. ¡Cree una para comenzar o importe un archivo!
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeDeleteModal} title="Confirmar Eliminación">
        <p>¿Está seguro de que desea eliminar la configuración "<strong>{configBeingDeleted?.nombre}</strong>"? Esta acción no se puede deshacer.</p>
        <div className="mt-6 flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeDeleteModal}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
};
