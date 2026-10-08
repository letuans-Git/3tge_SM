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
  },
  {
    id: 'cust_000005',
    customerCode: 'KH000005',
    customerName: 'Nhà Xưởng Cơ Khí Chính Xác Tân Phát',
    address: 'KCN VSIP 1, Đường Số 6, TP. Thuận An, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0908.112.233',
    contractNumber: 'HD-2026/3TGE-012',
    inverters: [
      { id: 'inv_5_1', serialNumber: 'SUN-50K-SG01HP3-09', brand: 'DEYE', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_5_2', serialNumber: 'SUN-30K-SG01HP3-11', brand: 'DEYE', capacityKW: 30, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_5_1', serialNumber: 'BOS-G-DEYE-100KWH', brand: 'DEYE', capacityKWh: 102.4, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 160, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2026-02-18',
    nextMaintenanceDate: '2026-08-18',
    warrantyExpiryDate: '2031-02-18',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống lưu trữ công nghiệp 80kW / 102kWh vận hành ổn định.',
    totalCapacityKW: 80,
    createdAt: '2026-02-18T08:30:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  },
  {
    id: 'cust_000006',
    customerCode: 'KH000006',
    customerName: 'Hộ Gia Đình Chị Lê Thu Thảo',
    address: 'Số 45 Đường Đồng Khởi, P. Tân Phong, TP. Biên Hòa, Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0937.556.789',
    contractNumber: 'HD-2026/3TGE-005',
    inverters: [
      { id: 'inv_6_1', serialNumber: 'SUN2000-12KTL-M2', brand: 'HUAWEI', capacityKW: 12, phase: '1 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_6_1', serialNumber: 'LUNA2000-10KWH-VN', brand: 'HUAWEI', capacityKWh: 10, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 24, brand: 'JINKO', wattPerPanel: 540, distributor: 'Jinko Solar VN' },
    handoverDate: '2026-01-10',
    nextMaintenanceDate: '2026-07-10',
    warrantyExpiryDate: '2031-01-10',
    status: 'Hoạt động tốt',
    notes: 'Điện mặt trời mái nhà biệt thự, kết nối hybrid 1 pha lưu trữ 10kWh.',
    totalCapacityKW: 12,
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-09-18T11:00:00.000Z'
  },
  {
    id: 'cust_000007',
    customerCode: 'KH000007',
    customerName: 'Hợp Tác Xã Thủy Sản Bến Tre',
    address: 'Ấp 2, Xã An Điền, Huyện Thạnh Phú, Tỉnh Bến Tre',
    province: 'Bến Tre',
    phoneNumber: '0945.889.911',
    contractNumber: 'HD-2025/3TGE-142',
    inverters: [
      { id: 'inv_7_1', serialNumber: 'SG110CX-SUNGROW-99', brand: 'SUNGROW', capacityKW: 110, phase: '3 pha', distributor: 'Hừng Đông Solar' },
      { id: 'inv_7_2', serialNumber: 'SOLIS-10K-4G', brand: 'SOLIS', capacityKW: 10, phase: '3 pha', distributor: 'SolarV' }
    ],
    batteries: [],
    solarPanels: { quantity: 240, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2025-12-05',
    nextMaintenanceDate: '2026-06-05',
    warrantyExpiryDate: '2030-12-05',
    status: 'Cần kiểm tra',
    notes: 'Chạy hệ quạt sục khí hồ tôm, môi trường hơi muối cần bảo trì xịt rửa thường xuyên.',
    totalCapacityKW: 120,
    createdAt: '2025-12-05T10:00:00.000Z',
    updatedAt: '2026-09-19T14:00:00.000Z'
  },
  {
    id: 'cust_000008',
    customerCode: 'KH000008',
    customerName: 'Tòa Nhà Văn Phòng Golden Tower',
    address: 'Số 12 Đường Nguyễn Thị Minh Khai, P. Đa Kao, Quận 1, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0909.334.455',
    contractNumber: 'HD-2025/3TGE-128',
    inverters: [
      { id: 'inv_8_1', serialNumber: 'GW25K-MT-2025', brand: 'GOODWE', capacityKW: 25, phase: '3 pha', distributor: 'SolarV' },
      { id: 'inv_8_2', serialNumber: 'GW20K-MT-2025', brand: 'GOODWE', capacityKW: 20, phase: '3 pha', distributor: 'SolarV' }
    ],
    batteries: [],
    solarPanels: { quantity: 90, brand: 'JA_SOLAR', wattPerPanel: 545, distributor: 'JA Solar VN' },
    handoverDate: '2025-10-20',
    nextMaintenanceDate: '2026-10-20',
    warrantyExpiryDate: '2030-10-20',
    status: 'Hoạt động tốt',
    notes: 'Tòa nhà văn phòng 9 tầng, hệ thống zero-export bám tải tiêu thụ nội bộ.',
    totalCapacityKW: 45,
    createdAt: '2025-10-20T14:00:00.000Z',
    updatedAt: '2026-09-15T09:00:00.000Z'
  },
  {
    id: 'cust_000009',
    customerCode: 'KH000009',
    customerName: 'Trường Mầm Non Quốc Tế Ngôi Sao Sáng',
    address: 'Đường D1, Khu Đô Thị Phúc Đạt, TP. Thủ Dầu Một, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0981.223.344',
    contractNumber: 'HD-2025/3TGE-098',
    inverters: [
      { id: 'inv_9_1', serialNumber: 'MOD-25KTL3-X', brand: 'GROWATT', capacityKW: 25, phase: '3 pha', distributor: 'Alena Energy' }
    ],
    batteries: [],
    solarPanels: { quantity: 50, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2025-08-14',
    nextMaintenanceDate: '2026-08-14',
    warrantyExpiryDate: '2030-08-14',
    status: 'Hoạt động tốt',
    notes: 'Lắp đặt mái che sân chơi mầm non, kết cấu giàn khung sơn tĩnh điện thẩm mỹ cao.',
    totalCapacityKW: 25,
    createdAt: '2025-08-14T11:00:00.000Z',
    updatedAt: '2026-09-12T15:00:00.000Z'
  },
  {
    id: 'cust_000010',
    customerCode: 'KH000010',
    customerName: 'Xưởng Chế Biến Gỗ Hoàng Nam',
    address: 'KCN Hố Nai 3, Huyện Trảng Bom, Tỉnh Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0913.445.566',
    contractNumber: 'HD-2025/3TGE-077',
    inverters: [
      { id: 'inv_10_1', serialNumber: 'SUN2000-100KTL-M2-04', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 200, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2025-07-22',
    nextMaintenanceDate: '2026-01-22',
    warrantyExpiryDate: '2030-07-22',
    status: 'Đang bảo trì',
    notes: 'Bụi mùn cưa bám nhiều, đang tiến hành bảo dưỡng vệ sinh tấm pin và thổi bụi tủ điện.',
    totalCapacityKW: 100,
    createdAt: '2025-07-22T08:00:00.000Z',
    updatedAt: '2026-09-22T08:30:00.000Z'
  },
  {
    id: 'cust_000011',
    customerCode: 'KH000011',
    customerName: 'Biệt Thự Thảo Điền - Chú Đặng Hùng',
    address: 'Số 18 Đường Nguyễn Văn Hưởng, P. Thảo Điền, TP. Thủ Đức, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0903.778.899',
    contractNumber: 'HD-2025/3TGE-065',
    inverters: [
      { id: 'inv_11_1', serialNumber: 'SUN-15K-SG01HP3-EU', brand: 'DEYE', capacityKW: 15, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_11_1', serialNumber: 'BOS-G-20KWH-DEYE', brand: 'DEYE', capacityKWh: 20.48, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 30, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2025-05-30',
    nextMaintenanceDate: '2026-05-30',
    warrantyExpiryDate: '2030-05-30',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống hybrid 3 pha cao cấp lưu trữ ban đêm, khách hài lòng với độ êm của inverter.',
    totalCapacityKW: 15,
    createdAt: '2025-05-30T10:00:00.000Z',
    updatedAt: '2026-09-10T11:00:00.000Z'
  },
  {
    id: 'cust_000012',
    customerCode: 'KH000012',
    customerName: 'Bệnh Viện Đa Khoa An Phước',
    address: 'Số 235 Đường Trần Phú, TP. Phan Thiết, Bình Thuận',
    province: 'Bình Thuận',
    phoneNumber: '0989.112.358',
    contractNumber: 'HD-2025/3TGE-050',
    inverters: [
      { id: 'inv_12_1', serialNumber: 'SG100CX-01', brand: 'SUNGROW', capacityKW: 100, phase: '3 pha', distributor: 'Hừng Đông Solar' },
      { id: 'inv_12_2', serialNumber: 'SG50CX-02', brand: 'SUNGROW', capacityKW: 50, phase: '3 pha', distributor: 'Hừng Đông Solar' }
    ],
    batteries: [],
    solarPanels: { quantity: 300, brand: 'JA_SOLAR', wattPerPanel: 545, distributor: 'JA Solar VN' },
    handoverDate: '2025-04-12',
    nextMaintenanceDate: '2026-04-12',
    warrantyExpiryDate: '2030-04-12',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống năng lượng xanh phục vụ khối tòa nhà xét nghiệm và phòng bệnh.',
    totalCapacityKW: 150,
    createdAt: '2025-04-12T09:00:00.000Z',
    updatedAt: '2026-09-14T16:00:00.000Z'
  },
  {
    id: 'cust_000013',
    customerCode: 'KH000013',
    customerName: 'Kho Lạnh Logistics Song Toàn',
    address: 'KCN Thuận Đạo Mở Rộng, Huyện Bến Lức, Long An',
    province: 'Long An',
    phoneNumber: '0918.665.544',
    contractNumber: 'HD-2025/3TGE-039',
    inverters: [
      { id: 'inv_13_1', serialNumber: 'SUN2000-100KTL-M2-18', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_13_2', serialNumber: 'SUN2000-100KTL-M2-19', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 400, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2025-03-08',
    nextMaintenanceDate: '2026-03-08',
    warrantyExpiryDate: '2030-03-08',
    status: 'Hoạt động tốt',
    notes: 'Công suất đỉnh 200kW cấp điện trực tiếp cho hệ máy nén kho đông lạnh.',
    totalCapacityKW: 200,
    createdAt: '2025-03-08T08:30:00.000Z',
    updatedAt: '2026-09-16T10:00:00.000Z'
  },
  {
    id: 'cust_000014',
    customerCode: 'KH000014',
    customerName: 'Trang Trại Heo Khép Kín C.P Đắk Lắk',
    address: 'Xã Ea Ktur, Huyện Cư Kuin, Tỉnh Đắk Lắk',
    province: 'Đắk Lắk',
    phoneNumber: '0977.443.322',
    contractNumber: 'HD-2025/3TGE-025',
    inverters: [
      { id: 'inv_14_1', serialNumber: 'SUN-50K-SG01HP3-DK', brand: 'DEYE', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_14_2', serialNumber: 'SUN-25K-SG01HP3-DK', brand: 'DEYE', capacityKW: 25, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_14_1', serialNumber: 'BOS-G-60KWH-DK', brand: 'DEYE', capacityKWh: 61.44, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 150, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2025-02-15',
    nextMaintenanceDate: '2026-02-15',
    warrantyExpiryDate: '2030-02-15',
    status: 'Cần kiểm tra',
    notes: 'Khu vực vùng sâu điện lưới chập chờn, hệ thống đóng vai trò nguồn điện độc lập quan trọng.',
    totalCapacityKW: 75,
    createdAt: '2025-02-15T14:00:00.000Z',
    updatedAt: '2026-09-17T09:30:00.000Z'
  },
  {
    id: 'cust_000015',
    customerCode: 'KH000015',
    customerName: 'Trung Tâm Tiệc Cưới Bạch Kim',
    address: 'Số 579 Đường Âu Cơ, P. Phú Trung, Q. Tân Phú, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0908.991.122',
    contractNumber: 'HD-2025/3TGE-015',
    inverters: [
      { id: 'inv_15_1', serialNumber: 'GW60K-MT-BK', brand: 'GOODWE', capacityKW: 60, phase: '3 pha', distributor: 'SolarV' }
    ],
    batteries: [],
    solarPanels: { quantity: 120, brand: 'JINKO', wattPerPanel: 540, distributor: 'Jinko Solar VN' },
    handoverDate: '2025-01-28',
    nextMaintenanceDate: '2026-07-28',
    warrantyExpiryDate: '2030-01-28',
    status: 'Hoạt động tốt',
    notes: 'Giảm tải tiền điện điều hòa công suất lớn vào các buổi trưa tổ chức tiệc cưới.',
    totalCapacityKW: 60,
    createdAt: '2025-01-28T10:30:00.000Z',
    updatedAt: '2026-09-11T13:00:00.000Z'
  },
  {
    id: 'cust_000016',
    customerCode: 'KH000016',
    customerName: 'Nhà Phố Liền Kề - Anh Phạm Vũ Linh',
    address: 'KDC Chánh Nghĩa, Đường Hoàng Văn Thụ, TP. Thủ Dầu Một, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0938.887.766',
    contractNumber: 'HD-2024/3TGE-188',
    inverters: [
      { id: 'inv_16_1', serialNumber: 'SOLIS-S6-EH1P8K-L-PRO', brand: 'SOLIS', capacityKW: 8, phase: '1 pha', distributor: 'SolarV' }
    ],
    batteries: [
      { id: 'bat_16_1', serialNumber: 'PYLONTECH-US3000C-X2', brand: 'PYLONTECH', capacityKWh: 7.2, distributor: 'Hừng Đông Solar' }
    ],
    solarPanels: { quantity: 16, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2024-12-10',
    nextMaintenanceDate: '2026-12-10',
    warrantyExpiryDate: '2029-12-10',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống hybrid 1 pha 8kW gia đình, ban ngày phát tải, ban đêm xả pin lưu trữ.',
    totalCapacityKW: 8,
    createdAt: '2024-12-10T15:00:00.000Z',
    updatedAt: '2026-09-08T09:00:00.000Z'
  },
  {
    id: 'cust_000017',
    customerCode: 'KH000017',
    customerName: 'Nhà Máy Nhựa Kỹ Thuật Cao VinaPoly',
    address: 'KCN Amata, Phường Long Bình, TP. Biên Hòa, Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0919.223.344',
    contractNumber: 'HD-2024/3TGE-165',
    inverters: [
      { id: 'inv_17_1', serialNumber: 'SUN2000-100KTL-M2-31', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_17_2', serialNumber: 'SUN2000-100KTL-M2-32', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_17_3', serialNumber: 'SUN2000-50KTL-M0-12', brand: 'HUAWEI', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 500, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2024-11-18',
    nextMaintenanceDate: '2026-11-18',
    warrantyExpiryDate: '2029-11-18',
    status: 'Hoạt động tốt',
    notes: 'Tổng công suất 250kWp áp mái nhà xưởng ép khuôn nhựa chính xác.',
    totalCapacityKW: 250,
    createdAt: '2024-11-18T09:00:00.000Z',
    updatedAt: '2026-09-05T14:00:00.000Z'
  },
  {
    id: 'cust_000018',
    customerCode: 'KH000018',
    customerName: 'Quán Cà Phê Sinh Thái Đồi Mơ',
    address: 'Đường Mimosa, Phường 10, TP. Đà Lạt, Lâm Đồng',
    province: 'Lâm Đồng',
    phoneNumber: '0968.123.789',
    contractNumber: 'HD-2024/3TGE-150',
    inverters: [
      { id: 'inv_18_1', serialNumber: 'SUN-12K-SG04LP3', brand: 'DEYE', capacityKW: 12, phase: '1 pha', distributor: 'HTPRO189' },
      { id: 'inv_18_2', serialNumber: 'GROWATT-6KTL-X', brand: 'GROWATT', capacityKW: 6, phase: '1 pha', distributor: 'Alena Energy' }
    ],
    batteries: [
      { id: 'bat_18_1', serialNumber: 'DEYE-RW-M6.1-X3', brand: 'DEYE', capacityKWh: 18.3, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 36, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2024-10-05',
    nextMaintenanceDate: '2026-10-05',
    warrantyExpiryDate: '2029-10-05',
    status: 'Hoạt động tốt',
    notes: 'Quán cà phê kết hợp homestay, ban ngày khách sạc điện thoại xe máy điện thoải mái.',
    totalCapacityKW: 18,
    createdAt: '2024-10-05T10:00:00.000Z',
    updatedAt: '2026-09-02T16:00:00.000Z'
  },
  {
    id: 'cust_000019',
    customerCode: 'KH000019',
    customerName: 'Hộ Kinh Doanh Dệt Nhuộm Nam Hưng',
    address: 'Cụm Công Nghiệp Nhị Xuân, Huyện Hóc Môn, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0903.665.432',
    contractNumber: 'HD-2024/3TGE-135',
    inverters: [
      { id: 'inv_19_1', serialNumber: 'SG50CX-SUNGROW-NH', brand: 'SUNGROW', capacityKW: 50, phase: '3 pha', distributor: 'Hừng Đông Solar' },
      { id: 'inv_19_2', serialNumber: 'SG40CX-SUNGROW-NH', brand: 'SUNGROW', capacityKW: 40, phase: '3 pha', distributor: 'Hừng Đông Solar' }
    ],
    batteries: [],
    solarPanels: { quantity: 180, brand: 'JA_SOLAR', wattPerPanel: 545, distributor: 'JA Solar VN' },
    handoverDate: '2024-09-12',
    nextMaintenanceDate: '2026-09-12',
    warrantyExpiryDate: '2029-09-12',
    status: 'Cần kiểm tra',
    notes: 'Inverter số 2 báo lỗi quá nhiệt do quạt tản nhiệt bị sợi bông dệt bám kín, kỹ thuật đang xử lý.',
    totalCapacityKW: 90,
    createdAt: '2024-09-12T11:00:00.000Z',
    updatedAt: '2026-09-21T07:00:00.000Z'
  },
  {
    id: 'cust_000020',
    customerCode: 'KH000020',
    customerName: 'Trạm Dừng Chân Du Lịch Long Thành',
    address: 'Km 23 Đường Cao Tốc TP. HCM - Long Thành, Tỉnh Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0912.998.877',
    contractNumber: 'HD-2024/3TGE-120',
    inverters: [
      { id: 'inv_20_1', serialNumber: 'SUN2000-100KTL-M2-45', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_20_2', serialNumber: 'SUN2000-10KTL-M1-08', brand: 'HUAWEI', capacityKW: 10, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 220, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2024-08-20',
    nextMaintenanceDate: '2026-08-20',
    warrantyExpiryDate: '2029-08-20',
    status: 'Hoạt động tốt',
    notes: 'Trạm dừng chân cao tốc phục vụ sạc điện, hệ thống phát điện hiệu quả cao.',
    totalCapacityKW: 110,
    createdAt: '2024-08-20T08:00:00.000Z',
    updatedAt: '2026-08-30T10:00:00.000Z'
  },
  {
    id: 'cust_000021',
    customerCode: 'KH000021',
    customerName: 'Cơ Sở Cán Tôn & Xà Gồ Thành Công',
    address: 'Quốc Lộ 22B, Xã Hiệp Tân, Thị Xã Hòa Thành, Tỉnh Tây Ninh',
    province: 'Tây Ninh',
    phoneNumber: '0979.445.667',
    contractNumber: 'HD-2024/3TGE-108',
    inverters: [
      { id: 'inv_21_1', serialNumber: 'SUN-50K-SG01HP3-TC', brand: 'DEYE', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_21_2', serialNumber: 'SUN-20K-SG01HP3-TC', brand: 'DEYE', capacityKW: 20, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 140, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2024-07-15',
    nextMaintenanceDate: '2026-07-15',
    warrantyExpiryDate: '2029-07-15',
    status: 'Hoạt động tốt',
    notes: 'Máy cán tôn chạy điện ba pha, tiết kiệm 45 triệu tiền điện hàng tháng.',
    totalCapacityKW: 70,
    createdAt: '2024-07-15T09:30:00.000Z',
    updatedAt: '2026-08-25T11:00:00.000Z'
  },
  {
    id: 'cust_000022',
    customerCode: 'KH000022',
    customerName: 'Biệt Thự Nghỉ Dưỡng Ocean Dunes',
    address: 'Khu Đô Thị Biển Rạng Đông, TP. Phan Thiết, Bình Thuận',
    province: 'Bình Thuận',
    phoneNumber: '0908.221.133',
    contractNumber: 'HD-2024/3TGE-095',
    inverters: [
      { id: 'inv_22_1', serialNumber: 'GW10K-ET-OD1', brand: 'GOODWE', capacityKW: 10, phase: '1 pha', distributor: 'SolarV' },
      { id: 'inv_22_2', serialNumber: 'GW6K-ET-OD2', brand: 'GOODWE', capacityKW: 6, phase: '1 pha', distributor: 'SolarV' }
    ],
    batteries: [
      { id: 'bat_22_1', serialNumber: 'US5000-PYL-OD', brand: 'PYLONTECH', capacityKWh: 14.4, distributor: 'Hừng Đông Solar' }
    ],
    solarPanels: { quantity: 32, brand: 'JINKO', wattPerPanel: 540, distributor: 'Jinko Solar VN' },
    handoverDate: '2024-06-25',
    nextMaintenanceDate: '2026-06-25',
    warrantyExpiryDate: '2029-06-25',
    status: 'Hoạt động tốt',
    notes: 'Biệt thự sát biển, linh kiện mạ kẽm nhúng nóng chống ăn mòn muối biển.',
    totalCapacityKW: 16,
    createdAt: '2024-06-25T14:30:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z'
  },
  {
    id: 'cust_000023',
    customerCode: 'KH000023',
    customerName: 'Nhà Máy Sấy Nông Sản Đồng Nai',
    address: 'Cụm Công Nghiệp Phú Cường, Huyện Định Quán, Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0917.334.455',
    contractNumber: 'HD-2024/3TGE-080',
    inverters: [
      { id: 'inv_23_1', serialNumber: 'SG100CX-SUNGROW-DN', brand: 'SUNGROW', capacityKW: 100, phase: '3 pha', distributor: 'Hừng Đông Solar' },
      { id: 'inv_23_2', serialNumber: 'SG30CX-SUNGROW-DN', brand: 'SUNGROW', capacityKW: 30, phase: '3 pha', distributor: 'Hừng Đông Solar' }
    ],
    batteries: [],
    solarPanels: { quantity: 260, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2024-05-18',
    nextMaintenanceDate: '2026-05-18',
    warrantyExpiryDate: '2029-05-18',
    status: 'Hoạt động tốt',
    notes: 'Lắp trên mái nhà xưởng sấy chuối và mít xuất khẩu, hệ thống bám tải 130kW.',
    totalCapacityKW: 130,
    createdAt: '2024-05-18T08:00:00.000Z',
    updatedAt: '2026-08-15T09:00:00.000Z'
  },
  {
    id: 'cust_000024',
    customerCode: 'KH000024',
    customerName: 'Siêu Thị Tiện Ích Phúc Gia',
    address: 'Số 112 Đường Nguyễn Trung Trực, TP. Tân An, Long An',
    province: 'Long An',
    phoneNumber: '0939.554.433',
    contractNumber: 'HD-2024/3TGE-068',
    inverters: [
      { id: 'inv_24_1', serialNumber: 'SUN2000-30KTL-M3', brand: 'HUAWEI', capacityKW: 30, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_24_2', serialNumber: 'SUN2000-5KTL-L1', brand: 'HUAWEI', capacityKW: 5, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 70, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2024-04-10',
    nextMaintenanceDate: '2026-10-10',
    warrantyExpiryDate: '2029-04-10',
    status: 'Hoạt động tốt',
    notes: 'Giảm chi phí điện tủ mát và tủ đông siêu thị chạy 24/7.',
    totalCapacityKW: 35,
    createdAt: '2024-04-10T10:00:00.000Z',
    updatedAt: '2026-08-10T15:00:00.000Z'
  },
  {
    id: 'cust_000025',
    customerCode: 'KH000025',
    customerName: 'Xưởng Gia Công May Mặc Đại Phát',
    address: 'Cụm Công Nghiệp Trung An, TP. Mỹ Tho, Tiền Giang',
    province: 'Tiền Giang',
    phoneNumber: '0908.776.655',
    contractNumber: 'HD-2024/3TGE-055',
    inverters: [
      { id: 'inv_25_1', serialNumber: 'MID-50KTL3-X', brand: 'GROWATT', capacityKW: 50, phase: '3 pha', distributor: 'Alena Energy' },
      { id: 'inv_25_2', serialNumber: 'MID-15KTL3-X', brand: 'GROWATT', capacityKW: 15, phase: '3 pha', distributor: 'Alena Energy' }
    ],
    batteries: [],
    solarPanels: { quantity: 130, brand: 'JA_SOLAR', wattPerPanel: 545, distributor: 'JA Solar VN' },
    handoverDate: '2024-03-15',
    nextMaintenanceDate: '2026-09-15',
    warrantyExpiryDate: '2029-03-15',
    status: 'Cần kiểm tra',
    notes: 'Khách yêu cầu đo kiểm lại dòng rò của chuỗi PV số 3 sau trận mưa to.',
    totalCapacityKW: 65,
    createdAt: '2024-03-15T09:00:00.000Z',
    updatedAt: '2026-08-05T11:00:00.000Z'
  },
  {
    id: 'cust_000026',
    customerCode: 'KH000026',
    customerName: 'Homestay & Coffee Mây Núi Đà Lạt',
    address: 'Đường Hùng Vương, Phường 9, TP. Đà Lạt, Lâm Đồng',
    province: 'Lâm Đồng',
    phoneNumber: '0978.119.988',
    contractNumber: 'HD-2024/3TGE-040',
    inverters: [
      { id: 'inv_26_1', serialNumber: 'SUN-10K-SG02LP1', brand: 'DEYE', capacityKW: 10, phase: '1 pha', distributor: 'HTPRO189' },
      { id: 'inv_26_2', serialNumber: 'SUN-4K-SG04LP1', brand: 'DEYE', capacityKW: 4, phase: '1 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_26_1', serialNumber: 'DEYE-SE-G5.1-X4', brand: 'DEYE', capacityKWh: 20.48, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 28, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2024-02-22',
    nextMaintenanceDate: '2026-08-22',
    warrantyExpiryDate: '2029-02-22',
    status: 'Hoạt động tốt',
    notes: 'Khu homestay view đồi thông, pin lưu trữ hỗ trợ sưởi ấm nước nóng ban đêm.',
    totalCapacityKW: 14,
    createdAt: '2024-02-22T10:30:00.000Z',
    updatedAt: '2026-07-28T09:00:00.000Z'
  },
  {
    id: 'cust_000027',
    customerCode: 'KH000027',
    customerName: 'Khu Du Lịch Sinh Thái Suối Mơ',
    address: 'Ấp 4, Xã Trà Cổ, Huyện Tân Phú, Tỉnh Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0915.228.899',
    contractNumber: 'HD-2024/3TGE-020',
    inverters: [
      { id: 'inv_27_1', serialNumber: 'SUN2000-50KTL-M0-45', brand: 'HUAWEI', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_27_2', serialNumber: 'SUN2000-35KTL-M0-21', brand: 'HUAWEI', capacityKW: 35, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 170, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2024-01-19',
    nextMaintenanceDate: '2026-07-19',
    warrantyExpiryDate: '2029-01-19',
    status: 'Hoạt động tốt',
    notes: 'Cung cấp năng lượng cho hệ thống bơm thác nước và khu nhà hàng sinh thái.',
    totalCapacityKW: 85,
    createdAt: '2024-01-19T11:00:00.000Z',
    updatedAt: '2026-07-20T14:00:00.000Z'
  },
  {
    id: 'cust_000028',
    customerCode: 'KH000028',
    customerName: 'Hộ Gia Đình Bác Nguyễn Văn Tài',
    address: 'Số 88 Đường Lê Đức Thọ, P. 16, Q. Gò Vấp, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0903.114.477',
    contractNumber: 'HD-2023/3TGE-190',
    inverters: [
      { id: 'inv_28_1', serialNumber: 'SOLIS-S6-GR1P6K', brand: 'SOLIS', capacityKW: 6, phase: '1 pha', distributor: 'SolarV' }
    ],
    batteries: [
      { id: 'bat_28_1', serialNumber: 'PYLON-US3000C', brand: 'PYLONTECH', capacityKWh: 4.8, distributor: 'Hừng Đông Solar' }
    ],
    solarPanels: { quantity: 12, brand: 'JINKO', wattPerPanel: 540, distributor: 'Jinko Solar VN' },
    handoverDate: '2023-12-14',
    nextMaintenanceDate: '2026-12-14',
    warrantyExpiryDate: '2028-12-14',
    status: 'Hoạt động tốt',
    notes: 'Hệ thống hybrid hộ gia đình 6kW, vận hành êm ái hơn 2 năm chưa phát sinh sự cố.',
    totalCapacityKW: 6,
    createdAt: '2023-12-14T14:00:00.000Z',
    updatedAt: '2026-07-15T16:00:00.000Z'
  },
  {
    id: 'cust_000029',
    customerCode: 'KH000029',
    customerName: 'Cửa Hàng Xăng Dầu Petrolimex Số 18',
    address: 'Đại Lộ Bình Dương, P. Hiệp Thành, TP. Thủ Dầu Một, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0988.665.522',
    contractNumber: 'HD-2023/3TGE-175',
    inverters: [
      { id: 'inv_29_1', serialNumber: 'GW40K-MT-PETRO', brand: 'GOODWE', capacityKW: 40, phase: '3 pha', distributor: 'SolarV' }
    ],
    batteries: [],
    solarPanels: { quantity: 80, brand: 'JA_SOLAR', wattPerPanel: 545, distributor: 'JA Solar VN' },
    handoverDate: '2023-11-20',
    nextMaintenanceDate: '2026-11-20',
    warrantyExpiryDate: '2028-11-20',
    status: 'Hoạt động tốt',
    notes: 'Mái trạm xăng kiên cố, tiêu chuẩn an toàn PCCC nghiêm ngặt cấp 1.',
    totalCapacityKW: 40,
    createdAt: '2023-11-20T09:00:00.000Z',
    updatedAt: '2026-07-10T08:30:00.000Z'
  },
  {
    id: 'cust_000030',
    customerCode: 'KH000030',
    customerName: 'Hợp Tác Xã Sầu Riêng Krông Pắc',
    address: 'Km 32 Quốc Lộ 26, Huyện Krông Pắc, Tỉnh Đắk Lắk',
    province: 'Đắk Lắk',
    phoneNumber: '0974.887.799',
    contractNumber: 'HD-2023/3TGE-160',
    inverters: [
      { id: 'inv_30_1', serialNumber: 'SUN-50K-SG01HP3-KP', brand: 'DEYE', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_30_2', serialNumber: 'SUN-45K-SG01HP3-KP', brand: 'DEYE', capacityKW: 45, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 190, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2023-10-18',
    nextMaintenanceDate: '2026-10-18',
    warrantyExpiryDate: '2028-10-18',
    status: 'Hoạt động tốt',
    notes: 'Cung cấp điện kho lạnh bảo quản sầu riêng xuất khẩu đi Trung Quốc.',
    totalCapacityKW: 95,
    createdAt: '2023-10-18T08:30:00.000Z',
    updatedAt: '2026-07-05T10:00:00.000Z'
  },
  {
    id: 'cust_000031',
    customerCode: 'KH000031',
    customerName: 'Tòa Nhà Căn Hộ Dịch Vụ SkyView',
    address: 'Số 42 Đường Hùng Vương, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa',
    province: 'Khánh Hòa',
    phoneNumber: '0914.332.211',
    contractNumber: 'HD-2023/3TGE-145',
    inverters: [
      { id: 'inv_31_1', serialNumber: 'SUN2000-50KTL-M0-SK', brand: 'HUAWEI', capacityKW: 50, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_31_2', serialNumber: 'SUN2000-5KTL-L1-SK', brand: 'HUAWEI', capacityKW: 5, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 110, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2023-09-25',
    nextMaintenanceDate: '2026-09-25',
    warrantyExpiryDate: '2028-09-25',
    status: 'Hoạt động tốt',
    notes: 'Căn hộ dịch vụ cao cấp du lịch biển, bám tải toàn bộ lượng tiêu thụ ban ngày.',
    totalCapacityKW: 55,
    createdAt: '2023-09-25T14:00:00.000Z',
    updatedAt: '2026-06-30T11:00:00.000Z'
  },
  {
    id: 'cust_000032',
    customerCode: 'KH000032',
    customerName: 'Cơ Sở Giặt Ủi Sài Gòn Mới',
    address: 'Đường Kha Vạn Cân, P. Linh Trung, TP. Thủ Đức, TP. HCM',
    province: 'TP. Hồ Chí Minh',
    phoneNumber: '0909.554.411',
    contractNumber: 'HD-2023/3TGE-130',
    inverters: [
      { id: 'inv_32_1', serialNumber: 'MID-30KTL3-X-SG', brand: 'GROWATT', capacityKW: 30, phase: '3 pha', distributor: 'Alena Energy' }
    ],
    batteries: [],
    solarPanels: { quantity: 60, brand: 'JINKO', wattPerPanel: 540, distributor: 'Jinko Solar VN' },
    handoverDate: '2023-08-30',
    nextMaintenanceDate: '2026-08-30',
    warrantyExpiryDate: '2028-08-30',
    status: 'Hoạt động tốt',
    notes: 'Tiêu thụ ban ngày đều đặn cho máy giặt sấy công nghiệp.',
    totalCapacityKW: 30,
    createdAt: '2023-08-30T10:00:00.000Z',
    updatedAt: '2026-06-25T15:00:00.000Z'
  },
  {
    id: 'cust_000033',
    customerCode: 'KH000033',
    customerName: 'Doanh Nghiệp Cơ Khí Đồng Tâm',
    address: 'KCN Nam Tân Uyên Mở Rộng, Thị Xã Tân Uyên, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0918.776.622',
    contractNumber: 'HD-2023/3TGE-115',
    inverters: [
      { id: 'inv_33_1', serialNumber: 'SG100CX-SUNGROW-DT', brand: 'SUNGROW', capacityKW: 100, phase: '3 pha', distributor: 'Hừng Đông Solar' },
      { id: 'inv_33_2', serialNumber: 'SG40CX-SUNGROW-DT', brand: 'SUNGROW', capacityKW: 40, phase: '3 pha', distributor: 'Hừng Đông Solar' }
    ],
    batteries: [],
    solarPanels: { quantity: 280, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2023-07-12',
    nextMaintenanceDate: '2026-07-12',
    warrantyExpiryDate: '2028-07-12',
    status: 'Hoạt động tốt',
    notes: 'Xưởng đúc chi tiết kim loại, máy gia công CNC tiêu thụ công suất liên tục.',
    totalCapacityKW: 140,
    createdAt: '2023-07-12T08:00:00.000Z',
    updatedAt: '2026-06-20T09:00:00.000Z'
  },
  {
    id: 'cust_000034',
    customerCode: 'KH000034',
    customerName: 'Biệt Thự Ven Sông Eco Village',
    address: 'Đường Hương Lộ 2, Xã Long Hưng, TP. Biên Hòa, Tỉnh Đồng Nai',
    province: 'Đồng Nai',
    phoneNumber: '0938.229.955',
    contractNumber: 'HD-2023/3TGE-095',
    inverters: [
      { id: 'inv_34_1', serialNumber: 'SUN-12K-SG04LP3-ECO', brand: 'DEYE', capacityKW: 12, phase: '1 pha', distributor: 'HTPRO189' },
      { id: 'inv_34_2', serialNumber: 'SUN-10K-SG04LP3-ECO', brand: 'DEYE', capacityKW: 10, phase: '1 pha', distributor: 'HTPRO189' }
    ],
    batteries: [
      { id: 'bat_34_1', serialNumber: 'BOS-G-25KWH-ECO', brand: 'DEYE', capacityKWh: 25.6, distributor: 'HTPRO189' }
    ],
    solarPanels: { quantity: 44, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2023-06-18',
    nextMaintenanceDate: '2026-06-18',
    warrantyExpiryDate: '2028-06-18',
    status: 'Hoạt động tốt',
    notes: 'Khu biệt thự sinh thái cao cấp ven sông, ban đêm vận hành hoàn toàn bằng lưu trữ.',
    totalCapacityKW: 22,
    createdAt: '2023-06-18T15:00:00.000Z',
    updatedAt: '2026-06-15T11:00:00.000Z'
  },
  {
    id: 'cust_000035',
    customerCode: 'KH000035',
    customerName: 'Nhà Máy Nước Đá Băng Dương',
    address: 'KCN Trà Nóc 1, Quận Bình Thủy, TP. Cần Thơ',
    province: 'Cần Thơ',
    phoneNumber: '0945.112.244',
    contractNumber: 'HD-2023/3TGE-080',
    inverters: [
      { id: 'inv_35_1', serialNumber: 'SUN2000-100KTL-M2-BD', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_35_2', serialNumber: 'SUN2000-80KTL-M0-BD', brand: 'HUAWEI', capacityKW: 80, phase: '3 pha', distributor: 'HTPRO189' }
    ],
    batteries: [],
    solarPanels: { quantity: 360, brand: 'LONGI', wattPerPanel: 550, distributor: 'Alena Energy' },
    handoverDate: '2023-05-20',
    nextMaintenanceDate: '2026-11-20',
    warrantyExpiryDate: '2028-05-20',
    status: 'Hoạt động tốt',
    notes: 'Nhà máy sản xuất đá cây phục vụ tàu cá miền Tây, tiết kiệm 70 triệu tiền điện/tháng.',
    totalCapacityKW: 180,
    createdAt: '2023-05-20T08:30:00.000Z',
    updatedAt: '2026-06-10T14:00:00.000Z'
  },
  {
    id: 'cust_000036',
    customerCode: 'KH000036',
    customerName: 'Trung Tâm Sát Hạch Lái Xe Miền Đông',
    address: 'Đường DT743, Phường An Phú, TP. Thuận An, Bình Dương',
    province: 'Bình Dương',
    phoneNumber: '0912.443.311',
    contractNumber: 'HD-2023/3TGE-060',
    inverters: [
      { id: 'inv_36_1', serialNumber: 'SUN2000-100KTL-M2-MD', brand: 'HUAWEI', capacityKW: 100, phase: '3 pha', distributor: 'HTPRO189' },
      { id: 'inv_36_2', serialNumber: 'SOLIS-5K-4G-MD', brand: 'SOLIS', capacityKW: 5, phase: '3 pha', distributor: 'SolarV' }
    ],
    batteries: [],
    solarPanels: { quantity: 210, brand: 'CANADIAN', wattPerPanel: 550, distributor: 'Canadian Solar' },
    handoverDate: '2023-04-15',
    nextMaintenanceDate: '2026-10-15',
    warrantyExpiryDate: '2028-04-15',
    status: 'Hoạt động tốt',
    notes: 'Mái che nhà xe sát hạch và khối văn phòng tiếp nhận hồ sơ.',
    totalCapacityKW: 105,
    createdAt: '2023-04-15T09:00:00.000Z',
    updatedAt: '2026-06-05T09:30:00.000Z'
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
// Also ensures at least 36 customers exist so pagination can be fully tested and experienced.
export async function seedExtendedCustomersBatch() {
  try {
    const promises = INITIAL_CUSTOMERS.map(cust => setDoc(doc(db, 'customers', cust.id), cust, { merge: true }));
    await Promise.all(promises);
    return true;
  } catch (err) {
    console.error('seedExtendedCustomersBatch error:', err);
    return false;
  }
}

export async function seedInitialDatabaseIfEmpty() {
  try {
    const custRef = collection(db, 'customers');
    const custSnap = await getDocs(custRef);
    
    // If database already has full dataset (at least 12 customers), mark as initialized
    if (!custSnap.empty && custSnap.size >= 12) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('3tge_db_initialized', 'true');
      }
      return;
    }

    // If database is empty or has fewer than 12 customers, seed or complement full INITIAL_CUSTOMERS
    await Promise.all([
      ...INITIAL_CUSTOMERS.map(cust => setDoc(doc(db, 'customers', cust.id), cust, { merge: true })),
      ...INITIAL_INVENTORY.map(item => setDoc(doc(db, 'inventory', item.id), item, { merge: true })),
      ...INITIAL_CASH_TRANSACTIONS.map(cash => setDoc(doc(db, 'cashTransactions', cash.id), cash, { merge: true })),
      ...INITIAL_MAINTENANCE.map(m => setDoc(doc(db, 'maintenanceRecords', m.id), m, { merge: true }))
    ]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('3tge_db_initialized', 'true');
    }
  } catch (error) {
    console.warn('Initial seeding note:', error);
  }
}
