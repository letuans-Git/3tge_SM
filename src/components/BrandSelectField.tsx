import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { BrandCategory } from '../utils/brandUtils';

interface BrandSelectFieldProps {
  label?: string;
  value: string;
  category: BrandCategory;
  availableBrands: string[];
  onChange: (brand: string) => void;
  onAddNewBrand: (category: BrandCategory, brandName: string) => string;
  className?: string;
  size?: 'sm' | 'xs';
}

export const BrandSelectField: React.FC<BrandSelectFieldProps> = ({
  label = 'Hãng sản xuất',
  value,
  category,
  availableBrands,
  onChange,
  onAddNewBrand,
  className = '',
  size = 'xs'
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsAddingNew(true);
      setNewBrandName('');
      setErrorMsg('');
    } else {
      onChange(val);
    }
  };

  const handleSaveNewBrand = () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên hãng');
      return;
    }
    const saved = onAddNewBrand(category, trimmed);
    onChange(saved);
    setIsAddingNew(false);
    setNewBrandName('');
    setErrorMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewBrand();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingNew(false);
      setNewBrandName('');
      setErrorMsg('');
    }
  };

  // Ensure current value is in the list even if not yet in availableBrands
  const brandsList = [...availableBrands];
  if (value && !brandsList.some(b => b.toUpperCase() === value.toUpperCase()) && value !== 'KHAC') {
    brandsList.unshift(value);
  }

  return (
    <div className={`space-y-0.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-black block truncate" title={label}>
          {label}
        </label>
        {!isAddingNew && (
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              setNewBrandName('');
              setErrorMsg('');
            }}
            className="text-[9px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 hover:underline transition shrink-0"
            title="Thêm hãng sản xuất mới vào danh mục"
          >
            <Plus className="w-2.5 h-2.5" /> Thêm hãng
          </button>
        )}
      </div>

      {isAddingNew ? (
        <div className="space-y-1 animate-in fade-in duration-150">
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={newBrandName}
              onChange={(e) => {
                setNewBrandName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tên hãng (VD: GROWATT...)"
              className="flex-1 px-1.5 py-0.5 text-xs uppercase bg-white rounded border border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
            <button
              type="button"
              onClick={handleSaveNewBrand}
              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-0.5 shadow-2xs transition"
              title="Lưu hãng mới vào danh sách"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setNewBrandName('');
                setErrorMsg('');
              }}
              className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs transition"
              title="Hủy"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {errorMsg ? (
            <div className="text-[9px] text-rose-600">{errorMsg}</div>
          ) : (
            <div className="text-[9px] text-emerald-700 italic">
              * Tên hãng mới sẽ được lưu vào danh sách cho các lần chọn sau
            </div>
          )}
        </div>
      ) : (
        <select
          value={value}
          onChange={handleSelectChange}
          className="w-full px-1.5 py-0.5 text-xs uppercase bg-white rounded border border-slate-200 focus:outline-emerald-500 focus:border-emerald-500 font-medium"
        >
          {brandsList.map((b) => (
            <option key={b} value={b} className="uppercase">
              {b}
            </option>
          ))}
          <option value="__ADD_NEW__" className="text-emerald-700 font-bold bg-emerald-50 uppercase">
            + Nhập thêm hãng mới...
          </option>
        </select>
      )}
    </div>
  );
};
