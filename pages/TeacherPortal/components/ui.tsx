
import React from 'react';
import { getAchievementLevel } from '../lib/utils';

export const StatCard: React.FC<{
    label: string;
    value?: string | number;
    valueColor?: string;
    footer?: string;
    children?: React.ReactNode;
    icon?: React.FC<{ className?: string }>;
}> = ({ label, value, valueColor = 'text-gray-900', footer, children, icon: Icon }) => (
    <div className="bg-white p-5 rounded-xl shadow-md ring-1 ring-gray-900/5 flex flex-col justify-between h-full">
        <div>
            <div className="flex items-center gap-2 text-gray-500">
                {Icon && <Icon className="w-5 h-5" />}
                <p className="text-sm font-semibold">{label}</p>
            </div>
            {value !== undefined && <p className={`text-4xl font-bold ${valueColor} mt-2`}>{value}</p>}
            {children}
        </div>
        {footer && <p className="text-xs text-gray-500 mt-3">{footer}</p>}
    </div>
);


export const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    const level = getAchievementLevel(percentage);
    
    return (
        <div className="w-full bg-gray-200 rounded-full h-4">
            <div
                className="h-4 rounded-full transition-all duration-500"
                style={{ 
                    width: `${Math.max(0, Math.min(100, percentage))}%`,
                    backgroundColor: level.color
                }}
            ></div>
        </div>
    );
};


export const StrengthWeaknessList: React.FC<{ title: string; items: {name: string, percentage: number}[]; color: 'green' | 'yellow'; }> = ({ title, items, color }) => {
    const bgColor = color === 'green' ? 'bg-green-50' : 'bg-yellow-50'; const textColor = color === 'green' ? 'text-green-800' : 'text-yellow-800';
    return (<div className={`${bgColor} p-4 rounded-lg`}><h4 className={`font-semibold ${textColor} mb-3`}>{title}</h4>{items.length > 0 ? (<ul className="space-y-2 text-sm text-gray-700">{items.map(item => (<li key={item.name} className="flex items-start gap-3"><span className={`font-bold w-14 text-right ${textColor}`}>{item.percentage.toFixed(0)}%</span><span>{item.name}</span></li>))}</ul>) : (<p className="text-sm text-gray-500 italic">No se identificaron OAs específicos en esta categoría.</p>)}</div>);
};

export const RecommendationBlock: React.FC<{title: string; items: string[], color: 'blue' | 'green' | 'purple'}> = ({ title, items, color }) => {
    const colorClasses = { blue: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' }, green: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' }, purple: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' }, }[color];
    return (<div className={`${colorClasses.bg} p-4 rounded-lg border ${colorClasses.border}`}><h4 className={`font-bold ${colorClasses.text} mb-2`}>{title}</h4><ul className="space-y-2 list-disc list-inside text-sm text-gray-700">{items.map((rec, index) => <li key={index}>{rec}</li>)}</ul></div>)
};