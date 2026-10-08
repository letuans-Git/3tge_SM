import React, { useState } from 'react';
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
  Printer
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
  const [filterMode, setFilterMode] = useState<'ALL' | 'OVERDUE' | 'SOON' | 'TODAY'>('ALL');

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

  // Quick Dispatch Notification modal
  const [notifTarget, setNotifTarget] = useState<Customer | null>(null);
  const [channels, setChannels] = useState<Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>>([
    'Zalo OA', 'Telegram Bot'
  ]);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

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

  // Filter customers by maintenance schedule (only active customers)
  const filteredScheduleCustomers = customers.filter(c => {
    if (c.isDisabled) return false;
    const s = getScheduleStatus(c.nextMaintenanceDate);
    if (filterMode === 'OVERDUE') return s.status === 'OVERDUE';
    if (filterMode === 'SOON') return s.status === 'SOON';
    if (filterMode === 'TODAY') return s.status === 'TODAY';
    return true;
  });

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

  // Image upload
  const handleUploadImage = (setter: (url: string) => void, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Lịch Nhắc & Quản Lý Phiếu Bảo Dưỡng</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Chu kỳ 180 ngày
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tự động cảnh báo: &le; 5 ngày (Vàng), Đến hạn (Cam), Quá hạn (Đỏ) • Tự động cộng 180 ngày khi lập phiếu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'records' && (
            <button
              onClick={() => exportMaintenanceToExcel(maintenanceRecords)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Xuất Excel
            </button>
          )}

          {hasPermission('maintenance_record_create') && (
            <button
              onClick={() => handleOpenCreateRecord()}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
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
          className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'schedule'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          Lịch Bảo Trì Hệ Thống ({customers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('records')}
          className={`pb-2.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
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
        <div className="space-y-3">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterMode === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Tất cả ({customers.length})
            </button>
            <button
              onClick={() => setFilterMode('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterMode === 'OVERDUE' ? 'bg-rose-600 text-white' : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}
            >
              🔴 Quá hạn bảo dưỡng
            </button>
            <button
              onClick={() => setFilterMode('TODAY')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterMode === 'TODAY' ? 'bg-orange-600 text-white' : 'bg-orange-50 border border-orange-200 text-orange-700'
              }`}
            >
              🟠 Đến hạn hôm nay
            </button>
            <button
              onClick={() => setFilterMode('SOON')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                filterMode === 'SOON' ? 'bg-amber-600 text-white' : 'bg-amber-50 border border-amber-200 text-amber-700'
              }`}
            >
              🟡 Sắp đến hạn (&le; 5 ngày)
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredScheduleCustomers.map(cust => {
              const info = getScheduleStatus(cust.nextMaintenanceDate);
              return (
                <div 
                  key={cust.id} 
                  className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3 ${info.cardBorder}`}
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

                  <div className="text-xs space-y-1.5 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
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
                        {cust.totalCapacityKW} KW ({cust.inverters?.map(i => i.brand).join(', ')})
                      </span>
                    </div>
                  </div>

                  {/* Actions for this customer */}
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => setNotifTarget(cust)}
                      className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Send className="w-3 h-3" />
                      Gửi Nhắc Lịch
                    </button>
                    <button
                      onClick={() => handleOpenCreateRecord(cust)}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow-2xs"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Lập Phiếu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RECORDS LIST */}
      {activeSubTab === 'records' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
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
                {displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Chưa có phiếu bảo dưỡng nào được tạo.
                    </td>
                  </tr>
                ) : (
                  displayRecords.map(r => (
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
                              className="px-2 py-1 rounded border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold inline-flex items-center gap-1 shadow-2xs transition"
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

      {/* DISPATCH NOTIFICATION MODAL */}
      {notifTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-black">Nhắc Lịch Bảo Dưỡng Định Kỳ</h3>
                <p className="text-black font-medium">Khách hàng: {notifTarget.customerName} ({notifTarget.customerCode})</p>
              </div>
              <button onClick={() => setNotifTarget(null)} className="text-slate-600 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {notifSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>{notifSuccess}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-black block">Nội dung mẫu chuẩn:</span>
                  <p className="italic text-black font-medium leading-relaxed">
                    &quot;Kính gửi khách hàng {notifTarget.customerName}. Hệ thống điện mặt trời tại {notifTarget.address} sẽ đến kỳ bảo dưỡng vào ngày {formatDateVN(notifTarget.nextMaintenanceDate)}. Vui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532&quot;
                  </p>
                </div>

                <div>
                  <span className="font-bold text-black block mb-1.5">Kênh gửi:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Zalo OA', 'Telegram Bot', 'Email', 'Push Notification'] as const).map(ch => {
                      const isSel = channels.includes(ch);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            if (isSel) setChannels(channels.filter(c => c !== ch));
                            else setChannels([...channels, ch]);
                          }}
                          className={`p-2 rounded-lg border text-left font-semibold ${
                            isSel ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-black'
                          }`}
                        >
                          {isSel ? '✓ ' : '+ '} {ch}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setNotifTarget(null)}
                    className="px-3.5 py-1.5 text-black font-semibold hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSendNotification}
                    disabled={sendingNotif || channels.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition disabled:opacity-50"
                  >
                    {sendingNotif ? 'Đang gửi...' : 'Xác Nhận Gửi'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
