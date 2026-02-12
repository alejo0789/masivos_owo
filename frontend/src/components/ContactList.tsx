'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Contact, getContacts, getDepartments, Group, getGroups, getGroup } from '@/lib/api';

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

    // Bulk contact input modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkInput, setBulkInput] = useState('');
    const [bulkError, setBulkError] = useState('');
    const [bulkPreview, setBulkPreview] = useState<{ valid: string[], invalid: string[] }>({ valid: [], invalid: [] });
    const [isMounted, setIsMounted] = useState(false);

    // Group selector
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);
    const [usingGroups, setUsingGroups] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');

    // OWO Contacts
    const [showOwoDropdown, setShowOwoDropdown] = useState(false);
    const [owoLoading, setOwoLoading] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, departmentFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load groups and departments initially
            try {
                const [groupsData, depsData] = await Promise.all([
                    getGroups(),
                    getDepartments()
                ]);
                setGroups(groupsData);
                setDepartments(depsData);
            } catch (e) {
                console.log('Could not load initial data', e);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadOwoContacts = async (type: 'Apostador' | 'Operacional' | 'Inactivo' | 'Todos') => {
        setOwoLoading(true);
        setError('');
        setShowOwoDropdown(false);
        setUsingGroups(false); // Disable groups mode if active
        setSelectedGroupIds([]);

        try {
            // Load departments if not loaded
            if (departments.length === 0) {
                try {
                    const deps = await getDepartments();
                    setDepartments(deps);
                } catch (e) { console.error("Error loading departments", e); }
            }

            const params: any = { limit: 50000 };
            if (type !== 'Todos') {
                params.department = type;
            }

            const contactsData = await getContacts(params);

            // If filtering by specific type (except Todos), we might want to select all of them?
            // For now just display them
            setContacts(contactsData.contacts);
            setTotalContacts(contactsData.total);

            // If "Todos" is selected, we clear the local department filter to show everything
            // If a specific type is selected, the backend already filtered it, so contacts only contains that type.
            // We can set the local filter to empty because the list is already filtered.
            setDepartmentFilter('');

        } catch (err) {
            setError('Error al cargar contactos de OWO');
            console.error(err);
        } finally {
            setOwoLoading(false);
        }
    };

    // Handle group selection
    const handleGroupSelect = async (groupId: number) => {
        if (selectedGroupIds.includes(groupId)) {
            // Deselect group
            setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId));
        } else {
            // Select group
            setSelectedGroupIds([...selectedGroupIds, groupId]);
        }
    };

    // Load group contacts when groups are selected
    const loadGroupContacts = async () => {
        if (selectedGroupIds.length === 0) return;

        setLoadingGroups(true);
        // Clear previous contacts if we're switching modes
        if (!usingGroups) {
            setContacts([]);
        }

        try {
            const groupContacts: Contact[] = [];
            for (const groupId of selectedGroupIds) {
                const groupDetail = await getGroup(groupId);
                groupDetail.contacts.forEach(c => {
                    groupContacts.push({
                        id: `group-${groupId}-${c.id}`,
                        name: c.name,
                        phone: c.phone,
                        email: c.email,
                        department: `Grupo: ${groupDetail.name}`,
                    });
                });
            }
            // Set group contacts to display in list AND select all
            setContacts(groupContacts);
            setTotalContacts(groupContacts.length);
            onSelectionChange(groupContacts);
            setUsingGroups(true);
            setShowGroupDropdown(false);
        } catch (err) {
            console.error('Error loading group contacts:', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    // Clear group selection
    const clearGroupSelection = () => {
        setSelectedGroupIds([]);
        setUsingGroups(false);
        onSelectionChange([]);
        setContacts([]); // Clear contacts
        setTotalContacts(0);
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
            name: manualContactName.trim(), // Leave empty to allow fallback to custom variables
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

    // Parse bulk input and validate contacts
    const parseBulkInput = (input: string) => {
        const items = input.split(/[,;\n]+/).map(item => item.trim()).filter(item => item.length > 0);
        const valid: string[] = [];
        const invalid: string[] = [];
        const existingPhones = new Set(selectedContacts.filter(c => c.phone).map(c => c.phone));
        const existingEmails = new Set(selectedContacts.filter(c => c.email).map(c => c.email?.toLowerCase()));

        items.forEach(item => {
            // Normalize phone number
            let normalized = item.replace(/[\s\-\(\)]/g, '');

            // Check if email
            const isEmail = item.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item);

            // Check if phone (with or without country code)
            let isPhone = false;
            if (!isEmail) {
                // Add +57 if it's just digits without country code
                if (/^\d{10}$/.test(normalized)) {
                    normalized = '+57' + normalized;
                }
                isPhone = /^\+?\d{10,15}$/.test(normalized);
            }

            if (isEmail) {
                if (existingEmails.has(item.toLowerCase())) {
                    invalid.push(`${item} (duplicado)`);
                } else if (!valid.includes(item.toLowerCase())) {
                    valid.push(item.toLowerCase());
                }
            } else if (isPhone) {
                if (existingPhones.has(normalized)) {
                    invalid.push(`${normalized} (duplicado)`);
                } else if (!valid.includes(normalized)) {
                    valid.push(normalized);
                }
            } else {
                invalid.push(`${item} (formato inválido)`);
            }
        });

        return { valid, invalid };
    };

    // Handle bulk input change and update preview
    const handleBulkInputChange = (value: string) => {
        setBulkInput(value);
        setBulkError('');
        if (value.trim()) {
            const preview = parseBulkInput(value);
            setBulkPreview(preview);
        } else {
            setBulkPreview({ valid: [], invalid: [] });
        }
    };

    // Add all valid bulk contacts
    const handleAddBulkContacts = () => {
        if (bulkPreview.valid.length === 0) {
            setBulkError('No hay contactos válidos para agregar');
            return;
        }

        const newContacts: Contact[] = bulkPreview.valid.map((item, index) => {
            const isEmail = item.includes('@');
            return {
                id: `bulk-${Date.now()}-${index}`,
                name: '', // Leave empty to allow fallback to custom variables
                phone: !isEmail ? item : undefined,
                email: isEmail ? item : undefined,
            };
        });

        onSelectionChange([...selectedContacts, ...newContacts]);
        setBulkInput('');
        setBulkPreview({ valid: [], invalid: [] });
        setBulkError('');
        setShowBulkModal(false);
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
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowBulkModal(true)}
                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00B4D8] to-[#0077B6] text-white text-xs font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                            title="Agregar múltiples contactos"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Masivos
                        </button>
                        <div className="badge badge-purple">
                            <span className="font-bold">{selectedContacts.length}</span>
                            <span>seleccionados</span>
                        </div>
                    </div>
                </div>

                {/* OWO Contacts Button */}
                {!usingGroups && (
                    <div className="mb-4 relative">
                        <button
                            onClick={() => setShowOwoDropdown(!showOwoDropdown)}
                            disabled={owoLoading}
                            className="w-full p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 hover:border-purple-300 transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🌐</span>
                                <span className="text-sm font-semibold text-purple-700">
                                    {owoLoading ? 'Cargando contactos...' : 'Traer contactos de OWO API'}
                                </span>
                            </div>
                            {owoLoading ? (
                                <div className="spinner-glow w-4 h-4 ml-2" />
                            ) : (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={`text-purple-500 transition-transform ${showOwoDropdown ? 'rotate-180' : ''}`}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            )}
                        </button>

                        {showOwoDropdown && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-fade-in">
                                <button
                                    className="w-full p-3 text-left hover:bg-purple-50 text-sm font-medium border-b border-gray-50 flex items-center gap-2"
                                    onClick={() => handleLoadOwoContacts('Apostador')}
                                >
                                    <span>🎰</span> Traer Apostadores
                                </button>
                                <button
                                    className="w-full p-3 text-left hover:bg-purple-50 text-sm font-medium border-b border-gray-50 flex items-center gap-2"
                                    onClick={() => handleLoadOwoContacts('Operacional')}
                                >
                                    <span>⚙️</span> Traer Operacionales
                                </button>
                                <button
                                    className="w-full p-3 text-left hover:bg-purple-50 text-sm font-medium border-b border-gray-50 flex items-center gap-2"
                                    onClick={() => handleLoadOwoContacts('Inactivo')}
                                >
                                    <span>🚫</span> Traer Inactivos
                                </button>
                                <button
                                    className="w-full p-3 text-left hover:bg-purple-50 text-sm font-medium flex items-center gap-2 text-purple-700 bg-purple-50/50"
                                    onClick={() => handleLoadOwoContacts('Todos')}
                                >
                                    <span>🌍</span> Traer Todos
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Group Selector */}
                {groups.length > 0 && (
                    <div className="mb-4 relative">
                        {usingGroups ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">👥</span>
                                    <span className="text-sm font-semibold text-green-700">
                                        Usando contactos de grupos ({selectedContacts.length} contactos)
                                    </span>
                                </div>
                                <button
                                    onClick={clearGroupSelection}
                                    className="px-3 py-1 rounded-lg bg-white border border-green-200 text-green-600 text-xs font-medium hover:bg-green-50 transition-colors"
                                >
                                    ✕ Volver a OWO
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                                    className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:border-blue-300 transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">👥</span>
                                        <span className="text-sm font-semibold text-blue-700">
                                            {selectedGroupIds.length > 0
                                                ? `${selectedGroupIds.length} grupo${selectedGroupIds.length > 1 ? 's' : ''} seleccionado${selectedGroupIds.length > 1 ? 's' : ''}`
                                                : 'Seleccionar grupos'}
                                        </span>
                                    </div>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className={`text-blue-500 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>

                                {showGroupDropdown && (
                                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-hidden animate-fade-in">
                                        <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                                            <input
                                                type="text"
                                                placeholder="🔍 Buscar grupo..."
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                                                value={groupSearch}
                                                onChange={(e) => setGroupSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-auto">
                                            {groups
                                                .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                                                .map(group => (
                                                    <label
                                                        key={group.id}
                                                        className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition-colors"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedGroupIds.includes(group.id)}
                                                            onChange={() => handleGroupSelect(group.id)}
                                                            className="checkbox"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900 text-sm">{group.name}</p>
                                                            <p className="text-xs text-gray-500">{group.contact_count} contactos</p>
                                                        </div>
                                                    </label>
                                                ))}
                                            {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                                <p className="p-4 text-center text-gray-500 text-sm">No se encontraron grupos</p>
                                            )}
                                        </div>
                                        {selectedGroupIds.length > 0 && (
                                            <div className="p-2 border-t border-gray-100 sticky bottom-0 bg-white">
                                                <button
                                                    onClick={loadGroupContacts}
                                                    disabled={loadingGroups}
                                                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:shadow-md transition-all disabled:opacity-50"
                                                >
                                                    {loadingGroups ? 'Cargando...' : `Cargar ${selectedGroupIds.length} grupo${selectedGroupIds.length > 1 ? 's' : ''}`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

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

                {/* Error Banner - Non-blocking */}
                {error && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-red-500">⚠️</span>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                            <button
                                onClick={loadData}
                                className="px-3 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-colors flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 4v6h-6" />
                                    <path d="M1 20v-6h6" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Reintentar
                            </button>
                        </div>
                        <p className="text-xs text-red-500 mt-1">Puedes agregar contactos manualmente o masivamente mientras se resuelve.</p>
                    </div>
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
                            className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${allFilteredSelected
                                ? 'bg-red-50 border-2 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300'
                                : 'bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 text-purple-700 hover:border-purple-300 hover:shadow-md'
                                }`}
                        >
                            {allFilteredSelected ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>
                                    Deseleccionar todos los {filteredContacts.length} contactos
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    Seleccionar TODOS los {filteredContacts.length} contactos
                                </>
                            )}
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

            {/* Bulk Contacts Section */}
            {selectedContacts.some(c => c.id.startsWith('bulk-')) && (
                <div className="px-5 py-3 border-b border-blue-100 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                            📋 Agregados masivamente ({selectedContacts.filter(c => c.id.startsWith('bulk-')).length})
                        </span>
                        <button
                            onClick={() => {
                                onSelectionChange(selectedContacts.filter(c => !c.id.startsWith('bulk-')));
                            }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                        >
                            Eliminar todos
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {selectedContacts
                            .filter(c => c.id.startsWith('bulk-'))
                            .map(contact => (
                                <div
                                    key={contact.id}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-blue-200 hover:border-blue-300 transition-all group"
                                >
                                    <span className="text-xs text-gray-700 font-medium">
                                        {contact.phone || contact.email}
                                    </span>
                                    <button
                                        onClick={() => {
                                            onSelectionChange(selectedContacts.filter(c => c.id !== contact.id));
                                        }}
                                        className="w-4 h-4 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
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

            {/* Bulk Input Modal - Using Portal to render at document.body level */}
            {isMounted && showBulkModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowBulkModal(false);
                            setBulkInput('');
                            setBulkPreview({ valid: [], invalid: [] });
                            setBulkError('');
                        }
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4D8] to-[#0077B6] flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">Ingresos Masivos</h3>
                                        <p className="text-gray-500 text-xs">
                                            {channel === 'email' ? 'Ingresa correos separados por coma' : 'Ingresa números separados por coma'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowBulkModal(false);
                                        setBulkInput('');
                                        setBulkPreview({ valid: [], invalid: [] });
                                        setBulkError('');
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                            {/* Instructions */}
                            <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-500 mt-0.5">💡</span>
                                    <div className="text-xs text-blue-700">
                                        <p className="font-semibold mb-1">Instrucciones:</p>
                                        <ul className="space-y-0.5 list-disc list-inside">
                                            {channel === 'email' ? (
                                                <>
                                                    <li>Ingresa los correos electrónicos separados por coma</li>
                                                    <li>Ejemplo: correo1@mail.com, correo2@mail.com</li>
                                                </>
                                            ) : (
                                                <>
                                                    <li>Ingresa los números de teléfono separados por coma</li>
                                                    <li>Ejemplo: 3001234567, 3112345678</li>
                                                    <li>Se agregará automáticamente el prefijo +57 si no lo incluyes</li>
                                                </>
                                            )}
                                            <li>También puedes usar saltos de línea o punto y coma como separadores</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Text Area */}
                            <textarea
                                className="w-full h-40 p-4 rounded-xl border-2 border-gray-200 focus:border-[#00B4D8] focus:ring-2 focus:ring-[#00B4D8]/20 transition-all resize-none text-sm"
                                placeholder={channel === 'email'
                                    ? "correo1@mail.com, correo2@mail.com, correo3@mail.com..."
                                    : "3001234567, 3112345678, 3209876543..."
                                }
                                value={bulkInput}
                                onChange={(e) => handleBulkInputChange(e.target.value)}
                                autoFocus
                            />

                            {/* Preview */}
                            {(bulkPreview.valid.length > 0 || bulkPreview.invalid.length > 0) && (
                                <div className="mt-4 space-y-3">
                                    {/* Valid contacts */}
                                    {bulkPreview.valid.length > 0 && (
                                        <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-green-500">✓</span>
                                                <span className="text-sm font-semibold text-green-700">
                                                    {bulkPreview.valid.length} contacto{bulkPreview.valid.length > 1 ? 's' : ''} válido{bulkPreview.valid.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                                {bulkPreview.valid.slice(0, 20).map((item, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                                {bulkPreview.valid.length > 20 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-green-200 text-green-700 text-xs font-semibold">
                                                        +{bulkPreview.valid.length - 20} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Invalid contacts */}
                                    {bulkPreview.invalid.length > 0 && (
                                        <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-red-500">✕</span>
                                                <span className="text-sm font-semibold text-red-700">
                                                    {bulkPreview.invalid.length} elemento{bulkPreview.invalid.length > 1 ? 's' : ''} inválido{bulkPreview.invalid.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                                                {bulkPreview.invalid.slice(0, 10).map((item, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium"
                                                    >
                                                        {item}
                                                    </span>
                                                ))}
                                                {bulkPreview.invalid.length > 10 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-700 text-xs font-semibold">
                                                        +{bulkPreview.invalid.length - 10} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Error message */}
                            {bulkError && (
                                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                                    {bulkError}
                                </div>
                            )}

                            {/* Info about default name */}
                            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                                <div className="flex items-start gap-2">
                                    <span className="text-amber-500">⚠️</span>
                                    <p className="text-xs text-amber-700">
                                        <strong>Nota:</strong> Los contactos agregados masivamente tendrán <strong>!</strong> como nombre por defecto,
                                        ya que no se puede asociar un nombre individual a cada uno.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                            <button
                                onClick={() => {
                                    setShowBulkModal(false);
                                    setBulkInput('');
                                    setBulkPreview({ valid: [], invalid: [] });
                                    setBulkError('');
                                }}
                                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddBulkContacts}
                                disabled={bulkPreview.valid.length === 0}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00B4D8] to-[#0077B6] text-white font-semibold hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Agregar {bulkPreview.valid.length > 0 ? `(${bulkPreview.valid.length})` : ''}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
