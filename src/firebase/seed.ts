import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';
import {
  Customer,
  MaintenanceRecord,
  InventoryItem,
  InventoryTransaction,
  CashTransaction,
  NotificationLog,
  ActivityLog,
  UserProfile
} from '../types';

// Initial users stored in Firestore 'users' collection
export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin',
    username: 'admin',
    fullName: 'Lê Tuấn - Quản Trị Viên',
    role: 'admin',
    phone: '0913.566.532',
    email: 'admin@3tge.vn',
    password: '123'
  },
  {
    id: 'user_tech',
    username: 'kythuat',
    fullName: 'Nguyễn Văn Hùng - Trưởng Kỹ Thuật',
    role: 'technician',
    phone: '0988.123.456',
    email: 'kythuat@3tge.vn',
    password: '123'
  },
  {
    id: 'user_cskh',
    username: 'cskh',
    fullName: 'Trần Thị Mai - Chăm Sóc Khách Hàng',
    role: 'cskh',
    phone: '0905.789.012',
    email: 'cskh@3tge.vn',
    password: '123'
  }
];

export const DEFAULT_USERS = INITIAL_USERS;

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_000001',
    customerCode: 'KH000001',
    customerName: 'Công Ty May Xuất Khẩu Hòa An',
    address: 'KCN Tân Bình, Đường Tây Thạnh, P. 15, Q. Tân Phú, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0918.234.567',
    contractNumber: 'HD-2025/3TGE-089',
    inverters: [
      {
        id: 'inv_1',
        serialNumber: 'SUN2000-100KTL-M1',
        brand: 'HUAWEI',
        capacityKW: 100,
        phase: '3 pha',
        distributor: 'HTPRO189'
      },
      {
        id: 'inv_2',
        serialNumber: 'SUN2000-50KTL-M0',
        brand: 'HUAWEI',
        capacityKW: 50,
        phase: '3 pha',
        distributor: 'Hừng Đông Solar'
      }
    ],
    batteries: [
      {
        id: 'bat_1',
        serialNumber: 'LUNA2000-200KWH',
        brand: 'HUAWEI',
        capacityKWh: 200,
        distributor: 'HTPRO189'
      }
    ],
    solarPanels: {
      quantity: 320,
      brand: 'LONGI',
      wattPerPanel: 550,
      distributor: 'Alena Energy'
    },
    handoverDate: '2025-06-15',
    nextMaintenanceDate: '2026-09-25', // 2 days left -> Sắp đến hạn
    warrantyExpiryDate: '2030-06-15',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống điện áp mái công nghiệp 176kWp, vận hành ổn định, theo dõi qua Solar.Fusion app.',
    totalCapacityKW: 150,
    createdAt: '2025-06-15T09:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'cust_000002',
    customerCode: 'KH000002',
    customerName: 'Biệt Thự Anh Trần Quốc Bảo',
    address: 'Khu Đô Thị Phú Mỹ Hưng, Đường Hà Huy Tập, Quận 7, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0903.888.999',
    contractNumber: 'HD-2025/3TGE-102',
    inverters: [
      {
        id: 'inv_3',
        serialNumber: 'GW10K-ET-0199',
        brand: 'GOODWE',
        capacityKW: 10,
        phase: '1 pha',
        distributor: 'SolarV'
      }
    ],
    batteries: [
      {
        id: 'bat_2',
        serialNumber: 'US5000-PYL-9988',
        brand: 'PYLONTECH',
        capacityKWh: 14.4,
        distributor: 'Hừng Đông Solar'
      }
    ],
    solarPanels: {
      quantity: 24,
      brand: 'JINKO',
      wattPerPanel: 540,
      distributor: 'Jinko Solar VN'
    },
    handoverDate: '2025-09-23',
    nextMaintenanceDate: '2026-09-23', // Hôm nay -> Đến hạn bảo dưỡng
    warrantyExpiryDate: '2030-09-23',
    status: 'Cần kiểm tra',
    notes: 'Khách báo ban đêm pin xả chưa tối ưu, cần kỹ thuật kiểm tra cài đặt Hybrid inverter.',
    totalCapacityKW: 10,
    createdAt: '2025-09-23T14:30:00.000Z',
    updatedAt: '2026-09-21T08:00:00.000Z'
  },
  {
    id: 'cust_000003',
    customerCode: 'KH000003',
    customerName: 'Trang Trại Nông Nghiệp Công Nghệ Cao Bình Phước',
    address: 'Ấp 3, Xã Đồng Tâm, Huyện Đồng Phú, Tỉnh Bình Phước',
    province: 'Bình Phước',
    phoneNumber: '0972.112.334',
    contractNumber: 'HD-2024/3TGE-045',
    inverters: [
      {
        id: 'inv_4',
        serialNumber: 'SUN-50K-SG01HP3',
        brand: 'DEYE',
        capacityKW: 50,
        phase: '3 pha',
        distributor: 'HTPRO189'
      }
    ],
    batteries: [
      {
        id: 'bat_3',
        serialNumber: 'BOS-G-DEYE-50KWH',
        brand: 'DEYE',
        capacityKWh: 51.2,
        distributor: 'HTPRO189'
      }
    ],
    solarPanels: {
      quantity: 110,
      brand: 'CANADIAN',
      wattPerPanel: 550,
      distributor: 'Canadian Solar'
    },
    handoverDate: '2024-08-10',
    nextMaintenanceDate: '2026-09-10', // Đã quá hạn 13 ngày -> Quá hạn bảo dưỡng
    warrantyExpiryDate: '2029-08-10',
    status: 'Đang bảo trì',
    notes: 'Quá hạn bảo dưỡng định kỳ mùa mưa bão, cần vệ sinh tấm pin và siết lại dàn khung bu lông.',
    totalCapacityKW: 50,
    createdAt: '2024-08-10T10:00:00.000Z',
    updatedAt: '2026-09-18T16:00:00.000Z'
  },
  {
    id: 'cust_000004',
    customerCode: 'KH000004',
    customerName: 'Khách Sạn & Resort Biển Xanh',
    address: 'Số 89 Đường Trần Phú, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa',
    province: 'Khánh Hòa',
    phoneNumber: '0912.666.777',
    contractNumber: 'HD-2025/3TGE-115',
    inverters: [
      {
        id: 'inv_5',
        serialNumber: 'SG33CX-SUNGROW-01',
        brand: 'SUNGROW',
        capacityKW: 33,
        phase: '3 pha',
        distributor: 'Hừng Đông Solar'
      },
      {
        id: 'inv_6',
        serialNumber: 'SG33CX-SUNGROW-02',
        brand: 'SUNGROW',
        capacityKW: 33,
        phase: '3 pha',
        distributor: 'Hừng Đông Solar'
      }
    ],
    batteries: [],
    solarPanels: {
      quantity: 130,
      brand: 'JA_SOLAR',
      wattPerPanel: 545,
      distributor: 'JA Solar VN'
    },
    handoverDate: '2025-11-05',
    nextMaintenanceDate: '2026-11-05',
    warrantyExpiryDate: '2030-11-05',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống bám tải 66kW không phát ngược lưới.',
    totalCapacityKW: 66,
    createdAt: '2025-11-05T08:00:00.000Z',
    updatedAt: '2026-09-15T09:00:00.000Z'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv_item_1',
    code: 'VT-INV-001',
    name: 'Biến tần Hybrid Huawei SUN2000-10KTL',
    category: 'INVERTER',
    brand: 'HUAWEI',
    unit: 'Bộ',
    stockQuantity: 8,
    minAlertQuantity: 3,
    unitPrice: 42000000,
    location: 'Kho A - Kệ 01',
    notes: 'Chính hãng bảo hành 5 năm'
  },
  {
    id: 'inv_item_2',
    code: 'VT-INV-002',
    name: 'Biến tần Hybrid Deye SUN-12K-SG04LP3',
    category: 'INVERTER',
    brand: 'DEYE',
    unit: 'Bộ',
    stockQuantity: 12,
    minAlertQuantity: 5,
    unitPrice: 48500000,
    location: 'Kho A - Kệ 02',
    notes: 'Hỗ trợ máy phát, ac coupling'
  },
  {
    id: 'inv_item_3',
    code: 'VT-BAT-001',
    name: 'Pin Lưu Trữ Lithium Pylontech US5000 48V 100Ah',
    category: 'BATTERY',
    brand: 'PYLONTECH',
    unit: 'Bộ',
    stockQuantity: 15,
    minAlertQuantity: 4,
    unitPrice: 28500000,
    location: 'Kho B - Kệ 01',
    notes: 'Dung lượng 4.8kWh, vòng đời 6000 chu kỳ'
  },
  {
    id: 'inv_item_4',
    code: 'VT-PAN-001',
    name: 'Tấm pin quang điện Longi Hi-MO 6 Explorer 580W',
    category: 'PANEL',
    brand: 'LONGI',
    unit: 'Tấm',
    stockQuantity: 240,
    minAlertQuantity: 60,
    unitPrice: 1750000,
    location: 'Kho Bãi số 1',
    notes: 'Hiệu suất cao 22.5%, bảo hành 12 năm vật lý'
  },
  {
    id: 'inv_item_5',
    code: 'VT-CAB-001',
    name: 'Cáp điện năng lượng mặt trời DC Solar 1x4.0mm² Leader',
    category: 'CABLE',
    brand: 'LEADER',
    unit: 'Cuộn (100m)',
    stockQuantity: 45,
    minAlertQuantity: 10,
    unitPrice: 1250000,
    location: 'Kho C - Ngăn phụ kiện',
    notes: 'Chống tia UV tiêu chuẩn TUV'
  }
];

export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = [
  {
    id: 'cash_001',
    code: 'PT-202609-001',
    type: 'THU',
    category: 'Thu tiền hợp đồng',
    amount: 150000000,
    paymentMethod: 'Chuyển khoản',
    payerReceiver: 'Công Ty May Xuất Khẩu Hòa An',
    customerRefCode: 'KH000001',
    notes: 'Thu thanh toán đợt 2 theo hợp đồng HD-2025/3TGE-089',
    createdBy: 'Trần Thị Mai',
    date: '2026-09-15',
    createdAt: '2026-09-15T10:00:00.000Z'
  },
  {
    id: 'cash_002',
    code: 'PC-202609-001',
    type: 'CHI',
    category: 'Chi nhập thiết bị',
    amount: 85000000,
    paymentMethod: 'Chuyển khoản',
    payerReceiver: 'Nhà Phân Phối HTPRO189',
    notes: 'Thanh toán đợt nhập 2 bộ biến tần Deye 12KW',
    createdBy: 'Lê Tuấn',
    date: '2026-09-18',
    createdAt: '2026-09-18T14:30:00.000Z'
  },
  {
    id: 'cash_003',
    code: 'PT-202609-002',
    type: 'THU',
    category: 'Thu phí bảo dưỡng',
    amount: 3500000,
    paymentMethod: 'Tiền mặt',
    payerReceiver: 'Anh Trần Quốc Bảo',
    customerRefCode: 'KH000002',
    notes: 'Thu phí vệ sinh tấm pin và cân chỉnh acquy lưu trữ',
    createdBy: 'Nguyễn Văn Hùng',
    date: '2026-09-20',
    createdAt: '2026-09-20T11:00:00.000Z'
  },
  {
    id: 'cash_004',
    code: 'PC-202609-002',
    type: 'CHI',
    category: 'Chi xăng xe đi lại',
    amount: 1200000,
    paymentMethod: 'Tiền mặt',
    payerReceiver: 'Nguyễn Văn Hùng - Kỹ thuật',
    notes: 'Chi phí xăng xe khảo sát và bảo trì công trình Bình Phước',
    createdBy: 'Trần Thị Mai',
    date: '2026-09-21',
    createdAt: '2026-09-21T09:15:00.000Z'
  }
];

export const INITIAL_MAINTENANCE: MaintenanceRecord[] = [
  {
    id: 'maint_001',
    customerCode: 'KH000001',
    customerId: 'cust_000001',
    customerName: 'Công Ty May Xuất Khẩu Hòa An',
    maintenanceCode: 'BD25032026-01',
    maintenanceDate: '2026-03-25',
    technicianName: 'Nguyễn Văn Hùng',
    content: 'Đo kiểm thông số dòng rò, vệ sinh 320 tấm pin mặt trời, siết ốc dàn khung, kiểm tra quạt tản nhiệt Inverter Huawei.',
    inspectionResult: 'Dòng điện DC cân bằng, không phát hiện điểm nóng (hotspot), biến tần hoạt động ở nhiệt độ cho phép 42°C.',
    recommendations: 'Tiếp tục theo dõi cảnh báo qua mạng 4G, thay mỡ tản nhiệt tiếp địa sau 6 tháng tới.',
    nextScheduledDate: '2026-09-25',
    createdAt: '2026-03-25T16:00:00.000Z'
  }
];

// Helper to seed initial business collections if empty (Customers, Inventory, etc.)
// Uses local verification flag to avoid blocking startup with 4 sequential network queries.
export async function seedInitialDatabaseIfEmpty() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('3tge_db_initialized') === 'true') {
      return;
    }

    const custRef = collection(db, 'customers');
    const custSnap = await getDocs(custRef);
    if (!custSnap.empty) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('3tge_db_initialized', 'true');
      }
      return;
    }

    // Only seeds if database is completely empty
    await Promise.all([
      ...INITIAL_CUSTOMERS.map(cust => setDoc(doc(db, 'customers', cust.id), cust)),
      ...INITIAL_INVENTORY.map(item => setDoc(doc(db, 'inventory', item.id), item)),
      ...INITIAL_CASH_TRANSACTIONS.map(cash => setDoc(doc(db, 'cashTransactions', cash.id), cash)),
      ...INITIAL_MAINTENANCE.map(m => setDoc(doc(db, 'maintenanceRecords', m.id), m))
    ]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_db_initialized', 'true');
    }
  } catch (error) {
    console.warn('Initial seeding note:', error);
  }
}
