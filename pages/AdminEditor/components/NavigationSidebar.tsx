
import React from 'react';
import { Tooltip } from '../../../components/UI';
import { 
    CalendarDaysIcon, 
    ViewfinderCircleIcon, 
    CpuChipIcon, 
    TableCellsIcon, 
    BookOpenIcon,
    CheckCircleIcon,
    LockClosedIcon
} from '../../../components/Icons';

interface Section {
    id: string;
    label: string;
    isComplete: boolean;
    isLocked: boolean;
    prerequisite: string;
}

interface NavigationSidebarProps {
    sections: Section[];
    activeSection: string;
    setActiveSection: (sectionId: string) => void;
}

const sectionIcons: { [key: string]: React.FC<{ className?: string }> } = {
    datos: CalendarDaysIcon,
    objetivos: ViewfinderCircleIcon,
    habilidades: CpuChipIcon,
    matriz: TableCellsIcon,
    claves: BookOpenIcon,
};

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ sections, activeSection, setActiveSection }) => {
    return (
        <aside className="w-1/4 xl:w-1/5 flex-shrink-0">
            <div className="bg-white p-4 rounded-lg shadow-sm h-full">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-3 pb-2 border-b mb-2">Secciones</h2>
                <nav className="flex flex-col gap-1">
                    {sections.map(section => {
                        const Icon = sectionIcons[section.id];
                        const isCurrent = activeSection === section.id;
                        const buttonContent = (
                            <button
                                key={section.id}
                                disabled={section.isLocked}
                                onClick={() => setActiveSection(section.id)}
                                className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                                    isCurrent 
                                    ? 'bg-primary-50 text-primary-700' 
                                    : section.isLocked 
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <Icon className={`w-5 h-5 ${isCurrent ? 'text-primary-600' : 'text-gray-400'}`} />
                                <span className="flex-grow">{section.label}</span>
                                {section.isComplete ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : section.isLocked ? <LockClosedIcon className="w-5 h-5 text-gray-400" /> : null}
                            </button>
                        );
                        return section.isLocked ? (
                            <Tooltip key={section.id} text={section.prerequisite}>{buttonContent}</Tooltip>
                        ) : (
                            buttonContent
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
};
