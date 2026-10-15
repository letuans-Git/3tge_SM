import React, { useState, useMemo } from 'react';
import { Building2, Plus, ExternalLink, X, Check, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

interface DistributorSelectFieldProps {
  label?: string;
  value: string;
  onChange: (distributor: string) => void;
  className?: string;
  // Giữ lại các props tùy chọn để tương thích ngược 100% nếu có component truyền vào
  availableDistributors?: string[];
  onAddNewDistributor?: (name: string) => string;
}

export const DistributorSelectField: React.FC<DistributorSelectFieldProps> = ({
  label = 'Nhà phân phối',
  value,
  onChange,
  className = ''
}) => {
  const { suppliers, addSupplier, generateNextSupplierCode } = useData();

  // State mở modal thêm mới Nhà cung cấp theo chuẩn Danh mục Nhà cung cấp
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form thêm nhà cung cấp chuẩn
  const [supplierForm, setSupplierForm] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxCode: '',
    productGroup: 'Inverter & Pin lithium',
    notes: ''
  });

  // Sắp xếp danh mục nhà cung cấp theo mã NCC
  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [suppliers]);

  // Kiểm tra xem giá trị hiện tại có nằm trong danh mục không
  const hasMatch = useMemo(() => {
    if (!value) return true;
    return sortedSuppliers.some(
      s => s.name?.trim().toLowerCase() === value.trim().toLowerCase() ||
           s.code?.trim().toLowerCase() === value.trim().toLowerCase()
    );
  }, [sortedSuppliers, value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW_SUPPLIER__') {
      handleOpenModal();
    } else {
      onChange(val);
    }
  };

  const handleOpenModal = () => {
    const nextCode = generateNextSupplierCode();
    setSupplierForm({
      code: nextCode,
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      taxCode: '',
      productGroup: 'Inverter & Pin lithium',
      notes: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = supplierForm.name.trim().toUpperCase();
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên công ty / nhà cung cấp');
      return;
    }

    // Kiểm tra trùng tên nhà cung cấp đã có
    const existing = suppliers.find(s => s.name?.trim().toUpperCase() === trimmedName);
    if (existing) {
      setErrorMsg(`Nhà cung cấp [${existing.code}] "${existing.name}" đã tồn tại trong danh mục!`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const nextCode = supplierForm.code || generateNextSupplierCode();
      await addSupplier({
        code: nextCode.toUpperCase().trim(),
        name: trimmedName,
        contactPerson: supplierForm.contactPerson.trim(),
        phone: supplierForm.phone.trim(),
        email: supplierForm.email.trim(),
        address: supplierForm.address.trim(),
        taxCode: supplierForm.taxCode.trim(),
        productGroup: supplierForm.productGroup.trim(),
        notes: supplierForm.notes.trim()
      });

      // Tự động gán nhà cung cấp vừa tạo vào trường dữ liệu
      onChange(trimmedName);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu nhà cung cấp vào cơ sở dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToFullCatalog = () => {
    setIsModalOpen(false);
    // Chuyển sang module Danh mục -> Nhà cung cấp để nhập - sửa - xóa
    window.dispatchEvent(
      new CustomEvent('navigate-tab', { detail: { tab: 'catalog', subTab: 'suppliers' } })
    );
  };

  return (
    <div className={`space-y-0.5 ${className}`}>
      {/* Label & Nút gọi Modul Danh mục Nhà cung cấp */}
      <div className="flex items-center justify-between">
        <label className="text-[9px] font-bold text-black block truncate mb-0.5 leading-tight" title={label}>
          {label}
        </label>
        <button
          type="button"
          onClick={handleOpenModal}
          className="text-[9px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 hover:underline transition shrink-0"
          title="Thêm mới hoặc quản lý trong Danh mục Nhà cung cấp"
        >
          <Building2 className="w-2.5 h-2.5" /> + Thêm NCC
        </button>
      </div>

      {/* Select lấy 100% dữ liệu từ Danh mục Nhà cung cấp */}
      <select
        value={value || ''}
        onChange={handleSelectChange}
        className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 font-semibold text-black"
      >
        <option value="" disabled>-- Chọn nhà cung cấp (Danh mục NCC) --</option>
        
        {/* Trường hợp giá trị hiện tại là dữ liệu trước đây chưa có trong danh mục */}
        {!hasMatch && value && (
          <option value={value} className="text-amber-800 font-semibold">
            [Hiện tại] {value}
          </option>
        )}

        {sortedSuppliers.map((sup) => (
          <option key={sup.id} value={sup.name} className="uppercase font-medium">
            {sup.code} - {sup.name}{sup.productGroup ? ` (${sup.productGroup})` : ''}
          </option>
        ))}

        <option value="__ADD_NEW_SUPPLIER__" className="text-emerald-700 font-bold bg-emerald-50">
          + Thêm mới trong Danh mục Nhà cung cấp...
        </option>
      </select>

      {/* Modal thêm Nhà cung cấp chuẩn hóa theo Modul Danh mục Nhà cung cấp */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">Thêm Mới Nhà Cung Cấp</h3>
                  <p className="text-[10px] text-emerald-100">
                    Dữ liệu được lưu trực tiếp vào Danh mục Nhà cung cấp dùng chung
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-md transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveSupplier} className="p-4 space-y-3">
              {errorMsg && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Mã Nhà Cung Cấp <span className="text-slate-400 font-normal">(Tự động)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={supplierForm.code}
                    className="w-full px-2 py-1 text-xs bg-slate-100 rounded border border-slate-200 font-mono font-bold text-emerald-800 cursor-not-allowed select-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Tên Nhà Cung Cấp / Công Ty <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: HOÀNG GIA, HTPRO189..."
                    value={supplierForm.name}
                    onChange={(e) => {
                      setSupplierForm({ ...supplierForm, name: e.target.value.toUpperCase() });
                      if (errorMsg) setErrorMsg('');
                    }}
                    className="w-full px-2 py-1 text-xs uppercase bg-white rounded border border-slate-300 focus:outline-emerald-500 font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Nhóm Thiết Bị / Hàng Cung Ứng
                  </label>
                  <select
                    value={supplierForm.productGroup}
                    onChange={(e) => setSupplierForm({ ...supplierForm, productGroup: e.target.value })}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500 font-medium"
                  >
                    <option value="Inverter & Pin lithium">Inverter & Pin lithium</option>
                    <option value="Tấm pin PV">Tấm pin PV (Solar Panels)</option>
                    <option value="Thiết bị điện gió">Thiết bị điện gió (Tuabin)</option>
                    <option value="Phụ kiện đồ điện, attomat">Phụ kiện đồ điện, attomat</option>
                    <option value="Sắt hộp, vật tư cơ khí">Sắt hộp, vật tư cơ khí</option>
                    <option value="Tổng hợp">Tổng hợp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Người Liên Hệ (Đại diện)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Mr. Tuấn, Ms. Lan..."
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Số Điện Thoại Liên Hệ
                  </label>
                  <input
                    type="tel"
                    placeholder="0913.xxx.xxx"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                    Mã Số Thuế (MST)
                  </label>
                  <input
                    type="text"
                    placeholder="0201xxxxxx"
                    value={supplierForm.taxCode}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxCode: e.target.value })}
                    className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                  Địa Chỉ Trụ Sở / Kho Hàng
                </label>
                <input
                  type="text"
                  placeholder="Địa chỉ công ty hoặc chi nhánh giao hàng..."
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  placeholder="Chính sách bảo hành, điều khoản công nợ..."
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-white rounded border border-slate-300 focus:outline-emerald-500"
                />
              </div>

              {/* Action Buttons & Link to Full Module */}
              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleGoToFullCatalog}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở Danh mục Nhà Cung Cấp (Nhập - Sửa - Xóa)
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded font-semibold transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1 shadow-sm transition disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSubmitting ? 'Đang lưu...' : 'Lưu vào Danh mục NCC'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
