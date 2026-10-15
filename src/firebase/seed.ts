import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import {
  Customer,
  MaintenanceRecord,
  InventoryItem,
  InventoryTransaction,
  CashTransaction,
  UserProfile,
  ExpenseCategory,
  Supplier,
  GoodsReceiptNote
} from '../types';

// Người dùng quản trị ban đầu
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin',
    username: 'admin',
    fullName: 'Lê Tuấn - Quản Trị Viên',
    role: 'admin',
    phone: '0913.566.532',
    email: 'admin@3tge.vn',
    password: '123'
  }
];

export const DEFAULT_USERS = INITIAL_USERS;

// Không sử dụng bất kỳ dữ liệu giả lập nào
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_INVENTORY: InventoryItem[] = [];
export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [];
export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [];
export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_GOODS_RECEIPTS: GoodsReceiptNote[] = [];

// Ngừng toàn bộ cơ chế nạp thêm dữ liệu mẫu
export async function seedExtendedCustomersBatch() {
  return false;
}

// Khởi tạo Firestore: Chỉ đảm bảo tài khoản người dùng ban đầu nếu chưa có, KHÔNG nạp bất kỳ dữ liệu nghiệp vụ giả lập nào
export async function seedInitialDatabaseIfEmpty() {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    if (usersSnap.empty) {
      await Promise.all(
        INITIAL_USERS.map(u => setDoc(doc(db, 'users', u.id), u, { merge: true }))
      );
    }
  } catch (err) {
    console.warn('Initial users check note:', err);
  }
}

// Danh sách toàn bộ định danh dữ liệu giả lập được sinh từ trước để loại bỏ triệt để
export const SIMULATED_CUSTOMER_IDS = new Set(
  Array.from({ length: 36 }, (_, i) => `cust_${String(i + 1).padStart(6, '0')}`)
);
export const SIMULATED_CASH_IDS = new Set(['cash_001', 'cash_002', 'cash_003', 'cash_004']);
export const SIMULATED_MAINT_IDS = new Set(['maint_001']);
export const SIMULATED_INVENTORY_IDS = new Set(['inv_item_1', 'inv_item_2', 'inv_item_3', 'inv_item_4', 'inv_item_5']);
export const SIMULATED_RECEIPT_IDS = new Set(['receipt_001', 'receipt_002']);
export const SIMULATED_SUPPLIER_IDS = new Set(['sup_001', 'sup_002', 'sup_003', 'sup_004', 'sup_005']);
export const SIMULATED_EXPENSE_CAT_IDS = new Set(['exp_cat_001', 'exp_cat_002', 'exp_cat_003', 'exp_cat_004', 'exp_cat_005', 'exp_cat_006', 'exp_cat_007', 'exp_cat_008']);

// Xóa sạch toàn bộ dữ liệu giả lập, bảo lưu 100% dữ liệu do người dùng thực tế nhập vào
export async function purgeAllSimulatedData(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  try {
    let deletedCount = 0;

    // 1. Quét và xóa các khách hàng giả lập (cust_000001 - cust_000036)
    // TUYỆT ĐỐI BẢO LƯU khách hàng do người dùng tạo (ID không nằm trong danh sách giả lập)
    const custRef = collection(db, 'customers');
    const custSnap = await getDocs(custRef);
    for (const d of custSnap.docs) {
      if (SIMULATED_CUSTOMER_IDS.has(d.id) || d.id.startsWith('cust_0000')) {
        await deleteDoc(doc(db, 'customers', d.id));
        deletedCount++;
      }
    }

    // 2. Quét và xóa phiếu thu/chi tiền mặt giả lập (cash_001 - cash_004)
    const cashRef = collection(db, 'cashTransactions');
    const cashSnap = await getDocs(cashRef);
    for (const d of cashSnap.docs) {
      if (SIMULATED_CASH_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'cashTransactions', d.id));
        deletedCount++;
      }
    }

    // 3. Quét và xóa phiếu bảo dưỡng giả lập (maint_001)
    const maintRef = collection(db, 'maintenanceRecords');
    const maintSnap = await getDocs(maintRef);
    for (const d of maintSnap.docs) {
      if (SIMULATED_MAINT_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'maintenanceRecords', d.id));
        deletedCount++;
      }
    }

    // 4. Quét và xóa phiếu nhập kho giả lập (receipt_001, receipt_002)
    const receiptRef = collection(db, 'goodsReceipts');
    const receiptSnap = await getDocs(receiptRef);
    for (const d of receiptSnap.docs) {
      if (SIMULATED_RECEIPT_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'goodsReceipts', d.id));
        deletedCount++;
      }
    }

    // 5. Quét và xóa danh mục vật tư giả lập (inv_item_1 - inv_item_5)
    const invRef = collection(db, 'inventory');
    const invSnap = await getDocs(invRef);
    for (const d of invSnap.docs) {
      if (SIMULATED_INVENTORY_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'inventory', d.id));
        deletedCount++;
      }
    }

    // 6. Quét và xóa giao dịch kho gắn liền với dữ liệu giả lập
    const transRef = collection(db, 'inventoryTransactions');
    const transSnap = await getDocs(transRef);
    for (const d of transSnap.docs) {
      const data = d.data();
      if (
        d.id === 'trans_001' ||
        d.id === 'trans_002' ||
        SIMULATED_RECEIPT_IDS.has(data.receiptId) ||
        SIMULATED_INVENTORY_IDS.has(data.itemId)
      ) {
        await deleteDoc(doc(db, 'inventoryTransactions', d.id));
        deletedCount++;
      }
    }

    // 7. Quét và xóa nhà cung cấp giả lập (sup_001 - sup_005)
    const supRef = collection(db, 'suppliers');
    const supSnap = await getDocs(supRef);
    for (const d of supSnap.docs) {
      if (SIMULATED_SUPPLIER_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'suppliers', d.id));
        deletedCount++;
      }
    }

    // 8. Quét và xóa danh mục chi phí giả lập (exp_cat_001 - exp_cat_008)
    const expCatRef = collection(db, 'expenseCategories');
    const expCatSnap = await getDocs(expCatRef);
    for (const d of expCatSnap.docs) {
      if (SIMULATED_EXPENSE_CAT_IDS.has(d.id)) {
        await deleteDoc(doc(db, 'expenseCategories', d.id));
        deletedCount++;
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_all_simulated_purged', 'true');
    }

    return { success: true, deletedCount };
  } catch (err: any) {
    console.error('purgeAllSimulatedData error:', err);
    return { success: false, deletedCount: 0, error: err.message };
  }
}

// Tương thích ngược với các lệnh gọi cũ
export const purgeTestInventoryAndReceipts = purgeAllSimulatedData;
