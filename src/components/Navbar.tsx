import React, { useState } from 'react';
import { 
  Users, 
  CalendarClock, 
  Boxes, 
  Wallet, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  PhoneCall, 
  ChevronRight,
  Sliders,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { PermissionAction } from '../types/permissions';
import { UserManagementModal } from './UserManagementModal';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'dashboard' | 'customers' | 'maintenance' | 'inventory' | 'cashflow' | 'reports';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  isOnline
}) => {
  const { currentUser, users, logout, switchUserAccount, hasRole, hasPermission } = useAuth();
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);

  const navItems: { 
    id: NavTab; 
    label: string; 
    icon: React.ReactNode; 
    requiredPerm: PermissionAction;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, requiredPerm: 'dashboard_view' },
    { id: 'customers', label: 'Khách hàng', icon: <Users className="w-4 h-4" />, requiredPerm: 'customer_view' },
    { id: 'maintenance', label: 'Lịch & Bảo trì', icon: <CalendarClock className="w-4 h-4" />, requiredPerm: 'maintenance_schedule_view' },
    { id: 'inventory', label: 'Xuất Nhập Tồn', icon: <Boxes className="w-4 h-4" />, requiredPerm: 'inventory_view' },
    { id: 'cashflow', label: 'Thu Chi & Quỹ', icon: <Wallet className="w-4 h-4" />, requiredPerm: 'cashflow_view' },
    { id: 'reports', label: 'Báo cáo & Thống kê', icon: <BarChart3 className="w-4 h-4" />, requiredPerm: 'reports_view' },
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">Admin</span>;
      case 'technician':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-300">Kỹ thuật</span>;
      case 'cskh':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-300">CSKH</span>;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs w-full">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div 
                onClick={() => onSelectTab('dashboard')} 
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <img 
                  src="/logo-vuong.png" 
                  alt="3TGE Logo" 
                  className="w-9 h-9 rounded-lg shadow-2xs border border-slate-200/80 group-hover:scale-105 transition-transform shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-emerald-700 via-teal-700 to-cyan-700 bg-clip-text text-transparent">
                      3TGE
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-1 rounded">SOLAR</span>
                  </div>
                  <p className="text-[9px] font-semibold tracking-wider text-slate-500 hidden sm:block uppercase">
                    Năng Lượng Xanh - Kiến Tạo Tương Lai
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links (Checked with dynamic granular permission) */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                if (!hasPermission(item.requiredPerm)) {
                  return null;
                }
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Profile, Manage Permissions button & Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Install PWA button for Desktop & Mobile shortcuts */}
              <div className="hidden sm:block">
                <PWAInstallButton compact />
              </div>

              {/* User Management & Permissions button for Admins or users with permission */}
              {(currentUser?.role === 'admin' || hasPermission('users_view') || hasPermission('roles_configure')) && (
                <button
                  onClick={() => setIsUserMgmtOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-2xs"
                  title="Quản lý tài khoản người dùng và phân quyền hệ thống"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Quản Lý Người Dùng</span>
                </button>
              )}

              {/* Current user pill */}
              <div className="flex items-center gap-2 pl-1">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser?.fullName.split(' - ')[0] || currentUser?.username}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {currentUser && getRoleBadge(currentUser.role)}
                  </div>
                </div>

                <button
                  onClick={logout}
                  title="Đăng xuất khỏi hệ thống"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white/98 w-full animate-in slide-in-from-top-2 duration-150">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 pt-3 pb-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-slate-800">{currentUser?.fullName}</div>
                  <div className="text-[10px] text-slate-500">Username: <span className="font-mono font-bold text-emerald-700">{currentUser?.username}</span></div>
                </div>
                <div>
                  {currentUser && getRoleBadge(currentUser.role)}
                </div>
              </div>

              {/* Install App on mobile shortcut */}
              <div className="pt-0.5">
                <PWAInstallButton />
              </div>

              {(currentUser?.role === 'admin' || hasPermission('users_view') || hasPermission('roles_configure')) && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsUserMgmtOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-300 text-xs"
                >
                  <Users className="w-4 h-4 text-emerald-600" />
                  Quản Lý Người Dùng & Phân Quyền ({users.length} Users)
                </button>
              )}

              <div className="space-y-1">
                {navItems.map((item) => {
                  if (!hasPermission(item.requiredPerm)) {
                    return null;
                  }
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? 'text-emerald-600' : 'text-slate-400'}>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold rounded-lg text-xs flex items-center justify-center gap-2 border border-rose-200"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng Xuất Khỏi Hệ Thống
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* User Management & Permission Matrix Modal */}
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
      />
    </>
  );
};
