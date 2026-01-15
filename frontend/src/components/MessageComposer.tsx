'use client';

import { useState, useEffect } from 'react';
import { WhatsAppTemplate, getApprovedWhatsAppTemplates } from '@/lib/api';

interface MessageComposerProps {
    subject: string;
    content: string;
    channel: 'whatsapp' | 'email' | 'both';
    selectedTemplate?: WhatsAppTemplate | null;
    onSubjectChange: (subject: string) => void;
    onContentChange: (content: string) => void;
    onChannelChange: (channel: 'whatsapp' | 'email' | 'both') => void;
    onTemplateSelect?: (template: WhatsAppTemplate | null) => void;
}

export default function MessageComposer({
    subject,
    content,
    channel,
    selectedTemplate,
    onSubjectChange,
    onContentChange,
    onChannelChange,
    onTemplateSelect,
}: MessageComposerProps) {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

    const loadTemplates = async () => {
        if (templates.length > 0) {
            setShowTemplates(!showTemplates);
            return;
        }

        try {
            setLoadingTemplates(true);
            const response = await getApprovedWhatsAppTemplates();
            if (response.success) {
                setTemplates(response.templates);
            }
            setShowTemplates(true);
        } catch (err) {
            console.error('Error loading WhatsApp templates:', err);
        } finally {
            setLoadingTemplates(false);
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

    const applyTemplate = (template: WhatsAppTemplate) => {
        // Set the template content
        const bodyText = template.body?.text || '';
        onContentChange(bodyText);

        // Extract variables from the template
        const vars = extractVariables(bodyText);
        const initialVars: Record<string, string> = {};
        vars.forEach(v => {
            initialVars[v] = '';
        });
        setTemplateVariables(initialVars);

        // Notify parent about selected template
        if (onTemplateSelect) {
            onTemplateSelect(template);
        }

        // For WhatsApp templates, set channel to whatsapp
        onChannelChange('whatsapp');
        setShowTemplates(false);
    };

    const handleVariableChange = (varName: string, value: string) => {
        const newVars = { ...templateVariables, [varName]: value };
        setTemplateVariables(newVars);

        // Update content with replaced variables
        if (selectedTemplate?.body?.text) {
            let newContent = selectedTemplate.body.text;
            Object.entries(newVars).forEach(([key, val]) => {
                newContent = newContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `{{${key}}}`);
            });
            onContentChange(newContent);
        }
    };

    const clearTemplate = () => {
        if (onTemplateSelect) {
            onTemplateSelect(null);
        }
        setTemplateVariables({});
        onContentChange('');
    };

    const characterCount = content.length;
    const smsSegments = Math.ceil(characterCount / 160);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <span className="badge badge-success text-xs">✓ Aprobada</span>;
            case 'PENDING': return <span className="badge badge-warning text-xs">⏳ Pendiente</span>;
            case 'REJECTED': return <span className="badge badge-error text-xs">✗ Rechazada</span>;
            default: return null;
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'MARKETING': return <span className="badge badge-purple text-xs">📢 Marketing</span>;
            case 'UTILITY': return <span className="badge badge-info text-xs">🔧 Utilidad</span>;
            case 'AUTHENTICATION': return <span className="badge badge-warning text-xs">🔐 Auth</span>;
            default: return <span className="badge text-xs">{category}</span>;
        }
    };

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Componer Mensaje</h3>
                    <button
                        onClick={loadTemplates}
                        className="btn btn-secondary text-sm py-2 px-3"
                        disabled={loadingTemplates}
                    >
                        {loadingTemplates ? (
                            <div className="spinner" />
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                </svg>
                                Plantillas WhatsApp
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* WhatsApp Templates Dropdown */}
            {showTemplates && templates.length > 0 && (
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">
                            📱 Plantillas de WhatsApp Business ({templates.length})
                        </p>
                        <button
                            onClick={() => setShowTemplates(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {templates.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => applyTemplate(template)}
                                className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all shadow-sm"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-900">{template.name}</span>
                                    <div className="flex gap-2">
                                        {getCategoryBadge(template.category)}
                                        {getStatusBadge(template.status)}
                                    </div>
                                </div>
                                {template.header?.text && (
                                    <p className="text-xs text-gray-400 mb-1">📌 {template.header.text}</p>
                                )}
                                <p className="text-sm text-gray-600 line-clamp-2">{template.body?.text}</p>
                                {template.variables.length > 0 && (
                                    <div className="mt-2 flex items-center gap-1">
                                        <span className="text-xs text-purple-600">
                                            🔤 {template.variables.reduce((acc, v) => acc + v.count, 0)} variable(s)
                                        </span>
                                    </div>
                                )}
                                <div className="mt-2 text-xs text-gray-400">
                                    🌐 {template.language}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Selected Template Info */}
            {selectedTemplate && (
                <div className="p-4 border-b border-gray-200 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📱</span>
                            <span className="font-semibold text-green-800">Plantilla: {selectedTemplate.name}</span>
                            {getCategoryBadge(selectedTemplate.category)}
                        </div>
                        <button
                            onClick={clearTemplate}
                            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            Quitar
                        </button>
                    </div>

                    {/* Variables Input */}
                    {Object.keys(templateVariables).length > 0 && (
                        <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700">Variables del mensaje:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.keys(templateVariables).map((varName) => (
                                    <div key={varName} className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600 min-w-[80px]">
                                            {`{{${varName}}}`}:
                                        </label>
                                        <input
                                            type="text"
                                            className="input py-1 px-2 text-sm flex-1"
                                            placeholder={`Valor para ${varName}`}
                                            value={templateVariables[varName]}
                                            onChange={(e) => handleVariableChange(varName, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Channel Selection */}
                <div>
                    <label className="label">Canal de Envío</label>
                    <div className="flex gap-2">
                        {[
                            { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
                            { value: 'email', label: 'Email', icon: '📧' },
                            { value: 'both', label: 'Ambos', icon: '🔄' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onChannelChange(option.value as 'whatsapp' | 'email' | 'both')}
                                disabled={selectedTemplate && option.value !== 'whatsapp'}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${channel === option.value
                                        ? 'border-[#8B5A9B] bg-purple-50 text-[#8B5A9B]'
                                        : selectedTemplate && option.value !== 'whatsapp'
                                            ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                            >
                                <span>{option.icon}</span>
                                <span className="font-medium">{option.label}</span>
                            </button>
                        ))}
                    </div>
                    {selectedTemplate && (
                        <p className="text-xs text-amber-600 mt-2">
                            ⚠️ Las plantillas de WhatsApp solo pueden enviarse por WhatsApp
                        </p>
                    )}
                </div>

                {/* Subject (only for email) */}
                {(channel === 'email' || channel === 'both') && !selectedTemplate && (
                    <div className="animate-fade-in">
                        <label className="label">Asunto del Email</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Escribe el asunto del correo..."
                            value={subject}
                            onChange={(e) => onSubjectChange(e.target.value)}
                        />
                    </div>
                )}

                {/* Message Content */}
                <div>
                    <label className="label">
                        {selectedTemplate ? 'Vista previa del mensaje' : 'Contenido del Mensaje'}
                    </label>
                    <textarea
                        className={`textarea ${selectedTemplate ? 'bg-gray-50' : ''}`}
                        placeholder="Escribe tu mensaje aquí..."
                        rows={6}
                        value={content}
                        onChange={(e) => !selectedTemplate && onContentChange(e.target.value)}
                        readOnly={!!selectedTemplate}
                    />
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                        <span>{characterCount} caracteres</span>
                        {channel === 'whatsapp' && !selectedTemplate && (
                            <span>≈ {smsSegments} segmento{smsSegments !== 1 ? 's' : ''} SMS</span>
                        )}
                    </div>
                </div>

                {/* Channel Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-2">
                        <svg className="text-gray-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4" />
                            <path d="M12 8h.01" />
                        </svg>
                        <div className="text-sm text-gray-600">
                            {selectedTemplate ? (
                                <p>
                                    Esta plantilla está <strong>aprobada</strong> por WhatsApp y se enviará exactamente como se muestra.
                                    {Object.keys(templateVariables).length > 0 && ' Complete las variables para personalizar el mensaje.'}
                                </p>
                            ) : channel === 'whatsapp' ? (
                                <p>Los mensajes se enviarán vía WhatsApp a los números seleccionados.</p>
                            ) : channel === 'email' ? (
                                <p>Los correos se enviarán a las direcciones de email seleccionadas.</p>
                            ) : (
                                <p>Se enviarán mensajes por ambos canales cuando los contactos tengan la información disponible.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
