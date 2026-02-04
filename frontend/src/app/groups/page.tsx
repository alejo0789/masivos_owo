'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Group,
    GroupDetail,
    GroupContact,
    getGroups,
    getGroup,
    uploadGroupExcel,
    updateGroup,
    deleteGroup,
    addGroupContact,
    updateGroupContact,
    deleteGroupContact,
} from '@/lib/api';

export default function GroupsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Selected group for detail view
    const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [groupName, setGroupName] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [editName, setEditName] = useState('');

    // Edit contact modal
    const [showContactModal, setShowContactModal] = useState(false);
    const [editingContact, setEditingContact] = useState<GroupContact | null>(null);
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

    // Search
    const [groupSearch, setGroupSearch] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const data = await getGroups();
            setGroups(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando grupos');
        } finally {
            setLoading(false);
        }
    };

    const handleGroupClick = async (group: Group) => {
        try {
            setLoadingDetail(true);
            const detail = await getGroup(group.id);
            setSelectedGroup(detail);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando grupo');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadFile(file);
            // Auto-suggest group name from filename
            const name = file.name.replace(/\.(xlsx|xls)$/i, '');
            setGroupName(name);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
            setUploadFile(file);
            const name = file.name.replace(/\.(xlsx|xls)$/i, '');
            setGroupName(name);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile || !groupName.trim()) return;

        try {
            setUploading(true);
            setError('');
            const result = await uploadGroupExcel(uploadFile, groupName.trim());
            setSuccess(`Grupo "${result.group_name}" creado con ${result.contacts_created} contactos`);
            setShowUploadModal(false);
            setUploadFile(null);
            setGroupName('');
            await loadGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error subiendo archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleEditGroup = (group: Group) => {
        setEditingGroup(group);
        setEditName(group.name);
        setShowEditModal(true);
    };

    const handleSaveGroup = async () => {
        if (!editingGroup || !editName.trim()) return;

        try {
            await updateGroup(editingGroup.id, { name: editName.trim() });
            setSuccess('Grupo actualizado');
            setShowEditModal(false);
            await loadGroups();
            if (selectedGroup?.id === editingGroup.id) {
                const detail = await getGroup(editingGroup.id);
                setSelectedGroup(detail);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error actualizando grupo');
        }
    };

    const handleDeleteGroup = async () => {
        if (!deletingGroup) return;

        try {
            await deleteGroup(deletingGroup.id);
            setSuccess('Grupo eliminado');
            setShowDeleteConfirm(false);
            setDeletingGroup(null);
            if (selectedGroup?.id === deletingGroup.id) {
                setSelectedGroup(null);
            }
            await loadGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error eliminando grupo');
        }
    };

    const handleEditContact = (contact: GroupContact) => {
        setEditingContact(contact);
        setContactName(contact.name);
        setContactPhone(contact.phone || '');
        setContactEmail(contact.email || '');
        setShowContactModal(true);
    };

    const handleAddContact = () => {
        setEditingContact(null);
        setContactName('');
        setContactPhone('');
        setContactEmail('');
        setShowContactModal(true);
    };

    const handleSaveContact = async () => {
        if (!selectedGroup || !contactName.trim()) return;

        try {
            if (editingContact) {
                await updateGroupContact(selectedGroup.id, editingContact.id, {
                    name: contactName.trim(),
                    phone: contactPhone.trim() || undefined,
                    email: contactEmail.trim() || undefined,
                });
                setSuccess('Contacto actualizado');
            } else {
                await addGroupContact(selectedGroup.id, {
                    name: contactName.trim(),
                    phone: contactPhone.trim() || undefined,
                    email: contactEmail.trim() || undefined,
                });
                setSuccess('Contacto agregado');
            }
            setShowContactModal(false);
            const detail = await getGroup(selectedGroup.id);
            setSelectedGroup(detail);
            await loadGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error guardando contacto');
        }
    };

    const handleDeleteContact = async (contact: GroupContact) => {
        if (!selectedGroup) return;
        if (!confirm(`¿Eliminar a ${contact.name}?`)) return;

        try {
            await deleteGroupContact(selectedGroup.id, contact.id);
            setSuccess('Contacto eliminado');
            const detail = await getGroup(selectedGroup.id);
            setSelectedGroup(detail);
            await loadGroups();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error eliminando contacto');
        }
    };

    const handleSendToGroup = () => {
        if (!selectedGroup) return;
        // Store selected group contacts in sessionStorage and redirect
        const contacts = selectedGroup.contacts.map((c, idx) => ({
            id: `g${selectedGroup.id}-${c.id}`,
            name: c.name,
            phone: c.phone,
            email: c.email,
            department: `Grupo: ${selectedGroup.name}`,
        }));
        sessionStorage.setItem('selectedGroupContacts', JSON.stringify(contacts));
        router.push('/?fromGroup=true');
    };

    return (
        <div className="p-6 lg:p-8 min-h-screen flex flex-col relative overflow-auto">
            {/* Background decorative elements */}
            <div className="absolute top-10 right-20 w-96 h-96 rounded-full bg-[#8B5A9B] opacity-5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-20 left-10 w-64 h-64 rounded-full bg-[#00B4D8] opacity-5 blur-[100px] pointer-events-none" />

            {/* Header */}
            <div className="mb-6 relative z-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        Gestión de <span className="text-gradient">Grupos</span>
                    </h1>
                    <p className="text-gray-500 text-sm">Crea y administra grupos de contactos desde archivos Excel</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="action-btn action-btn-primary flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Subir Excel
                </button>
            </div>

            {/* Success/Error Toasts */}
            {success && (
                <div className="mb-5 p-4 rounded-2xl animate-fade-in flex items-center justify-between bg-green-50 border border-green-200">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <span className="text-xl">✅</span>
                        </div>
                        <p className="font-medium text-gray-900">{success}</p>
                    </div>
                    <button onClick={() => setSuccess('')} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
            )}

            {error && (
                <div className="mb-5 p-4 rounded-2xl animate-fade-in flex items-center justify-between bg-red-50 border border-red-200">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <span className="text-xl">❌</span>
                        </div>
                        <p className="font-medium text-red-600">{error}</p>
                    </div>
                    <button onClick={() => setError('')} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
            )}

            {/* Main Grid */}
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0 relative z-10">
                {/* Groups List */}
                <div className="card p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
                        <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                            <span>👥</span> Grupos ({groups.length})
                        </h2>
                        <input
                            type="text"
                            placeholder="🔍 Buscar grupo..."
                            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-white"
                            value={groupSearch}
                            onChange={(e) => setGroupSearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="spinner mx-auto mb-4" />
                                <p className="text-gray-500">Cargando grupos...</p>
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="text-4xl mb-4">📂</div>
                                <p className="text-gray-500 mb-4">No hay grupos creados</p>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="text-[#8B5A9B] font-semibold hover:underline"
                                >
                                    Subir primer Excel
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {groups
                                    .filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                                    .map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => handleGroupClick(group)}
                                            className={`p-4 cursor-pointer hover:bg-purple-50 transition-colors ${selectedGroup?.id === group.id ? 'bg-purple-50 border-l-4 border-[#8B5A9B]' : ''
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{group.name}</p>
                                                    <p className="text-sm text-gray-500">{group.contact_count} contactos</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }}
                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeletingGroup(group); setShowDeleteConfirm(true); }}
                                                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500">No se encontraron grupos</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Group Detail */}
                <div className="xl:col-span-2 card p-0 overflow-hidden">
                    {loadingDetail ? (
                        <div className="p-8 text-center h-full flex items-center justify-center">
                            <div>
                                <div className="spinner mx-auto mb-4" />
                                <p className="text-gray-500">Cargando contactos...</p>
                            </div>
                        </div>
                    ) : selectedGroup ? (
                        <>
                            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50 flex items-center justify-between">
                                <div>
                                    <h2 className="font-bold text-gray-800">{selectedGroup.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedGroup.contacts.length} contactos</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddContact}
                                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        ➕ Agregar
                                    </button>
                                    <button
                                        onClick={handleSendToGroup}
                                        className="action-btn action-btn-whatsapp flex items-center gap-2"
                                    >
                                        📨 Enviar Mensaje
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 text-sm font-semibold text-gray-600">Nombre</th>
                                            <th className="text-left p-3 text-sm font-semibold text-gray-600">Teléfono</th>
                                            <th className="text-left p-3 text-sm font-semibold text-gray-600">Correo</th>
                                            <th className="text-center p-3 text-sm font-semibold text-gray-600">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedGroup.contacts.map((contact) => (
                                            <tr key={contact.id} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-gray-900">{contact.name}</td>
                                                <td className="p-3 text-gray-600">{contact.phone || '-'}</td>
                                                <td className="p-3 text-gray-600">{contact.email || '-'}</td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleEditContact(contact)}
                                                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"
                                                        title="Editar"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteContact(contact)}
                                                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 ml-1"
                                                        title="Eliminar"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="p-8 text-center h-full flex items-center justify-center">
                            <div>
                                <div className="text-6xl mb-4">👈</div>
                                <p className="text-gray-500">Selecciona un grupo para ver sus contactos</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card p-6 w-full max-w-lg animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Subir Excel para crear grupo</h3>

                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${uploadFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-[#8B5A9B]'
                                }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                        >
                            {uploadFile ? (
                                <div>
                                    <div className="text-4xl mb-2">📄</div>
                                    <p className="font-medium text-gray-900">{uploadFile.name}</p>
                                    <button
                                        onClick={() => { setUploadFile(null); setGroupName(''); }}
                                        className="text-red-500 text-sm hover:underline mt-2"
                                    >
                                        Quitar archivo
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-4xl mb-2">📤</div>
                                    <p className="text-gray-600 mb-2">Arrastra un archivo Excel aquí</p>
                                    <p className="text-gray-400 text-sm mb-4">o</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-[#8B5A9B] text-white rounded-xl font-medium hover:bg-[#7a4e88]"
                                    >
                                        Seleccionar archivo
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-gray-500 mb-4">
                            El archivo debe tener las columnas: <strong>nombre</strong>, <strong>telefono</strong>, <strong>correo</strong>
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del grupo</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder="Ej: Clientes VIP"
                                className="input"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowUploadModal(false); setUploadFile(null); setGroupName(''); }}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFile || !groupName.trim() || uploading}
                                className="action-btn action-btn-primary disabled:opacity-50"
                            >
                                {uploading ? 'Subiendo...' : 'Crear Grupo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Group Modal */}
            {showEditModal && editingGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card p-6 w-full max-w-md animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Editar grupo</h3>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del grupo</label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveGroup}
                                disabled={!editName.trim()}
                                className="action-btn action-btn-primary disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card p-6 w-full max-w-md animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingContact ? 'Editar contacto' : 'Agregar contacto'}
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    className="input"
                                    placeholder="Nombre completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                                <input
                                    type="text"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="input"
                                    placeholder="3001234567"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Correo</label>
                                <input
                                    type="email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="input"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowContactModal(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveContact}
                                disabled={!contactName.trim()}
                                className="action-btn action-btn-primary disabled:opacity-50"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && deletingGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="card p-6 w-full max-w-md animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">¿Eliminar grupo?</h3>
                        <p className="text-gray-600 mb-6">
                            Se eliminará el grupo <strong>{deletingGroup.name}</strong> y todos sus {deletingGroup.contact_count} contactos. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowDeleteConfirm(false); setDeletingGroup(null); }}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDeleteGroup}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
