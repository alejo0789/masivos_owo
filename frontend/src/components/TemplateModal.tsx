'use client';

import { useState } from 'react';
import { Template, createTemplate, updateTemplate } from '@/lib/api';

interface TemplateModalProps {
    template?: Template | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function TemplateModal({ template, onClose, onSaved }: TemplateModalProps) {
    const [name, setName] = useState(template?.name || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [content, setContent] = useState(template?.content || '');
    const [channel, setChannel] = useState<'whatsapp' | 'email' | 'both'>(template?.channel || 'both');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const isEditing = !!template;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !content.trim()) {
            setError('Nombre y contenido son obligatorios');
            return;
        }
        setError('');
        setSaving(true);
        try {
            if (isEditing) {
                await updateTemplate(template.id, { name, subject, content, channel });
            } else {
                await createTemplate({ name, subject, content, channel });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content w-full max-w-lg animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-purple-100" style={{
                    background: 'linear-gradient(135deg, rgba(139, 90, 155, 0.08) 0%, rgba(0, 180, 216, 0.04) 100%)'
                }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}
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
                        <label className="label">Nombre de la plantilla</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Ej: Bienvenida nuevos clientes"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Channel Selection */}
                    <div>
                        <label className="label">Canal de envío</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'whatsapp', label: '📱 WhatsApp', color: '#25D366', bg: 'rgba(37, 211, 102, 0.1)' },
                                { value: 'email', label: '📧 Email', color: '#00B4D8', bg: 'rgba(0, 180, 216, 0.1)' },
                                { value: 'both', label: '🔄 Ambos', color: '#8B5A9B', bg: 'rgba(139, 90, 155, 0.1)' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setChannel(option.value as 'whatsapp' | 'email' | 'both')}
                                    className="flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all"
                                    style={{
                                        background: channel === option.value ? option.bg : 'white',
                                        border: `2px solid ${channel === option.value ? option.color : '#E5E7EB'}`,
                                        color: channel === option.value ? option.color : '#6B7280',
                                        boxShadow: channel === option.value ? `0 4px 12px ${option.bg}` : 'none'
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject (for email) */}
                    {(channel === 'email' || channel === 'both') && (
                        <div className="animate-fade-in">
                            <label className="label">Asunto del correo</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ej: ¡Tenemos noticias para ti!"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div>
                        <label className="label">Contenido del mensaje</label>
                        <textarea
                            className="textarea"
                            rows={5}
                            placeholder="Escribe el contenido de tu plantilla aquí... ✨"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            💡 Variables disponibles: <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{primer_nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{email}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{telefono}'}</code>
                        </p>
                    </div>

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
