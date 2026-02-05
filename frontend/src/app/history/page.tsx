'use client';

import { useState, useEffect } from 'react';
import { getHistory, getStats, getHistoryCount, MessageLog, Stats } from '@/lib/api';
import HistoryTable from '@/components/HistoryTable';

const ITEMS_PER_PAGE = 50;

export default function HistoryPage() {
    const [logs, setLogs] = useState<MessageLog[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [channel, setChannel] = useState('');
    const [status, setStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        setCurrentPage(1); // Reset to first page on filter change
    }, [channel, status, search, dateFrom, dateTo]);

    useEffect(() => {
        loadData();
    }, [channel, status, search, dateFrom, dateTo, currentPage]);

    const loadData = async () => {
        try {
            setLoading(true);
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;

            const params = {
                channel: channel || undefined,
                status: status || undefined,
                search: search || undefined,
                date_from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
                date_to: dateTo ? new Date(dateTo).toISOString() : undefined,
                limit: ITEMS_PER_PAGE,
                offset: offset
            };

            const [logsData, countData, statsData] = await Promise.all([
                getHistory(params),
                getHistoryCount({
                    channel: params.channel,
                    status: params.status,
                    date_from: params.date_from,
                    date_to: params.date_to
                }),
                getStats(30),
            ]);

            setLogs(logsData);
            setTotalCount(countData.count);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
        <div className="p-6 lg:p-8 min-h-screen relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-10 right-20 w-72 h-72 rounded-full bg-[#8B5A9B] opacity-5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-20 left-10 w-56 h-56 rounded-full bg-[#00B4D8] opacity-5 blur-[80px] pointer-events-none" />

            {/* Decorative lines */}
            <svg className="absolute top-0 right-0 w-full h-32 opacity-10 pointer-events-none" viewBox="0 0 1200 100" preserveAspectRatio="none">
                <path d="M0 50 Q 300 0 600 50 T 1200 50" stroke="url(#histGrad)" strokeWidth="1" fill="none" />
                <defs>
                    <linearGradient id="histGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5A9B" />
                        <stop offset="100%" stopColor="#00B4D8" />
                    </linearGradient>
                </defs>
            </svg>

            {/* Header */}
            <div className="mb-8 relative z-10">
                <h1 className="text-3xl font-bold text-gray-900">
                    <span className="text-gradient">Historial</span>
                </h1>
                <p className="text-gray-500 mt-1">Revisa los mensajes enviados y estadísticas</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
                    {/* Total */}
                    <div className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-50 border border-purple-100">
                                <svg className="text-[#8B5A9B]" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 2L11 13" />
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                                <p className="text-sm text-gray-400">Total (30 días)</p>
                            </div>
                        </div>
                    </div>

                    {/* Sent */}
                    <div className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-green-50 border border-green-100">
                                <span className="text-2xl">✅</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-green-600">{stats.sent}</p>
                                <p className="text-sm text-gray-400">Enviados</p>
                            </div>
                        </div>
                    </div>

                    {/* Failed */}
                    <div className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 border border-red-100">
                                <span className="text-2xl">❌</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-red-500">{stats.failed}</p>
                                <p className="text-sm text-gray-400">Fallidos</p>
                            </div>
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div className="card p-5">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-cyan-50 border border-cyan-100">
                                <span className="text-2xl">📊</span>
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-[#00B4D8]">{stats.success_rate}%</p>
                                <p className="text-sm text-gray-400">Tasa de éxito</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="card mb-6 relative z-10">
                <div className="p-5 flex flex-col gap-5">
                    {/* First Row: Search and Channel/Status */}
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[250px]">
                            <div className="relative">
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email o teléfono..."
                                    className="input pl-12"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <select className="select w-auto min-w-[160px]" value={channel} onChange={(e) => setChannel(e.target.value)}>
                            <option value="">📡 Todos los canales</option>
                            <option value="whatsapp">📱 WhatsApp</option>
                            <option value="email">📧 Email</option>
                            <option value="sms">💬 SMS</option>
                        </select>
                        <select className="select w-auto min-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">📋 Todos los estados</option>
                            <option value="sent">✅ Enviados</option>
                            <option value="failed">❌ Fallidos</option>
                            <option value="pending">⏳ Pendientes</option>
                        </select>
                    </div>

                    {/* Second Row: Date Filters */}
                    <div className="flex flex-wrap gap-4 items-center border-t border-gray-100 pt-5">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">Desde:</span>
                            <input
                                type="date"
                                className="input w-auto h-10 py-0"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-500">Hasta:</span>
                            <input
                                type="date"
                                className="input w-auto h-10 py-0"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                        <div className="flex-1" />
                        <button onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                            setChannel('');
                            setStatus('');
                            setSearch('');
                            setCurrentPage(1);
                        }} className="text-sm text-[#8B5A9B] hover:underline font-medium">
                            Limpiar filtros
                        </button>
                        <button onClick={loadData} className="btn btn-secondary py-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                            Actualizar
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden relative z-10 mb-6">
                <HistoryTable logs={logs} loading={loading} />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 mb-10 relative z-10">
                    <p className="text-sm text-gray-500">
                        Mostrando <span className="font-semibold text-gray-900">{logs.length}</span> de <span className="font-semibold text-gray-900">{totalCount}</span> resultados
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="btn btn-secondary px-4 disabled:opacity-50"
                        >
                            ← Anterior
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple logic to show pages around current page
                                let pageNum = currentPage;
                                if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                if (pageNum > 0 && pageNum <= totalPages) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl font-medium transition-all ${currentPage === pageNum
                                                ? 'bg-[#8B5A9B] text-white shadow-md'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                }
                                return null;
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || loading}
                            className="btn btn-secondary px-4 disabled:opacity-50"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
