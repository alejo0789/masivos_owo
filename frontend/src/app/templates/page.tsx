'use client';

import { useState, useEffect } from 'react';
import { WhatsAppTemplate, getWhatsAppTemplates } from '@/lib/api';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'APPROVED' | 'PENDING' | 'REJECTED'>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

    useEffect(() => {
        loadTemplates();
    }, [statusFilter]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const response = await getWhatsAppTemplates(statusFilter === 'all' ? undefined : statusFilter);
            if (response.success) {
                setTemplates(response.templates);
            }
        } catch (err) {
            console.error('Error loading WhatsApp templates:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.body?.text || '').toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="badge badge-success">✓ Aprobada</span>;
            case 'PENDING': return <span className="badge badge-warning">⏳ Pendiente</span>;
            case 'REJECTED': return <span className="badge badge-error">✗ Rechazada</span>;
            default: return <span className="badge">{status}</span>;
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'MARKETING': return <span className="badge badge-purple">📢 Marketing</span>;
            case 'UTILITY': return <span className="badge badge-info">🔧 Utilidad</span>;
            case 'AUTHENTICATION': return <span className="badge badge-warning">🔐 Auth</span>;
            default: return <span className="badge">{category}</span>;
        }
    };

    const extractVariables = (text: string): string[] => {
        const regex = /\{\{(\w+)\}\}/g;
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
            <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-[#25D366] opacity-5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-40 left-20 w-60 h-60 rounded-full bg-[#8B5A9B] opacity-5 blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        <span className="text-gradient">Plantillas</span> de WhatsApp
                    </h1>
                    <p className="text-gray-500 mt-1">Plantillas de mensajes cargadas desde WhatsApp Business API</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadTemplates}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="spinner" style={{ width: '18px', height: '18px' }} />
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6" />
                                    <path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Actualizar
                            </>
                        )}
                    </button>
                    <a
                        href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-glow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Gestionar en Meta
                    </a>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4 relative z-10">
                <div className="relative flex-1 max-w-md">
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
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'Todas' },
                        { value: 'APPROVED', label: '✓ Aprobadas' },
                        { value: 'PENDING', label: '⏳ Pendientes' },
                        { value: 'REJECTED', label: '✗ Rechazadas' },
                    ].map((status) => (
                        <button
                            key={status.value}
                            onClick={() => setStatusFilter(status.value as typeof statusFilter)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${statusFilter === status.value
                                    ? 'bg-[#8B5A9B] text-white'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#8B5A9B]'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 flex gap-4 relative z-10">
                <div className="stat-pill">
                    <span className="text-lg">📋</span>
                    <span>{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="stat-pill" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }}>
                    <span className="text-lg">✅</span>
                    <span className="text-green-700">{templates.filter(t => t.status === 'APPROVED').length} aprobadas</span>
                </div>
                <div className="stat-pill" style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.2)' }}>
                    <span className="text-lg">⏳</span>
                    <span className="text-amber-700">{templates.filter(t => t.status === 'PENDING').length} pendientes</span>
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="spinner-glow" />
                        <span className="text-gray-500 font-medium">Cargando plantillas de WhatsApp...</span>
                    </div>
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="empty-state py-20">
                    <div className="w-24 h-24 rounded-2xl bg-green-50 flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.5">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No hay plantillas</h3>
                    <p className="text-gray-500 mb-6">Crea plantillas desde el panel de WhatsApp Business</p>
                    <a
                        href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-glow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Crear en Meta Business
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                    {filteredTemplates.map((template, index) => (
                        <div
                            key={template.id}
                            className="card p-6 animate-fade-in group cursor-pointer hover:shadow-lg transition-all"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => setSelectedTemplate(template)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg ${template.status === 'APPROVED' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                            template.status === 'PENDING' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                'bg-gradient-to-br from-red-400 to-red-600'
                                        }`}>
                                        📱
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                                        <span className="text-xs text-gray-400">{template.language}</span>
                                    </div>
                                </div>
                                {getStatusBadge(template.status)}
                            </div>

                            {template.header?.text && (
                                <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <p className="text-sm text-gray-700">📌 {template.header.text}</p>
                                </div>
                            )}

                            <p className="text-sm text-gray-500 line-clamp-3 mb-4 leading-relaxed">
                                {template.body?.text || 'Sin contenido de cuerpo'}
                            </p>

                            {template.footer?.text && (
                                <p className="text-xs text-gray-400 italic mb-3">
                                    {template.footer.text}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-4">
                                {getCategoryBadge(template.category)}
                                {template.variables.length > 0 && (
                                    <span className="badge badge-purple text-xs">
                                        🔤 {template.variables.reduce((acc, v) => acc + v.count, 0)} variable(s)
                                    </span>
                                )}
                            </div>

                            {template.buttons.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {template.buttons.map((btn, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                            {btn.type === 'URL' ? '🔗' : btn.type === 'PHONE_NUMBER' ? '📞' : '⚡'} {btn.text}
                                        </span>
                                    ))}
                                </div>
                            )}
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
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl ${selectedTemplate.status === 'APPROVED' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                                            selectedTemplate.status === 'PENDING' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                                                'bg-gradient-to-br from-red-400 to-red-600'
                                        }`}>
                                        📱
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                                        <p className="text-sm text-gray-500">{selectedTemplate.language} • {selectedTemplate.category}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="flex gap-2 mt-4">
                                {getStatusBadge(selectedTemplate.status)}
                                {getCategoryBadge(selectedTemplate.category)}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Preview */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vista previa del mensaje</h3>
                                <div className="bg-[#E5DDD5] rounded-xl p-4">
                                    <div className="bg-white rounded-xl p-4 max-w-sm shadow-sm" style={{ borderRadius: '0 12px 12px 12px' }}>
                                        {selectedTemplate.header?.text && (
                                            <p className="font-bold text-gray-900 mb-2">{selectedTemplate.header.text}</p>
                                        )}
                                        <p className="text-gray-800 whitespace-pre-wrap">{selectedTemplate.body?.text}</p>
                                        {selectedTemplate.footer?.text && (
                                            <p className="text-xs text-gray-400 mt-3">{selectedTemplate.footer.text}</p>
                                        )}
                                        {selectedTemplate.buttons.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                                {selectedTemplate.buttons.map((btn, i) => (
                                                    <div key={i} className="text-center py-2 text-blue-500 font-medium text-sm">
                                                        {btn.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Variables */}
                            {extractVariables(selectedTemplate.body?.text || '').length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Variables requeridas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {extractVariables(selectedTemplate.body?.text || '').map((varName, i) => (
                                            <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 text-sm font-mono">
                                                {`{{${varName}}}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Buttons */}
                            {selectedTemplate.buttons.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Botones</h3>
                                    <div className="space-y-2">
                                        {selectedTemplate.buttons.map((btn, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                                                <span className="text-lg">
                                                    {btn.type === 'URL' ? '🔗' : btn.type === 'PHONE_NUMBER' ? '📞' : '⚡'}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-900">{btn.text}</p>
                                                    {btn.url && <p className="text-xs text-gray-500">{btn.url}</p>}
                                                    {btn.phone_number && <p className="text-xs text-gray-500">{btn.phone_number}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Info */}
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">💡</span>
                                    <div className="text-sm text-blue-800">
                                        <p className="font-medium mb-1">Información sobre plantillas</p>
                                        <p className="text-blue-600">Las plantillas deben ser aprobadas por Meta antes de poder usarse. Los cambios se gestionan desde el panel de WhatsApp Business.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-between">
                            <a
                                href={`https://business.facebook.com/latest/whatsapp_manager/message_templates`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                            >
                                Editar en Meta
                            </a>
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
        </div>
    );
}
