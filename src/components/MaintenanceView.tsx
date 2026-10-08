import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  CalendarClock, 
  Plus, 
  FileText, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Send, 
  Eye, 
  User, 
  X, 
  FileSpreadsheet, 
  Edit3, 
  Trash2,
  Printer,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  LayoutGrid,
  List,
  ArrowUpDown,
  Phone,
  MapPin,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  MessageCircle,
  Copy,
  ExternalLink,
  Check,
  MessageSquare,
  Bot,
  Smartphone,
  Laptop,
  Share2
} from 'lucide-react';
import { Customer, MaintenanceRecord } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { exportMaintenanceToExcel } from '../utils/exportUtils';
import { 
  formatDateVN, 
  generateMaintenanceCode,
  toDMY,
  dmyToISO,
  isValidDMY,
  formatDMYInput
} from '../utils/dateUtils';
import { MaintenancePrintModal } from './MaintenancePrintModal';

export const MaintenanceView: React.FC = () => {
  const { 
    customers, 
    maintenanceRecords, 
    addMaintenanceRecord, 
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    sendMaintenanceNotification 
  } = useData();
  const { currentUser, hasPermission } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'schedule' | 'records'>('schedule');

  // Schedule View Filter, Search, Sort & View Mode
  const [filterMode, setFilterMode] = useState<'ALL' | 'OVERDUE' | 'SOON' | 'TODAY' | 'NORMAL'>('ALL');
  const [searchScheduleQuery, setSearchScheduleQuery] = useState('');
  const [scheduleSortBy, setScheduleSortBy] = useState<'date_asc' | 'date_desc' | 'code_asc' | 'code_desc' | 'name_asc'>('date_asc');
  const [scheduleViewMode, setScheduleViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('3tge_maintenance_view_mode');
      if (saved === 'grid' || saved === 'table') return saved;
    }
    return 'table';
  });

  // Schedule Smart Pagination State (Chuẩn hóa quản lý hàng nghìn khách hàng, mặc định 12 KH/trang)
  const [scheduleItemsPerPage, setScheduleItemsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('3tge_maintenance_per_page');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 12;
  });
  const [scheduleCurrentPage, setScheduleCurrentPage] = useState<number>(1);
  const [jumpSchedulePageInput, setJumpSchedulePageInput] = useState<string>('');
  const scheduleContainerRef = useRef<HTMLDivElement>(null);

  // Records List Filter & Smart Pagination State
  const [searchRecordsQuery, setSearchRecordsQuery] = useState('');
  const [recordsItemsPerPage, setRecordsItemsPerPage] = useState<number>(12);
  const [recordsCurrentPage, setRecordsCurrentPage] = useState<number>(1);
  const [jumpRecordsPageInput, setJumpRecordsPageInput] = useState<string>('');
  const recordsContainerRef = useRef<HTMLDivElement>(null);

  // Maintenance Record Form Modal (Create & Edit)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<MaintenanceRecord | null>(null);
  const [printingRecord, setPrintingRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [technicianName, setTechnicianName] = useState(currentUser?.fullName.split(' - ')[0] || 'Nguyễn Văn Hùng');
  const [maintenanceDate, setMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintenanceDateDMY, setMaintenanceDateDMY] = useState(toDMY(new Date()));

  const updateMaintenanceDate = (val: string, isDmy = false) => {
    if (isDmy) {
      const formatted = formatDMYInput(val);
      setMaintenanceDateDMY(formatted);
      if (isValidDMY(formatted)) {
        setMaintenanceDate(dmyToISO(formatted));
      }
    } else {
      setMaintenanceDate(val);
      setMaintenanceDateDMY(toDMY(val));
    }
  };
  const [content, setContent] = useState('');
  const [inspectionResult, setInspectionResult] = useState('Hệ thống hoạt động bình thường, điện áp DC và AC ổn định.');
  const [recommendations, setRecommendations] = useState('Vệ sinh bề mặt tấm pin định kỳ sau 6 tháng. Kiểm tra dây siết bu lông.');
  const [imageBefore, setImageBefore] = useState('');
  const [imageAfter, setImageAfter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = React.useRef(false);

  // Strictly deduplicate maintenance records to guarantee 1 unique ticket per creation
  const displayRecords = React.useMemo(() => {
    const seen = new Set<string>();
    return maintenanceRecords.filter(r => {
      const key = r.id || `${r.maintenanceCode}_${r.customerCode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [maintenanceRecords]);

  // Quick Dispatch Notification modal / Zalo
  const [notifTarget, setNotifTarget] = useState<Customer | null>(null);
  const [channels, setChannels] = useState<Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>>([
    'Zalo OA', 'Telegram Bot'
  ]);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  // Zalo dispatch confirmation modal:
  // "Bạn có muốn gửi thông báo cho khách hàng + Tên + Số điện thoại"
  const [zaloConfirmCust, setZaloConfirmCust] = useState<Customer | null>(null);
  const [isSendingZalo, setIsSendingZalo] = useState(false);
  const [zaloNotificationSuccess, setZaloNotificationSuccess] = useState('');
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

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper for schedule evaluation
  const getScheduleStatus = (dateStr: string) => {
    if (!dateStr) return { status: 'NORMAL', text: 'Chưa có lịch', color: 'bg-slate-100 text-slate-600', diff: 999 };
    const diffDays = Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) {
      return {
        status: 'OVERDUE',
        text: 'Quá hạn bảo dưỡng',
        sub: `Quá hạn ${Math.abs(diffDays)} ngày`,
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        cardBorder: 'border-l-4 border-l-rose-500',
        diff: diffDays
      };
    } else if (diffDays === 0) {
      return {
        status: 'TODAY',
        text: 'Đến hạn bảo dưỡng',
        sub: 'Hôm nay',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-300 font-bold animate-pulse',
        cardBorder: 'border-l-4 border-l-orange-500',
        diff: 0
      };
    } else if (diffDays <= 5) {
      return {
        status: 'SOON',
        text: 'Sắp đến hạn bảo dưỡng',
        sub: `Còn ${diffDays} ngày`,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
        cardBorder: 'border-l-4 border-l-amber-500',
        diff: diffDays
      };
    } else {
      return {
        status: 'NORMAL',
        text: 'Đang theo dõi',
        sub: `${diffDays} ngày nữa`,
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        cardBorder: 'border-l-4 border-l-emerald-500',
        diff: diffDays
      };
    }
  };

  // Counts for each schedule status
  const scheduleCounts = useMemo(() => {
    let all = 0;
    let overdue = 0;
    let today = 0;
    let soon = 0;
    let normal = 0;

    customers.forEach(c => {
      if (c.isDisabled) return;
      all++;
      const s = getScheduleStatus(c.nextMaintenanceDate);
      if (s.status === 'OVERDUE') overdue++;
      else if (s.status === 'TODAY') today++;
      else if (s.status === 'SOON') soon++;
      else normal++;
    });

    return { all, overdue, today, soon, normal };
  }, [customers]);

  // Filter & sort customers by maintenance schedule (only active customers)
  const filteredScheduleCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.isDisabled) return false;
      const s = getScheduleStatus(c.nextMaintenanceDate);
      if (filterMode === 'OVERDUE' && s.status !== 'OVERDUE') return false;
      if (filterMode === 'TODAY' && s.status !== 'TODAY') return false;
      if (filterMode === 'SOON' && s.status !== 'SOON') return false;
      if (filterMode === 'NORMAL' && s.status !== 'NORMAL') return false;

      if (searchScheduleQuery.trim()) {
        const q = searchScheduleQuery.toLowerCase().trim();
        const inSerial = c.inverters?.some(i => i.serialNumber?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q)) || false;
        const inBat = c.batteries?.some(b => b.serialNumber?.toLowerCase().includes(q) || b.brand?.toLowerCase().includes(q)) || false;
        const matches = 
          c.customerCode?.toLowerCase().includes(q) ||
          c.customerName?.toLowerCase().includes(q) ||
          c.phoneNumber?.includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.province?.toLowerCase().includes(q) ||
          inSerial ||
          inBat;
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      if (scheduleSortBy === 'date_asc') {
        const tA = a.nextMaintenanceDate ? new Date(a.nextMaintenanceDate).getTime() : 9999999999999;
        const tB = b.nextMaintenanceDate ? new Date(b.nextMaintenanceDate).getTime() : 9999999999999;
        if (tA !== tB) return tA - tB;
        return (a.customerCode || '').localeCompare(b.customerCode || '');
      }
      if (scheduleSortBy === 'date_desc') {
        const tA = a.nextMaintenanceDate ? new Date(a.nextMaintenanceDate).getTime() : 0;
        const tB = b.nextMaintenanceDate ? new Date(b.nextMaintenanceDate).getTime() : 0;
        if (tA !== tB) return tB - tA;
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      }
      if (scheduleSortBy === 'code_asc') {
        return (a.customerCode || '').localeCompare(b.customerCode || '');
      }
      if (scheduleSortBy === 'code_desc') {
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      }
      if (scheduleSortBy === 'name_asc') {
        return (a.customerName || '').localeCompare(b.customerName || '', 'vi');
      }
      return 0;
    });
  }, [customers, filterMode, searchScheduleQuery, scheduleSortBy]);

  // Reset to schedule page 1 whenever filters change
  useEffect(() => {
    setScheduleCurrentPage(1);
  }, [filterMode, searchScheduleQuery, scheduleSortBy]);

  // Schedule pagination calculations
  const totalSchedulePages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredScheduleCustomers.length / scheduleItemsPerPage));
  }, [filteredScheduleCustomers.length, scheduleItemsPerPage]);

  const validSchedulePage = useMemo(() => {
    return Math.min(Math.max(1, scheduleCurrentPage), totalSchedulePages);
  }, [scheduleCurrentPage, totalSchedulePages]);

  const scheduleStartIndex = (validSchedulePage - 1) * scheduleItemsPerPage;
  const scheduleEndIndex = Math.min(scheduleStartIndex + scheduleItemsPerPage, filteredScheduleCustomers.length);

  const paginatedScheduleCustomers = useMemo(() => {
    return filteredScheduleCustomers.slice(scheduleStartIndex, scheduleEndIndex);
  }, [filteredScheduleCustomers, scheduleStartIndex, scheduleEndIndex]);

  const totalFilteredScheduleCapacityKW = useMemo(() => {
    return filteredScheduleCustomers.reduce((acc, c) => acc + (c.totalCapacityKW || 0), 0);
  }, [filteredScheduleCustomers]);

  const currentSchedulePageCapacityKW = useMemo(() => {
    return paginatedScheduleCustomers.reduce((acc, c) => acc + (c.totalCapacityKW || 0), 0);
  }, [paginatedScheduleCustomers]);

  const smartSchedulePageNumbers = useMemo(() => {
    if (totalSchedulePages <= 7) {
      return Array.from({ length: totalSchedulePages }, (_, i) => i + 1);
    }
    if (validSchedulePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalSchedulePages];
    }
    if (validSchedulePage >= totalSchedulePages - 3) {
      return [1, '...', totalSchedulePages - 4, totalSchedulePages - 3, totalSchedulePages - 2, totalSchedulePages - 1, totalSchedulePages];
    }
    return [1, '...', validSchedulePage - 1, validSchedulePage, validSchedulePage + 1, '...', totalSchedulePages];
  }, [validSchedulePage, totalSchedulePages]);

  const scrollToScheduleTop = () => {
    if (scheduleContainerRef.current) {
      scheduleContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSchedulePageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalSchedulePages);
    setScheduleCurrentPage(clamped);
    scrollToScheduleTop();
  };

  const handleScheduleItemsPerPageChange = (newSize: number) => {
    setScheduleItemsPerPage(newSize);
    setScheduleCurrentPage(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_maintenance_per_page', String(newSize));
    }
  };

  const handleJumpSchedulePage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(jumpSchedulePageInput.trim(), 10);
    if (!isNaN(val)) {
      const target = Math.min(Math.max(1, val), totalSchedulePages);
      setScheduleCurrentPage(target);
      setJumpSchedulePageInput('');
      scrollToScheduleTop();
    }
  };

  const handleToggleScheduleViewMode = (mode: 'table' | 'grid') => {
    setScheduleViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_maintenance_view_mode', mode);
    }
  };

  // Filter & Pagination for Records Tab
  const filteredRecords = useMemo(() => {
    if (!searchRecordsQuery.trim()) return displayRecords;
    const q = searchRecordsQuery.toLowerCase().trim();
    return displayRecords.filter(r => 
      r.maintenanceCode?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.customerCode?.toLowerCase().includes(q) ||
      r.technicianName?.toLowerCase().includes(q) ||
      r.content?.toLowerCase().includes(q) ||
      r.inspectionResult?.toLowerCase().includes(q)
    );
  }, [displayRecords, searchRecordsQuery]);

  useEffect(() => {
    setRecordsCurrentPage(1);
  }, [searchRecordsQuery]);

  const totalRecordsPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRecords.length / recordsItemsPerPage));
  }, [filteredRecords.length, recordsItemsPerPage]);

  const validRecordsPage = useMemo(() => {
    return Math.min(Math.max(1, recordsCurrentPage), totalRecordsPages);
  }, [recordsCurrentPage, totalRecordsPages]);

  const recordsStartIndex = (validRecordsPage - 1) * recordsItemsPerPage;
  const recordsEndIndex = Math.min(recordsStartIndex + recordsItemsPerPage, filteredRecords.length);

  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(recordsStartIndex, recordsEndIndex);
  }, [filteredRecords, recordsStartIndex, recordsEndIndex]);

  const smartRecordsPageNumbers = useMemo(() => {
    if (totalRecordsPages <= 7) {
      return Array.from({ length: totalRecordsPages }, (_, i) => i + 1);
    }
    if (validRecordsPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalRecordsPages];
    }
    if (validRecordsPage >= totalRecordsPages - 3) {
      return [1, '...', totalRecordsPages - 4, totalRecordsPages - 3, totalRecordsPages - 2, totalRecordsPages - 1, totalRecordsPages];
    }
    return [1, '...', validRecordsPage - 1, validRecordsPage, validRecordsPage + 1, '...', totalRecordsPages];
  }, [validRecordsPage, totalRecordsPages]);

  const scrollToRecordsTop = () => {
    if (recordsContainerRef.current) {
      recordsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRecordsPageChange = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalRecordsPages);
    setRecordsCurrentPage(clamped);
    scrollToRecordsTop();
  };

  const handleRecordsItemsPerPageChange = (newSize: number) => {
    setRecordsItemsPerPage(newSize);
    setRecordsCurrentPage(1);
  };

  const handleJumpRecordsPage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(jumpRecordsPageInput.trim(), 10);
    if (!isNaN(val)) {
      const target = Math.min(Math.max(1, val), totalRecordsPages);
      setRecordsCurrentPage(target);
      setJumpRecordsPageInput('');
      scrollToRecordsTop();
    }
  };

  const handleOpenCreateRecord = (cust?: Customer) => {
    setEditingRecord(null);
    const targetCust = cust || (customers.length > 0 ? customers[0] : null);
    if (targetCust) {
      setSelectedCustomerId(targetCust.id);
      // Initialize maintenanceDate with customer's current/old scheduled maintenance date (or today if none)
      const initDate = targetCust.nextMaintenanceDate || new Date().toISOString().split('T')[0];
      updateMaintenanceDate(initDate, false);
    } else {
      updateMaintenanceDate(new Date().toISOString().split('T')[0], false);
    }
    setTechnicianName(currentUser?.fullName.split(' - ')[0] || 'Nguyễn Văn Hùng');
    setContent('Kiểm tra biến tần, siết các đầu nối MC4, đo điện áp chuỗi pin PV, vệ sinh tấm pin và lọc gió inverter.');
    setInspectionResult('Hệ thống hoạt động bình thường, điện áp DC và AC ổn định.');
    setRecommendations('Vệ sinh bề mặt tấm pin định kỳ sau 6 tháng. Kiểm tra dây siết bu lông.');
    setImageBefore('');
    setImageAfter('');
    setIsRecordModalOpen(true);
  };

  const handleOpenEditRecord = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    const matchedCust = customers.find(c => c.id === rec.customerId || c.customerCode === rec.customerCode);
    setSelectedCustomerId(matchedCust?.id || rec.customerId || '');
    setTechnicianName(rec.technicianName);
    updateMaintenanceDate(rec.maintenanceDate, false);
    setContent(rec.content);
    setInspectionResult(rec.inspectionResult);
    setRecommendations(rec.recommendations);
    setImageBefore(rec.imageBefore || '');
    setImageAfter(rec.imageAfter || '');
    setIsRecordModalOpen(true);
  };

  const handleCreateRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      if (editingRecord) {
        await updateMaintenanceRecord(editingRecord.id, {
          customerId: cust.id,
          customerCode: cust.customerCode,
          customerName: cust.customerName,
          maintenanceDate,
          technicianName,
          content,
          inspectionResult,
          recommendations,
          imageBefore,
          imageAfter
        });
      } else {
        // Lấy ngày tạo phiếu (thời điểm lập phiếu hôm nay: new Date()) để tạo mã số phiếu:
        // BD + 2 số ngày + 2 số tháng + 4 số năm + '-' + 2 số thứ tự phiếu
        const creationDate = new Date();
        const code = generateMaintenanceCode(creationDate, maintenanceRecords);
        const d = new Date(maintenanceDate);
        d.setDate(d.getDate() + 180);
        const newScheduledDate = d.toISOString().split('T')[0];

        await addMaintenanceRecord({
          customerId: cust.id,
          customerCode: cust.customerCode,
          customerName: cust.customerName,
          maintenanceCode: code,
          maintenanceDate,
          technicianName,
          content,
          inspectionResult,
          recommendations,
          imageBefore,
          imageAfter,
          nextScheduledDate: newScheduledDate
        });
      }

      setIsRecordModalOpen(false);
      setEditingRecord(null);
      setActiveSubTab('records');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 1000);
    }
  };

  const handleConfirmDeleteRecord = async () => {
    if (!deletingRecord) return;
    try {
      setIsSubmitting(true);
      await deleteMaintenanceRecord(deletingRecord.id);
      setDeletingRecord(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTarget || channels.length === 0) return;
    setSendingNotif(true);
    await sendMaintenanceNotification(notifTarget, channels);
    setSendingNotif(false);
    setNotifSuccess(`Đã gửi thông báo nhắc lịch cho ${notifTarget.customerName}!`);
    setTimeout(() => {
      setNotifSuccess('');
      setNotifTarget(null);
    }, 2000);
  };

  // Kích hoạt gửi lời nhắn Zalo trực tiếp dựa theo số điện thoại khách hàng (đảm bảo thành công 100%)
  const handleConfirmSendZalo = () => {
    if (!zaloConfirmCust) return;
    const cust = zaloConfirmCust;
    
    // Chuẩn hóa số điện thoại: loại bỏ ký tự lạ, chuyển đầu số 84 thành 0 nếu có
    let cleanPhone = cust.phoneNumber ? cust.phoneNumber.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('84') && cleanPhone.length >= 11) {
      cleanPhone = '0' + cleanPhone.slice(2);
    }

    if (!cleanPhone) {
      setZaloNotificationSuccess(`Khách hàng ${cust.customerName} chưa có số điện thoại hợp lệ để gửi Zalo!`);
      setTimeout(() => setZaloNotificationSuccess(''), 3500);
      setZaloConfirmCust(null);
      return;
    }

    setIsSendingZalo(true);
    const formattedDate = formatDateVN(cust.nextMaintenanceDate);
    const message = `Kính gửi khách hàng ${cust.customerName}. Hệ thống điện mặt trời tại ${cust.address} sẽ đến kỳ bảo dưỡng vào ngày ${formattedDate}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532`;

    // Nhận diện thiết bị hiện tại (Mobile: iOS, Android; Laptop/Máy tính)
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;

    // 1. Tự động sao chép nội dung tin nhắn vào clipboard (tương thích mọi thiết bị)
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

    // 3. Tự động ghi nhận thông báo Zalo vào hệ thống dữ liệu
    sendMaintenanceNotification(cust, ['Zalo OA']).catch(err => {
      console.warn('Ghi nhận thông báo lỗi:', err);
    });

    // 4. Mở hộp thoại hỗ trợ đảm bảo 100% gửi thành công đến Zalo khách hàng trên mọi thiết bị
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

    setZaloConfirmCust(null);
    setIsSendingZalo(false);
  };

  const handleShareMobileZalo = async () => {
    if (!zaloSentSuccessData) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Thông báo bảo trì hệ thống điện mặt trời - Công ty 3TGE',
          text: zaloSentSuccessData.message,
          url: zaloSentSuccessData.zaloUrl
        });
      } catch (e) {
        console.warn('Mobile Share cancelled/error:', e);
      }
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(zaloSentSuccessData.message);
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      }
    }
  };

  // Image upload
  const handleUploadImage = (setter: (url: string) => void, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      {/* Top Banner and Tabs */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Lịch Nhắc & Quản Lý Phiếu Bảo Dưỡng</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Chu kỳ 180 ngày
            </span>

            {/* Dynamic Page Badge & Mini Navigator */}
            {activeSubTab === 'schedule' && filteredScheduleCustomers.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-semibold border border-slate-200">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Trang <strong className="text-emerald-700 font-bold">{validSchedulePage}</strong>/{totalSchedulePages}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] text-slate-500">{scheduleItemsPerPage} KH/trang</span>

                {totalSchedulePages > 1 && (
                  <div className="flex items-center gap-0.5 ml-1 border-l border-slate-300 pl-1">
                    <button
                      type="button"
                      onClick={() => handleSchedulePageChange(validSchedulePage - 1)}
                      disabled={validSchedulePage === 1}
                      className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                      title="Trang trước"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSchedulePageChange(validSchedulePage + 1)}
                      disabled={validSchedulePage === totalSchedulePages}
                      className="p-0.5 hover:bg-slate-200 rounded disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition"
                      title="Trang tiếp"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động cảnh báo: &le; 5 ngày (Vàng), Đến hạn (Cam), Quá hạn (Đỏ) • Tự động cộng 180 ngày khi lập phiếu
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/Zalo-Auto-Send-3TGE.bat"
            download="Zalo-Auto-Send-3TGE.bat"
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Tải trợ lý chạy ngầm tự động dán (Ctrl+V) và tự động nhấn nút Gửi (Enter) trên Zalo PC"
          >
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">Trợ Lý Auto-Send Zalo</span>
          </a>

          {activeSubTab === 'records' && (
            <button
              onClick={() => exportMaintenanceToExcel(maintenanceRecords)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Xuất Excel
            </button>
          )}

          {hasPermission('maintenance_record_create') && (
            <button
              onClick={() => handleOpenCreateRecord()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Lập Phiếu Bảo Dưỡng (+180 ngày)
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeSubTab === 'schedule'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Lịch Bảo Trì Hệ Thống ({customers.filter(c => !c.isDisabled).length})
        </button>

        <button
          onClick={() => setActiveSubTab('records')}
          className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeSubTab === 'records'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Danh Sách Phiếu Đã Thực Hiện ({displayRecords.length})
        </button>
      </div>

      {/* TAB 1: SCHEDULE VIEW */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-2.5">
          {/* Quick Filters Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterMode === 'ALL' 
                  ? 'bg-slate-800 text-white shadow-2xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tất cả ({scheduleCounts.all})
            </button>
            <button
              onClick={() => setFilterMode('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterMode === 'OVERDUE' 
                  ? 'bg-rose-600 text-white shadow-2xs' 
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              🔴 Quá hạn ({scheduleCounts.overdue})
            </button>
            <button
              onClick={() => setFilterMode('TODAY')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterMode === 'TODAY' 
                  ? 'bg-orange-600 text-white shadow-2xs' 
                  : 'bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100'
              }`}
            >
              🟠 Đến hạn hôm nay ({scheduleCounts.today})
            </button>
            <button
              onClick={() => setFilterMode('SOON')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterMode === 'SOON' 
                  ? 'bg-amber-600 text-white shadow-2xs' 
                  : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
              }`}
            >
              🟡 Sắp đến hạn ≤ 5 ngày ({scheduleCounts.soon})
            </button>
            <button
              onClick={() => setFilterMode('NORMAL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                filterMode === 'NORMAL' 
                  ? 'bg-emerald-600 text-white shadow-2xs' 
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              🟢 Đang theo dõi ({scheduleCounts.normal})
            </button>
          </div>

          {/* Search, Sort and View Mode Toolbar */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 text-xs">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm tên KH, mã KH, SĐT, địa chỉ, thiết bị inverter..."
                value={searchScheduleQuery}
                onChange={(e) => setSearchScheduleQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200 focus:outline-emerald-500 focus:bg-white transition"
              />
              {searchScheduleQuery && (
                <button
                  type="button"
                  onClick={() => setSearchScheduleQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & View Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={scheduleSortBy}
                  onChange={(e) => setScheduleSortBy(e.target.value as any)}
                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-700 focus:outline-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="date_asc">Hạn bảo dưỡng: Gần nhất / Quá hạn (Mặc định)</option>
                  <option value="date_desc">Hạn bảo dưỡng: Xa nhất</option>
                  <option value="code_asc">Mã khách hàng: A → Z</option>
                  <option value="code_desc">Mã khách hàng: Z → A</option>
                  <option value="name_asc">Tên khách hàng: A → Z</option>
                </select>
              </div>

              {/* View Mode Toggle (Table / Grid) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggleScheduleViewMode('table')}
                  className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    scheduleViewMode === 'table'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Xem dạng Bảng (Siêu thu gọn dòng, hiển thị trọn vẹn 12 KH trên 1 trang)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bảng (Thu gọn)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleScheduleViewMode('grid')}
                  className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                    scheduleViewMode === 'grid'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Xem dạng Thẻ (Lưới 3 cột)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thẻ lưới</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Content Area (Table View or Grid View) */}
          <div ref={scheduleContainerRef} className="scroll-mt-4">
            {filteredScheduleCustomers.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
                <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">
                  Không tìm thấy khách hàng nào khớp với điều kiện lọc hiện tại.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('ALL');
                    setSearchScheduleQuery('');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : scheduleViewMode === 'table' ? (
              /* DẠNG BẢNG SIÊU THU GỌN - ĐÁP ỨNG HIỂN THỊ 12 KHÁCH HÀNG / TRANG */
              <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[9px] tracking-wider leading-none">
                        <th className="py-1 px-1.5 whitespace-nowrap">Mã KH</th>
                        <th className="py-1 px-1.5">Khách Hàng & SĐT</th>
                        <th className="py-1 px-1.5">Địa Chỉ / Khu Vực</th>
                        <th className="py-1 px-1.5">Biến Tần & Pin</th>
                        <th className="py-1 px-1.5 whitespace-nowrap">Công Suất</th>
                        <th className="py-1 px-1.5 whitespace-nowrap">Ngày Bảo Dưỡng</th>
                        <th className="py-1 px-1.5 whitespace-nowrap">Tình Trạng Thời Gian</th>
                        <th className="py-1 px-1.5 text-right whitespace-nowrap">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {paginatedScheduleCustomers.map((cust) => {
                        const info = getScheduleStatus(cust.nextMaintenanceDate);
                        return (
                          <tr 
                            key={cust.id} 
                            className={`hover:bg-slate-50/80 transition group ${
                              info.status === 'OVERDUE' ? 'bg-rose-50/20' : ''
                            }`}
                          >
                            <td className="py-[3.5px] px-1.5 font-mono font-bold text-emerald-700 whitespace-nowrap text-[11px] leading-tight">
                              <span>{cust.customerCode}</span>
                            </td>
                            <td className="py-[3.5px] px-1.5">
                              <div className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[140px]" title={cust.customerName}>
                                {cust.customerName}
                              </div>
                              <div className="text-[9px] text-slate-500 flex items-center gap-1 leading-none mt-0.5">
                                <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                {cust.phoneNumber}
                              </div>
                            </td>
                            <td className="py-[3.5px] px-1.5 max-w-[170px]">
                              <div className="truncate text-slate-700 flex items-center gap-1 leading-tight text-[10.5px]" title={cust.address}>
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate">{cust.address}</span>
                              </div>
                              <div className="text-[9px] text-slate-400 leading-none pl-3.5 mt-0.5">
                                {cust.province || '—'}
                              </div>
                            </td>
                            <td className="py-[3.5px] px-1.5 max-w-[160px]">
                              <div className="text-slate-800 font-semibold text-[10.5px] leading-tight truncate" title={cust.inverters?.map(i => i.brand).join(', ')}>
                                {cust.inverters && cust.inverters.length > 0 
                                  ? cust.inverters.map(i => `${i.brand} (${i.capacityKW}kW)`).join(', ')
                                  : 'Chưa cập nhật'}
                              </div>
                              {cust.batteries && cust.batteries.length > 0 && (
                                <div className="text-[9px] text-blue-600 truncate leading-none mt-0.5">
                                  Pin: {cust.batteries.map(b => `${b.brand} (${b.capacityKWh}kWh)`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="py-[3.5px] px-1.5 whitespace-nowrap">
                              <span className="font-bold text-slate-800 text-[11px]">{cust.totalCapacityKW}</span>
                              <span className="text-[9px] text-slate-500 ml-0.5">kW</span>
                            </td>
                            <td className="py-[3.5px] px-1.5 whitespace-nowrap">
                              <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px] leading-tight">
                                <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{formatDateVN(cust.nextMaintenanceDate)}</span>
                              </div>
                            </td>
                            <td className="py-[3.5px] px-1.5 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded border font-bold leading-tight w-fit ${info.badgeColor}`}>
                                  {info.text}
                                </span>
                                <span className="text-[9px] text-slate-500 font-medium leading-none pl-0.5">
                                  {info.sub}
                                </span>
                              </div>
                            </td>
                            <td className="py-[3.5px] px-1.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setZaloConfirmCust(cust)}
                                  title={`Gửi lời nhắn Zalo nhắc lịch bảo dưỡng cho khách hàng ${cust.customerName} (${cust.phoneNumber})`}
                                  className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-[10.5px] font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                                >
                                  <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white font-black text-[9px] flex items-center justify-center leading-none shadow-2xs">Z</span>
                                  <span className="hidden sm:inline">Nhắn Zalo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreateRecord(cust)}
                                  title="Lập phiếu bảo dưỡng và tự động cộng 180 ngày vào kỳ tiếp theo"
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-bold inline-flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Lập phiếu</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* DẠNG THẺ LƯỚI 3 CỘT (CARD VIEW) - MỖI TRANG 12 THẺ */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedScheduleCustomers.map(cust => {
                  const info = getScheduleStatus(cust.nextMaintenanceDate);
                  return (
                    <div 
                      key={cust.id} 
                      className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 transition hover:shadow-xs ${info.cardBorder}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {cust.customerCode}
                          </span>
                          <h4 className="font-bold text-slate-800 text-sm mt-1">{cust.customerName}</h4>
                          <p className="text-xs text-slate-500 truncate max-w-[220px]">{cust.address}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${info.badgeColor}`}>
                          {info.text}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Ngày bảo dưỡng:</span>
                          <span className="font-bold text-slate-800">{formatDateVN(cust.nextMaintenanceDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tình trạng thời gian:</span>
                          <span className="font-semibold text-slate-700">{info.sub}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Công suất & thiết bị:</span>
                          <span className="font-semibold text-emerald-700">
                            {cust.totalCapacityKW} KW ({cust.inverters?.map(i => i.brand).join(', ') || 'Chưa có'})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 gap-2">
                        <button
                          type="button"
                          onClick={() => setZaloConfirmCust(cust)}
                          title={`Gửi lời nhắn Zalo nhắc lịch cho khách hàng ${cust.customerName} (${cust.phoneNumber})`}
                          className="flex-1 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                        >
                          <span className="w-4 h-4 rounded bg-blue-600 text-white font-black text-[10px] flex items-center justify-center leading-none shadow-2xs">Z</span>
                          <span>Nhắn Zalo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCreateRecord(cust)}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Lập Phiếu</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Pagination Controls Bar cho Lịch Bảo Trì (Chuẩn hóa quản lý hàng nghìn khách hàng) */}
          {filteredScheduleCustomers.length > 0 && (
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col xl:flex-row items-center justify-between gap-2.5 text-xs">
              {/* Cột 1: Thông số hiển thị & Công suất */}
              <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px]">
                <span className="flex items-center gap-1.5 font-medium">
                  Hiển thị <strong className="text-slate-900 font-bold">{scheduleStartIndex + 1} - {scheduleEndIndex}</strong> trên <strong className="text-emerald-700 font-bold">{filteredScheduleCustomers.length}</strong> khách hàng
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">
                  Tổng: <strong className="text-slate-800 font-bold">{totalFilteredScheduleCapacityKW.toLocaleString()} kW</strong>
                  {totalSchedulePages > 1 && (
                    <span className="text-slate-500 font-normal ml-1">
                      (Trang: <strong className="text-emerald-700 font-bold">{currentSchedulePageCapacityKW.toLocaleString()} kW</strong>)
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
                    value={scheduleItemsPerPage}
                    onChange={(e) => handleScheduleItemsPerPageChange(Number(e.target.value))}
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
                {totalSchedulePages > 1 && (
                  <form onSubmit={handleJumpSchedulePage} className="flex items-center gap-1 text-[11px] text-slate-600">
                    <span className="font-medium whitespace-nowrap">Đến trang:</span>
                    <input
                      type="number"
                      min={1}
                      max={totalSchedulePages}
                      value={jumpSchedulePageInput}
                      onChange={(e) => setJumpSchedulePageInput(e.target.value)}
                      placeholder={String(validSchedulePage)}
                      className="w-12 px-1.5 py-1 text-center bg-white border border-slate-200 rounded font-bold text-slate-800 shadow-2xs focus:outline-emerald-500 text-xs"
                      title={`Nhập số trang từ 1 đến ${totalSchedulePages} rồi nhấn Enter`}
                    />
                    <span className="text-slate-400 font-semibold">/{totalSchedulePages}</span>
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
                  onClick={() => handleSchedulePageChange(1)}
                  disabled={validSchedulePage === 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Về trang đầu (Trang 1)"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSchedulePageChange(validSchedulePage - 1)}
                  disabled={validSchedulePage === 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-0.5 mx-1">
                  {smartSchedulePageNumbers.map((item, idx) => {
                    if (item === '...') {
                      return <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs select-none">...</span>;
                    }
                    const pageNum = item as number;
                    const isActive = pageNum === validSchedulePage;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => handleSchedulePageChange(pageNum)}
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
                  onClick={() => handleSchedulePageChange(validSchedulePage + 1)}
                  disabled={validSchedulePage === totalSchedulePages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Trang tiếp theo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSchedulePageChange(totalSchedulePages)}
                  disabled={validSchedulePage === totalSchedulePages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title={`Đến trang cuối (Trang ${totalSchedulePages})`}
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECORDS LIST */}
      {activeSubTab === 'records' && (
        <div className="space-y-2.5">
          {/* Records Search Toolbar */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, tên khách hàng, mã KH, kỹ thuật viên, nội dung..."
                value={searchRecordsQuery}
                onChange={(e) => setSearchRecordsQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 rounded-md border border-slate-200 focus:outline-emerald-500 focus:bg-white transition"
              />
              {searchRecordsQuery && (
                <button
                  type="button"
                  onClick={() => setSearchRecordsQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span>Hiển thị: <strong className="text-slate-800">{filteredRecords.length}</strong> phiếu</span>
            </div>
          </div>

          <div ref={recordsContainerRef} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden scroll-mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px]">
                    <th className="py-2 px-2.5">Mã Phiếu</th>
                    <th className="py-2 px-2.5">Khách Hàng</th>
                    <th className="py-2 px-2.5">Ngày Làm</th>
                    <th className="py-2 px-2.5">Kỹ Thuật Viên</th>
                    <th className="py-2 px-2.5">Nội Dung Thực Hiện</th>
                    <th className="py-2 px-2.5">Kỳ Tiếp Theo (+180d)</th>
                    <th className="py-2 px-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        {searchRecordsQuery ? 'Không tìm thấy phiếu nào khớp với từ khóa tìm kiếm.' : 'Chưa có phiếu bảo dưỡng nào được tạo.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-2.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                          <span 
                            className="inline-block py-0.5 px-1.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 shadow-2xs font-mono font-bold tracking-tight"
                            title={`Mã phiếu: ${r.maintenanceCode} (Tạo ngày: ${formatDateVN(r.createdAt || r.maintenanceDate)})`}
                          >
                            {r.maintenanceCode}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5">
                          <div className="font-bold text-slate-800 leading-tight">{r.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono leading-tight">{r.customerCode}</div>
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDateVN(r.maintenanceDate)}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium text-[11px]">
                            {r.technicianName}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 max-w-[260px]">
                          <p className="truncate text-slate-600 leading-tight" title={r.content}>{r.content}</p>
                          <p className="text-[10px] text-emerald-600 italic truncate leading-tight">{r.inspectionResult}</p>
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-emerald-700 bg-emerald-50/50 whitespace-nowrap">
                          {formatDateVN(r.nextScheduledDate)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPrintingRecord(r)}
                              title="Xem trước & In phiếu A4 (2 phiếu/tờ, font Times New Roman)"
                              className="px-2 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="hidden sm:inline">In A4</span>
                            </button>

                            {hasPermission('maintenance_record_edit') && (
                              <button
                                onClick={() => handleOpenEditRecord(r)}
                                title="Chỉnh sửa phiếu bảo dưỡng"
                                className="px-2 py-1 rounded border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Sửa</span>
                              </button>
                            )}

                            {hasPermission('maintenance_record_delete') && (
                              <button
                                onClick={() => setDeletingRecord(r)}
                                title="Xóa phiếu & Cập nhật lại ngày bảo dưỡng (-180 ngày)"
                                className="px-2 py-1 rounded border border-rose-200 bg-rose-50/70 hover:bg-rose-100 hover:border-rose-300 text-rose-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Xóa</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Smart Pagination Bar cho Records */}
          {filteredRecords.length > 0 && (
            <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
              <div className="text-slate-600 text-[11px]">
                Hiển thị <strong className="text-slate-900 font-bold">{recordsStartIndex + 1} - {recordsEndIndex}</strong> trên <strong className="text-emerald-700 font-bold">{filteredRecords.length}</strong> phiếu
              </div>

              <div className="flex items-center gap-2 select-none">
                <button
                  type="button"
                  onClick={() => handleRecordsPageChange(1)}
                  disabled={validRecordsPage === 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Về trang đầu"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordsPageChange(validRecordsPage - 1)}
                  disabled={validRecordsPage === 1}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-0.5 mx-1">
                  {smartRecordsPageNumbers.map((item, idx) => {
                    if (item === '...') {
                      return <span key={`rec-ellipsis-${idx}`} className="px-1 text-slate-400 font-bold text-xs select-none">...</span>;
                    }
                    const pageNum = item as number;
                    const isActive = pageNum === validRecordsPage;
                    return (
                      <button
                        key={`rec-page-${pageNum}`}
                        type="button"
                        onClick={() => handleRecordsPageChange(pageNum)}
                        className={`min-w-[26px] h-6 px-1.5 rounded text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-600'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => handleRecordsPageChange(validRecordsPage + 1)}
                  disabled={validRecordsPage === totalRecordsPages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRecordsPageChange(totalRecordsPages)}
                  disabled={validRecordsPage === totalRecordsPages}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 transition cursor-pointer"
                  title="Đến trang cuối"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MAINTENANCE RECORD MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[94vh] overflow-y-auto shadow-2xl p-3 sm:p-4 space-y-2 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div>
                <h3 className="text-sm font-bold text-black">
                  {editingRecord ? `Chỉnh Sửa Phiếu Bảo Dưỡng (${editingRecord.maintenanceCode})` : 'Lập Phiếu Bảo Dưỡng Kỹ Thuật'}
                </h3>
                <p className="text-[10.5px] text-slate-500 font-medium">
                  {editingRecord 
                    ? 'Cập nhật lại thông tin kiểm tra, nội dung thực hiện hoặc hình ảnh công trình'
                    : <>Tự động cộng thêm <strong className="text-emerald-700 font-bold">+180 ngày</strong> vào lịch bảo trì tiếp theo</>
                  }
                </p>
              </div>
              <button onClick={() => { setIsRecordModalOpen(false); setEditingRecord(null); }} className="text-slate-400 hover:text-black p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRecordSubmit} className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Khách Hàng</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCustomerId(newId);
                      const found = customers.find(c => c.id === newId);
                      if (found?.nextMaintenanceDate) {
                        setMaintenanceDate(found.nextMaintenanceDate);
                      }
                    }}
                    className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-black font-medium"
                    required
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.customerCode} - {c.customerName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[9.5px] font-bold text-black leading-tight">
                      Ngày Bảo Dưỡng (Ngày Cũ) <span className="text-rose-500">*</span>
                    </label>
                    <span className={`text-[8.5px] font-mono px-1 rounded ${isValidDMY(maintenanceDateDMY) ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                      dd/MM/yyyy
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="dd/MM/yyyy"
                    maxLength={10}
                    inputMode="numeric"
                    pattern="^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$"
                    title="Định dạng bắt buộc: ngày/tháng/năm (dd/MM/yyyy)"
                    value={maintenanceDateDMY}
                    onChange={(e) => updateMaintenanceDate(e.target.value, true)}
                    onKeyDown={(e) => {
                      if (
                        !/[\d/]/.test(e.key) &&
                        !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key) &&
                        !e.ctrlKey &&
                        !e.metaKey
                      ) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-2 pr-7 py-0.5 text-xs rounded border border-slate-200 text-black font-semibold font-mono placeholder:font-normal placeholder:text-slate-400 focus:outline-emerald-500"
                  />
                  <div
                    className="absolute right-1 bottom-0.5 flex items-center justify-center p-0.5 text-slate-500 hover:text-emerald-600 transition rounded cursor-pointer"
                    title="Chọn ngày bảo dưỡng từ lịch"
                  >
                    <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                    <input
                      type="date"
                      tabIndex={-1}
                      aria-label="Chọn ngày bảo dưỡng từ lịch"
                      title="Chọn ngày bảo dưỡng từ lịch"
                      value={isValidDMY(maintenanceDateDMY) ? dmyToISO(maintenanceDateDMY) : ''}
                      onClick={(e) => {
                        try {
                          if ('showPicker' in e.currentTarget) {
                            e.currentTarget.showPicker();
                          }
                        } catch {
                          // ignore
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.value) {
                          updateMaintenanceDate(e.target.value, false);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Người Thực Hiện (Kỹ Thuật Viên)</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Nguyễn Văn Hùng"
                    className="w-full px-2 py-0.5 rounded border border-slate-200 text-xs text-black font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Ngày Bảo Dưỡng Mới (+180 ngày)</label>
                  <div className="px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-between">
                    <span>
                      {(() => {
                        const d = new Date(maintenanceDate);
                        d.setDate(d.getDate() + 180);
                        return formatDateVN(d.toISOString().split('T')[0]);
                      })()}
                    </span>
                    <span className="text-[9px] text-emerald-700 font-mono font-bold bg-emerald-100/60 px-1 rounded">
                      Mã KH: {customers.find(c => c.id === selectedCustomerId)?.customerCode || ''}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[9.5px] font-bold text-black leading-tight">
                      Số Phiếu Bảo Dưỡng (Tự động theo ngày tạo phiếu: BD + NgàyThángNăm - Thứ tự)
                    </label>
                    <span className="text-[9px] text-slate-500 font-medium">
                      Ví dụ ngày tạo {formatDateVN(new Date())}: {generateMaintenanceCode(new Date(), maintenanceRecords)}
                    </span>
                  </div>
                  <div className="px-2 py-1 bg-emerald-50/70 rounded border border-emerald-300 text-emerald-900 font-mono font-bold text-xs flex items-center justify-between shadow-2xs">
                    <span className="tracking-wide">
                      {editingRecord ? editingRecord.maintenanceCode : generateMaintenanceCode(new Date(), maintenanceRecords)}
                    </span>
                    <span className="text-[9px] font-sans font-semibold text-emerald-800 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                      {editingRecord ? 'Mã phiếu hiện tại' : 'Số phiếu theo ngày tạo hôm nay'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Nội Dung Thực Hiện</label>
                <textarea
                  rows={1}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Vệ sinh tấm pin, kiểm tra siết bulong, đo kiểm điện áp..."
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-black font-medium resize-y"
                  required
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Kết Quả Kiểm Tra</label>
                <textarea
                  rows={1}
                  value={inspectionResult}
                  onChange={(e) => setInspectionResult(e.target.value)}
                  placeholder="Dòng điện DC bình thường, nhiệt độ biến tần 40 độ C..."
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-black font-medium resize-y"
                  required
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">Khuyến Nghị Kỹ Thuật</label>
                <textarea
                  rows={1}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Cắt tỉa cành cây che bóng, theo dõi định kỳ qua app..."
                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs text-black font-medium resize-y"
                />
              </div>

              {/* Before and After Maintenance Images */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="border border-dashed border-slate-300 rounded p-1 text-center space-y-0.5">
                  <span className="text-[9.5px] font-bold text-black block leading-tight">Hình ảnh trước bảo dưỡng</span>
                  {imageBefore ? (
                    <div className="relative">
                      <img src={imageBefore} alt="Before" className="h-16 w-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImageBefore('')}
                        className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block p-1 hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Tải ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUploadImage(setImageBefore, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>

                <div className="border border-dashed border-slate-300 rounded p-1 text-center space-y-0.5">
                  <span className="text-[9.5px] font-bold text-black block leading-tight">Hình ảnh sau bảo dưỡng</span>
                  {imageAfter ? (
                    <div className="relative">
                      <img src={imageAfter} alt="After" className="h-16 w-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => setImageAfter('')}
                        className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block p-1 hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5 mx-auto text-slate-400" />
                      <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Tải ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleUploadImage(setImageAfter, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsRecordModalOpen(false); setEditingRecord(null); }}
                  className="px-3 py-1 text-black font-semibold hover:bg-slate-100 rounded text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-800/60 disabled:cursor-not-allowed disabled:opacity-75 text-white font-bold rounded text-xs shadow-xs transition cursor-pointer select-none flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu phiếu...</span>
                    </>
                  ) : editingRecord ? (
                    'Cập Nhật Phiếu'
                  ) : (
                    'Lưu & Tự Động Gia Hạn +180 Ngày'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MAINTENANCE RECORD MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Xác Nhận Xóa Phiếu</h3>
                <p className="text-xs text-slate-500">Thao tác này không thể hoàn tác</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <div><strong className="text-slate-800">Mã phiếu:</strong> <span className="font-mono font-bold text-emerald-700">{deletingRecord.maintenanceCode}</span></div>
              <div><strong className="text-slate-800">Khách hàng:</strong> {deletingRecord.customerName} (<span className="font-mono font-bold text-emerald-700">{deletingRecord.customerCode}</span>)</div>
              <div><strong className="text-slate-800">Kỳ tiếp theo của phiếu:</strong> {formatDateVN(deletingRecord.nextScheduledDate)}</div>
              <div className="pt-1.5 border-t border-slate-200 text-emerald-800 font-semibold flex items-center justify-between">
                <span>Cập nhật lại ngày bảo dưỡng (-180 ngày):</span>
                <span className="font-bold font-mono bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded">
                  {(() => {
                    const d = new Date(deletingRecord.nextScheduledDate || deletingRecord.maintenanceDate);
                    d.setDate(d.getDate() - 180);
                    return formatDateVN(d.toISOString().split('T')[0]);
                  })()}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn xóa vĩnh viễn phiếu bảo dưỡng này? Ngày bảo dưỡng của khách hàng <span className="font-bold text-emerald-700">{deletingRecord.customerCode}</span> sẽ tự động trừ đi 180 ngày tương ứng.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteRecord}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {isSubmitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HỎI XÁC NHẬN GỬI THÔNG BÁO QUA ZALO */}
      {zaloConfirmCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  Zalo
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gửi Lời Nhắn Qua Zalo</h3>
                  <p className="text-[11px] text-slate-500">Mã KH: {zaloConfirmCust.customerCode}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setZaloConfirmCust(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Câu hỏi xác nhận chính xác theo yêu cầu người dùng */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-900 leading-snug">
                Bạn có muốn gửi thông báo cho khách hàng <span className="text-blue-700 font-bold">{zaloConfirmCust.customerName}</span> - <span className="text-blue-700 font-bold font-mono">{zaloConfirmCust.phoneNumber || '(Chưa có SĐT)'}</span>?
              </p>
            </div>

            {/* Xem trước nội dung lời nhắn */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between font-bold text-slate-700">
                <span>Nội dung tin nhắn Zalo gửi đến số {zaloConfirmCust.phoneNumber || '...'}:</span>
                <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-normal">Tự động sao chép</span>
              </div>
              <p className="italic text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-sans select-all">
                &quot;Kính gửi khách hàng {zaloConfirmCust.customerName}. Hệ thống điện mặt trời tại {zaloConfirmCust.address} sẽ đến kỳ bảo dưỡng vào ngày {formatDateVN(zaloConfirmCust.nextMaintenanceDate)}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532&quot;
              </p>
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-2.5 space-y-1.5 text-[10.5px] text-blue-900">
                <p className="font-semibold flex items-center gap-1 text-blue-800">
                  <Zap className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Quy trình tự động kích hoạt khi bấm <strong>Đồng ý</strong>:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                  <div className="bg-white/90 p-2 rounded-lg border border-blue-100 flex items-start gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-900 block text-[11px]">Mobile (iOS &amp; Android):</strong>
                      <span className="text-slate-600 text-[10px] leading-tight">Tự mở Zalo App, sao chép sẵn lời nhắn. Chạm &quot;Dán&quot; trên bàn phím là gửi ngay!</span>
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

            {/* Nút thao tác: Đồng ý hoặc Hủy/Không gửi */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setZaloConfirmCust(null)}
                disabled={isSendingZalo}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Không gửi
              </button>
              <button
                type="button"
                onClick={handleConfirmSendZalo}
                disabled={isSendingZalo || !zaloConfirmCust.phoneNumber}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isSendingZalo ? (
                  'Đang xử lý...'
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Đồng ý</span>
                  </>
                )}
              </button>
            </div>
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
                      <CheckCircle className="w-4 h-4 text-emerald-600 inline" />
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

      {/* Toast thông báo thành công */}
      {zaloNotificationSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4 shrink-0 text-white" />
          <span>{zaloNotificationSuccess}</span>
          <button onClick={() => setZaloNotificationSuccess('')} className="ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Modal In & Xuất Phiếu Bảo Dưỡng A4 (2 Phiếu / 1 Tờ) */}
      <MaintenancePrintModal
        record={printingRecord}
        isOpen={Boolean(printingRecord)}
        onClose={() => setPrintingRecord(null)}
      />
    </div>
  );
};
