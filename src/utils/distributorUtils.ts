import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Supplier } from '../types';

// Xóa hoàn toàn danh sách nhà phân phối tự phát / demo cũ
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('3tge_distributors');
  } catch (e) {
    // ignore
  }
}

/**
 * Hook đồng bộ danh mục nhà cung cấp / nhà phân phối trực tiếp từ Firestore.
 * Tuyệt đối không sử dụng dữ liệu tự phát hay demo.
 */
export function useDistributors() {
  const [distributorNames, setDistributorNames] = useState<string[]>([]);

  useEffect(() => {
    // Lắng nghe trực tiếp từ collection 'suppliers' (Danh mục Nhà cung cấp chính thức)
    const unsub = onSnapshot(collection(db, 'suppliers'), (snap) => {
      const names: string[] = [];
      snap.docs.forEach(d => {
        const sup = d.data() as Supplier;
        if (sup.name && typeof sup.name === 'string') {
          names.push(sup.name.trim());
        }
      });
      // Sắp xếp theo thứ tự bảng chữ cái tiếng Việt
      names.sort((a, b) => a.localeCompare(b, 'vi'));
      setDistributorNames(names);
    }, (err) => {
      console.warn('Lỗi đồng bộ danh mục nhà cung cấp cho NPP:', err);
    });

    return () => unsub();
  }, []);

  return {
    distributors: distributorNames,
    addDistributor: () => ''
  };
}
