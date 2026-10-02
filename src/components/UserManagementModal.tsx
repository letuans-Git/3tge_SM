import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Key, 
  Phone, 
  Mail, 
  Check, 
  X,
  AlertCircle,
  Database,
  Sliders,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  Sparkles,
  Search,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Filter,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, UserRole } from '../types';
import { 
  PERMISSION_GROUPS, 
  SYSTEM_ROLE_DEFINITIONS, 
  PermissionAction, 
  RoleDefinition 
} from '../types/permissions';

export const UserManagementModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { 
    users, 
    currentUser, 
    createUser, 
    updateUser, 
    deleteUser, 
    roleDefinitions, 
    updateRolePermissions,
    getUserPermissions
  } = useAuth();
  
  // Default to 'users' tab as requested
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');

  // Search & Filter
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Form states for Users
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('technician');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customPerms, setCustomPerms] = useState<PermissionAction[]>([]);
  const [enableCustomPerms, setEnableCustomPerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app user deletion confirmation states (avoids window.confirm iframe blocks)
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Matrix Editing state for Roles
  const [selectedRoleKey, setSelectedRoleKey] = useState<UserRole>('technician');
  const [matrixDraft, setMatrixDraft] = useState<Record<UserRole, PermissionAction[]>>({
    admin: [...SYSTEM_ROLE_DEFINITIONS.admin.defaultPermissions],
    technician: [...(roleDefinitions.technician?.defaultPermissions || SYSTEM_ROLE_DEFINITIONS.technician.defaultPermissions)],
    cskh: [...(roleDefinitions.cskh?.defaultPermissions || SYSTEM_ROLE_DEFINITIONS.cskh.defaultPermissions)],
  });
  const [savingMatrix, setSavingMatrix] = useState(false);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setFullName('');
    setRole('technician');
    setStatus('ACTIVE');
    setPhone('');
    setEmail('');
    setCustomPerms([...(roleDefinitions.technician?.defaultPermissions || [])]);
    setEnableCustomPerms(false);
    setErrorMsg('');
    setSuccessMsg('');
    setIsAddMode(true);
  };

  const handleOpenEdit = (u: UserProfile) => {
    setEditingUserId(u.id);
    setUsername(u.username);
    setPassword('');
    setShowPassword(false);
    setFullName(u.fullName);
    setRole(u.role);
    setStatus(u.status || 'ACTIVE');
    setPhone(u.phone || '');
    setEmail(u.email || '');
    if (u.permissions && u.permissions.length > 0) {
      setEnableCustomPerms(true);
      setCustomPerms([...u.permissions]);
    } else {
      setEnableCustomPerms(false);
      setCustomPerms([...(roleDefinitions[u.role]?.defaultPermissions || [])]);
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsAddMode(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ tên đăng nhập và họ tên!');
      return;
    }

    if (!editingUserId && (!password.trim() || password.trim().length < 3)) {
      setErrorMsg('Vui lòng nhập mật khẩu có ít nhất 3 ký tự!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const permsPayload = enableCustomPerms ? customPerms : undefined;

    if (editingUserId) {
      const res = await updateUser(editingUserId, {
        fullName: fullName.trim(),
        role,
        status,
        phone: phone.trim(),
        email: email.trim(),
        permissions: permsPayload,
        ...(password.trim() ? { password: password.trim() } : {})
      });
      if (!res.success) {
        setErrorMsg(res.message || 'Lỗi cập nhật người dùng trên Cloud Firestore');
      } else {
        setIsAddMode(false);
        setSuccessMsg(`Đã cập nhật thông tin tài khoản thành công!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } else {
      const res = await createUser({
        username: username.trim().toLowerCase().replace(/\s+/g, ''),
        fullName: fullName.trim(),
        role,
        status,
        phone: phone.trim(),
        email: email.trim(),
        password: password.trim(),
        permissions: permsPayload
      });
      if (!res.success) {
        setErrorMsg(res.message || 'Lỗi tạo tài khoản trên Cloud Firestore');
      } else {
        setIsAddMode(false);
        setSuccessMsg(`Đã thêm tài khoản "${username.trim().toLowerCase().replace(/\s+/g, '')}" thành công!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = (u: UserProfile) => {
    if (u.id === currentUser?.id) {
      setErrorMsg('Bạn không thể tự xóa tài khoản của chính mình!');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    setDeleteError('');
    setUserToDelete(u);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await deleteUser(userToDelete.id);
      if (res.success) {
        const deletedName = userToDelete.fullName;
        setUserToDelete(null);
        setSuccessMsg(`Đã xóa vĩnh viễn tài khoản "${deletedName}" khỏi cơ sở dữ liệu Cloud Firestore!`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setDeleteError(res.message || 'Lỗi khi xóa người dùng trên Cloud Firestore');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Lỗi không xác định khi kết nối với Cloud Firestore');
    } finally {
      setIsDeleting(false);
    }
  };

  // Matrix Permission toggle for role
  const handleToggleMatrixPerm = (actionId: PermissionAction) => {
    if (selectedRoleKey === 'admin') return; // Admin has full permissions

    const currentRolePerms = matrixDraft[selectedRoleKey] || [];
    let updated: PermissionAction[];
    if (currentRolePerms.includes(actionId)) {
      updated = currentRolePerms.filter(p => p !== actionId);
    } else {
      updated = [...currentRolePerms, actionId];
    }

    setMatrixDraft(prev => ({
      ...prev,
      [selectedRoleKey]: updated
    }));
  };

  const handleToggleGroupInMatrix = (groupActions: PermissionAction[]) => {
    if (selectedRoleKey === 'admin') return;
    const current = matrixDraft[selectedRoleKey] || [];
    const allSelected = groupActions.every(a => current.includes(a));

    let updated: PermissionAction[];
    if (allSelected) {
      updated = current.filter(a => !groupActions.includes(a));
    } else {
      const toAdd = groupActions.filter(a => !current.includes(a));
      updated = [...current, ...toAdd];
    }

    setMatrixDraft(prev => ({
      ...prev,
      [selectedRoleKey]: updated
    }));
  };

  const handleSaveMatrix = async () => {
    setSavingMatrix(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateRolePermissions(selectedRoleKey, matrixDraft[selectedRoleKey]);
      setSuccessMsg(`Đã lưu thành công bảng phân quyền cho vai trò "${SYSTEM_ROLE_DEFINITIONS[selectedRoleKey].name}" lên Firestore!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi lưu phân quyền');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleResetToDefault = () => {
    setMatrixDraft(prev => ({
      ...prev,
      [selectedRoleKey]: [...SYSTEM_ROLE_DEFINITIONS[selectedRoleKey].defaultPermissions]
    }));
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">Admin</span>;
      case 'technician':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-300">Kỹ thuật</span>;
      case 'cskh':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300">CSKH</span>;
    }
  };

  // Filter users based on searchKeyword and roleFilter
  const filteredUsers = users.filter(u => {
    const matchKeyword = 
      u.username.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (u.phone && u.phone.includes(searchKeyword)) ||
      (u.email && u.email.toLowerCase().includes(searchKeyword.toLowerCase()));
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchKeyword && matchRole;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-xs animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Quản Trị Người Dùng & Phân Quyền Hệ Thống</h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              Cơ sở dữ liệu tập trung Cloud Firestore • Đồng bộ thời gian thực cho mọi thiết bị
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 text-xs transition ${
              activeTab === 'users'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Danh Sách Người Dùng ({users.length} Tài Khoản)
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-1.5 border-b-2 text-xs transition ${
              activeTab === 'matrix'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Ma Trận Phân Quyền Vai Trò ({PERMISSION_GROUPS.length} Nhóm Quyền)
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* TAB 1: USERS LIST (Thêm - Sửa - Xóa) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {!isAddMode ? (
                <div className="space-y-3.5">
                  {/* Notification banners */}
                  {successMsg && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Stats Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Tổng tài khoản</div>
                      <div className="text-base font-extrabold text-slate-900">{users.length}</div>
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">Quản Trị Viên</div>
                      <div className="text-base font-extrabold text-emerald-800">
                        {users.filter(u => u.role === 'admin').length}
                      </div>
                    </div>
                    <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200">
                      <div className="text-[10px] text-blue-700 font-bold uppercase">Kỹ Thuật Viên</div>
                      <div className="text-base font-extrabold text-blue-800">
                        {users.filter(u => u.role === 'technician').length}
                      </div>
                    </div>
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">CSKH / Kế toán</div>
                      <div className="text-base font-extrabold text-amber-800">
                        {users.filter(u => u.role === 'cskh').length}
                      </div>
                    </div>
                  </div>

                  {/* Filter and Add Button Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                          placeholder="Tìm tài khoản, họ tên, số điện thoại..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-emerald-500 font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value as any)}
                          className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 font-medium bg-white"
                        >
                          <option value="ALL">Tất cả vai trò</option>
                          <option value="admin">Quản Trị Viên (Admin)</option>
                          <option value="technician">Kỹ Thuật Viên</option>
                          <option value="cskh">CSKH / Kế toán</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenAdd}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Thêm Người Dùng Mới</span>
                    </button>
                  </div>

                  {/* Table of Users */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200 tracking-wider">
                          <th className="py-2.5 px-3">Tài Khoản (Username)</th>
                          <th className="py-2.5 px-3">Họ Tên</th>
                          <th className="py-2.5 px-3">Vai Trò</th>
                          <th className="py-2.5 px-3">Trạng Thái</th>
                          <th className="py-2.5 px-3">Quyền Hạn</th>
                          <th className="py-2.5 px-3">Liên Hệ</th>
                          <th className="py-2.5 px-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              Không tìm thấy người dùng nào phù hợp.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map(u => {
                            const perms = getUserPermissions(u);
                            const isCustom = u.permissions && u.permissions.length > 0;
                            const isCurrent = currentUser?.id === u.id;
                            const isInactive = u.status === 'INACTIVE';

                            return (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                  <div className="flex items-center gap-1.5">
                                    <span>{u.username}</span>
                                    {isCurrent && (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-sans font-bold px-1.5 py-0.5 rounded">
                                        Bạn (Đang đăng nhập)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                      {u.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{u.fullName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">{getRoleLabel(u.role)}</td>
                                <td className="py-2.5 px-3">
                                  {isInactive ? (
                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                                      <UserX className="w-3 h-3 text-rose-500" /> Tạm khóa
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                      <UserCheck className="w-3 h-3 text-emerald-500" /> Hoạt động
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {isCustom ? (
                                    <span className="bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded border border-purple-200 text-[10px]">
                                      Tùy biến ({perms.length} quyền)
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">
                                      Theo vai trò ({perms.length} quyền)
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  <div className="font-medium text-slate-800">{u.phone || '—'}</div>
                                  <div className="text-[10px] text-slate-400">{u.email || ''}</div>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleOpenEdit(u)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                      title="Sửa thông tin / đổi mật khẩu"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    {!isCurrent && (
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(u)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                                        title="Xóa tài khoản khỏi Cloud Firestore"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* FORM ADD / EDIT USER */
                <form onSubmit={handleUserSubmit} className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {editingUserId ? <Edit3 className="w-4 h-4 text-blue-600" /> : <UserPlus className="w-4 h-4 text-emerald-600" />}
                      {editingUserId ? 'Chỉnh Sửa Tài Khoản Người Dùng' : 'Thêm Người Dùng Mới Lên Cloud Firestore'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddMode(false)}
                      className="text-slate-600 font-semibold hover:text-slate-900 text-xs px-2 py-1 rounded hover:bg-slate-200 transition"
                    >
                      ← Quay lại danh sách
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-1.5 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Tên Đăng Nhập (Username) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={!!editingUserId}
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="viết liền, ví dụ: letuan, nguyenvanhung"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-slate-900 font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                      />
                      {editingUserId && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Tên đăng nhập không thể thay đổi sau khi tạo</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-800">
                          Mật Khẩu {editingUserId ? '(Bỏ trống nếu giữ nguyên)' : <span className="text-rose-500">*</span>}
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-slate-500 hover:text-emerald-700 flex items-center gap-0.5"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {showPassword ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={!editingUserId}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={editingUserId ? 'Nhập mật khẩu mới nếu muốn đổi...' : 'Nhập mật khẩu đăng nhập...'}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Họ Và Tên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ví dụ: Lê Tuấn"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">
                        Phân Quyền Vai Trò
                      </label>
                      <select
                        value={role}
                        onChange={(e) => {
                          const newR = e.target.value as UserRole;
                          setRole(newR);
                          if (!enableCustomPerms) {
                            setCustomPerms([...(roleDefinitions[newR]?.defaultPermissions || [])]);
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-900"
                      >
                        <option value="admin">Quản Trị Viên (Admin - Toàn quyền)</option>
                        <option value="technician">Kỹ Thuật Viên (Technician)</option>
                        <option value="cskh">Chăm Sóc Khách Hàng (CSKH / Kế toán)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Số Điện Thoại</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0913.xxx.xxx"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nhanvien@3tge.vn"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 mb-1">Trạng Thái Tài Khoản</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900"
                      >
                        <option value="ACTIVE">Hoạt động (Được phép đăng nhập)</option>
                        <option value="INACTIVE">Tạm khóa (Chặn đăng nhập)</option>
                      </select>
                    </div>
                  </div>

                  {/* Individual Custom Permission Toggle */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">
                          Tùy biến quyền hạn riêng cho tài khoản này
                        </span>
                        <p className="text-[10px] text-slate-500">
                          Nếu bật, tài khoản này sẽ được cấu hình quyền chi tiết riêng biệt thay vì quyền mặc định của vai trò
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableCustomPerms}
                          onChange={(e) => {
                            setEnableCustomPerms(e.target.checked);
                            if (e.target.checked && customPerms.length === 0) {
                              setCustomPerms([...(roleDefinitions[role]?.defaultPermissions || [])]);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {enableCustomPerms && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 max-h-60 overflow-y-auto space-y-3">
                        {PERMISSION_GROUPS.map(g => (
                          <div key={g.groupId} className="space-y-1.5">
                            <span className="font-bold text-slate-900 text-[11px] block">{g.groupName}</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {g.permissions.map(p => {
                                const checked = customPerms.includes(p.id);
                                return (
                                  <label key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => {
                                        if (checked) {
                                          setCustomPerms(customPerms.filter(x => x !== p.id));
                                        } else {
                                          setCustomPerms([...customPerms, p.id]);
                                        }
                                      }}
                                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                    />
                                    <span className="text-[11px] text-slate-800 font-medium">{p.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsAddMode(false)}
                      className="px-3.5 py-1.5 text-slate-700 font-semibold hover:bg-slate-200 rounded-lg transition"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Đang lưu vào Cloud...' : editingUserId ? 'Cập Nhật Tài Khoản' : 'Lưu Tài Khoản Vào Firestore'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: PERMISSION MATRIX BY ROLE */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Role selector banner */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-bold text-slate-700 text-xs block">Chọn vai trò để cấu hình nhóm quyền:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['admin', 'technician', 'cskh'] as UserRole[]).map(r => {
                      const def = SYSTEM_ROLE_DEFINITIONS[r];
                      const isSel = selectedRoleKey === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setSelectedRoleKey(r)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition ${
                            isSel
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {def.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedRoleKey !== 'admin' && (
                    <>
                      <button
                        onClick={handleResetToDefault}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-semibold flex items-center gap-1 transition"
                        title="Khôi phục quyền mặc định"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-400" />
                        <span>Mặc định</span>
                      </button>
                      <button
                        onClick={handleSaveMatrix}
                        disabled={savingMatrix}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingMatrix ? 'Đang lưu...' : 'Lưu Phân Quyền'}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Role description banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  {SYSTEM_ROLE_DEFINITIONS[selectedRoleKey].name}
                </div>
                <p className="mt-0.5 text-blue-700 text-[11px]">
                  {SYSTEM_ROLE_DEFINITIONS[selectedRoleKey].description}
                </p>
                {selectedRoleKey === 'admin' && (
                  <p className="mt-1 font-semibold text-emerald-700 text-[11px]">
                    * Lưu ý: Vai trò Quản Trị Viên (Admin) luôn sở hữu toàn bộ quyền hạn cao nhất của hệ thống và không bị giới hạn.
                  </p>
                )}
              </div>

              {/* Permission Groups Accordion/Grid */}
              <div className="space-y-3">
                {PERMISSION_GROUPS.map((group) => {
                  const rolePerms = selectedRoleKey === 'admin' 
                    ? SYSTEM_ROLE_DEFINITIONS.admin.defaultPermissions 
                    : (matrixDraft[selectedRoleKey] || []);
                  
                  const groupActionIds = group.permissions.map(p => p.id);
                  const isAllChecked = groupActionIds.every(id => rolePerms.includes(id));
                  const isSomeChecked = groupActionIds.some(id => rolePerms.includes(id)) && !isAllChecked;

                  return (
                    <div key={group.groupId} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {/* Group Header */}
                      <div className="bg-slate-50/80 px-3.5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 text-xs block">{group.groupName}</span>
                          <span className="text-[10px] text-slate-500">{group.description}</span>
                        </div>

                        {selectedRoleKey !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleGroupInMatrix(groupActionIds)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 hover:border-emerald-300 transition"
                          >
                            {isAllChecked ? (
                              <>
                                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Bỏ chọn nhóm</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                                <span>Chọn tất cả ({group.permissions.length})</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Group Permissions List */}
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked = rolePerms.includes(perm.id);
                          const isDisabled = selectedRoleKey === 'admin';

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border transition ${
                                isChecked
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-white border-slate-100 hover:border-slate-200'
                              } ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <input
                                type="checkbox"
                                disabled={isDisabled}
                                checked={isChecked}
                                onChange={() => handleToggleMatrixPerm(perm.id)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 disabled:opacity-75"
                              />
                              <div className="space-y-0.5">
                                <span className={`font-bold block text-[11px] ${isChecked ? 'text-emerald-900' : 'text-slate-800'}`}>
                                  {perm.name}
                                </span>
                                <span className="text-[10px] text-slate-500 block leading-tight">
                                  {perm.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Cơ chế RBAC (Role-Based Access Control) đa người dùng
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>

      {/* In-app confirmation dialog for deleting user (eliminates iframe confirm blocks) */}
      {userToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Xác Nhận Xóa Vĩnh Viễn Người Dùng</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong className="text-rose-700 font-bold">{userToDelete.fullName}</strong> (<span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">{userToDelete.username}</span>) khỏi cơ sở dữ liệu Cloud Firestore?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                Cảnh báo quan trọng:
              </div>
              <p>
                Hành động này sẽ xóa dữ liệu tài khoản vĩnh viễn trên Cloud Firestore. Người dùng sẽ không thể đăng nhập vào phần mềm này nữa.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError('');
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Vĩnh Viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
