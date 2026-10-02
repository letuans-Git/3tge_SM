import React, { useState } from 'react';
import { 
  Sun, 
  Lock, 
  User, 
  ArrowRight, 
  Phone, 
  ShieldCheck, 
  AlertCircle,
  Database,
  Building,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle2,
  Mail,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SolarLogo } from './SolarLogo';

export const LoginView: React.FC = () => {
  const { login, createFirstAdmin, users, loadingAuth } = useAuth();
  
  // Login form states (strictly no mock auto-fill credentials)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // First admin setup states (only shown if Firestore has 0 accounts)
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await login(username, password);
      if (!res.success) {
        setError(res.message || 'Đăng nhập không thành công');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối cơ sở dữ liệu Cloud Firestore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMasterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminUsername.trim() || !adminFullName.trim() || !adminPassword.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (adminPassword.length < 4) {
      setError('Mật khẩu quản trị phải có ít nhất 4 ký tự!');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createFirstAdmin({
        username: adminUsername,
        fullName: adminFullName,
        password: adminPassword,
        phone: adminPhone,
        email: adminEmail
      });

      if (!res.success) {
        setError(res.message || 'Không thể tạo tài khoản quản trị');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu dữ liệu lên Cloud Firestore');
    } finally {
      setSubmitting(false);
    }
  };

  const isFirstTimeSetup = !loadingAuth && users.length === 0;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <SolarLogo className="w-16 h-16 mx-auto mb-3 shadow-xl hover:scale-105 transition-transform" />
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          3TGE SOLAR
        </h1>
        <p className="mt-1 text-xs font-bold text-emerald-400 tracking-widest uppercase">
          Năng Lượng Xanh - Kiến Tạo Tương Lai
        </p>
        <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
          Hệ thống phần mềm quản lý kỹ thuật, trạm điện mặt trời, xuất nhập tồn & bảo dưỡng
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl rounded-2xl sm:px-8 border border-slate-200/80 space-y-5">
          
          {/* Header Info */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isFirstTimeSetup ? 'Thiết Lập Quản Trị Viên' : 'Đăng Nhập Hệ Thống'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isFirstTimeSetup 
                  ? 'Khởi tạo tài khoản Quản trị đầu tiên trên Cloud' 
                  : 'Xác thực tài khoản người dùng trên Cloud Firestore'}
              </p>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Cloud Firestore</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingAuth ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Đang kết nối cơ sở dữ liệu Cloud Firestore...</span>
            </div>
          ) : isFirstTimeSetup ? (
            /* FIRST-TIME SETUP: MASTER ADMIN REGISTRATION */
            <form className="space-y-3.5" onSubmit={handleCreateMasterAdmin}>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Cơ sở dữ liệu đám mây mới
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Chưa có tài khoản trên hệ thống. Vui lòng thiết lập tài khoản <strong>Quản Trị Viên (Admin)</strong> chính chủ để quản lý phần mềm.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Họ và tên Quản trị viên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-medium text-slate-900"
                    placeholder="Ví dụ: Lê Tuấn"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-mono font-bold text-slate-900"
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-medium text-slate-900"
                    placeholder="0913.xxx.xxx"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Email liên hệ
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-medium text-slate-900"
                  placeholder="admin@3tge.vn"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-medium text-slate-900"
                      placeholder="Tối thiểu 4 ký tự"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-emerald-500 font-medium text-slate-900"
                      placeholder="Nhập lại mật khẩu"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdminPassword}
                    onChange={(e) => setShowAdminPassword(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Hiển thị mật khẩu</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Đang tạo trên Firestore...' : 'Khởi Tạo Tài Khoản Quản Trị'}</span>
              </button>
            </form>
          ) : (
            /* STANDARD SECURE LOGIN FORM (NO MOCK USER CREDENTIALS) */
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Tên Đăng Nhập
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
                    placeholder="Nhập tên đăng nhập của bạn..."
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mật Khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-medium"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Ẩn mật khẩu
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Hiện mật khẩu
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 bg-white text-slate-900 font-medium placeholder:text-slate-400"
                    placeholder="Nhập mật khẩu..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
              >
                <span>{submitting ? 'Đang xác thực trên Cloud...' : 'Đăng Nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-500">
                  Tài khoản và quyền hạn được phân bổ trực tiếp bởi <strong>Quản Trị Viên</strong> trên Cloud Firestore.
                </p>
              </div>
            </form>
          )}

          {/* Database Info Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Cơ sở dữ liệu tập trung Firestore
            </span>
            <span className="font-mono text-slate-400">
              {users.length} tài khoản active
            </span>
          </div>
        </div>

        {/* Footer hotline */}
        <div className="text-center mt-5 text-xs text-slate-400 flex items-center justify-center gap-2">
          <Phone className="w-3.5 h-3.5 text-emerald-500" />
          <span>Hỗ trợ kỹ thuật 3TGE: <strong>0913.566.532</strong></span>
        </div>
      </div>
    </div>
  );
};
