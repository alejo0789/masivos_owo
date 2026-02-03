'use client';

import { MessageLog } from '@/lib/api';

interface HistoryTableProps {
    logs: MessageLog[];
    loading?: boolean;
}

export default function HistoryTable({ logs, loading }: HistoryTableProps) {
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
        <div className="overflow-x-auto">
            <table className="table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Destinatario</th>
                        <th>Canal</th>
                        <th>Estado</th>
                        <th>Mensaje</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log, index) => {
                        const channelInfo = getChannelInfo(log.channel);
                        return (
                            <tr
                                key={log.id}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 0.02}s` }}
                            >
                                <td className="whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8EA0" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span className="text-gray-500">{formatDate(log.sent_at)}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center text-white text-xs font-bold">
                                            {getInitials(log.recipient_name)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{log.recipient_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {log.recipient_phone || log.recipient_email || '-'}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium"
                                        style={{
                                            background: channelInfo.bg,
                                            color: channelInfo.color
                                        }}
                                    >
                                        <span>{channelInfo.icon}</span>
                                        <span className="hidden sm:inline">{channelInfo.label}</span>
                                    </div>
                                </td>
                                <td>{getStatusBadge(log.status)}</td>
                                <td>
                                    <p className="max-w-xs truncate text-sm text-gray-500" title={log.message_content}>
                                        {log.message_content}
                                    </p>
                                    {log.error_message && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            {log.error_message}
                                        </p>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
