import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { PermissionAction, SYSTEM_ROLE_DEFINITIONS, RoleDefinition } from '../types/permissions';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  loadingAuth: boolean;
  roleDefinitions: Record<string, RoleDefinition>;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  createUser: (user: Omit<UserProfile, 'id'>) => Promise<{ success: boolean; message?: string }>;
  createFirstAdmin: (adminData: {
    username: string;
    fullName: string;
    password: string;
    phone: string;
    email: string;
  }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (id: string, updates: Partial<UserProfile>) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message?: string }>;
  updateRolePermissions: (role: UserRole, permissions: PermissionAction[]) => Promise<{ success: boolean; message?: string }>;
  switchUserAccount: (userId: string) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  hasPermission: (action: PermissionAction) => boolean;
  getUserPermissions: (user?: UserProfile | null) => PermissionAction[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = '3tge_authenticated_user_id';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [roleDefinitions, setRoleDefinitions] = useState<Record<string, RoleDefinition>>(SYSTEM_ROLE_DEFINITIONS);

  // Synchronize dynamic role permissions from Firestore 'system_roles' collection
  useEffect(() => {
    const unsubRoles = onSnapshot(collection(db, 'system_roles'), (snap) => {
      if (!snap.empty) {
        const loaded: Record<string, RoleDefinition> = { ...SYSTEM_ROLE_DEFINITIONS };
        snap.forEach(d => {
          const data = d.data();
          if (loaded[d.id]) {
            loaded[d.id] = {
              ...loaded[d.id],
              defaultPermissions: data.defaultPermissions || loaded[d.id].defaultPermissions
            };
          }
        });
        setRoleDefinitions(loaded);
      } else {
        // Initialize default roles in firestore
        Object.entries(SYSTEM_ROLE_DEFINITIONS).forEach(async ([roleKey, def]) => {
          try {
            await setDoc(doc(db, 'system_roles', roleKey), {
              role: def.role,
              name: def.name,
              defaultPermissions: def.defaultPermissions
            });
          } catch (e) {
            console.warn('Initial role seed note:', e);
          }
        });
      }
    }, (err) => {
      console.warn('system_roles listener warning:', err);
    });

    return () => unsubRoles();
  }, []);

  // Synchronize users in real time from Firestore 'users' collection exclusively
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList: UserProfile[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          userList.push({ ...d.data(), id: d.id } as UserProfile);
        });
      }

      setUsers(userList);

      // Restore session if user ID is saved in localStorage
      const savedUserId = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedUserId && userList.length > 0) {
        const found = userList.find(u => u.id === savedUserId);
        if (found) {
          if (found.status === 'INACTIVE') {
            // Log out if account was deactivated
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setCurrentUser(null);
          } else {
            setCurrentUser(found);
          }
        } else {
          // If deleted from Firestore, log out
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setCurrentUser(null);
        }
      } else if (!savedUserId) {
        setCurrentUser(null);
      }

      setLoadingAuth(false);
    }, (error) => {
      console.error('Firestore users listener error:', error);
      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!' };
    }
    
    let targetUser = users.find(u => u.username.toLowerCase() === cleanUsername);

    // Direct Firestore query fallback
    if (!targetUser) {
      try {
        const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docItem = snap.docs[0];
          targetUser = { ...docItem.data(), id: docItem.id } as UserProfile;
        }
      } catch (err) {
        console.warn('Direct firestore query failed:', err);
      }
    }

    if (!targetUser) {
      return { 
        success: false, 
        message: 'Tài khoản không tồn tại trên Cloud Firestore! Vui lòng kiểm tra lại tên đăng nhập hoặc liên hệ Quản trị viên để được cấp tài khoản.' 
      };
    }

    if (targetUser.status === 'INACTIVE') {
      return {
        success: false,
        message: 'Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên hệ thống để kích hoạt lại!'
      };
    }

    if (targetUser.password && targetUser.password !== cleanPassword) {
      return { success: false, message: 'Mật khẩu không chính xác! Vui lòng kiểm tra lại.' };
    }

    setCurrentUser(targetUser);
    localStorage.setItem(SESSION_STORAGE_KEY, targetUser.id);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
  };

  const switchUserAccount = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target && target.status !== 'INACTIVE') {
      setCurrentUser(target);
      localStorage.setItem(SESSION_STORAGE_KEY, target.id);
    }
  };

  // Create First Master Admin when system has no users on Firestore
  const createFirstAdmin = async (adminData: {
    username: string;
    fullName: string;
    password: string;
    phone: string;
    email: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const cleanUsername = adminData.username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername) {
      return { success: false, message: 'Tên đăng nhập không được để trống!' };
    }
    if (!adminData.password.trim() || adminData.password.trim().length < 3) {
      return { success: false, message: 'Mật khẩu phải có ít nhất 3 ký tự!' };
    }

    const newId = `user_${Date.now()}`;
    const newAdmin: UserProfile = {
      id: newId,
      username: cleanUsername,
      fullName: adminData.fullName.trim(),
      role: 'admin',
      phone: adminData.phone.trim(),
      email: adminData.email.trim(),
      password: adminData.password.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'users', newId), newAdmin);
      setCurrentUser(newAdmin);
      localStorage.setItem(SESSION_STORAGE_KEY, newId);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi khi tạo tài khoản quản trị trên Cloud Firestore' };
    }
  };

  const createUser = async (userData: Omit<UserProfile, 'id'>): Promise<{ success: boolean; message?: string }> => {
    const cleanUsername = userData.username.trim().toLowerCase().replace(/\s+/g, '');
    
    if (!cleanUsername) {
      return { success: false, message: 'Tên đăng nhập không hợp lệ!' };
    }

    // Check existing in memory
    const existing = users.find(u => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, message: `Tên đăng nhập "${cleanUsername}" đã tồn tại trên Cloud Firestore!` };
    }

    // Check existing directly in Firestore
    try {
      const q = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { success: false, message: `Tên đăng nhập "${cleanUsername}" đã tồn tại trên Cloud Firestore!` };
      }
    } catch (err) {
      console.warn('Check username uniqueness warning:', err);
    }

    const newId = `user_${Date.now()}`;
    const newUser: Record<string, any> = {
      id: newId,
      username: cleanUsername,
      fullName: userData.fullName.trim(),
      role: userData.role,
      status: userData.status || 'ACTIVE',
      phone: userData.phone?.trim() || '',
      email: userData.email?.trim() || '',
      password: userData.password?.trim() || '123456',
      createdAt: new Date().toISOString()
    };

    if (userData.permissions && userData.permissions.length > 0) {
      newUser.permissions = userData.permissions;
    }

    try {
      await setDoc(doc(db, 'users', newId), newUser);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi khi lưu tài khoản vào Cloud Firestore' };
    }
  };

  const updateUser = async (id: string, updates: Partial<UserProfile>): Promise<{ success: boolean; message?: string }> => {
    try {
      const payload: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id') continue;

        if (val === undefined) {
          // In Firestore, undefined is invalid; use deleteField() to remove field from document
          payload[key] = deleteField();
        } else if (key === 'password') {
          // Only update password if a non-empty string was entered
          if (typeof val === 'string' && val.trim().length > 0) {
            payload.password = val.trim();
          }
        } else {
          payload[key] = val;
        }
      }

      await updateDoc(doc(db, 'users', id), payload);

      // Create clean local update representation
      const localUpdates: Partial<UserProfile> = { ...updates };
      if (!localUpdates.password || !localUpdates.password.trim()) {
        delete localUpdates.password;
      }
      if (localUpdates.permissions === undefined) {
        delete localUpdates.permissions;
      }

      setUsers(prev => prev.map(u => {
        if (u.id === id) {
          const next = { ...u, ...localUpdates, updatedAt: payload.updatedAt };
          if (updates.permissions === undefined) {
            delete next.permissions;
          }
          return next;
        }
        return u;
      }));

      if (currentUser?.id === id) {
        setCurrentUser(prev => {
          if (!prev) return null;
          const next = { ...prev, ...localUpdates, updatedAt: payload.updatedAt };
          if (updates.permissions === undefined) {
            delete next.permissions;
          }
          return next;
        });
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi khi cập nhật tài khoản trên Cloud Firestore' };
    }
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (currentUser?.id === id) {
      return { success: false, message: 'Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!' };
    }
    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi khi xóa tài khoản khỏi Cloud Firestore' };
    }
  };

  const updateRolePermissions = async (role: UserRole, permissions: PermissionAction[]): Promise<{ success: boolean; message?: string }> => {
    try {
      await setDoc(doc(db, 'system_roles', role), {
        role,
        defaultPermissions: permissions
      }, { merge: true });

      setRoleDefinitions(prev => ({
        ...prev,
        [role]: {
          ...prev[role],
          defaultPermissions: permissions
        }
      }));
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi khi lưu bảng phân quyền vai trò lên Firestore' };
    }
  };

  const getUserPermissions = (user?: UserProfile | null): PermissionAction[] => {
    const target = user || currentUser;
    if (!target) return [];
    
    // If user has specific custom override permissions, use them
    if (target.permissions && target.permissions.length > 0) {
      return target.permissions;
    }

    // Otherwise use role group defaults
    const roleDef = roleDefinitions[target.role] || SYSTEM_ROLE_DEFINITIONS[target.role];
    return roleDef ? roleDef.defaultPermissions : [];
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  const hasPermission = (action: PermissionAction): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Super admin has access to all actions

    const perms = getUserPermissions(currentUser);
    return perms.includes(action);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      users,
      loadingAuth,
      roleDefinitions,
      login, 
      logout, 
      createUser,
      createFirstAdmin,
      updateUser,
      deleteUser,
      updateRolePermissions,
      switchUserAccount,
      hasRole,
      hasPermission,
      getUserPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
