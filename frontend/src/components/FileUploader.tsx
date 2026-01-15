'use client';

import { useState, useRef } from 'react';
import { uploadFiles, deleteFile } from '@/lib/api';

interface FileUploaderProps {
    uploadedFiles: string[];
    onFilesChange: (files: string[]) => void;
}

export default function FileUploader({ uploadedFiles, onFilesChange }: FileUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError('');
        setUploading(true);
        try {
            const fileArray = Array.from(files);
            const filenames = await uploadFiles(fileArray);
            onFilesChange([...uploadedFiles, ...filenames]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al subir archivos');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleRemoveFile = async (filename: string) => {
        try {
            await deleteFile(filename);
            onFilesChange(uploadedFiles.filter(f => f !== filename));
        } catch (err) {
            console.error('Error removing file:', err);
        }
    };

    return (
        <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Archivos Adjuntos</h3>
            </div>
            <div className="p-4 space-y-4">
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onClick={() => inputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-[#8B5A9B] bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                >
                    <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <div className="spinner" />
                            <span className="text-gray-500">Subiendo archivos...</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="text-[#8B5A9B]" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p className="text-gray-600"><span className="font-medium text-[#8B5A9B]">Clic para seleccionar</span> o arrastra</p>
                            <p className="text-sm text-gray-400 mt-1">PDF, DOC, XLS, imágenes (máx. 15MB)</p>
                        </>
                    )}
                </div>
                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                {uploadedFiles.length > 0 && (
                    <ul className="space-y-2">
                        {uploadedFiles.map((filename) => (
                            <li key={filename} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <span className="flex-1 text-sm text-gray-700 truncate">{filename}</span>
                                <button onClick={() => handleRemoveFile(filename)} className="p-1 text-gray-400 hover:text-red-500">✕</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
