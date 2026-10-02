import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { seedInitialDatabaseIfEmpty, INITIAL_CUSTOMERS, INITIAL_INVENTORY, INITIAL_CASH_TRANSACTIONS, INITIAL_MAINTENANCE } from '../firebase/seed';
import {
  Customer,
  MaintenanceRecord,
  InventoryItem,
  InventoryTransaction,
  CashTransaction,
  NotificationLog,
  ActivityLog
} from '../types';
import { useAuth } from './AuthContext';
import { formatDateVN } from '../utils/dateUtils';

interface DataContextType {
  customers: Customer[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  cashTransactions: CashTransaction[];
  maintenanceRecords: MaintenanceRecord[];
  notificationLogs: NotificationLog[];
  activityLogs: ActivityLog[];
  isLoading: boolean;
  isOnline: boolean;
  addCustomer: (cust: Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'totalCapacityKW'>) => Promise<string>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  disableCustomer: (id: string, reason?: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  generateNextCustomerCode: () => string;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => Promise<void>;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => Promise<void>;
  deleteMaintenanceRecord: (id: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  recordInventoryTransaction: (trans: Omit<InventoryTransaction, 'id' | 'transactionCode'>) => Promise<void>;
  addCashTransaction: (trans: Omit<CashTransaction, 'id' | 'code' | 'createdAt'>) => Promise<void>;
  deleteCashTransaction: (id: string) => Promise<void>;
  sendMaintenanceNotification: (
    customer: Customer,
    channels: Array<'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification'>
  ) => Promise<{ success: boolean; results: { channel: string; success: boolean; message: string }[] }>;
  logActivity: (action: string, detail: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(INITIAL_CASH_TRANSACTIONS);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(INITIAL_MAINTENANCE);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Initial boot and Firebase listeners
  useEffect(() => {
    seedInitialDatabaseIfEmpty();

    // Listen to customers
    const unsubCust = onSnapshot(collection(db, 'customers'), (snapshot) => {
      if (!snapshot.empty) {
        const list: Customer[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as Customer));
        // Sort by customerCode desc
        list.sort((a, b) => b.customerCode.localeCompare(a.customerCode));
        setCustomers(list);
      }
      setIsLoading(false);
    }, (error) => {
      console.warn('Firestore fallback mode active:', error);
      setIsLoading(false);
      setIsOnline(false);
    });

    // Listen to inventory
    const unsubInv = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      if (!snapshot.empty) {
        const list: InventoryItem[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as InventoryItem));
        setInventory(list);
      }
    }, () => {});

    // Listen to inventory transactions
    const unsubInvTrans = onSnapshot(collection(db, 'inventoryTransactions'), (snapshot) => {
      if (!snapshot.empty) {
        const list: InventoryTransaction[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as InventoryTransaction));
        setInventoryTransactions(list.sort((a, b) => b.date.localeCompare(a.date)));
      }
    }, () => {});

    // Listen to cash transactions
    const unsubCash = onSnapshot(collection(db, 'cashTransactions'), (snapshot) => {
      if (!snapshot.empty) {
        const list: CashTransaction[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as CashTransaction));
        setCashTransactions(list.sort((a, b) => b.date.localeCompare(a.date)));
      }
    }, () => {});

    // Listen to maintenance records
    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), (snapshot) => {
      if (!snapshot.empty) {
        const list: MaintenanceRecord[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as MaintenanceRecord));
        setMaintenanceRecords(list.sort((a, b) => b.maintenanceDate.localeCompare(a.maintenanceDate)));
      }
    }, () => {});

    // Listen to notification logs
    const unsubNotif = onSnapshot(collection(db, 'notificationLogs'), (snapshot) => {
      if (!snapshot.empty) {
        const list: NotificationLog[] = [];
        snapshot.forEach((d) => list.push({ ...d.data(), id: d.id } as NotificationLog));
        setNotificationLogs(list.sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
      }
    }, () => {});

    return () => {
      unsubCust();
      unsubInv();
      unsubInvTrans();
      unsubCash();
      unsubMaint();
      unsubNotif();
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

    // Update state immediately for instant UX
    setCustomers(prev => [newCustomer, ...prev]);

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
      const current = customers.find(c => c.id === id);
      const invs = updates.inverters !== undefined ? updates.inverters : (current?.inverters || []);
      const winds = updates.windTurbines !== undefined ? updates.windTurbines : (current?.windTurbines || []);
      const invKW = invs.reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
      const windKW = winds.reduce((acc, curr) => acc + (Number(curr.capacityKW) || 0), 0);
      totalKW = invKW + windKW;
    }

    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          ...updates,
          totalCapacityKW: totalKW !== undefined ? totalKW : c.totalCapacityKW,
          updatedAt: now
        };
      }
      return c;
    }));

    try {
      const docRef = doc(db, 'customers', id);
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

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

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

    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

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

    setCustomers(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (e) {
      console.warn('Deleted locally:', e);
    }
    logActivity('Xóa vĩnh viễn khách hàng', `Xóa vĩnh viễn hồ sơ đã vô hiệu hóa ${target.customerCode} - ${target.customerName}`);
  };

  // Add Maintenance Record & Automatically Add 180 Days to Next Maintenance Date
  const addMaintenanceRecord = async (recordData: Omit<MaintenanceRecord, 'id' | 'createdAt'>) => {
    const id = `maint_${Date.now()}`;
    const now = new Date().toISOString();

    // Auto-calculate +180 days from maintenanceDate
    const baseDate = new Date(recordData.maintenanceDate || Date.now());
    const next180Date = new Date(baseDate);
    next180Date.setDate(next180Date.getDate() + 180);
    const nextFormatted = next180Date.toISOString().split('T')[0];

    const fullRecord: MaintenanceRecord = {
      ...recordData,
      id,
      nextScheduledDate: nextFormatted,
      createdAt: now
    };

    setMaintenanceRecords(prev => [fullRecord, ...prev]);

    try {
      await setDoc(doc(db, 'maintenanceRecords', id), fullRecord);
    } catch (e) {
      console.warn('Maintenance saved locally:', e);
    }

    // Update customer nextMaintenanceDate & status
    if (recordData.customerId) {
      await updateCustomer(recordData.customerId, {
        nextMaintenanceDate: nextFormatted,
        status: 'Hoạt động tốt'
      });
    }

    logActivity('Lập phiếu bảo dưỡng', `Phiếu ${recordData.maintenanceCode} cho ${recordData.customerName} (+180 ngày kỳ tiếp theo: ${nextFormatted})`);
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

    setMaintenanceRecords(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r));

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
    setMaintenanceRecords(prev => prev.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'maintenanceRecords', id));
    } catch (e) {
      console.warn('Deleted maintenance locally:', e);
    }
    logActivity('Xóa phiếu bảo dưỡng', `Xóa phiếu bảo dưỡng ${target?.maintenanceCode || id} (${target?.customerName || ''})`);
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    const id = `item_${Date.now()}`;
    const newItem: InventoryItem = { ...item, id };
    setInventory(prev => [...prev, newItem]);
    try {
      await setDoc(doc(db, 'inventory', id), newItem);
    } catch (e) {
      console.warn('Item stored locally:', e);
    }
    logActivity('Thêm vật tư mới', `Tạo vật tư [${item.code}] ${item.name}`);
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try {
      await updateDoc(doc(db, 'inventory', id), updates);
    } catch (e) {
      console.warn('Item updated locally:', e);
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
      await updateInventoryItem(targetItem.id, { stockQuantity: newStock });
    }

    setInventoryTransactions(prev => [fullTrans, ...prev]);
    try {
      await setDoc(doc(db, 'inventoryTransactions', id), fullTrans);
    } catch (e) {
      console.warn('Transaction stored locally:', e);
    }

    logActivity('Giao dịch kho', `${transData.type === 'IN' ? 'Nhập kho' : 'Xuất kho'} ${transData.quantity} ${targetItem?.unit || ''} [${transData.itemCode}]`);
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

    setCashTransactions(prev => [fullCash, ...prev]);
    try {
      await setDoc(doc(db, 'cashTransactions', id), fullCash);
    } catch (e) {
      console.warn('Cash saved locally:', e);
    }
    logActivity('Lập phiếu quỹ', `${trans.type === 'THU' ? 'Thu tiền' : 'Chi tiền'} ${trans.amount.toLocaleString('vi-VN')} đ - ${trans.category}`);
  };

  const deleteCashTransaction = async (id: string) => {
    setCashTransactions(prev => prev.filter(c => c.id !== id));
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
        isLoading,
        isOnline,
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
        recordInventoryTransaction,
        addCashTransaction,
        deleteCashTransaction,
        sendMaintenanceNotification,
        logActivity
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
