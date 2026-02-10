'use client';

import { useState, useEffect, useRef } from 'react';
import { WhatsAppTemplate, getApprovedWhatsAppTemplates } from '@/lib/api';
import AIAssistantModal from './AIAssistantModal';

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
    const [showAIAssistant, setShowAIAssistant] = useState(false);

    // HTML Editor Config
    const editorRef = useRef<HTMLDivElement>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false);

    const isHtmlMode = channel === 'email' || channel === 'both';
    const lastGeneratedContent = useRef('');

    // Initialize editor content when switching to HTML mode or when content content changes externally
    useEffect(() => {
        if (isHtmlMode && editorRef.current && content !== lastGeneratedContent.current) {
            // Only update if the content is different from what we just generated
            // This prevents cursor jumping when typing

            // Check if it's an OWO HTML template to extract just the body
            if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
                const contentMatch = content.match(/<!-- Content -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/);
                if (contentMatch && contentMatch[1]) {
                    if (editorRef.current.innerHTML !== contentMatch[1].trim()) {
                        editorRef.current.innerHTML = contentMatch[1].trim();
                    }
                } else {
                    // If it's HTML but not our template structure, just show it all (or try to)
                    if (editorRef.current.innerHTML !== content) {
                        editorRef.current.innerHTML = content;
                    }
                }
            } else {
                // If it's plain text, just put it in
                if (editorRef.current.innerText !== content) {
                    editorRef.current.innerText = content;
                }
            }
        }
    }, [content, isHtmlMode]);

    const generateHtmlContent = (bodyContent: string): string => {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject || 'Email de OWO'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #8B5A9B 0%, #6B4478 100%); padding: 40px 20px; text-align: center;">
                            <img src="https://owo-public-files.s3.amazonaws.com/mails/logo-mails-light.png" alt="OWO" style="max-width: 200px; height: auto;" />
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #333333; line-height: 1.6;">
                            ${bodyContent}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666;">
                                Este buzón de correo es solo para envío de información, por favor no lo respondas porque no podrá ser recibido y atendido.
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666;">
                                Equipo <strong style="color: #8B5A9B;">OWO</strong>
                            </p>
                            <p style="margin: 15px 0 0 0; font-size: 12px; color: #999999;">
                                © 2025 <strong>OWO</strong> by <strong>Owo</strong>tech. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    };

    const applyFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleHtmlEditorInput();
    };

    const handleHtmlEditorInput = () => {
        if (!editorRef.current) return;

        const innerContent = editorRef.current.innerHTML;
        const fullContent = generateHtmlContent(innerContent);

        lastGeneratedContent.current = fullContent;
        onContentChange(fullContent);
    };

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

    const handleApplyAIContent = (html: string) => {
        if (channel === 'email' && isHtmlMode && editorRef.current) {
            // Extract body content from the AI-generated HTML
            const contentMatch = html.match(/<td[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/i);
            let innerContent = html;
            if (contentMatch && contentMatch[1]) {
                innerContent = contentMatch[1].trim();
            }

            editorRef.current.innerHTML = innerContent;
            handleHtmlEditorInput();
        } else {
            // Extract text content from HTML for message composer (WhatsApp/Text)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const textContent = tempDiv.textContent || tempDiv.innerText || '';
            onContentChange(textContent.trim());
        }
    };

    return (
        <>
            <div className="card overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Componer Mensaje</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAIAssistant(true)}
                                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Asistente IA
                            </button>
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
                                    disabled={!!(selectedTemplate && option.value !== 'whatsapp')}
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


                    {/* Formatting Toolbar (only for HTML mode) */}
                    {isHtmlMode && (
                        <div className="space-y-2 mb-2">
                            <label className="label">Herramientas de formato</label>
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 flex-wrap">
                                {/* Basic Formatting */}
                                <button
                                    type="button"
                                    onClick={() => applyFormat('bold')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Negrita (Ctrl+B)"
                                >
                                    <strong className="text-gray-700">N</strong>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyFormat('italic')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Cursiva (Ctrl+I)"
                                >
                                    <em className="text-gray-700">K</em>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyFormat('underline')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Subrayado (Ctrl+U)"
                                >
                                    <u className="text-gray-700">S</u>
                                </button>

                                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                                {/* Alignment Buttons */}
                                <button
                                    type="button"
                                    onClick={() => applyFormat('justifyLeft')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Alinear a la izquierda"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                                        <line x1="3" y1="6" x2="21" y2="6" />
                                        <line x1="3" y1="12" x2="15" y2="12" />
                                        <line x1="3" y1="18" x2="18" y2="18" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyFormat('justifyCenter')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Centrar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                                        <line x1="3" y1="6" x2="21" y2="6" />
                                        <line x1="6" y1="12" x2="18" y2="12" />
                                        <line x1="4" y1="18" x2="20" y2="18" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => applyFormat('justifyRight')}
                                    className="w-8 h-8 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm flex items-center justify-center"
                                    title="Alinear a la derecha"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700">
                                        <line x1="3" y1="6" x2="21" y2="6" />
                                        <line x1="9" y1="12" x2="21" y2="12" />
                                        <line x1="6" y1="18" x2="21" y2="18" />
                                    </svg>
                                </button>

                                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                                {/* Color Picker */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowColorPicker(!showColorPicker);
                                            setShowFontPicker(false);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border transition-all shadow-sm flex items-center gap-1.5 text-sm ${showColorPicker ? 'bg-purple-100 border-purple-400' : 'bg-white border-gray-300 hover:bg-purple-50'}`}
                                        title="Color de texto"
                                    >
                                        <span className="w-4 h-4 rounded bg-gradient-to-br from-red-500 via-purple-500 to-blue-500"></span>
                                        <span className="text-gray-700">Color</span>
                                    </button>

                                    {showColorPicker && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)}></div>
                                            <div className="absolute top-full mt-2 left-0 bg-white rounded-xl border border-gray-200 p-4 min-w-[240px] z-50 animate-fade-in" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                                                <p className="text-xs font-semibold text-gray-700 mb-3">Colores predefinidos:</p>
                                                <div className="grid grid-cols-5 gap-2 mb-4">
                                                    {[
                                                        { color: '#8B5A9B', name: 'Morado OWO' },
                                                        { color: '#00B4D8', name: 'Azul OWO' },
                                                        { color: '#000000', name: 'Negro' },
                                                        { color: '#EF4444', name: 'Rojo' },
                                                        { color: '#10B981', name: 'Verde' },
                                                        { color: '#F59E0B', name: 'Naranja' },
                                                        { color: '#3B82F6', name: 'Azul' },
                                                        { color: '#EC4899', name: 'Rosa' },
                                                        { color: '#6B7280', name: 'Gris' },
                                                        { color: '#FFFFFF', name: 'Blanco' },
                                                    ].map((c) => (
                                                        <button
                                                            key={c.color}
                                                            type="button"
                                                            onClick={() => {
                                                                applyFormat('foreColor', c.color);
                                                                setShowColorPicker(false);
                                                            }}
                                                            className="w-9 h-9 rounded-lg border-2 border-gray-300 hover:border-purple-500 hover:scale-110 transition-all"
                                                            style={{
                                                                backgroundColor: c.color,
                                                                boxShadow: c.color === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : 'none'
                                                            }}
                                                            title={c.name}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="border-t border-gray-200 pt-3">
                                                    <p className="text-xs font-semibold text-gray-700 mb-2">Selector de color personalizado:</p>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            onChange={(e) => {
                                                                applyFormat('foreColor', e.target.value);
                                                            }}
                                                            className="w-12 h-10 rounded-lg border-2 border-gray-300 cursor-pointer"
                                                            title="Elige cualquier color"
                                                        />
                                                        <span className="text-xs text-gray-500">Haz clic para elegir cualquier color</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Font Size Picker */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowFontPicker(!showFontPicker);
                                            setShowColorPicker(false);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg border transition-all shadow-sm flex items-center gap-1.5 text-sm ${showFontPicker ? 'bg-purple-100 border-purple-400' : 'bg-white border-gray-300 hover:bg-purple-50'}`}
                                        title="Tamaño de fuente"
                                    >
                                        <span className="text-gray-700">Tamaño</span>
                                    </button>

                                    {showFontPicker && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowFontPicker(false)}></div>
                                            <div className="absolute top-full mt-2 left-0 bg-white rounded-xl border border-gray-200 p-2 min-w-[140px] z-50 animate-fade-in" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                                                {[
                                                    { size: '1', label: 'Muy pequeño' },
                                                    { size: '2', label: 'Pequeño' },
                                                    { size: '3', label: 'Normal' },
                                                    { size: '4', label: 'Mediano' },
                                                    { size: '5', label: 'Grande' },
                                                    { size: '6', label: 'Muy grande' },
                                                    { size: '7', label: 'Enorme' },
                                                ].map((s) => (
                                                    <button
                                                        key={s.size}
                                                        type="button"
                                                        onClick={() => {
                                                            applyFormat('fontSize', s.size);
                                                            setShowFontPicker(false);
                                                        }}
                                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 transition-all text-sm text-gray-700 hover:text-purple-900"
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Message Content */}
                    <div>
                        <label className="label">
                            {selectedTemplate ? 'Vista previa del mensaje' : 'Contenido del Mensaje'}
                        </label>


                        {isHtmlMode ? (
                            <div
                                ref={editorRef}
                                contentEditable
                                className="min-h-[300px] p-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white transition-all"
                                style={{
                                    lineHeight: '1.6',
                                    fontSize: '15px',
                                    color: '#333'
                                }}
                                onInput={handleHtmlEditorInput}
                                suppressContentEditableWarning
                            />
                        ) : (
                            <textarea
                                className={`textarea ${selectedTemplate ? 'bg-gray-50' : ''}`}
                                placeholder="Escribe tu mensaje aquí..."
                                rows={6}
                                value={content}
                                onChange={(e) => !selectedTemplate && onContentChange(e.target.value)}
                                readOnly={!!selectedTemplate}
                            />
                        )}
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

            {/* AI Assistant Modal */}
            {showAIAssistant && (
                <AIAssistantModal
                    context="bulk_message"
                    onClose={() => setShowAIAssistant(false)}
                    onApply={handleApplyAIContent}
                />
            )}
        </>
    );
}
