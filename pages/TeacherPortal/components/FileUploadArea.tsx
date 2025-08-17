
import React, { useState } from 'react';
import { UploadIcon, CheckCircleIcon } from '../../../components/Icons';

interface FileUploadAreaProps {
  onFileAccepted: (file: File) => void;
  file: File | null;
  disabled?: boolean;
}
export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileAccepted, file, disabled=false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { if(!disabled) {e.preventDefault(); e.stopPropagation(); setIsDragging(true); }};
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { if(!disabled) {e.preventDefault(); e.stopPropagation(); setIsDragging(false); }};
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { if(!disabled) {e.preventDefault(); e.stopPropagation(); }};
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { if(!disabled) {e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) { onFileAccepted(e.dataTransfer.files[0]); } }};
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (!disabled && e.target.files && e.target.files.length > 0) { onFileAccepted(e.target.files[0]); } };
  
  return (
    <div className={`mt-1 flex flex-col justify-center items-center rounded-lg border-2 border-dashed ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300'} p-6 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      {file ? (
          <div className="text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-2 text-lg font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
      ) : (
          <div className="space-y-1 text-center">
              <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className={`relative cursor-pointer rounded-md bg-white font-medium text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${disabled ? 'text-gray-400' : 'hover:text-primary-500'}`}>
                      <span>Cargar un archivo</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls, .csv" disabled={disabled} />
                  </label>
                  <p className="pl-1">o arrastrar y soltar</p>
              </div>
              <p className="text-xs text-gray-500">XLSX, XLS, CSV</p>
          </div>
      )}
    </div>
  );
};