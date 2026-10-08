import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Wind,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Layers,
  Zap,
  ArrowRight,
  Hash,
  Copy,
  ExternalLink,
  Check,
  MessageSquare,
  Bot,
  Download,
  Smartphone,
  Laptop,
  Share2
} from 'lucide-react';
import { Customer, SystemStatus } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { CustomerFormModal } from './CustomerFormModal';
import { exportCustomersToExcel } from '../utils/exportUtils';
import { formatDateVN, formatDateTimeVN, dmyToISO } from '../utils/dateUtils';

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
    sendMaintenanceNotification,
    seedDemoCustomersBatch
  } = useData();
  const { currentUser, hasRole, hasPermission } = useAuth();

  // Tab: 'ACTIVE' (Hồ sơ đang hoạt động) | 'DISABLED' (Danh sách khách hàng bị vô hiệu hóa)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarranty, setSelectedWarranty] = useState<string>('ALL');
  const [selectedMaintenanceFilter, setSelectedMaintenanceFilter] = useState<string>('ALL');

  // Sắp xếp danh sách khách hàng: mặc định sắp xếp theo ngày bàn giao giảm dần (mới nhất lên đầu)
  const [sortBy, setSortBy] = useState<'handoverDate_desc' | 'handoverDate_asc' | 'code_desc' | 'code_asc' | 'name_asc'>('handoverDate_desc');

  // Phân trang thông minh chuẩn hóa cho quản lý hàng nghìn khách hàng
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('3tge_customers_per_page');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([12, 24, 36, 48, 60, 100].includes(parsed)) return parsed;
      }
    }
    return 12; // Mặc định 12 khách hàng / trang
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
  const [zaloSentSuccessData, setZaloSentSuccessData] = useState<{
    customer: Customer;
    message: string;
    phone: string;
    displayPhone: string;
    zaloUrl: string;
    isMobile?: boolean;
    isIOS?: boolean;
    isAndroid?: boolean;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Total counts for tabs
  const activeCount = customers.filter(c => !c.isDisabled).length;
  const disabledCount = customers.filter(c => c.isDisabled).length;

  // Helper chuyển đổi ngày (dd/mm/yyyy hoặc yyyy-mm-dd) thành timestamp an toàn để sắp xếp chính xác
  const parseDateToTimestamp = (dateStr?: string | null): number => {
    if (!dateStr) return 0;
    const iso = dmyToISO(dateStr);
    const t = new Date(iso).getTime();
    return isNaN(t) ? 0 : t;
  };

  // Filter list based on active tab and search filters, sau đó sắp xếp theo ngày bàn giao giảm dần
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
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
    }).sort((a, b) => {
      if (sortBy === 'handoverDate_desc') {
        const tA = parseDateToTimestamp(a.handoverDate);
        const tB = parseDateToTimestamp(b.handoverDate);
        if (tB !== tA) return tB - tA; // Giảm dần: Ngày bàn giao mới nhất lên đầu
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      }
      if (sortBy === 'handoverDate_asc') {
        const tA = parseDateToTimestamp(a.handoverDate);
        const tB = parseDateToTimestamp(b.handoverDate);
        if (tA !== tB) return tA - tB; // Tăng dần: Ngày bàn giao cũ nhất lên đầu
        return (a.customerCode || '').localeCompare(b.customerCode || '');
      }
      if (sortBy === 'code_desc') {
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      }
      if (sortBy === 'code_asc') {
        return (a.customerCode || '').localeCompare(b.customerCode || '');
      }
      if (sortBy === 'name_asc') {
        return (a.customerName || '').localeCompare(b.customerName || '', 'vi');
      }
      return 0;
    });
  }, [customers, activeTab, searchQuery, selectedProvince, selectedStatus, selectedWarranty, selectedMaintenanceFilter, sortBy, todayStr]);

  // Tự động chuyển về trang 1 khi thay đổi bất kỳ bộ lọc nào
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedProvince, selectedStatus, selectedWarranty, selectedMaintenanceFilter, sortBy, activeTab]);

  // Tính toán phân trang
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  }, [filteredCustomers.length, itemsPerPage]);

  const validCurrentPage = useMemo(() => {
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [currentPage, totalPages]);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCustomers.length);

  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(startIndex, endIndex);
  }, [filteredCustomers, startIndex, endIndex]);

  // Tổng công suất toàn bộ danh sách đã lọc vs công suất trang hiện tại
  const totalFilteredCapacityKW = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + (c.totalCapacityKW || 0), 0);
  }, [filteredCustomers]);

  const currentPageCapacityKW = useMemo(() => {
    return paginatedCustomers.reduce((acc, c) => acc + (c.totalCapacityKW || 0), 0);
  }, [paginatedCustomers]);

  // Cuộn mượt lên đỉnh bảng danh sách khách hàng khi chuyển trang
  const scrollToTableTop = () => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(clamped);
    scrollToTableTop();
  };

  const handleItemsPerPageChange = (newSize: number) => {
    setItemsPerPage(newSize);
    setCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_customers_per_page', String(newSize));
    }
    showToast(`Đã điều chỉnh hiển thị ${newSize} khách hàng / trang`, 'info');
  };

  const handleJumpToPage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(val)) {
      const target = Math.min(Math.max(1, val), totalPages);
      setCurrentPage(target);
      setJumpPageInput('');
      scrollToTableTop();
      showToast(`Đã chuyển đến trang ${target}`, 'info');
    }
  };

  const handleSeedDemoData = async () => {
    setIsSeedingDemo(true);
    try {
      const ok = await seedDemoCustomersBatch();
      if (ok) {
        showToast('Nạp thành công bộ 36 hồ sơ khách hàng mẫu chuẩn hóa đa trang!', 'success');
      } else {
        showToast('Không thể nạp dữ liệu mẫu. Vui lòng kiểm tra kết nối!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi nạp dữ liệu mẫu.', 'error');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Thuật toán dải số trang thông minh cho hàng trăm / hàng nghìn trang
  const smartPageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (validCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
  }, [validCurrentPage, totalPages]);

  const getStatusBadge = (status: SystemStatus, isDisabled?: boolean) => {
    if (isDisabled) {
      return (
        <span className="bg-rose-50 text-rose-700 border border-rose-200/90 text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5 w-fit leading-tight">
          <Ban className="w-2.5 h-2.5 text-rose-600" />
          Đã vô hiệu
        </span>
      );
    }
    switch (status) {
      case 'Hoạt động tốt':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">✓ Tốt</span>;
      case 'Cần kiểm tra':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">⚠️ Kiểm tra</span>;
      case 'Đang bảo trì':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">⚙️ Bảo trì</span>;
      case 'Ngừng hoạt động':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-tight">🛑 Ngừng</span>;
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
        <span className="bg-rose-100 text-rose-800 font-bold text-[9px] px-1.5 py-0.2 rounded border border-rose-300 leading-tight inline-block">
          Quá hạn {Math.abs(diff)}d ({formatted})
        </span>
      );
    } else if (diff === 0) {
      return (
        <span className="bg-orange-100 text-orange-800 font-bold text-[9px] px-1.5 py-0.2 rounded border border-orange-300 animate-pulse leading-tight inline-block">
          Hôm nay ({formatted})
        </span>
      );
    } else if (diff <= 5) {
      return (
        <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.2 rounded border border-amber-300 leading-tight inline-block">
          Sắp đến ({diff}d - {formatted})
        </span>
      );
    } else {
      return (
        <span className="text-slate-600 text-[10px] font-medium leading-tight inline-block">
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

  const handleConfirmSendZalo = () => {
    if (!notifTarget) return;
    const cust = notifTarget;
    
    // Chuẩn hóa số điện thoại: loại bỏ ký tự lạ, chuyển đầu số 84 thành 0 nếu có
    let cleanPhone = cust.phoneNumber ? cust.phoneNumber.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    if (!cleanPhone) {
      setNotifSuccessMsg(`Khách hàng ${cust.customerName} chưa có số điện thoại hợp lệ để gửi Zalo!`);
      setTimeout(() => setNotifSuccessMsg(''), 3000);
      setNotifTarget(null);
      return;
    }

    setSendingNotif(true);
    const formattedDate = formatDateVN(cust.nextMaintenanceDate);
    const message = `Kính gửi khách hàng ${cust.customerName}. Hệ thống điện mặt trời tại ${cust.address} sẽ đến kỳ bảo dưỡng vào ngày ${formattedDate}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532`;

    // Nhận diện thiết bị hiện tại (Mobile: iOS, Android; Laptop/Máy tính)
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;

    // 1. Sao chép ngay nội dung tin nhắn vào clipboard với cơ chế dự phòng
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(message).catch(err => {
        console.warn('Lỗi copy clipboard API:', err);
      });
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = message;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch (e) {
      console.warn('Fallback copy error:', e);
    }

    // 2. Kích hoạt trực tiếp ứng dụng Zalo trên mọi thiết bị
    const zaloUrl = `https://zalo.me/${cleanPhone}`;

    if (isMobile) {
      // TRÊN MOBILE (iOS / ANDROID):
      // Giao thức Universal Link zalo.me/[SĐT] sẽ tự động chuyển hướng sang ứng dụng Zalo đã cài sẵn trên điện thoại
      try {
        const link = document.createElement('a');
        link.href = zaloUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        window.location.href = zaloUrl;
      }
    } else {
      // TRÊN LAPTOP / MÁY TÍNH (WINDOWS / MACOS):
      // Gọi protocol zalo:// để đánh thức trực tiếp app Zalo PC trên máy ngay lập tức
      try {
        const hiddenIframe = document.createElement('iframe');
        hiddenIframe.style.display = 'none';
        hiddenIframe.src = `zalo://`;
        document.body.appendChild(hiddenIframe);
        setTimeout(() => {
          try { document.body.removeChild(hiddenIframe); } catch (e) {}
        }, 1500);
      } catch (e) {
        console.warn('Gọi protocol zalo://:', e);
      }

      // Mở liên kết chính thức zalo.me/[SĐT] để điều hướng đúng người nhận trong Zalo
      try {
        const newTab = window.open(zaloUrl, '_blank', 'noopener,noreferrer');
        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
          const link = document.createElement('a');
          link.href = zaloUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.warn('Lỗi mở liên kết Zalo:', err);
      }
    }

    // 3. Tự động ghi nhận thông báo Zalo vào hệ thống
    sendMaintenanceNotification(cust, ['Zalo OA']).catch(err => {
      console.warn('Ghi nhận thông báo lỗi:', err);
    });

    // 4. Mở modal hỗ trợ đảm bảo 100% gửi thành công trên mọi thiết bị
    setZaloSentSuccessData({
      customer: cust,
      message,
      phone: cleanPhone,
      displayPhone: cust.phoneNumber || cleanPhone,
      zaloUrl,
      isMobile,
      isIOS,
      isAndroid
    });
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 3000);

    setNotifTarget(null);
    setSendingNotif(false);
  };

  const handleShareMobileZalo = async () => {
    if (!zaloSentSuccessData) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Thông báo nhắc lịch bảo trì điện mặt trời - Công ty 3TGE',
          text: zaloSentSuccessData.message,
          url: zaloSentSuccessData.zaloUrl
        });
      } catch (e) {
        console.warn('Share error or cancelled:', e);
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(zaloSentSuccessData.message);
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      }
    }
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-800">Quản Lý Hồ Sơ Khách Hàng</h2>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
              {filteredCustomers.length} Hồ sơ
            </span>
            <span className="text-[10.5px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
              <span>Trang {validCurrentPage}/{totalPages}</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-700 font-bold">{itemsPerPage} KH / trang</span>
            </span>

            {/* Quick mini pagination controls for header */}
            {totalPages > 1 && (
              <div className="inline-flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600">
                <button
                  type="button"
                  onClick={() => handlePageChange(validCurrentPage - 1)}
                  disabled={validCurrentPage === 1}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-bold px-1 text-slate-800">
                  {validCurrentPage}/{totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(validCurrentPage + 1)}
                  disabled={validCurrentPage === totalPages}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Hệ thống phân trang thông minh &bull; Sắp xếp ngày bàn giao giảm dần &bull; Vô hiệu hóa trước khi xóa vĩnh viễn
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút tải Trợ lý Zalo PC */}
          <a
            href="/Zalo-Auto-Send-3TGE.bat"
            download="Zalo-Auto-Send-3TGE.bat"
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
            title="Tải công cụ trợ lý chạy ngầm tự động dán (Ctrl+V) và bấm gửi (Enter) vào Zalo PC"
          >
            <Bot className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Trợ Lý Auto-Send Zalo</span>
            <span className="sm:hidden">Auto Zalo</span>
          </a>

          {/* Nút nạp 36 KH mẫu để kiểm tra phân trang đa trang */}
          <button
            type="button"
            onClick={handleSeedDemoData}
            disabled={isSeedingDemo}
            title="Nạp 36 hồ sơ khách hàng mẫu chuẩn hóa để trải nghiệm phân trang thông minh"
            className="px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="hidden sm:inline">Nạp 36 KH mẫu</span>
            <span className="sm:hidden">36 KH</span>
          </button>

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

      {/* Info notice for small dataset to test smart pagination */}
      {activeTab === 'ACTIVE' && customers.length < 12 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-lg p-2 px-3 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
            <span className="text-[11.5px]">
              Hiện đang có <strong>{customers.length}</strong> khách hàng trong cơ sở dữ liệu. Nhấn <strong>"Nạp 36 KH mẫu"</strong> để ngay lập tức trải nghiệm hệ thống phân trang thông minh đa trang (chuẩn hóa quản lý hàng nghìn khách hàng).
            </span>
          </div>
          <button
            type="button"
            onClick={handleSeedDemoData}
            disabled={isSeedingDemo}
            className="shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Nạp 36 KH mẫu ngay
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
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

          {/* Sắp xếp danh sách (Mặc định: Ngày bàn giao giảm dần) */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200 font-semibold text-slate-700 focus:bg-white focus:outline-emerald-500"
              title="Thứ tự sắp xếp danh sách"
            >
              <option value="handoverDate_desc">📅 Bàn giao (Mới nhất ↓)</option>
              <option value="handoverDate_asc">📅 Bàn giao (Cũ nhất ↑)</option>
              <option value="code_desc">Mã KH (Giảm dần)</option>
              <option value="code_asc">Mã KH (Tăng dần)</option>
              <option value="name_asc">Tên KH (A - Z)</option>
            </select>
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
      <div ref={tableContainerRef} className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden scroll-mt-4">
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[9px] tracking-wider leading-none">
                <th className="py-1 px-1.5 whitespace-nowrap">Mã KH</th>
                <th className="py-1 px-1.5">Khách Hàng & Liên Hệ</th>
                <th 
                  className="py-1 px-1.5 cursor-pointer select-none group hover:bg-slate-100 transition whitespace-nowrap"
                  onClick={() => setSortBy(prev => prev === 'handoverDate_desc' ? 'handoverDate_asc' : 'handoverDate_desc')}
                  title="Nhấn để đổi chiều sắp xếp theo ngày bàn giao"
                >
                  <div className="flex items-center gap-1">
                    <span>Ngày Bàn Giao</span>
                    {sortBy === 'handoverDate_desc' ? (
                      <span className="text-emerald-700 font-black text-[9.5px] flex items-center gap-0.5" title="Giảm dần (Mới nhất)">
                        ↓ <span className="text-[7.5px] font-normal normal-case">giảm dần</span>
                      </span>
                    ) : sortBy === 'handoverDate_asc' ? (
                      <span className="text-emerald-700 font-black text-[9.5px] flex items-center gap-0.5" title="Tăng dần (Cũ nhất)">
                        ↑ <span className="text-[7.5px] font-normal normal-case">tăng dần</span>
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </div>
                </th>
                <th className="py-1 px-1.5">Địa Chỉ & Hợp Đồng</th>
                <th className="py-1 px-1.5">Biến Tần & Pin Lưu Trữ</th>
                <th className="py-1 px-1.5 whitespace-nowrap">Công Suất</th>
                <th className="py-1 px-1.5 whitespace-nowrap">{activeTab === 'DISABLED' ? 'Thời Điểm Vô Hiệu' : 'Kỳ Bảo Dưỡng'}</th>
                <th className="py-1 px-1.5 whitespace-nowrap">Trạng Thái</th>
                <th className="py-1 px-1.5 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-4 text-center text-slate-400">
                    {activeTab === 'ACTIVE' 
                      ? 'Không tìm thấy khách hàng nào khớp với điều kiện tìm kiếm.'
                      : 'Hiện không có khách hàng nào trong danh sách bị vô hiệu hóa.'}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50/80 transition group ${c.isDisabled ? 'bg-slate-50/40 text-slate-500' : ''}`}>
                    <td className="py-[3px] px-1.5 font-mono font-bold text-emerald-700 whitespace-nowrap text-[11px] leading-tight">
                      <div className="flex items-center gap-1">
                        {c.isDisabled && <Ban className="w-3 h-3 text-rose-500 shrink-0" />}
                        <span>{c.customerCode}</span>
                      </div>
                    </td>
                    <td className="py-[3px] px-1.5">
                      <div className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[135px]" title={c.customerName}>{c.customerName}</div>
                      <div className="text-[9px] text-slate-500 flex items-center gap-1 leading-none mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        {c.phoneNumber}
                      </div>
                    </td>
                    <td className="py-[3px] px-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-semibold text-slate-800 text-[10.5px] leading-tight">
                        <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{formatDateVN(c.handoverDate, '—')}</span>
                      </div>
                    </td>
                    <td className="py-[3px] px-1.5 max-w-[160px]">
                      <div className="truncate text-slate-700 flex items-center gap-1 leading-tight text-[10.5px]" title={c.address}>
                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                      <div className="text-[9px] text-slate-600 font-semibold leading-none truncate mt-0.5">HĐ: {c.contractNumber}</div>
                    </td>
                    <td className="py-[3px] px-1.5 max-w-[145px]">
                      <div className="leading-tight">
                        <div className="text-[10px] font-semibold text-slate-800 truncate" title={`${c.inverters?.length || 0} Inverter (${c.inverters?.map(i => i.brand).join(', ') || 'N/A'})`}>
                          {c.inverters?.length || 0} Inverter {c.inverters?.[0]?.brand ? `(${c.inverters.map(i => i.brand).join(', ')})` : ''}
                        </div>
                        <div className="text-[9px] text-slate-500 leading-none truncate mt-0.5" title={`${c.batteries?.length || 0} Pin (${c.batteries?.map(b => b.brand).join(', ') || 'N/A'})`}>
                          {c.batteries?.length || 0} Pin {c.batteries?.[0]?.brand ? `(${c.batteries.map(b => b.brand).join(', ')})` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="py-[3px] px-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-800 text-[11px] leading-tight">
                          {c.totalCapacityKW}<span className="text-[8.5px] font-normal text-slate-500">kW</span>
                        </span>
                        <span className={`text-[8.5px] font-bold px-1 py-0 leading-tight rounded border ${getPhaseBadgeClass(getCustomerPhase(c))}`}>
                          {getCustomerPhase(c)}
                        </span>
                      </div>
                    </td>
                    <td className="py-[3px] px-1.5 whitespace-nowrap">
                      {activeTab === 'DISABLED' ? (
                        <div className="leading-tight">
                          <div className="text-[10px] font-semibold text-rose-700 leading-tight">
                            {c.disabledAt ? formatDateVN(c.disabledAt) : 'Đã vô hiệu'}
                          </div>
                          {c.disabledReason && (
                            <div className="text-[9px] text-slate-500 italic truncate max-w-[130px] leading-none mt-0.5" title={c.disabledReason}>
                              {c.disabledReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        getMaintenancePill(c.nextMaintenanceDate)
                      )}
                    </td>
                    <td className="py-[3px] px-1.5 whitespace-nowrap">
                      {getStatusBadge(c.status, c.isDisabled)}
                    </td>
                    <td className="py-[3px] px-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-0.5">
                        {/* Chi tiết */}
                        <button
                          onClick={() => setViewingCustomer(c)}
                          title="Xem chi tiết hồ sơ"
                          className="p-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
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
                                className="p-0.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
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
                                className="p-0.5 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition"
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
                                className="p-0.5 rounded text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition"
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
                                className="p-0.5 rounded text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition font-bold"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* CHỈ ĐƯỢC XÓA SAU KHI ĐÃ VÔ HIỆU HÓA */}
                            {hasPermission('customer_delete') && (
                              <button
                                onClick={() => setDeletingCustomer(c)}
                                title="Xóa vĩnh viễn hồ sơ này (Đã thỏa điều kiện đã vô hiệu)"
                                className="p-0.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
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
            paginatedCustomers.map(c => (
              <div key={c.id} className={`p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1.5 ${c.isDisabled ? 'bg-slate-50/50' : ''}`}>
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
                    <h3 className="font-bold text-slate-800 text-sm mt-0.5">{c.customerName}</h3>
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
                  <div className="flex items-center justify-between text-[11px] bg-emerald-50/70 border border-emerald-100/80 px-2 py-0.5 rounded text-emerald-800">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3 h-3 text-emerald-600" />
                      Ngày bàn giao:
                    </span>
                    <strong className="text-emerald-900 font-bold">{formatDateVN(c.handoverDate, '—')}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
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
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
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

        {/* Smart Pagination Controls Bar (Chuẩn hóa quản lý hàng nghìn khách hàng) */}
        {filteredCustomers.length > 0 && (
          <div className="bg-slate-50/95 px-3 py-2 border-t border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-2.5 text-xs">
            {/* Cột 1: Thông số hiển thị & Công suất */}
            <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                Hiển thị <strong className="text-slate-900 font-bold">{startIndex + 1} - {endIndex}</strong> trên <strong className="text-emerald-700 font-bold">{filteredCustomers.length}</strong> khách hàng
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Tổng: <strong className="text-slate-800 font-bold">{totalFilteredCapacityKW.toLocaleString()} kW</strong>
                {totalPages > 1 && (
                  <span className="text-slate-500 font-normal ml-1">
                    (Trang: <strong className="text-emerald-700 font-bold">{currentPageCapacityKW.toLocaleString()} kW</strong>)
                  </span>
                )}
              </span>
            </div>

            {/* Cột 2: Bộ chọn số khách hàng / trang & Ô nhảy trang nhanh */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Chọn số dòng hiển thị / trang */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <span className="font-medium whitespace-nowrap">Hiển thị:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-200 rounded font-bold text-slate-700 shadow-2xs focus:outline-emerald-500 cursor-pointer text-xs"
                  title="Thay đổi số khách hàng hiển thị trên mỗi trang"
                >
                  <option value={12}>12 KH / trang</option>
                  <option value={24}>24 KH / trang</option>
                  <option value={36}>36 KH / trang</option>
                  <option value={48}>48 KH / trang</option>
                  <option value={60}>60 KH / trang</option>
                  <option value={100}>100 KH / trang</option>
                </select>
              </div>

              {/* Ô nhảy trực tiếp đến trang */}
              {totalPages > 1 && (
                <form onSubmit={handleJumpToPage} className="flex items-center gap-1 text-[11px] text-slate-600">
                  <span className="font-medium whitespace-nowrap">Đến trang:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    placeholder={String(validCurrentPage)}
                    className="w-12 px-1.5 py-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 shadow-2xs focus:outline-emerald-500 text-xs"
                    title={`Nhập số trang từ 1 đến ${totalPages} rồi nhấn Enter`}
                  />
                  <span className="text-slate-400 font-semibold">/{totalPages}</span>
                  <button
                    type="submit"
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                    title="Chuyển đến trang đã chọn"
                  >
                    Đi
                  </button>
                </form>
              )}
            </div>

            {/* Cột 3: Nút điều hướng phân trang thông minh */}
            <div className="flex items-center gap-1 select-none">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                title="Về trang đầu (Trang 1)"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-0.5 mx-1">
                {smartPageNumbers.map((item, idx) => {
                  if (item === '...') {
                    return <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs select-none">...</span>;
                  }
                  const pageNum = item as number;
                  const isActive = pageNum === validCurrentPage;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[26px] h-6 px-1.5 rounded text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-600'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                      title={`Chuyển đến trang ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                title="Trang tiếp"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                title={`Đến trang cuối (Trang ${totalPages})`}
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
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
                {/* Câu hỏi xác nhận chính xác theo yêu cầu */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-center space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug">
                    Bạn có muốn gửi thông báo cho khách hàng <span className="text-blue-700 font-bold">{notifTarget.customerName}</span> - <span className="text-blue-700 font-bold font-mono">{notifTarget.phoneNumber || '(Chưa có SĐT)'}</span>?
                  </p>
                </div>

                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>Nội dung lời nhắn Zalo:</span>
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">Tự động sao chép</span>
                  </div>
                  <p className="italic text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-100 select-all">
                    &quot;Kính gửi khách hàng {notifTarget.customerName}. Hệ thống điện mặt trời tại {notifTarget.address} sẽ đến kỳ bảo dưỡng vào ngày {formatDateVN(notifTarget.nextMaintenanceDate)}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532&quot;
                  </p>
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-2.5 space-y-1.5 text-[10.5px] text-blue-900 mt-1">
                    <p className="font-semibold flex items-center gap-1 text-blue-800">
                      <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Quy trình tự động kích hoạt khi bấm <strong>Đồng ý</strong>:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                      <div className="bg-white/90 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-indigo-900 block text-[11px]">Mobile (iOS &amp; Android):</strong>
                          <span className="text-slate-600 text-[10px] leading-tight">Tự mở Zalo App, nạp sẵn lời nhắn. Chạm &quot;Dán&quot; trên bàn phím là gửi ngay!</span>
                        </div>
                      </div>
                      <div className="bg-white/90 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-blue-900 block text-[11px]">Laptop / Máy tính:</strong>
                          <span className="text-slate-600 text-[10px] leading-tight">Tự mở Zalo PC. Trợ lý Auto-Send tự dán (Ctrl+V) &amp; bấm gửi (Enter) không chạm tay!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setNotifTarget(null)}
                    disabled={sendingNotif}
                    className="px-3.5 py-1.5 text-xs text-slate-700 font-semibold border border-slate-200 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Không gửi
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSendZalo}
                    disabled={sendingNotif || !notifTarget.phoneNumber}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingNotif ? 'Đang gửi...' : 'Đồng ý'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TRỢ GIÚP ĐẢM BẢO GỬI THÀNH CÔNG 100% QUA ZALO */}
      {zaloSentSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  Zalo
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      Đã Kích Hoạt Zalo Đến Khách Hàng
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    </h3>
                    {zaloSentSuccessData.isIOS ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-indigo-600" /> iPhone/iPad (iOS)
                      </span>
                    ) : zaloSentSuccessData.isAndroid ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-emerald-600" /> Android Mobile
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-blue-600" /> Laptop / Máy tính
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {zaloSentSuccessData.customer.customerName} &bull; SĐT: <strong className="text-blue-700 font-mono">{zaloSentSuccessData.displayPhone}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setZaloSentSuccessData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Dành cho Mobile (iOS & Android) */}
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2 text-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-xs">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dành Cho Điện Thoại (iOS &amp; Android):</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleShareMobileZalo}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                    title="Mở menu chia sẻ trực tiếp của điện thoại để gửi thẳng vào Zalo"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia Sẻ Zalo (Mobile)</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">
                📱 Ứng dụng Zalo trên điện thoại (iPhone/Android) đã được kích hoạt. Bạn chỉ cần <strong>chạm vào khung chat &rarr; chạm &quot;Dán&quot; trên bàn phím &rarr; bấm Gửi</strong>. Lời nhắn đã được lưu sẵn trong bộ nhớ tạm!
              </p>
            </div>

            {/* 2. Dành cho Laptop / Máy tính */}
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl space-y-2 text-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <Laptop className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Dành Cho Laptop / Máy Tính (Windows &amp; Mac):</span>
                </div>
                <a
                  href="/Zalo-Auto-Send-3TGE.bat"
                  download="Zalo-Auto-Send-3TGE.bat"
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                  title="Tải trợ lý chạy ngầm tự động dán và bấm gửi phím Enter cho Zalo PC"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Trợ Lý Auto-Send (.bat)</span>
                </a>
              </div>
              <p className="text-[11px] text-blue-800/90 leading-relaxed">
                🤖 <strong>Tự động 100%:</strong> Khi bật <strong>Zalo-Auto-Send-3TGE.bat</strong> chạy ngầm trên máy, mỗi khi bấm &quot;Đồng ý&quot;, trợ lý sẽ <strong>tự động đưa Zalo lên trước, tự dán (Ctrl+V) và tự nhấn Gửi (Enter)</strong> ngay lập tức!
              </p>
              <p className="text-[10.5px] text-slate-600">
                👉 <strong>Hoặc bấm phím tắt:</strong> Nhấn <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-800">Ctrl + V</kbd> rồi nhấn <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-blue-800">Enter</kbd> trong cửa sổ Zalo.
              </p>
            </div>

            {/* Khung tin nhắn đã sao chép & nút sao chép lại */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-600 font-medium text-[11px]">
                <span>Nội dung lời nhắn nhắc lịch:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(zaloSentSuccessData.message);
                    setCopiedMessage(true);
                    setTimeout(() => setCopiedMessage(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer bg-blue-50 px-2 py-0.5 rounded transition"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Đã sao chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Sao chép lại</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-sans text-slate-700 leading-relaxed text-[11.5px] select-all max-h-32 overflow-y-auto">
                {zaloSentSuccessData.message}
              </div>
            </div>

            {/* Nút hành động trực tiếp nếu trình duyệt chặn hoặc cần mở lại */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={zaloSentSuccessData.zaloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition"
                  title="Mở lại Zalo nếu chưa hiện lên"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở lại Zalo ({zaloSentSuccessData.phone})</span>
                </a>
                <a
                  href="https://chat.zalo.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition"
                  title="Mở Zalo Web trên trình duyệt"
                >
                  <span>Zalo Web</span>
                </a>
                <a
                  href={`sms:${zaloSentSuccessData.phone}?body=${encodeURIComponent(zaloSentSuccessData.message)}`}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs inline-flex items-center gap-1 transition"
                  title="Gửi qua SMS dự phòng nếu khách hàng chưa có Zalo"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  <span>SMS Dự phòng</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setZaloSentSuccessData(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs"
              >
                Đã gửi xong / Đóng
              </button>
            </div>
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
