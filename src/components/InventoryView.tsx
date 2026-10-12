import React, { useState, useMemo } from 'react';
import { 
  Boxes, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  Search, 
  FileSpreadsheet, 
  PackageCheck, 
  CheckCircle, 
  X, 
  History,
  Printer,
  FileText,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  Receipt,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { InventoryItem, InventoryTransaction, ItemCategory, InventoryType, GoodsReceiptNote } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { exportInventoryToExcel } from '../utils/exportUtils';
import { formatDateVN } from '../utils/dateUtils';
import { GoodsReceiptModal } from './GoodsReceiptModal';
import { GoodsReceiptPrintModal } from './GoodsReceiptPrintModal';

export const InventoryView: React.FC = () => {
  const { 
    inventory, 
    inventoryTransactions, 
    recordInventoryTransaction,
    goodsReceipts,
    deleteGoodsReceipt,
    deleteInventoryItem,
    checkInventoryItemUsage,
    purgeTestInventoryAndReceipts,
    customers,
    suppliers
  } = useData();
  const { currentUser, hasPermission } = useAuth();

  // Active tab: 'stock' (Tồn kho) | 'receipts' (Phiếu nhập kho) | 'history' (Lịch sử giao dịch)
  const [activeTab, setActiveTab] = useState<'stock' | 'receipts' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [receiptSearchQuery, setReceiptSearchQuery] = useState('');

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };


  // --- GOODS RECEIPT MODALS (MULTI-ITEM & PRINTING) ---
  const [isGoodsReceiptModalOpen, setIsGoodsReceiptModalOpen] = useState(false);
  const [preselectedItemForReceipt, setPreselectedItemForReceipt] = useState<InventoryItem | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<GoodsReceiptNote | null>(null);

  const [deletingReceipt, setDeletingReceipt] = useState<GoodsReceiptNote | null>(null);

  // --- XÓA VẬT TƯ TỒN KHO ---
  const [deletingItemTarget, setDeletingItemTarget] = useState<{
    item: InventoryItem;
    usage: { isUsed: boolean; reasons: string[]; details: string[] };
  } | null>(null);

  // --- SINGLE ITEM MODAL FOR EXPORT STOCK (XUẤT KHO) ---
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<InventoryType>('OUT');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transQuantity, setTransQuantity] = useState(1);
  const [transPrice, setTransPrice] = useState(0);
  const [transRef, setTransRef] = useState('');
  const [transNotes, setTransNotes] = useState('');

  // Stock calculations
  const totalStockValue = inventory.reduce((s, i) => s + (i.stockQuantity * i.unitPrice), 0);
  const lowStockCount = inventory.filter(i => i.stockQuantity <= i.minAlertQuantity).length;
  const totalReceiptsAmount = goodsReceipts.reduce((s, r) => s + (r.totalAmount || 0), 0);

  // Filter items in stock tab
  const filteredItems = inventory.filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.location && item.location.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter goods receipts in receipts tab
  const filteredReceipts = useMemo(() => {
    return goodsReceipts.filter(rc => {
      if (!receiptSearchQuery.trim()) return true;
      const q = receiptSearchQuery.toLowerCase().trim();
      return (
        rc.receiptCode.toLowerCase().includes(q) ||
        rc.supplierName.toLowerCase().includes(q) ||
        (rc.delivererName && rc.delivererName.toLowerCase().includes(q)) ||
        (rc.invoiceNumber && rc.invoiceNumber.toLowerCase().includes(q)) ||
        (rc.warehouseName && rc.warehouseName.toLowerCase().includes(q)) ||
        rc.items.some(it => it.itemName.toLowerCase().includes(q) || it.itemCode.toLowerCase().includes(q))
      );
    });
  }, [goodsReceipts, receiptSearchQuery]);

  // Open multi-item Goods Receipt modal
  const handleOpenGoodsReceipt = (item?: InventoryItem) => {
    setPreselectedItemForReceipt(item || null);
    setIsGoodsReceiptModalOpen(true);
  };

  // Open Print Modal for a specific receipt
  const handleOpenPrintReceipt = (receipt: GoodsReceiptNote) => {
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
  };

  // Callback when a receipt is saved and user chose to print immediately
  const handleReceiptSavedAndPrint = (receipt: GoodsReceiptNote) => {
    showToast(`Đã lưu thành công phiếu nhập kho [${receipt.receiptCode}]!`, 'success');
    setSelectedReceiptForPrint(receipt);
    setIsPrintModalOpen(true);
  };

  // Execute delete goods receipt
  const handleConfirmDeleteReceipt = async () => {
    if (!deletingReceipt) return;
    const res = await deleteGoodsReceipt(deletingReceipt.id);
    if (res.success) {
      showToast(`Đã xóa phiếu nhập kho [${deletingReceipt.receiptCode}] và hoàn lại số lượng tồn kho.`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi xóa phiếu nhập kho', 'error');
    }
    setDeletingReceipt(null);
  };

  // --- DELETE INVENTORY ITEM HANDLERS ---
  const handlePromptDeleteItem = (item: InventoryItem) => {
    const usage = checkInventoryItemUsage(item);
    setDeletingItemTarget({
      item,
      usage
    });
  };

  const handleConfirmDeleteItem = async () => {
    if (!deletingItemTarget) return;

    if (deletingItemTarget.usage.isUsed) {
      showToast('Không thể xóa vật tư đã phát sinh giao dịch hoặc đang có tồn kho!', 'error');
      setDeletingItemTarget(null);
      return;
    }

    const res = await deleteInventoryItem(deletingItemTarget.item.id);
    if (res.success) {
      showToast(`Đã xóa thành công vật tư [${deletingItemTarget.item.code}] ${deletingItemTarget.item.name} khỏi hệ thống`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi xóa vật tư', 'error');
    }
    setDeletingItemTarget(null);
  };

  const handleForceDeleteItem = async () => {
    if (!deletingItemTarget) return;
    const res = await deleteInventoryItem(deletingItemTarget.item.id, true);
    if (res.success) {
      showToast(`Đã xóa vật tư [${deletingItemTarget.item.code}] ${deletingItemTarget.item.name}`, 'success');
    } else {
      showToast(res.error || 'Lỗi khi xóa vật tư', 'error');
    }
    setDeletingItemTarget(null);
  };


  // Open Export Modal (Xuất kho)
  const handleOpenExportStock = (item?: InventoryItem) => {
    setTransType('OUT');
    if (item) {
      setSelectedItemId(item.id);
      setTransPrice(item.unitPrice);
    } else if (inventory.length > 0) {
      setSelectedItemId(inventory[0].id);
      setTransPrice(inventory[0].unitPrice);
    }
    setTransQuantity(1);
    setTransRef('');
    setTransNotes('');
    setIsTransModalOpen(true);
  };

  const handleCreateExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === selectedItemId);
    if (!item) return;

    if (transQuantity > item.stockQuantity) {
      showToast(`Số lượng xuất (${transQuantity}) vượt quá số lượng tồn kho hiện tại (${item.stockQuantity})!`, 'error');
      return;
    }

    await recordInventoryTransaction({
      type: 'OUT',
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: Number(transQuantity),
      unitPrice: Number(transPrice) || item.unitPrice,
      totalAmount: (Number(transPrice) || item.unitPrice) * Number(transQuantity),
      customerRef: transRef,
      notes: transNotes,
      createdBy: currentUser?.fullName || 'Thủ kho 3TGE',
      date: new Date().toISOString().split('T')[0]
    });

    showToast(`Đã xuất kho thành công ${transQuantity} ${item.unit} [${item.code}].`, 'success');
    setIsTransModalOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Toast Alert */}
      {toast && (
        <div 
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 transition-all animate-bounce ${
            toast.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Card (Ultra-compact) */}
      <div className="bg-white py-1.5 px-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">Quản Lý Xuất - Nhập - Tồn Kho</h2>
          <span className="hidden md:inline-block text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
            Vật tư Solar & Thiết bị
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {hasPermission('inventory_excel_export') && (
            <button
              type="button"
              onClick={() => exportInventoryToExcel(filteredItems)}
              className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>
          )}

          {/* Button: Lập Phiếu Nhập Kho (Hỗ trợ nhập nhiều mặt hàng + in phiếu) */}
          {hasPermission('inventory_import') && (
            <button
              type="button"
              onClick={() => handleOpenGoodsReceipt()}
              className="px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
              title="Lập phiếu nhập kho nhiều mặt hàng và in phiếu"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Nhập kho (PN)</span>
            </button>
          )}

          {/* Button: Xuất Kho (PX) */}
          {hasPermission('inventory_export') && (
            <button
              type="button"
              onClick={() => handleOpenExportStock()}
              className="px-2.5 py-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Xuất Kho (PX)</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Badges (4 cards - Ultra-compact single row / slim height) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate">Giá Trị Tồn Kho</span>
            <div className="text-sm font-bold text-slate-900 leading-tight truncate">
              {totalStockValue.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-slate-500">đ</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0 ml-1">
            {inventory.length} mục
          </span>
        </div>

        <div className="bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate">Cần Nhập Thêm</span>
            <div className="text-sm font-bold text-amber-600 leading-tight flex items-center gap-1 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{lowStockCount}</span>
              <span className="text-[10px] font-normal text-slate-500">vật tư thiếu</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 shrink-0 ml-1">
            Cảnh báo
          </span>
        </div>

        {/* Goods Receipts KPI Card */}
        <div 
          onClick={() => setActiveTab('receipts')}
          className="bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-500 transition cursor-pointer group flex items-center justify-between"
        >
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate group-hover:text-emerald-700">Phiếu Nhập (PN)</span>
            <div className="text-sm font-bold text-emerald-800 leading-tight flex items-center gap-1 truncate">
              <Receipt className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{goodsReceipts.length}</span>
              <span className="text-[10px] font-normal text-slate-500">phiếu lập</span>
            </div>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200 group-hover:bg-emerald-100 shrink-0 ml-1">
            In &bull; Xem
          </span>
        </div>

        <div className="bg-white py-1 px-2.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block truncate">Lịch Sử Giao Dịch</span>
            <div className="text-sm font-bold text-slate-800 leading-tight flex items-center gap-1 truncate">
              <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{inventoryTransactions.length}</span>
              <span className="text-[10px] font-normal text-slate-500">giao dịch</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0 ml-1">
            Nhật ký
          </span>
        </div>
      </div>

      {/* Switcher Tab (3 Tabs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('stock')}
          className={`pb-1.5 px-2.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'stock' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>1. Bảng Tồn Kho Vật Tư ({filteredItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receipts')}
          className={`pb-1.5 px-2.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'receipts' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>2. Phiếu Nhập Kho (Nhiều Mặt Hàng & In Phiếu)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            {goodsReceipts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-1.5 px-2.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'history' ? 'border-emerald-600 text-emerald-700 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>3. Lịch Sử Giao Dịch Chi Tiết ({inventoryTransactions.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STOCK VIEW (BẢNG TỒN KHO) */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-2">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Tìm mã vật tư, tên thiết bị, hãng, vị trí kho..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-emerald-500"
              />
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 font-semibold text-slate-700 focus:outline-emerald-500"
              >
                <option value="ALL">Tất cả danh mục vật tư</option>
                <option value="INVERTER">Biến tần (Inverter)</option>
                <option value="BATTERY">Pin lưu trữ (Battery)</option>
                <option value="PANEL">Tấm pin PV (Solar Panel)</option>
                <option value="CABLE">Dây cáp DC & AC</option>
                <option value="ACCESSORY">Phụ kiện & Khung</option>
              </select>
            </div>
          </div>

          {/* Table: Compact density */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[9.5px] tracking-wider">
                    <th className="py-1.5 px-2 w-8 text-center">STT</th>
                    <th className="py-1.5 px-2">Mã VT</th>
                    <th className="py-1.5 px-2 min-w-[200px]">Tên Vật Tư Thiết Bị</th>
                    <th className="py-1.5 px-2">Danh Mục & Hãng</th>
                    <th className="py-1.5 px-2 text-center">ĐVT</th>
                    <th className="py-1.5 px-2 text-center">Số Lượng Tồn</th>
                    <th className="py-1.5 px-2 text-center">Tối Thiểu</th>
                    <th className="py-1.5 px-2 text-right">Đơn Giá Tiêu Chuẩn</th>
                    <th className="py-1.5 px-2 text-right">Tổng Giá Trị</th>
                    <th className="py-1.5 px-2 text-center w-28">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="font-semibold text-slate-600 text-xs">Kho hàng chưa có dữ liệu tồn kho</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Toàn bộ dữ liệu mẫu đã được làm sạch. Bấm nút <b>"Nhập kho (PN)"</b> ở góc trên để lập phiếu nhập kho thực tế.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const isLow = item.stockQuantity <= item.minAlertQuantity;
                      return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition border-b border-slate-100">
                        <td className="py-[3px] px-2 text-center text-slate-400 font-medium text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-[3px] px-2 font-mono font-bold text-emerald-700 whitespace-nowrap text-[10.5px]">
                          {item.code}
                        </td>
                        <td className="py-[3px] px-2">
                          <div className="font-bold text-slate-900 leading-tight text-[11px] truncate max-w-[260px]" title={item.name}>
                            {item.name}
                          </div>
                          {item.location && (
                            <div className="text-[9px] text-slate-400 leading-none mt-0.5">{item.location}</div>
                          )}
                        </td>
                        <td className="py-[3px] px-2 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9.5px] font-bold leading-tight">
                            {item.category} &bull; {item.brand}
                          </span>
                        </td>
                        <td className="py-[3px] px-2 text-center text-slate-600 whitespace-nowrap font-medium text-[10.5px]">
                          {item.unit}
                        </td>
                        <td className="py-[3px] px-2 text-center whitespace-nowrap">
                          <span className={`font-mono font-black text-[11px] px-1.5 py-0.2 rounded ${
                            isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {item.stockQuantity}
                          </span>
                        </td>
                        <td className="py-[3px] px-2 text-center text-slate-400 font-mono text-[10px] whitespace-nowrap">
                          {item.minAlertQuantity}
                        </td>
                        <td className="py-[3px] px-2 text-right font-mono font-bold text-slate-800 text-[10.5px] whitespace-nowrap">
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-[3px] px-2 text-right font-mono font-black text-emerald-800 text-[10.5px] whitespace-nowrap">
                          {(item.stockQuantity * item.unitPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-[3px] px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Nút Nhập thêm: Mở modal Nhập kho đa mặt hàng với mặt hàng này */}
                            <button
                              type="button"
                              onClick={() => handleOpenGoodsReceipt(item)}
                              title="Tạo phiếu nhập kho cho vật tư này (có thể thêm các mặt hàng khác)"
                              className="p-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition cursor-pointer"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Xuất kho */}
                            <button
                              type="button"
                              onClick={() => handleOpenExportStock(item)}
                              title="Xuất kho thiết bị"
                              className="p-1 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded transition cursor-pointer"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Xóa vật tư tồn kho */}
                            {hasPermission('catalog_item_manage') && (
                              <button
                                type="button"
                                onClick={() => handlePromptDeleteItem(item)}
                                title="Xóa vật tư này khỏi kho (Chỉ được xóa khi chưa từng phát sinh giao dịch và số lượng tồn bằng 0)"
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GOODS RECEIPTS (PHIẾU NHẬP KHO ĐA MẶT HÀNG & IN BIỂU MẪU) */}
      {/* ========================================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-3">
          {/* Top toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã phiếu PN, tên nhà cung cấp, vật tư..."
                value={receiptSearchQuery}
                onChange={(e) => setReceiptSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-emerald-500"
              />
              {receiptSearchQuery && (
                <button
                  onClick={() => setReceiptSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-500 font-semibold hidden md:inline">
                Tổng cộng: <strong className="text-emerald-800">{totalReceiptsAmount.toLocaleString('vi-VN')} VNĐ</strong> ({filteredReceipts.length} phiếu)
              </span>

              <button
                type="button"
                onClick={() => handleOpenGoodsReceipt()}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Lập Phiếu Nhập Kho Mới</span>
              </button>
            </div>
          </div>

          {/* Receipts Table: Compact density */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[9.5px] tracking-wider">
                    <th className="py-2 px-2 w-8 text-center">STT</th>
                    <th className="py-2 px-2 w-24">Mã Phiếu</th>
                    <th className="py-2 px-2 w-24">Ngày Nhập</th>
                    <th className="py-2 px-2 min-w-[160px]">Nhà Cung Cấp</th>
                    <th className="py-2 px-2 min-w-[260px]">Chi Tiết Mặt Hàng Trong Phiếu</th>
                    <th className="py-2 px-2 text-center w-20">Tổng SL</th>
                    <th className="py-2 px-2 text-right w-28">Tổng Tiền Phiếu</th>
                    <th className="py-2 px-2 w-24">Người Lập</th>
                    <th className="py-2 px-2 text-center w-28">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Receipt className="w-9 h-9 mx-auto text-slate-300 mb-2 stroke-1" />
                        <p className="font-semibold text-slate-600 text-xs">Chưa có phiếu nhập kho nào</p>
                        <p className="text-[11px] text-slate-400 mt-1">Bấm "Lập Phiếu Nhập Kho Mới" để tạo phiếu nhập nhiều mặt hàng và in phiếu</p>
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((rc, idx) => (
                      <tr key={rc.id} className="hover:bg-slate-50/80 transition border-b border-slate-100">
                        <td className="py-[3px] px-2 text-center text-slate-400 font-medium text-[10px]">
                          {idx + 1}
                        </td>

                        {/* Mã phiếu */}
                        <td className="py-[3px] px-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenPrintReceipt(rc)}
                            className="font-mono font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer flex items-center gap-1"
                            title="Bấm để xem và in phiếu này"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{rc.receiptCode}</span>
                          </button>
                        </td>

                        {/* Ngày nhập */}
                        <td className="py-[3px] px-2 whitespace-nowrap font-medium text-slate-800 text-[10.5px]">
                          {formatDateVN(rc.date)}
                        </td>

                        {/* Nhà cung cấp */}
                        <td className="py-[3px] px-2">
                          <div className="font-bold text-slate-900 leading-tight text-[11px] truncate max-w-[180px]" title={rc.supplierName}>
                            {rc.supplierName}
                          </div>
                          {rc.invoiceNumber && (
                            <div className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">
                              HĐ: {rc.invoiceNumber}
                            </div>
                          )}
                        </td>

                        {/* Danh sách mặt hàng */}
                        <td className="py-[3px] px-2">
                          <div className="flex flex-wrap gap-1 leading-tight max-w-md">
                            {rc.items.map((it, itIdx) => (
                              <span 
                                key={it.itemId || itIdx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[9.5px] font-medium"
                                title={`Đơn giá: ${it.unitPrice.toLocaleString('vi-VN')} đ | Thành tiền: ${it.totalAmount.toLocaleString('vi-VN')} đ`}
                              >
                                <strong className="font-mono text-emerald-800 font-bold">{it.actualQuantity}x</strong>
                                <span className="truncate max-w-[150px]">{it.itemName}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Tổng SL */}
                        <td className="py-[3px] px-2 text-center whitespace-nowrap">
                          <span className="font-mono font-black text-slate-900 text-[11px] px-1.5 py-0.2 rounded bg-slate-50 border border-slate-200">
                            {rc.totalQuantity}
                          </span>
                        </td>

                        {/* Tổng tiền phiếu */}
                        <td className="py-[3px] px-2 text-right font-mono font-black text-emerald-800 text-[11px] whitespace-nowrap">
                          {rc.totalAmount.toLocaleString('vi-VN')} đ
                        </td>

                        {/* Người lập */}
                        <td className="py-[3px] px-2 text-slate-600 text-[10.5px] truncate max-w-[110px]" title={rc.createdBy}>
                          {rc.createdBy}
                        </td>

                        {/* Thao tác: In phiếu + Xóa */}
                        <td className="py-[3px] px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Nút In phiếu */}
                            <button
                              type="button"
                              onClick={() => handleOpenPrintReceipt(rc)}
                              className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-[10.5px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="In phiếu nhập kho theo mẫu chuẩn Bộ Tài chính"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In Phiếu</span>
                            </button>

                            {/* Nút Xóa phiếu */}
                            <button
                              type="button"
                              onClick={() => setDeletingReceipt(rc)}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Xóa phiếu nhập kho này (hệ thống sẽ tự động trừ lại số lượng tồn kho)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRANSACTIONS HISTORY (LỊCH SỬ GIAO DỊCH CHI TIẾT) */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[9.5px] tracking-wider">
                  <th className="py-2 px-2.5 w-8 text-center">STT</th>
                  <th className="py-2 px-2.5">Mã Giao Dịch</th>
                  <th className="py-2 px-2.5">Ngày</th>
                  <th className="py-2 px-2.5">Loại Phiếu</th>
                  <th className="py-2 px-2.5 min-w-[200px]">Vật Tư Thiết Bị</th>
                  <th className="py-2 px-2.5 text-center">Số Lượng</th>
                  <th className="py-2 px-2.5 text-right">Đơn Giá</th>
                  <th className="py-2 px-2.5 text-right">Thành Tiền</th>
                  <th className="py-2 px-2.5">Đối Tác / Khách Hàng</th>
                  <th className="py-2 px-2.5">Người Lập</th>
                  <th className="py-2 px-2.5 text-center w-16">In Phiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inventoryTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400">
                      Chưa có giao dịch xuất nhập nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  inventoryTransactions.map((t, idx) => {
                    const matchedReceipt = goodsReceipts.find(
                      r => r.id === t.receiptId || r.receiptCode === t.transactionCode || r.receiptCode === t.receiptCode
                    );

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                        <td className="py-[3px] px-2.5 text-center text-slate-400 font-medium text-[10px]">
                          {idx + 1}
                        </td>
                        <td className="py-[3px] px-2.5 font-mono font-bold text-slate-800 text-[10.5px]">
                          {t.transactionCode}
                        </td>
                        <td className="py-[3px] px-2.5 text-slate-600 font-medium text-[10.5px]">
                          {formatDateVN(t.date)}
                        </td>
                        <td className="py-[3px] px-2.5 whitespace-nowrap">
                          {t.type === 'IN' ? (
                            <span className="bg-teal-50 text-teal-800 font-bold px-1.5 py-0.2 rounded text-[9.5px] border border-teal-200">
                              ↓ Nhập kho
                            </span>
                          ) : (
                            <span className="bg-orange-50 text-orange-800 font-bold px-1.5 py-0.2 rounded text-[9.5px] border border-orange-200">
                              ↑ Xuất kho
                            </span>
                          )}
                        </td>
                        <td className="py-[3px] px-2.5 font-medium text-slate-900">
                          <div className="font-bold text-[11px] leading-tight">{t.itemName}</div>
                          <span className="text-[9.5px] text-slate-400 font-mono">[{t.itemCode}]</span>
                        </td>
                        <td className="py-[3px] px-2.5 text-center font-mono font-bold text-slate-800">
                          {t.quantity}
                        </td>
                        <td className="py-[3px] px-2.5 text-right font-mono text-slate-700">
                          {t.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-[3px] px-2.5 text-right font-mono font-bold text-emerald-800">
                          {t.totalAmount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-[3px] px-2.5 text-slate-600 truncate max-w-[140px]" title={t.customerRef || t.supplierRef}>
                          {t.customerRef || t.supplierRef || 'Nội bộ'}
                        </td>
                        <td className="py-[3px] px-2.5 text-slate-500 text-[10.5px]">{t.createdBy}</td>
                        <td className="py-[3px] px-2.5 text-center whitespace-nowrap">
                          {t.type === 'IN' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedReceipt) {
                                  handleOpenPrintReceipt(matchedReceipt);
                                } else {
                                  // Synthetic receipt from single transaction
                                  const synthetic: GoodsReceiptNote = {
                                    id: t.id,
                                    receiptCode: t.transactionCode,
                                    date: t.date,
                                    supplierName: t.supplierRef || 'Nhà Cung Cấp Thiết Bị Solar',
                                    delivererName: t.delivererName || 'Đại diện giao hàng',
                                    warehouseName: t.warehouseName || 'Kho chính 3TGE',
                                    invoiceNumber: t.invoiceNumber || '',
                                    items: [
                                      {
                                        itemId: t.itemId,
                                        itemCode: t.itemCode,
                                        itemName: t.itemName,
                                        unit: 'Bộ',
                                        docQuantity: t.quantity,
                                        actualQuantity: t.quantity,
                                        unitPrice: t.unitPrice,
                                        totalAmount: t.totalAmount,
                                        notes: t.notes
                                      }
                                    ],
                                    totalQuantity: t.quantity,
                                    totalAmount: t.totalAmount,
                                    notes: t.notes,
                                    createdBy: t.createdBy,
                                    createdAt: new Date().toISOString()
                                  };
                                  handleOpenPrintReceipt(synthetic);
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="In phiếu nhập kho này"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: LẬP PHIẾU NHẬP KHO ĐA MẶT HÀNG (MULTI-ITEM GOODS RECEIPT) */}
      {/* ========================================================================= */}
      <GoodsReceiptModal
        isOpen={isGoodsReceiptModalOpen}
        onClose={() => setIsGoodsReceiptModalOpen(false)}
        onSavedAndPrint={handleReceiptSavedAndPrint}
        preselectedItem={preselectedItemForReceipt}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: IN PHIẾU NHẬP KHO (PRINT PREVIEW VOUCHER MODAL) */}
      {/* ========================================================================= */}
      <GoodsReceiptPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        receipt={selectedReceiptForPrint}
      />

      {/* ========================================================================= */}
      {/* MODAL 3: XÁC NHẬN XÓA PHIẾU NHẬP KHO */}
      {/* ========================================================================= */}
      {deletingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Phiếu Nhập Kho</h3>
                <p className="text-slate-500 mt-0.5">
                  Thao tác này sẽ tự động trừ lại số lượng tồn kho tương ứng đã nhập!
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã phiếu:</span>
                <span className="font-mono font-bold text-rose-700">{deletingReceipt.receiptCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nhà cung cấp:</span>
                <span className="font-semibold text-slate-800">{deletingReceipt.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng mặt hàng:</span>
                <span className="font-bold text-slate-900">{deletingReceipt.items.length} mặt hàng ({deletingReceipt.totalQuantity} sp)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng tiền phiếu:</span>
                <span className="font-mono font-bold text-emerald-800">{deletingReceipt.totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReceipt(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReceipt}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3B: XÁC NHẬN / RÀNG BUỘC KHI XÓA VẬT TƯ TỒN KHO */}
      {/* ========================================================================= */}
      {deletingItemTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
            {deletingItemTarget.usage.isUsed ? (
              // CASE A: VẬT TƯ ĐANG CÓ TỒN HOẶC ĐÃ PHÁT SINH GIAO DỊCH => CHẶN XÓA
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="text-center mb-5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                    Ràng buộc toàn vẹn tồn kho
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    Không Thể Xóa Vật Tư Này
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Vật tư <strong className="text-slate-800 font-mono font-bold">[{deletingItemTarget.item.code}] {deletingItemTarget.item.name}</strong> đã phát sinh tác vụ nghiệp vụ hoặc đang còn số lượng tồn và <strong className="text-rose-600">không thể xóa</strong> để bảo đảm số liệu kế toán kho.
                  </p>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2.5 mb-5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Lý do không thể xóa:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-rose-800 font-medium">
                    {deletingItemTarget.usage.reasons.map((reason, idx) => (
                      <li key={idx} className="font-semibold">{reason}</li>
                    ))}
                  </ul>

                  {deletingItemTarget.usage.details.length > 0 && (
                    <div className="pt-2 border-t border-rose-200/60 text-[10px] text-rose-700/90 font-mono space-y-1">
                      {deletingItemTarget.usage.details.map((detail, idx) => (
                        <div key={idx} className="truncate">&bull; {detail}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 mb-5 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Gợi ý:</strong> Nếu muốn xuất hết hàng tồn, vui lòng bấm nút <strong>Xuất kho (PX)</strong>. Danh mục chỉ cho phép xóa những mã vật tư mới tạo nhầm chưa từng phát sinh bất kỳ giao dịch nào và có số lượng tồn bằng 0.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeletingItemTarget(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleForceDeleteItem}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Vẫn Xóa Vật Tư Này
                  </button>
                </div>
              </div>
            ) : (
              // CASE B: CHƯA PHÁT SINH TÁC VỤ & TỒN BẰNG 0 => CHO PHÉP XÓA
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="text-center mb-5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Đủ điều kiện xóa an toàn
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    Xác Nhận Xóa Vật Tư Khỏi Kho
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Vật tư này hoàn toàn chưa phát sinh bất kỳ giao dịch nhập/xuất kho nào và số lượng tồn hiện tại là 0.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã vật tư:</span>
                    <span className="font-mono font-bold text-slate-800">{deletingItemTarget.item.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tên vật tư:</span>
                    <span className="font-bold text-slate-900">{deletingItemTarget.item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Danh mục:</span>
                    <span className="font-semibold text-slate-700">{deletingItemTarget.item.category} ({deletingItemTarget.item.brand})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số lượng tồn:</span>
                    <span className="font-mono font-bold text-slate-800">0 {deletingItemTarget.item.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeletingItemTarget(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteItem}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Xác Nhận Xóa Vĩnh Viễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: XUẤT KHO THIẾT BỊ (PX) */}
      {/* ========================================================================= */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lập Phiếu Xuất Kho (PX)
                  </h3>
                  <p className="text-[11px] text-slate-500">Xuất thiết bị cho công trình hoặc bảo dưỡng</p>
                </div>
              </div>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExportSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn Vật Tư Xuất Kho</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const it = inventory.find(i => i.id === e.target.value);
                    if (it) setTransPrice(it.unitPrice);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-semibold text-slate-800"
                  required
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.code}] {item.name} (Tồn: {item.stockQuantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Lượng Xuất</label>
                  <input
                    type="number"
                    min="1"
                    value={transQuantity}
                    onChange={(e) => setTransQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đơn Giá Xuất (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={transPrice}
                    onChange={(e) => setTransPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Khách Hàng / Công Trình Xuất Tới
                </label>
                <input
                  type="text"
                  placeholder="KH000001 - Công ty may Hòa An..."
                  value={transRef}
                  onChange={(e) => setTransRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi Chú Xuất Kho</label>
                <textarea
                  rows={2}
                  placeholder="Lý do xuất, số hợp đồng, biên bản bàn giao..."
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className="px-3.5 py-1.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-xs transition"
                >
                  Xác Nhận Xuất Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
