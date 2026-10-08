import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Laptop, Share, PlusSquare } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already opened as standalone installed PWA, hide install prompt
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with native install prompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        title="Cài đặt phần mềm 3TGE làm biểu tượng trên màn hình máy tính hoặc điện thoại"
        className={`flex items-center gap-1.5 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition ${
          compact ? 'text-[11px] py-1 px-2' : ''
        }`}
      >
        <img 
          src="/favicon-32x32.png" 
          alt="3TGE Icon" 
          className="w-4 h-4 rounded-xs shrink-0 bg-white"
        />
        <span>Cài đặt App</span>
      </button>
    );
  }

  // iOS Safari flow or generic browser guide trigger
  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        title="Thêm Icon 3TGE ra màn hình chính điện thoại hoặc máy tính"
        className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition ${
          compact ? 'text-[11px] py-1 px-2' : ''
        }`}
      >
        <img 
          src="/favicon-32x32.png" 
          alt="3TGE Icon" 
          className="w-3.5 h-3.5 rounded-xs shrink-0"
        />
        <span className="hidden sm:inline">Cài App ra màn hình</span>
        <span className="sm:hidden">Cài App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-vuong.png" 
                  alt="3TGE Icon" 
                  className="w-12 h-12 rounded-xl shadow-md border border-slate-200 shrink-0"
                />
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    Cài đặt 3TGE Solar System
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Icon hiển thị trực tiếp trên màn hình chính
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-600">
              {/* iPhone / iPad guide */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs mb-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Trên iPhone / iPad (Trình duyệt Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                  <li>Bấm nút <strong>Chia sẻ (Share)</strong> hình ô vuông có mũi tên trỏ lên ở thanh công cụ.</li>
                  <li>Cuộn xuống và chọn <strong>&ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)</strong>.</li>
                  <li>Bấm <strong>&ldquo;Thêm&rdquo; (Add)</strong> ở góc trên bên phải. Biểu tượng Logo 3TGE sẽ xuất hiện ngay trên màn hình điện thoại.</li>
                </ol>
              </div>

              {/* Android / Laptop guide */}
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs mb-1.5">
                  <Laptop className="w-4 h-4 text-cyan-600" />
                  <span>Trên Điện thoại Android hoặc Laptop (Chrome / Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                  <li>Bấm vào menu <strong>3 dấu chấm (⋮)</strong> ở góc trên cùng bên phải trình duyệt.</li>
                  <li>Chọn <strong>&ldquo;Cài đặt ứng dụng&rdquo;</strong> hoặc <strong>&ldquo;Thêm vào màn hình chính&rdquo;</strong> (Install app / Add to shortcut).</li>
                  <li>Xác nhận để tạo Icon truy cập 1 chạm thuận tiện ngay ngoài Desktop hoặc App Drawer.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white transition shadow-sm"
            >
              Đã hiểu, đóng hướng dẫn
            </button>
          </div>
        </div>
      )}
    </>
  );
};
