'use client';

import { useState, useEffect } from 'react';
import { Template, getTemplates, deleteTemplate } from '@/lib/api';
import TemplateModal from '@/components/TemplateModal';

export default function EmailTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [deleting, setDeleting] = useState<number | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await getTemplates({ channel: 'email' });
            setTemplates(data);
        } catch (err) {
            console.error('Error loading email templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

        try {
            setDeleting(id);
            await deleteTemplate(id);
            await loadTemplates();
        } catch (err) {
            console.error('Error deleting template:', err);
            alert('Error al eliminar la plantilla');
        } finally {
            setDeleting(null);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setEditingTemplate(null);
    };

    const handleSaved = () => {
        loadTemplates();
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.subject || '').toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
    );

    const extractVariables = (text: string): string[] => {
        const regex = /\{(\w+)\}/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(text)) !== null) {
            if (!matches.includes(match[1])) {
                matches.push(match[1]);
            }
        }
        return matches;
    };

    return (
        <div className="p-6 lg:p-8 min-h-screen relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-[#00B4D8] opacity-5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-40 left-20 w-60 h-60 rounded-full bg-[#8B5A9B] opacity-5 blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        <span className="text-gradient">Plantillas</span> de Email
                    </h1>
                    <p className="text-gray-500 mt-1">Gestiona tus plantillas de correo electrónico</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-glow"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nueva Plantilla
                </button>
            </div>

            {/* Search */}
            <div className="mb-8 relative z-10">
                <div className="relative max-w-md">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Buscar plantillas..."
                        className="input pl-12"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 flex gap-4 relative z-10">
                <div className="stat-pill">
                    <span className="text-lg">📧</span>
                    <span>{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="spinner-glow" />
                        <span className="text-gray-500 font-medium">Cargando plantillas...</span>
                    </div>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="empty-state py-20">
                    <div className="w-24 h-24 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00B4D8" strokeWidth="1.5">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay plantillas</h3>
                    <p className="text-gray-500 mb-6">Crea tu primera plantilla de correo electrónico</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn btn-glow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Crear Plantilla
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                    {filteredTemplates.map((template, index) => (
                        <div
                            key={template.id}
                            className="card p-6 animate-fade-in group hover:shadow-lg transition-all"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg">
                                        📧
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                                        <span className="text-xs text-gray-400">Plantilla de email</span>
                                    </div>
                                </div>
                            </div>

                            {template.subject && (
                                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                                    <p className="text-sm text-blue-700 font-medium">📌 {template.subject}</p>
                                </div>
                            )}

                            {extractVariables(template.content).length > 0 && (
                                <div className="mb-4">
                                    <div className="flex flex-wrap gap-1">
                                        {extractVariables(template.content).map((varName, i) => (
                                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100 font-mono">
                                                {`{${varName}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setSelectedTemplate(template)}
                                    className="flex-1 btn btn-secondary text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Ver
                                </button>
                                <button
                                    onClick={() => handleEdit(template)}
                                    className="flex-1 btn btn-secondary text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(template.id)}
                                    disabled={deleting === template.id}
                                    className="btn btn-secondary text-sm text-red-600 hover:bg-red-50"
                                >
                                    {deleting === template.id ? (
                                        <div className="spinner" style={{ width: '16px', height: '16px' }} />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Detail Modal */}
            {selectedTemplate && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setSelectedTemplate(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
                        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-2xl">
                                        📧
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                                        <p className="text-sm text-gray-500">Plantilla de correo electrónico</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Subject */}
                            {selectedTemplate.subject && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Asunto</h3>
                                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                        <p className="text-blue-900 font-medium">{selectedTemplate.subject}</p>
                                    </div>
                                </div>
                            )}

                            {/* Content - Check if HTML */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">Vista Previa</h3>
                                {selectedTemplate.content.trim().startsWith('<!DOCTYPE html>') || selectedTemplate.content.trim().startsWith('<html') ? (
                                    <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                                        <iframe
                                            srcDoc={selectedTemplate.content}
                                            className="w-full h-[600px] border-0"
                                            title="Vista previa del email"
                                            sandbox="allow-same-origin"
                                        />
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{selectedTemplate.content}</p>
                                    </div>
                                )}
                            </div>

                            {/* Variables */}
                            {extractVariables(selectedTemplate.content).length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Variables disponibles</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {extractVariables(selectedTemplate.content).map((varName, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm font-mono">
                                                {`{${varName}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info */}
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">💡</span>
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Información sobre variables</p>
                                        <p className="text-blue-600">Las variables se reemplazan automáticamente con los datos del contacto al enviar el mensaje. Usa el formato {`{nombre_variable}`} en tu plantilla.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-between">
                            <button
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    handleEdit(selectedTemplate);
                                }}
                                className="btn btn-secondary"
                            >
                                Editar Plantilla
                            </button>
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="btn btn-glow"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <TemplateModal
                    template={editingTemplate}
                    onClose={handleModalClose}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
