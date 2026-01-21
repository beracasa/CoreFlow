
import React, { useState } from 'react';
import { UserRole, RoleDefinition, Permission } from '../../types';
import { Shield, Lock, CheckSquare, Square, Save, Plus, Trash2, Info, Users } from 'lucide-react';

// --- DEFINICIÓN DE PERMISOS DEL SISTEMA ---
const SYSTEM_PERMISSIONS: Permission[] = [
    // Operativos
    { id: 'view_dashboard', category: 'OPERATIONAL', label: 'View Dashboard & Map', description: 'Access to Visual Plant and monitoring.' },
    { id: 'view_kanban', category: 'OPERATIONAL', label: 'View Kanban Board', description: 'See maintenance ticket status.' },
    { id: 'create_wo', category: 'OPERATIONAL', label: 'Create Work Orders', description: 'Generate new R-MANT-02/05 tickets.' },
    { id: 'execute_wo', category: 'OPERATIONAL', label: 'Execute Work Orders', description: 'Fill checklists and consume parts.' },
    { id: 'log_hours', category: 'OPERATIONAL', label: 'Log Machine Hours', description: 'Update running hours counters.' },
    
    // Administrativos
    { id: 'approve_wo', category: 'ADMINISTRATIVE', label: 'Approve/Close Tickets', description: 'Final sign-off and closure of orders.' },
    { id: 'manage_inventory', category: 'ADMINISTRATIVE', label: 'Manage Inventory', description: 'Add/Edit spare parts and stock.' },
    { id: 'manage_assets', category: 'ADMINISTRATIVE', label: 'Manage Assets', description: 'Add/Edit machines and gateways.' },
    
    // Financieros
    { id: 'view_costs', category: 'FINANCIAL', label: 'View Financial Data', description: 'See costs of parts and maintenance.' },
    { id: 'view_analytics', category: 'FINANCIAL', label: 'View BI Analytics', description: 'Access full reporting dashboard.' },
    
    // Sistema
    { id: 'manage_users', category: 'SYSTEM', label: 'Manage Users', description: 'Invite users and assign roles.' },
    { id: 'manage_roles', category: 'SYSTEM', label: 'Manage Roles', description: 'Configure this RBAC module.' },
];

// --- ROLES INICIALES ---
const INITIAL_ROLES: RoleDefinition[] = [
    {
        id: UserRole.ADMIN_SOLICITANTE,
        name: 'Plant Manager (Admin)',
        description: 'Full system access and approval authority.',
        isSystem: true,
        usersCount: 2,
        permissions: SYSTEM_PERMISSIONS.map(p => p.id) // All permissions
    },
    {
        id: UserRole.TECNICO_MANT,
        name: 'Maintenance Technician',
        description: 'Execution of preventive and corrective tasks.',
        isSystem: true,
        usersCount: 15,
        permissions: ['view_dashboard', 'view_kanban', 'execute_wo', 'log_hours']
    },
    {
        id: UserRole.AUDITOR,
        name: 'Quality Auditor',
        description: 'Read-only access for compliance verification.',
        isSystem: true,
        usersCount: 3,
        permissions: ['view_dashboard', 'view_kanban', 'view_analytics']
    }
];

export const RoleManagement: React.FC = () => {
    const [roles, setRoles] = useState<RoleDefinition[]>(INITIAL_ROLES);
    const [selectedRole, setSelectedRole] = useState<RoleDefinition>(INITIAL_ROLES[0]);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form state used when creating/editing
    const [formData, setFormData] = useState<RoleDefinition>(INITIAL_ROLES[0]);

    const handleSelectRole = (role: RoleDefinition) => {
        setSelectedRole(role);
        setFormData(role);
        setIsEditing(false);
    };

    const handleCreateRole = () => {
        const newRole: RoleDefinition = {
            id: `custom-role-${Date.now()}`,
            name: 'New Custom Role',
            description: 'Define responsibilities...',
            isSystem: false,
            usersCount: 0,
            permissions: []
        };
        setRoles([...roles, newRole]);
        handleSelectRole(newRole);
        setIsEditing(true);
    };

    const togglePermission = (permId: string) => {
        if (!isEditing && selectedRole.isSystem) return; // Prevent editing system roles directly without explicit action if we wanted strictness, but let's allow "Save" to persist changes to memory

        const currentPerms = new Set(formData.permissions);
        if (currentPerms.has(permId)) {
            currentPerms.delete(permId);
        } else {
            currentPerms.add(permId);
        }
        setFormData({ ...formData, permissions: Array.from(currentPerms) });
        // Enable edit mode implicitly if modifying
        setIsEditing(true);
    };

    const handleSave = () => {
        setRoles(prev => prev.map(r => r.id === formData.id ? formData : r));
        setSelectedRole(formData);
        setIsEditing(false);
        // Here you would typically call an API to persist
        alert(`Role "${formData.name}" updated successfully.`);
    };

    const handleDelete = () => {
        if (selectedRole.isSystem) {
            alert("Cannot delete system roles.");
            return;
        }
        if (confirm(`Are you sure you want to delete ${selectedRole.name}?`)) {
            const newRoles = roles.filter(r => r.id !== selectedRole.id);
            setRoles(newRoles);
            handleSelectRole(newRoles[0]);
        }
    };

    // Group permissions for UI
    const groupedPermissions = SYSTEM_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="h-full flex gap-6">
            {/* Left Sidebar: Role List */}
            <div className="w-1/3 bg-industrial-800 rounded-lg border border-industrial-700 flex flex-col">
                <div className="p-4 border-b border-industrial-700 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Shield size={18} className="text-industrial-accent"/> System Roles
                    </h3>
                    <button 
                        onClick={handleCreateRole}
                        className="p-1.5 bg-industrial-700 hover:bg-industrial-600 rounded text-white transition-colors"
                        title="Create New Role"
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                                selectedRole.id === role.id 
                                ? 'bg-industrial-700 border-industrial-accent shadow-md' 
                                : 'bg-transparent border-transparent hover:bg-industrial-700/50 hover:border-industrial-600'
                            }`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className={`font-bold ${selectedRole.id === role.id ? 'text-white' : 'text-industrial-300'}`}>
                                    {role.name}
                                </span>
                                {role.isSystem && <Lock size={12} className="text-industrial-500"/>}
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] text-industrial-500 truncate w-32">{role.description}</p>
                                <span className="text-[10px] bg-industrial-900 text-industrial-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Users size={10} /> {role.usersCount || 0}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: Role Configuration */}
            <div className="flex-1 bg-industrial-800 rounded-lg border border-industrial-700 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-industrial-700 bg-industrial-900/30 flex justify-between items-start">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-industrial-700 flex items-center justify-center">
                                <Shield size={20} className="text-white"/>
                            </div>
                            <div className="flex-1">
                                <input 
                                    type="text" 
                                    className="bg-transparent border-b border-transparent hover:border-industrial-600 focus:border-industrial-accent text-xl font-bold text-white w-full outline-none transition-colors"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({...formData, name: e.target.value});
                                        setIsEditing(true);
                                    }}
                                />
                                <input 
                                    type="text" 
                                    className="bg-transparent border-b border-transparent hover:border-industrial-600 focus:border-industrial-accent text-sm text-industrial-400 w-full outline-none transition-colors mt-1"
                                    value={formData.description}
                                    onChange={(e) => {
                                        setFormData({...formData, description: e.target.value});
                                        setIsEditing(true);
                                    }}
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            {isEditing && (
                                <button 
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-industrial-accent hover:bg-blue-600 text-white text-sm font-bold rounded shadow-lg flex items-center gap-2"
                                >
                                    <Save size={14} /> Save Changes
                                </button>
                            )}
                            {!formData.isSystem && (
                                <button 
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 text-sm font-bold rounded flex items-center gap-2"
                                >
                                    <Trash2 size={14} /> Delete Role
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Permissions Configuration</h4>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                        {Object.entries(groupedPermissions).map(([category, perms]) => (
                            <div key={category} className="bg-industrial-900/50 rounded-lg p-4 border border-industrial-700/50">
                                <h5 className="text-xs font-bold text-industrial-400 uppercase mb-4 pb-2 border-b border-industrial-700">
                                    {category} Access
                                </h5>
                                <div className="space-y-3">
                                    {perms.map(perm => {
                                        const isEnabled = formData.permissions.includes(perm.id);
                                        return (
                                            <div 
                                                key={perm.id} 
                                                onClick={() => togglePermission(perm.id)}
                                                className={`flex items-start gap-3 p-2 rounded cursor-pointer transition-colors ${isEnabled ? 'bg-industrial-800' : 'hover:bg-industrial-800/50'}`}
                                            >
                                                <div className={`mt-0.5 ${isEnabled ? 'text-emerald-500' : 'text-industrial-600'}`}>
                                                    {isEnabled ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-industrial-400'}`}>
                                                        {perm.label}
                                                    </p>
                                                    <p className="text-[10px] text-industrial-500 leading-tight mt-0.5">
                                                        {perm.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
