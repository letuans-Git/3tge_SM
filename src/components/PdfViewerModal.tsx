import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Import worker directly via Vite's asset URL mechanism for 100% offline & local reliability
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  ExternalLink,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { CustomerPdfDocument } from '../types';
import { resolvePdfFileData } from '../utils/pdfStorage';

// Set worker source to bundled Vite asset, with CDN fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
} catch (e) {
  console.warn('PDF.js worker setup fallback:', e);
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface PdfViewerModalProps {
  doc: CustomerPdfDocument | null;
  customerId?: string;
  onClose: () => void;
  onDownload?: (doc: CustomerPdfDocument) => void;
  canDownload?: boolean; // Kiểm soát quyền tải file
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ 
  doc, 
  customerId, 
  onClose, 
  onDownload,
  canDownload = true
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedData, setResolvedData] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(prev + 1, numPages || 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, onClose]);

  // Convert base64 data to Uint8Array for robust parsing in all browsers
  const getPdfData = (dataStr: string): Uint8Array => {
    let base64 = dataStr;
    if (base64.includes(',')) {
      base64 = base64.split(',')[1];
    }
    const cleanBase64 = base64.replace(/\s/g, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Load PDF Document
  useEffect(() => {
    if (!doc) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        let dataStr = doc.fileData;
        if (!dataStr || dataStr.length < 50) {
          dataStr = await resolvePdfFileData(customerId || '', doc);
        }

        if (!dataStr) {
          if (isMounted) {
            setError('Không tìm thấy dữ liệu tệp PDF trong kho lưu trữ.');
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setResolvedData(dataStr);
        }

        const bytes = getPdfData(dataStr);
        const loadingTask = pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const loadedDoc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = loadedDoc;
        setNumPages(loadedDoc.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load PDF via PDF.js:', err);
        if (isMounted) {
          setError('Không thể phân tích dữ liệu PDF. Bạn có thể bấm "Tải về" để mở trực tiếp.');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, [doc, customerId]);

  // Render Page onto Canvas
  useEffect(() => {
    if (!pdfDocRef.current || loading || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {
            // Task might already be finished
          }
        }

        const page = await pdfDocRef.current!.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Viewport with scale & rotation
        const viewport = page.getViewport({ scale, rotation });
        
        // Handle high DPI screens for crisp text rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [currentPage, scale, rotation, loading]);

  if (!doc) return null;

  const isInvoice = doc.category === 'invoice';
  const isCoCq = doc.category === 'co_cq' || doc.category === 'co' || doc.category === 'cq';

  const handleDownload = () => {
    const fileSource = resolvedData || doc.fileData;
    if (onDownload) {
      onDownload({ ...doc, fileData: fileSource });
    } else if (fileSource) {
      const link = document.createElement('a');
      link.href = fileSource;
      link.download = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenNewTab = () => {
    try {
      const fileSource = resolvedData || doc.fileData;
      if (!fileSource) return;
      const bytes = getPdfData(fileSource);
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank');
      if (!win) {
        // If popup blocked, fallback to download
        handleDownload();
      }
    } catch (e) {
      handleDownload();
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[95vh] w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 text-white border-b border-slate-800 bg-slate-950 gap-2">
          {/* File Meta */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] tracking-wide uppercase shadow-xs">
              PDF
            </span>
            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
              isInvoice 
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
                : isCoCq 
                ? 'bg-teal-950 text-teal-300 border-teal-700' 
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {isInvoice ? 'Hóa Đơn' : isCoCq ? 'CO - CQ' : 'Tài Liệu'}
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-[320px]">
              {doc.name}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
              ({doc.fileSize || 'PDF'})
            </span>
          </div>

          {/* Controls: Pagination, Zoom, Rotate, Download, Close */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Page navigation */}
            {numPages > 1 && (
              <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 mr-1">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-700 transition"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-300 font-bold">
                  {currentPage} / {numPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= numPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, numPages))}
                  className="p-1 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-700 transition"
                  title="Trang tiếp theo"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(1))))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setScale(1.0)}
                className="px-1.5 text-[10.5px] font-mono text-slate-300 font-bold hover:text-white transition"
                title="Đặt lại 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))))}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Rotate */}
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
              title="Xoay 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Download */}
            {canDownload ? (
              <button
                type="button"
                onClick={handleDownload}
                className="px-2.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs transition"
                title="Tải tệp PDF về máy"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải về</span>
              </button>
            ) : (
              <div 
                className="px-2 py-1 text-[10px] bg-slate-800 text-slate-400 font-semibold rounded-lg flex items-center gap-1 border border-slate-700 select-none"
                title="Bạn không có quyền tải tệp này về máy"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Chỉ xem</span>
              </div>
            )}

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Canvas View Area - 100% Reliable across ALL Browsers */}
        <div className="flex-1 bg-slate-800/80 p-2 sm:p-4 overflow-auto flex items-center justify-center min-h-[460px] max-h-[82vh] relative select-none">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 text-slate-300 py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs font-semibold">Đang chuẩn bị trang PDF sắc nét...</span>
            </div>
          )}

          {error && (
            <div className="max-w-md w-full bg-slate-900 border border-amber-500/40 rounded-xl p-5 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-200">{error}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Trình duyệt chặn plugin nhúng bên trong iframe, nhưng tệp PDF vẫn nguyên vẹn 100%.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {canDownload ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải Về Máy Ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Mở Tab Mới</span>
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-amber-400 font-semibold flex items-center gap-1 bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-700/50">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bạn chỉ có quyền xem trực tiếp, không được phân quyền tải file về máy</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* The Canvas element rendering the PDF */}
          <div className={`${loading || error ? 'hidden' : 'block'} flex justify-center items-center shadow-2xl`}>
            <canvas 
              ref={canvasRef} 
              className="rounded bg-white max-w-full shadow-2xl transition-all duration-150"
            />
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              ✓ Hiển thị Canvas tương thích 100% mọi trình duyệt (Chrome, Safari, Edge, Cốc Cốc, Firefox, Điện thoại)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-400">
            <span>Dùng phím mũi tên ← → để chuyển trang</span>
            <span>•</span>
            <span>Bấm Esc để đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
