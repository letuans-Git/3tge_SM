import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Upload, 
  X, 
  Check, 
  AlertCircle,
  Cpu,
  Battery,
  Sun,
  Shield,
  Calendar,
  Building,
  Phone,
  FileText,
  MapPin,
  Loader2,
  Image as ImageIcon,
  Wind,
  Eye,
  Maximize2
} from 'lucide-react';
import { Customer, InverterItem, BatteryItem, SolarBrand, InverterBrand, BatteryBrand, SystemStatus, WindTurbineItem } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { formatDateVN } from '../utils/dateUtils';
import { useEquipmentBrands } from '../utils/brandUtils';
import { BrandSelectField } from './BrandSelectField';
import { useDistributors } from '../utils/distributorUtils';
import { DistributorSelectField } from './DistributorSelectField';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'totalCapacityKW'>) => Promise<void>;
  initialData?: Customer | null;
  nextCustomerCode: string;
}

const SYSTEM_STATUSES: SystemStatus[] = ['Hoạt động tốt', 'Cần kiểm tra', 'Đang bảo trì', 'Ngừng hoạt động'];
const DEFAULT_CONTRACT_NUMBER = '999901/HĐNLMT-2026/3TGE';

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  nextCustomerCode
}) => {
  if (!isOpen) return null;

  const { 
    inverterBrands, 
    batteryBrands, 
    solarBrands, 
    windBrands,
    addBrand 
  } = useEquipmentBrands();

  const {
    distributors,
    addDistributor
  } = useDistributors();

  // Form states
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [province, setProvince] = useState(initialData?.province || 'Hải Phòng');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [contractNumber, setContractNumber] = useState(initialData?.contractNumber || DEFAULT_CONTRACT_NUMBER);
  const [handoverDate, setHandoverDate] = useState(initialData?.handoverDate || new Date().toISOString().split('T')[0]);
  
  // Helper to calculate date + 180 days based on a reference date
  const add180Days = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + 180);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const defaultWarranty = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 5); // 5 years
    return d.toISOString().split('T')[0];
  };

  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(
    initialData?.nextMaintenanceDate || add180Days(initialData?.handoverDate || new Date().toISOString().split('T')[0])
  );
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState(initialData?.warrantyExpiryDate || defaultWarranty());
  const [status, setStatus] = useState<SystemStatus>(initialData?.status || 'Hoạt động tốt');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Automatically add 180 days to nextMaintenanceDate whenever handoverDate is changed
  const handleHandoverDateChange = (newDate: string) => {
    setHandoverDate(newDate);
    if (newDate) {
      const next180 = add180Days(newDate);
      if (next180) {
        setNextMaintenanceDate(next180);
      }
    }
  };

  // Inverters (max 5)
  const [inverters, setInverters] = useState<InverterItem[]>(
    initialData?.inverters?.length 
      ? initialData.inverters 
      : [{ id: 'inv_1', serialNumber: '', brand: 'GOODWE', capacityKW: 10, phase: '3 pha', distributor: 'HTPRO189' }]
  );

  // Batteries (max 5)
  const [batteries, setBatteries] = useState<BatteryItem[]>(
    initialData?.batteries?.length 
      ? initialData.batteries 
      : []
  );

  // Solar panels
  const [solarPanels, setSolarPanels] = useState(
    initialData?.solarPanels || {
      quantity: 20,
      brand: 'LONGI',
      wattPerPanel: 630,
      distributor: 'HTPRO189'
    }
  );

  // Wind turbines (Thiết bị điện gió)
  const [windTurbines, setWindTurbines] = useState<WindTurbineItem[]>(
    initialData?.windTurbines?.length
      ? initialData.windTurbines
      : []
  );

  // Images (Base64)
  const [images, setImages] = useState({
    overview: initialData?.images?.overview || '',
    inverter: initialData?.images?.inverter || '',
    battery: initialData?.images?.battery || '',
    panels: initialData?.images?.panels || ''
  });

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync form state when initialData or modal open status changes
  useEffect(() => {
    if (isOpen) {
      setCustomerName(initialData?.customerName || '');
      setAddress(initialData?.address || '');
      setProvince(initialData?.province || 'Hải Phòng');
      setPhoneNumber(initialData?.phoneNumber || '');
      setContractNumber(initialData?.contractNumber || DEFAULT_CONTRACT_NUMBER);
      const initHandover = initialData?.handoverDate || new Date().toISOString().split('T')[0];
      setHandoverDate(initHandover);
      setNextMaintenanceDate(initialData?.nextMaintenanceDate || add180Days(initHandover));
      setWarrantyExpiryDate(initialData?.warrantyExpiryDate || defaultWarranty());
      setStatus(initialData?.status || 'Hoạt động tốt');
      setNotes(initialData?.notes || '');
      setInverters(
        initialData?.inverters?.length 
          ? initialData.inverters 
          : [{ id: 'inv_1', serialNumber: '', brand: 'GOODWE', capacityKW: 10, phase: '3 pha', distributor: 'HTPRO189' }]
      );
      setBatteries(
        initialData?.batteries?.length 
          ? initialData.batteries 
          : []
      );
      setSolarPanels(
        initialData?.solarPanels || {
          quantity: 20,
          brand: 'AE_SOLAR',
          wattPerPanel: 630,
          distributor: 'HTPRO189'
        }
      );
      setWindTurbines(
        initialData?.windTurbines?.length
          ? initialData.windTurbines
          : []
      );
      setImages({
        overview: initialData?.images?.overview || '',
        inverter: initialData?.images?.inverter || '',
        battery: initialData?.images?.battery || '',
        panels: initialData?.images?.panels || ''
      });
      setErrorMsg('');
      setUploadingKey(null);
    }
  }, [isOpen, initialData]);

  // Add inverter (max 5)
  const handleAddInverter = () => {
    if (inverters.length >= 5) return;
    setInverters([
      ...inverters,
      {
        id: `inv_${Date.now()}`,
        serialNumber: '',
        brand: inverterBrands.includes('GOODWE') ? 'GOODWE' : (inverterBrands[0] || 'GOODWE'),
        capacityKW: 10,
        phase: '3 pha',
        distributor: distributors[0] || 'HTPRO189'
      }
    ]);
  };

  const handleRemoveInverter = (index: number) => {
    setInverters(inverters.filter((_, i) => i !== index));
  };

  const handleUpdateInverter = (index: number, field: keyof InverterItem, value: any) => {
    const updated = [...inverters];
    updated[index] = { ...updated[index], [field]: value };
    setInverters(updated);
  };

  // Add battery (max 5)
  const handleAddBattery = () => {
    if (batteries.length >= 5) return;
    setBatteries([
      ...batteries,
      {
        id: `bat_${Date.now()}`,
        serialNumber: '',
        brand: batteryBrands[0] || 'PYLONTECH',
        capacityKWh: 5.12,
        distributor: distributors[0] || 'HTPRO189'
      }
    ]);
  };

  const handleRemoveBattery = (index: number) => {
    setBatteries(batteries.filter((_, i) => i !== index));
  };

  const handleUpdateBattery = (index: number, field: keyof BatteryItem, value: any) => {
    const updated = [...batteries];
    updated[index] = { ...updated[index], [field]: value };
    setBatteries(updated);
  };

  // Add wind turbine
  const handleAddWindTurbine = () => {
    setWindTurbines([
      ...windTurbines,
      {
        id: `wind_${Date.now()}`,
        serialNumber: '',
        brand: windBrands[0] || 'HY_ENERGY',
        capacityKW: 5,
        distributor: distributors[0] || 'HTPRO189'
      }
    ]);
  };

  const handleRemoveWindTurbine = (index: number) => {
    setWindTurbines(windTurbines.filter((_, i) => i !== index));
  };

  const handleUpdateWindTurbine = (index: number, field: keyof WindTurbineItem, value: any) => {
    const updated = [...windTurbines];
    updated[index] = { ...updated[index], [field]: value };
    setWindTurbines(updated);
  };

  // Image upload handler with intelligent client-side image compression
  const handleImageUpload = async (key: keyof typeof images, file: File) => {
    try {
      setUploadingKey(key);
      setErrorMsg('');
      // Compress to max 1200x1200px, 0.78 quality (~80-150KB per image)
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.78);
      setImages(prev => ({ ...prev, [key]: compressedDataUrl }));
    } catch (err) {
      console.error('Error compressing image:', err);
      setErrorMsg('Không thể xử lý tệp ảnh. Vui lòng chọn ảnh định dạng JPG/PNG.');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Vui lòng nhập tên khách hàng!');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại liên hệ!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      await onSubmit({
        customerName: customerName.trim(),
        address: address.trim(),
        province,
        phoneNumber: phoneNumber.trim(),
        contractNumber: contractNumber.trim() || DEFAULT_CONTRACT_NUMBER,
        inverters,
        batteries,
        solarPanels: {
          ...solarPanels,
          totalKWp: ((solarPanels.quantity || 0) * (solarPanels.wattPerPanel || 0)) / 1000
        },
        windTurbines,
        handoverDate,
        nextMaintenanceDate,
        warrantyExpiryDate,
        status,
        notes: notes.trim(),
        images
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin khách hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[96vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              {initialData ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng & Hệ Thống Solar'}
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {initialData?.customerCode || nextCustomerCode}
            </span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              (Mã tự động)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-black hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-2 sm:p-2.5 space-y-1.5">
          {errorMsg && (
            <div className="p-1.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Customer Info */}
          <div className="space-y-1">
            <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
              <Building className="w-3 h-3 text-emerald-600" />
              1. Thông Tin Khách Hàng & Hợp Đồng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-1.5">
              <div className="lg:col-span-4">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Tên Khách Hàng / Đơn Vị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Công Ty May Hoà An / Anh Nguyễn Văn A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Số Điện Thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="0913.xxx.xxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium"
                />
              </div>

              <div className="lg:col-span-5">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Số Hợp Đồng
                </label>
                <input
                  type="text"
                  placeholder="999901/HĐNLMT-2026/3TGE"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value.toUpperCase())}
                  className="w-full px-1.5 py-0.5 text-xs uppercase rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium"
                />
              </div>

              <div className="lg:col-span-8">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Địa Chỉ Lắp Đặt <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Số nhà, đường, phường/xã, quận/huyện"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium"
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Tỉnh / Thành Phố
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 text-black font-medium"
                >
                  <option value="Hải Phòng">Hải Phòng</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Quảng Ninh">Quảng Ninh</option>
                  <option value="Hải Dương">Hải Dương</option>
                  <option value="Thái Bình">Thái Bình</option>
                  <option value="Nam Định">Nam Định</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Bình Dương">Bình Dương</option>
                  <option value="Đồng Nai">Đồng Nai</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Khác">Khác...</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Inverters (Max 5) */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
                <Cpu className="w-3 h-3 text-emerald-600" />
                2. Thiết Bị Biến Tần (Inverter) ({inverters.length}/5)
              </h3>
              {inverters.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddInverter}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-0.5 transition"
                >
                  <Plus className="w-2.5 h-2.5" /> Thêm Biến Tần
                </button>
              )}
            </div>

            <div className="space-y-1">
              {inverters.map((inv, idx) => (
                <div key={inv.id || idx} className="p-1 sm:p-1.5 bg-slate-50/70 border border-slate-200 rounded space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-black leading-none">
                    <span>Biến tần #{idx + 1}</span>
                    {inverters.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInverter(idx)}
                        className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 text-[9.5px]"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Xóa
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                    <div>
                      <label className="text-[9px] font-bold text-black mb-0.5 block leading-tight">Serial Number (SN)</label>
                      <input
                        type="text"
                        placeholder="SUN123456..."
                        value={inv.serialNumber}
                        onChange={(e) => handleUpdateInverter(idx, 'serialNumber', e.target.value.toUpperCase())}
                        className="w-full px-1.5 py-0.5 text-xs uppercase bg-white rounded border border-slate-200 font-mono text-black"
                      />
                    </div>
                    <BrandSelectField
                      label="Hãng sản xuất"
                      value={inv.brand}
                      category="inverter"
                      availableBrands={inverterBrands}
                      onChange={(val) => handleUpdateInverter(idx, 'brand', val)}
                      onAddNewBrand={addBrand}
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-[9px] font-bold text-black block truncate mb-0.5 leading-tight" title="Công suất (KW)">
                          Công suất (KW)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="20"
                          value={inv.capacityKW}
                          onChange={(e) => handleUpdateInverter(idx, 'capacityKW', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 focus:outline-emerald-500 text-black font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-black block truncate mb-0.5 leading-tight" title="Pha điện">
                          Pha điện
                        </label>
                        <select
                          value={inv.phase || '3 pha'}
                          onChange={(e) => handleUpdateInverter(idx, 'phase', e.target.value as '1 pha' | '3 pha')}
                          className="w-full px-1 py-0.5 text-xs bg-white rounded border border-slate-200 font-semibold text-black focus:outline-emerald-500"
                        >
                          <option value="1 pha">1 pha</option>
                          <option value="3 pha">3 pha</option>
                        </select>
                      </div>
                    </div>
                    <DistributorSelectField
                      label="Nhà phân phối"
                      value={inv.distributor}
                      availableDistributors={distributors}
                      onChange={(val) => handleUpdateInverter(idx, 'distributor', val)}
                      onAddNewDistributor={addDistributor}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Batteries (Max 5) */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-600" />
                3. Pin Lưu Trữ (Battery Lithium) ({batteries.length}/5)
              </h3>
              {batteries.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddBattery}
                  className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-0.5 transition"
                >
                  <Plus className="w-2.5 h-2.5" /> Thêm Bộ Pin
                </button>
              )}
            </div>

            {batteries.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic bg-slate-50/70 px-2 py-1 rounded border border-slate-200">
                Chưa có pin lưu trữ (Hệ thống bám tải thông thường). Bấm &quot;Thêm Bộ Pin&quot; nếu là hệ thống Hybrid có lưu trữ.
              </p>
            ) : (
              <div className="space-y-1">
                {batteries.map((bat, idx) => (
                  <div key={bat.id || idx} className="p-1 sm:p-1.5 bg-slate-50/70 border border-slate-200 rounded space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-black leading-none">
                      <span>Pin lưu trữ #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBattery(idx)}
                        className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 text-[9.5px]"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Xóa
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                      <div>
                        <label className="text-[9px] font-bold text-black mb-0.5 block leading-tight">Serial Number (SN)</label>
                        <input
                          type="text"
                          placeholder="BAT123456..."
                          value={bat.serialNumber}
                          onChange={(e) => handleUpdateBattery(idx, 'serialNumber', e.target.value.toUpperCase())}
                          className="w-full px-1.5 py-0.5 text-xs uppercase bg-white rounded border border-slate-200 font-mono text-black"
                        />
                      </div>
                      <BrandSelectField
                        label="Hãng sản xuất"
                        value={bat.brand}
                        category="battery"
                        availableBrands={batteryBrands}
                        onChange={(val) => handleUpdateBattery(idx, 'brand', val)}
                        onAddNewBrand={addBrand}
                      />
                      <div>
                        <label className="text-[9px] font-bold text-black mb-0.5 block leading-tight">Dung lượng (KWh)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="5.12"
                          value={bat.capacityKWh}
                          onChange={(e) => handleUpdateBattery(idx, 'capacityKWh', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 text-black font-semibold"
                        />
                      </div>
                      <DistributorSelectField
                        label="Nhà phân phối"
                        value={bat.distributor}
                        availableDistributors={distributors}
                        onChange={(val) => handleUpdateBattery(idx, 'distributor', val)}
                        onAddNewDistributor={addDistributor}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Solar Panels */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
              <Sun className="w-3 h-3 text-emerald-600" />
              4. Tấm Pin Mặt Trời (PV Modules)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 bg-slate-50/70 p-1 sm:p-1.5 rounded border border-slate-200">
              <div>
                <label className="block text-[9px] font-bold text-black mb-0.5 truncate leading-tight">Số lượng tấm</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={solarPanels.quantity}
                  onKeyDown={(e) => {
                    if (['-', '.', ',', 'e', 'E'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const parsed = raw === '' ? 0 : parseInt(raw, 10);
                    setSolarPanels({ ...solarPanels, quantity: parsed });
                  }}
                  className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 text-black font-semibold"
                />
              </div>

              <BrandSelectField
                label="Hãng sản xuất"
                value={solarPanels.brand}
                category="solar"
                availableBrands={solarBrands}
                onChange={(val) => setSolarPanels({ ...solarPanels, brand: val })}
                onAddNewBrand={addBrand}
              />

              <div>
                <label className="block text-[9px] font-bold text-black mb-0.5 truncate leading-tight">Công suất/tấm (W)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="630"
                  value={solarPanels.wattPerPanel}
                  onKeyDown={(e) => {
                    if (['-', '.', ',', 'e', 'E'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const parsed = raw === '' ? 0 : parseInt(raw, 10);
                    setSolarPanels({ ...solarPanels, wattPerPanel: parsed });
                  }}
                  className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 text-black font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-black mb-0.5 truncate leading-tight" title="Tổng công suất (KWp) = Số lượng tấm × Công suất mỗi tấm">
                  Tổng công suất (KWp)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    value={
                      ((solarPanels.quantity || 0) * (solarPanels.wattPerPanel || 0)) === 0
                        ? '0'
                        : (((solarPanels.quantity || 0) * (solarPanels.wattPerPanel || 0)) / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
                    }
                    title={`${((solarPanels.quantity || 0) * (solarPanels.wattPerPanel || 0)).toLocaleString('vi-VN')} W = ${(((solarPanels.quantity || 0) * (solarPanels.wattPerPanel || 0)) / 1000).toFixed(2)} KWp`}
                    className="w-full px-1.5 py-0.5 pr-8 text-xs bg-slate-100 rounded border border-slate-200 text-emerald-800 font-bold cursor-not-allowed select-none"
                  />
                  <span className="absolute right-1.5 top-0.5 text-[9px] font-bold text-emerald-700 pointer-events-none">
                    KWp
                  </span>
                </div>
              </div>

              <DistributorSelectField
                label="Nhà phân phối"
                value={solarPanels.distributor}
                availableDistributors={distributors}
                onChange={(val) => setSolarPanels({ ...solarPanels, distributor: val })}
                onAddNewDistributor={addDistributor}
              />
            </div>
          </div>

          {/* Section 5: Wind Power Equipment (Thiết Bị Điện Gió) */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-600" />
                5. Thiết Bị Điện Gió (Tuabin Gió) {windTurbines.length > 0 && `(${windTurbines.length})`}
              </h3>
              <button
                type="button"
                onClick={handleAddWindTurbine}
                className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold flex items-center gap-0.5 transition"
              >
                <Plus className="w-2.5 h-2.5" /> Thêm Thiết Bị Gió
              </button>
            </div>

            {windTurbines.length === 0 ? (
              <div className="px-2 py-1 bg-slate-50/70 rounded border border-dashed border-slate-200 flex items-center justify-between text-[10px]">
                <p className="text-slate-500 italic">
                  Chưa có thiết bị điện gió. Bấm &quot;Thêm Thiết Bị Gió&quot; nếu công trình có tuabin gió.
                </p>
                <button
                  type="button"
                  onClick={handleAddWindTurbine}
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline ml-2 shrink-0"
                >
                  + Thêm
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {windTurbines.map((wind, idx) => (
                  <div key={wind.id || idx} className="p-1 sm:p-1.5 bg-slate-50/70 border border-slate-200 rounded space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-black leading-none">
                      <span>Thiết bị điện gió #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveWindTurbine(idx)}
                        className="text-rose-500 hover:text-rose-700 flex items-center gap-0.5 text-[9.5px]"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Xóa
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
                      <div>
                        <label className="text-[9px] font-bold text-black block mb-0.5 leading-tight">Số Serial Number (SN)</label>
                        <input
                          type="text"
                          placeholder="WIND123456..."
                          value={wind.serialNumber}
                          onChange={(e) => handleUpdateWindTurbine(idx, 'serialNumber', e.target.value.toUpperCase())}
                          className="w-full px-1.5 py-0.5 text-xs uppercase bg-white rounded border border-slate-200 font-mono text-black font-semibold"
                        />
                      </div>
                      <BrandSelectField
                        label="Hãng sản xuất"
                        value={wind.brand}
                        category="wind"
                        availableBrands={windBrands}
                        onChange={(val) => handleUpdateWindTurbine(idx, 'brand', val)}
                        onAddNewBrand={addBrand}
                      />
                      <div>
                        <label className="text-[9px] font-bold text-black block mb-0.5 leading-tight">Công suất (KW)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder="5"
                          value={wind.capacityKW}
                          onChange={(e) => handleUpdateWindTurbine(idx, 'capacityKW', parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-0.5 text-xs bg-white rounded border border-slate-200 text-black font-semibold"
                        />
                      </div>
                      <DistributorSelectField
                        label="Nhà phân phối"
                        value={wind.distributor}
                        availableDistributors={distributors}
                        onChange={(val) => handleUpdateWindTurbine(idx, 'distributor', val)}
                        onAddNewDistributor={addDistributor}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Timeline & Operating Status */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-600" />
              6. Tiến Độ, Kỳ Bảo Dưỡng & Tình Trạng
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">Ngày Bàn Giao</label>
                  {handoverDate && <span className="text-[8.5px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{formatDateVN(handoverDate)}</span>}
                </div>
                <input
                  type="date"
                  value={handoverDate}
                  onChange={(e) => handleHandoverDateChange(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 text-black font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">
                    Kỳ Bảo Dưỡng <span className="text-emerald-600 font-bold">(+180d)</span>
                  </label>
                  {nextMaintenanceDate && <span className="text-[8.5px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{formatDateVN(nextMaintenanceDate)}</span>}
                </div>
                <input
                  type="date"
                  value={nextMaintenanceDate}
                  onChange={(e) => setNextMaintenanceDate(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-emerald-300 bg-emerald-50/50 text-black font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">Hạn Bảo Hành</label>
                  {warrantyExpiryDate && <span className="text-[8.5px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">{formatDateVN(warrantyExpiryDate)}</span>}
                </div>
                <input
                  type="date"
                  value={warrantyExpiryDate}
                  onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 text-black font-medium"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-black mb-0.5 leading-tight">Tình Trạng Hoạt Động</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SystemStatus)}
                  className="w-full px-1.5 py-0.5 text-xs font-semibold rounded border border-slate-200 text-black"
                >
                  {SYSTEM_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-black mb-0.5 leading-tight">Ghi Chú Kỹ Thuật</label>
              <textarea
                rows={1}
                placeholder="Ghi chú về vị trí lắp đặt, aptomat DC, inverter hướng nắng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 text-black font-medium resize-y"
              />
            </div>
          </div>

          {/* Section 7: Image Uploads */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1">
                <Upload className="w-3 h-3 text-emerald-600" />
                7. Hình Ảnh Công Trình Thực Tế
              </h3>
              <span className="text-[9px] text-slate-400 font-normal italic">
                * Bấm vào ảnh để phóng to
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { label: 'Ảnh Tổng Thể', key: 'overview' as const },
                { label: 'Ảnh Hóa Đơn Nhập', key: 'inverter' as const },
                { label: 'Ảnh CO-CQ', key: 'battery' as const },
                { label: 'Ảnh Tấm Pin PV', key: 'panels' as const },
              ].map(({ label, key }) => (
                <div key={key} className="border border-slate-200 rounded p-1 text-center space-y-0.5 bg-slate-50/70 relative overflow-hidden">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[9px] font-bold text-black truncate">{label}</span>
                    {images[key] && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: images[key], title: label })}
                        title="Phóng to xem đầy đủ ảnh"
                        className="text-[8.5px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                      >
                        <Eye className="w-2.5 h-2.5" /> Xem
                      </button>
                    )}
                  </div>
                  
                  {uploadingKey === key ? (
                    <div className="h-16 sm:h-20 flex flex-col items-center justify-center text-[9px] text-emerald-700 bg-emerald-50 rounded border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-emerald-600" />
                      <span>Đang nén ảnh...</span>
                    </div>
                  ) : images[key] ? (
                    <div className="relative group rounded overflow-hidden border border-slate-300 bg-slate-900/5 h-16 sm:h-20 flex items-center justify-center">
                      <img 
                        src={images[key]} 
                        alt={label} 
                        onClick={() => setPreviewImage({ src: images[key], title: label })}
                        className="w-full h-full object-contain cursor-pointer transition hover:scale-102"
                        title="Bấm để xem ảnh đầy đủ"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: images[key], title: label })}
                          title="Xem toàn bộ ảnh đầy đủ"
                          className="p-1 bg-emerald-600 text-white rounded-full text-xs shadow hover:bg-emerald-700 transition"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages({ ...images, [key]: '' })}
                          title="Xóa ảnh này"
                          className="p-1 bg-rose-600 text-white rounded-full text-xs shadow hover:bg-rose-700 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center h-16 sm:h-20 rounded border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition p-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5">Tải ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload(key, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="sticky bottom-0 bg-white py-1 border-t border-slate-200 flex items-center justify-end gap-2 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded transition"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-0.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs flex items-center gap-1 transition disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Đang lưu...' : initialData ? 'Lưu Thay Đổi' : 'Tạo Khách Hàng Mới'}
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox Modal for Full Image View */}
      {previewImage && (
        <div
          className="fixed inset-0 z-70 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 text-white border-b border-slate-800 bg-slate-950">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                {previewImage.title} (Toàn Bộ Ảnh Đầy Đủ)
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[calc(92vh-50px)] bg-slate-950/70">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
