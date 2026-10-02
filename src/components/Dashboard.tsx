import React, { useState } from 'react';
import { 
  Users, 
  Zap, 
  Activity, 
  AlertTriangle, 
  CalendarX, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  CalendarClock,
  ArrowUpRight,
  Boxes,
  Wallet,
  Clock,
  FileText,
  Calendar
} from 'lucide-react';
import { useData } from '../context/DataContext';

interface DashboardProps {
  onNavigateToTab: (tab: 'customers' | 'maintenance' | 'inventory' | 'cashflow' | 'reports') => void;
  onFilterMaintenanceQuick?: (filterType: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab }) => {
  const { customers, maintenanceRecords, cashTransactions, inventory } = useData();

  // Active (non-disabled) customers
  const activeCustomers = customers.filter(c => !c.isDisabled);
  const disabledCustomersCount = customers.filter(c => c.isDisabled).length;

  // 1. KPI Calculations
  const totalCustomers = activeCustomers.length;
  const totalCapacityKW = activeCustomers.reduce((sum, c) => sum + (c.totalCapacityKW || 0), 0);

  const activeSystems = activeCustomers.filter(c => c.status === 'Hoạt động tốt').length;
  const needCheckSystems = activeCustomers.filter(c => c.status === 'Cần kiểm tra' || c.status === 'Đang bảo trì').length;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  // Selected year for the 12-month handover contracts chart
  const [selectedChartYear, setSelectedChartYear] = useState<number>(() => {
    // Pick the most relevant year: if there are customers, check available handover years, default to currentYear
    return currentYear;
  });

  // Calculate distinct handover years from active customers
  const availableYears = React.useMemo(() => {
    const yearSet = new Set<number>();
    yearSet.add(currentYear);
    activeCustomers.forEach(c => {
      if (c.handoverDate) {
        const y = new Date(c.handoverDate).getFullYear();
        if (!isNaN(y) && y > 2000 && y < 2100) {
          yearSet.add(y);
        }
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [activeCustomers, currentYear]);

  // Compute 12-month handover contracts statistics for the selected year
  const monthlyContractsData = React.useMemo(() => {
    // 12 months (1 -> 12)
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      return {
        month: monthNum,
        label: `T${monthNum}`,
        fullLabel: `Tháng ${monthNum}`,
        contractCount: 0,
        totalCapacityKW: 0,
        customers: [] as typeof activeCustomers
      };
    });

    activeCustomers.forEach(c => {
      if (c.handoverDate) {
        const d = new Date(c.handoverDate);
        if (!isNaN(d.getTime()) && d.getFullYear() === selectedChartYear) {
          const mIndex = d.getMonth(); // 0 to 11
          if (mIndex >= 0 && mIndex < 12) {
            months[mIndex].contractCount += 1;
            months[mIndex].totalCapacityKW += Number(c.totalCapacityKW) || 0;
            months[mIndex].customers.push(c);
          }
        }
      }
    });

    const maxCount = Math.max(...months.map(m => m.contractCount), 1);
    const totalYearContracts = months.reduce((sum, m) => sum + m.contractCount, 0);
    const totalYearKW = months.reduce((sum, m) => sum + m.totalCapacityKW, 0);

    return {
      months,
      maxCount,
      totalYearContracts,
      totalYearKW
    };
  }, [activeCustomers, selectedChartYear]);

  // Overdue maintenance calculation
  const overdueSystems = activeCustomers.filter(c => {
    if (!c.nextMaintenanceDate) return false;
    return c.nextMaintenanceDate < todayStr;
  }).length;

  // Due soon within 5 days
  const soonSystems = activeCustomers.filter(c => {
    if (!c.nextMaintenanceDate) return false;
    const diffDays = Math.ceil((new Date(c.nextMaintenanceDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 5;
  }).length;

  // Warranty status
  const inWarrantySystems = activeCustomers.filter(c => {
    if (!c.warrantyExpiryDate) return false;
    return c.warrantyExpiryDate >= todayStr;
  }).length;

  const expiredWarrantySystems = totalCustomers - inWarrantySystems;

  // Cash flow summary
  const totalThu = cashTransactions.filter(t => t.type === 'THU').reduce((s, t) => s + t.amount, 0);
  const totalChi = cashTransactions.filter(t => t.type === 'CHI').reduce((s, t) => s + t.amount, 0);
  const fundBalance = totalThu - totalChi;

  // Low stock inventory alert
  const lowStockItems = inventory.filter(i => i.stockQuantity <= i.minAlertQuantity).length;

  // Group capacity by Brand
  const brandCapacityMap: Record<string, number> = {};
  customers.forEach(c => {
    c.inverters?.forEach(inv => {
      const b = inv.brand || 'Khác';
      brandCapacityMap[b] = (brandCapacityMap[b] || 0) + (Number(inv.capacityKW) || 0);
    });
  });

  const brandEntries = Object.entries(brandCapacityMap).sort((a, b) => b[1] - a[1]);
  const maxBrandKW = Math.max(...brandEntries.map(e => e[1]), 1);

  // Status breakdown
  const statusCounts = [
    { label: 'Hoạt động tốt', count: activeSystems, color: 'bg-emerald-500', text: 'text-emerald-700', bgLight: 'bg-emerald-50' },
    { label: 'Cần kiểm tra', count: customers.filter(c => c.status === 'Cần kiểm tra').length, color: 'bg-amber-500', text: 'text-amber-700', bgLight: 'bg-amber-50' },
    { label: 'Đang bảo trì', count: customers.filter(c => c.status === 'Đang bảo trì').length, color: 'bg-blue-500', text: 'text-blue-700', bgLight: 'bg-blue-50' },
    { label: 'Ngừng hoạt động', count: customers.filter(c => c.status === 'Ngừng hoạt động').length, color: 'bg-rose-500', text: 'text-rose-700', bgLight: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-3 sm:space-y-3.5">
      {/* Top Banner Notice */}
      <div className="bg-linear-to-r from-emerald-800 via-teal-800 to-cyan-900 rounded-xl p-3 sm:p-4 text-white shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              ⚡ Hệ Thống Giám Sát Điện Mặt Trời 3TGE
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              Quản lý & Vận hành
            </h1>
            <p className="text-xs text-emerald-100/90 font-medium">
              Đồng bộ dữ liệu thời gian thực • Tự động nhắc lịch bảo trì định kỳ 180 ngày
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateToTab('customers')}
              className="px-3 py-1.5 rounded-lg bg-white text-emerald-800 text-xs font-bold shadow-xs hover:bg-emerald-50 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Thêm Khách Hàng
            </button>
            <button
              onClick={() => onNavigateToTab('maintenance')}
              className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600/90 text-white text-xs font-semibold border border-emerald-500/40 transition flex items-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5 text-amber-300" />
              Xem Lịch Bảo Trì ({overdueSystems + soonSystems})
            </button>
          </div>
        </div>

        {/* Ambient solar illustration */}
        <div className="absolute -right-8 -bottom-10 w-44 h-44 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
        {/* Total Customers */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-white px-3 py-2 sm:py-2.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">Tổng khách hàng</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight">
            {totalCustomers}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1 leading-tight">
            <ArrowUpRight className="w-3 h-3" /> Quản lý hồ sơ điện tử
          </p>
        </div>

        {/* Total Installed Capacity */}
        <div className="bg-white px-3 py-2 sm:py-2.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">Tổng công suất lắp</span>
            <div className="p-1 rounded-md bg-teal-50 text-teal-600">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-teal-700 leading-tight">
            {totalCapacityKW.toLocaleString('vi-VN')} <span className="text-xs font-bold text-slate-500">KW</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
            Tổng hòa lưới & lưu trữ
          </p>
        </div>

        {/* Active vs Need Check Systems */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-white px-3 py-2 sm:py-2.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">Đang hoạt động tốt</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 leading-tight">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{activeSystems}</span>
            <span className="text-[11px] text-slate-500 font-medium">/ {totalCustomers} trạm</span>
          </div>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5 leading-tight">
            {needCheckSystems > 0 ? `⚠️ ${needCheckSystems} trạm cần kiểm tra/bảo trì` : '✓ Tất cả trạm ổn định'}
          </p>
        </div>

        {/* Maintenance Urgent Alert */}
        <div 
          onClick={() => onNavigateToTab('maintenance')}
          className="bg-white px-3 py-2 sm:py-2.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500">Bảo trì đến hạn / quá hạn</span>
            <div className={`p-1 rounded-md ${overdueSystems > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
              <CalendarX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 leading-tight">
            <span className="text-xl sm:text-2xl font-extrabold text-rose-600">{overdueSystems}</span>
            <span className="text-[11px] text-amber-600 font-bold">quá hạn | {soonSystems} sắp tới</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
            Gửi Zalo / Telegram / SMS nhắc hẹn
          </p>
        </div>
      </div>

      {/* Secondary Quick Metrics: Warranty & Cash & Inventory */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        {/* Warranty Card */}
        <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500">Tình trạng bảo hành</div>
            <div className="flex items-center gap-1.5 mt-0.5 leading-tight">
              <span className="text-base font-extrabold text-blue-700">{inWarrantySystems} Còn BH</span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-bold text-rose-600">{expiredWarrantySystems} Hết BH</span>
            </div>
          </div>
        </div>

        {/* Cash Fund Balance Card */}
        <div 
          onClick={() => onNavigateToTab('cashflow')}
          className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5 cursor-pointer hover:shadow-xs transition"
        >
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500">Quỹ tiền mặt & Ngân hàng</div>
            <div className="text-base font-extrabold text-emerald-700 leading-tight">
              {fundBalance.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">đ</span>
            </div>
            <div className="text-[9.5px] text-slate-400">Thu: {(totalThu/1e6).toFixed(1)}M • Chi: {(totalChi/1e6).toFixed(1)}M</div>
          </div>
        </div>

        {/* Inventory low stock */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2.5 cursor-pointer hover:shadow-xs transition"
        >
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-slate-500">Tồn kho vật tư & Thiết bị</div>
            <div className="text-base font-extrabold text-slate-800 leading-tight">
              {inventory.length} <span className="text-xs font-normal text-slate-500">mã vật tư</span>
            </div>
            <div className="text-[9.5px] text-amber-600 font-semibold">
              {lowStockItems > 0 ? `⚠️ ${lowStockItems} mặt hàng chạm ngưỡng tồn tối thiểu` : 'Đầy đủ vật tư dự phòng'}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Brand Capacity Bar Chart */}
        <div className="lg:col-span-2 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Công Suất Theo Hãng Biến Tần</h2>
              <p className="text-[11px] text-slate-500">Phân bố công suất KW biến tần thực tế lắp đặt</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              Tổng {totalCapacityKW} KW
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {brandEntries.map(([brand, kw]) => {
              const pct = Math.round((kw / (totalCapacityKW || 1)) * 100);
              const barWidth = Math.round((kw / maxBrandKW) * 100);
              return (
                <div key={brand} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-700">{brand}</span>
                    <span className="text-slate-900 font-bold">{kw} KW ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-linear-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 12-Month Handover Contract Chart */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    Số Lượng Hợp Đồng Bàn Giao Theo 12 Tháng
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thống kê theo ngày bàn giao thực tế ({monthlyContractsData.totalYearContracts} hợp đồng, {monthlyContractsData.totalYearKW} KW)
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold">Năm:</span>
                  <select
                    value={selectedChartYear}
                    onChange={(e) => setSelectedChartYear(Number(e.target.value))}
                    className="bg-transparent font-bold text-emerald-700 outline-none cursor-pointer"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 12 Columns Chart */}
            <div className="relative pt-6 pb-2">
              <div className="grid grid-cols-12 gap-1 sm:gap-2 h-44 items-end border-b border-slate-200 px-1">
                {monthlyContractsData.months.map((item) => {
                  const hasContracts = item.contractCount > 0;
                  // Compute bar height percentage relative to highest month count (min 8% if hasContracts)
                  const heightPercent = hasContracts
                    ? Math.max(16, Math.round((item.contractCount / monthlyContractsData.maxCount) * 100))
                    : 4;

                  return (
                    <div 
                      key={item.month} 
                      className="group relative flex flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none transition-all duration-150 animate-in fade-in">
                        <span className="font-bold">{item.fullLabel}/{selectedChartYear}</span>
                        <span>{item.contractCount} hợp đồng ({item.totalCapacityKW} KW)</span>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5"></div>
                      </div>

                      {/* Value label above bar */}
                      <span className={`text-[10px] font-bold mb-1 transition-colors ${
                        hasContracts ? 'text-emerald-700 font-extrabold' : 'text-slate-300'
                      }`}>
                        {item.contractCount > 0 ? item.contractCount : ''}
                      </span>

                      {/* Bar Pillar */}
                      <div 
                        className={`w-full max-w-[28px] sm:max-w-[36px] rounded-t-md transition-all duration-300 group-hover:opacity-90 ${
                          hasContracts 
                            ? 'bg-linear-to-t from-emerald-600 via-teal-500 to-emerald-400 shadow-xs' 
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* Month label below bar */}
                      <span className={`text-[10px] sm:text-xs mt-2 font-semibold transition-colors ${
                        hasContracts ? 'text-emerald-800 font-bold' : 'text-slate-400'
                      }`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart footer legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></span>
                  <span>Cột biểu thị: <strong>Số lượng hợp đồng bàn giao</strong> trong tháng</span>
                </div>
                <span className="font-medium text-slate-600">
                  Tổng năm {selectedChartYear}: <strong className="text-emerald-700">{monthlyContractsData.totalYearContracts} HĐ</strong> ({monthlyContractsData.totalYearKW} kWp)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Donut / Breakdown & Immediate Actions */}
        <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Trạng Thái Hệ Thống</h2>
            <p className="text-[11px] text-slate-500">Giám sát theo thời gian thực</p>
          </div>

          <div className="space-y-1.5">
            {statusCounts.map((item) => (
              <div 
                key={item.label}
                className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between border border-slate-100 ${item.bgLight}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                </div>
                <span className={`text-xs font-extrabold ${item.text}`}>{item.count}</span>
              </div>
            ))}
          </div>

          {/* Quick Notice box */}
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Quy Trình Nhắc Lịch Tự Động
            </div>
            <p className="text-[10px] leading-relaxed text-amber-900/90">
              Hệ thống quét ngày bảo trì: 
              <strong className="text-amber-700"> &le; 5 ngày</strong> hiển thị Vàng, 
              <strong className="text-orange-600"> Đến ngày</strong> hiển thị Cam, 
              <strong className="text-rose-600"> Quá hạn</strong> hiển thị Đỏ.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
