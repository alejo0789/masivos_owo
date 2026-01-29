'use client';

import { useState, useEffect, useRef } from 'react';
import { Template, createTemplate, updateTemplate } from '@/lib/api';
import AIAssistantModal from './AIAssistantModal';

interface TemplateModalProps {
    template?: Template | null;
    onClose: () => void;
    onSaved: () => void;
}

export default function TemplateModal({ template, onClose, onSaved }: TemplateModalProps) {
    const [name, setName] = useState(template?.name || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [useHtmlTemplate, setUseHtmlTemplate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showAIAssistant, setShowAIAssistant] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showFontPicker, setShowFontPicker] = useState(false);
    const editorRef = useRef<HTMLDivElement>(null);

    const isEditing = !!template;

    // Extract body content from HTML template when editing
    useEffect(() => {
        if (template?.content && editorRef.current) {
            const htmlContent = template.content;
            // Check if it's an HTML template
            if (htmlContent.trim().startsWith('<!DOCTYPE html>') || htmlContent.trim().startsWith('<html')) {
                setUseHtmlTemplate(true);
                // Extract content between <!-- Content --> tags
                const contentMatch = htmlContent.match(/<!-- Content -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/);
                if (contentMatch && contentMatch[1]) {
                    editorRef.current.innerHTML = contentMatch[1].trim();
                } else {
                    editorRef.current.innerHTML = htmlContent;
                }
            } else {
                editorRef.current.innerHTML = htmlContent;
            }
        }
    }, [template]);

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
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const content = useHtmlTemplate
            ? (editorRef.current?.innerHTML || '')
            : (editorRef.current?.textContent || '');

        if (!name.trim() || !content.trim()) {
            setError('Nombre y contenido son obligatorios');
            return;
        }
        setError('');
        setSaving(true);
        try {
            const finalContent = useHtmlTemplate ? generateHtmlContent(content) : content;

            if (isEditing) {
                await updateTemplate(template.id, { name, subject, content: finalContent, channel: 'email' });
            } else {
                await createTemplate({ name, subject, content: finalContent, channel: 'email' });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handlePreview = () => {
        if (!name.trim()) {
            setError('Por favor ingresa un nombre para la plantilla');
            return;
        }
        if (!editorRef.current?.innerHTML.trim()) {
            setError('Por favor escribe el contenido del email');
            return;
        }
        setError('');
        setShowPreviewModal(true);
    };

    const getPreviewContent = () => {
        if (!editorRef.current) return '';
        return useHtmlTemplate ? generateHtmlContent(editorRef.current.innerHTML) : editorRef.current.textContent || '';
    };

    const handleApplyAIContent = (html: string) => {
        if (editorRef.current) {
            // Extract body content from the AI-generated HTML
            const contentMatch = html.match(/<td[^>]*style="[^"]*padding[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<!-- Footer -->/i);
            if (contentMatch && contentMatch[1]) {
                editorRef.current.innerHTML = contentMatch[1].trim();
            } else {
                editorRef.current.innerHTML = html;
            }
            setUseHtmlTemplate(true);
        }
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div
                    className="modal-content w-full max-w-3xl animate-slide-up max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-purple-100" style={{
                        background: 'linear-gradient(135deg, rgba(139, 90, 155, 0.08) 0%, rgba(0, 180, 216, 0.04) 100%)'
                    }}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {isEditing ? 'Editar Plantilla de Email' : 'Nueva Plantilla de Email'}
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
                                placeholder="Ej: Bienvenida nuevos clientes"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        {/* HTML Template Toggle */}
                        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useHtmlTemplate}
                                    onChange={(e) => setUseHtmlTemplate(e.target.checked)}
                                    className="w-5 h-5 rounded border-purple-300 text-[#8B5A9B] focus:ring-purple-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-900">Usar plantilla HTML con diseño OWO</span>
                                    <p className="text-xs text-gray-600 mt-1">Incluye header morado con logo, contenido personalizable y footer automático</p>
                                </div>
                            </label>
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="label">Asunto del correo</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Ej: ¡Tenemos noticias para ti!"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>

                        {/* Formatting Toolbar (only for HTML template) */}
                        {useHtmlTemplate && (
                            <div className="space-y-2">
                                <label className="label">Herramientas de formato</label>
                                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
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
                                                                    // Don't close immediately for custom picker to allow adjustment
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

                                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                                    <button
                                        type="button"
                                        onClick={() => applyFormat('insertUnorderedList')}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 hover:bg-purple-100 hover:border-purple-400 transition-all shadow-sm text-sm text-gray-700"
                                        title="Lista con viñetas"
                                    >
                                        • Lista
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 italic">
                                    💡 Selecciona el texto y haz clic en los botones para aplicar formato
                                </p>
                            </div>
                        )}

                        {/* Rich Text Editor */}
                        <div>
                            <label className="label">
                                {useHtmlTemplate ? 'Contenido del email' : 'Contenido del mensaje'}
                            </label>
                            <div
                                ref={editorRef}
                                contentEditable
                                className="min-h-[300px] p-4 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none bg-white transition-all"
                                style={{
                                    lineHeight: '1.6',
                                    fontSize: '15px',
                                    color: '#333'
                                }}
                                suppressContentEditableWarning
                                onFocus={(e) => {
                                    if (e.currentTarget.textContent === '' && !template) {
                                        e.currentTarget.innerHTML = '<p>Escribe aquí el contenido de tu email...</p>';
                                        // Set cursor at the end
                                        const range = document.createRange();
                                        const sel = window.getSelection();
                                        range.selectNodeContents(e.currentTarget);
                                        range.collapse(false);
                                        sel?.removeAllRanges();
                                        sel?.addRange(range);
                                    }
                                }}
                            />
                            <p className="text-xs text-gray-400 mt-2">
                                💡 Variables disponibles: <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{primer_nombre}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{email}'}</code>, <code className="bg-purple-50 text-[#8B5A9B] px-1 rounded">{'{telefono}'}</code>
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setShowAIAssistant(true)}
                                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Asistente IA
                                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">Beta</span>
                            </button>
                            {/* Error message near buttons for visibility */}
                            {error && (
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
                                    <span className="text-red-500">⚠️</span>
                                    <p className="text-red-600 text-sm font-medium">{error}</p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                >
                                    Cancelar
                                </button>
                                {useHtmlTemplate && (
                                    <button
                                        type="button"
                                        onClick={handlePreview}
                                        className="btn btn-secondary"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        Vista Previa
                                    </button>
                                )}
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
                        </div>
                    </form>
                </div>
            </div>

            {/* Preview Modal */}
            {showPreviewModal && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setShowPreviewModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
                        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-2xl">
                                        👁️
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Vista Previa del Email</h2>
                                        <p className="text-sm text-gray-500">Así lo verán tus destinatarios</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Template Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Nombre de la plantilla</h3>
                                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <p className="text-gray-900 font-medium">{name || 'Sin nombre'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Asunto</h3>
                                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                        <p className="text-blue-900 font-medium">{subject || 'Sin asunto'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Email Preview */}
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vista Previa del Email</h3>
                                <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg bg-white">
                                    <iframe
                                        srcDoc={getPreviewContent()}
                                        className="w-full h-[600px] border-0"
                                        title="Vista previa del email"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">✅</span>
                                    <div className="text-sm text-green-800">
                                        <p className="font-medium mb-1">¿Todo se ve bien?</p>
                                        <p className="text-green-600">Si estás satisfecho con la vista previa, haz clic en "{isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}" para guardar. Si necesitas hacer ajustes, haz clic en "Volver a Editar".</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-between">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="btn btn-secondary"
                            >
                                Volver a Editar
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    handleSubmit();
                                }}
                                disabled={saving}
                                className="btn btn-glow"
                            >
                                {saving ? (
                                    <div className="spinner" style={{ width: '18px', height: '18px' }} />
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M5 13l4 4L19 7" />
                                        </svg>
                                        {isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Assistant Modal */}
            {showAIAssistant && (
                <AIAssistantModal
                    context="template"
                    onClose={() => setShowAIAssistant(false)}
                    onApply={handleApplyAIContent}
                />
            )}
        </>
    );
}
