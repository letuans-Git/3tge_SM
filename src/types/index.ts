import { PermissionAction } from './permissions';

export type UserRole = 'admin' | 'technician' | 'cskh';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  email: string;
  avatar?: string;
  password?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  permissions?: PermissionAction[]; // Custom individual permissions override
  createdAt?: string;
  updatedAt?: string;
}

export type InverterBrand = 'PYLONTECH' | 'GOODWE' | 'DEYE' | 'HUAWEI' | 'SUNGROW' | 'LUXPOWER' | 'KHAC';
export type BatteryBrand = 'PYLONTECH' | 'GOODWE' | 'DEYE' | 'HUAWEI' | 'SUNGROW' | 'BYD' | 'KHAC';
export type SolarBrand = 'LONGI' | 'JINKO' | 'CANADIAN' | 'TRINA' | 'JA_SOLAR' | 'AE_SOLAR' | 'KHAC';

export interface InverterItem {
  id: string;
  serialNumber: string;
  brand: InverterBrand | string;
  capacityKW: number;
  phase?: '1 pha' | '3 pha';
  distributor: string;
}

export interface BatteryItem {
  id: string;
  serialNumber: string;
  brand: BatteryBrand | string;
  capacityKWh: number;
  distributor: string;
}

export interface SolarPanelItem {
  quantity: number;
  brand: SolarBrand | string;
  wattPerPanel: number;
  totalKWp?: number;
  distributor: string;
}

export interface WindTurbineItem {
  id: string;
  serialNumber: string;
  brand: string;
  capacityKW: number;
  distributor: string;
}

export type SystemStatus = 'Hoạt động tốt' | 'Cần kiểm tra' | 'Đang bảo trì' | 'Ngừng hoạt động';

export interface CustomerImages {
  overview?: string; // Base64 or URL
  inverter?: string;
  battery?: string;
  panels?: string;
}

export interface CustomerPdfDocument {
  id: string;
  name: string; // Tên file PDF (vd: Hoa_don_GTGT_001.pdf, CO_CQ_Inverter.pdf)
  category: 'invoice' | 'co_cq' | 'co' | 'cq' | 'other' | string; // Loại tài liệu: Hóa đơn, CO-CQ, CO, CQ, Khác
  fileData: string; // Base64 data URL: data:application/pdf;base64,...
  fileSize?: string; // Kích thước tệp (vd: 350 KB, 1.2 MB)
  uploadedAt: string; // Thời gian tải lên ISO string
}

export interface Customer {
  id: string; // Firestore document ID
  customerCode: string; // KH000001, KH000002...
  customerName: string;
  address: string;
  province?: string;
  phoneNumber: string;
  contractNumber: string;
  inverters: InverterItem[]; // max 5
  batteries: BatteryItem[]; // max 5
  solarPanels: SolarPanelItem;
  windTurbines?: WindTurbineItem[]; // Thiết bị điện gió
  handoverDate: string; // YYYY-MM-DD
  nextMaintenanceDate: string; // YYYY-MM-DD
  warrantyExpiryDate: string; // YYYY-MM-DD
  status: SystemStatus;
  notes?: string;
  images?: CustomerImages;
  pdfDocuments?: CustomerPdfDocument[]; // Danh sách file .pdf liên quan (Hóa đơn, CO, CQ...)
  createdAt: string;
  updatedAt: string;
  totalCapacityKW: number; // Computed total capacity for fast analytics
  isDisabled?: boolean; // True when disabled / deactivated
  disabledAt?: string; // ISO string when disabled
  disabledReason?: string; // Optional reason for disabling
}

export interface MaintenanceRecord {
  id: string;
  customerCode: string;
  customerId: string;
  customerName: string;
  maintenanceCode: string; // BD-202609-001
  maintenanceDate: string;
  technicianName: string;
  technicianId?: string;
  content: string;
  imageBefore?: string;
  imageAfter?: string;
  inspectionResult: string;
  recommendations: string;
  nextScheduledDate: string; // +180 days calculated automatically
  createdAt: string;
}

// Kho: Xuất - Nhập - Tồn
export type InventoryType = 'IN' | 'OUT';
export type ItemCategory = 'INVERTER' | 'BATTERY' | 'PANEL' | 'CABLE' | 'ACCESSORY';

export interface InventoryItem {
  id: string;
  code: string; // VT001
  name: string;
  category: ItemCategory;
  brand: string;
  unit: string; // Bộ, Tấm, Mét, Cuộn
  stockQuantity: number;
  minAlertQuantity: number;
  unitPrice: number;
  location?: string;
  notes?: string;
}

export interface InventoryTransaction {
  id: string;
  transactionCode: string; // PN0001 / PX0001
  type: InventoryType; // Nhập hoặc Xuất
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  customerRef?: string; // Khách hàng nhận (nếu xuất)
  supplierRef?: string; // Nhà cung cấp (nếu nhập)
  notes?: string;
  createdBy: string;
  date: string;
  receiptId?: string;
  receiptCode?: string;
  delivererName?: string;
  warehouseName?: string;
  invoiceNumber?: string;
}

// Chi tiết mặt hàng trong Phiếu nhập kho đa mặt hàng
export interface GoodsReceiptItem {
  id?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  category?: ItemCategory;
  brand?: string;
  unit: string;
  docQuantity: number; // Số lượng theo chứng từ
  actualQuantity: number; // Số lượng thực nhập
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

// Phiếu nhập kho hoàn chỉnh (Mẫu số 01 - VT theo TT 200/2014/TT-BTC)
export interface GoodsReceiptNote {
  id: string;
  receiptCode: string; // PN0001 / PN-2026-0001
  date: string; // YYYY-MM-DD
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierTaxCode?: string;
  delivererName: string; // Họ tên người giao hàng
  warehouseName: string; // Kho nhập (Kho chính 3TGE, Kho A, Kho B...)
  warehouseLocation?: string; // Địa điểm kho
  invoiceNumber?: string; // Hóa đơn / Chứng từ kèm theo
  reason?: string; // Lý do nhập kho
  items: GoodsReceiptItem[];
  totalQuantity: number;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// Thu - Chi & Quỹ tiền mặt
export type CashFlowType = 'THU' | 'CHI';
export type CashFlowCategory = 
  | 'Thu tiền hợp đồng'
  | 'Thu phí bảo dưỡng'
  | 'Thu khác'
  | 'Chi nhập thiết bị'
  | 'Chi lương nhân viên'
  | 'Chi xăng xe đi lại'
  | 'Chi bảo hành/sửa chữa'
  | 'Chi văn phòng & tiếp khách'
  | 'Chi khác';

export interface CashTransaction {
  id: string;
  code: string; // PT0001 / PC0001
  type: CashFlowType;
  category: CashFlowCategory | string;
  amount: number;
  paymentMethod: 'Tiền mặt' | 'Chuyển khoản';
  payerReceiver: string; // Người nộp/Người nhận
  customerRefCode?: string;
  notes?: string;
  createdBy: string;
  date: string;
  createdAt: string;
}

// Danh mục chi phí (Expense Category)
export interface ExpenseCategory {
  id: string;
  code: string; // CP0001, CP0002...
  name: string; // Tên loại chi phí
  group: string; // Nhóm chi phí: Vận hành, Mua sắm, Nhân sự, Quản lý, Marketing...
  description?: string; // Diễn giải
  createdAt: string;
  updatedAt?: string;
}

// Danh mục nhà cung cấp (Supplier)
export interface Supplier {
  id: string;
  code: string; // NCC0001, NCC0002...
  name: string; // Tên công ty / nhà cung cấp
  contactPerson?: string; // Người liên hệ
  phone: string; // SĐT liên hệ
  email?: string;
  address?: string;
  taxCode?: string; // Mã số thuế
  productGroup?: string; // Nhóm hàng cung ứng (Inverter, Pin, Tấm pin PV, Cáp...)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Notification & Activity Log
export interface NotificationLog {
  id: string;
  customerCode: string;
  customerName: string;
  phoneNumber: string;
  channel: 'Email' | 'Zalo OA' | 'Telegram Bot' | 'Push Notification';
  title: string;
  message: string;
  sentAt: string;
  status: 'SUCCESS' | 'FAILED';
  sentBy: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  detail: string;
  timestamp: string;
}
