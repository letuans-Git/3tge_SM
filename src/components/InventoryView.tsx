import React, { useState } from 'react';
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
  History
} from 'lucide-react';
import { InventoryItem, InventoryTransaction, ItemCategory, InventoryType } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { exportInventoryToExcel } from '../utils/exportUtils';
import { formatDateVN } from '../utils/dateUtils';

export const InventoryView: React.FC = () => {
  const { 
    inventory, 
    inventoryTransactions, 
    addInventoryItem, 
    recordInventoryTransaction,
    customers 
  } = useData();
  const { currentUser, hasRole, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal create item
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('INVERTER');
  const [itemBrand, setItemBrand] = useState('HUAWEI');
  const [itemUnit, setItemUnit] = useState('Bộ');
  const [stockQuantity, setStockQuantity] = useState(1);
  const [minAlertQuantity, setMinAlertQuantity] = useState(2);
  const [unitPrice, setUnitPrice] = useState(15000000);
  const [location, setLocation] = useState('Kho A');

  // Modal Stock In/Out Transaction
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transType, setTransType] = useState<InventoryType>('IN');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transQuantity, setTransQuantity] = useState(1);
  const [transPrice, setTransPrice] = useState(0);
  const [transRef, setTransRef] = useState('');
  const [transNotes, setTransNotes] = useState('');

  // Stock calculations
  const totalStockValue = inventory.reduce((s, i) => s + (i.stockQuantity * i.unitPrice), 0);
  const lowStockCount = inventory.filter(i => i.stockQuantity <= i.minAlertQuantity).length;

  // Filter items
  const filteredItems = inventory.filter(item => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenTransaction = (type: InventoryType, item?: InventoryItem) => {
    setTransType(type);
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

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCode.trim()) return;

    await addInventoryItem({
      code: itemCode.trim().toUpperCase(),
      name: itemName.trim(),
      category: itemCategory,
      brand: itemBrand,
      unit: itemUnit,
      stockQuantity,
      minAlertQuantity,
      unitPrice,
      location
    });

    setIsAddItemModalOpen(false);
    setItemCode('');
    setItemName('');
  };

  const handleCreateTransSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find(i => i.id === selectedItemId);
    if (!item) return;

    await recordInventoryTransaction({
      type: transType,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: Number(transQuantity),
      unitPrice: Number(transPrice) || item.unitPrice,
      totalAmount: (Number(transPrice) || item.unitPrice) * Number(transQuantity),
      customerRef: transType === 'OUT' ? transRef : undefined,
      supplierRef: transType === 'IN' ? transRef : undefined,
      notes: transNotes,
      createdBy: currentUser?.fullName || 'Thủ kho 3TGE',
      date: new Date().toISOString().split('T')[0]
    });

    setIsTransModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Quản Lý Xuất - Nhập - Tồn Kho</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Vật tư Solar
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Theo dõi tồn kho Inverter, Pin lưu trữ Lithium, Tấm pin PV, Cáp DC và linh kiện
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('inventory_excel_export') && (
            <button
              onClick={() => exportInventoryToExcel(filteredItems)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Xuất Excel
            </button>
          )}

          {hasPermission('inventory_import') && (
            <button
              onClick={() => handleOpenTransaction('IN')}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Nhập Kho (PN)
            </button>
          )}

          {hasPermission('inventory_export') && (
            <button
              onClick={() => handleOpenTransaction('OUT')}
              className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              Xuất Kho (PX)
            </button>
          )}

          {hasPermission('inventory_item_create') && (
            <button
              onClick={() => {
                setItemCode(`VT-${Date.now().toString().slice(-4)}`);
                setIsAddItemModalOpen(true);
              }}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Thêm Vật Tư Mới
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Tổng Giá Trị Tồn Kho</span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {totalStockValue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">VNĐ</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Mặt Hàng Dưới Định Mức</span>
          <div className="text-xl font-black text-amber-600 mt-1 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {lowStockCount} <span className="text-xs font-medium text-slate-600">vật tư cần nhập thêm</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold block">Giao Dịch Xuất Nhập Gần Đây</span>
          <div className="text-xl font-black text-emerald-700 mt-1 flex items-center gap-1.5">
            <History className="w-5 h-5 text-emerald-600" />
            {inventoryTransactions.length} <span className="text-xs font-medium text-slate-600">phiếu giao dịch</span>
          </div>
        </div>
      </div>

      {/* Switcher Tab */}
      <div className="flex items-center gap-3 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'stock' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Bảng Tồn Kho Vật Tư ({filteredItems.length})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
            activeTab === 'history' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          Lịch Sử Phiếu Xuất - Nhập ({inventoryTransactions.length})
        </button>
      </div>

      {/* TAB 1: STOCK VIEW */}
      {activeTab === 'stock' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã vật tư, tên thiết bị, hãng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-slate-200"
              />
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-200"
              >
                <option value="ALL">Tất cả danh mục</option>
                <option value="INVERTER">Biến tần (Inverter)</option>
                <option value="BATTERY">Pin lưu trữ (Battery)</option>
                <option value="PANEL">Tấm pin (Panel)</option>
                <option value="CABLE">Dây cáp DC & AC</option>
                <option value="ACCESSORY">Phụ kiện & Khung</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px]">
                    <th className="py-2 px-2.5">Mã VT</th>
                    <th className="py-2 px-2.5">Tên Vật Tư Thiết Bị</th>
                    <th className="py-2 px-2.5">Danh Mục & Hãng</th>
                    <th className="py-2 px-2.5">Đơn Vị</th>
                    <th className="py-2 px-2.5">Số Lượng Tồn</th>
                    <th className="py-2 px-2.5">Định Mức Tối Thiểu</th>
                    <th className="py-2 px-2.5">Đơn Giá Dự Kiến</th>
                    <th className="py-2 px-2.5">Tổng Giá Trị</th>
                    <th className="py-2 px-2.5 text-right">Xuất / Nhập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.map(item => {
                    const isLow = item.stockQuantity <= item.minAlertQuantity;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-1.5 px-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold text-slate-900">
                          <div className="leading-tight">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal leading-tight">{item.location}</div>
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                            {item.category} • {item.brand}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">{item.unit}</td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span className={`font-black text-xs px-1.5 py-0.2 rounded ${
                            isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            {item.stockQuantity}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500 font-medium whitespace-nowrap">
                          {item.minAlertQuantity}
                        </td>
                        <td className="py-1.5 px-2.5 font-semibold text-slate-700 whitespace-nowrap">
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-1.5 px-2.5 font-bold text-emerald-800 whitespace-nowrap">
                          {(item.stockQuantity * item.unitPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenTransaction('IN', item)}
                              title="Nhập thêm"
                              className="p-1 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenTransaction('OUT', item)}
                              title="Xuất kho"
                              className="p-1 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: TRANSACTIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px]">
                  <th className="py-3 px-3">Mã Giao Dịch</th>
                  <th className="py-3 px-3">Ngày</th>
                  <th className="py-3 px-3">Loại Phiếu</th>
                  <th className="py-3 px-3">Vật Tư</th>
                  <th className="py-3 px-3">Số Lượng</th>
                  <th className="py-3 px-3">Thành Tiền</th>
                  <th className="py-3 px-3">Đối Tác / Khách Hàng</th>
                  <th className="py-3 px-3">Người Lập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {inventoryTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Chưa có giao dịch xuất nhập nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  inventoryTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {t.transactionCode}
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{formatDateVN(t.date)}</td>
                      <td className="py-3 px-3">
                        {t.type === 'IN' ? (
                          <span className="bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded text-[10px] border border-teal-200">
                            ↓ Nhập kho
                          </span>
                        ) : (
                          <span className="bg-orange-50 text-orange-800 font-bold px-2 py-0.5 rounded text-[10px] border border-orange-200">
                            ↑ Xuất kho
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {t.itemName} <span className="text-[10px] text-slate-400 font-mono">({t.itemCode})</span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {t.quantity}
                      </td>
                      <td className="py-3 px-3 font-semibold text-emerald-800">
                        {t.totalAmount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {t.customerRef || t.supplierRef || 'Nội bộ'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{t.createdBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE TRANSACTION MODAL */}
      {isTransModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-black">
                {transType === 'IN' ? 'Lập Phiếu Nhập Kho (PN)' : 'Lập Phiếu Xuất Kho (PX)'}
              </h3>
              <button onClick={() => setIsTransModalOpen(false)} className="text-slate-600 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-black mb-1">Chọn Vật Tư / Thiết Bị</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const it = inventory.find(i => i.id === e.target.value);
                    if (it) setTransPrice(it.unitPrice);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
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
                  <label className="block font-bold text-black mb-1">Số Lượng</label>
                  <input
                    type="number"
                    min="1"
                    value={transQuantity}
                    onChange={(e) => setTransQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-black mb-1">Đơn Giá (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={transPrice}
                    onChange={(e) => setTransPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">
                  {transType === 'IN' ? 'Nhà Cung Cấp / Nguồn Nhập' : 'Khách Hàng / Công Trình Xuất Tới'}
                </label>
                <input
                  type="text"
                  placeholder={transType === 'IN' ? 'HTPRO189 / Hừng Đông Solar...' : 'KH000001 - Công ty may Hòa An...'}
                  value={transRef}
                  onChange={(e) => setTransRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Ghi Chú</label>
                <textarea
                  rows={2}
                  placeholder="Lý do xuất/nhập, số hóa đơn VAT..."
                  value={transNotes}
                  onChange={(e) => setTransNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransModalOpen(false)}
                  className="px-3.5 py-1.5 text-black font-semibold hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-bold rounded-lg shadow-xs ${
                    transType === 'IN' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  Xác Nhận Lưu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW INVENTORY ITEM MODAL */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-black">Thêm Vật Tư Mới Vào Danh Mục</h3>
              <button onClick={() => setIsAddItemModalOpen(false)} className="text-slate-600 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItemSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">Mã Vật Tư</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono uppercase text-black font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Danh Mục</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                  >
                    <option value="INVERTER">Biến tần (Inverter)</option>
                    <option value="BATTERY">Pin lưu trữ (Battery)</option>
                    <option value="PANEL">Tấm pin (Panel)</option>
                    <option value="CABLE">Dây cáp DC</option>
                    <option value="ACCESSORY">Phu kiện & Khung</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Tên Thiết Bị / Vật Tư</label>
                <input
                  type="text"
                  required
                  placeholder="Inverter Deye 12KW 3 pha..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-black mb-1">Hãng SX</label>
                  <input
                    type="text"
                    value={itemBrand}
                    onChange={(e) => setItemBrand(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Đơn Vị</label>
                  <input
                    type="text"
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-black font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Số Lượng</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-black font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">Đơn Giá Nhập (VNĐ)</label>
                  <input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">Báo Động Tối Thiểu</label>
                  <input
                    type="number"
                    value={minAlertQuantity}
                    onChange={(e) => setMinAlertQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-3.5 py-1.5 text-black font-semibold hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Tạo Vật Tư
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
