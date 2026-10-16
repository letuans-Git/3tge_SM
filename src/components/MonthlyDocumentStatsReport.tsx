import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Download, 
  Eye, 
  Lock, 
  FileSpreadsheet, 
  Search, 
  Building2, 
  HardDrive,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Sparkles,
  Layers,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Customer, CustomerPdfDocument, Supplier } from '../types';
import { formatDateVN } from '../utils/dateUtils';
import { resolvePdfFileData } from '../utils/pdfStorage';
import { exportDocumentStatsToExcel } from '../utils/exportUtils';
import { PdfViewerModal } from './PdfViewerModal';

export interface SupplierPurchaseInvoice {
  id: string;
  doc: CustomerPdfDocument;
  customer: Customer;
  supplierName: string;
  supplierCode?: string;
  supplierPhone?: string;
  year: number;
  month: number; // 1 - 12
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Tháng MM/YYYY"
  invoiceDateFormatted: string;
  fileSizeStr: string;
  fileSizeBytes: number;
}

export interface MonthlyFolderGroup {
  monthKey: string;
  monthLabel: string;
  year: number;
  monthNumber: number;
  invoices: SupplierPurchaseInvoice[];
  suppliers: Set<string>;
  suppliersListStr: string;
  customerCount: number;
  totalFiles: number;
  totalBytes: number;
  totalSizeLabel: string;
}

export const MonthlyDocumentStatsReport: React.FC = () => {
  const { customers, suppliers } = useData();
  const { hasPermission } = useAuth();

  // Phân quyền bảo mật: Chỉ ai được phân quyền xem mới được xem, chỉ ai có quyền tải mới được tải
  const canView = hasPermission('customer_pdf_view');
  const canDownload = hasPermission('customer_pdf_download');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthKey = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // State bộ lọc & hiển thị
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [onlyWithInvoices, setOnlyWithInvoices] = useState<boolean>(true);

  // State quản lý đóng/mở từng thư mục tháng
  const [openFolderKeys, setOpenFolderKeys] = useState<Record<string, boolean>>({
    [currentMonthKey]: true,
  });

  // State xem file PDF trong modal
  const [previewDoc, setPreviewDoc] = useState<CustomerPdfDocument | null>(null);
  const [previewCustomerId, setPreviewCustomerId] = useState<string | undefined>(undefined);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [batchDownloadingMonth, setBatchDownloadingMonth] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Trợ giúp tra cứu thông tin Nhà Cung Cấp từ danh mục suppliers
  const supplierLookup = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((s) => {
      map.set(s.name.trim().toLowerCase(), s);
      map.set(s.code.trim().toLowerCase(), s);
    });
    return map;
  }, [suppliers]);

  // Trích xuất CHỈ HÓA ĐƠN MUA VÀO TỪ NHÀ CUNG CẤP (loại bỏ hoàn toàn CO, CQ, biên bản, hợp đồng khác)
  const allPurchaseInvoices = useMemo(() => {
    const list: SupplierPurchaseInvoice[] = [];

    customers.forEach((cust) => {
      // Xác định nhà cung cấp từ các thiết bị công trình (Inverter, Pin lưu trữ, Tấm pin PV, Quạt gió)
      const primarySupplierName = 
        cust.inverters?.[0]?.distributor ||
        cust.batteries?.[0]?.distributor ||
        cust.solarPanels?.distributor ||
        cust.windTurbines?.[0]?.distributor ||
        'Nhà Cung Cấp 3TGE';

      const foundSupplier = supplierLookup.get(primarySupplierName.trim().toLowerCase());
      const supplierDisplay = foundSupplier ? foundSupplier.name : primarySupplierName;
      const supplierCodeDisplay = foundSupplier ? foundSupplier.code : undefined;
      const supplierPhoneDisplay = foundSupplier?.phone;

      if (cust.pdfDocuments && Array.isArray(cust.pdfDocuments)) {
        cust.pdfDocuments.forEach((doc) => {
          const cat = (doc.category || '').toLowerCase().trim();
          const nameLower = (doc.name || '').toLowerCase().trim();

          // TIÊU CHÍ LỌC TUYỆT ĐỐI: CHỈ LẤY HÓA ĐƠN MUA VÀO, KHÔNG LẤY CO, CQ HAY GIẤY TỜ KHÁC
          const isExplicitInvoice = cat === 'invoice';
          const isInvoiceKeyword = 
            nameLower.includes('hóa đơn') || 
            nameLower.includes('hoa don') || 
            nameLower.includes('gtgt') || 
            nameLower.includes('invoice') || 
            nameLower.includes('hđ ');

          const isExcludedCoCq = 
            cat === 'co_cq' || 
            cat === 'co' || 
            cat === 'cq' || 
            nameLower.includes('co_cq') || 
            nameLower.includes('co-cq') || 
            nameLower.includes('cq-') ||
            nameLower.includes('origin') || 
            nameLower.includes('quality') || 
            nameLower.includes('chứng chỉ') || 
            nameLower.includes('phiếu bảo dưỡng') ||
            nameLower.includes('hợp đồng') ||
            nameLower.includes('bien ban');

          // Chỉ nhận nếu là Hóa đơn và không phải là CO/CQ
          if ((isExplicitInvoice || isInvoiceKeyword) && !isExcludedCoCq) {
            // Xác định thời điểm hóa đơn
            const dateStr = doc.uploadedAt || cust.handoverDate || cust.createdAt;
            const d = new Date(dateStr);
            const validDate = isNaN(d.getTime()) ? new Date() : d;
            const year = validDate.getFullYear();
            const month = validDate.getMonth() + 1;
            const monthKey = `${year}-${String(month).padStart(2, '0')}`;
            const monthLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`;

            // Ước lượng dung lượng bytes
            let fileSizeBytes = 0;
            if (doc.fileSize) {
              const kbMatch = doc.fileSize.match(/([\d.]+)\s*kb/i);
              const mbMatch = doc.fileSize.match(/([\d.]+)\s*mb/i);
              if (mbMatch) fileSizeBytes = parseFloat(mbMatch[1]) * 1024 * 1024;
              else if (kbMatch) fileSizeBytes = parseFloat(kbMatch[1]) * 1024;
            }
            if (fileSizeBytes === 0 && doc.fileData) {
              fileSizeBytes = Math.round((doc.fileData.length * 3) / 4);
            }

            list.push({
              id: `${cust.id}_${doc.id}`,
              doc,
              customer: cust,
              supplierName: supplierDisplay,
              supplierCode: supplierCodeDisplay,
              supplierPhone: supplierPhoneDisplay,
              year,
              month,
              monthKey,
              monthLabel,
              invoiceDateFormatted: doc.uploadedAt ? formatDateVN(doc.uploadedAt) : formatDateVN(cust.handoverDate || cust.createdAt),
              fileSizeStr: doc.fileSize || (fileSizeBytes > 0 ? `${(fileSizeBytes / 1024).toFixed(1)} KB` : 'PDF'),
              fileSizeBytes
            });
          }
        });
      }
    });

    // Sắp xếp ngày mới nhất lên đầu
    return list.sort((a, b) => {
      const tA = new Date(a.doc.uploadedAt || a.customer.createdAt).getTime() || 0;
      const tB = new Date(b.doc.uploadedAt || b.customer.createdAt).getTime() || 0;
      return tB - tA;
    });
  }, [customers, supplierLookup]);

  // Danh sách các Năm có phát sinh hóa đơn mua vào
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(String(currentYear));
    allPurchaseInvoices.forEach((d) => years.add(String(d.year)));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allPurchaseInvoices, currentYear]);

  // Danh sách các Nhà Cung Cấp thực tế có hóa đơn mua vào
  const activeSuppliersList = useMemo(() => {
    const map = new Map<string, string>();
    allPurchaseInvoices.forEach((inv) => {
      map.set(inv.supplierName, inv.supplierCode ? `${inv.supplierCode} - ${inv.supplierName}` : inv.supplierName);
    });
    return Array.from(map.entries()).map(([name, label]) => ({ name, label }));
  }, [allPurchaseInvoices]);

  // Bộ lọc theo Năm, Nhà Cung Cấp và Từ Khóa Tìm Kiếm
  const filteredInvoices = useMemo(() => {
    return allPurchaseInvoices.filter((inv) => {
      if (selectedYear !== 'ALL' && String(inv.year) !== selectedYear) return false;
      if (selectedSupplierFilter !== 'ALL' && inv.supplierName !== selectedSupplierFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = inv.doc.name.toLowerCase().includes(q);
        const matchSupplier = inv.supplierName.toLowerCase().includes(q);
        const matchCustCode = inv.customer.customerCode.toLowerCase().includes(q);
        const matchCustName = inv.customer.customerName.toLowerCase().includes(q);
        const matchContract = (inv.customer.contractNumber || '').toLowerCase().includes(q);
        const matchPhone = (inv.customer.phoneNumber || '').includes(q);
        if (!matchName && !matchSupplier && !matchCustCode && !matchCustName && !matchContract && !matchPhone) {
          return false;
        }
      }

      return true;
    });
  }, [allPurchaseInvoices, selectedYear, selectedSupplierFilter, searchQuery]);

  // GOM NHÓM THEO THƯ MỤC TỪNG THÁNG (Mỗi tháng là 1 thư mục)
  const monthlyFolders = useMemo(() => {
    const foldersMap: Record<string, MonthlyFolderGroup> = {};

    // Khởi tạo trước các tháng nếu chọn 1 năm cụ thể
    if (selectedYear !== 'ALL') {
      const yr = parseInt(selectedYear, 10);
      for (let m = 1; m <= 12; m++) {
        const key = `${yr}-${String(m).padStart(2, '0')}`;
        foldersMap[key] = {
          monthKey: key,
          monthLabel: `Tháng ${String(m).padStart(2, '0')}/${yr}`,
          year: yr,
          monthNumber: m,
          invoices: [],
          suppliers: new Set<string>(),
          suppliersListStr: '',
          customerCount: 0,
          totalFiles: 0,
          totalBytes: 0,
          totalSizeLabel: '0 KB'
        };
      }
    }

    // Đổ các hóa đơn mua vào vào thư mục tháng tương ứng
    filteredInvoices.forEach((inv) => {
      if (!foldersMap[inv.monthKey]) {
        foldersMap[inv.monthKey] = {
          monthKey: inv.monthKey,
          monthLabel: inv.monthLabel,
          year: inv.year,
          monthNumber: inv.month,
          invoices: [],
          suppliers: new Set<string>(),
          suppliersListStr: '',
          customerCount: 0,
          totalFiles: 0,
          totalBytes: 0,
          totalSizeLabel: '0 KB'
        };
      }

      const f = foldersMap[inv.monthKey];
      f.invoices.push(inv);
      f.suppliers.add(inv.supplierName);
      f.totalFiles += 1;
      f.totalBytes += inv.fileSizeBytes;
    });

    // Tính toán số lượng khách hàng và dung lượng hiển thị cho từng thư mục
    return Object.values(foldersMap)
      .map((f) => {
        const uniqueCusts = new Set(f.invoices.map((i) => i.customer.id));
        const totalKB = f.totalBytes / 1024;
        const totalSizeLabel = totalKB >= 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${totalKB.toFixed(0)} KB`;
        return {
          ...f,
          customerCount: uniqueCusts.size,
          suppliersListStr: Array.from(f.suppliers).join(', '),
          totalSizeLabel: f.totalFiles > 0 ? totalSizeLabel : '0 KB'
        };
      })
      .filter((f) => {
        // Nếu bật lọc "Chỉ hiện thư mục có hóa đơn", ẩn các tháng trống
        if (onlyWithInvoices && f.totalFiles === 0) return false;
        return true;
      })
      .sort((a, b) => {
        // Sắp xếp thư mục: Tháng gần nhất hiển thị lên đầu
        return b.monthKey.localeCompare(a.monthKey);
      });
  }, [filteredInvoices, selectedYear, onlyWithInvoices]);

  // Khi tìm kiếm từ khóa, tự động mở tất cả các thư mục có kết quả
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const newOpen: Record<string, boolean> = {};
      monthlyFolders.forEach((f) => {
        if (f.invoices.length > 0) {
          newOpen[f.monthKey] = true;
        }
      });
      setOpenFolderKeys(newOpen);
    }
  }, [searchQuery, monthlyFolders]);

  // Toggle mở/đóng 1 thư mục tháng
  const toggleFolder = (monthKey: string) => {
    setOpenFolderKeys((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Mở tất cả thư mục
  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    monthlyFolders.forEach((f) => {
      allOpen[f.monthKey] = true;
    });
    setOpenFolderKeys(allOpen);
  };

  // Thu gọn tất cả thư mục
  const handleCollapseAll = () => {
    setOpenFolderKeys({});
  };

  // Xem trước hóa đơn PDF trong Modal (được bảo vệ quyền canView)
  const handlePreview = (item: SupplierPurchaseInvoice) => {
    if (!canView) {
      showToast('Bạn không có quyền xem hóa đơn mua vào này!', 'error');
      return;
    }
    setPreviewDoc(item.doc);
    setPreviewCustomerId(item.customer.id);
  };

  // Tải 1 hóa đơn PDF về máy (chỉ ai có quyền canDownload mới được tải)
  const handleDownloadInvoice = async (item: SupplierPurchaseInvoice) => {
    if (!canDownload) {
      showToast('Bạn không được phân quyền tải file hóa đơn về máy!', 'warning');
      return;
    }

    try {
      setDownloadingId(item.id);
      showToast(`Đang tải hóa đơn: ${item.doc.name}...`, 'success');

      let fileData: string | undefined = item.doc.fileData;
      if (!fileData) {
        fileData = await resolvePdfFileData(item.customer.id, item.doc);
      }

      if (!fileData) {
        showToast('Không thể tải tệp (Dữ liệu file chưa sẵn sàng)', 'error');
        return;
      }

      const link = document.createElement('a');
      link.href = fileData;
      link.download = item.doc.name.endsWith('.pdf') ? item.doc.name : `${item.doc.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Đã tải xong: ${item.doc.name}`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast('Lỗi khi tải file PDF hóa đơn!', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Tải toàn bộ hóa đơn trong 1 thư mục tháng (chỉ cho phép khi có quyền canDownload)
  const handleDownloadAllInMonth = async (folder: MonthlyFolderGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDownload) {
      showToast('Bạn không có quyền tải hàng loạt hóa đơn về máy!', 'warning');
      return;
    }

    if (folder.invoices.length === 0) {
      showToast('Thư mục này hiện không có hóa đơn nào để tải!', 'warning');
      return;
    }

    setBatchDownloadingMonth(folder.monthKey);
    showToast(`Đang tải toàn bộ ${folder.invoices.length} hóa đơn của ${folder.monthLabel}...`, 'success');

    let count = 0;
    for (const item of folder.invoices) {
      try {
        let fileData: string | undefined = item.doc.fileData;
        if (!fileData) {
          fileData = await resolvePdfFileData(item.customer.id, item.doc);
        }
        if (fileData) {
          const link = document.createElement('a');
          link.href = fileData;
          link.download = item.doc.name.endsWith('.pdf') ? item.doc.name : `${item.doc.name}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          count++;
          // Chờ một chút giữa các lượt tải để trình duyệt không chặn popup
          await new Promise((r) => setTimeout(r, 450));
        }
      } catch (err) {
        console.error('Batch download item error:', err);
      }
    }

    setBatchDownloadingMonth(null);
    showToast(`Đã tải thành công ${count}/${folder.invoices.length} hóa đơn của ${folder.monthLabel}`, 'success');
  };

  // Xuất báo cáo Excel thống kê hóa đơn mua vào theo thư mục tháng
  const handleExportExcel = () => {
    try {
      const summaryFormatted = monthlyFolders.map((f) => ({
        monthKey: f.monthKey,
        monthLabel: f.monthLabel,
        invoiceCount: f.totalFiles,
        suppliersListStr: f.suppliersListStr,
        customerCount: f.customerCount,
        totalSizeLabel: f.totalSizeLabel
      }));

      const detailsFormatted = filteredInvoices.map((inv) => ({
        monthLabel: inv.monthLabel,
        supplierName: inv.supplierCode ? `${inv.supplierCode} - ${inv.supplierName}` : inv.supplierName,
        customerCode: inv.customer.customerCode,
        customerName: inv.customer.customerName,
        phoneNumber: inv.customer.phoneNumber || '',
        address: inv.customer.address || '',
        fileName: inv.doc.name,
        fileSize: inv.fileSizeStr,
        uploadedAt: inv.invoiceDateFormatted
      }));

      exportDocumentStatsToExcel(summaryFormatted, detailsFormatted);
      showToast('Đã xuất báo cáo Excel Hóa Đơn Mua Vào thành công!', 'success');
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Lỗi khi xuất tệp Excel', 'error');
    }
  };


  // MÀN HÌNH BẢO VỆ PHÂN QUYỀN: NẾU KHÔNG CÓ QUYỀN XEM HÓA ĐƠN
  if (!canView) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-2xs space-y-4 my-6">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800">Quyền Hạn Bị Giới Hạn</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Thư mục và hồ sơ <strong>Hóa Đơn Mua Vào Từ Nhà Cung Cấp</strong> là khu vực chứng từ tài chính kế toán bảo mật cao của công ty.
          </p>
        </div>
        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-left text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Yêu cầu quyền hạn truy cập:</span>
          </div>
          <p className="text-[11.5px] text-amber-800 pl-5.5 leading-relaxed">
            Tài khoản của bạn cần được phân quyền <strong>&quot;Xem & thống kê Hóa đơn mua vào NCC&quot;</strong> (<code>customer_pdf_view</code>) để mở các thư mục và xem hóa đơn.
          </p>
        </div>
        <p className="text-[11px] text-slate-400">
          Vui lòng liên hệ Quản Trị Viên (Admin) để kích hoạt quyền trong menu Quản Trị Người Dùng & Phân Quyền.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Toast Thông báo */}
      {toastMsg && (
        <div className={`fixed bottom-4 right-4 z-60 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-500' 
            : toastMsg.type === 'error' 
            ? 'bg-rose-600 text-white border-rose-500' 
            : 'bg-amber-600 text-white border-amber-500'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Banner: Thư mục hóa đơn mua vào theo từng tháng */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-amber-500" />
              <span>Thư Mục Hóa Đơn Mua Vào Từ Nhà Cung Cấp Theo Từng Tháng</span>
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
              Chỉ Hóa Đơn Mua Vào
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mỗi tháng là 1 thư mục riêng biệt • Tổng hợp toàn bộ hóa đơn mua thiết bị từ nhà cung cấp • Bảo mật phân quyền
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasPermission('reports_export_excel') && (
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Báo Cáo Excel</span>
            </button>
          )}
        </div>
      </div>


      {/* Thanh Điều Khiển: Bộ lọc, Tìm kiếm & Quản lý thư mục */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Ô tìm kiếm thông minh */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên file HĐ, nhà cung cấp (HOÀNG GIA...), mã KH, chủ đầu tư..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Lọc Năm */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-semibold">Năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700"
            >
              <option value="ALL">Tất Cả Các Năm</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>Năm {yr}</option>
              ))}
            </select>
          </div>

          {/* Lọc Nhà Cung Cấp */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-semibold">Nhà Cung Cấp:</span>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 max-w-[200px] truncate"
            >
              <option value="ALL">Tất Cả Nhà Cung Cấp ({activeSuppliersList.length})</option>
              {activeSuppliersList.map((sup) => (
                <option key={sup.name} value={sup.name}>{sup.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Thanh công cụ thao tác thư mục nhanh */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Maximize2 className="w-3 h-3 text-slate-500" />
              <span>Mở tất cả thư mục</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Minimize2 className="w-3 h-3 text-slate-500" />
              <span>Thu gọn tất cả</span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer select-none ml-2 text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={onlyWithInvoices}
                onChange={(e) => setOnlyWithInvoices(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <span>Chỉ hiện thư mục có hóa đơn ({monthlyFolders.filter(f => f.totalFiles > 0).length})</span>
            </label>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dạng Thẻ HĐ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-0.5 rounded font-bold transition ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dạng Bảng
            </button>
          </div>
        </div>
      </div>

      {/* DANH SÁCH CÁC THƯ MỤC THÁNG (Mỗi tháng là 1 thư mục) */}
      <div className="space-y-3">
        {monthlyFolders.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
            <Folder className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy thư mục nào phù hợp</h4>
            <p className="text-xs text-slate-400">
              Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn năm/nhà cung cấp khác
            </p>
          </div>
        ) : (
          monthlyFolders.map((folder) => {
            const isOpen = !!openFolderKeys[folder.monthKey];
            const hasInvoices = folder.invoices.length > 0;
            const isBatchDownloading = batchDownloadingMonth === folder.monthKey;

            return (
              <div 
                key={folder.monthKey} 
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                  isOpen 
                    ? 'border-amber-300 ring-1 ring-amber-200/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* TIÊU ĐỀ THƯ MỤC THÁNG (FOLDER HEADER) */}
                <div 
                  onClick={() => toggleFolder(folder.monthKey)}
                  className={`px-4 py-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition select-none ${
                    isOpen 
                      ? 'bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-white border-b border-amber-200' 
                      : 'bg-slate-50/70 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-black/5 transition shrink-0"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-amber-700" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                        isOpen 
                          ? 'bg-amber-500 text-white shadow-amber-200' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isOpen ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-800">
                            Thư Mục: {folder.monthLabel}
                          </h4>
                          <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border ${
                            hasInvoices 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                              : 'bg-slate-100 text-slate-400 border-slate-200'
                          }`}>
                            {folder.totalFiles} Hóa đơn mua vào
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                          {hasInvoices ? (
                            <>
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <Building2 className="w-3 h-3 text-emerald-600" />
                                <span>NCC: {folder.suppliersListStr || 'Nhiều NCC'}</span>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{folder.customerCount} Trạm công trình</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-600 font-semibold">{folder.totalSizeLabel}</span>
                            </>
                          ) : (
                            <span className="italic text-slate-400">Thư mục trống (Chưa có hóa đơn phát sinh trong tháng)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hành động nhanh trên thanh tiêu đề thư mục */}
                  <div className="flex items-center gap-2 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Tải toàn bộ hóa đơn của tháng */}
                    {hasInvoices && canDownload && (
                      <button
                        type="button"
                        disabled={isBatchDownloading}
                        onClick={(e) => handleDownloadAllInMonth(folder, e)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                        title="Tải toàn bộ các file hóa đơn trong thư mục tháng này về máy"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px]">
                          {isBatchDownloading ? 'Đang tải...' : 'Tải Cả Thư Mục'}
                        </span>
                      </button>
                    )}

                    {hasInvoices && !canDownload && (
                      <span 
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10.5px] font-semibold flex items-center gap-1 border border-slate-200 cursor-not-allowed select-none"
                        title="Bạn không có quyền tải file hóa đơn về máy (cần quyền customer_pdf_download)"
                      >
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Khóa Tải</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.monthKey)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-amber-800 rounded bg-white/70 hover:bg-white border border-slate-200 transition"
                    >
                      {isOpen ? 'Thu gọn' : 'Mở xem'}
                    </button>
                  </div>
                </div>

                {/* NỘI DUNG BÊN TRONG THƯ MỤC THÁNG (CÁC HÓA ĐƠN MUA VÀO) */}
                {isOpen && (
                  <div className="p-4 bg-white space-y-3 animate-in fade-in duration-150">
                    {!hasInvoices ? (
                      <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                        Thư mục {folder.monthLabel} hiện chưa có hóa đơn mua vào từ nhà cung cấp nào.
                      </div>
                    ) : viewMode === 'cards' ? (
                      /* HIỂN THỊ DẠNG THẺ HÓA ĐƠN */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {folder.invoices.map((inv) => (
                          <div 
                            key={inv.id}
                            className="bg-slate-50/80 hover:bg-amber-50/30 border border-slate-200 hover:border-amber-300 rounded-xl p-3.5 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between gap-3 group"
                          >
                            <div>
                              {/* Top row: PDF badge & Supplier */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider">
                                    PDF HĐ
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500 font-semibold">
                                    {inv.fileSizeStr}
                                  </span>
                                </div>

                                <div className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold flex items-center gap-1 truncate max-w-[170px]" title={`Nhà Cung Cấp: ${inv.supplierName}`}>
                                  <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{inv.supplierName}</span>
                                </div>
                              </div>

                              {/* Tên File Hóa Đơn */}
                              <div 
                                onClick={() => handlePreview(inv)}
                                className="font-bold text-slate-800 text-xs mt-2 line-clamp-2 group-hover:text-amber-800 cursor-pointer transition leading-snug"
                                title="Bấm để xem tệp hóa đơn PDF này"
                              >
                                {inv.doc.name}
                              </div>

                              {/* Thông tin Khách hàng / Công trình mua thiết bị */}
                              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 flex items-center gap-1 truncate">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{inv.customer.customerName}</span>
                                  </span>
                                  <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded font-bold shrink-0">
                                    {inv.customer.customerCode}
                                  </span>
                                </div>

                                {inv.customer.address && (
                                  <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate" title={inv.customer.address}>
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{inv.customer.address}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>Ngày HĐ: {inv.invoiceDateFormatted}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Nút Xem và Tải Hóa Đơn */}
                            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                              {/* Nút Xem Hóa Đơn (Quyền customer_pdf_view) */}
                              <button
                                type="button"
                                onClick={() => handlePreview(inv)}
                                className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                                title="Mở xem trước tệp hóa đơn PDF"
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Xem Hóa Đơn</span>
                              </button>

                              {/* Nút Tải Hóa Đơn (Quyền customer_pdf_download) */}
                              {canDownload ? (
                                <button
                                  type="button"
                                  disabled={downloadingId === inv.id}
                                  onClick={() => handleDownloadInvoice(inv)}
                                  className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                                  title="Tải hóa đơn này về máy"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>{downloadingId === inv.id ? '...' : 'Tải'}</span>
                                </button>
                              ) : (
                                <span
                                  className="py-1.5 px-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 cursor-not-allowed select-none border border-slate-200"
                                  title="Bạn không có quyền tải file này (cần quyền customer_pdf_download)"
                                >
                                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-[10px]">Khóa</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* HIỂN THỊ DẠNG BẢNG CHI TIẾT */
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-extrabold text-[11px] border-b border-slate-200">
                              <th className="py-2.5 px-3 text-center w-12">STT</th>
                              <th className="py-2.5 px-3">Tên File Hóa Đơn (.PDF)</th>
                              <th className="py-2.5 px-3">Nhà Cung Cấp Xuất HĐ</th>
                              <th className="py-2.5 px-3">Khách Hàng / Công Trình</th>
                              <th className="py-2.5 px-3 text-center">Dung Lượng</th>
                              <th className="py-2.5 px-3 text-center">Ngày Hóa Đơn</th>
                              <th className="py-2.5 px-3 text-center w-28">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {folder.invoices.map((inv, idx) => (
                              <tr key={inv.id} className="hover:bg-amber-50/30 transition">
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-3 font-bold text-slate-800">
                                  <div 
                                    onClick={() => handlePreview(inv)}
                                    className="cursor-pointer hover:text-amber-800 flex items-center gap-1.5"
                                    title="Xem tệp PDF này"
                                  >
                                    <span className="px-1 py-0.2 rounded text-[8.5px] font-black bg-rose-600 text-white uppercase">
                                      PDF
                                    </span>
                                    <span className="truncate max-w-xs">{inv.doc.name}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10.5px]">
                                    {inv.supplierName}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-700">
                                  <div className="font-semibold text-slate-800">
                                    {inv.customer.customerName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {inv.customer.customerCode} • {inv.customer.phoneNumber || 'Không có SĐT'}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-[10.5px] text-slate-500">
                                  {inv.fileSizeStr}
                                </td>
                                <td className="py-2 px-3 text-center text-slate-600 text-[11px] whitespace-nowrap">
                                  {inv.invoiceDateFormatted}
                                </td>
                                <td className="py-2 px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handlePreview(inv)}
                                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                                      title="Xem trước hóa đơn"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span className="text-[10px]">Xem</span>
                                    </button>

                                    {canDownload ? (
                                      <button
                                        type="button"
                                        disabled={downloadingId === inv.id}
                                        onClick={() => handleDownloadInvoice(inv)}
                                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                                        title="Tải hóa đơn này về máy"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        <span className="text-[10px]">
                                          {downloadingId === inv.id ? '...' : 'Tải'}
                                        </span>
                                      </button>
                                    ) : (
                                      <span
                                        className="p-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs flex items-center gap-0.5 cursor-not-allowed select-none"
                                        title="Bạn không có quyền tải file"
                                      >
                                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                                        <span className="text-[10px]">Khóa</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL XEM TRƯỚC TỆP PDF (Kiểm soát quyền tải canDownload) */}
      <PdfViewerModal
        doc={previewDoc}
        customerId={previewCustomerId}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewCustomerId(undefined);
        }}
        canDownload={canDownload}
      />
    </div>
  );
};
