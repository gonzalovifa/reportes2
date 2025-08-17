
import React, { useState } from 'react';
import { ChevronDownIcon } from './Icons';

// =================================================================
// Button
// =================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ variant = 'primary', size = 'md', children, ...props }, ref) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-primary-500'
  };

  return (
    <button ref={ref} className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`} {...props}>
      {children}
    </button>
  );
});
Button.displayName = 'Button';


// =================================================================
// Input
// =================================================================
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={`block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-sm placeholder:text-gray-400 ${className}`}
            {...props}
        />
    );
});
Input.displayName = 'Input';


// =================================================================
// Select
// =================================================================
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => {
    return (
        <div className="relative">
            <select
                ref={ref}
                className={`appearance-none block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-sm pr-10 ${className}`}
                {...props}
            >
                {children}
            </select>
            <ChevronDownIcon className="w-5 h-5 text-gray-500 absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none" />
        </div>
    );
});
Select.displayName = 'Select';


// =================================================================
// Form Field Wrapper
// =================================================================
interface FormFieldProps {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}
export const FormField: React.FC<FormFieldProps> = ({ label, htmlFor, children }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);


// =================================================================
// Modal
// =================================================================
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <div className="mt-4 text-sm text-gray-600">
                        {children}
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                    {footer !== undefined ? footer : <Button variant="secondary" onClick={onClose}>Cerrar</Button>}
                </div>
            </div>
        </div>
    );
};


// =================================================================
// Accordion
// =================================================================
interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    isOpen?: boolean;
    onToggle?: () => void;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, isOpen, onToggle }) => (
    <div className="border-b">
        <h3>
            <button
                type="button"
                className="flex w-full items-center justify-between p-5 font-medium text-left text-gray-700 hover:bg-gray-100"
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <ChevronDownIcon className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        </h3>
        <div className={`p-5 border-t ${!isOpen ? 'hidden' : ''}`}>
            {children}
        </div>
    </div>
);


interface AccordionProps {
    children: React.ReactElement<AccordionItemProps> | React.ReactElement<AccordionItemProps>[];
}
export const Accordion: React.FC<AccordionProps> & { Item: React.FC<AccordionItemProps> } = ({ children }) => {
    const [openIndex, setOpenIndex] = useState(0);

    return (
        <div className="border rounded-lg shadow-sm bg-white">
            {React.Children.map(children, (child, index) =>
                React.cloneElement(child, {
                    isOpen: index === openIndex,
                    onToggle: () => setOpenIndex(index === openIndex ? -1 : index),
                })
            )}
        </div>
    );
};
Accordion.Item = AccordionItem;


// =================================================================
// Tooltip
// =================================================================
interface TooltipProps {
  children: React.ReactNode;
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, text, className, style }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={`relative ${className || 'inline-block'}`}
      style={style}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <span
          className="absolute z-10 w-max max-w-xs px-2 py-1 text-xs text-white bg-gray-800 rounded-md shadow-lg bottom-full mb-2 left-1/2 -translate-x-1/2"
        >
          {text}
        </span>
      )}
    </div>
  );
};
