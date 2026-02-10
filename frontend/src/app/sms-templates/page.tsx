'use client';

import { useState, useEffect } from 'react';
import { Template, getTemplates, deleteTemplate } from '@/lib/api';
import SMSTemplateModal from '@/components/SMSTemplateModal';

export default function SMSTemplatesPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await getTemplates({ channel: 'sms' });
            setTemplates(data);
        } catch (error) {
            console.error('Error loading SMS templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteTemplate(id);
            await loadTemplates();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Error al eliminar la plantilla');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingTemplate(null);
    };

    const handleSaved = () => {
        loadTemplates();
        handleCloseModal();
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPreviewText = (content: string, maxLength: number = 100) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center shadow-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Plantillas de SMS</h1>
                            <p className="text-gray-500">Gestiona tus plantillas de mensajes de texto</p>
                        </div>
                    </div>

                    {/* Search and Create */}
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Buscar plantillas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input pl-12"
                            />
                            <svg
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-glow whitespace-nowrap"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Nueva Plantilla SMS
                        </button>
                    </div>
                </div>

                {/* Templates Grid */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="spinner" style={{ width: '48px', height: '48px' }} />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8B5A9B" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            {searchTerm ? 'No se encontraron plantillas' : 'No hay plantillas SMS'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm
                                ? 'Intenta con otros términos de búsqueda'
                                : 'Crea tu primera plantilla de SMS para comenzar'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn btn-glow"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Crear Primera Plantilla
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
                            >
                                {/* Card Header */}
                                <div className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 border-b border-gray-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                                                {template.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                    SMS
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {template.content.length} caracteres
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6">
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">
                                            {getPreviewText(template.content, 150)}
                                        </p>
                                    </div>

                                    {/* Variables Badge */}
                                    {template.content.match(/\{\{(\w+)\}\}/g) && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-500 mb-2">Variables:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {Array.from(new Set(template.content.match(/\{\{(\w+)\}\}/g))).map((variable, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-block px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-mono"
                                                    >
                                                        {variable}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="flex-1 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium transition-all text-sm"
                                        >
                                            <svg className="inline-block mr-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Editar
                                        </button>
                                        {deleteConfirm === template.id ? (
                                            <div className="flex-1 flex gap-1">
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all text-sm"
                                                >
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="flex-1 px-3 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-all text-sm"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(template.id)}
                                                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm"
                                            >
                                                <svg className="inline-block" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <SMSTemplateModal
                    template={editingTemplate}
                    onClose={handleCloseModal}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
