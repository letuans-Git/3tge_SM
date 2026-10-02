import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Eye, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  X,
  Ban,
  RotateCcw,
  AlertCircle,
  Users,
  ShieldAlert,
  UserX,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Wind
} from 'lucide-react';
import { Customer, SystemStatus } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CustomerFormModal } from './CustomerFormModal';
import { exportCustomersToExcel } from '../utils/exportUtils';
import { formatDateVN, formatDateTimeVN } from '../utils/dateUtils';

export const getCustomerPhase = (customer: Customer): string => {
  const phases = customer.inverters?.map(i => i.phase).filter(Boolean) as string[];
  if (phases && phases.length > 0) {
    const unique = Array.from(new Set(phases));
    return unique.join(', ');
  }
  return customer.totalCapacityKW >= 8 ? '3 pha' : '1 pha';
};

export const getPhaseBadgeClass = (phase: string): string => {
  if (phase.includes('3 pha')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  return 'bg-[#FAF0ED] text-[#8B3A2B] border-[#E8D0C9]';
};

export const getPhaseTextColor = (phase: string): string => {
  if (phase.includes('3 pha')) {
    return 'text-blue-700';
  }
  return 'text-[#8B3A2B]';
};

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    disableCustomer, 
    restoreCustomer, 
    deleteCustomer, 
    generateNextCustomerCode, 
    sendMaintenanceNotification 
  } = useData();
  const { currentUser, hasRole, hasPermission } = useAuth();

  // Tab: 'ACTIVE' (Hồ sơ đang hoạt động) | 'DISABLED' (Danh sách khách hàng bị vô hiệu hóa)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarranty, setSelectedWarranty] = useState<string>('ALL');
  const [selectedMaintenanceFilter, setSelectedMaintenanceFilter] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleExportExcelClick = () => {
    try {
      if (!filteredCustomers || filteredCustomers.length === 0) {
        showToast('Không có dữ liệu khách hàng nào để xuất Excel!', 'info');
        return;
      }
      exportCustomersToExcel(filteredCustomers);
      showToast(`Đã xuất thành công tệp Excel gồm ${filteredCustomers.length} khách hàng!`, 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      showToast('Có lỗi xảy ra khi tạo tệp Excel. Vui lòng thử lại!', 'error');
    }
  };

  const handleOpenAddCustomerModal = () => {
    try {
      setEditingCustomer(null);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Open add customer modal error:', err);
    }
  };
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleOpenLightbox = (src: string, title: string) => {
    setLightboxImage({ src, title });
    setZoomScale(1);
    setRotation(0);
  };

  // Disable Modal Confirmation
  const [disablingCustomer, setDisablingCustomer] = useState<Customer | null>(null);
  const [disableReason, setDisableReason] = useState('Khách hàng tạm ngưng dịch vụ / thanh lý hệ thống');

  // Hard Delete Modal Confirmation (Only for already disabled customers)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Quick notification dispatch modal
  const [notifTarget, setNotifTarget] = useState<Customer | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>>([
    'Zalo OA', 'Telegram Bot'
  ]);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccessMsg, setNotifSuccessMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Total counts for tabs
  const activeCount = customers.filter(c => !c.isDisabled).length;
  const disabledCount = customers.filter(c => c.isDisabled).length;

  // Filter list based on active tab and search filters
  const filteredCustomers = customers.filter(c => {
    // 1. Tab filter
    if (activeTab === 'ACTIVE' && c.isDisabled) return false;
    if (activeTab === 'DISABLED' && !c.isDisabled) return false;

    // 2. Search query: ID, name, phone, contract, inverter SN, battery SN, wind SN
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inSerial = c.inverters?.some(i => i.serialNumber.toLowerCase().includes(q)) || false;
      const inBat = c.batteries?.some(b => b.serialNumber.toLowerCase().includes(q)) || false;
      const inWind = c.windTurbines?.some(w => w.serialNumber.toLowerCase().includes(q)) || false;
      const matchesSearch = 
        c.customerCode.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        inSerial ||
        inBat ||
        inWind;
      if (!matchesSearch) return false;
    }

    // 3. Filter province
    if (selectedProvince && c.province !== selectedProvince) {
      return false;
    }

    // 4. Filter status
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
      return false;
    }

    // 5. Filter warranty
    if (selectedWarranty === 'VALID' && c.warrantyExpiryDate < todayStr) return false;
    if (selectedWarranty === 'EXPIRED' && c.warrantyExpiryDate >= todayStr) return false;

    // 6. Filter maintenance schedule
    if (selectedMaintenanceFilter === 'OVERDUE') {
      if (!c.nextMaintenanceDate || c.nextMaintenanceDate >= todayStr) return false;
    } else if (selectedMaintenanceFilter === 'SOON') {
      const diff = Math.ceil((new Date(c.nextMaintenanceDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (diff < 0 || diff > 5) return false;
    }

    return true;
  });

  const getStatusBadge = (status: SystemStatus, isDisabled?: boolean) => {
    if (isDisabled) {
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200/90 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
          <Ban className="w-3 h-3 text-rose-600" />
          Đã vô hiệu
        </span>
      );
    }
    switch (status) {
      case 'Hoạt động tốt':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold px-2 py-0.5 rounded-full">✓ Hoạt động tốt</span>;
      case 'Cần kiểm tra':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200/80 text-[11px] font-bold px-2 py-0.5 rounded-full">⚠️ Cần kiểm tra</span>;
      case 'Đang bảo trì':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-bold px-2 py-0.5 rounded-full">⚙️ Đang bảo trì</span>;
      case 'Ngừng hoạt động':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-bold px-2 py-0.5 rounded-full">🛑 Ngừng hoạt động</span>;
      default:
        return null;
    }
  };

  const getMaintenancePill = (dateStr: string) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    const formatted = formatDateVN(dateStr);
    
    if (diff < 0) {
      return (
        <span className="bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-rose-300">
          Quá hạn {Math.abs(diff)} ngày ({formatted})
        </span>
      );
    } else if (diff === 0) {
      return (
        <span className="bg-orange-100 text-orange-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-orange-300 animate-pulse">
          Đến hạn hôm nay ({formatted})
        </span>
      );
    } else if (diff <= 5) {
      return (
        <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-md border border-amber-300">
          Sắp đến hạn ({diff} ngày nữa - {formatted})
        </span>
      );
    } else {
      return (
        <span className="text-slate-600 text-[11px] font-medium">
          {formatted}
        </span>
      );
    }
  };

  const handleSendNotification = async () => {
    if (!notifTarget || selectedChannels.length === 0) return;
    setSendingNotif(true);
    await sendMaintenanceNotification(notifTarget, selectedChannels);
    setSendingNotif(false);
    setNotifSuccessMsg(`Đã gửi thông báo thành công cho khách hàng ${notifTarget.customerName}!`);
    setTimeout(() => {
      setNotifSuccessMsg('');
      setNotifTarget(null);
    }, 2000);
  };

  const handleConfirmDisable = async () => {
    if (!disablingCustomer) return;
    await disableCustomer(disablingCustomer.id, disableReason);
    setDisablingCustomer(null);
  };

  const handleConfirmHardDelete = async () => {
    if (!deletingCustomer) return;
    if (!deletingCustomer.isDisabled) {
      alert('Chỉ được xóa khách hàng sau khi đã vô hiệu hóa!');
      return;
    }
    await deleteCustomer(deletingCustomer.id);
    setDeletingCustomer(null);
  };

  const provinces = Array.from(new Set(customers.map(c => c.province).filter(Boolean)));

  return (
    <div className="space-y-2.5">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border shadow-sm transition-all duration-200 ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-blue-50 text-blue-800 border-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 ${toastMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span>{toastMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Quản Lý Hồ Sơ Khách Hàng</h2>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
              {filteredCustomers.length} Hồ sơ
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Mã KH tự động sinh tuần tự (KH000001...) • Cơ chế bảo vệ: Vô hiệu hóa trước khi xóa vĩnh viễn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('customer_export') && (
            <button
              type="button"
              onClick={handleExportExcelClick}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Xuất</span> Excel
            </button>
          )}

          {hasPermission('customer_create') && (
            <button
              type="button"
              onClick={handleOpenAddCustomerModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Khách Hàng
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs: Đang hoạt động vs Bị vô hiệu */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'ACTIVE'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Đang Hoạt Động ({activeCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('DISABLED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'DISABLED'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <UserX className="w-3.5 h-3.5" />
          <span>Danh Sách Đã Vô Hiệu Hóa ({disabledCount})</span>
        </button>
      </div>

      {/* Info notice for DISABLED tab */}
      {activeTab === 'DISABLED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Chính sách bảo toàn dữ liệu:</span>
            <p className="text-amber-700 text-[11px]">
              Khách hàng ở danh sách này đang tạm ngưng sử dụng hệ thống và không phát sinh thông báo bảo trì định kỳ. 
              Bạn có thể <strong>Khôi phục</strong> để đưa khách hàng trở lại hoạt động, hoặc chỉ thực hiện <strong>Xóa vĩnh viễn</strong> tại đây nếu thực sự cần thiết.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {/* Text Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Tìm mã KH, tên, SĐT, hợp đồng, Serial SN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200 focus:bg-white focus:outline-emerald-500"
            />
          </div>

          {/* Province Filter */}
          <div>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200"
            >
              <option value="">Tất cả tỉnh/thành</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Hoạt động tốt">Hoạt động tốt</option>
              <option value="Cần kiểm tra">Cần kiểm tra</option>
              <option value="Đang bảo trì">Đang bảo trì</option>
              <option value="Ngừng hoạt động">Ngừng hoạt động</option>
            </select>
          </div>

          {/* Maintenance Filter */}
          <div>
            <select
              value={selectedMaintenanceFilter}
              onChange={(e) => setSelectedMaintenanceFilter(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200"
            >
              <option value="ALL">Lịch bảo trì: Tất cả</option>
              <option value="OVERDUE">Quá hạn bảo dưỡng</option>
              <option value="SOON">Sắp đến hạn (&le; 5 ngày)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table / Mobile Responsive Cards */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[9.5px] tracking-wider leading-none">
                <th className="py-1 px-2">Mã KH</th>
                <th className="py-1 px-2">Khách Hàng & Liên Hệ</th>
                <th className="py-1 px-2">Địa Chỉ & Hợp Đồng</th>
                <th className="py-1 px-2">Biến Tần & Pin Lưu Trữ</th>
                <th className="py-1 px-2">Công Suất</th>
                <th className="py-1 px-2">{activeTab === 'DISABLED' ? 'Thời Điểm Vô Hiệu' : 'Kỳ Bảo Dưỡng'}</th>
                <th className="py-1 px-2">Trạng Thái</th>
                <th className="py-1 px-2 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    {activeTab === 'ACTIVE' 
                      ? 'Không tìm thấy khách hàng nào khớp với điều kiện tìm kiếm.'
                      : 'Hiện không có khách hàng nào trong danh sách bị vô hiệu hóa.'}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50/70 transition group ${c.isDisabled ? 'bg-slate-50/40 text-slate-500' : ''}`}>
                    <td className="py-1 px-2 font-mono font-bold text-emerald-700 whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1">
                        {c.isDisabled && <Ban className="w-3 h-3 text-rose-500 shrink-0" />}
                        <span>{c.customerCode}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2">
                      <div className="font-bold text-slate-800 text-[11.5px] leading-tight">{c.customerName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 leading-none mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        {c.phoneNumber}
                      </div>
                    </td>
                    <td className="py-1 px-2 max-w-[200px]">
                      <div className="truncate text-slate-700 flex items-center gap-1 leading-tight text-[11px]" title={c.address}>
                        <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                      <div className="text-[9.5px] text-black font-semibold leading-none mt-0.5">HĐ: {c.contractNumber}</div>
                    </td>
                    <td className="py-1 px-2">
                      <div className="leading-tight">
                        <div className="text-[10.5px] font-semibold text-slate-800">
                          {c.inverters?.length || 0} Inverter ({c.inverters?.map(i => i.brand).join(', ') || 'N/A'})
                        </div>
                        <div className="text-[9.5px] text-slate-500 leading-none mt-0.5">
                          {c.batteries?.length || 0} Pin ({c.batteries?.map(b => b.brand).join(', ') || 'N/A'})
                        </div>
                      </div>
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-slate-800 text-xs">
                          {c.totalCapacityKW} <span className="text-[9.5px] font-normal text-slate-500">KW</span>
                        </span>
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${getPhaseBadgeClass(getCustomerPhase(c))}`}>
                          {getCustomerPhase(c)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      {activeTab === 'DISABLED' ? (
                        <div className="leading-tight">
                          <div className="text-[10.5px] font-semibold text-rose-700">
                            {c.disabledAt ? formatDateVN(c.disabledAt) : 'Đã vô hiệu'}
                          </div>
                          {c.disabledReason && (
                            <div className="text-[9.5px] text-black italic truncate max-w-[150px]" title={c.disabledReason}>
                              {c.disabledReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        getMaintenancePill(c.nextMaintenanceDate)
                      )}
                    </td>
                    <td className="py-1 px-2 whitespace-nowrap">
                      {getStatusBadge(c.status, c.isDisabled)}
                    </td>
                    <td className="py-1 px-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Chi tiết */}
                        <button
                          onClick={() => setViewingCustomer(c)}
                          title="Xem chi tiết hồ sơ"
                          className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Nếu đang ở tab Active: Hiển thị gửi nhắc hẹn + sửa + vô hiệu hóa */}
                        {!c.isDisabled ? (
                          <>
                            {hasPermission('maintenance_notify_send') && (
                              <button
                                onClick={() => setNotifTarget(c)}
                                title="Gửi thông báo bảo dưỡng"
                                className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {hasPermission('customer_edit') && (
                              <button
                                onClick={() => {
                                  setEditingCustomer(c);
                                  setIsModalOpen(true);
                                }}
                                title="Sửa hồ sơ"
                                className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Nút Vô Hiệu Hóa (Thay thế nút xóa trực tiếp) */}
                            {hasPermission('customer_disable') && (
                              <button
                                onClick={() => {
                                  setDisablingCustomer(c);
                                  setDisableReason('Khách hàng tạm ngưng dịch vụ / thanh lý hệ thống');
                                }}
                                title="Vô hiệu hóa khách hàng (Chuyển vào danh sách vô hiệu)"
                                className="p-1 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        ) : (
                          /* Nếu ở tab BỊ VÔ HIỆU HÓA: Cho phép Khôi Phục hoặc Xóa Vĩnh Viễn */
                          <>
                            {hasPermission('customer_disable') && (
                              <button
                                onClick={() => restoreCustomer(c.id)}
                                title="Khôi phục khách hàng về danh sách hoạt động"
                                className="p-1 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition font-bold"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* CHỈ ĐƯỢC XÓA SAU KHI ĐÃ VÔ HIỆU HÓA */}
                            {hasPermission('customer_delete') && (
                              <button
                                onClick={() => setDeletingCustomer(c)}
                                title="Xóa vĩnh viễn hồ sơ này (Đã thỏa điều kiện đã vô hiệu)"
                                className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 p-2 space-y-2">
          {filteredCustomers.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {activeTab === 'ACTIVE' 
                ? 'Không có khách hàng thỏa điều kiện.'
                : 'Không có khách hàng nào trong danh sách bị vô hiệu hóa.'}
            </div>
          ) : (
            filteredCustomers.map(c => (
              <div key={c.id} className={`p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-2 ${c.isDisabled ? 'bg-slate-50/50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {c.customerCode}
                      </span>
                      {c.isDisabled && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                          Đã vô hiệu
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm mt-1">{c.customerName}</h3>
                  </div>
                  {getStatusBadge(c.status, c.isDisabled)}
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c.phoneNumber}</span>
                    </div>
                    <span className="text-[11px] text-black font-semibold">HĐ: {c.contractNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                      Công suất: <strong className="text-slate-800">{c.totalCapacityKW} KW</strong>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getPhaseBadgeClass(getCustomerPhase(c))}`}>
                        {getCustomerPhase(c)}
                      </span>
                    </span>
                    <div>
                      {c.isDisabled 
                        ? <span className="text-[10px] text-rose-600 font-medium">Tạm ngưng</span>
                        : getMaintenancePill(c.nextMaintenanceDate)}
                    </div>
                  </div>
                </div>

                {/* Mobile action bar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setViewingCustomer(c)}
                    className="text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Chi tiết
                  </button>

                  {!c.isDisabled ? (
                    <>
                      {hasPermission('maintenance_notify_send') && (
                        <button
                          onClick={() => setNotifTarget(c)}
                          className="text-amber-700 font-semibold flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5" /> Nhắc hẹn
                        </button>
                      )}
                      {hasPermission('customer_edit') && (
                        <button
                          onClick={() => {
                            setEditingCustomer(c);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-700 font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>
                      )}
                      {hasPermission('customer_disable') && (
                        <button
                          onClick={() => {
                            setDisablingCustomer(c);
                            setDisableReason('Khách hàng tạm ngưng dịch vụ / thanh lý hệ thống');
                          }}
                          className="text-amber-600 font-semibold flex items-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" /> Vô hiệu
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {hasPermission('customer_disable') && (
                        <button
                          onClick={() => restoreCustomer(c.id)}
                          className="text-emerald-700 font-semibold flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
                        </button>
                      )}
                      {hasPermission('customer_delete') && (
                        <button
                          onClick={() => setDeletingCustomer(c)}
                          className="text-rose-600 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Xóa vĩnh viễn
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Customer Form Modal */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        initialData={editingCustomer}
        nextCustomerCode={generateNextCustomerCode()}
        onSubmit={async (data) => {
          try {
            if (editingCustomer) {
              await updateCustomer(editingCustomer.id, data);
              showToast(`Đã cập nhật thành công khách hàng ${editingCustomer.customerCode}!`, 'success');
            } else {
              const code = await addCustomer(data);
              showToast(`Đã thêm mới thành công khách hàng ${code} - ${data.customerName}!`, 'success');
            }
          } catch (err: any) {
            console.error('Error saving customer:', err);
            showToast('Lỗi khi lưu thông tin khách hàng: ' + (err.message || ''), 'error');
          }
        }}
      />

      {/* VIEW CUSTOMER DETAIL MODAL */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 max-h-[94vh] overflow-y-auto space-y-2.5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {viewingCustomer.customerCode}
                  </span>
                  <span className="text-xs text-black font-bold">HĐ: {viewingCustomer.contractNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(viewingCustomer.status)}`}>
                    {viewingCustomer.status}
                  </span>
                  {viewingCustomer.isDisabled && (
                    <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      Đã vô hiệu
                    </span>
                  )}
                </div>
                <h3 className="text-base font-extrabold text-black mt-1">{viewingCustomer.customerName}</h3>
              </div>
              <button 
                onClick={() => setViewingCustomer(null)}
                className="p-1 rounded-lg text-black hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingCustomer.isDisabled && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-black space-y-0.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-700">
                  <Ban className="w-4 h-4 text-rose-600" />
                  Hồ sơ đang bị vô hiệu hóa
                </div>
                <div><strong className="text-black">Lý do:</strong> {viewingCustomer.disabledReason || 'Không có ghi chú lý do'}</div>
                {viewingCustomer.disabledAt && (
                  <div className="text-[11px] text-black">Thời điểm vô hiệu: {formatDateTimeVN(viewingCustomer.disabledAt)}</div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-black">
              <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                <span className="font-extrabold text-black uppercase tracking-wider text-[11px] block border-b border-slate-200/80 pb-0.5 mb-1">Thông Tin Khách Hàng</span>
                <p><strong className="text-black font-bold">Số điện thoại:</strong> <span className="font-semibold text-black">{viewingCustomer.phoneNumber}</span></p>
                <p><strong className="text-black font-bold">Địa chỉ:</strong> <span className="font-medium text-black">{viewingCustomer.address}</span></p>
                <p><strong className="text-black font-bold">Tỉnh/Thành:</strong> <span className="font-medium text-black">{viewingCustomer.province || 'Chưa cập nhật'}</span></p>
                <p><strong className="text-black font-bold">Ngày bàn giao:</strong> <span className="font-semibold text-black">{formatDateVN(viewingCustomer.handoverDate)}</span></p>
                <p><strong className="text-black font-bold">Hạn bảo hành:</strong> <span className="font-semibold text-black">{formatDateVN(viewingCustomer.warrantyExpiryDate)}</span></p>
              </div>

              <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                <span className="font-extrabold text-black uppercase tracking-wider text-[11px] block border-b border-slate-200/80 pb-0.5 mb-1">Tấm Pin Năng Lượng Mặt Trời</span>
                <p><strong className="text-black font-bold">Hãng:</strong> <span className="font-semibold text-black">{viewingCustomer.solarPanels?.brand}</span></p>
                <p><strong className="text-black font-bold">Số lượng:</strong> <span className="font-semibold text-black">{viewingCustomer.solarPanels?.quantity} tấm</span></p>
                <p><strong className="text-black font-bold">Công suất mỗi tấm:</strong> <span className="font-semibold text-black">{viewingCustomer.solarPanels?.wattPerPanel} W</span></p>
                <p><strong className="text-black font-bold">Nhà phân phối:</strong> <span className="font-medium text-black">{viewingCustomer.solarPanels?.distributor || 'N/A'}</span></p>
                <p className="pt-0.5 border-t border-slate-200/80 mt-0.5">
                  <strong className="text-black font-bold">Tổng công suất trạm:</strong>{' '}
                  <span className="font-extrabold text-black">
                    {viewingCustomer.totalCapacityKW} KW -{' '}
                    <span className={getPhaseTextColor(getCustomerPhase(viewingCustomer))}>
                      {getCustomerPhase(viewingCustomer)}
                    </span>
                  </span>
                </p>
              </div>
            </div>

            {/* Inverters, Wind Turbines & Batteries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-black">
              {/* Left Column: Inverters List & Wind Turbines */}
              <div className="space-y-2">
                {/* Inverters List */}
                <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                  <h4 className="font-extrabold text-xs text-black uppercase flex items-center justify-between">
                    <span>Danh Sách Biến Tần Inverter</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">{viewingCustomer.inverters?.length || 0} bộ</span>
                  </h4>
                  <div className="space-y-1 text-xs">
                    {(!viewingCustomer.inverters || viewingCustomer.inverters.length === 0) ? (
                      <div className="text-black text-center py-1 italic text-[11px]">Chưa có biến tần</div>
                    ) : (
                      viewingCustomer.inverters.map((inv, idx) => (
                        <div key={inv.id || idx} className="p-2 bg-white rounded-md border border-slate-200 shadow-2xs">
                          <div className="font-extrabold text-black flex items-center justify-between">
                            <span>Bộ {idx + 1}: {inv.brand} ({inv.capacityKW} KW)</span>
                            {inv.phase && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-900 border border-blue-200">
                                {inv.phase}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-black font-mono font-semibold">SN: {inv.serialNumber}</div>
                          <div className="text-[10px] text-black font-medium">NPP: {inv.distributor}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Wind Turbines List (Thiết Bị Điện Gió) placed under Inverter, in the same column */}
                {viewingCustomer.windTurbines && viewingCustomer.windTurbines.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200">
                    <h4 className="font-extrabold text-xs text-black uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Danh Sách Thiết Bị Điện Gió</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                        {viewingCustomer.windTurbines.length} tuabin
                      </span>
                    </h4>
                    <div className="space-y-1 text-xs">
                      {viewingCustomer.windTurbines.map((wind, idx) => (
                        <div key={wind.id || idx} className="p-2 bg-white rounded-md border border-slate-200 shadow-2xs">
                          <div className="font-extrabold text-black">
                            Tuabin {idx + 1}: {wind.brand} ({wind.capacityKW} KW)
                          </div>
                          <div className="text-[11px] text-black font-mono font-semibold">SN: {wind.serialNumber || 'Chưa cập nhật'}</div>
                          <div className="text-[10px] text-black font-medium">NPP: {wind.distributor || 'N/A'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Batteries List */}
              <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 h-fit">
                <h4 className="font-extrabold text-xs text-black uppercase flex items-center justify-between">
                  <span>Danh Sách Pin Lưu Trữ</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">{viewingCustomer.batteries?.length || 0} bộ</span>
                </h4>
                <div className="space-y-1 text-xs">
                  {(!viewingCustomer.batteries || viewingCustomer.batteries.length === 0) ? (
                    <div className="text-black text-center py-1 italic text-[11px]">Chưa có pin lưu trữ</div>
                  ) : (
                    viewingCustomer.batteries.map((bat, idx) => (
                      <div key={bat.id || idx} className="p-2 bg-white rounded-md border border-slate-200 shadow-2xs">
                        <div className="font-extrabold text-black">Bộ {idx + 1}: {bat.brand} ({bat.capacityKWh} KWh)</div>
                        <div className="text-[11px] text-black font-mono font-semibold">SN: {bat.serialNumber}</div>
                        <div className="text-[10px] text-black font-medium">NPP: {bat.distributor}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Photos */}
            {viewingCustomer.images && Object.values(viewingCustomer.images).some(Boolean) && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200">
                <h4 className="font-extrabold text-xs text-black uppercase flex items-center justify-between">
                  <span>Hình Ảnh Công Trình Thực Tế</span>
                  <span className="text-[10px] text-black font-semibold">Nhấp ảnh để phóng to</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {viewingCustomer.images.overview && (
                    <div 
                      onClick={() => handleOpenLightbox(viewingCustomer.images!.overview!, 'Ảnh Tổng Thể Công Trình')}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 shadow-2xs transition"
                    >
                      <span className="text-[10px] bg-black/75 text-white font-bold px-1.5 py-0.5 rounded-br-lg absolute top-0 left-0 z-10">Tổng thể</span>
                      <img src={viewingCustomer.images.overview} alt="Tổng thể" className="w-full h-20 object-cover group-hover:scale-105 transition duration-200" />
                    </div>
                  )}
                  {viewingCustomer.images.inverter && (
                    <div 
                      onClick={() => handleOpenLightbox(viewingCustomer.images!.inverter!, 'Ảnh Hóa Đơn Nhập')}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 shadow-2xs transition"
                    >
                      <span className="text-[10px] bg-black/75 text-white font-bold px-1.5 py-0.5 rounded-br-lg absolute top-0 left-0 z-10">Hóa đơn nhập</span>
                      <img src={viewingCustomer.images.inverter} alt="Ảnh Hóa Đơn Nhập" className="w-full h-20 object-cover group-hover:scale-105 transition duration-200" />
                    </div>
                  )}
                  {viewingCustomer.images.battery && (
                    <div 
                      onClick={() => handleOpenLightbox(viewingCustomer.images!.battery!, 'Ảnh CO-CQ')}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 shadow-2xs transition"
                    >
                      <span className="text-[10px] bg-black/75 text-white font-bold px-1.5 py-0.5 rounded-br-lg absolute top-0 left-0 z-10">Ảnh CO-CQ</span>
                      <img src={viewingCustomer.images.battery} alt="Ảnh CO-CQ" className="w-full h-20 object-cover group-hover:scale-105 transition duration-200" />
                    </div>
                  )}
                  {viewingCustomer.images.panels && (
                    <div 
                      onClick={() => handleOpenLightbox(viewingCustomer.images!.panels!, 'Ảnh Dàn Tấm Pin PV')}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-500 shadow-2xs transition"
                    >
                      <span className="text-[10px] bg-black/75 text-white font-bold px-1.5 py-0.5 rounded-br-lg absolute top-0 left-0 z-10">Tấm pin PV</span>
                      <img src={viewingCustomer.images.panels} alt="Tấm pin" className="w-full h-20 object-cover group-hover:scale-105 transition duration-200" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-black text-xs font-bold rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN VÔ HIỆU HÓA KHÁCH HÀNG */}
      {disablingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Vô Hiệu Hóa</h3>
                <p className="text-xs text-slate-500">Tạm dừng hồ sơ khách hàng</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc muốn vô hiệu hóa khách hàng <strong className="text-slate-800">{disablingCustomer.customerName}</strong> ({disablingCustomer.customerCode})?
              Hồ sơ này sẽ được chuyển sang tab <strong>&quot;Danh Sách Đã Vô Hiệu Hóa&quot;</strong> và ngưng phát thông báo bảo dưỡng.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lý do vô hiệu hóa:</label>
              <textarea
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                placeholder="Nhập lý do vô hiệu hóa hồ sơ..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisablingCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDisable}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Ban className="w-4 h-4" />
                Xác Nhận Vô Hiệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA VĨNH VIỄN (CHỈ DÀNH CHO KHÁCH HÀNG ĐÃ VÔ HIỆU HÓA) */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-base">Xóa Vĩnh Viễn Khách Hàng</h3>
                <p className="text-xs text-rose-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã thỏa điều kiện: Hồ sơ đã được vô hiệu hóa trước đó.
              </div>
              <p className="text-slate-600">
                Khách hàng: <strong className="text-slate-900">{deletingCustomer.customerName}</strong> ({deletingCustomer.customerCode}).
                Tất cả thông tin Inverter, Pin lưu trữ liên kết sẽ bị xóa vĩnh viễn khỏi Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmHardDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NOTIFICATION SEND MODAL */}
      {notifTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                  Gửi Cảnh Báo Bảo Dưỡng
                </span>
                <h3 className="font-bold text-slate-800 text-sm mt-1">{notifTarget.customerName}</h3>
                <p className="text-xs text-slate-500">Mã KH: {notifTarget.customerCode} • SĐT: {notifTarget.phoneNumber}</p>
              </div>
              <button 
                onClick={() => setNotifTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {notifSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{notifSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                  <div className="font-bold text-slate-900">Nội dung gửi:</div>
                  <p className="italic text-slate-600 leading-relaxed">
                    &quot;Kính gửi khách hàng {notifTarget.customerName}. Hệ thống điện mặt trời tại {notifTarget.address} sẽ đến kỳ bảo dưỡng vào ngày {formatDateVN(notifTarget.nextMaintenanceDate)}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532&quot;
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Chọn kênh gửi:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['Zalo OA', 'Telegram Bot', 'Email', 'Push Notification'] as const).map(channel => {
                      const isSelected = selectedChannels.includes(channel);
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedChannels(selectedChannels.filter(c => c !== channel));
                            } else {
                              setSelectedChannels([...selectedChannels, channel]);
                            }
                          }}
                          className={`p-2.5 rounded-lg border text-left font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '} {channel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setNotifTarget(null)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Đóng
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={sendingNotif || selectedChannels.length === 0}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingNotif ? 'Đang phát tin...' : 'Gửi Ngay'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX PREVIEW MODAL WITH ZOOM & ROTATE */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in select-none"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl h-[92vh] flex flex-col bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
          >
            {/* Top Toolbar */}
            <div className="p-3 bg-slate-900/95 text-white flex items-center justify-between border-b border-slate-800 gap-2 shrink-0">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-xs sm:text-sm text-slate-200 truncate">{lightboxImage.title}</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full shrink-0">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Action Buttons: Zoom Out, Zoom In, Rotate, Reset, Close */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                  disabled={zoomScale <= 0.5}
                  title="Thu nhỏ ảnh (-25%)"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(3.5, Number((prev + 0.25).toFixed(2))))}
                  disabled={zoomScale >= 3.5}
                  title="Phóng to ảnh (+25%)"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 transition flex items-center gap-1 text-xs"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Phóng to</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  title="Xoay ảnh 90°"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1 text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Xoay</span>
                </button>

                {(zoomScale !== 1 || rotation !== 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    title="Đặt lại kích thước ban đầu"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold transition text-xs"
                  >
                    100%
                  </button>
                )}

                <div className="w-px h-5 bg-slate-700 mx-1 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  title="Đóng (Esc)"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Canvas with Zoom & Pan */}
            <div 
              className="flex-1 p-2 flex items-center justify-center bg-black/70 overflow-auto relative cursor-grab active:cursor-grabbing"
              onWheel={(e) => {
                // Support wheel zooming
                if (e.deltaY < 0) {
                  setZoomScale(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
                } else {
                  setZoomScale(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))));
                }
              }}
            >
              <div 
                className="transition-transform duration-150 ease-out origin-center flex items-center justify-center max-w-full max-h-full"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                }}
              >
                <img 
                  src={lightboxImage.src} 
                  alt={lightboxImage.title} 
                  className="max-h-[78vh] w-auto max-w-full object-contain rounded-lg shadow-2xl pointer-events-none" 
                />
              </div>
            </div>

            {/* Bottom helper tip */}
            <div className="px-3 py-1.5 bg-slate-900/90 text-center text-[11px] text-slate-400 border-t border-slate-800/80">
              Mẹo: Dùng nút phóng to/thu nhỏ hoặc cuộn chuột (Scroll) để phóng to/thu nhỏ • Bấm 100% để đặt lại ban đầu
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
