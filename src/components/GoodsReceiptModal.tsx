import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Printer, 
  PackageCheck, 
  Building2, 
  Calendar, 
  FileText, 
  Boxes, 
  AlertCircle,
  HelpCircle,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { GoodsReceiptNote, GoodsReceiptItem, InventoryItem } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { numberToWordsVN } from '../utils/numberToWordsVN';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavedAndPrint?: (receipt: GoodsReceiptNote) => void;
  preselectedItem?: InventoryItem | null;
}

interface FormReceiptItem {
  key: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category?: any;
  brand?: string;
  unit: string;
  docQuantity: number;
  actualQuantity: number;
  unitPrice: number;
  totalAmount: number;
  notes: string;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  onClose,
  onSavedAndPrint,
  preselectedItem
}) => {
  const { 
    inventory, 
    suppliers, 
    generateNextReceiptCode, 
    recordGoodsReceipt 
  } = useData();
  const { currentUser } = useAuth();

  // Receipt meta states
  const [receiptCode, setReceiptCode] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierTaxCode, setSupplierTaxCode] = useState('');
  const [delivererName, setDelivererName] = useState('');
  const [warehouseName, setWarehouseName] = useState('Kho chính 3TGE (Tân Phú, TP. HCM)');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [reason, setReason] = useState('Nhập hàng mua mới từ nhà cung cấp bổ sung tồn kho');
  const [generalNotes, setGeneralNotes] = useState('');

  // Multi-item rows list
  const [items, setItems] = useState<FormReceiptItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      const nextCode = generateNextReceiptCode();
      setReceiptCode(nextCode);
      setDate(new Date().toISOString().split('T')[0]);
      setDelivererName('');
      setInvoiceNumber('');
      setGeneralNotes('');
      setErrorMessage('');

      if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
        setSupplierName(suppliers[0].name);
        setSupplierPhone(suppliers[0].phone || '');
        setSupplierAddress(suppliers[0].address || '');
        setSupplierTaxCode(suppliers[0].taxCode || '');
      }

      // Initialize items
      if (preselectedItem) {
        setItems([
          {
            key: `row_${Date.now()}_1`,
            itemId: preselectedItem.id,
            itemCode: preselectedItem.code,
            itemName: preselectedItem.name,
            category: preselectedItem.category,
            brand: preselectedItem.brand,
            unit: preselectedItem.unit,
            docQuantity: 1,
            actualQuantity: 1,
            unitPrice: preselectedItem.unitPrice || 0,
            totalAmount: (preselectedItem.unitPrice || 0) * 1,
            notes: ''
          }
        ]);
      } else if (inventory.length > 0) {
        const first = inventory[0];
        setItems([
          {
            key: `row_${Date.now()}_1`,
            itemId: first.id,
            itemCode: first.code,
            itemName: first.name,
            category: first.category,
            brand: first.brand,
            unit: first.unit,
            docQuantity: 1,
            actualQuantity: 1,
            unitPrice: first.unitPrice || 0,
            totalAmount: (first.unitPrice || 0) * 1,
            notes: ''
          }
        ]);
      } else {
        setItems([]);
      }
    }
  }, [isOpen, preselectedItem, suppliers, inventory]);

  // Handle supplier change
  const handleSupplierSelect = (supId: string) => {
    setSelectedSupplierId(supId);
    if (supId === 'OTHER') {
      setSupplierName('');
      setSupplierPhone('');
      setSupplierAddress('');
      setSupplierTaxCode('');
      return;
    }
    const found = suppliers.find(s => s.id === supId);
    if (found) {
      setSupplierName(found.name);
      setSupplierPhone(found.phone || '');
      setSupplierAddress(found.address || '');
      setSupplierTaxCode(found.taxCode || '');
    }
  };

  // Add new item row to the receipt
  const handleAddRow = () => {
    const defaultItem = inventory.find(i => !items.some(row => row.itemId === i.id)) || inventory[0];
    if (!defaultItem) return;

    const newRow: FormReceiptItem = {
      key: `row_${Date.now()}_${Math.random()}`,
      itemId: defaultItem.id,
      itemCode: defaultItem.code,
      itemName: defaultItem.name,
      category: defaultItem.category,
      brand: defaultItem.brand,
      unit: defaultItem.unit,
      docQuantity: 1,
      actualQuantity: 1,
      unitPrice: defaultItem.unitPrice || 0,
      totalAmount: (defaultItem.unitPrice || 0) * 1,
      notes: ''
    };

    setItems(prev => [...prev, newRow]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('Phiếu nhập kho phải có ít nhất 1 mặt hàng!');
      return;
    }
    setErrorMessage('');
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update item selection on a specific row
  const handleItemSelectChange = (index: number, selectedId: string) => {
    const it = inventory.find(i => i.id === selectedId);
    if (!it) return;

    setItems(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const price = it.unitPrice || 0;
      return {
        ...row,
        itemId: it.id,
        itemCode: it.code,
        itemName: it.name,
        category: it.category,
        brand: it.brand,
        unit: it.unit,
        unitPrice: price,
        totalAmount: price * row.actualQuantity
      };
    }));
  };

  // Update row quantities, price, notes
  const handleRowChange = (index: number, field: keyof FormReceiptItem, value: any) => {
    setItems(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      const updated = { ...row, [field]: value };
      
      // Auto recalculate total amount
      if (field === 'actualQuantity' || field === 'unitPrice') {
        const qty = field === 'actualQuantity' ? Math.max(0, Number(value) || 0) : row.actualQuantity;
        const price = field === 'unitPrice' ? Math.max(0, Number(value) || 0) : row.unitPrice;
        updated.totalAmount = qty * price;
      }
      return updated;
    }));
  };

  // Calculations
  const totalQuantity = useMemo(() => {
    return items.reduce((acc, row) => acc + (Number(row.actualQuantity) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, row) => acc + (Number(row.totalAmount) || 0), 0);
  }, [items]);

  // Submit Handler
  const handleSubmit = async (andPrint: boolean = false) => {
    if (!supplierName.trim()) {
      setErrorMessage('Vui lòng chọn hoặc nhập tên nhà cung cấp!');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Phiếu nhập kho cần có ít nhất 1 mặt hàng!');
      return;
    }

    // Check quantities
    for (const row of items) {
      if (!row.actualQuantity || row.actualQuantity <= 0) {
        setErrorMessage(`Số lượng thực nhập của mặt hàng [${row.itemCode} - ${row.itemName}] phải lớn hơn 0!`);
        return;
      }
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const receiptItems: GoodsReceiptItem[] = items.map(it => ({
        itemId: it.itemId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        category: it.category,
        brand: it.brand,
        unit: it.unit,
        docQuantity: Number(it.docQuantity) || Number(it.actualQuantity),
        actualQuantity: Number(it.actualQuantity),
        unitPrice: Number(it.unitPrice),
        totalAmount: Number(it.totalAmount),
        notes: it.notes
      }));

      const saved = await recordGoodsReceipt({
        customReceiptCode: receiptCode.trim().toUpperCase(),
        date,
        supplierId: selectedSupplierId === 'OTHER' ? undefined : selectedSupplierId,
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim(),
        supplierAddress: supplierAddress.trim(),
        supplierTaxCode: supplierTaxCode.trim(),
        delivererName: delivererName.trim() || 'Đại diện nhà cung cấp',
        warehouseName: warehouseName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        reason: reason.trim(),
        items: receiptItems,
        totalQuantity,
        totalAmount,
        notes: generalNotes.trim(),
        createdBy: currentUser?.fullName || 'Thủ kho 3TGE'
      });

      setIsSubmitting(false);
      onClose();

      if (andPrint && onSavedAndPrint) {
        onSavedAndPrint(saved);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Lỗi khi lưu phiếu nhập kho');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center border border-white/20">
              <PackageCheck className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white tracking-tight">
                  Lập Phiếu Nhập Kho Đa Mặt Hàng
                </h3>
                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Mẫu 01 - VT
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Cho phép nhập nhiều danh mục thiết bị cùng lúc vào kho &bull; Tự động tăng tồn kho &bull; Hỗ trợ in biểu mẫu chuẩn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Thông tin chung phiếu nhập */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>1. Thông Tin Chung Của Phiếu Nhập Kho</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Mã phiếu */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Phiếu Nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-700 focus:outline-emerald-500 text-xs"
                  placeholder="PN0001"
                  required
                />
              </div>

              {/* Ngày nhập */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày Nhập Kho <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-emerald-500 text-xs"
                  required
                />
              </div>

              {/* Nhà cung cấp */}
              <div className="lg:col-span-2">
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nhà Cung Cấp / Đối Tác Cung Ứng <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Chọn từ danh mục NCC</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-emerald-500 text-xs"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name}
                      </option>
                    ))}
                    <option value="OTHER">-- Nhà cung cấp khác / Nhập tay --</option>
                  </select>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Tên công ty / Đơn vị cung cấp..."
                    className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-emerald-500 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Sub row: SĐT, Người giao, Hóa đơn, Kho nhập */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">SĐT & MST Nhà Cung Cấp</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="SĐT liên hệ"
                    className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={supplierTaxCode}
                    onChange={(e) => setSupplierTaxCode(e.target.value)}
                    placeholder="Mã số thuế"
                    className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Họ Tên Người Giao Hàng</label>
                <input
                  type="text"
                  value={delivererName}
                  onChange={(e) => setDelivererName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Tài (Tài xế giao hàng)"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Hóa Đơn / Chứng Từ Gốc Kèm Theo</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="HĐ số 0041289 / BBGN số..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Nhập Tại Kho Hàng</label>
                <select
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 text-xs"
                >
                  <option value="Kho chính 3TGE (Tân Phú, TP. HCM)">Kho chính 3TGE (Tân Phú, TP. HCM)</option>
                  <option value="Kho A - Thiết Bị Inverter & Pin Lưu Trữ">Kho A - Inverter & Pin Lưu Trữ</option>
                  <option value="Kho B - Bãi Tấm Pin & Dàn Khung Nhôm">Kho B - Tấm Pin & Dàn Khung</option>
                  <option value="Kho C - Phụ Kiện & Cáp Điện DC">Kho C - Phụ Kiện & Cáp DC</option>
                </select>
              </div>
            </div>

            {/* Địa chỉ & Lý do */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Địa Chỉ Nhà Cung Cấp</label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="Địa chỉ xuất hóa đơn của nhà cung cấp..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Lý Do Nhập Kho</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Nhập vật tư phục vụ dự án công trình..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bảng chi tiết nhiều mặt hàng */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-2 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>2. Danh Sách Các Mặt Hàng Nhập Kho ({items.length} mặt hàng)</span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mặt Hàng Vào Phiếu</span>
              </button>
            </div>

            {/* Multi-item Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-2 px-2 w-8 text-center">STT</th>
                    <th className="py-2 px-2 min-w-[220px]">Chọn Thiết Bị / Vật Tư</th>
                    <th className="py-2 px-2 text-center w-16">ĐVT</th>
                    <th className="py-2 px-2 text-center w-20">SL Chứng Từ</th>
                    <th className="py-2 px-2 text-center w-20">SL Thực Nhập</th>
                    <th className="py-2 px-2 text-right w-28">Đơn Giá Nhập (đ)</th>
                    <th className="py-2 px-2 text-right w-32">Thành Tiền (đ)</th>
                    <th className="py-2 px-2 min-w-[120px]">Ghi Chú Dòng</th>
                    <th className="py-2 px-1 text-center w-10">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row, idx) => (
                    <tr key={row.key} className="hover:bg-slate-50/70">
                      <td className="py-2 px-2 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Item Selector */}
                      <td className="py-2 px-2">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemSelectChange(idx, e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-semibold text-slate-900 text-xs focus:outline-emerald-500"
                        >
                          {inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              [{inv.code}] {inv.name} (Tồn: {inv.stockQuantity} {inv.unit})
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Mã: <span className="font-bold text-emerald-700">{row.itemCode}</span> &bull; Hãng: {row.brand || 'N/A'}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2 px-2 text-center font-bold text-slate-700 whitespace-nowrap">
                        {row.unit}
                      </td>

                      {/* SL Chứng từ */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={row.docQuantity}
                          onChange={(e) => handleRowChange(idx, 'docQuantity', parseInt(e.target.value) || 0)}
                          className="w-16 px-1.5 py-1 text-center bg-white border border-slate-200 rounded font-mono text-slate-700 text-xs"
                        />
                      </td>

                      {/* SL Thực nhập */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={row.actualQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            handleRowChange(idx, 'actualQuantity', val);
                          }}
                          className="w-16 px-1.5 py-1 text-center bg-white border border-emerald-300 rounded font-mono font-black text-emerald-800 text-xs shadow-2xs focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </td>

                      {/* Đơn giá */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={row.unitPrice}
                          onChange={(e) => handleRowChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24 px-1.5 py-1 text-right bg-white border border-slate-200 rounded font-mono font-bold text-slate-800 text-xs"
                        />
                      </td>

                      {/* Thành tiền */}
                      <td className="py-2 px-2 text-right font-mono font-black text-emerald-800 whitespace-nowrap">
                        {row.totalAmount.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Ghi chú */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => handleRowChange(idx, 'notes', e.target.value)}
                          placeholder="Quy cách, số serial..."
                          className="w-full px-1.5 py-1 bg-white border border-slate-200 rounded text-slate-700 text-[11px]"
                        />
                      </td>

                      {/* Nút xóa */}
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={items.length <= 1}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Xóa mặt hàng này khỏi phiếu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table bottom button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddRow}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm mặt hàng khác</span>
              </button>

              <div className="text-right text-xs text-slate-500">
                Tổng cộng <strong>{items.length}</strong> dòng mặt hàng trong phiếu
              </div>
            </div>
          </div>

          {/* Section 3: Tổng kết & Đọc tiền thành chữ */}
          <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-emerald-950 font-bold flex items-center gap-2">
                <span>Tổng Số Lượng Thực Nhập:</span>
                <span className="font-mono text-base font-black text-emerald-800 px-2 py-0.5 bg-white rounded-md border border-emerald-300">
                  {totalQuantity.toLocaleString()} sản phẩm
                </span>
              </div>
              <div className="text-xs text-slate-700">
                <strong>Số tiền bằng chữ:</strong> <span className="italic text-emerald-900 font-semibold">{numberToWordsVN(totalAmount)}</span>
              </div>
            </div>

            <div className="text-right sm:self-center shrink-0">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider block font-semibold">Tổng Tiền Thanh Toán Phiếu</span>
              <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight">
                {totalAmount.toLocaleString('vi-VN')} <span className="text-sm font-bold text-emerald-700">VNĐ</span>
              </div>
            </div>
          </div>

          {/* Section 4: Ghi chú chung */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Chung Của Phiếu Nhập Kho</label>
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Ghi chú thêm về điều kiện bảo quản, người nhận bàn giao, thời gian giao hàng..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
            />
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Người lập: <strong>{currentUser?.fullName || 'Thủ kho'}</strong> &bull; Tồn kho vật tư sẽ tự động được cộng dồn ngay khi lưu
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Hủy
            </button>

            {/* Lưu & In phiếu ngay */}
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu & In Phiếu Ngay'}</span>
            </button>

            {/* Lưu phiếu nhập kho */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xử lý...' : 'Lưu Phiếu Nhập Kho'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
