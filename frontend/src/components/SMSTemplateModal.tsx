'use client';

import { useState, useEffect } from 'react';
import { Template, createTemplate, updateTemplate } from '@/lib/api';

interface SMSTemplateModalProps {
    template?: Template | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function SMSTemplateModal({ template, onClose, onSaved }: SMSTemplateModalProps) {
    const [name, setName] = useState(template?.name || '');
    const [content, setContent] = useState(template?.content || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [charCount, setCharCount] = useState(0);

    const isEditing = !!template;
    const MAX_SMS_LENGTH = 1600; // Standard SMS length limit

    useEffect(() => {
        if (template?.content) {
            setContent(template.content);
            setCharCount(template.content.length);
        }
    }, [template]);

    const handleContentChange = (value: string) => {
        // Remove emojis and special characters that might not work in SMS
        const sanitized = value.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        setContent(sanitized);
        setCharCount(sanitized.length);
    };

    const insertVariable = (variable: string) => {
        const newContent = content + `{{${variable}}}`;
        handleContentChange(newContent);
    };

    const insertLink = () => {
        const link = prompt('Ingresa la URL del enlace:');
        if (link) {
            // Basic URL validation
            const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
            if (urlPattern.test(link)) {
                const fullLink = link.startsWith('http') ? link : `https://${link}`;
                const newContent = content + ` ${fullLink}`;
                handleContentChange(newContent);
            } else {
                alert('URL inválida. Por favor ingresa una URL válida.');
            }
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!name.trim() || !content.trim()) {
            setError('Nombre y contenido son obligatorios');
            return;
        }

        if (content.length > MAX_SMS_LENGTH) {
            setError(`El mensaje es demasiado largo. Máximo ${MAX_SMS_LENGTH} caracteres.`);
            return;
        }

        setError('');
        setSaving(true);
        try {
            if (isEditing) {
                await updateTemplate(template.id, { name, content, channel: 'sms' });
            } else {
                await createTemplate({ name, content, channel: 'sms' });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const getSMSCount = () => {
        // SMS is typically 160 chars per message, but we allow longer messages
        return Math.ceil(charCount / 160);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content w-full max-w-2xl animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-purple-100" style={{
                    background: 'linear-gradient(135deg, rgba(139, 90, 155, 0.08) 0%, rgba(0, 180, 216, 0.04) 100%)'
                }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEditing ? 'Editar Plantilla de SMS' : 'Nueva Plantilla de SMS'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {isEditing ? 'Modifica los detalles de tu plantilla' : 'Crea una plantilla reutilizable'}
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error message */}
                    {error && (
                        <div className="p-4 rounded-xl flex items-center gap-3 animate-fade-in bg-red-50 border border-red-200">
                            <span className="text-xl">⚠️</span>
                            <p className="text-red-600 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="label">Nombre de la plantilla <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ej: Recordatorio de cita"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Info Box */}
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">ℹ️</span>
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Plantilla de SMS</p>
                                <p className="text-blue-600">
                                    Solo texto y enlaces permitidos. No se permiten emojis ni caracteres especiales.
                                    Las variables personalizadas se escriben entre llaves dobles: {'{{'} nombre {'}}'}.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Insert Buttons */}
                    <div>
                        <label className="label">Herramientas rápidas</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => insertVariable('nombre')}
                                className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all text-sm text-purple-700 font-medium"
                            >
                                + Nombre
                            </button>
                            <button
                                type="button"
                                onClick={() => insertVariable('primer_nombre')}
                                className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all text-sm text-purple-700 font-medium"
                            >
                                + Primer Nombre
                            </button>
                            <button
                                type="button"
                                onClick={() => insertVariable('telefono')}
                                className="px-3 py-2 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-all text-sm text-purple-700 font-medium"
                            >
                                + Teléfono
                            </button>
                            <button
                                type="button"
                                onClick={insertLink}
                                className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all text-sm text-blue-700 font-medium"
                            >
                                🔗 Insertar Enlace
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <label className="label">
                            Contenido del SMS <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            className="input min-h-[200px] resize-y font-mono text-sm"
                            placeholder="Escribe tu mensaje aquí... Usa {{nombre}}, {{primer_nombre}}, {{telefono}} para variables personalizadas."
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            maxLength={MAX_SMS_LENGTH}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-gray-500">
                                💡 Variables disponibles: <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{primer_nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{telefono}'}</code>
                            </p>
                            <div className="flex items-center gap-4">
                                <span className={`text-sm font-medium ${charCount > MAX_SMS_LENGTH ? 'text-red-600' : 'text-gray-600'}`}>
                                    {charCount} / {MAX_SMS_LENGTH}
                                </span>
                                <span className="text-xs text-gray-500">
                                    ≈ {getSMSCount()} SMS
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    {content && (
                        <div>
                            <label className="label">Vista previa</label>
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                                    {content.replace(/\{\{(\w+)\}\}/g, (_, key) => `[${key.toUpperCase()}]`)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn btn-glow"
                        >
                            {saving ? (
                                <div className="spinner" style={{ width: '18px', height: '18px' }} />
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    {isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
