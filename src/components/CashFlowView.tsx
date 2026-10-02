import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileSpreadsheet, 
  Search, 
  DollarSign, 
  Calendar, 
  Trash2,
  X,
  CreditCard,
  Banknote
} from 'lucide-react';
import { CashTransaction, CashFlowType, CashFlowCategory } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { exportCashFlowToExcel } from '../utils/exportUtils';
import { formatDateVN } from '../utils/dateUtils';

const THU_CATEGORIES: CashFlowCategory[] = [
  'Thu tiền hợp đồng',
  'Thu phí bảo dưỡng',
  'Thu khác'
];

const CHI_CATEGORIES: CashFlowCategory[] = [
  'Chi nhập thiết bị',
  'Chi lương nhân viên',
  'Chi xăng xe đi lại',
  'Chi bảo hành/sửa chữa',
  'Chi văn phòng & tiếp khách',
  'Chi khác'
];

export const CashFlowView: React.FC = () => {
  const { cashTransactions, addCashTransaction, deleteCashTransaction, customers } = useData();
  const { currentUser, hasRole, hasPermission } = useAuth();

  const [filterType, setFilterType] = useState<'ALL' | 'THU' | 'CHI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<CashFlowType>('THU');
  const [category, setCategory] = useState<string>('Thu tiền hợp đồng');
  const [amount, setAmount] = useState<number>(5000000);
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản'>('Chuyển khoản');
  const [payerReceiver, setPayerReceiver] = useState('');
  const [customerRefCode, setCustomerRefCode] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Statistics
  const totalThu = cashTransactions.filter(t => t.type === 'THU').reduce((s, t) => s + t.amount, 0);
  const totalChi = cashTransactions.filter(t => t.type === 'CHI').reduce((s, t) => s + t.amount, 0);
  const netFund = totalThu - totalChi;

  const filteredTransactions = cashTransactions.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        t.code.toLowerCase().includes(q) ||
        t.payerReceiver.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.customerRefCode && t.customerRefCode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenModal = (openType: CashFlowType) => {
    setType(openType);
    setCategory(openType === 'THU' ? 'Thu tiền hợp đồng' : 'Chi nhập thiết bị');
    setPayerReceiver('');
    setCustomerRefCode('');
    setNotes('');
    setAmount(1000000);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerReceiver.trim() || amount <= 0) return;

    await addCashTransaction({
      type,
      category,
      amount: Number(amount),
      paymentMethod,
      payerReceiver: payerReceiver.trim(),
      customerRefCode: customerRefCode.trim() || undefined,
      notes: notes.trim(),
      createdBy: currentUser?.fullName || 'Kế toán 3TGE',
      date
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Quản Lý Thu - Chi & Quỹ Tiền Mặt</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Sổ quỹ 3TGE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Theo dõi dòng tiền thu hợp đồng solar, chi phí thiết bị, công tác phí và bảo dưỡng
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('cashflow_excel_export') && (
            <button
              onClick={() => exportCashFlowToExcel(filteredTransactions)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Xuất Excel
            </button>
          )}

          {hasPermission('cashflow_receipt_create') && (
            <button
              onClick={() => handleOpenModal('THU')}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Lập Phiếu Thu (PT)
            </button>
          )}

          {hasPermission('cashflow_payment_create') && (
            <button
              onClick={() => handleOpenModal('CHI')}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              Lập Phiếu Chi (PC)
            </button>
          )}
        </div>
      </div>

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Thu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng Thu Nhập</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">
            +{totalThu.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
        </div>

        {/* Total Chi */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng Chi Phí</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-2">
            -{totalChi.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
        </div>

        {/* Net Fund */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tồn Quỹ Thực Tế</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-black mt-2 ${netFund >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
            {netFund.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-500">đ</span>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Tất cả ({cashTransactions.length})
            </button>
            <button
              onClick={() => setFilterType('THU')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterType === 'THU' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              Phiếu thu
            </button>
            <button
              onClick={() => setFilterType('CHI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filterType === 'CHI' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'
              }`}
            >
              Phiếu chi
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, người nộp, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px]">
                <th className="py-2 px-2.5">Mã Phiếu</th>
                <th className="py-2 px-2.5">Ngày</th>
                <th className="py-2 px-2.5">Loại</th>
                <th className="py-2 px-2.5">Khoản Mục</th>
                <th className="py-2 px-2.5">Đối Tượng Nộp / Nhận</th>
                <th className="py-2 px-2.5">Phương Thức</th>
                <th className="py-2 px-2.5">Số Tiền</th>
                <th className="py-2 px-2.5">Người Lập</th>
                {hasRole(['admin']) && <th className="py-2 px-2.5 text-right">Xóa</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    Chưa có giao dịch thu chi phù hợp.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {t.code}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 font-medium whitespace-nowrap">{formatDateVN(t.date)}</td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {t.type === 'THU' ? (
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[10px] border border-emerald-200">
                          + Thu
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-800 font-bold px-1.5 py-0.2 rounded text-[10px] border border-rose-200">
                          - Chi
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                      <div className="leading-tight">{t.category}</div>
                      {t.customerRefCode && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded leading-tight">
                          {t.customerRefCode}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-800 font-medium">
                      <div className="leading-tight">{t.payerReceiver}</div>
                      {t.notes && <div className="text-[10px] text-slate-400 truncate max-w-[200px] leading-tight">{t.notes}</div>}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                        {t.paymentMethod === 'Tiền mặt' ? <Banknote className="w-3 h-3 text-emerald-600" /> : <CreditCard className="w-3 h-3 text-blue-600" />}
                        {t.paymentMethod}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 font-black text-xs whitespace-nowrap">
                      <span className={t.type === 'THU' ? 'text-emerald-700' : 'text-rose-700'}>
                        {t.type === 'THU' ? '+' : '-'}{t.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-500 text-[11px] whitespace-nowrap">{t.createdBy}</td>
                    {hasPermission('cashflow_delete') && (
                      <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (confirm(`Xóa phiếu ${t.code}?`)) deleteCashTransaction(t.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CASH TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-black">
                {type === 'THU' ? 'Lập Phiếu Thu Tiền (PT)' : 'Lập Phiếu Chi Tiền (PC)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-600 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">Loại Phiếu</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const t = e.target.value as CashFlowType;
                      setType(t);
                      setCategory(t === 'THU' ? THU_CATEGORIES[0] : CHI_CATEGORIES[0]);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                  >
                    <option value="THU">Thu Tiền</option>
                    <option value="CHI">Chi Tiền</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-black">Ngày Giao Dịch</label>
                    {date && <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{formatDateVN(date)}</span>}
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Khoản Mục Thu/Chi</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                >
                  {(type === 'THU' ? THU_CATEGORIES : CHI_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">Số Tiền (VNĐ)</label>
                  <input
                    type="number"
                    min="1000"
                    step="50000"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-bold text-black"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-black mb-1">Hình Thức</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                  >
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">
                  {type === 'THU' ? 'Người Nộp Tiền / Khách Hàng' : 'Người Nhận Tiền / Đối Tác'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Họ tên hoặc tên công ty..."
                  value={payerReceiver}
                  onChange={(e) => setPayerReceiver(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Liên Kết Khách Hàng (Tùy chọn)</label>
                <select
                  value={customerRefCode}
                  onChange={(e) => setCustomerRefCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                >
                  <option value="">-- Không liên kết --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.customerCode}>
                      {c.customerCode} - {c.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Diễn Giải / Ghi Chú</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú đợt thanh toán, biên nhận..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-black font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-black font-semibold hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white font-bold rounded-lg shadow-xs ${
                    type === 'THU' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Lưu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
