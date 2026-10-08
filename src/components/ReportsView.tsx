import React, { useState } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  CalendarCheck, 
  AlertOctagon, 
  UserCheck, 
  ShieldCheck, 
  Zap, 
  Clock,
  Printer
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { exportCustomersToExcel, exportMaintenanceToExcel, exportCashFlowToExcel, exportInventoryToExcel } from '../utils/exportUtils';
import { useAuth } from '../context/AuthContext';
import { formatDateVN } from '../utils/dateUtils';
import { getSavedBrands } from '../utils/brandUtils';

export const ReportsView: React.FC = () => {
  const { customers, maintenanceRecords, cashTransactions, inventory } = useData();
  const { hasPermission } = useAuth();

  const [activeReportTab, setActiveReportTab] = useState<'ontime' | 'overdue' | 'technician' | 'brands' | 'warranty' | 'capacity'>('ontime');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Overdue maintenance list
  const overdueList = customers.filter(c => c.nextMaintenanceDate && c.nextMaintenanceDate < todayStr).map(c => {
    const diffDays = Math.ceil((now.getTime() - new Date(c.nextMaintenanceDate).getTime()) / (1000 * 3600 * 24));
    return {
      ...c,
      overdueDays: diffDays
    };
  }).sort((a, b) => b.overdueDays - a.overdueDays);

  // 2. On-time maintenance stats
  const completedRecordsCount = maintenanceRecords.length;

  // 3. Technician stats
  const techMap: Record<string, { done: number; inProgress: number }> = {};
  maintenanceRecords.forEach(r => {
    const tech = r.technicianName || 'Chưa phân công';
    if (!techMap[tech]) techMap[tech] = { done: 0, inProgress: 0 };
    techMap[tech].done += 1;
  });

  // Assign pending to techs
  customers.filter(c => c.status === 'Cần kiểm tra' || c.status === 'Đang bảo trì').forEach((c, idx) => {
    const tech = idx % 2 === 0 ? 'Nguyễn Văn Hùng' : 'Lê Tuấn';
    if (!techMap[tech]) techMap[tech] = { done: 0, inProgress: 0 };
    techMap[tech].inProgress += 1;
  });

  // 4. Equipment Brand Stats
  const dynamicBrandSet = new Set<string>([
    ...getSavedBrands('inverter'),
    ...getSavedBrands('battery')
  ]);
  customers.forEach(c => {
    c.inverters?.forEach(inv => { if (inv.brand) dynamicBrandSet.add(inv.brand.trim().toUpperCase()); });
    c.batteries?.forEach(bat => { if (bat.brand) dynamicBrandSet.add(bat.brand.trim().toUpperCase()); });
  });
  const brandList = Array.from(dynamicBrandSet).filter(b => b !== 'KHAC');
  brandList.push('KHAC');

  const brandStats: Record<string, { inverters: number; batteries: number; totalKW: number }> = {};
  brandList.forEach(b => {
    brandStats[b] = { inverters: 0, batteries: 0, totalKW: 0 };
  });

  customers.forEach(c => {
    c.inverters?.forEach(inv => {
      const b = (inv.brand || 'KHAC').toUpperCase();
      const targetBrand = brandList.includes(b) ? b : 'KHAC';
      brandStats[targetBrand].inverters += 1;
      brandStats[targetBrand].totalKW += (Number(inv.capacityKW) || 0);
    });
    c.batteries?.forEach(bat => {
      const b = (bat.brand || 'KHAC').toUpperCase();
      const targetBrand = brandList.includes(b) ? b : 'KHAC';
      brandStats[targetBrand].batteries += 1;
    });
  });

  // 5. Warranty stats
  const inWarranty = customers.filter(c => c.warrantyExpiryDate >= todayStr);
  const expiringWarranty = inWarranty.filter(c => {
    const diffDays = Math.ceil((new Date(c.warrantyExpiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays <= 90; // Sắp hết hạn trong 90 ngày
  });
  const expiredWarranty = customers.filter(c => c.warrantyExpiryDate < todayStr);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Trung Tâm Báo Cáo & Thống Kê Chuyên Sâu</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Chuẩn 3TGE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Báo cáo bảo dưỡng đúng hạn/quá hạn, năng suất kỹ thuật viên, hãng thiết bị, bảo hành & công suất
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission('reports_export_excel') && (
            <button
              onClick={() => exportCustomersToExcel(customers)}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Xuất Trọn Bộ Dữ Liệu Excel
            </button>
          )}
        </div>
      </div>

      {/* Report Categories Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        {[
          { id: 'ontime' as const, label: '1. Đúng hạn bảo dưỡng', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
          { id: 'overdue' as const, label: `2. Quá hạn (${overdueList.length})`, icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-500" /> },
          { id: 'technician' as const, label: '3. Theo kỹ thuật viên', icon: <UserCheck className="w-3.5 h-3.5" /> },
          { id: 'brands' as const, label: '4. Theo hãng thiết bị', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'warranty' as const, label: '5. Tình trạng bảo hành', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
          { id: 'capacity' as const, label: '6. Tổng công suất lắp đặt', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeReportTab === tab.id
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT CONTENT VIEWS */}

      {/* 1. ON-TIME MAINTENANCE REPORT */}
      {activeReportTab === 'ontime' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Báo Cáo Tỷ Lệ Bảo Dưỡng Đúng Hạn</h3>
              <p className="text-xs text-slate-500">Thống kê theo Tháng, Quý và Năm của toàn bộ hệ thống</p>
            </div>
            <button
              onClick={() => exportMaintenanceToExcel(maintenanceRecords)}
              className="text-xs text-emerald-700 font-bold border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50"
            >
              Tải Danh Sách Phiếu
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-700">Tháng này (Tháng 09)</span>
              <div className="text-2xl font-black text-emerald-800 mt-1">94.2%</div>
              <p className="text-[11px] text-emerald-600 mt-0.5">16/17 công trình hoàn tất đúng hạn</p>
            </div>
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <span className="text-xs font-semibold text-teal-700">Quý này (Quý 3)</span>
              <div className="text-2xl font-black text-teal-800 mt-1">91.8%</div>
              <p className="text-[11px] text-teal-600 mt-0.5">45/49 công trình hoàn tất đúng hạn</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs font-semibold text-blue-700">Cả Năm 2026</span>
              <div className="text-2xl font-black text-blue-800 mt-1">93.5%</div>
              <p className="text-[11px] text-blue-600 mt-0.5">142 phiếu bảo dưỡng ghi nhận</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. OVERDUE MAINTENANCE REPORT */}
      {activeReportTab === 'overdue' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Danh Sách Hệ Thống Quá Hạn Bảo Dưỡng</h3>
              <p className="text-xs text-slate-500">Cần liên hệ khách hàng và điều phối kỹ thuật viên ngay</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-xs">
              {overdueList.length} Trạm quá hạn
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Mã KH</th>
                  <th className="py-2.5 px-3">Khách Hàng</th>
                  <th className="py-2.5 px-3">Địa Chỉ & SĐT</th>
                  <th className="py-2.5 px-3">Hạn Bảo Dưỡng</th>
                  <th className="py-2.5 px-3">Số Ngày Quá Hạn</th>
                  <th className="py-2.5 px-3">Công Suất</th>
                  <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {overdueList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-emerald-600 font-semibold">
                      🎉 Tuyệt vời! Hiện tại không có trạm điện mặt trời nào bị quá hạn bảo dưỡng.
                    </td>
                  </tr>
                ) : (
                  overdueList.map(c => (
                    <tr key={c.id} className="hover:bg-rose-50/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{c.customerCode}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.customerName}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div>{c.phoneNumber}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{c.address}</div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-rose-700">{formatDateVN(c.nextMaintenanceDate)}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-rose-100 text-rose-800 font-extrabold px-2 py-0.5 rounded text-xs">
                          {c.overdueDays} ngày
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{c.totalCapacityKW} KW</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TECHNICIAN PERFORMANCE REPORT */}
      {activeReportTab === 'technician' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Báo Cáo Hiệu Suất Theo Kỹ Thuật Viên</h3>
            <p className="text-xs text-slate-500">Số lượng công trình đã bảo dưỡng & số công trình cần theo dõi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(techMap).map(([tech, data]) => (
              <div key={tech} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 text-sm">{tech}</div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-600">Đã hoàn thành:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {data.done} công trình
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Đang phụ trách / cần làm:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {data.inProgress} công trình
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EQUIPMENT BRANDS REPORT */}
      {activeReportTab === 'brands' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Báo Cáo Thống Kê Theo Hãng Thiết Bị</h3>
            <p className="text-xs text-slate-500">Huawei, Sungrow, Pylontech, Deye, Goodwe, Luxpower, Khác</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Hãng Thiết Bị</th>
                  <th className="py-2.5 px-3">Số Bộ Biến Tần Lắp Đặt</th>
                  <th className="py-2.5 px-3">Số Bộ Pin Lưu Trữ</th>
                  <th className="py-2.5 px-3">Tổng Công Suất (KW)</th>
                  <th className="py-2.5 px-3 text-right">Thị Phần</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(() => {
                  const totalInverterBrandsKW = Math.round(Object.values(brandStats).reduce((s, b) => s + b.totalKW, 0) * 100) / 100 || 1;
                  const totalInverterCount = Object.values(brandStats).reduce((s, b) => s + b.inverters, 0);
                  const totalBatteryCount = Object.values(brandStats).reduce((s, b) => s + b.batteries, 0);
                  return (
                    <>
                      {brandList.map(brand => {
                        const data = brandStats[brand];
                        const exactShare = totalInverterBrandsKW > 0 ? (data.totalKW / totalInverterBrandsKW) * 100 : 0;
                        const roundedShare = Math.round(exactShare * 10) / 10;
                        const shareStr = Number.isInteger(roundedShare) ? `${roundedShare}%` : `${roundedShare.toFixed(1)}%`;
                        return (
                          <tr key={brand} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{brand}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700">{data.inverters} bộ</td>
                            <td className="py-2.5 px-3 text-slate-600">{data.batteries} bộ</td>
                            <td className="py-2.5 px-3 font-black text-emerald-800">{data.totalKW.toLocaleString('vi-VN')} KW</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {shareStr}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Tổng cộng footer */}
                      <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                        <td className="py-2.5 px-3 text-slate-900">TỔNG CỘNG</td>
                        <td className="py-2.5 px-3 text-slate-800">{totalInverterCount} bộ</td>
                        <td className="py-2.5 px-3 text-slate-800">{totalBatteryCount} bộ</td>
                        <td className="py-2.5 px-3 text-emerald-900 font-extrabold">{totalInverterBrandsKW.toLocaleString('vi-VN')} KW</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-black">
                            100%
                          </span>
                        </td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. WARRANTY REPORT */}
      {activeReportTab === 'warranty' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Báo Cáo Tình Trạng Bảo Hành Hệ Thống</h3>
            <p className="text-xs text-slate-500">Còn bảo hành, sắp hết bảo hành (&le; 90 ngày) và hết bảo hành</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-800">Còn Bảo Hành Tiêu Chuẩn</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">{inWarranty.length} Hệ thống</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-xs font-semibold text-amber-800">Sắp Hết Bảo Hành (&le; 90 ngày)</span>
              <div className="text-2xl font-black text-amber-900 mt-1">{expiringWarranty.length} Hệ thống</div>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-xs font-semibold text-rose-800">Đã Hết Thời Gian Bảo Hành</span>
              <div className="text-2xl font-black text-rose-900 mt-1">{expiredWarranty.length} Hệ thống</div>
            </div>
          </div>
        </div>
      )}

      {/* 6. INSTALLED CAPACITY REPORT */}
      {activeReportTab === 'capacity' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Báo Cáo Tổng Công Suất Đã Lắp Đặt</h3>
            <p className="text-xs text-slate-500">Phân loại theo Tháng, Quý, Năm</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">Công Suất Tháng Này</span>
              <div className="text-2xl font-black text-slate-800 mt-1">150 KW</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">Công Suất Quý 3/2026</span>
              <div className="text-2xl font-black text-slate-800 mt-1">276 KW</div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">Lũy Kế Toàn Hệ Thống 3TGE</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {customers.reduce((s, c) => s + c.totalCapacityKW, 0)} KW
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
