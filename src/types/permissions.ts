export type PermissionAction =
  // Dashboard & Tổng quan
  | 'dashboard_view'
  | 'dashboard_export'
  
  // Quản lý Khách hàng
  | 'customer_view'
  | 'customer_create'
  | 'customer_edit'
  | 'customer_disable'
  | 'customer_delete'
  | 'customer_export'

  // Bảo trì & Nhắc lịch
  | 'maintenance_schedule_view'
  | 'maintenance_record_create'
  | 'maintenance_record_edit'
  | 'maintenance_record_delete'
  | 'maintenance_record_view'
  | 'maintenance_notify_send'
  | 'maintenance_pdf_export'

  // Kho: Xuất - Nhập - Tồn
  | 'inventory_view'
  | 'inventory_import'
  | 'inventory_export'
  | 'inventory_item_create'
  | 'inventory_item_edit'
  | 'inventory_excel_export'

  // Thu - Chi & Quỹ tiền mặt
  | 'cashflow_view'
  | 'cashflow_receipt_create'
  | 'cashflow_payment_create'
  | 'cashflow_delete'
  | 'cashflow_excel_export'

  // Báo cáo & Thống kê
  | 'reports_view'
  | 'reports_export_excel'

  // Quản trị hệ thống & Phân quyền
  | 'users_view'
  | 'users_create'
  | 'users_edit'
  | 'users_delete'
  | 'roles_configure';

export interface PermissionItem {
  id: PermissionAction;
  name: string;
  description: string;
}

export interface PermissionGroup {
  groupId: string;
  groupName: string;
  description: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupId: 'dashboard',
    groupName: '1. Bảng Điều Khiển (Dashboard)',
    description: 'Theo dõi tổng quan KPI, công suất trạm, trạng thái và tỷ lệ',
    permissions: [
      { id: 'dashboard_view', name: 'Xem Dashboard & KPI', description: 'Xem tổng công suất, số trạm hoạt động, biểu đồ thiết bị' },
      { id: 'dashboard_export', name: 'Xuất dữ liệu Dashboard', description: 'Trích xuất dữ liệu nhanh từ bảng điều khiển' },
    ]
  },
  {
    groupId: 'customers',
    groupName: '2. Quản Lý Khách Hàng & Công Trình',
    description: 'Quản lý thông tin hợp đồng, serial inverter, pin lưu trữ, tấm pin',
    permissions: [
      { id: 'customer_view', name: 'Xem danh sách khách hàng', description: 'Tra cứu, lọc khách hàng theo tỉnh thành và trạng thái' },
      { id: 'customer_create', name: 'Thêm mới khách hàng', description: 'Tạo khách hàng mới và sinh mã KH tự động' },
      { id: 'customer_edit', name: 'Chỉnh sửa thông tin KH', description: 'Cập nhật biến tần, pin lưu trữ, số điện thoại, hợp đồng' },
      { id: 'customer_disable', name: 'Vô hiệu hóa / Khôi phục KH', description: 'Tạm ngưng hồ sơ khách hàng, chuyển vào danh sách vô hiệu hóa' },
      { id: 'customer_delete', name: 'Xóa vĩnh viễn khách hàng', description: 'Chỉ được phép xóa sau khi khách hàng đã bị vô hiệu hóa' },
      { id: 'customer_export', name: 'Xuất Excel khách hàng', description: 'Xuất toàn bộ danh sách khách hàng ra tệp Excel' },
    ]
  },
  {
    groupId: 'maintenance',
    groupName: '3. Quản Lý Bảo Trì & Nhắc Lịch',
    description: 'Cảnh báo hạn bảo dưỡng, lập phiếu kỹ thuật tự động +180 ngày',
    permissions: [
      { id: 'maintenance_schedule_view', name: 'Xem lịch nhắc bảo trì', description: 'Theo dõi trạm quá hạn, đến hạn hôm nay và sắp đến hạn' },
      { id: 'maintenance_notify_send', name: 'Gửi nhắc lịch đa kênh', description: 'Gửi tin nhắn Zalo OA, Telegram Bot, Email nhắc lịch' },
      { id: 'maintenance_record_create', name: 'Lập phiếu bảo dưỡng (+180 ngày)', description: 'Tạo biên bản bảo dưỡng, ghi nhận kết quả và gia hạn' },
      { id: 'maintenance_record_edit', name: 'Chỉnh sửa phiếu bảo dưỡng', description: 'Cập nhật nội dung, kết quả và ngày bảo dưỡng' },
      { id: 'maintenance_record_delete', name: 'Xóa phiếu bảo dưỡng', description: 'Hủy hoặc xóa biên bản bảo dưỡng kỹ thuật' },
      { id: 'maintenance_record_view', name: 'Xem lịch sử bảo dưỡng', description: 'Xem chi tiết các phiếu kỹ thuật đã thực hiện' },
      { id: 'maintenance_pdf_export', name: 'In / Xuất phiếu bảo dưỡng PDF', description: 'In biên bản nghiệm thu kỹ thuật bàn giao cho khách' },
    ]
  },
  {
    groupId: 'inventory',
    groupName: '4. Quản Lý Xuất - Nhập - Tồn Kho',
    description: 'Quản lý tồn kho Inverter, Pin lithium, Tấm pin PV, Cáp DC',
    permissions: [
      { id: 'inventory_view', name: 'Xem bảng tồn kho vật tư', description: 'Theo dõi số lượng tồn, cảnh báo dưới định mức' },
      { id: 'inventory_import', name: 'Lập phiếu Nhập Kho (PN)', description: 'Ghi nhận nhập thêm thiết bị từ nhà phân phối' },
      { id: 'inventory_export', name: 'Lập phiếu Xuất Kho (PX)', description: 'Xuất kho thiết bị cho công trình lắp đặt' },
      { id: 'inventory_item_create', name: 'Thêm mặt hàng mới vào danh mục', description: 'Khai báo vật tư, mã thiết bị mới' },
      { id: 'inventory_item_edit', name: 'Sửa thông tin / định mức vật tư', description: 'Cập nhật giá vốn, định mức tối thiểu cảnh báo' },
      { id: 'inventory_excel_export', name: 'Xuất Excel bảng tồn kho', description: 'Tải file kiểm kê kho hàng' },
    ]
  },
  {
    groupId: 'cashflow',
    groupName: '5. Quản Lý Thu - Chi & Quỹ Tiền Mặt',
    description: 'Theo dõi tiền hợp đồng, phí bảo dưỡng, chi phí mua sắm & công tác phí',
    permissions: [
      { id: 'cashflow_view', name: 'Xem sổ quỹ thu chi', description: 'Xem tổng thu, tổng chi và số dư quỹ tiền mặt/ngân hàng' },
      { id: 'cashflow_receipt_create', name: 'Lập Phiếu Thu Tiền (PT)', description: 'Thu tiền hợp đồng solar, thu phí dịch vụ' },
      { id: 'cashflow_payment_create', name: 'Lập Phiếu Chi Tiền (PC)', description: 'Chi mua sắm vật tư, chi phí công tác, lương' },
      { id: 'cashflow_delete', name: 'Xóa phiếu thu / chi', description: 'Hủy bỏ giao dịch tài chính đã ghi nhận' },
      { id: 'cashflow_excel_export', name: 'Xuất Excel sổ quỹ', description: 'Trích xuất bảng kê thu chi phục vụ kế toán' },
    ]
  },
  {
    groupId: 'reports',
    groupName: '6. Trung Tâm Báo Cáo & Thống Kê',
    description: 'Báo cáo đúng hạn/quá hạn, năng suất kỹ thuật, thị phần thiết bị',
    permissions: [
      { id: 'reports_view', name: 'Xem các báo cáo quản trị', description: 'Xem báo cáo đúng hạn, báo cáo hãng, bảo hành, công suất' },
      { id: 'reports_export_excel', name: 'Xuất toàn bộ báo cáo Excel', description: 'Tải gói dữ liệu báo cáo chuyên sâu' },
    ]
  },
  {
    groupId: 'users',
    groupName: '7. Quản Trị Hệ Thống & Phân Quyền',
    description: 'Tạo tài khoản nhân viên, thiết lập quyền hạn và cơ sở dữ liệu',
    permissions: [
      { id: 'users_view', name: 'Xem danh sách nhân viên', description: 'Xem danh sách tài khoản trong cơ sở dữ liệu Firestore' },
      { id: 'users_create', name: 'Tạo tài khoản nhân viên mới', description: 'Cấp tài khoản đăng nhập cho nhân sự mới' },
      { id: 'users_edit', name: 'Sửa tài khoản / Đổi mật khẩu', description: 'Chỉnh sửa họ tên, quyền hạn và mật khẩu' },
      { id: 'users_delete', name: 'Xóa tài khoản nhân viên', description: 'Thu hồi và xóa tài khoản nhân viên khỏi hệ thống' },
      { id: 'roles_configure', name: 'Cấu hình ma trận phân quyền', description: 'Tùy chỉnh nhóm quyền cho từng vai trò trên Firestore' },
    ]
  }
];

export interface RoleDefinition {
  role: string;
  name: string;
  badgeColor: string;
  description: string;
  defaultPermissions: PermissionAction[];
}

export const SYSTEM_ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  admin: {
    role: 'admin',
    name: 'Quản Trị Viên (Admin)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Toàn quyền điều hành, phê duyệt tài chính, cấu hình hệ thống và quản trị phân quyền.',
    defaultPermissions: [
      // All permissions
      'dashboard_view', 'dashboard_export',
      'customer_view', 'customer_create', 'customer_edit', 'customer_disable', 'customer_delete', 'customer_export',
      'maintenance_schedule_view', 'maintenance_record_create', 'maintenance_record_edit', 'maintenance_record_delete', 'maintenance_record_view', 'maintenance_notify_send', 'maintenance_pdf_export',
      'inventory_view', 'inventory_import', 'inventory_export', 'inventory_item_create', 'inventory_item_edit', 'inventory_excel_export',
      'cashflow_view', 'cashflow_receipt_create', 'cashflow_payment_create', 'cashflow_delete', 'cashflow_excel_export',
      'reports_view', 'reports_export_excel',
      'users_view', 'users_create', 'users_edit', 'users_delete', 'roles_configure'
    ]
  },
  technician: {
    role: 'technician',
    name: 'Kỹ Thuật Viên (Technician)',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Khảo sát, lắp đặt, quản lý lịch bảo trì, lập phiếu kỹ thuật (+180 ngày) và theo dõi kho vật tư.',
    defaultPermissions: [
      'dashboard_view',
      'customer_view', 'customer_edit', 'customer_export',
      'maintenance_schedule_view', 'maintenance_record_create', 'maintenance_record_edit', 'maintenance_record_delete', 'maintenance_record_view', 'maintenance_notify_send', 'maintenance_pdf_export',
      'inventory_view', 'inventory_export',
      'reports_view'
    ]
  },
  cskh: {
    role: 'cskh',
    name: 'Chăm Sóc Khách Hàng (CSKH / Kế toán)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Tiếp nhận thông tin khách hàng, gửi tin nhắc lịch bảo dưỡng, quản lý thu chi hợp đồng và sổ quỹ.',
    defaultPermissions: [
      'dashboard_view',
      'customer_view', 'customer_create', 'customer_edit', 'customer_export',
      'maintenance_schedule_view', 'maintenance_notify_send', 'maintenance_record_view',
      'cashflow_view', 'cashflow_receipt_create', 'cashflow_payment_create', 'cashflow_excel_export',
      'reports_view'
    ]
  }
};
