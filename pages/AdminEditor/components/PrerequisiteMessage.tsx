
import React from 'react';
import { LockClosedIcon } from '../../../components/Icons';

interface PrerequisiteMessageProps {
    message: string;
}

export const PrerequisiteMessage: React.FC<PrerequisiteMessageProps> = ({ message }) => (
    <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50 rounded-lg p-8">
        <LockClosedIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">Sección Bloqueada</h3>
        <p className="mt-2 text-gray-500">{message}</p>
    </div>
);
