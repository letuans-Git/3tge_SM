import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FolderTree, 
  Boxes, 
  WalletCards, 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  ShieldAlert, 
  Tag, 
  Layers, 
  DollarSign, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Lock, 
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useData, UsageCheckResult } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { InventoryItem, ExpenseCategory, Supplier, ItemCategory } from '../types';

export type CatalogSubTab = 'items' | 'expenses' | 'suppliers';

interface CatalogViewProps {
  initialSubTab?: CatalogSubTab;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ initialSubTab = 'items' }) => {
  const { 
    inventory, 
    expenseCategories, 
    suppliers,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    generateNextItemCode,
    checkInventoryItemUsage,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    generateNextExpenseCategoryCode,
    checkExpenseCategoryUsage,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    generateNextSupplierCode,
    checkSupplierUsage
  } = useData();

  const { hasRole, hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState<CatalogSubTab>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Phân trang thông minh chuẩn hóa giống 100% trang quản lý khách hàng
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [itemsPerPage, setItemsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('3tge_catalog_per_page');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([12, 24, 36, 48, 60, 100].includes(parsed)) return parsed;
      }
    }
    return 12; // Mặc định 12 dòng / trang
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Tự động về trang 1 khi chuyển danh mục, tìm kiếm hoặc đổi phân loại
  useEffect(() => {
    setCurrentPage(1);
    setJumpPageInput('');
  }, [activeTab, searchQuery, filterCategory]);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // --- MODAL STATES ---
  // 1. Inventory Item Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState<{
    code: string;
    name: string;
    category: ItemCategory;
    brand: string;
    unit: string;
    stockQuantity: number;
    minAlertQuantity: number;
    unitPrice: number;
    location: string;
    notes: string;
  }>({
    code: '',
    name: '',
    category: 'INVERTER',
    brand: '',
    unit: 'Bộ',
    stockQuantity: 0,
    minAlertQuantity: 2,
    unitPrice: 15000000,
    location: 'Kho A',
    notes: ''
  });

  // 2. Expense Category Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseCategory | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    code: string;
    name: string;
    group: string;
    description: string;
  }>({
    code: '',
    name: '',
    group: 'Chi phí vận hành',
    description: ''
  });

  // 3. Supplier Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState<{
    code: string;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    taxCode: string;
    productGroup: string;
    notes: string;
  }>({
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

  // 4. Delete & Usage Check Inspection Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'item' | 'expense' | 'supplier';
    id: string;
    code: string;
    name: string;
    usage: UsageCheckResult;
  } | null>(null);

  // --- ITEM HANDLERS ---
  const handleOpenAddItem = () => {
    const nextCode = generateNextItemCode();
    setItemForm({
      code: nextCode,
      name: '',
      category: 'INVERTER',
      brand: 'HUAWEI',
      unit: 'Bộ',
      stockQuantity: 0,
      minAlertQuantity: 2,
      unitPrice: 25000000,
      location: 'Kho A',
      notes: ''
    });
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      brand: item.brand,
      unit: item.unit,
      stockQuantity: item.stockQuantity,
      minAlertQuantity: item.minAlertQuantity,
      unitPrice: item.unitPrice,
      location: item.location || '',
      notes: item.notes || ''
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      showToast('Vui lòng nhập tên vật tư hàng hóa', 'warning');
      return;
    }

    try {
      if (editingItem) {
        // Edit mode (preserve original code)
        await updateInventoryItem(editingItem.id, {
          name: itemForm.name.trim(),
          category: itemForm.category,
          brand: itemForm.brand.trim(),
          unit: itemForm.unit.trim(),
          stockQuantity: Number(itemForm.stockQuantity) || 0,
          minAlertQuantity: Number(itemForm.minAlertQuantity) || 0,
          unitPrice: Number(itemForm.unitPrice) || 0,
          location: itemForm.location.trim(),
          notes: itemForm.notes.trim()
        });
        showToast(`Cập nhật thành công vật tư [${editingItem.code}]`, 'success');
      } else {
        // Add mode with auto-generated code
        const code = itemForm.code || generateNextItemCode();
        await addInventoryItem({
          code: code.toUpperCase().trim(),
          name: itemForm.name.trim(),
          category: itemForm.category,
          brand: itemForm.brand.trim(),
          unit: itemForm.unit.trim(),
          stockQuantity: Number(itemForm.stockQuantity) || 0,
          minAlertQuantity: Number(itemForm.minAlertQuantity) || 0,
          unitPrice: Number(itemForm.unitPrice) || 0,
          location: itemForm.location.trim(),
          notes: itemForm.notes.trim()
        });
        showToast(`Đã thêm mới vật tư [${code}] vào danh mục`, 'success');
      }
      setIsItemModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu vật tư', 'error');
    }
  };

  // --- EXPENSE HANDLERS ---
  const handleOpenAddExpense = () => {
    const nextCode = generateNextExpenseCategoryCode();
    setExpenseForm({
      code: nextCode,
      name: '',
      group: 'Chi phí vận hành',
      description: ''
    });
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (cat: ExpenseCategory) => {
    setEditingExpense(cat);
    setExpenseForm({
      code: cat.code,
      name: cat.name,
      group: cat.group,
      description: cat.description || ''
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name.trim()) {
      showToast('Vui lòng nhập tên danh mục chi phí', 'warning');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpenseCategory(editingExpense.id, {
          name: expenseForm.name.trim(),
          group: expenseForm.group.trim(),
          description: expenseForm.description.trim()
        });
        showToast(`Cập nhật thành công danh mục chi phí [${editingExpense.code}]`, 'success');
      } else {
        const code = expenseForm.code || generateNextExpenseCategoryCode();
        await addExpenseCategory({
          code: code.toUpperCase().trim(),
          name: expenseForm.name.trim(),
          group: expenseForm.group.trim(),
          description: expenseForm.description.trim()
        });
        showToast(`Đã thêm mới danh mục chi phí [${code}]`, 'success');
      }
      setIsExpenseModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu danh mục chi phí', 'error');
    }
  };

  // --- SUPPLIER HANDLERS ---
  const handleOpenAddSupplier = () => {
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
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      code: sup.code,
      name: sup.name,
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      taxCode: sup.taxCode || '',
      productGroup: sup.productGroup || '',
      notes: sup.notes || ''
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      showToast('Vui lòng nhập tên nhà cung cấp', 'warning');
      return;
    }

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: supplierForm.name.trim(),
          contactPerson: supplierForm.contactPerson.trim(),
          phone: supplierForm.phone.trim(),
          email: supplierForm.email.trim(),
          address: supplierForm.address.trim(),
          taxCode: supplierForm.taxCode.trim(),
          productGroup: supplierForm.productGroup.trim(),
          notes: supplierForm.notes.trim()
        });
        showToast(`Cập nhật thành công nhà cung cấp [${editingSupplier.code}]`, 'success');
      } else {
        const code = supplierForm.code || generateNextSupplierCode();
        await addSupplier({
          code: code.toUpperCase().trim(),
          name: supplierForm.name.trim(),
          contactPerson: supplierForm.contactPerson.trim(),
          phone: supplierForm.phone.trim(),
          email: supplierForm.email.trim(),
          address: supplierForm.address.trim(),
          taxCode: supplierForm.taxCode.trim(),
          productGroup: supplierForm.productGroup.trim(),
          notes: supplierForm.notes.trim()
        });
        showToast(`Đã thêm mới nhà cung cấp [${code}]`, 'success');
      }
      setIsSupplierModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu nhà cung cấp', 'error');
    }
  };

  // --- DELETE CHECKS AND EXECUTION ---
  const handlePromptDeleteItem = (item: InventoryItem) => {
    const usage = checkInventoryItemUsage(item);
    setDeleteTarget({
      type: 'item',
      id: item.id,
      code: item.code,
      name: item.name,
      usage
    });
  };

  const handlePromptDeleteExpense = (cat: ExpenseCategory) => {
    const usage = checkExpenseCategoryUsage(cat);
    setDeleteTarget({
      type: 'expense',
      id: cat.id,
      code: cat.code,
      name: cat.name,
      usage
    });
  };

  const handlePromptDeleteSupplier = (sup: Supplier) => {
    const usage = checkSupplierUsage(sup);
    setDeleteTarget({
      type: 'supplier',
      id: sup.id,
      code: sup.code,
      name: sup.name,
      usage
    });
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.usage.isUsed) {
      showToast('Không thể xóa danh mục đã phát sinh tác vụ nghiệp vụ!', 'error');
      setDeleteTarget(null);
      return;
    }

    try {
      if (deleteTarget.type === 'item') {
        const res = await deleteInventoryItem(deleteTarget.id);
        if (res.success) {
          showToast(`Đã xóa vĩnh viễn vật tư [${deleteTarget.code}]`, 'success');
        } else {
          showToast(res.error || 'Lỗi khi xóa vật tư', 'error');
        }
      } else if (deleteTarget.type === 'expense') {
        const res = await deleteExpenseCategory(deleteTarget.id);
        if (res.success) {
          showToast(`Đã xóa vĩnh viễn danh mục chi phí [${deleteTarget.code}]`, 'success');
        } else {
          showToast(res.error || 'Lỗi khi xóa chi phí', 'error');
        }
      } else if (deleteTarget.type === 'supplier') {
        const res = await deleteSupplier(deleteTarget.id);
        if (res.success) {
          showToast(`Đã xóa vĩnh viễn nhà cung cấp [${deleteTarget.code}]`, 'success');
        } else {
          showToast(res.error || 'Lỗi khi xóa nhà cung cấp', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi thực hiện xóa', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // --- FILTERED DATASETS ---
  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [inventory, filterCategory, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenseCategories.filter(cat => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          cat.code.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q) ||
          (cat.group && cat.group.toLowerCase().includes(q)) ||
          (cat.description && cat.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expenseCategories, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          sup.code.toLowerCase().includes(q) ||
          sup.name.toLowerCase().includes(q) ||
          (sup.contactPerson && sup.contactPerson.toLowerCase().includes(q)) ||
          (sup.phone && sup.phone.includes(q)) ||
          (sup.taxCode && sup.taxCode.includes(q)) ||
          (sup.productGroup && sup.productGroup.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [suppliers, searchQuery]);

  const getItemCategoryBadge = (cat: ItemCategory) => {
    switch (cat) {
      case 'INVERTER':
        return <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-blue-50 text-blue-800 border border-blue-200 leading-tight">Biến tần</span>;
      case 'BATTERY':
        return <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-purple-50 text-purple-800 border border-purple-200 leading-tight">Pin lưu trữ</span>;
      case 'PANEL':
        return <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-amber-50 text-amber-800 border border-amber-200 leading-tight">Tấm pin PV</span>;
      case 'CABLE':
        return <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 leading-tight">Cáp Solar</span>;
      case 'ACCESSORY':
        return <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 leading-tight">Phụ kiện</span>;
    }
  };

  // Tổng số lượng phần tử theo sub-tab đang chọn
  const currentTotal = useMemo(() => {
    if (activeTab === 'items') return filteredItems.length;
    if (activeTab === 'expenses') return filteredExpenses.length;
    return filteredSuppliers.length;
  }, [activeTab, filteredItems.length, filteredExpenses.length, filteredSuppliers.length]);

  const totalPages = Math.max(1, Math.ceil(currentTotal / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, currentTotal);

  // Dữ liệu phân trang cho từng tab
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, startIndex, endIndex]);

  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice(startIndex, endIndex);
  }, [filteredExpenses, startIndex, endIndex]);

  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice(startIndex, endIndex);
  }, [filteredSuppliers, startIndex, endIndex]);

  // Thống kê nhanh cho tab vật tư
  const totalStockQuantity = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + (it.stockQuantity || 0), 0);
  }, [filteredItems]);

  const currentPageStockQuantity = useMemo(() => {
    return paginatedItems.reduce((acc, it) => acc + (it.stockQuantity || 0), 0);
  }, [paginatedItems]);

  // Cuộn mượt lên đỉnh bảng khi chuyển trang
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
      localStorage.setItem('3tge_catalog_per_page', String(newSize));
    }
    showToast(`Đã điều chỉnh hiển thị ${newSize} dòng / trang`, 'success');
  };

  const handleJumpToPage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(jumpPageInput.trim(), 10);
    if (!isNaN(val)) {
      const target = Math.min(Math.max(1, val), totalPages);
      setCurrentPage(target);
      setJumpPageInput('');
      scrollToTableTop();
      showToast(`Đã chuyển đến trang ${target}`, 'success');
    }
  };

  // Thuật toán dải số trang thông minh cho hàng trăm / hàng nghìn trang (giống 100% trang quản lý khách hàng)
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

  // Thanh điều khiển phân trang thông minh dùng chung cho 3 tab
  const renderPaginationControlsBar = () => {
    if (currentTotal === 0) return null;
    return (
      <div className="bg-slate-50/95 px-3 py-2 border-t border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-2.5 text-xs">
        {/* Cột 1: Thông số hiển thị & Thống kê */}
        <div className="flex flex-wrap items-center gap-2 text-slate-600 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium">
            Hiển thị <strong className="text-slate-900 font-bold">{startIndex + 1} - {endIndex}</strong> trên <strong className="text-emerald-700 font-bold">{currentTotal}</strong> {
              activeTab === 'items' ? 'vật tư' : activeTab === 'expenses' ? 'loại chi phí' : 'nhà cung cấp'
            }
          </span>
          {activeTab === 'items' && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">
                Tổng tồn: <strong className="text-slate-800 font-bold">{totalStockQuantity.toLocaleString()}</strong>
                {totalPages > 1 && (
                  <span className="text-slate-500 font-normal ml-1">
                    (Trang: <strong className="text-emerald-700 font-bold">{currentPageStockQuantity.toLocaleString()}</strong>)
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        {/* Cột 2: Bộ chọn số dòng / trang & Ô nhảy trang nhanh */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Chọn số dòng hiển thị / trang */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="font-medium whitespace-nowrap">Hiển thị:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-white border border-slate-200 rounded font-bold text-slate-700 shadow-2xs focus:outline-emerald-500 cursor-pointer text-xs"
              title="Thay đổi số dòng hiển thị trên mỗi trang"
            >
              <option value={12}>12 dòng / trang</option>
              <option value={24}>24 dòng / trang</option>
              <option value={36}>36 dòng / trang</option>
              <option value={48}>48 dòng / trang</option>
              <option value={60}>60 dòng / trang</option>
              <option value={100}>100 dòng / trang</option>
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
            title={`Đến trang cuối (${totalPages})`}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div 
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 transition-all animate-bounce ${
            toast.type === 'success' 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-amber-500 text-white border-amber-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {toast.type === 'error' && <ShieldAlert className="w-5 h-5 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  Quản Lý Menu Danh Mục
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Master Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mã danh mục tự động phát sinh &bull; Đầy đủ chức năng Nhập - Sửa - Xóa &bull; Ràng buộc an toàn: Chỉ xóa khi chưa dùng trong tác vụ nào
              </p>
            </div>
          </div>

          {/* Action button corresponding to active sub-tab */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {activeTab === 'items' && (
              <button
                type="button"
                onClick={handleOpenAddItem}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập Vật Tư Mới</span>
              </button>
            )}

            {activeTab === 'expenses' && (
              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập Loại Chi Phí Mới</span>
              </button>
            )}

            {activeTab === 'suppliers' && (
              <button
                type="button"
                onClick={handleOpenAddSupplier}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập Nhà Cung Cấp Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs for the 3 Categories */}
        <div className="flex items-center gap-2 border-b border-slate-100 pt-4 mt-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => { setActiveTab('items'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'items'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>1. Danh Mục Vật Tư Hàng Hóa</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
              activeTab === 'items' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {inventory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('expenses'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <WalletCards className="w-4 h-4" />
            <span>2. Danh Mục Chi Phí</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
              activeTab === 'expenses' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {expenseCategories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('suppliers'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-bold text-xs sm:text-sm border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'suppliers'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>3. Danh Mục Nhà Cung Cấp</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
              activeTab === 'suppliers' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {suppliers.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'items'
                  ? 'Tìm theo mã VT, tên, hãng...'
                  : activeTab === 'expenses'
                  ? 'Tìm theo mã CP, tên loại chi phí...'
                  : 'Tìm theo mã NCC, tên công ty, SĐT...'
              }
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'items' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">Phân loại:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tất cả nhóm vật tư</option>
                <option value="INVERTER">Biến tần (Inverter)</option>
                <option value="BATTERY">Pin lưu trữ (Battery)</option>
                <option value="PANEL">Tấm pin PV (Solar Panel)</option>
                <option value="CABLE">Cáp điện Solar DC</option>
                <option value="ACCESSORY">Phụ kiện & Khác</option>
              </select>
            </div>
          )}

          <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
            {activeTab === 'items' && `Hiển thị ${filteredItems.length} / ${inventory.length} vật tư`}
            {activeTab === 'expenses' && `Hiển thị ${filteredExpenses.length} / ${expenseCategories.length} loại chi phí`}
            {activeTab === 'suppliers' && `Hiển thị ${filteredSuppliers.length} / ${suppliers.length} nhà cung cấp`}
          </div>
        </div>
      </div>

      {/* --- SUB-TAB 1: DANH MỤC VẬT TƯ HÀNG HÓA --- */}
      {activeTab === 'items' && (
        <div ref={tableContainerRef} className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="py-1.5 px-1.5 w-8 text-center">STT</th>
                  <th className="py-1.5 px-1.5">Mã VT</th>
                  <th className="py-1.5 px-1.5 min-w-[190px]">Tên Vật Tư Hàng Hóa</th>
                  <th className="py-1.5 px-1.5">Nhóm / Hãng</th>
                  <th className="py-1.5 px-1.5 text-center">ĐVT</th>
                  <th className="py-1.5 px-1.5 text-right">Đơn Giá Tiêu Chuẩn</th>
                  <th className="py-1.5 px-1.5 text-center">Tồn / Tối Thiểu</th>
                  <th className="py-1.5 px-1.5">Vị Trí / Kho</th>
                  <th className="py-1.5 px-1.5 text-center">Trạng Thái Tác Vụ</th>
                  <th className="py-1.5 px-1.5 text-center w-20">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-1.5 stroke-1" />
                      <p className="font-semibold text-slate-600 text-xs">Không tìm thấy vật tư nào phù hợp</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bấm "Nhập Vật Tư Mới" để tạo vật tư với mã tự động phát sinh</p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const usage = checkInventoryItemUsage(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <td className="py-[3px] px-1.5 text-center text-slate-400 font-medium text-[10px]">
                          {globalIdx}
                        </td>
                        <td className="py-[3px] px-1.5 font-mono font-bold text-emerald-700 text-[10.5px] whitespace-nowrap">
                          {item.code}
                        </td>
                        <td className="py-[3px] px-1.5">
                          <div className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[260px]" title={item.name}>
                            {item.name}
                          </div>
                          {item.notes && <div className="text-[9px] text-slate-400 truncate max-w-[260px] leading-none mt-0.5" title={item.notes}>{item.notes}</div>}
                        </td>
                        <td className="py-[3px] px-1.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 leading-tight">
                            {getItemCategoryBadge(item.category)}
                            {item.brand && <span className="text-[9.5px] text-slate-500 font-semibold">{item.brand}</span>}
                          </div>
                        </td>
                        <td className="py-[3px] px-1.5 text-center font-semibold text-slate-700 text-[10.5px] whitespace-nowrap">
                          {item.unit}
                        </td>
                        <td className="py-[3px] px-1.5 text-right font-mono font-bold text-slate-800 text-[10.5px] whitespace-nowrap">
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap leading-tight">
                          <span className={`font-mono font-bold text-[10.5px] ${
                            item.stockQuantity <= item.minAlertQuantity ? 'text-amber-600' : 'text-slate-800'
                          }`}>
                            {item.stockQuantity}
                          </span>
                          <span className="text-slate-400 text-[9px]"> / min {item.minAlertQuantity}</span>
                        </td>
                        <td className="py-[3px] px-1.5 text-slate-600 text-[10px] truncate max-w-[130px]" title={item.location}>
                          {item.location || <span className="text-slate-300 italic">Chưa xếp kho</span>}
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          {usage.isUsed ? (
                            <span 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer leading-tight"
                              onClick={() => handlePromptDeleteItem(item)}
                              title={usage.reasons.join('\n')}
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>Đã dùng ({usage.reasons.length})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-tight">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Chưa dùng</span>
                            </span>
                          )}
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditItem(item)}
                              className="p-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="Sửa thông tin vật tư"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteItem(item)}
                              className={`p-0.5 rounded transition cursor-pointer ${
                                usage.isUsed 
                                  ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50' 
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={usage.isUsed ? 'Vật tư đã dùng trong tác vụ - Bấm xem chi tiết ràng buộc' : 'Xóa vật tư khỏi danh mục'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Smart Pagination Controls Bar */}
          {renderPaginationControlsBar()}
        </div>
      )}

      {/* --- SUB-TAB 2: DANH MỤC CHI PHÍ --- */}
      {activeTab === 'expenses' && (
        <div ref={tableContainerRef} className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="py-1.5 px-1.5 w-8 text-center">STT</th>
                  <th className="py-1.5 px-1.5">Mã Chi Phí</th>
                  <th className="py-1.5 px-1.5 min-w-[200px]">Tên Loại Chi Phí</th>
                  <th className="py-1.5 px-1.5">Nhóm Chi Phí</th>
                  <th className="py-1.5 px-1.5 min-w-[220px]">Diễn Giải / Mục Đích Sử Dụng</th>
                  <th className="py-1.5 px-1.5 text-center">Trạng Thái Tác Vụ</th>
                  <th className="py-1.5 px-1.5 text-center w-20">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <WalletCards className="w-8 h-8 mx-auto text-slate-300 mb-1.5 stroke-1" />
                      <p className="font-semibold text-slate-600 text-xs">Không tìm thấy danh mục chi phí nào phù hợp</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bấm "Nhập Loại Chi Phí Mới" để tạo mã chi phí tự động phát sinh</p>
                    </td>
                  </tr>
                ) : (
                  paginatedExpenses.map((cat, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const usage = checkExpenseCategoryUsage(cat);
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <td className="py-[3px] px-1.5 text-center text-slate-400 font-medium text-[10px]">
                          {globalIdx}
                        </td>
                        <td className="py-[3px] px-1.5 font-mono font-bold text-emerald-700 text-[10.5px] whitespace-nowrap">
                          {cat.code}
                        </td>
                        <td className="py-[3px] px-1.5">
                          <span className="font-bold text-slate-800 text-[11px] leading-tight">{cat.name}</span>
                        </td>
                        <td className="py-[3px] px-1.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 leading-tight">
                            {cat.group}
                          </span>
                        </td>
                        <td className="py-[3px] px-1.5 text-slate-600 text-[10.5px] leading-tight">
                          {cat.description || <span className="text-slate-300 italic">Chưa có diễn giải</span>}
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          {usage.isUsed ? (
                            <span 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer leading-tight"
                              onClick={() => handlePromptDeleteExpense(cat)}
                              title={usage.reasons.join('\n')}
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>Đã hạch toán ({usage.reasons.length})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-tight">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Chưa dùng</span>
                            </span>
                          )}
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(cat)}
                              className="p-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="Sửa danh mục chi phí"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteExpense(cat)}
                              className={`p-0.5 rounded transition cursor-pointer ${
                                usage.isUsed 
                                  ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50' 
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={usage.isUsed ? 'Chi phí đã hạch toán - Bấm xem chi tiết ràng buộc' : 'Xóa danh mục chi phí'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Smart Pagination Controls Bar */}
          {renderPaginationControlsBar()}
        </div>
      )}

      {/* --- SUB-TAB 3: DANH MỤC NHÀ CUNG CẤP --- */}
      {activeTab === 'suppliers' && (
        <div ref={tableContainerRef} className="bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="py-1.5 px-1.5 w-8 text-center">STT</th>
                  <th className="py-1.5 px-1.5">Mã NCC</th>
                  <th className="py-1.5 px-1.5 min-w-[190px]">Tên Nhà Cung Cấp / Doanh Nghiệp</th>
                  <th className="py-1.5 px-1.5">Liên Hệ & Điện Thoại</th>
                  <th className="py-1.5 px-1.5">Mã Số Thuế & Địa Chỉ</th>
                  <th className="py-1.5 px-1.5">Nhóm Hàng Cung Ứng</th>
                  <th className="py-1.5 px-1.5 text-center">Trạng Thái Tác Vụ</th>
                  <th className="py-1.5 px-1.5 text-center w-20">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-1.5 stroke-1" />
                      <p className="font-semibold text-slate-600 text-xs">Không tìm thấy nhà cung cấp nào phù hợp</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bấm "Nhập Nhà Cung Cấp Mới" để tạo NCC với mã tự động phát sinh</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((sup, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const usage = checkSupplierUsage(sup);
                    return (
                      <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <td className="py-[3px] px-1.5 text-center text-slate-400 font-medium text-[10px]">
                          {globalIdx}
                        </td>
                        <td className="py-[3px] px-1.5 font-mono font-bold text-emerald-700 text-[10.5px] whitespace-nowrap">
                          {sup.code}
                        </td>
                        <td className="py-[3px] px-1.5">
                          <div className="font-bold text-slate-800 text-[11px] leading-tight truncate max-w-[220px]" title={sup.name}>{sup.name}</div>
                          {sup.notes && <div className="text-[9px] text-slate-400 truncate max-w-[220px] leading-none mt-0.5" title={sup.notes}>{sup.notes}</div>}
                        </td>
                        <td className="py-[3px] px-1.5 whitespace-nowrap leading-tight">
                          {sup.contactPerson && <div className="font-semibold text-slate-700 text-[10.5px]">{sup.contactPerson}</div>}
                          {sup.phone ? (
                            <a href={`tel:${sup.phone}`} className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-mono hover:underline mt-0.5">
                              <Phone className="w-2.5 h-2.5" /> {sup.phone}
                            </a>
                          ) : (
                            <span className="text-slate-300 italic text-[9.5px]">Chưa có SĐT</span>
                          )}
                        </td>
                        <td className="py-[3px] px-1.5 leading-tight">
                          {sup.taxCode && (
                            <div className="font-mono text-[9.5px] font-bold text-slate-700">
                              MST: {sup.taxCode}
                            </div>
                          )}
                          <div className="text-slate-500 text-[10px] max-w-[220px] truncate mt-0.5" title={sup.address}>
                            {sup.address || <span className="text-slate-300 italic">Chưa cập nhật địa chỉ</span>}
                          </div>
                        </td>
                        <td className="py-[3px] px-1.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 leading-tight">
                            {sup.productGroup || 'Thiết bị tổng hợp'}
                          </span>
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          {usage.isUsed ? (
                            <span 
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer leading-tight"
                              onClick={() => handlePromptDeleteSupplier(sup)}
                              title={usage.reasons.join('\n')}
                            >
                              <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span>Đã dùng ({usage.reasons.length})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 leading-tight">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>Chưa dùng</span>
                            </span>
                          )}
                        </td>
                        <td className="py-[3px] px-1.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditSupplier(sup)}
                              className="p-0.5 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="Sửa nhà cung cấp"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteSupplier(sup)}
                              className={`p-0.5 rounded transition cursor-pointer ${
                                usage.isUsed 
                                  ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50' 
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={usage.isUsed ? 'NCC đã liên kết tác vụ - Bấm xem chi tiết ràng buộc' : 'Xóa nhà cung cấp'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Smart Pagination Controls Bar */}
          {renderPaginationControlsBar()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: NHẬP / SỬA VẬT TƯ HÀNG HÓA */}
      {/* ========================================================================= */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">
                    {editingItem ? 'Sửa Danh Mục Vật Tư Hàng Hóa' : 'Nhập Danh Mục Vật Tư Hàng Hóa Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingItem ? `Mã vật tư: ${editingItem.code}` : 'Mã phát sinh tự động &bull; Quản lý thông số thiết bị'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Row 1: Code and Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mã vật tư</span>
                    <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Tự động
                    </span>
                  </label>
                  <input
                    type="text"
                    value={itemForm.code}
                    disabled={!!editingItem}
                    readOnly={!editingItem}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800 cursor-not-allowed"
                    title={editingItem ? 'Mã vật tư không được thay đổi' : 'Mã tự động phát sinh'}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên vật tư hàng hóa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Biến tần Hybrid Huawei SUN2000-10KTL"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Category, Brand, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm phân loại</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as ItemCategory })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="INVERTER">Biến tần (Inverter)</option>
                    <option value="BATTERY">Pin lưu trữ Lithium</option>
                    <option value="PANEL">Tấm pin PV (Solar)</option>
                    <option value="CABLE">Cáp điện Solar DC</option>
                    <option value="ACCESSORY">Phụ kiện & Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hãng / Thương hiệu</label>
                  <input
                    type="text"
                    placeholder="VD: HUAWEI, DEYE, LONGI..."
                    value={itemForm.brand}
                    onChange={(e) => setItemForm({ ...itemForm, brand: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính (ĐVT)</label>
                  <input
                    type="text"
                    placeholder="Bộ, Tấm, Cuộn, Mét..."
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Price, Min Alert, Initial Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá tiêu chuẩn (VNĐ)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cảnh báo tối thiểu</label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.minAlertQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, minAlertQuantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {editingItem ? 'Tồn kho hiện tại' : 'Tồn kho ban đầu'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.stockQuantity}
                    onChange={(e) => setItemForm({ ...itemForm, stockQuantity: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Location & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vị trí lưu kho</label>
                  <input
                    type="text"
                    placeholder="VD: Kho A - Kệ 01"
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú & Bảo hành</label>
                  <input
                    type="text"
                    placeholder="VD: Bảo hành 5 năm chính hãng"
                    value={itemForm.notes}
                    onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {editingItem ? 'Lưu Cập Nhật Vật Tư' : 'Lưu Danh Mục Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NHẬP / SỬA DANH MỤC CHI PHÍ */}
      {/* ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <WalletCards className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">
                    {editingExpense ? 'Sửa Danh Mục Chi Phí' : 'Nhập Loại Chi Phí Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingExpense ? `Mã chi phí: ${editingExpense.code}` : 'Mã tự động phát sinh &bull; Phục vụ hạch toán sổ quỹ'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Mã loại chi phí</span>
                  <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> Tự động phát sinh
                  </span>
                </label>
                <input
                  type="text"
                  value={expenseForm.code}
                  disabled={!!editingExpense}
                  readOnly={!editingExpense}
                  onChange={(e) => setExpenseForm({ ...expenseForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên loại chi phí <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chi mua sắm thiết bị, Chi bảo dưỡng lưu động..."
                  value={expenseForm.name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm chi phí</label>
                <select
                  value={expenseForm.group}
                  onChange={(e) => setExpenseForm({ ...expenseForm, group: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Mua sắm & Thiết bị">Mua sắm & Thiết bị</option>
                  <option value="Chi phí nhân sự">Chi phí nhân sự & Lương</option>
                  <option value="Vận hành & Đi lại">Vận hành & Đi lại, Xăng xe</option>
                  <option value="Dịch vụ kỹ thuật">Dịch vụ kỹ thuật & Sửa chữa</option>
                  <option value="Chi phí quản lý">Chi phí quản lý & Tiếp khách</option>
                  <option value="Bán hàng & Tiếp thị">Bán hàng & Tiếp thị, Marketing</option>
                  <option value="Vận hành trạm">Vận hành trạm, SIM 4G & Internet</option>
                  <option value="Chi phí khác">Chi phí khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diễn giải mục đích chi</label>
                <textarea
                  rows={3}
                  placeholder="Ghi chú chi tiết mục đích áp dụng cho danh mục này..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {editingExpense ? 'Lưu Cập Nhật Chi Phí' : 'Lưu Danh Mục Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NHẬP / SỬA NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-sm sm:text-base">
                    {editingSupplier ? 'Sửa Danh Mục Nhà Cung Cấp' : 'Nhập Nhà Cung Cấp Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingSupplier ? `Mã NCC: ${editingSupplier.code}` : 'Mã tự động phát sinh &bull; Quản lý hồ sơ đối tác'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4">
              {/* Row 1: Code and Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mã NCC</span>
                    <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Tự động
                    </span>
                  </label>
                  <input
                    type="text"
                    value={supplierForm.code}
                    disabled={!!editingSupplier}
                    readOnly={!editingSupplier}
                    onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-emerald-800 cursor-not-allowed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên nhà cung cấp / Doanh nghiệp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: HTPRO189 Solar Distributor"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Contact, Phone, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người đại diện liên hệ</label>
                  <input
                    type="text"
                    placeholder="VD: Mr. Hoàng Tuấn"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    placeholder="VD: 0918.888.189"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="sales@company.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 3: Tax Code and Product Group */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã số thuế (MST)</label>
                  <input
                    type="text"
                    placeholder="VD: 0314567890"
                    value={supplierForm.taxCode}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm hàng cung cấp chính</label>
                  <input
                    type="text"
                    placeholder="VD: Inverter Huawei, Deye, Pin lithium..."
                    value={supplierForm.productGroup}
                    onChange={(e) => setSupplierForm({ ...supplierForm, productGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa chỉ trụ sở / Kho hàng</label>
                <input
                  type="text"
                  placeholder="VD: 120 Võ Văn Kiệt, Quận 1, TP. HCM"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Row 5: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú & Đánh giá năng lực</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về chính sách thanh toán, chiết khấu, chính sách bảo hành..."
                  value={supplierForm.notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  {editingSupplier ? 'Lưu Cập Nhật NCC' : 'Lưu Nhà Cung Cấp Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KIỂM TRA TÁC VỤ & RÀNG BUỘC KHI XÓA DANH MỤC */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
            {deleteTarget.usage.isUsed ? (
              // Case A: ĐÃ DÙNG TRONG TÁC VỤ => CHẶN XÓA HOÀN TOÀN
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-xs">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div className="text-center mb-5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                    Ràng buộc toàn vẹn dữ liệu
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    Không Thể Xóa Danh Mục Này
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Danh mục <strong className="text-slate-800 font-mono font-bold">[{deleteTarget.code}] {deleteTarget.name}</strong> đã phát sinh tác vụ trong hệ thống và <strong className="text-rose-600">bắt buộc phải được giữ lại</strong> để bảo đảm tính chính xác của dữ liệu lịch sử và kế toán.
                  </p>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2.5 mb-5 text-xs text-rose-900">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Các tác vụ thực tế đang sử dụng danh mục này:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-[11px] text-rose-800 font-medium">
                    {deleteTarget.usage.reasons.map((reason, idx) => (
                      <li key={idx} className="font-semibold">{reason}</li>
                    ))}
                  </ul>

                  {deleteTarget.usage.details.length > 0 && (
                    <div className="pt-2 border-t border-rose-200/60 text-[10px] text-rose-700/90 font-mono space-y-1">
                      {deleteTarget.usage.details.map((detail, idx) => (
                        <div key={idx} className="truncate">&bull; {detail}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 mb-5 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Gợi ý:</strong> Bạn có thể sử dụng nút <strong>Sửa</strong> để cập nhật thông tin (ví dụ: điều chỉnh tên, diễn giải) thay vì xóa, hoặc chỉ xóa các danh mục mới tạo chưa từng phát sinh dữ liệu nào.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!deleteTarget) return;
                      if (deleteTarget.type === 'item') {
                        const res = await deleteInventoryItem(deleteTarget.id, true);
                        if (res.success) showToast(`Đã xóa vật tư [${deleteTarget.code}]`, 'success');
                        else showToast(res.error || 'Lỗi khi xóa', 'error');
                      }
                      setDeleteTarget(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    Vẫn Xóa Danh Mục Này
                  </button>
                </div>
              </div>
            ) : (
              // Case B: CHƯA TỪNG DÙNG => CHO PHÉP XÓA
              <div className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-xs">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="text-center mb-5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Đủ điều kiện xóa an toàn
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2">
                    Xác Nhận Xóa Danh Mục
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Danh mục <strong className="text-slate-800 font-mono font-bold">[{deleteTarget.code}] {deleteTarget.name}</strong> chưa từng được sử dụng trong bất kỳ tác vụ nào (chưa có phiếu kho, giao dịch quỹ hay liên kết công trình).
                  </p>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 mb-5 text-xs text-emerald-800">
                  <p className="font-semibold">
                    Hệ thống đã kiểm tra tự động: Không có bất kỳ dữ liệu nào bị ảnh hưởng. Bạn có muốn xóa vĩnh viễn danh mục này không?
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDelete}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác Nhận Xóa Vĩnh Viễn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
