import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { Customer, MaintenanceRecord, CashTransaction, InventoryItem } from '../types';
import { formatDateVN } from './dateUtils';

export function exportCustomersToExcel(customers: Customer[]) {
  const data = customers.map((c, idx) => ({
    'STT': idx + 1,
    'Mã KH': c.customerCode,
    'Tên khách hàng': c.customerName,
    'Số điện thoại': c.phoneNumber,
    'Hợp đồng': c.contractNumber,
    'Địa chỉ': c.address,
    'Tỉnh/Thành': c.province || '',
    'Tổng công suất (kW)': c.totalCapacityKW,
    'Số biến tần': c.inverters?.length || 0,
    'Hãng Inverter': c.inverters?.map(i => `${i.brand} (${i.capacityKW}kW${i.phase ? `, ${i.phase}` : ''})`).join('; ') || '',
    'Pin lưu trữ': c.batteries?.map(b => `${b.brand} (${b.capacityKWh}kWh)`).join('; ') || 'Không',
    'Tấm pin': `${c.solarPanels?.quantity || 0} tấm ${c.solarPanels?.brand || ''} ${c.solarPanels?.wattPerPanel || 0}W`,
    'Ngày bàn giao': formatDateVN(c.handoverDate),
    'Hạn bảo hành': formatDateVN(c.warrantyExpiryDate),
    'Kỳ bảo dưỡng': formatDateVN(c.nextMaintenanceDate),
    'Trạng thái': c.status,
    'Ghi chú': c.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KhachHang_3TGE');
  XLSX.writeFile(workbook, `3TGE_DanhSachKhachHang_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportMaintenanceToExcel(records: MaintenanceRecord[]) {
  const data = records.map((r, idx) => ({
    'STT': idx + 1,
    'Mã phiếu': r.maintenanceCode,
    'Mã khách hàng': r.customerCode,
    'Tên khách hàng': r.customerName,
    'Ngày thực hiện': formatDateVN(r.maintenanceDate),
    'Kỹ thuật viên': r.technicianName,
    'Nội dung': r.content,
    'Kết quả kiểm tra': r.inspectionResult,
    'Khuyến nghị': r.recommendations,
    'Kỳ bảo dưỡng tiếp theo (+180d)': formatDateVN(r.nextScheduledDate)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PhieuBaoDuong_3TGE');
  XLSX.writeFile(workbook, `3TGE_BaoCaoBaoDuong_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportCashFlowToExcel(transactions: CashTransaction[]) {
  const data = transactions.map((t, idx) => ({
    'STT': idx + 1,
    'Mã phiếu': t.code,
    'Ngày': formatDateVN(t.date),
    'Loại': t.type === 'THU' ? 'Thu tiền' : 'Chi tiền',
    'Danh mục': t.category,
    'Số tiền (VNĐ)': t.amount,
    'Hình thức': t.paymentMethod,
    'Người nộp / nhận': t.payerReceiver,
    'Mã KH liên quan': t.customerRefCode || '',
    'Người lập': t.createdBy,
    'Ghi chú': t.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QuyTienMat_3TGE');
  XLSX.writeFile(workbook, `3TGE_SoQuyTienMat_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportInventoryToExcel(items: InventoryItem[]) {
  const data = items.map((i, idx) => ({
    'STT': idx + 1,
    'Mã vật tư': i.code,
    'Tên vật tư': i.name,
    'Danh mục': i.category,
    'Hãng': i.brand,
    'Đơn vị tính': i.unit,
    'Tồn kho': i.stockQuantity,
    'Mức cảnh báo tồn': i.minAlertQuantity,
    'Đơn giá (VNĐ)': i.unitPrice,
    'Giá trị tồn': i.stockQuantity * i.unitPrice,
    'Vị trí': i.location || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'TonKho_3TGE');
  XLSX.writeFile(workbook, `3TGE_BaoCaoTonKho_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportMaintenancePDF(record: MaintenanceRecord) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(16, 120, 70); // Green
  doc.text('CONG TY CO PHAN CONG NGHE NANG LUONG 3TGE', 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('NANG LUONG XANH - KIEN TAO TUONG LAI | Hotline: 0913.566.532', 14, 27);
  doc.line(14, 31, 196, 31);

  doc.setFontSize(15);
  doc.setTextColor(30, 41, 59);
  doc.text('BIEN BAN KIEM TRA & PHIEU BAO DUONG HE THONG', 14, 42);

  doc.setFontSize(11);
  doc.text(`Ma phieu: ${record.maintenanceCode}`, 14, 52);
  doc.text(`Ngay thuc hien: ${formatDateVN(record.maintenanceDate)}`, 120, 52);
  doc.text(`Khach hang: ${record.customerName} (${record.customerCode})`, 14, 60);
  doc.text(`Ky thuat vien phu trach: ${record.technicianName}`, 14, 68);

  doc.setFillColor(240, 248, 244);
  doc.rect(14, 76, 182, 10, 'F');
  doc.setTextColor(16, 120, 70);
  doc.setFontSize(11);
  doc.text('NOI DUNG CONG VIEC DA THUC HIEN', 16, 83);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  const splitContent = doc.splitTextToSize(record.content || 'Khong co ghi chu noi dung.', 180);
  doc.text(splitContent, 14, 93);

  const yAfterContent = 95 + (splitContent.length * 6);

  doc.setFillColor(240, 248, 244);
  doc.rect(14, yAfterContent, 182, 10, 'F');
  doc.setTextColor(16, 120, 70);
  doc.setFontSize(11);
  doc.text('KET QUA KIEM TRA & THONG SO VAN HANH', 16, yAfterContent + 7);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  const splitResult = doc.splitTextToSize(record.inspectionResult || 'He thong hoat dong tot.', 180);
  doc.text(splitResult, 14, yAfterContent + 17);

  const yAfterResult = yAfterContent + 19 + (splitResult.length * 6);

  doc.setFillColor(240, 248, 244);
  doc.rect(14, yAfterResult, 182, 10, 'F');
  doc.setTextColor(16, 120, 70);
  doc.setFontSize(11);
  doc.text('KHUYEN NGHI CUA CHUYEN GIA KY THUAT 3TGE', 16, yAfterResult + 7);

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  const splitRec = doc.splitTextToSize(record.recommendations || 'Theo doi dinh ky thuong xuyen.', 180);
  doc.text(splitRec, 14, yAfterResult + 17);

  const yNext = yAfterResult + 25 + (splitRec.length * 6);
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text(`* Ngay den ky bao duong dinh ky tiep theo (+180 ngay): ${formatDateVN(record.nextScheduledDate)}`, 14, yNext);

  // Signatures
  doc.setTextColor(71, 85, 105);
  doc.text('DAI DIEN KHACH HANG', 25, yNext + 22);
  doc.text('(Ky va ghi ro ho ten)', 27, yNext + 28);

  doc.text('KY THUAT VIEN THUC HIEN', 125, yNext + 22);
  doc.text(`(${record.technicianName})`, 130, yNext + 28);

  doc.save(`PhieuBaoDuong_${record.maintenanceCode}.pdf`);
}
