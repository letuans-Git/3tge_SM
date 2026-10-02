import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const DEFAULT_DISTRIBUTORS: string[] = [
  'HTPRO189',
  'Hừng Đông Solar',
  'Alena Energy',
  'SolarV',
  'DAT Solar',
  'Intech Energy',
  'Jinko Solar VN',
  'Canadian Solar',
  'JA Solar VN',
  'Khác'
];

const STORAGE_KEY = '3tge_distributors';

/**
 * Get saved distributors from localStorage or defaults
 */
export function getSavedDistributors(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const set = new Set<string>();
        // Add parsed preserving original case
        parsed.forEach(d => {
          if (d && typeof d === 'string' && d.trim()) set.add(d.trim());
        });
        DEFAULT_DISTRIBUTORS.forEach(d => set.add(d.trim()));

        const list = Array.from(set).filter(d => d.toLowerCase() !== 'khác');
        list.push('Khác');
        return list;
      }
    }
  } catch (e) {
    console.warn('Error reading distributors:', e);
  }
  return [...DEFAULT_DISTRIBUTORS];
}

/**
 * Save and persist a new distributor. Returns updated list and the saved distributor string.
 */
export function saveDistributor(newDistributorName: string): { updatedList: string[]; savedDistributor: string } {
  const sanitized = newDistributorName.trim();
  if (!sanitized) {
    return { updatedList: getSavedDistributors(), savedDistributor: '' };
  }

  const current = getSavedDistributors();
  const exists = current.find(d => d.toLowerCase() === sanitized.toLowerCase());

  if (exists) {
    return { updatedList: current, savedDistributor: exists };
  }

  // Insert before 'Khác'
  const filtered = current.filter(d => d.toLowerCase() !== 'khác' && d.toLowerCase() !== sanitized.toLowerCase());
  filtered.push(sanitized);
  filtered.push('Khác');
  const updatedList = filtered;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('distributors-updated', { detail: { distributor: sanitized } }));

    // Async sync to Firestore
    syncDistributorsToFirestore(updatedList);
  } catch (e) {
    console.warn('Error saving distributor to storage:', e);
  }

  return { updatedList, savedDistributor: sanitized };
}

/**
 * Sync distributors list to Firestore
 */
async function syncDistributorsToFirestore(distributors: string[]) {
  try {
    const ref = doc(db, 'app_settings', 'distributors');
    await setDoc(ref, { list: distributors, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('Could not sync distributors to Firestore:', e);
  }
}

/**
 * React hook to access and manage distributors with live updates
 */
export function useDistributors() {
  const [distributors, setDistributors] = useState<string[]>(() => getSavedDistributors());

  const refresh = useCallback(() => {
    setDistributors(getSavedDistributors());
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener('distributors-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Initial check from Firestore
    async function loadRemoteDistributors() {
      try {
        const ref = doc(db, 'app_settings', 'distributors');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.list) && data.list.length > 0) {
            const current = getSavedDistributors();
            const set = new Set([...current, ...data.list]);
            const list = Array.from(set).filter(d => d.toLowerCase() !== 'khác');
            list.push('Khác');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            refresh();
          }
        }
      } catch (err) {
        // Continue with local
      }
    }
    loadRemoteDistributors();

    return () => {
      window.removeEventListener('distributors-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const addDistributor = useCallback((name: string) => {
    const res = saveDistributor(name);
    refresh();
    return res.savedDistributor;
  }, [refresh]);

  return {
    distributors,
    addDistributor
  };
}
