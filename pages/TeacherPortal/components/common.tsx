
import React from 'react';

export const MenuIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);

const GradeRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className || 'h-8 w-8 text-primary-600'} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.697 50.697 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
);

export const GradeRightLogo: React.FC<{onClick?: () => void}> = ({onClick}) => (
    <div className="flex items-center space-x-2" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <GradeRightIcon className="h-8 w-8 text-primary-600" />
        <span className="text-2xl font-bold text-gray-800">GradeRight</span>
    </div>
);

const HeaderLogo: React.FC = () => (
    <div className="font-montserrat font-black text-xl tracking-tighter">
      <span className="text-brand-aqua">APRENDO</span>
      <span className="text-brand-orange">CREANDO</span>
    </div>
);

export const SidebarHeader: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
    <div className={`h-full flex items-center ${isOpen ? 'justify-start' : 'justify-center'}`}>
        {isOpen ? (
            <div>
                <HeaderLogo />
                <div className="mt-2">
                    <div className="flex items-center space-x-1">
                        <GradeRightIcon className="h-6 w-6 text-primary-600"/>
                        <span className="text-lg font-bold text-gray-800">GradeRight</span>
                    </div>
                </div>
            </div>
        ) : (
            <GradeRightIcon className="h-8 w-8 text-primary-600"/>
        )}
    </div>
);

export const ReportSection: React.FC<{ children: React.ReactNode, title?: string, actions?: React.ReactNode, className?: string }> = ({ children, title, actions, className = '' }) => (
    <div className={`bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-200 ${className}`}>
        {(title || actions) && (
            <div className="flex justify-between items-center mb-4">
                {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
                {actions && <div>{actions}</div>}
            </div>
        )}
        {children}
    </div>
);

export const ACHIEVEMENT_LEVELS = {
  DESTACADO: { name: 'Destacado', min: 90, color: '#3b82f6', textColor: 'text-blue-800', bgColor: 'bg-blue-100', description: 'El estudiante demuestra un dominio sobresaliente de los conocimientos y habilidades evaluados.', range: '90% - 100%' },
  ADECUADO: { name: 'Adecuado', min: 70, color: '#16a34a', textColor: 'text-green-800', bgColor: 'bg-green-100', description: 'El estudiante demuestra un dominio sólido de la mayoría de los conocimientos y habilidades evaluados.', range: '70% - 89.9%' },
  ELEMENTAL: { name: 'Elemental', min: 40, color: '#f97316', textColor: 'text-orange-800', bgColor: 'bg-orange-100', description: 'El estudiante demuestra un dominio parcial o básico de los conocimientos y habilidades evaluados. Requiere apoyo para alcanzar todos los objetivos.', range: '40% - 69.9%' },
  INSUFICIENTE: { name: 'Insuficiente', min: 0, color: '#ef4444', textColor: 'text-red-800', bgColor: 'bg-red-100', description: 'El estudiante aún no alcanza el dominio de los conocimientos y habilidades evaluados. Requiere apoyo y reforzamiento significativo.', range: '0% - 39.9%' },
};
