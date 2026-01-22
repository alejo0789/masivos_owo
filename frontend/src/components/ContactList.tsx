'use client';

import { useState, useEffect, useMemo } from 'react';
import { Contact, getContacts, getDepartments } from '@/lib/api';

interface ContactListProps {
    selectedContacts: Contact[];
    onSelectionChange: (contacts: Contact[]) => void;
    channel?: 'whatsapp' | 'email' | 'sms' | 'both';
    selectedTemplate?: any;
}

const CONTACTS_PER_PAGE = 15;

export default function ContactList({ selectedContacts, onSelectionChange, channel = 'both', selectedTemplate }: ContactListProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [error, setError] = useState('');
    const [totalContacts, setTotalContacts] = useState(0);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Manual contact input
    const [manualInput, setManualInput] = useState('');
    const [manualContactName, setManualContactName] = useState('');
    const [inputError, setInputError] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, departmentFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const [contactsData, depsData] = await Promise.all([
                getContacts({ limit: 1000 }), // Fetch all contacts
                getDepartments(),
            ]);
            setContacts(contactsData.contacts);
            setTotalContacts(contactsData.total);
            setDepartments(depsData);
        } catch (err) {
            setError('Error al cargar contactos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = useMemo(() => {
        return contacts.filter((contact) => {
            const matchesSearch = !search ||
                contact.name.toLowerCase().includes(search.toLowerCase()) ||
                contact.email?.toLowerCase().includes(search.toLowerCase()) ||
                contact.phone?.includes(search);

            const matchesDepartment = !departmentFilter || contact.department === departmentFilter;

            return matchesSearch && matchesDepartment;
        });
    }, [contacts, search, departmentFilter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE);
    const startIndex = (currentPage - 1) * CONTACTS_PER_PAGE;
    const endIndex = startIndex + CONTACTS_PER_PAGE;
    const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

    const selectedIds = useMemo(() => new Set(selectedContacts.map(c => c.id)), [selectedContacts]);

    const handleToggleContact = (contact: Contact) => {
        if (selectedIds.has(contact.id)) {
            onSelectionChange(selectedContacts.filter(c => c.id !== contact.id));
        } else {
            onSelectionChange([...selectedContacts, contact]);
        }
    };

    const handleSelectAll = () => {
        const allSelected = filteredContacts.every(c => selectedIds.has(c.id));
        if (allSelected) {
            const filteredIds = new Set(filteredContacts.map(c => c.id));
            onSelectionChange(selectedContacts.filter(c => !filteredIds.has(c.id)));
        } else {
            const newSelection = [...selectedContacts];
            filteredContacts.forEach(contact => {
                if (!selectedIds.has(contact.id)) {
                    newSelection.push(contact);
                }
            });
            onSelectionChange(newSelection);
        }
    };

    const handleSelectCurrentPage = () => {
        const pageContacts = paginatedContacts;
        const allPageSelected = pageContacts.every(c => selectedIds.has(c.id));

        if (allPageSelected) {
            const pageIds = new Set(pageContacts.map(c => c.id));
            onSelectionChange(selectedContacts.filter(c => !pageIds.has(c.id)));
        } else {
            const newSelection = [...selectedContacts];
            pageContacts.forEach(contact => {
                if (!selectedIds.has(contact.id)) {
                    newSelection.push(contact);
                }
            });
            onSelectionChange(newSelection);
        }
    };

    const allFilteredSelected = filteredContacts.length > 0 &&
        filteredContacts.every(c => selectedIds.has(c.id));

    const allPageSelected = paginatedContacts.length > 0 &&
        paginatedContacts.every(c => selectedIds.has(c.id));

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleAddManualContact = () => {
        if (!manualInput.trim()) return;

        // Determine if it's a phone or email based on input format
        const isEmail = manualInput.includes('@');
        const isPhone = /^\+?[0-9]{10,15}$/.test(manualInput.replace(/[\s-]/g, ''));

        if (!isEmail && !isPhone) {
            setInputError('Por favor ingresa un teléfono válido (10-15 dígitos) o un email válido');
            return;
        }

        // Create a temporary contact
        const newContact: Contact = {
            id: `manual-${Date.now()}`,
            name: manualContactName.trim() || (isEmail ? manualInput.split('@')[0] : 'Contacto manual'),
            phone: isPhone ? manualInput.trim() : undefined,
            email: isEmail ? manualInput.trim() : undefined,
        };

        // Check if already exists
        const exists = selectedContacts.some(
            c => (c.phone && c.phone === newContact.phone) || (c.email && c.email === newContact.email)
        );

        if (exists) {
            setInputError('Este contacto ya está en la lista');
            return;
        }

        onSelectionChange([...selectedContacts, newContact]);
        setManualInput('');
        setManualContactName('');
        setInputError('');
        setShowManualInput(false); // Close the form after adding
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (loading) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="spinner-glow" />
                    <span className="text-gray-500 font-medium">Cargando contactos...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <p className="text-red-500 mb-4 font-medium">{error}</p>
                    <button onClick={loadData} className="btn btn-secondary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6" />
                            <path d="M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-purple-100" style={{
                background: 'linear-gradient(135deg, rgba(139, 90, 155, 0.08) 0%, rgba(0, 180, 216, 0.04) 100%)'
            }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Contactos</h3>
                            <p className="text-gray-400 text-xs">{filteredContacts.length} de {totalContacts} disponibles</p>
                        </div>
                    </div>
                    <div className="badge badge-purple">
                        <span className="font-bold">{selectedContacts.length}</span>
                        <span>seleccionados</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                    <svg
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
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

                {/* Department Filter */}
                {departments.length > 0 && (
                    <select
                        className="select"
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                        <option value="">🏢 Todos los departamentos</option>
                        {departments.map(dep => (
                            <option key={dep} value={dep}>{dep === 'Apostador' ? '🎰 Apostador' : dep === 'Operacional' ? '⚙️ Operacional' : dep}</option>
                        ))}
                    </select>
                )}

                {/* Manual Contact Input */}
                <div className="mt-4">
                    {!showManualInput ? (
                        <button
                            onClick={() => setShowManualInput(true)}
                            className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 hover:border-purple-300 transition-all flex items-center justify-center gap-2 text-[#8B5A9B] font-semibold hover:shadow-md"
                        >
                            <span className="text-lg">➕</span>
                            <span>Agregar contacto</span>
                        </button>
                    ) : (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 animate-fade-in">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">➕</span>
                                    <h4 className="font-semibold text-gray-900 text-sm">Agregar contacto</h4>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowManualInput(false);
                                        setManualInput('');
                                        setManualContactName('');
                                        setInputError('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="text"
                                    className="input text-sm"
                                    placeholder="Nombre (opcional)"
                                    value={manualContactName}
                                    onChange={(e) => setManualContactName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddManualContact()}
                                />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="input flex-1 text-sm"
                                        placeholder={
                                            selectedTemplate || channel === 'whatsapp' || channel === 'sms'
                                                ? "📱 3001234567"
                                                : channel === 'email'
                                                    ? "📧 Email"
                                                    : "📱 Tel o 📧 Email"
                                        }
                                        value={manualInput}
                                        onChange={(e) => {
                                            let value = e.target.value;

                                            // If it's a phone field and user deletes everything, restore +57
                                            if ((selectedTemplate || channel === 'whatsapp' || channel === 'sms') && value === '') {
                                                value = '+57';
                                            }
                                            // If it's a phone field and doesn't start with +, add +57
                                            else if ((selectedTemplate || channel === 'whatsapp' || channel === 'sms') && !value.startsWith('+')) {
                                                value = '+57' + value;
                                            }

                                            setManualInput(value);
                                            setInputError('');
                                        }}
                                        onFocus={(e) => {
                                            // When focusing on phone field, add +57 if empty
                                            if ((selectedTemplate || channel === 'whatsapp' || channel === 'sms') && !e.target.value) {
                                                setManualInput('+57');
                                            }
                                        }}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddManualContact()}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleAddManualContact}
                                        disabled={!manualInput.trim() || manualInput === '+57'}
                                        className="px-4 py-2 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-[#8B5A9B] to-[#9D4EDD] hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Agregar
                                    </button>
                                </div>
                                {inputError && (
                                    <p className="text-xs text-red-500 mt-1">{inputError}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination Header & Select All */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="checkbox"
                            checked={allPageSelected}
                            onChange={handleSelectCurrentPage}
                        />
                        <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                            Seleccionar página ({paginatedContacts.length})
                        </span>
                    </label>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                            {startIndex + 1}-{Math.min(endIndex, filteredContacts.length)} de {filteredContacts.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </button>

                            {getPageNumbers().map((page, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => typeof page === 'number' && goToPage(page)}
                                    disabled={page === '...'}
                                    className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-all ${page === currentPage
                                        ? 'bg-gradient-to-r from-[#8B5A9B] to-[#9D4EDD] text-white shadow-md'
                                        : page === '...'
                                            ? 'text-gray-400 cursor-default'
                                            : 'text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Select All Filtered */}
                {filteredContacts.length > CONTACTS_PER_PAGE && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <button
                            onClick={handleSelectAll}
                            className={`text-xs font-medium transition-colors ${allFilteredSelected
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-purple-600 hover:text-purple-700'
                                }`}
                        >
                            {allFilteredSelected
                                ? `✕ Deseleccionar todos los ${filteredContacts.length} contactos`
                                : `✓ Seleccionar todos los ${filteredContacts.length} contactos filtrados`
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* Manual Contacts Section */}
            {selectedContacts.some(c => c.id.startsWith('manual-')) && (
                <div className="px-5 py-3 border-b border-purple-100 bg-purple-50/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                            ➕ Agregados manualmente ({selectedContacts.filter(c => c.id.startsWith('manual-')).length})
                        </span>
                    </div>
                    <div className="space-y-2">
                        {selectedContacts
                            .filter(c => c.id.startsWith('manual-'))
                            .map(contact => (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-3 p-2 rounded-lg bg-white border border-purple-200 hover:border-purple-300 transition-all"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                        {contact.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-xs truncate">{contact.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            {contact.phone && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-green-500">📱</span>
                                                    {contact.phone}
                                                </span>
                                            )}
                                            {contact.email && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <span className="text-blue-500">📧</span>
                                                    <span className="truncate">{contact.email}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onSelectionChange(selectedContacts.filter(c => c.id !== contact.id));
                                        }}
                                        className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 hover:text-red-600 transition-all flex-shrink-0"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto bg-white">
                {paginatedContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8B5A9B" strokeWidth="1.5">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <p className="text-base font-medium text-gray-700 mb-1">No se encontraron contactos</p>
                        <p className="text-sm">Intenta con otra búsqueda</p>
                    </div>
                ) : (
                    <ul>
                        {paginatedContacts.map((contact) => {
                            const isSelected = selectedIds.has(contact.id);
                            return (
                                <li
                                    key={contact.id}
                                    className={`contact-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleToggleContact(contact)}
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={isSelected}
                                        onChange={() => { }}
                                    />
                                    <div className="contact-avatar">
                                        {getInitials(contact.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-900 text-sm truncate">{contact.name}</p>
                                            {contact.department && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${contact.department === 'Apostador'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {contact.department === 'Apostador' ? '🎰' : '⚙️'} {contact.department}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                            {contact.phone && (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-green-500">📱</span>
                                                    {contact.phone}
                                                </span>
                                            )}
                                            {contact.email && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <span className="text-blue-500">📧</span>
                                                    <span className="truncate">{contact.email}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5A9B] to-[#9D4EDD] flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Bottom Pagination */}
            {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => goToPage(1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            « Primera
                        </button>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            ‹ Anterior
                        </button>

                        <span className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#8B5A9B] to-[#9D4EDD] text-white">
                            Página {currentPage} de {totalPages}
                        </span>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Siguiente ›
                        </button>
                        <button
                            onClick={() => goToPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            Última »
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
