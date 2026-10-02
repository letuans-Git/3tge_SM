import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Printer, Download, X, Scissors, CheckCircle2 } from 'lucide-react';
import { MaintenanceRecord } from '../types';
import { formatDateVN } from '../utils/dateUtils';

interface MaintenancePrintModalProps {
  record: MaintenanceRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MaintenancePrintModal: React.FC<MaintenancePrintModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen || !record) return null;

  const handlePrint = async () => {
    if (!printRef.current) return;
    setIsPrinting(true);

    try {
      const element = printRef.current;

      // 1. Temporarily clone the sheet into an isolated offscreen container with pure standard CSS
      const offscreenContainer = document.createElement('div');
      offscreenContainer.style.position = 'fixed';
      offscreenContainer.style.left = '-9999px';
      offscreenContainer.style.top = '0';
      offscreenContainer.style.width = '210mm';
      offscreenContainer.style.height = '297mm';
      offscreenContainer.style.backgroundColor = '#ffffff';
      offscreenContainer.style.zIndex = '-9999';

      const cloned = element.cloneNode(true) as HTMLElement;
      cloned.style.width = '210mm';
      cloned.style.height = '297mm';
      cloned.style.margin = '0';
      cloned.style.boxShadow = 'none';
      cloned.style.transform = 'none';

      offscreenContainer.appendChild(cloned);
      document.body.appendChild(offscreenContainer);

      // 2. Render high resolution canvas (scale 2) identical 100% to PDF output
      const canvas = await html2canvas(cloned, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: cloned.offsetWidth,
        height: cloned.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((tag) => {
            try {
              if (tag.textContent && tag.textContent.includes('oklch')) {
                tag.textContent = tag.textContent.replace(/oklch\([^)]+\)/g, '#0f172a');
              }
            } catch {
              // ignore
            }
          });
        }
      });

      document.body.removeChild(offscreenContainer);

      // 3. Create exact A4 PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // 4. Trigger print via PDF Blob URL
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Method A: Hidden iframe pointing directly to the PDF Blob URL with auto print
      const printIframe = document.createElement('iframe');
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      printIframe.src = blobUrl;
      document.body.appendChild(printIframe);

      let printTriggered = false;

      const finishAndClean = () => {
        setIsPrinting(false);
        setTimeout(() => {
          if (document.body.contains(printIframe)) {
            document.body.removeChild(printIframe);
          }
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };

      printIframe.onload = () => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
          printTriggered = true;
          finishAndClean();
        } catch {
          // If browser restricts iframe printing of PDF blob (common in Chrome iframe sandboxes)
          tryDirectPrint();
        }
      };

      const tryDirectPrint = () => {
        if (printTriggered) return;
        printTriggered = true;

        // Method B: Open PDF Blob in a new tab/window which has full browser print dialog permissions
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
          // Prompt print in new window
          setTimeout(() => {
            try {
              printWindow.print();
            } catch {
              // ignore
            }
          }, 600);
          finishAndClean();
        } else {
          // Method C: If popups are blocked by browser, trigger native window.print() of current DOM
          try {
            window.print();
          } catch {
            // Method D: If window.print fails, auto trigger download
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `PhieuBaoDuong_${record.maintenanceCode}.pdf`;
            link.click();
          }
          finishAndClean();
        }
      };

      // Fallback timer if onload doesn't fire within 800ms
      setTimeout(() => {
        if (!printTriggered) {
          tryDirectPrint();
        }
      }, 900);

    } catch (err) {
      console.error('Print generation error:', err);
      try {
        window.print();
      } catch {
        // Direct jsPDF fallback save
      }
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);

    try {
      const element = printRef.current;

      // 1. Temporarily clone the sheet into an isolated offscreen container with pure standard CSS
      // This completely decouples it from modal scroll, Tailwind v4 OKLCH stylesheet variables, and viewport scale.
      const offscreenContainer = document.createElement('div');
      offscreenContainer.style.position = 'fixed';
      offscreenContainer.style.left = '-9999px';
      offscreenContainer.style.top = '0';
      offscreenContainer.style.width = '210mm';
      offscreenContainer.style.height = '297mm';
      offscreenContainer.style.backgroundColor = '#ffffff';
      offscreenContainer.style.zIndex = '-9999';

      const cloned = element.cloneNode(true) as HTMLElement;
      cloned.style.width = '210mm';
      cloned.style.height = '297mm';
      cloned.style.margin = '0';
      cloned.style.boxShadow = 'none';
      cloned.style.transform = 'none';

      offscreenContainer.appendChild(cloned);
      document.body.appendChild(offscreenContainer);

      // 2. Render cloned sheet with html2canvas at scale 2 for crisp vector-like text
      const canvas = await html2canvas(cloned, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: cloned.offsetWidth,
        height: cloned.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Remove all stylesheets with oklch to avoid parsing errors
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach((tag) => {
            try {
              if (tag.textContent && tag.textContent.includes('oklch')) {
                tag.textContent = tag.textContent.replace(/oklch\([^)]+\)/g, '#0f172a');
              }
            } catch {
              // ignore
            }
          });
        }
      });

      // Clean up offscreen node
      document.body.removeChild(offscreenContainer);

      // 3. Create high-resolution PDF with exact A4 dimensions
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // 4. Download file safely
      const filename = `PhieuBaoDuong_${record.maintenanceCode}.pdf`;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      setDownloadSuccess('Đã tải thành công tệp PDF!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Direct jsPDF fallback save
      try {
        const doc = new jsPDF();
        doc.text(`Phieu Bao Duong - ${record.maintenanceCode}`, 20, 20);
        doc.save(`PhieuBaoDuong_${record.maintenanceCode}.pdf`);
      } catch {
        window.print();
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Sub-component representing 1 copy (Half of A4)
  const renderTicketCopy = (_copyTitle: string, badgeText: string) => (
    <div 
      className="p-5 flex flex-col justify-between box-border"
      style={{
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        height: '141mm',
        maxHeight: '141mm',
        overflow: 'hidden',
        color: '#0f172a',
        backgroundColor: '#ffffff'
      }}
    >
      {/* Top Header */}
      <div>
        <div 
          className="flex items-start justify-between pb-1.5 mb-2"
          style={{ borderBottom: '2px solid #065f46' }}
        >
          <div className="flex items-center gap-2.5">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-center leading-none"
              style={{
                border: '1.5px solid #047857',
                color: '#065f46',
                backgroundColor: '#ecfdf5'
              }}
            >
              3T<br/>GE
            </div>
            <div>
              <h1 
                className="text-sm font-bold tracking-wide uppercase leading-tight"
                style={{ color: '#064e3b' }}
              >
                CÔNG TY TNHH NĂNG LƯỢNG XANH 3TGE
              </h1>
              <p className="text-[10px] font-semibold tracking-normal leading-tight" style={{ color: '#475569' }}>
                3T Green Energy • Hotline Kỹ Thuật: <span className="font-bold" style={{ color: '#065f46' }}>0913.566.532</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span 
              className="inline-block px-2 py-0.5 text-[9.5px] font-bold uppercase rounded leading-tight"
              style={{
                border: '1px solid #065f46',
                backgroundColor: '#ecfdf5',
                color: '#064e3b'
              }}
            >
              {badgeText}
            </span>
            <p className="text-[10px] font-mono font-bold mt-0.5" style={{ color: '#334155' }}>
              Số: {record.maintenanceCode}
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-1.5">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0f172a' }}>
            BIÊN BẢN KIỂM TRA & PHIẾU BẢO DƯỠNG ĐỊNH KỲ
          </h2>
          <p className="text-[10.5px] italic" style={{ color: '#475569' }}>
            (Hệ thống điện năng lượng mặt trời áp mái)
          </p>
        </div>

        {/* Customer & Maintenance Info */}
        <div 
          className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2 p-2 rounded"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            color: '#0f172a'
          }}
        >
          <div>
            <span className="font-bold">Khách hàng: </span>
            <span className="uppercase font-semibold">{record.customerName}</span>
          </div>
          <div>
            <span className="font-bold">Mã khách hàng: </span>
            <span className="font-mono font-bold" style={{ color: '#065f46' }}>{record.customerCode}</span>
          </div>
          <div>
            <span className="font-bold">Ngày thực hiện: </span>
            <span>{formatDateVN(record.maintenanceDate)}</span>
          </div>
          <div>
            <span className="font-bold">Kỹ thuật viên phụ trách: </span>
            <span className="font-semibold">{record.technicianName}</span>
          </div>
        </div>

        {/* Work Content & Result Details */}
        <div className="space-y-1 text-xs" style={{ color: '#0f172a' }}>
          <div 
            className="rounded p-1.5"
            style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
          >
            <div 
              className="font-bold text-[11px] uppercase mb-0.5"
              style={{ color: '#065f46' }}
            >
              1. Nội dung công việc bảo dưỡng thực hiện:
            </div>
            <div className="text-[11.5px] pl-2 leading-snug" style={{ color: '#1e293b' }}>
              {record.content || 'Kiểm tra siết bu lông, vệ sinh dàn pin, kiểm tra biến tần & tiếp địa.'}
            </div>
          </div>

          <div 
            className="rounded p-1.5"
            style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
          >
            <div 
              className="font-bold text-[11px] uppercase mb-0.5"
              style={{ color: '#065f46' }}
            >
              2. Kết quả kiểm tra thông số kỹ thuật & vận hành:
            </div>
            <div className="text-[11.5px] pl-2 leading-snug" style={{ color: '#1e293b' }}>
              {record.inspectionResult || 'Hệ thống hòa lưới ổn định, điện áp DC & AC đạt chuẩn.'}
            </div>
          </div>

          {record.recommendations && (
            <div 
              className="rounded p-1.5"
              style={{ border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}
            >
              <div 
                className="font-bold text-[11px] uppercase mb-0.5"
                style={{ color: '#065f46' }}
              >
                3. Khuyến nghị & hướng dẫn vận hành:
              </div>
              <div className="text-[11.5px] pl-2 italic leading-snug" style={{ color: '#1e293b' }}>
                {record.recommendations}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer next schedule & signatures */}
      <div className="mt-1 pt-1" style={{ borderTop: '1px solid #e2e8f0' }}>
        <div className="text-[11px] font-bold mb-2" style={{ color: '#b91c1c' }}>
          * Thời gian đến kỳ kiểm tra & bảo dưỡng định kỳ tiếp theo (+180 ngày): {formatDateVN(record.nextScheduledDate)}
        </div>

        <div className="grid grid-cols-2 text-center text-xs pb-1" style={{ color: '#0f172a' }}>
          <div>
            <div className="font-bold uppercase text-[11px]">ĐẠI DIỆN KHÁCH HÀNG</div>
            <div className="text-[10px] italic mb-8" style={{ color: '#64748b' }}>(Ký và ghi rõ họ tên)</div>
            <div className="font-semibold text-xs" style={{ color: '#0f172a' }}>{record.customerName}</div>
          </div>
          <div>
            <div className="font-bold uppercase text-[11px]">KỸ THUẬT VIÊN 3TGE</div>
            <div className="text-[10px] italic mb-8" style={{ color: '#64748b' }}>(Ký và xác nhận)</div>
            <div className="font-semibold text-xs" style={{ color: '#0f172a' }}>{record.technicianName}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Modal Dialog */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[96vh] overflow-hidden border border-slate-200">
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div>
            <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Xem & In Phiếu Bảo Dưỡng (2 Phiếu / 1 Tờ A4)
            </h3>
            <p className="text-[11px] text-slate-300">
              Font Times New Roman • Đầy đủ Tiếng Việt có dấu • Cắt đôi tờ A4 thành 2 liên (Khách hàng & Lưu trữ)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {downloadSuccess && (
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-700 flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {downloadSuccess}
              </span>
            )}
            <button
              onClick={handlePrint}
              disabled={isPrinting || isExporting}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              {isPrinting ? 'Đang mở máy in...' : 'In Ngay'}
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Đang xuất PDF...' : 'Tải File PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sheet Preview Container */}
        <div className="overflow-auto flex-1 p-2 sm:p-6 bg-slate-100 flex justify-center">
          {/* Exact A4 Canvas (210mm x 297mm) */}
          <div
            ref={printRef}
            id="print-a4-sheet"
            className="bg-white shadow-xl mx-auto flex flex-col justify-between"
            style={{
              width: '210mm',
              minHeight: '297mm',
              height: '297mm',
              maxHeight: '297mm',
              boxSizing: 'border-box',
              position: 'relative',
              backgroundColor: '#ffffff'
            }}
          >
            {/* Top Half: Liên 1 - Giao Khách Hàng */}
            {renderTicketCopy('Liên 1', 'LIÊN 1: GIAO KHÁCH HÀNG')}

            {/* Cut line in middle of A4 */}
            <div 
              style={{
                height: '7mm',
                borderTop: '1px dashed #94a3b8',
                borderBottom: '1px dashed #94a3b8',
                backgroundColor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 12px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  backgroundColor: '#ffffff',
                  borderRadius: '3px',
                  border: '1px solid #cbd5e1'
                }}
              >
                <Scissors className="w-3 h-3 text-slate-400" />
                Đường cắt đôi tờ giấy A4 (Cắt tại đây để tách 2 phiếu)
                <Scissors className="w-3 h-3 text-slate-400 rotate-180" />
              </div>
            </div>

            {/* Bottom Half: Liên 2 - Lưu Nội Bộ Công Ty 3TGE */}
            {renderTicketCopy('Liên 2', 'LIÊN 2: LƯU NỘI BỘ 3TGE')}
          </div>
        </div>
      </div>
    </div>
  );
};
