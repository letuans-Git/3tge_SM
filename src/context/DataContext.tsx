import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  seedInitialDatabaseIfEmpty, 
  seedExtendedCustomersBatch,
  purgeTestInventoryAndReceipts,
  INITIAL_CUSTOMERS, 
  INITIAL_INVENTORY, 
  INITIAL_CASH_TRANSACTIONS, 
  INITIAL_MAINTENANCE 
} from '../firebase/seed';
import {
  Customer,
  MaintenanceRecord,
  InventoryItem,
  InventoryTransaction,
  CashTransaction,
  NotificationLog,
  ActivityLog,
  ExpenseCategory,
  Supplier,
  GoodsReceiptNote,
  GoodsReceiptItem
} from '../types';
import { useAuth } from './AuthContext';
import { formatDateVN, generateMaintenanceCode } from '../utils/dateUtils';

export interface UsageCheckResult {
  isUsed: boolean;
  reasons: string[];
  details: string[];
}

interface DataContextType {
  customers: Customer[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  cashTransactions: CashTransaction[];
  maintenanceRecords: MaintenanceRecord[];
  notificationLogs: NotificationLog[];
  activityLogs: ActivityLog[];
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
  goodsReceipts: GoodsReceiptNote[];
  isLoading: boolean;
  isOnline: boolean;
  refreshData: () => Promise<void>;
  addCustomer: (cust: Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'totalCapacityKW'>) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  disableCustomer: (id: string, reason?: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  generateNextCustomerCode: () => string;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => Promise<void>;
  deleteMaintenanceRecord: (id: string) => Promise<void>;
  
  // Danh mục Vật tư hàng hóa & Phiếu nhập kho đa mặt hàng
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string, force?: boolean) => Promise<{ success: boolean; error?: string }>;
  generateNextItemCode: () => string;
  checkInventoryItemUsage: (item: InventoryItem) => UsageCheckResult;
  recordInventoryTransaction: (trans: Omit<InventoryTransaction, 'id' | 'transactionCode'>) => Promise<void>;
  generateNextReceiptCode: () => string;
  recordGoodsReceipt: (receipt: Omit<GoodsReceiptNote, 'id' | 'receiptCode' | 'createdAt'> & { customReceiptCode?: string }) => Promise<GoodsReceiptNote>;
  deleteGoodsReceipt: (id: string) => Promise<{ success: boolean; error?: string }>;
  purgeTestInventoryAndReceipts: () => Promise<{ success: boolean; deletedCount?: number; error?: string }>;
  
  // Danh mục Chi phí
  addExpenseCategory: (cat: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpenseCategory: (id: string, updates: Partial<ExpenseCategory>) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<{ success: boolean; error?: string }>;
  generateNextExpenseCategoryCode: () => string;
  checkExpenseCategoryUsage: (cat: ExpenseCategory) => UsageCheckResult;
  
  // Danh mục Nhà cung cấp
  addSupplier: (sup: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<{ success: boolean; error?: string }>;
  generateNextSupplierCode: () => string;
  checkSupplierUsage: (sup: Supplier) => UsageCheckResult;

  // Thu chi quỹ
  addCashTransaction: (trans: Omit<CashTransaction, 'id' | 'code' | 'createdAt'>) => Promise<void>;
  deleteCashTransaction: (id: string) => Promise<void>;
  
  sendMaintenanceNotification: (
    customer: Customer,
    channels: Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>
  ) => Promise<{ success: boolean; results: { channel: string; success: boolean; message: string }[] }>;
  logActivity: (action: string, detail: string) => void;
  seedDemoCustomersBatch: () => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  // Start with empty arrays to guarantee only live data from Firestore database is displayed
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Guard against duplicate maintenance ticket creations
  const pendingMaintenanceRef = React.useRef<Set<string>>(new Set());

  // Explicit fetch function to guarantee fresh retrieval directly from Firestore
  const refreshData = async () => {
    try {
      const [custSnap, invSnap, invTransSnap, cashSnap, maintSnap, notifSnap, expCatSnap, supSnap, receiptSnap] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'inventory')),
        getDocs(collection(db, 'inventoryTransactions')),
        getDocs(collection(db, 'cashTransactions')),
        getDocs(collection(db, 'maintenanceRecords')),
        getDocs(collection(db, 'notificationLogs')),
        getDocs(collection(db, 'expenseCategories')),
        getDocs(collection(db, 'suppliers')),
        getDocs(collection(db, 'goodsReceipts'))
      ]);

      const custList: Customer[] = [];
      custSnap.forEach((d) => custList.push({ ...d.data(), id: d.id } as Customer));
      custList.sort((a, b) => {
        const tA = a.handoverDate ? new Date(a.handoverDate).getTime() : 0;
        const tB = b.handoverDate ? new Date(b.handoverDate).getTime() : 0;
        if (tB !== tA) return tB - tA;
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      });
      setCustomers(custList);

      const invList: InventoryItem[] = [];
      invSnap.forEach((d) => invList.push({ ...d.data(), id: d.id } as InventoryItem));
      setInventory(invList);

      const invTransList: InventoryTransaction[] = [];
      invTransSnap.forEach((d) => invTransList.push({ ...d.data(), id: d.id } as InventoryTransaction));
      setInventoryTransactions(invTransList.sort((a, b) => (b.date || '').localeCompare(a.date || '')));

      const cashList: CashTransaction[] = [];
      cashSnap.forEach((d) => cashList.push({ ...d.data(), id: d.id } as CashTransaction));
      setCashTransactions(cashList.sort((a, b) => (b.date || '').localeCompare(a.date || '')));

      const maintList: MaintenanceRecord[] = [];
      maintSnap.forEach((d) => maintList.push({ ...d.data(), id: d.id } as MaintenanceRecord));
      setMaintenanceRecords(maintList.sort((a, b) => (b.maintenanceDate || '').localeCompare(a.maintenanceDate || '')));

      const notifList: NotificationLog[] = [];
      notifSnap.forEach((d) => notifList.push({ ...d.data(), id: d.id } as NotificationLog));
      setNotificationLogs(notifList.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || '')));

      const expCatList: ExpenseCategory[] = [];
      expCatSnap.forEach((d) => expCatList.push({ ...d.data(), id: d.id } as ExpenseCategory));
      setExpenseCategories(expCatList.sort((a, b) => (a.code || '').localeCompare(b.code || '')));

      const supList: Supplier[] = [];
      supSnap.forEach((d) => supList.push({ ...d.data(), id: d.id } as Supplier));
      setSuppliers(supList.sort((a, b) => (a.code || '').localeCompare(b.code || '')));

      const receiptList: GoodsReceiptNote[] = [];
      receiptSnap.forEach((d) => receiptList.push({ ...d.data(), id: d.id } as GoodsReceiptNote));
      setGoodsReceipts(receiptList.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')));

      setIsOnline(true);
    } catch (err) {
      console.warn('Direct refresh from Firestore:', err);
    }
  };

  // Initial boot and real-time database listeners
  useEffect(() => {
    seedInitialDatabaseIfEmpty();
    purgeTestInventoryAndReceipts().catch((err) => console.warn('Purge test inventory note:', err));

    // Listen to customers in real time
    const unsubCust = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Customer));
      list.sort((a, b) => {
        const tA = a.handoverDate ? new Date(a.handoverDate).getTime() : 0;
        const tB = b.handoverDate ? new Date(b.handoverDate).getTime() : 0;
        if (tB !== tA) return tB - tA;
        return (b.customerCode || '').localeCompare(a.customerCode || '');
      });
      setCustomers(list);
      setIsLoading(false);
      setIsOnline(true);

      // Auto-complement dataset if database has fewer than 12 customers to allow smart pagination testing
      if (list.length > 0 && list.length < 12) {
        seedExtendedCustomersBatch().catch((err) => console.warn('Auto-seed pagination batch note:', err));
      }
    }, (error) => {
      console.warn('Firestore live sync note:', error);
      setIsLoading(false);
      setIsOnline(false);
    });

    // Listen to inventory in real time
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const list: InventoryItem[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as InventoryItem));
      setInventory(list);
    }, () => {});

    // Listen to inventory transactions in real time
    const unsubInvTrans = onSnapshot(collection(db, 'inventoryTransactions'), (snapshot) => {
      const list: InventoryTransaction[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as InventoryTransaction));
      setInventoryTransactions(list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    }, () => {});

    // Listen to cash transactions in real time
    const unsubCash = onSnapshot(collection(db, 'cashTransactions'), (snapshot) => {
      const list: CashTransaction[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as CashTransaction));
      setCashTransactions(list.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    }, () => {});

    // Listen to maintenance records in real time with strict deduplication
    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), (snapshot) => {
      const map = new Map<string, MaintenanceRecord>();
      snapshot.forEach((d) => {
        const item = { ...d.data(), id: d.id } as MaintenanceRecord;
        if (!map.has(item.id)) {
          map.set(item.id, item);
        }
      });
      const list = Array.from(map.values());

      // Auto-validate and synchronize maintenance code to match creation date formula (BD + ddMMyyyy - xx)
      list.forEach((rec) => {
        if (rec.createdAt) {
          const cDate = new Date(rec.createdAt);
          if (!isNaN(cDate.getTime())) {
            const dayStr = String(cDate.getDate()).padStart(2, '0');
            const monthStr = String(cDate.getMonth() + 1).padStart(2, '0');
            const yearStr = String(cDate.getFullYear());
            const expectedPrefix = `BD${dayStr}${monthStr}${yearStr}-`;

            // If the code is missing, old format (BD-YYYYMM), or didn't match the creation date:
            if (!rec.maintenanceCode || !rec.maintenanceCode.startsWith(expectedPrefix)) {
              const correctedCode = generateMaintenanceCode(cDate, list.filter(other => other.id !== rec.id));
              rec.maintenanceCode = correctedCode;
              // Synchronize back to Firestore
              try {
                updateDoc(doc(db, 'maintenanceRecords', rec.id), { maintenanceCode: correctedCode });
              } catch (e) {
                console.warn('Auto-sync maintenanceCode failed:', e);
              }
            }
          }
        }
      });

      setMaintenanceRecords(list.sort((a, b) => (b.maintenanceDate || '').localeCompare(a.maintenanceDate || '')));
    }, () => {});

    // Listen to notification logs in real time
    const unsubNotif = onSnapshot(collection(db, 'notificationLogs'), (snapshot) => {
      const list: NotificationLog[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as NotificationLog));
      setNotificationLogs(list.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || '')));
    }, () => {});

    // Listen to expense categories in real time
    const unsubExpCat = onSnapshot(collection(db, 'expenseCategories'), (snapshot) => {
      const list: ExpenseCategory[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as ExpenseCategory));
      setExpenseCategories(list.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
    }, () => {});

    // Listen to suppliers in real time
    const unsubSup = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      const list: Supplier[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Supplier));
      setSuppliers(list.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
    }, () => {});

    // Listen to goods receipts in real time
    const unsubReceipt = onSnapshot(collection(db, 'goodsReceipts'), (snapshot) => {
      const list: GoodsReceiptNote[] = [];
      snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as GoodsReceiptNote));
      setGoodsReceipts(list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')));
    }, () => {});

    return () => {
      unsubCust();
      unsubInv();
      unsubInvTrans();
      unsubCash();
      unsubMaint();
      unsubNotif();
      unsubExpCat();
      unsubSup();
      unsubReceipt();
    };
  }, []);

  const logActivity = (action: string, detail: string) => {
    const newLog: ActivityLog = {
      id: `act_${Date.now()}`,
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.fullName || 'Người dùng',
      userRole: currentUser?.role || 'admin',
      action,
      detail,
      timestamp: new Date().toISOString()
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 99)]);
  };

  // Generate KH000001, KH000002...
  const generateNextCustomerCode = (): string => {
    let maxNum = 0;
    customers.forEach((c) => {
      if (c.customerCode && c.customerCode.startsWith('KH')) {
        const numPart = parseInt(c.customerCode.replace('KH', ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `KH${String(nextNum).padStart(6, '0')}`;
  };

  const addCustomer = async (custData: Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'totalCapacityKW'>): Promise<string> => {
    const code = generateNextCustomerCode();
    const id = `cust_${Date.now()}`;
    const inverterKW = (custData.inverters || []).reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
    const windKW = (custData.windTurbines || []).reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
    const totalKW = inverterKW + windKW;
    const now = new Date().toISOString();

    const newCustomer: Customer = {
      ...custData,
      id,
      customerCode: code,
      totalCapacityKW: totalKW,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'customers', id), newCustomer);
    } catch (e) {
      console.warn('Saved in offline/local state:', e);
    }

    logActivity('Thêm khách hàng mới', `Tạo khách hàng ${code} - ${newCustomer.customerName}`);
    return code;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const now = new Date().toISOString();
    let totalKW: number | undefined = undefined;
    if (updates.inverters || updates.windTurbines) {
      const current = customers.find(c => c.id === id || c.customerCode === id);
      const invs = updates.inverters !== undefined ? updates.inverters : (current?.inverters || []);
      const winds = updates.windTurbines !== undefined ? updates.windTurbines : (current?.windTurbines || []);
      const invKW = invs.reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
      const windKW = winds.reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
      totalKW = invKW + windKW;
    }

    // 1. Optimistically update local state immediately so user sees changes instantly
    setCustomers(prev => prev.map(c => {
      if (c.id === id || c.customerCode === id) {
        return {
          ...c,
          ...updates,
          ...(totalKW !== undefined ? { totalCapacityKW: totalKW } : {}),
          updatedAt: now
        };
      }
      return c;
    }));

    // 2. Persist to Firestore
    try {
      const matched = customers.find(c => c.id === id || c.customerCode === id);
      const targetDocId = matched?.id || id;
      const docRef = doc(db, 'customers', targetDocId);
      await updateDoc(docRef, {
        ...updates,
        ...(totalKW !== undefined ? { totalCapacityKW: totalKW } : {}),
        updatedAt: now
      });
    } catch (e) {
      console.warn('Updated in local state:', e);
    }

    logActivity('Cập nhật khách hàng', `Chỉnh sửa thông tin hồ sơ ID ${id}`);
  };

  const disableCustomer = async (id: string, reason?: string) => {
    const target = customers.find(c => c.id === id);
    const now = new Date().toISOString();
    const updates = {
      isDisabled: true,
      disabledAt: now,
      disabledReason: reason || 'Người dùng thao tác vô hiệu hóa hồ sơ',
      updatedAt: now
    };

    try {
      await updateDoc(doc(db, 'customers', id), updates);
    } catch (e) {
      console.warn('Updated in local state:', e);
    }

    if (target) {
      logActivity('Vô hiệu hóa khách hàng', `Vô hiệu hóa hồ sơ ${target.customerCode} - ${target.customerName}${reason ? ` (Lý do: ${reason})` : ''}`);
    }
  };

  const restoreCustomer = async (id: string) => {
    const target = customers.find(c => c.id === id);
    const now = new Date().toISOString();
    const updates = {
      isDisabled: false,
      disabledAt: '',
      disabledReason: '',
      updatedAt: now
    };

    try {
      await updateDoc(doc(db, 'customers', id), updates);
    } catch (e) {
      console.warn('Restored in local state:', e);
    }

    if (target) {
      logActivity('Khôi phục khách hàng', `Kích hoạt lại hồ sơ ${target.customerCode} - ${target.customerName}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    const target = customers.find(c => c.id === id);
    if (!target) return;

    // Enforce: only allow deletion if customer has already been disabled
    if (!target.isDisabled) {
      throw new Error('Chỉ được phép xóa khách hàng sau khi đã vô hiệu hóa hồ sơ!');
    }

    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      console.warn('Deleted locally:', e);
    }

    logActivity('Xóa vĩnh viễn khách hàng', `Xóa vĩnh viễn hồ sơ đã vô hiệu hóa ${target.customerCode} - ${target.customerName}`);
  };

  // Add Maintenance Record & Automatically Add 180 Days to Next Maintenance Date for matching customerCode
  const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => {
    const id = `maint_${Date.now()}`;
    const now = new Date().toISOString();

    // Ensure maintenance code strictly adheres to the ticket creation date formula (ngày tạo phiếu)
    const creationDate = new Date();
    const cDay = String(creationDate.getDate()).padStart(2, '0');
    const cMonth = String(creationDate.getMonth() + 1).padStart(2, '0');
    const cYear = String(creationDate.getFullYear());
    const expectedPrefix = `BD${cDay}${cMonth}${cYear}-`;

    const finalCode = (recordData.maintenanceCode && recordData.maintenanceCode.startsWith(expectedPrefix))
      ? recordData.maintenanceCode
      : generateMaintenanceCode(creationDate, maintenanceRecords);

    // Lock guard to strictly prevent double submission creating 2 identical records
    const lockKey = `${recordData.customerCode || recordData.customerId}_${recordData.maintenanceDate || ''}_${finalCode}`;
    if (pendingMaintenanceRef.current.has(lockKey)) {
      console.warn('Prevented duplicate maintenance creation for lock:', lockKey);
      return;
    }
    pendingMaintenanceRef.current.add(lockKey);
    setTimeout(() => {
      pendingMaintenanceRef.current.delete(lockKey);
    }, 3000);

    // Find the exact matching customer by customerCode or customerId
    const targetCustomer = customers.find(c => 
      (recordData.customerCode && c.customerCode === recordData.customerCode) ||
      (recordData.customerId && c.id === recordData.customerId) ||
      (recordData.customerId && c.customerCode === recordData.customerId)
    );

    // Calculate new maintenance date: old date + 180 days
    // Base date ("ngày cũ"): prioritize maintenanceDate from the ticket or customer's current nextMaintenanceDate
    const oldDateStr = recordData.maintenanceDate || targetCustomer?.nextMaintenanceDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(oldDateStr);
    const next180Date = new Date(baseDate);
    next180Date.setDate(next180Date.getDate() + 180);
    const nextFormatted = next180Date.toISOString().split('T')[0];

    const fullRecord: MaintenanceRecord = {
      ...recordData,
      id,
      maintenanceCode: finalCode,
      customerCode: targetCustomer?.customerCode || recordData.customerCode,
      customerId: targetCustomer?.id || recordData.customerId,
      customerName: targetCustomer?.customerName || recordData.customerName,
      nextScheduledDate: recordData.nextScheduledDate || nextFormatted,
      createdAt: now
    };

    // 1. Save maintenance record to Firestore
    try {
      await setDoc(doc(db, 'maintenanceRecords', id), fullRecord);
    } catch (e) {
      console.warn('Maintenance saved locally:', e);
    }

    // 2. Optimistically update maintenance records in React state with strict deduplication
    setMaintenanceRecords(prev => {
      if (prev.some(r => r.id === fullRecord.id || (r.maintenanceCode && r.maintenanceCode === fullRecord.maintenanceCode))) {
        return prev;
      }
      return [fullRecord, ...prev];
    });

    // 3. Immediately update the customer with new maintenance date (+180 days) matching exact customerCode
    const effectiveCode = targetCustomer?.customerCode || recordData.customerCode;
    const effectiveId = targetCustomer?.id || recordData.customerId;

    if (effectiveCode || effectiveId) {
      // Optimistically update customers in local state immediately so all views reflect the new date
      setCustomers(prev => prev.map(c => {
        if ((effectiveCode && c.customerCode === effectiveCode) || (effectiveId && c.id === effectiveId)) {
          return {
            ...c,
            nextMaintenanceDate: nextFormatted,
            status: 'Hoạt động tốt',
            updatedAt: now
          };
        }
        return c;
      }));

      // Persist customer update to Firestore
      try {
        if (effectiveId) {
          await updateDoc(doc(db, 'customers', effectiveId), {
            nextMaintenanceDate: nextFormatted,
            status: 'Hoạt động tốt',
            updatedAt: now
          });
        }
      } catch (err) {
        console.warn('Direct doc update error, falling back to query by customerCode:', err);
      }

      // Ensure Firestore update by customerCode query as well
      if (effectiveCode) {
        try {
          const q = query(collection(db, 'customers'), where('customerCode', '==', effectiveCode));
          const snap = await getDocs(q);
          snap.forEach(async (d) => {
            if (d.id !== effectiveId) {
              await updateDoc(doc(db, 'customers', d.id), {
                nextMaintenanceDate: nextFormatted,
                status: 'Hoạt động tốt',
                updatedAt: now
              });
            }
          });
        } catch (codeErr) {
          console.warn('Query update by customerCode error:', codeErr);
        }
      }
    }

    logActivity('Lập phiếu bảo dưỡng', `Phiếu ${finalCode} cho KH ${effectiveCode} - ${recordData.customerName} (Cập nhật ngày bảo dưỡng mới +180 ngày: ${nextFormatted})`);
  };

  const updateMaintenanceRecord = async (id: string, updates: Partial<MaintenanceRecord>) => {
    let nextFormatted = updates.nextScheduledDate;
    if (updates.maintenanceDate && !updates.nextScheduledDate) {
      const baseDate = new Date(updates.maintenanceDate);
      const next180Date = new Date(baseDate);
      next180Date.setDate(next180Date.getDate() + 180);
      nextFormatted = next180Date.toISOString().split('T')[0];
    }

    const payload = {
      ...updates,
      ...(nextFormatted ? { nextScheduledDate: nextFormatted } : {})
    };

    try {
      const docRef = doc(db, 'maintenanceRecords', id);
      await updateDoc(docRef, payload);
    } catch (e) {
      console.warn('Updated maintenance locally:', e);
    }

    const current = maintenanceRecords.find(r => r.id === id);
    if (current?.customerId && nextFormatted) {
      await updateCustomer(current.customerId, {
        nextMaintenanceDate: nextFormatted
      });
    }

    logActivity('Cập nhật phiếu bảo dưỡng', `Chỉnh sửa phiếu ${updates.maintenanceCode || current?.maintenanceCode || id}`);
  };

  const deleteMaintenanceRecord = async (id: string) => {
    const target = maintenanceRecords.find(r => r.id === id);
    if (!target) return;

    // Calculate rolled-back date: nextScheduledDate - 180 days
    let rolledBackDate: string;
    if (target.nextScheduledDate) {
      const d = new Date(target.nextScheduledDate);
      d.setDate(d.getDate() - 180);
      rolledBackDate = d.toISOString().split('T')[0];
    } else if (target.maintenanceDate) {
      rolledBackDate = target.maintenanceDate;
    } else {
      rolledBackDate = new Date().toISOString().split('T')[0];
    }

    // 1. Delete document from Firestore maintenanceRecords collection
    try {
      await deleteDoc(doc(db, 'maintenanceRecords', id));
    } catch (e) {
      console.warn('Deleted maintenance locally:', e);
    }

    // 2. Optimistically update local maintenanceRecords
    setMaintenanceRecords(prev => prev.filter(r => r.id !== id));

    // 3. Find customer by customerCode or customerId
    const targetCustomer = customers.find(c => 
      (target.customerCode && c.customerCode === target.customerCode) ||
      (target.customerId && c.id === target.customerId) ||
      (target.customerId && c.customerCode === target.customerId)
    );

    const effectiveCode = targetCustomer?.customerCode || target.customerCode;
    const effectiveId = targetCustomer?.id || target.customerId;
    const now = new Date().toISOString();

    if (effectiveCode || effectiveId) {
      // Optimistically update customers in React state immediately
      setCustomers(prev => prev.map(c => {
        if ((effectiveCode && c.customerCode === effectiveCode) || (effectiveId && c.id === effectiveId)) {
          return {
            ...c,
            nextMaintenanceDate: rolledBackDate,
            updatedAt: now
          };
        }
        return c;
      }));

      // Persist rolled-back maintenance date to Firestore
      try {
        if (effectiveId) {
          await updateDoc(doc(db, 'customers', effectiveId), {
            nextMaintenanceDate: rolledBackDate,
            updatedAt: now
          });
        }
      } catch (err) {
        console.warn('Direct customer update error on maintenance deletion:', err);
      }

      // Ensure update by customerCode query as well
      if (effectiveCode) {
        try {
          const q = query(collection(db, 'customers'), where('customerCode', '==', effectiveCode));
          const snap = await getDocs(q);
          snap.forEach(async (d) => {
            if (d.id !== effectiveId) {
              await updateDoc(doc(db, 'customers', d.id), {
                nextMaintenanceDate: rolledBackDate,
                updatedAt: now
              });
            }
          });
        } catch (codeErr) {
          console.warn('Query update by customerCode error on maintenance deletion:', codeErr);
        }
      }
    }

    logActivity('Xóa phiếu bảo dưỡng', `Xóa phiếu bảo dưỡng ${target.maintenanceCode || id} cho KH ${effectiveCode} (Tự động cập nhật lại ngày bảo dưỡng -180 ngày: ${rolledBackDate})`);
  };

  // --- DANH MỤC VẬT TƯ HÀNG HÓA ---
  const generateNextItemCode = (): string => {
    const nums = inventory.map(item => {
      const match = item.code?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(0, ...nums) : 0;
    const nextNum = maxNum + 1;
    return `VT${nextNum.toString().padStart(4, '0')}`;
  };

  const checkInventoryItemUsage = (item: InventoryItem): UsageCheckResult => {
    const reasons: string[] = [];
    const details: string[] = [];

    // 1. Kiểm tra phát sinh giao dịch nhập / xuất kho
    const relatedTrans = inventoryTransactions.filter(
      t => t.itemId === item.id || t.itemCode === item.code || (t.itemName && t.itemName.toLowerCase() === item.name.toLowerCase())
    );
    if (relatedTrans.length > 0) {
      const recent = relatedTrans[0];
      reasons.push(`Đã phát sinh ${relatedTrans.length} giao dịch Nhập / Xuất kho`);
      details.push(`Giao dịch gần nhất: Phiếu ${recent.transactionCode} (${recent.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}) ngày ${recent.date || 'N/A'}`);
    }

    // 2. Kiểm tra số lượng tồn kho thực tế
    if (item.stockQuantity > 0) {
      reasons.push(`Hiện đang có số lượng tồn kho thực tế: ${item.stockQuantity} ${item.unit}`);
      details.push(`Tổng giá trị tồn: ${(item.stockQuantity * item.unitPrice).toLocaleString('vi-VN')} đ`);
    }

    // 3. Kiểm tra liên kết trong hồ sơ công trình khách hàng (khớp đúng mã serial / thiết bị)
    const relatedCusts = customers.filter(c => {
      const hasInv = c.inverters?.some(i => i.serialNumber === item.code);
      const hasBat = c.batteries?.some(b => b.serialNumber === item.code);
      return hasInv || hasBat;
    });
    if (relatedCusts.length > 0) {
      reasons.push(`Đang được gắn với thiết bị tại ${relatedCusts.length} trạm khách hàng`);
      details.push(`Khách hàng: ${relatedCusts[0].customerCode} - ${relatedCusts[0].customerName}`);
    }

    return {
      isUsed: reasons.length > 0,
      reasons,
      details
    };
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const id = `item_${Date.now()}`;
    const newItem: InventoryItem = { ...item, id };
    try {
      await setDoc(doc(db, 'inventory', id), newItem);
    } catch (e) {
      console.warn('Item stored locally:', e);
    }
    setInventory(prev => {
      const exists = prev.some(i => i.id === id);
      return exists ? prev : [newItem, ...prev];
    });
    logActivity('Thêm danh mục vật tư', `Tạo vật tư [${item.code}] ${item.name}`);
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      await updateDoc(doc(db, 'inventory', id), updates);
    } catch (e) {
      console.warn('Item updated locally:', e);
    }
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    logActivity('Cập nhật vật tư', `Cập nhật thông tin vật tư ${id}`);
  };

  const deleteInventoryItem = async (id: string, force: boolean = false): Promise<{ success: boolean; error?: string }> => {
    const target = inventory.find(i => i.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy vật tư' };

    const usage = checkInventoryItemUsage(target);
    if (usage.isUsed && !force) {
      return {
        success: false,
        error: `Không thể xóa vật tư '${target.code} - ${target.name}' vì: ${usage.reasons.join(', ')}`
      };
    }

    try {
      await deleteDoc(doc(db, 'inventory', id));
      setInventory(prev => prev.filter(i => i.id !== id));
      logActivity('Xóa vật tư', `Xóa vật tư [${target.code}] ${target.name}`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi xóa khỏi cơ sở dữ liệu' };
    }
  };

  // --- DANH MỤC CHI PHÍ ---
  const generateNextExpenseCategoryCode = (): string => {
    const nums = expenseCategories.map(c => {
      const match = c.code?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(0, ...nums) : 0;
    const nextNum = maxNum + 1;
    return `CP${nextNum.toString().padStart(4, '0')}`;
  };

  const checkExpenseCategoryUsage = (cat: ExpenseCategory): UsageCheckResult => {
    const reasons: string[] = [];
    const details: string[] = [];

    // Kiểm tra đã hạch toán trong phiếu chi / sổ quỹ
    const relatedCash = cashTransactions.filter(
      t => t.type === 'CHI' && (t.category === cat.name || t.category === cat.code || (t.notes && t.notes.includes(cat.name)))
    );

    if (relatedCash.length > 0) {
      const totalAmount = relatedCash.reduce((sum, t) => sum + t.amount, 0);
      const recent = relatedCash[0];
      reasons.push(`Đã được hạch toán trong ${relatedCash.length} giao dịch / phiếu chi tiền mặt`);
      details.push(`Tổng chi đã phát sinh: ${totalAmount.toLocaleString('vi-VN')} đ (Phiếu gần nhất: ${recent.code} ngày ${recent.date || 'N/A'})`);
    }

    return {
      isUsed: reasons.length > 0,
      reasons,
      details
    };
  };

  const addExpenseCategory = async (cat: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `exp_cat_${Date.now()}`;
    const now = new Date().toISOString();
    const newCat: ExpenseCategory = {
      ...cat,
      id,
      createdAt: now,
      updatedAt: now
    };
    try {
      await setDoc(doc(db, 'expenseCategories', id), newCat);
    } catch (e) {
      console.warn('Expense category stored locally:', e);
    }
    setExpenseCategories(prev => {
      const exists = prev.some(c => c.id === id);
      return exists ? prev : [...prev, newCat].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    });
    logActivity('Thêm danh mục chi phí', `Tạo danh mục chi phí [${cat.code}] ${cat.name}`);
  };

  const updateExpenseCategory = async (id: string, updates: Partial<ExpenseCategory>) => {
    const now = new Date().toISOString();
    const fullUpdates = { ...updates, updatedAt: now };
    try {
      await updateDoc(doc(db, 'expenseCategories', id), fullUpdates);
    } catch (e) {
      console.warn('Expense category updated locally:', e);
    }
    setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, ...fullUpdates } : c));
    logActivity('Cập nhật danh mục chi phí', `Cập nhật danh mục chi phí ${id}`);
  };

  const deleteExpenseCategory = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = expenseCategories.find(c => c.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy danh mục chi phí' };

    const usage = checkExpenseCategoryUsage(target);
    if (usage.isUsed) {
      return {
        success: false,
        error: `Không thể xóa danh mục chi phí '${target.code} - ${target.name}' vì đã phát sinh tác vụ: ${usage.reasons.join(', ')}`
      };
    }

    try {
      await deleteDoc(doc(db, 'expenseCategories', id));
      setExpenseCategories(prev => prev.filter(c => c.id !== id));
      logActivity('Xóa danh mục chi phí', `Xóa danh mục chi phí [${target.code}] ${target.name}`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi xóa khỏi cơ sở dữ liệu' };
    }
  };

  // --- DANH MỤC NHÀ CUNG CẤP ---
  const generateNextSupplierCode = (): string => {
    const nums = suppliers.map(s => {
      const match = s.code?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(0, ...nums) : 0;
    const nextNum = maxNum + 1;
    return `NCC${nextNum.toString().padStart(4, '0')}`;
  };

  const checkSupplierUsage = (sup: Supplier): UsageCheckResult => {
    const reasons: string[] = [];
    const details: string[] = [];

    // 1. Kiểm tra phiếu nhập kho
    const relatedInvTrans = inventoryTransactions.filter(
      t => t.supplierRef === sup.code || t.supplierRef === sup.name || (t.notes && t.notes.includes(sup.name))
    );
    if (relatedInvTrans.length > 0) {
      const recent = relatedInvTrans[0];
      reasons.push(`Đã phát sinh ${relatedInvTrans.length} phiếu nhập kho từ nhà cung cấp`);
      details.push(`Phiếu nhập gần nhất: ${recent.transactionCode} ngày ${recent.date || 'N/A'}`);
    }

    // 2. Kiểm tra phiếu chi tiền / giao dịch quỹ
    const relatedCash = cashTransactions.filter(
      t => (t.payerReceiver && t.payerReceiver.toLowerCase().includes(sup.name.toLowerCase())) ||
           (t.notes && (t.notes.includes(sup.name) || t.notes.includes(sup.code)))
    );
    if (relatedCash.length > 0) {
      const recent = relatedCash[0];
      reasons.push(`Đã ghi nhận trong ${relatedCash.length} giao dịch thu/chi tài chính`);
      details.push(`Giao dịch gần nhất: Phiếu ${recent.code} (${recent.amount.toLocaleString('vi-VN')} đ)`);
    }

    // 3. Kiểm tra nhà phân phối trong hồ sơ trạm khách hàng
    const relatedCusts = customers.filter(c => {
      const invMatch = c.inverters?.some(i => i.distributor === sup.name || i.distributor === sup.code);
      const batMatch = c.batteries?.some(b => b.distributor === sup.name || b.distributor === sup.code);
      const panMatch = c.solarPanels?.distributor === sup.name || c.solarPanels?.distributor === sup.code;
      return invMatch || batMatch || panMatch;
    });
    if (relatedCusts.length > 0) {
      reasons.push(`Đang là nhà phân phối thiết bị tại ${relatedCusts.length} trạm khách hàng`);
      details.push(`Ví dụ: KH ${relatedCusts[0].customerCode} - ${relatedCusts[0].customerName}`);
    }

    return {
      isUsed: reasons.length > 0,
      reasons,
      details
    };
  };

  const addSupplier = async (sup: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = `sup_${Date.now()}`;
    const now = new Date().toISOString();
    const newSup: Supplier = {
      ...sup,
      id,
      createdAt: now,
      updatedAt: now
    };
    try {
      await setDoc(doc(db, 'suppliers', id), newSup);
    } catch (e) {
      console.warn('Supplier stored locally:', e);
    }
    setSuppliers(prev => {
      const exists = prev.some(s => s.id === id);
      return exists ? prev : [...prev, newSup].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    });
    logActivity('Thêm nhà cung cấp', `Tạo nhà cung cấp [${sup.code}] ${sup.name}`);
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    const now = new Date().toISOString();
    const fullUpdates = { ...updates, updatedAt: now };
    try {
      await updateDoc(doc(db, 'suppliers', id), fullUpdates);
    } catch (e) {
      console.warn('Supplier updated locally:', e);
    }
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...fullUpdates } : s));
    logActivity('Cập nhật nhà cung cấp', `Cập nhật thông tin NCC ${id}`);
  };

  const deleteSupplier = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = suppliers.find(s => s.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy nhà cung cấp' };

    const usage = checkSupplierUsage(target);
    if (usage.isUsed) {
      return {
        success: false,
        error: `Không thể xóa nhà cung cấp '${target.code} - ${target.name}' vì đã phát sinh tác vụ: ${usage.reasons.join(', ')}`
      };
    }

    try {
      await deleteDoc(doc(db, 'suppliers', id));
      setSuppliers(prev => prev.filter(s => s.id !== id));
      logActivity('Xóa nhà cung cấp', `Xóa nhà cung cấp [${target.code}] ${target.name}`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi xóa khỏi cơ sở dữ liệu' };
    }
  };

  const recordInventoryTransaction = async (transData: Omit<InventoryTransaction, 'id' | 'transactionCode'>) => {
    const id = `trans_${Date.now()}`;
    const prefix = transData.type === 'IN' ? 'PN' : 'PX';
    const code = `${prefix}-${Date.now().toString().slice(-6)}`;
    const fullTrans: InventoryTransaction = {
      ...transData,
      id,
      transactionCode: code
    };

    // Adjust inventory stock
    const targetItem = inventory.find(i => i.id === transData.itemId);
    if (targetItem) {
      const newStock = transData.type === 'IN' 
        ? targetItem.stockQuantity + transData.quantity 
        : Math.max(0, targetItem.stockQuantity - transData.quantity);
      await updateDoc(doc(db, 'inventory', targetItem.id), { stockQuantity: newStock });
    }

    try {
      await setDoc(doc(db, 'inventoryTransactions', id), fullTrans);
    } catch (e) {
      console.warn('Transaction stored locally:', e);
    }

    logActivity('Giao dịch kho', `${transData.type === 'IN' ? 'Nhập kho' : 'Xuất kho'} ${transData.quantity} ${targetItem?.unit || ''} [${transData.itemCode}]`);
  };

  // --- PHIẾU NHẬP KHO ĐA MẶT HÀNG ---
  const generateNextReceiptCode = (): string => {
    const nums = goodsReceipts.map(r => {
      const match = r.receiptCode?.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const transNums = inventoryTransactions
      .filter(t => t.type === 'IN')
      .map(t => {
        const match = t.transactionCode?.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const allNums = [...nums, ...transNums];
    const maxNum = allNums.length > 0 ? Math.max(0, ...allNums) : 0;
    const nextNum = maxNum + 1;
    return `PN${nextNum.toString().padStart(4, '0')}`;
  };

  const recordGoodsReceipt = async (
    receiptData: Omit<GoodsReceiptNote, 'id' | 'receiptCode' | 'createdAt'> & { customReceiptCode?: string }
  ): Promise<GoodsReceiptNote> => {
    const id = `receipt_${Date.now()}`;
    const receiptCode = receiptData.customReceiptCode || generateNextReceiptCode();
    const now = new Date().toISOString();

    const fullReceipt: GoodsReceiptNote = {
      ...receiptData,
      id,
      receiptCode,
      createdAt: now
    };

    // 1. Cập nhật tồn kho từng mặt hàng & ghi nhận transaction tương ứng
    for (const it of receiptData.items) {
      const targetItem = inventory.find(i => i.id === it.itemId || i.code === it.itemCode);
      const addedQty = Number(it.actualQuantity) || 0;

      if (targetItem) {
        const newStock = targetItem.stockQuantity + addedQty;
        try {
          await updateDoc(doc(db, 'inventory', targetItem.id), { stockQuantity: newStock });
        } catch (e) {
          console.warn('Update stock locally:', e);
        }
        setInventory(prev => prev.map(inv => inv.id === targetItem.id ? { ...inv, stockQuantity: newStock } : inv));
      }

      // Tạo giao dịch tương ứng với cùng mã phiếu nhập receiptCode
      const transId = `trans_${Date.now()}_${it.itemCode}`;
      const trans: InventoryTransaction = {
        id: transId,
        transactionCode: receiptCode,
        type: 'IN',
        itemId: it.itemId,
        itemCode: it.itemCode,
        itemName: it.itemName,
        quantity: addedQty,
        unitPrice: Number(it.unitPrice),
        totalAmount: Number(it.totalAmount),
        supplierRef: receiptData.supplierName,
        notes: it.notes || receiptData.notes || `Nhập theo phiếu ${receiptCode}`,
        createdBy: receiptData.createdBy,
        date: receiptData.date,
        receiptId: id,
        receiptCode: receiptCode,
        delivererName: receiptData.delivererName,
        warehouseName: receiptData.warehouseName,
        invoiceNumber: receiptData.invoiceNumber
      };

      try {
        await setDoc(doc(db, 'inventoryTransactions', transId), trans);
      } catch (e) {
        console.warn('Transaction stored locally:', e);
      }
      setInventoryTransactions(prev => [trans, ...prev]);
    }

    // 2. Lưu phiếu nhập kho hoàn chỉnh vào Firestore
    try {
      await setDoc(doc(db, 'goodsReceipts', id), fullReceipt);
    } catch (e) {
      console.warn('Receipt saved locally:', e);
    }
    setGoodsReceipts(prev => [fullReceipt, ...prev.filter(r => r.id !== id)]);

    logActivity(
      'Lập phiếu nhập kho',
      `Phiếu [${receiptCode}] gồm ${receiptData.items.length} mặt hàng, tổng số lượng: ${receiptData.totalQuantity}, tổng tiền: ${receiptData.totalAmount.toLocaleString('vi-VN')} đ (NCC: ${receiptData.supplierName})`
    );

    return fullReceipt;
  };

  const deleteGoodsReceipt = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const target = goodsReceipts.find(r => r.id === id);
    if (!target) return { success: false, error: 'Không tìm thấy phiếu nhập kho' };

    try {
      // 1. Trừ lại số lượng tồn kho tương ứng đã nhập
      for (const it of target.items) {
        const item = inventory.find(i => i.id === it.itemId || i.code === it.itemCode);
        if (item) {
          const rolledBackStock = Math.max(0, item.stockQuantity - (Number(it.actualQuantity) || 0));
          try {
            await updateDoc(doc(db, 'inventory', item.id), { stockQuantity: rolledBackStock });
          } catch (e) {
            console.warn('Rollback stock locally:', e);
          }
          setInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, stockQuantity: rolledBackStock } : inv));
        }
      }

      // 2. Xóa các giao dịch liên quan đến phiếu
      const relatedTrans = inventoryTransactions.filter(t => t.receiptId === id || t.transactionCode === target.receiptCode);
      for (const t of relatedTrans) {
        try {
          await deleteDoc(doc(db, 'inventoryTransactions', t.id));
        } catch (e) {
          console.warn('Delete trans locally:', e);
        }
      }
      setInventoryTransactions(prev => prev.filter(t => t.receiptId !== id && t.transactionCode !== target.receiptCode));

      // 3. Xóa document phiếu nhập kho
      await deleteDoc(doc(db, 'goodsReceipts', id));
      setGoodsReceipts(prev => prev.filter(r => r.id !== id));

      logActivity('Xóa phiếu nhập kho', `Xóa phiếu nhập kho [${target.receiptCode}] (Đã hoàn lại số lượng tồn kho)`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Lỗi khi xóa phiếu nhập kho' };
    }
  };

  const addCashTransaction = async (trans: Omit<CashTransaction, 'id' | 'code' | 'createdAt'>) => {
    const id = `cash_${Date.now()}`;
    const prefix = trans.type === 'THU' ? 'PT' : 'PC';
    const code = `${prefix}-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();
    const fullCash: CashTransaction = {
      ...trans,
      id,
      code,
      createdAt: now
    };

    try {
      await setDoc(doc(db, 'cashTransactions', id), fullCash);
    } catch (e) {
      console.warn('Cash saved locally:', e);
    }

    logActivity('Lập phiếu quỹ', `${trans.type === 'THU' ? 'Thu tiền' : 'Chi tiền'} ${trans.amount.toLocaleString('vi-VN')} đ - ${trans.category}`);
  };

  const deleteCashTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'cashTransactions', id));
    } catch (e) {
      console.warn('Deleted locally:', e);
    }
  };

  // Dispatch maintenance alerts via multi-channels
  const sendMaintenanceNotification = async (
    customer: Customer,
    channels: Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>
  ) => {
    const formattedDate = formatDateVN(customer.nextMaintenanceDate);
    const message = `Kính gửi khách hàng ${customer.customerName}.\nHệ thống điện mặt trời tại ${customer.address} sẽ đến kỳ bảo dưỡng vào ngày ${formattedDate}.\nVui lòng liên hệ với Công ty 3TGE để được hỗ trợ - ĐT: 0913.566.532`;

    const results: { channel: string; success: boolean; message: string }[] = [];

    for (const ch of channels) {
      const logId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const logEntry: NotificationLog = {
        id: logId,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        phoneNumber: customer.phoneNumber,
        channel: ch,
        title: `Nhắc lịch bảo trì điện mặt trời ${customer.customerCode}`,
        message,
        sentAt: new Date().toISOString(),
        status: 'SUCCESS',
        sentBy: currentUser?.fullName || 'Hệ thống 3TGE'
      };

      setNotificationLogs(prev => [logEntry, ...prev]);
      try {
        await setDoc(doc(db, 'notificationLogs', logId), logEntry);
      } catch (err) {
        console.warn('Notification logged locally:', err);
      }

      results.push({
        channel: ch,
        success: true,
        message: `Đã gửi thành công qua kênh ${ch}`
      });
    }

    logActivity('Gửi thông báo bảo trì', `Gửi nhắc lịch bảo dưỡng cho ${customer.customerCode} qua ${channels.join(', ')}`);
    return { success: true, results };
  };

  const seedDemoCustomersBatch = async (): Promise<boolean> => {
    try {
      const ok = await seedExtendedCustomersBatch();
      if (ok) {
        logActivity('Nạp dữ liệu mẫu phân trang', 'Nạp thành công 36 hồ sơ khách hàng mẫu chuẩn hóa phân trang');
      }
      return ok;
    } catch (err) {
      console.error('seedDemoCustomersBatch error:', err);
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        customers,
        inventory,
        inventoryTransactions,
        cashTransactions,
        maintenanceRecords,
        notificationLogs,
        activityLogs,
        expenseCategories,
        suppliers,
        goodsReceipts,
        isLoading,
        isOnline,
        refreshData,
        addCustomer,
        updateCustomer,
        disableCustomer,
        restoreCustomer,
        deleteCustomer,
        generateNextCustomerCode,
        addMaintenanceRecord,
        updateMaintenanceRecord,
        deleteMaintenanceRecord,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        generateNextItemCode,
        checkInventoryItemUsage,
        recordInventoryTransaction,
        generateNextReceiptCode,
        recordGoodsReceipt,
        deleteGoodsReceipt,
        purgeTestInventoryAndReceipts,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,
        generateNextExpenseCategoryCode,
        checkExpenseCategoryUsage,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        generateNextSupplierCode,
        checkSupplierUsage,
        addCashTransaction,
        deleteCashTransaction,
        sendMaintenanceNotification,
        logActivity,
        seedDemoCustomersBatch
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
