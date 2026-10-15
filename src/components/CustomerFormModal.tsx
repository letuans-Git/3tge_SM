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
  Maximize2,
  Download,
  FileCheck,
  FilePlus,
  Paperclip,
  Camera,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { Customer, InverterItem, BatteryItem, SolarBrand, InverterBrand, BatteryBrand, SystemStatus, WindTurbineItem, CustomerPdfDocument } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { 
  formatDateVN, 
  toDMY, 
  dmyToISO, 
  isValidDMY, 
  formatDMYInput, 
  add180DaysDMY, 
  defaultWarrantyDMY 
} from '../utils/dateUtils';
import { useEquipmentBrands } from '../utils/brandUtils';
import { BrandSelectField } from './BrandSelectField';
import { PdfViewerModal } from './PdfViewerModal';
import { resolvePdfFileData } from '../utils/pdfStorage';
import { useData } from '../context/DataContext';
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

/**
 * Tự động viết hoa chữ cái đầu tiên của mỗi từ (hỗ trợ đầy đủ tiếng Việt và Unicode)
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str.replace(/(^|[\s\-_./()&,["'“”‘’])(\p{Ll})/gu, (_, prefix, char) => {
    return prefix + char.toUpperCase();
  });
};

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  nextCustomerCode
}) => {
  const { 
    inverterBrands, 
    batteryBrands, 
    solarBrands, 
    windBrands,
    addBrand 
  } = useEquipmentBrands();

  const { suppliers } = useData();
  const defaultDistributor = React.useMemo(() => {
    return suppliers.find(s => s.name?.toUpperCase() === 'HTPRO189')?.name || suppliers[0]?.name || 'HTPRO189';
  }, [suppliers]);

  // Form states
  const [customerName, setCustomerName] = useState(capitalizeWords(initialData?.customerName || ''));
  const [address, setAddress] = useState(capitalizeWords(initialData?.address || ''));
  const [province, setProvince] = useState(initialData?.province || 'Hải Phòng');
  const [phoneNumber, setPhoneNumber] = useState((initialData?.phoneNumber || '').replace(/\D/g, ''));
  const [contractNumber, setContractNumber] = useState(initialData?.contractNumber || DEFAULT_CONTRACT_NUMBER);
  const [handoverDate, setHandoverDate] = useState(
    initialData?.handoverDate ? toDMY(initialData.handoverDate) : toDMY(new Date())
  );
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(
    initialData?.nextMaintenanceDate 
      ? toDMY(initialData.nextMaintenanceDate) 
      : add180DaysDMY(initialData?.handoverDate ? toDMY(initialData.handoverDate) : toDMY(new Date()))
  );
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState(
    initialData?.warrantyExpiryDate 
      ? toDMY(initialData.warrantyExpiryDate) 
      : defaultWarrantyDMY(initialData?.handoverDate ? toDMY(initialData.handoverDate) : toDMY(new Date()))
  );
  const [status, setStatus] = useState<SystemStatus>(initialData?.status || 'Hoạt động tốt');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Automatically update nextMaintenanceDate (+180 days) & warrantyExpiryDate (+5 years) when handoverDate is valid
  const handleHandoverDateChange = (val: string) => {
    const formatted = formatDMYInput(val, handoverDate);
    setHandoverDate(formatted);
    if (isValidDMY(formatted)) {
      setNextMaintenanceDate(add180DaysDMY(formatted));
      setWarrantyExpiryDate(defaultWarrantyDMY(formatted));
    }
  };

  const handleNextMaintenanceDateChange = (val: string) => {
    const formatted = formatDMYInput(val, nextMaintenanceDate);
    setNextMaintenanceDate(formatted);
  };

  const handleWarrantyExpiryDateChange = (val: string) => {
    const formatted = formatDMYInput(val, warrantyExpiryDate);
    setWarrantyExpiryDate(formatted);
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

  // PDF Documents (Hóa đơn, CO, CQ...)
  const [pdfDocuments, setPdfDocuments] = useState<CustomerPdfDocument[]>(
    initialData?.pdfDocuments || []
  );
  const [pdfUploading, setPdfUploading] = useState<boolean>(false);
  const [previewPdf, setPreviewPdf] = useState<CustomerPdfDocument | null>(null);

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(1);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Danh sách các ảnh đã lưu để xem theo album / gallery
  const savedImageList = React.useMemo(() => {
    return [
      images.overview ? { key: 'overview' as const, title: 'Ảnh Tổng Thể Công Trình', src: images.overview } : null,
      images.panels ? { key: 'panels' as const, title: 'Ảnh Dàn Tấm Pin PV', src: images.panels } : null,
      images.inverter ? { key: 'inverter' as const, title: 'Ảnh Biến Tần Inverter', src: images.inverter } : null,
      images.battery ? { key: 'battery' as const, title: 'Ảnh Pin Lưu Trữ', src: images.battery } : null,
    ].filter(Boolean) as { key: 'overview' | 'panels' | 'inverter' | 'battery'; title: string; src: string }[];
  }, [images]);

  const openImageGallery = (index: number = 0) => {
    if (savedImageList.length === 0) return;
    const target = Math.max(0, Math.min(index, savedImageList.length - 1));
    setActiveImageIndex(target);
    setImageZoom(1);
    setImageRotation(0);
  };

  const openImageGalleryByKey = (key: 'overview' | 'panels' | 'inverter' | 'battery') => {
    const idx = savedImageList.findIndex(item => item.key === key);
    if (idx !== -1) {
      openImageGallery(idx);
    } else if (images[key]) {
      setPreviewImage({ src: images[key]!, title: getPhotoTitle(key) });
    }
  };

  const getPhotoTitle = (key: string): string => {
    switch (key) {
      case 'overview': return 'Ảnh Tổng Thể Công Trình';
      case 'panels': return 'Ảnh Dàn Tấm Pin PV';
      case 'inverter': return 'Ảnh Biến Tần Inverter';
      case 'battery': return 'Ảnh Pin Lưu Trữ';
      default: return 'Hình Ảnh Hiện Trường';
    }
  };

  const handleDownloadCurrentPhoto = (item: { title: string; src: string }) => {
    try {
      const link = document.createElement('a');
      link.href = item.src;
      link.download = `${initialData?.customerCode || 'Solar'}_${item.title.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (activeImageIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveImageIndex(null);
      } else if (e.key === 'ArrowLeft' && savedImageList.length > 1) {
        setActiveImageIndex(prev => (prev !== null && prev > 0 ? prev - 1 : savedImageList.length - 1));
        setImageZoom(1);
        setImageRotation(0);
      } else if (e.key === 'ArrowRight' && savedImageList.length > 1) {
        setActiveImageIndex(prev => (prev !== null && prev < savedImageList.length - 1 ? prev + 1 : 0));
        setImageZoom(1);
        setImageRotation(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, savedImageList.length]);

  // Sync form state when initialData or modal open status changes
  useEffect(() => {
    if (isOpen) {
      setCustomerName(capitalizeWords(initialData?.customerName || ''));
      setAddress(capitalizeWords(initialData?.address || ''));
      setProvince(initialData?.province || 'Hải Phòng');
      setPhoneNumber((initialData?.phoneNumber || '').replace(/\D/g, ''));
      setContractNumber(initialData?.contractNumber || DEFAULT_CONTRACT_NUMBER);
      const initHandover = initialData?.handoverDate ? toDMY(initialData.handoverDate) : toDMY(new Date());
      setHandoverDate(initHandover);
      setNextMaintenanceDate(
        initialData?.nextMaintenanceDate ? toDMY(initialData.nextMaintenanceDate) : add180DaysDMY(initHandover)
      );
      setWarrantyExpiryDate(
        initialData?.warrantyExpiryDate ? toDMY(initialData.warrantyExpiryDate) : defaultWarrantyDMY(initHandover)
      );
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
      setPdfDocuments(initialData?.pdfDocuments || []);
      setErrorMsg('');
      setUploadingKey(null);
      setPdfUploading(false);
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
        distributor: defaultDistributor
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
        distributor: defaultDistributor
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
        distributor: defaultDistributor
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // PDF upload handler hỗ trợ chọn & nạp NHIỀU file .pdf cùng một lúc (Hóa đơn, CO, CQ...)
  const handleMultiplePdfUpload = async (
    files: FileList | File[] | null,
    category: 'invoice' | 'co_cq' | 'other' = 'invoice'
  ) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const validFiles: File[] = [];
    for (const f of fileArray) {
      const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setErrorMsg(`Tệp "${f.name}" không phải định dạng PDF. Chỉ hỗ trợ tệp .pdf!`);
        continue;
      }
      if (f.size > 15 * 1024 * 1024) {
        setErrorMsg(`Tệp PDF "${f.name}" vượt quá 15MB (${formatFileSize(f.size)}). Vui lòng chọn tệp nhỏ hơn!`);
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    setPdfUploading(true);
    setErrorMsg('');

    try {
      const readPromises = validFiles.map((file, idx) => {
        return new Promise<CustomerPdfDocument>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fileData = e.target?.result as string;
            if (!fileData) {
              reject(new Error(`Không thể đọc dữ liệu file "${file.name}"`));
              return;
            }

            // Tự động phân loại nếu tải từ nút tổng hợp
            let finalCat = category;
            const lower = file.name.toLowerCase();
            if (category === 'other') {
              if (lower.includes('hd') || lower.includes('hoa_don') || lower.includes('invoice') || lower.includes('gtgt') || lower.includes('bill')) {
                finalCat = 'invoice';
              } else if (lower.includes('co') || lower.includes('cq') || lower.includes('chung_nhan') || lower.includes('cert')) {
                finalCat = 'co_cq';
              }
            }

            resolve({
              id: `doc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              category: finalCat,
              fileData,
              fileSize: formatFileSize(file.size),
              uploadedAt: new Date().toISOString()
            });
          };

          reader.onerror = () => {
            reject(new Error(`Lỗi đọc tệp "${file.name}"`));
          };

          reader.readAsDataURL(file);
        });
      });

      const newDocs = await Promise.all(readPromises);
      setPdfDocuments(prev => [...prev, ...newDocs]);
    } catch (err: any) {
      console.error('Error uploading multiple PDF files:', err);
      setErrorMsg(err.message || 'Lỗi khi nạp danh sách file PDF!');
    } finally {
      setPdfUploading(false);
    }
  };

  const handleRemovePdf = (id: string) => {
    setPdfDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleDownloadPdf = async (doc: CustomerPdfDocument) => {
    try {
      let fileData = doc.fileData;
      if (!fileData || fileData.length < 50) {
        fileData = await resolvePdfFileData(initialData?.id || '', doc);
      }
      if (!fileData) {
        setErrorMsg('Không tìm thấy tệp PDF trong kho lưu trữ để tải về!');
        return;
      }
      const link = document.createElement('a');
      link.href = fileData;
      link.download = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download PDF error:', err);
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

    if (!handoverDate.trim()) {
      setErrorMsg('Vui lòng nhập Ngày Bàn Giao!');
      return;
    }
    if (!isValidDMY(handoverDate)) {
      setErrorMsg('Ngày Bàn Giao bắt buộc phải đúng định dạng ngày tháng năm dd/MM/yyyy (ví dụ: 25/12/2026)!');
      return;
    }

    if (!nextMaintenanceDate.trim()) {
      setErrorMsg('Vui lòng nhập Kỳ Bảo Dưỡng!');
      return;
    }
    if (!isValidDMY(nextMaintenanceDate)) {
      setErrorMsg('Kỳ Bảo Dưỡng bắt buộc phải đúng định dạng ngày tháng năm dd/MM/yyyy (ví dụ: 25/06/2027)!');
      return;
    }

    if (!warrantyExpiryDate.trim()) {
      setErrorMsg('Vui lòng nhập Hạn Bảo Hành!');
      return;
    }
    if (!isValidDMY(warrantyExpiryDate)) {
      setErrorMsg('Hạn Bảo Hành bắt buộc phải đúng định dạng ngày tháng năm dd/MM/yyyy (ví dụ: 25/12/2031)!');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      await onSubmit({
        customerName: capitalizeWords(customerName.trim()),
        address: capitalizeWords(address.trim()),
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
        handoverDate: dmyToISO(handoverDate),
        nextMaintenanceDate: dmyToISO(nextMaintenanceDate),
        warrantyExpiryDate: dmyToISO(warrantyExpiryDate),
        status,
        notes: notes.trim(),
        images,
        pdfDocuments
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin khách hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[96vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              {initialData ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng & Hệ Thống Solar'}
            </h2>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {initialData?.customerCode || nextCustomerCode}
            </span>
            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
              (Mã tự động)
            </span>

            {/* Nút xem nhanh toàn bộ hình ảnh đã lưu */}
            {savedImageList.length > 0 && (
              <button
                type="button"
                onClick={() => openImageGallery(0)}
                className="ml-1 sm:ml-2 px-2 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                title="Bấm để xem ngay tất cả hình ảnh đã lưu của khách hàng này"
              >
                <Camera className="w-3 h-3 text-emerald-600" />
                <span>Xem {savedImageList.length} ảnh đã lưu</span>
              </button>
            )}
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
                  onChange={(e) => setCustomerName(capitalizeWords(e.target.value))}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium capitalize"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[9.5px] font-bold text-black mb-0.5 leading-tight">
                  Số Điện Thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  placeholder="0913xxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (
                      !/^\d$/.test(e.key) &&
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
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
                  onChange={(e) => setAddress(capitalizeWords(e.target.value))}
                  className="w-full px-1.5 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-medium capitalize"
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
                      onChange={(val) => handleUpdateInverter(idx, 'distributor', val)}
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
                        onChange={(val) => handleUpdateBattery(idx, 'distributor', val)}
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
                onChange={(val) => setSolarPanels({ ...solarPanels, distributor: val })}
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
                        onChange={(val) => handleUpdateWindTurbine(idx, 'distributor', val)}
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
              <div className="relative">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">
                    Ngày Bàn Giao <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[8.5px] font-mono px-1 rounded ${isValidDMY(handoverDate) ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                    dd/MM/yyyy
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="dd/MM/yyyy"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$"
                  title="Định dạng bắt buộc: ngày/tháng/năm (dd/MM/yyyy)"
                  value={handoverDate}
                  onChange={(e) => handleHandoverDateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      !/[\d/]/.test(e.key) &&
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full pl-2 pr-7 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-semibold font-mono placeholder:font-normal placeholder:text-slate-400"
                />
                <div
                  className="absolute right-1 bottom-0.5 flex items-center justify-center p-0.5 text-slate-500 hover:text-emerald-600 transition rounded"
                  title="Chọn ngày bàn giao từ lịch"
                >
                  <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    tabIndex={-1}
                    aria-label="Chọn ngày bàn giao từ lịch"
                    title="Chọn ngày từ lịch"
                    value={isValidDMY(handoverDate) ? dmyToISO(handoverDate) : ''}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleHandoverDateChange(toDMY(e.target.value));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">
                    Kỳ Bảo Dưỡng <span className="text-emerald-600 font-bold">(+180d)</span> <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[8.5px] font-mono px-1 rounded ${isValidDMY(nextMaintenanceDate) ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                    dd/MM/yyyy
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="dd/MM/yyyy"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$"
                  title="Định dạng bắt buộc: ngày/tháng/năm (dd/MM/yyyy)"
                  value={nextMaintenanceDate}
                  onChange={(e) => handleNextMaintenanceDateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      !/[\d/]/.test(e.key) &&
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full pl-2 pr-7 py-0.5 text-xs rounded border border-emerald-300 bg-emerald-50/50 focus:outline-emerald-500 focus:border-emerald-500 text-black font-semibold font-mono placeholder:font-normal placeholder:text-slate-400"
                />
                <div
                  className="absolute right-1 bottom-0.5 flex items-center justify-center p-0.5 text-emerald-700 hover:text-emerald-900 transition rounded"
                  title="Chọn kỳ bảo dưỡng từ lịch"
                >
                  <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    tabIndex={-1}
                    aria-label="Chọn kỳ bảo dưỡng từ lịch"
                    title="Chọn ngày từ lịch"
                    value={isValidDMY(nextMaintenanceDate) ? dmyToISO(nextMaintenanceDate) : ''}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleNextMaintenanceDateChange(toDMY(e.target.value));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[9px] font-bold text-black leading-tight">
                    Hạn Bảo Hành <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[8.5px] font-mono px-1 rounded ${isValidDMY(warrantyExpiryDate) ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                    dd/MM/yyyy
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="dd/MM/yyyy"
                  maxLength={10}
                  inputMode="numeric"
                  pattern="^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$"
                  title="Định dạng bắt buộc: ngày/tháng/năm (dd/MM/yyyy)"
                  value={warrantyExpiryDate}
                  onChange={(e) => handleWarrantyExpiryDateChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      !/[\d/]/.test(e.key) &&
                      !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', 'Escape'].includes(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full pl-2 pr-7 py-0.5 text-xs rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 text-black font-semibold font-mono placeholder:font-normal placeholder:text-slate-400"
                />
                <div
                  className="absolute right-1 bottom-0.5 flex items-center justify-center p-0.5 text-slate-500 hover:text-emerald-600 transition rounded"
                  title="Chọn hạn bảo hành từ lịch"
                >
                  <Calendar className="w-3.5 h-3.5 pointer-events-none" />
                  <input
                    type="date"
                    tabIndex={-1}
                    aria-label="Chọn hạn bảo hành từ lịch"
                    title="Chọn ngày từ lịch"
                    value={isValidDMY(warrantyExpiryDate) ? dmyToISO(warrantyExpiryDate) : ''}
                    onClick={(e) => {
                      try {
                        if ('showPicker' in e.currentTarget) {
                          e.currentTarget.showPicker();
                        }
                      } catch {
                        // ignore
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleWarrantyExpiryDateChange(toDMY(e.target.value));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
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

          {/* Section 7: Site Photos & Customer PDF Documents (Hóa Đơn, CO-CQ) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-[10.5px] font-extrabold uppercase tracking-wide text-black flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>7. Hình Ảnh Hiện Trường & Hồ Sơ File PDF (Hóa Đơn, CO, CQ)</span>
              </h3>
              <span className="text-[9px] text-slate-500 font-medium italic">
                * Xem & lưu hình ảnh công trình và các file PDF chứng từ
              </span>
            </div>

            {/* PHẦN 7.1: HÌNH ẢNH HIỆN TRƯỜNG & THIẾT BỊ ĐÃ LƯU */}
            <div className="bg-slate-50/90 rounded-lg p-2 border border-slate-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-800">
                    Hình Ảnh Hiện Trường & Thiết Bị Đã Lưu
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                    savedImageList.length > 0 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {savedImageList.length > 0 ? `Đã lưu ${savedImageList.length}/4 hình ảnh` : 'Chưa có ảnh'}
                  </span>
                </div>

                {/* Nút bấm xem toàn bộ ảnh đã lưu (Gallery View) */}
                {savedImageList.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => openImageGallery(0)}
                    className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    title="Bấm để mở album xem toàn bộ hình ảnh đã lưu phóng to đầy đủ"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Xem Toàn Bộ Ảnh Đã Lưu ({savedImageList.length})</span>
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-400 italic">
                    Có thể tải ảnh tổng thể, dàn pin, biến tần hoặc pin lưu trữ bên dưới
                  </span>
                )}
              </div>

              {/* 4 Khung Ảnh Hiện Trường (Tổng thể, Dàn Pin, Inverter, Pin Lưu Trữ) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Ảnh Tổng Thể */}
                <div className="border border-slate-200 rounded-lg p-1.5 text-center space-y-1 bg-white relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-2xs">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[9px] font-bold text-slate-800 truncate flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Ảnh Tổng Thể</span>
                    </span>
                    {images.overview && (
                      <button
                        type="button"
                        onClick={() => openImageGalleryByKey('overview')}
                        title="Bấm để xem ảnh đầy đủ"
                        className="text-[8.5px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" /> Xem
                      </button>
                    )}
                  </div>

                  {uploadingKey === 'overview' ? (
                    <div className="h-18 flex flex-col items-center justify-center text-[9px] text-emerald-700 bg-emerald-50 rounded border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-emerald-600" />
                      <span>Đang nén ảnh...</span>
                    </div>
                  ) : images.overview ? (
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-slate-900/5 h-18 flex items-center justify-center">
                      <img 
                        src={images.overview} 
                        alt="Ảnh Tổng Thể" 
                        onClick={() => openImageGalleryByKey('overview')}
                        className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                        title="Bấm để xem ảnh đầy đủ"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => openImageGalleryByKey('overview')}
                          title="Xem toàn bộ ảnh đầy đủ"
                          className="p-1 bg-emerald-600 text-white rounded-full text-xs shadow hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages(prev => ({ ...prev, overview: '' }))}
                          title="Xóa ảnh này"
                          className="p-1 bg-rose-600 text-white rounded-full text-xs shadow hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-18 rounded-md border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition p-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5">+ Tải ảnh tổng thể</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload('overview', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 2. Ảnh Dàn Tấm Pin PV */}
                <div className="border border-slate-200 rounded-lg p-1.5 text-center space-y-1 bg-white relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-2xs">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[9px] font-bold text-slate-800 truncate flex items-center gap-1">
                      <Sun className="w-2.5 h-2.5 text-amber-500" />
                      <span>Ảnh Dàn Pin PV</span>
                    </span>
                    {images.panels && (
                      <button
                        type="button"
                        onClick={() => openImageGalleryByKey('panels')}
                        title="Bấm để xem ảnh đầy đủ"
                        className="text-[8.5px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" /> Xem
                      </button>
                    )}
                  </div>

                  {uploadingKey === 'panels' ? (
                    <div className="h-18 flex flex-col items-center justify-center text-[9px] text-emerald-700 bg-emerald-50 rounded border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-emerald-600" />
                      <span>Đang nén ảnh...</span>
                    </div>
                  ) : images.panels ? (
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-slate-900/5 h-18 flex items-center justify-center">
                      <img 
                        src={images.panels} 
                        alt="Ảnh Dàn Pin PV" 
                        onClick={() => openImageGalleryByKey('panels')}
                        className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                        title="Bấm để xem ảnh đầy đủ"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => openImageGalleryByKey('panels')}
                          title="Xem toàn bộ ảnh đầy đủ"
                          className="p-1 bg-emerald-600 text-white rounded-full text-xs shadow hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages(prev => ({ ...prev, panels: '' }))}
                          title="Xóa ảnh này"
                          className="p-1 bg-rose-600 text-white rounded-full text-xs shadow hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-18 rounded-md border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition p-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5">+ Tải ảnh dàn pin</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload('panels', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 3. Ảnh Biến Tần Inverter */}
                <div className="border border-slate-200 rounded-lg p-1.5 text-center space-y-1 bg-white relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-2xs">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[9px] font-bold text-slate-800 truncate flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Ảnh Inverter</span>
                    </span>
                    {images.inverter && (
                      <button
                        type="button"
                        onClick={() => openImageGalleryByKey('inverter')}
                        title="Bấm để xem ảnh đầy đủ"
                        className="text-[8.5px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" /> Xem
                      </button>
                    )}
                  </div>

                  {uploadingKey === 'inverter' ? (
                    <div className="h-18 flex flex-col items-center justify-center text-[9px] text-emerald-700 bg-emerald-50 rounded border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-emerald-600" />
                      <span>Đang nén ảnh...</span>
                    </div>
                  ) : images.inverter ? (
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-slate-900/5 h-18 flex items-center justify-center">
                      <img 
                        src={images.inverter} 
                        alt="Ảnh Biến Tần Inverter" 
                        onClick={() => openImageGalleryByKey('inverter')}
                        className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                        title="Bấm để xem ảnh đầy đủ"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => openImageGalleryByKey('inverter')}
                          title="Xem toàn bộ ảnh đầy đủ"
                          className="p-1 bg-emerald-600 text-white rounded-full text-xs shadow hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages(prev => ({ ...prev, inverter: '' }))}
                          title="Xóa ảnh này"
                          className="p-1 bg-rose-600 text-white rounded-full text-xs shadow hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-18 rounded-md border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition p-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5">+ Tải ảnh Inverter</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload('inverter', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 4. Ảnh Pin Lưu Trữ */}
                <div className="border border-slate-200 rounded-lg p-1.5 text-center space-y-1 bg-white relative overflow-hidden flex flex-col justify-between min-h-[105px] shadow-2xs">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[9px] font-bold text-slate-800 truncate flex items-center gap-1">
                      <Battery className="w-2.5 h-2.5 text-blue-600" />
                      <span>Ảnh Pin Lưu Trữ</span>
                    </span>
                    {images.battery && (
                      <button
                        type="button"
                        onClick={() => openImageGalleryByKey('battery')}
                        title="Bấm để xem ảnh đầy đủ"
                        className="text-[8.5px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <Eye className="w-2.5 h-2.5" /> Xem
                      </button>
                    )}
                  </div>

                  {uploadingKey === 'battery' ? (
                    <div className="h-18 flex flex-col items-center justify-center text-[9px] text-emerald-700 bg-emerald-50 rounded border border-slate-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-emerald-600" />
                      <span>Đang nén ảnh...</span>
                    </div>
                  ) : images.battery ? (
                    <div className="relative group rounded-md overflow-hidden border border-slate-200 bg-slate-900/5 h-18 flex items-center justify-center">
                      <img 
                        src={images.battery} 
                        alt="Ảnh Pin Lưu Trữ" 
                        onClick={() => openImageGalleryByKey('battery')}
                        className="w-full h-full object-cover cursor-pointer transition group-hover:scale-105"
                        title="Bấm để xem ảnh đầy đủ"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none group-hover:pointer-events-auto">
                        <button
                          type="button"
                          onClick={() => openImageGalleryByKey('battery')}
                          title="Xem toàn bộ ảnh đầy đủ"
                          className="p-1 bg-emerald-600 text-white rounded-full text-xs shadow hover:bg-emerald-700 transition cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImages(prev => ({ ...prev, battery: '' }))}
                          title="Xóa ảnh này"
                          className="p-1 bg-rose-600 text-white rounded-full text-xs shadow hover:bg-rose-700 transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-18 rounded-md border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/40 transition p-1">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-[9px] text-emerald-700 font-bold mt-0.5">+ Tải ảnh pin lưu trữ</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleImageUpload('battery', e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* PHẦN 7.2: HỒ SƠ & FILE TÀI LIỆU .PDF (HÓA ĐƠN, CHỨNG CHỈ CO, CQ) */}
            <div className="bg-indigo-50/30 rounded-lg p-2 border border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-indigo-200/60">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-950">
                    Hồ Sơ Tài Liệu File .PDF Liên Quan Đến Khách Hàng
                  </span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 font-mono">
                  {pdfDocuments.length} tệp .PDF
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Cột 1: File PDF Hóa Đơn (Hóa đơn GTGT, Phiếu xuất kho...) - Chọn & lưu nhiều file */}
                <div className="border border-indigo-200 bg-white rounded-lg p-2 flex flex-col justify-between min-h-[120px] shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-extrabold text-indigo-950 flex items-center gap-1" title="Lưu nhiều file .PDF hóa đơn liên quan">
                      <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>File PDF Hóa Đơn (GTGT, Xuất kho...)</span>
                    </span>
                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                      {pdfDocuments.filter(d => d.category === 'invoice').length} file
                    </span>
                  </div>

                  {pdfUploading ? (
                    <div className="h-20 flex flex-col items-center justify-center text-[9px] text-indigo-700 bg-indigo-50/50 rounded border border-indigo-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-indigo-600" />
                      <span>Đang nạp file PDF...</span>
                    </div>
                  ) : pdfDocuments.filter(d => d.category === 'invoice').length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                      {pdfDocuments.filter(d => d.category === 'invoice').map((doc) => (
                        <div key={doc.id} className="p-1.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded text-left flex items-center justify-between gap-1 shadow-2xs transition">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewPdf(doc)} title="Bấm để xem trước file PDF này">
                            <div className="text-[9px] font-bold text-indigo-950 truncate leading-tight flex items-center gap-1">
                              <span className="text-[7.5px] px-1 py-0.1 bg-rose-600 text-white font-bold rounded">PDF</span>
                              <span className="truncate">{doc.name}</span>
                            </div>
                            <div className="text-[8px] text-slate-500 font-mono mt-0.5">{doc.fileSize || 'PDF'}</div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewPdf(doc)}
                              title="Xem trực tiếp file PDF này"
                              className="p-1 rounded text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(doc)}
                              title="Tải tệp về máy"
                              className="p-1 rounded text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePdf(doc.id)}
                              title="Xóa tệp PDF này"
                              className="p-1 rounded text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <label className="cursor-pointer block text-center py-1 text-[8.5px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50/60 hover:bg-indigo-100/80 rounded border border-dashed border-indigo-300 transition">
                        + Chọn Thêm File Hóa Đơn (Chọn được nhiều file)
                        <input
                          type="file"
                          multiple
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleMultiplePdfUpload(e.target.files, 'invoice');
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-20 rounded border border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50 transition p-1 group">
                      <FileText className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
                      <span className="text-[9.5px] text-indigo-800 font-bold mt-0.5">Chọn nhiều file .PDF Hóa Đơn</span>
                      <span className="text-[7.5px] text-slate-500 font-medium">Hóa đơn GTGT, Phiếu giao hàng, Biên bản...</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleMultiplePdfUpload(e.target.files, 'invoice');
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Cột 2: File PDF CO, CQ (Chứng nhận xuất xứ & Chất lượng) - Chọn & lưu nhiều file */}
                <div className="border border-teal-200 bg-white rounded-lg p-2 flex flex-col justify-between min-h-[120px] shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-extrabold text-teal-950 flex items-center gap-1" title="Lưu nhiều file .PDF chứng chỉ CO, CQ">
                      <FileCheck className="w-3 h-3 text-teal-600 shrink-0" />
                      <span>File PDF Chứng Chỉ CO, CQ (Xuất xứ & Chất lượng)</span>
                    </span>
                    <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                      {pdfDocuments.filter(d => d.category === 'co_cq' || d.category === 'co' || d.category === 'cq').length} file
                    </span>
                  </div>

                  {pdfUploading ? (
                    <div className="h-20 flex flex-col items-center justify-center text-[9px] text-teal-700 bg-teal-50/50 rounded border border-teal-200">
                      <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-teal-600" />
                      <span>Đang nạp file PDF...</span>
                    </div>
                  ) : pdfDocuments.filter(d => d.category === 'co_cq' || d.category === 'co' || d.category === 'cq').length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-0.5">
                      {pdfDocuments.filter(d => d.category === 'co_cq' || d.category === 'co' || d.category === 'cq').map((doc) => (
                        <div key={doc.id} className="p-1.5 bg-slate-50 hover:bg-teal-50/60 border border-slate-200 hover:border-teal-300 rounded text-left flex items-center justify-between gap-1 shadow-2xs transition">
                          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setPreviewPdf(doc)} title="Bấm để xem trước file PDF này">
                            <div className="text-[9px] font-bold text-teal-950 truncate leading-tight flex items-center gap-1">
                              <span className="text-[7.5px] px-1 py-0.1 bg-teal-600 text-white font-bold rounded">CO-CQ</span>
                              <span className="truncate">{doc.name}</span>
                            </div>
                            <div className="text-[8px] text-slate-500 font-mono mt-0.5">{doc.fileSize || 'PDF'}</div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewPdf(doc)}
                              title="Xem trực tiếp file PDF này"
                              className="p-1 rounded text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf(doc)}
                              title="Tải tệp về máy"
                              className="p-1 rounded text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePdf(doc.id)}
                              title="Xóa tệp PDF này"
                              className="p-1 rounded text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <label className="cursor-pointer block text-center py-1 text-[8.5px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50/60 hover:bg-teal-100/80 rounded border border-dashed border-teal-300 transition">
                        + Chọn Thêm File CO/CQ (Chọn được nhiều file)
                        <input
                          type="file"
                          multiple
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleMultiplePdfUpload(e.target.files, 'co_cq');
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center flex-1 h-20 rounded border border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50/50 transition p-1 group">
                      <FileCheck className="w-4 h-4 text-teal-600 group-hover:scale-110 transition" />
                      <span className="text-[9.5px] text-teal-800 font-bold mt-0.5">Chọn nhiều file .PDF CO, CQ</span>
                      <span className="text-[7.5px] text-slate-500 font-medium">Chứng nhận xuất xứ thiết bị & chất lượng</span>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            handleMultiplePdfUpload(e.target.files, 'co_cq');
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Thanh đính kèm thêm file .PDF khác & tóm tắt tổng số file */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[9.5px] bg-white px-2.5 py-1.5 rounded-md border border-indigo-200">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Tổng cộng: <strong className="text-indigo-900 font-bold">{pdfDocuments.length}</strong> file PDF (
                    Hóa đơn: <strong className="text-indigo-700 font-bold">{pdfDocuments.filter(d => d.category === 'invoice').length}</strong> | 
                    CO/CQ: <strong className="text-teal-700 font-bold">{pdfDocuments.filter(d => d.category === 'co_cq' || d.category === 'co' || d.category === 'cq').length}</strong>
                    {pdfDocuments.filter(d => d.category === 'other').length > 0 && ` | Khác: ${pdfDocuments.filter(d => d.category === 'other').length}`}
                    )
                  </span>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 hover:bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 shadow-2xs transition">
                  <FilePlus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Đính Kèm Thêm Nhiều File .PDF</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleMultiplePdfUpload(e.target.files, 'other');
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
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

      {/* Interactive Lightbox Modal for Full Image & Gallery View */}
      {(activeImageIndex !== null || previewImage !== null) && (() => {
        const currentItem = activeImageIndex !== null && savedImageList[activeImageIndex]
          ? savedImageList[activeImageIndex]
          : previewImage
            ? { title: previewImage.title, src: previewImage.src, key: 'preview' }
            : null;

        if (!currentItem) return null;

        const totalImages = savedImageList.length;
        const currentDisplayIndex = activeImageIndex !== null ? activeImageIndex + 1 : 1;

        return (
          <div
            className="fixed inset-0 z-70 bg-black/90 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
            onClick={() => {
              setActiveImageIndex(null);
              setPreviewImage(null);
            }}
          >
            <div
              className="relative max-w-5xl max-h-[94vh] w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title, Index, Zoom, Rotate, Download, Close */}
              <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/95 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate flex items-center gap-1.5">
                      <span>{currentItem.title}</span>
                      {totalImages > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {currentDisplayIndex} / {totalImages}
                        </span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Toolbar controls */}
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setImageZoom(prev => Math.min(3.5, Number((prev + 0.2).toFixed(1))))}
                    title="Phóng to ảnh"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageZoom(prev => Math.max(0.5, Number((prev - 0.2).toFixed(1))))}
                    title="Thu nhỏ ảnh"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  {imageZoom !== 1 && (
                    <button
                      type="button"
                      onClick={() => setImageZoom(1)}
                      title="Trở về 100%"
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[10px] transition cursor-pointer"
                    >
                      100%
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setImageRotation(prev => (prev + 90) % 360)}
                    title="Xoay ảnh 90°"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadCurrentPhoto(currentItem)}
                    title="Tải ảnh về máy"
                    className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-slate-700 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(null);
                      setPreviewImage(null);
                    }}
                    title="Đóng (Esc)"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Main View Area with Next/Prev and Zoomed Canvas */}
              <div 
                className="relative flex-1 p-2 flex items-center justify-center bg-black/80 overflow-hidden min-h-[55vh] max-h-[72vh]"
                onWheel={(e) => {
                  if (e.deltaY < 0) {
                    setImageZoom(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
                  } else {
                    setImageZoom(prev => Math.max(0.5, Number((prev - 0.15).toFixed(2))));
                  }
                }}
              >
                {/* Previous Button */}
                {totalImages > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev !== null && prev > 0 ? prev - 1 : totalImages - 1));
                      setImageZoom(1);
                      setImageRotation(0);
                    }}
                    className="absolute left-3 z-20 p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-xl transition cursor-pointer border border-slate-700 hover:scale-110"
                    title="Ảnh trước (Mũi tên trái ←)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {/* The Image */}
                <div 
                  className="transition-transform duration-150 ease-out flex items-center justify-center max-w-full max-h-full"
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`
                  }}
                >
                  <img
                    src={currentItem.src}
                    alt={currentItem.title}
                    className="max-w-full max-h-[68vh] object-contain rounded-lg shadow-2xl pointer-events-none"
                  />
                </div>

                {/* Next Button */}
                {totalImages > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(prev => (prev !== null && prev < totalImages - 1 ? prev + 1 : 0));
                      setImageZoom(1);
                      setImageRotation(0);
                    }}
                    className="absolute right-3 z-20 p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white shadow-xl transition cursor-pointer border border-slate-700 hover:scale-110"
                    title="Ảnh tiếp theo (Mũi tên phải →)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Bottom Thumbnails Strip for Quick Switching */}
              {totalImages > 0 && (
                <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                    {savedImageList.map((img, idx) => {
                      const isCurrent = activeImageIndex === idx;
                      return (
                        <button
                          key={img.key}
                          type="button"
                          onClick={() => {
                            setActiveImageIndex(idx);
                            setImageZoom(1);
                            setImageRotation(0);
                          }}
                          className={`relative rounded-md overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                            isCurrent 
                              ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-105' 
                              : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                          style={{ width: '48px', height: '36px' }}
                          title={`Xem ${img.title}`}
                        >
                          <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-white font-bold text-center truncate px-0.5">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-[10px] text-slate-400 hidden sm:block shrink-0 italic">
                    Mẹo: Dùng phím ← → để chuyển ảnh, cuộn chuột để phóng to, Esc để đóng
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Lightbox Modal for PDF Preview (Using Canvas / PDF.js compatible with all browsers) */}
      <PdfViewerModal
        doc={previewPdf}
        customerId={initialData?.id}
        onClose={() => setPreviewPdf(null)}
        onDownload={handleDownloadPdf}
      />
    </div>
  );
};
