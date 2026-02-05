'use client';

import { useState } from 'react';
import { MessageLog } from '@/lib/api';

interface HistoryTableProps {
    logs: MessageLog[];
    loading?: boolean;
}

export default function HistoryTable({ logs, loading }: HistoryTableProps) {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            dateStyle: 'short',
            timeStyle: 'short'
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent': return <span className="badge badge-success">✓ Enviado</span>;
            case 'failed': return <span className="badge badge-error">✕ Fallido</span>;
            default: return <span className="badge badge-warning">⏳ Pendiente</span>;
        }
    };

    const getChannelInfo = (channel: string) => {
        switch (channel) {
            case 'whatsapp': return { icon: '📱', color: '#25D366', bg: 'rgba(37, 211, 102, 0.1)', label: 'WhatsApp' };
            case 'email': return { icon: '📧', color: '#00B4D8', bg: 'rgba(0, 180, 216, 0.1)', label: 'Email' };
            case 'both': return { icon: '🔄', color: '#8B5A9B', bg: 'rgba(139, 90, 155, 0.1)', label: 'Ambos' };
            default: return { icon: '📨', color: '#8E8EA0', bg: 'rgba(142, 142, 160, 0.1)', label: 'Mensaje' };
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const stripHtml = (html: string) => {
        if (!html) return '';
        if (!html.includes('<') && !html.includes('>')) return html;
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner-glow" />
                    <span className="text-gray-500 font-medium">Cargando historial...</span>
                </div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="empty-state py-16">
                <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5A9B" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-1">No hay mensajes</p>
                <p className="text-gray-500 text-sm">El historial de envíos aparecerá aquí</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto px-4 pb-6">
            <table className="table border-separate border-spacing-y-2">
                <thead>
                    <tr className="text-gray-400 text-xs uppercase tracking-wider text-left">
                        <th className="px-4 py-2">Fecha</th>
                        <th className="px-4 py-2">Destinatario</th>
                        <th className="px-4 py-2">Canal</th>
                        <th className="px-4 py-2">Estado</th>
                        <th className="px-4 py-2">Vista Previa (clic para abrir)</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => {
                        const isExpanded = expandedId === log.id;
                        const channelInfo = getChannelInfo(log.channel);

                        return (
                            <React.Fragment key={log.id}>
                                <tr
                                    className={`animate-fade-in cursor-pointer transition-all duration-200 ${isExpanded ? 'bg-gray-50 shadow-sm' : 'hover:bg-gray-50'}`}
                                    onClick={() => setExpandedId(isExpanded ? null : (log.id ?? null))}
                                >
                                    <td className="py-4 border-t border-b border-l rounded-l-2xl border-gray-100 bg-white">
                                        <div className="flex items-center gap-2 px-4 whitespace-nowrap">
                                            <span className={`text-[10px] text-gray-300 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                            <span className="text-gray-500">{formatDate(log.sent_at)}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 border-t border-b border-gray-100 bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {getInitials(log.recipient_name)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 truncate max-w-[120px] sm:max-w-none">{log.recipient_name}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-none">
                                                    {log.recipient_phone || log.recipient_email || '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 border-t border-b border-gray-100 bg-white">
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: channelInfo.bg, color: channelInfo.color }}>
                                            <span>{channelInfo.icon}</span>
                                            <span className="hidden sm:inline">{channelInfo.label}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 border-t border-b border-gray-100 bg-white">{getStatusBadge(log.status)}</td>
                                    <td className="py-4 border-t border-b border-r rounded-r-2xl border-gray-100 bg-white">
                                        <p className="max-w-[150px] sm:max-w-xs truncate text-sm text-gray-500">
                                            {stripHtml(log.message_content)}
                                        </p>
                                    </td>
                                </tr>

                                {isExpanded && (
                                    <tr className="animate-fade-in">
                                        <td colSpan={5} className="px-4 py-2 bg-gray-50/50 rounded-2xl">
                                            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm animate-scale-up flex flex-col gap-5 relative">
                                                {/* Top Close Button (X) */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedId(null);
                                                    }}
                                                    className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all z-10"
                                                    title="Cerrar"
                                                >
                                                    ✕
                                                </button>

                                                <div className="flex flex-wrap gap-8 items-start">
                                                    <div className="flex-1 min-w-[200px]">
                                                        {log.subject && (
                                                            <div className="mb-4 pb-4 border-b border-gray-50">
                                                                <p className="text-[10px] font-bold text-[#8B5A9B] uppercase tracking-wider mb-1">Asunto:</p>
                                                                <p className="font-semibold text-gray-800 text-lg">{log.subject}</p>
                                                            </div>
                                                        )}

                                                        <p className="text-[10px] font-bold text-[#8B5A9B] uppercase tracking-wider mb-2">Mensaje original:</p>
                                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                            {log.channel === 'email' ? (
                                                                <div
                                                                    className="email-content-view max-h-[400px] overflow-auto text-sm"
                                                                    dangerouslySetInnerHTML={{ __html: log.message_content }}
                                                                />
                                                            ) : (
                                                                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                                                                    {log.message_content}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="w-full lg:w-64 flex flex-col gap-4">
                                                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Detalles del envío</p>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500">Estado:</span>
                                                                    <span className="font-medium">{log.status === 'sent' ? 'Enviado ✅' : log.status === 'failed' ? 'Fallido ❌' : 'Pendiente ⏳'}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500">Canal:</span>
                                                                    <span className="font-medium capitalize">{log.channel}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-500">Batch ID:</span>
                                                                    <span className="font-mono text-[10px] bg-white px-1 rounded border border-gray-200">{log.batch_id || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {log.attachments && log.attachments.length > 0 && (
                                                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Archivos adjuntos</p>
                                                                <div className="flex flex-col gap-2">
                                                                    {log.attachments.map((file, i) => (
                                                                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-100">
                                                                            <span>📎</span>
                                                                            <span className="truncate">{file}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {log.error_message && (
                                                            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Información del error</p>
                                                                <p className="text-xs text-red-700 leading-snug">{log.error_message}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bottom Close Button */}
                                                <div className="pt-4 border-t border-gray-50 flex justify-end">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedId(null);
                                                        }}
                                                        className="text-sm font-medium text-gray-400 hover:text-[#8B5A9B] flex items-center gap-2 transition-colors"
                                                    >
                                                        Cerrar detalle ↑
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>

            <style jsx>{`
                .email-content-view :global(img) { max-width: 100%; height: auto; border-radius: 8px; }
                .animate-scale-up { animation: scaleUp 0.15s ease-out forwards; }
                @keyframes scaleUp {
                    from { opacity: 0; transform: translateY(-5px) scale(0.99); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}

import React from 'react';
