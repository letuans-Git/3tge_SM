import React from 'react';
import { Printer, X, Download, FileText, CheckCircle2 } from 'lucide-react';
import { GoodsReceiptNote } from '../types';
import { formatDateVN } from '../utils/dateUtils';
import { numberToWordsVN } from '../utils/numberToWordsVN';

interface GoodsReceiptPrintModalProps {
  receipt: GoodsReceiptNote | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoodsReceiptPrintModal: React.FC<GoodsReceiptPrintModalProps> = ({
  receipt,
  isOpen,
  onClose
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  // Tách ngày tháng năm để hiển thị chuẩn biểu mẫu kế toán
  const receiptDateObj = receipt.date ? new Date(receipt.date) : new Date();
  const day = receiptDateObj.getDate().toString().padStart(2, '0');
  const month = (receiptDateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = receiptDateObj.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Outer wrapper */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-800 text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Xem Trước & In Phiếu Nhập Kho</h3>
              <p className="text-[11px] text-slate-400">
                Mã phiếu: <span className="font-mono font-bold text-emerald-400">{receipt.receiptCode}</span> &bull; {receipt.items.length} mặt hàng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Nhập Kho</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (Standard A4 layout) */}
        <div className="p-6 sm:p-10 overflow-y-auto bg-slate-100 flex-1 print:p-0 print:bg-white print:overflow-visible">
          <div 
            id="printable-receipt"
            className="bg-white mx-auto p-8 sm:p-12 max-w-[210mm] min-h-[297mm] shadow-lg border border-slate-200 text-slate-900 text-[12.5px] leading-relaxed font-serif print:shadow-none print:border-none print:p-4 print:max-w-none print:text-black"
          >
            {/* Header: Company Info + Form Standard */}
            <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-300">
              <div className="space-y-0.5 text-xs max-w-sm">
                <div className="font-bold uppercase text-[13px] tracking-wide text-slate-900">
                  CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG 3T GREEN ENERGY
                </div>
                <div className="text-slate-600">
                  <strong>Địa chỉ:</strong> 189 Lê Thiệt, P. Phú Thọ Hòa, Q. Tân Phú, TP. HCM
                </div>
                <div className="text-slate-600">
                  <strong>Điện thoại:</strong> 0909.123.456 &bull; <strong>MST:</strong> 0316888999
                </div>
                <div className="text-slate-600">
                  <strong>Kho hàng:</strong> {receipt.warehouseName || 'Kho chính 3TGE'}
                </div>
              </div>

              <div className="text-right text-xs space-y-0.5">
                <div className="font-bold text-[12px] uppercase text-slate-800">
                  Mẫu số 01 - VT
                </div>
                <div className="text-[10px] text-slate-500 italic max-w-[200px]">
                  (Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)
                </div>
                <div className="pt-1 font-mono text-[11px] text-slate-700">
                  Số: <strong>{receipt.receiptCode}</strong>
                </div>
                <div className="text-[10.5px] text-slate-500">
                  Nợ TK: 152, 156 / Có TK: 331, 111
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center my-6 space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-950 font-sans">
                PHIẾU NHẬP KHO
              </h1>
              <div className="italic text-xs text-slate-600">
                Ngày {day} tháng {month} năm {year}
              </div>
              <div className="font-mono text-xs font-semibold text-slate-700">
                Số phiếu: {receipt.receiptCode}
              </div>
            </div>

            {/* Receipt Meta Information */}
            <div className="space-y-1.5 text-xs mb-5">
              <div className="flex">
                <span className="w-44 shrink-0 text-slate-700">- Họ và tên người giao hàng:</span>
                <span className="font-semibold text-slate-900 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {receipt.delivererName || 'Đại diện nhà cung cấp'}
                </span>
              </div>
              <div className="flex">
                <span className="w-44 shrink-0 text-slate-700">- Đơn vị / Nhà cung cấp:</span>
                <span className="font-bold text-slate-900 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {receipt.supplierName}
                  {receipt.supplierPhone && <span className="font-normal text-slate-600 ml-2">(SĐT: {receipt.supplierPhone})</span>}
                </span>
              </div>
              {receipt.supplierAddress && (
                <div className="flex">
                  <span className="w-44 shrink-0 text-slate-700">- Địa chỉ nhà cung cấp:</span>
                  <span className="text-slate-800 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                    {receipt.supplierAddress}
                  </span>
                </div>
              )}
              <div className="flex">
                <span className="w-44 shrink-0 text-slate-700">- Theo chứng từ / Hóa đơn:</span>
                <span className="font-medium text-slate-900 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {receipt.invoiceNumber || 'Hóa đơn GTGT / Biên bản giao nhận hàng hóa'}
                </span>
              </div>
              <div className="flex">
                <span className="w-44 shrink-0 text-slate-700">- Nhập tại kho:</span>
                <span className="font-semibold text-slate-900 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {receipt.warehouseName || 'Kho chính 3TGE'} {receipt.warehouseLocation ? `(${receipt.warehouseLocation})` : ''}
                </span>
              </div>
              {receipt.reason && (
                <div className="flex">
                  <span className="w-44 shrink-0 text-slate-700">- Lý do nhập kho:</span>
                  <span className="text-slate-800 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                    {receipt.reason}
                  </span>
                </div>
              )}
            </div>

            {/* Multi-Item Table */}
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-slate-800 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold text-slate-900 border-b border-slate-800">
                    <th className="border border-slate-800 py-2 px-1.5 w-9" rowSpan={2}>STT</th>
                    <th className="border border-slate-800 py-2 px-2 min-w-[180px]" rowSpan={2}>
                      Tên, nhãn hiệu, quy cách phẩm chất vật tư
                    </th>
                    <th className="border border-slate-800 py-2 px-1.5 w-20" rowSpan={2}>Mã số</th>
                    <th className="border border-slate-800 py-2 px-1.5 w-14" rowSpan={2}>ĐVT</th>
                    <th className="border border-slate-800 py-1 px-1.5" colSpan={2}>Số lượng</th>
                    <th className="border border-slate-800 py-2 px-2 w-24 text-right" rowSpan={2}>Đơn giá (VNĐ)</th>
                    <th className="border border-slate-800 py-2 px-2 w-28 text-right" rowSpan={2}>Thành tiền (VNĐ)</th>
                    <th className="border border-slate-800 py-2 px-2 w-20" rowSpan={2}>Ghi chú</th>
                  </tr>
                  <tr className="bg-slate-100 text-center font-bold text-slate-800 border-b border-slate-800 text-[10.5px]">
                    <th className="border border-slate-800 py-1 px-1 w-14">Chứng từ</th>
                    <th className="border border-slate-800 py-1 px-1 w-14">Thực nhập</th>
                  </tr>
                  {/* Dòng đánh số cột A, B, C, D, 1, 2, 3, 4 */}
                  <tr className="bg-slate-50 text-center italic text-[10px] text-slate-600 border-b border-slate-800">
                    <td className="border border-slate-800 py-0.5">A</td>
                    <td className="border border-slate-800 py-0.5">B</td>
                    <td className="border border-slate-800 py-0.5">C</td>
                    <td className="border border-slate-800 py-0.5">D</td>
                    <td className="border border-slate-800 py-0.5">1</td>
                    <td className="border border-slate-800 py-0.5">2</td>
                    <td className="border border-slate-800 py-0.5">3</td>
                    <td className="border border-slate-800 py-0.5">4 = (2 x 3)</td>
                    <td className="border border-slate-800 py-0.5">E</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {receipt.items.map((it, idx) => (
                    <tr key={it.itemId || idx} className="text-slate-900">
                      <td className="border border-slate-800 py-1.5 px-1.5 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-2">
                        <div className="font-bold">{it.itemName}</div>
                        {it.brand && <div className="text-[10px] text-slate-500 font-sans">Hãng: {it.brand}</div>}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-1.5 text-center font-mono font-semibold">
                        {it.itemCode}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-1.5 text-center">
                        {it.unit}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-1 text-center font-mono">
                        {it.docQuantity || it.actualQuantity}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-1 text-center font-mono font-bold text-slate-950">
                        {it.actualQuantity}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-2 text-right font-mono">
                        {it.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-2 text-right font-mono font-bold">
                        {it.totalAmount.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-slate-800 py-1.5 px-1 text-slate-600 text-[10.5px]">
                        {it.notes || '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Dòng Tổng cộng */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-950">
                    <td className="border border-slate-800 py-2 px-2 text-center" colSpan={4}>
                      CỘNG
                    </td>
                    <td className="border border-slate-800 py-2 px-1 text-center font-mono font-bold">
                      {receipt.items.reduce((s, i) => s + (Number(i.docQuantity) || Number(i.actualQuantity)), 0)}
                    </td>
                    <td className="border border-slate-800 py-2 px-1 text-center font-mono font-bold">
                      {receipt.totalQuantity}
                    </td>
                    <td className="border border-slate-800 py-2 px-2 text-center text-slate-400">
                      x
                    </td>
                    <td className="border border-slate-800 py-2 px-2 text-right font-mono font-black text-sm text-slate-950">
                      {receipt.totalAmount.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-slate-800 py-2 px-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in words & notes */}
            <div className="space-y-1.5 text-xs my-3">
              <div className="flex items-baseline">
                <span className="font-bold text-slate-900 shrink-0 mr-1.5">- Tổng số tiền (bằng chữ):</span>
                <span className="font-bold italic text-slate-900 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {numberToWordsVN(receipt.totalAmount)}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="text-slate-700 shrink-0 mr-1.5">- Số chứng từ gốc kèm theo:</span>
                <span className="text-slate-800 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                  {receipt.invoiceNumber ? `01 (${receipt.invoiceNumber})` : '01 bộ chứng từ giao nhận hàng'}
                </span>
              </div>
              {receipt.notes && (
                <div className="flex items-baseline">
                  <span className="text-slate-700 shrink-0 mr-1.5">- Ghi chú thêm:</span>
                  <span className="text-slate-800 flex-1 border-b border-dotted border-slate-400 pb-0.5">
                    {receipt.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Date line before signatures */}
            <div className="text-right italic text-xs text-slate-700 mt-6 mb-2">
              Ngày {day} tháng {month} năm {year}
            </div>

            {/* Signatures section (5 columns) */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs mt-3 pt-2">
              <div className="space-y-1">
                <div className="font-bold uppercase text-slate-950">Người lập phiếu</div>
                <div className="text-[10.5px] italic text-slate-500">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">{receipt.createdBy}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold uppercase text-slate-950">Người giao hàng</div>
                <div className="text-[10.5px] italic text-slate-500">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">{receipt.delivererName || '................................'}</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold uppercase text-slate-950">Thủ kho</div>
                <div className="text-[10.5px] italic text-slate-500">(Ký, họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">Lê Tuấn</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold uppercase text-slate-950">Kế toán trưởng / Giám đốc</div>
                <div className="text-[10.5px] italic text-slate-500">(Ký, họ tên, đóng dấu)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">Ban Giám Đốc 3TGE</div>
              </div>
            </div>

            {/* Verification footer */}
            <div className="mt-8 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 italic print:mt-4">
              Hệ thống Quản lý Năng lượng & Vật tư Kho 3T Green Energy &bull; In lúc: {new Date().toLocaleString('vi-VN')} &bull; Mã tra cứu: {receipt.receiptCode}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden when printing) */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Mẹo: Nhấn nút <strong>In Phiếu Nhập Kho</strong> hoặc tổ hợp phím <strong>Ctrl + P</strong> để in ngay trên khổ A4
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Phiếu Ngay</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
