import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export type BrandCategory = 'inverter' | 'battery' | 'solar' | 'wind';

export const DEFAULT_INVERTER_BRANDS: string[] = [
  'GOODWE',
  'HUAWEI',
  'SUNGROW',
  'DEYE',
  'LUXPOWER',
  'PYLONTECH',
  'GROWATT',
  'SOLIS',
  'SMA',
  'SOFAR',
  'KHAC'
];

export const DEFAULT_BATTERY_BRANDS: string[] = [
  'PYLONTECH',
  'GOODWE',
  'DEYE',
  'HUAWEI',
  'SUNGROW',
  'BYD',
  'CATL',
  'GSL_ENERGY',
  'KHAC'
];

export const DEFAULT_SOLAR_BRANDS: string[] = [
  'LONGI',
  'JINKO',
  'CANADIAN',
  'TRINA',
  'JA_SOLAR',
  'AE_SOLAR',
  'RISEN',
  'TW_SOLAR',
  'KHAC'
];

export const DEFAULT_WIND_BRANDS: string[] = [
  'HY_ENERGY',
  'BERGY',
  'GOLDWIND',
  'ENVISION',
  'VESTAS',
  'AEOLOS',
  'KHAC'
];

const STORAGE_KEYS: Record<BrandCategory, string> = {
  inverter: '3tge_brands_inverter',
  battery: '3tge_brands_battery',
  solar: '3tge_brands_solar',
  wind: '3tge_brands_wind'
};

const DEFAULT_MAP: Record<BrandCategory, string[]> = {
  inverter: DEFAULT_INVERTER_BRANDS,
  battery: DEFAULT_BATTERY_BRANDS,
  solar: DEFAULT_SOLAR_BRANDS,
  wind: DEFAULT_WIND_BRANDS
};

/**
 * Get saved brands from localStorage or defaults
 */
export function getSavedBrands(category: BrandCategory): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[category]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with defaults to ensure none are missing
        const set = new Set<string>();
        parsed.forEach(b => {
          if (b && typeof b === 'string') set.add(b.trim().toUpperCase());
        });
        DEFAULT_MAP[category].forEach(b => set.add(b.trim().toUpperCase()));
        
        // Ensure 'KHAC' is at the end if present
        const list = Array.from(set).filter(b => b !== 'KHAC');
        list.push('KHAC');
        return list;
      }
    }
  } catch (e) {
    console.warn(`Error reading brands for ${category}:`, e);
  }
  return [...DEFAULT_MAP[category]];
}

/**
 * Save and persist a new brand. Returns the updated list.
 */
export function saveBrand(category: BrandCategory, newBrandName: string): { updatedList: string[]; savedBrand: string } {
  const sanitized = newBrandName.trim().toUpperCase();
  if (!sanitized) {
    return { updatedList: getSavedBrands(category), savedBrand: '' };
  }

  const current = getSavedBrands(category);
  const exists = current.some(b => b.toUpperCase() === sanitized);

  let updatedList = current;
  if (!exists) {
    // Insert before 'KHAC' if 'KHAC' is at the end
    const filtered = current.filter(b => b !== 'KHAC' && b.toUpperCase() !== sanitized);
    filtered.push(sanitized);
    filtered.push('KHAC');
    updatedList = filtered;

    try {
      localStorage.setItem(STORAGE_KEYS[category], JSON.stringify(updatedList));
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('brands-updated', { detail: { category, brand: sanitized } }));
      
      // Async sync to Firestore app_settings
      syncBrandsToFirestore(category, updatedList);
    } catch (e) {
      console.warn('Error saving brand to storage:', e);
    }
  }

  return { updatedList, savedBrand: sanitized };
}

/**
 * Sync custom brands list to Firestore for multi-device sync
 */
async function syncBrandsToFirestore(category: BrandCategory, brands: string[]) {
  try {
    const ref = doc(db, 'app_settings', 'brands');
    await setDoc(ref, { [category]: brands, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.warn('Could not sync brands to Firestore (offline or permission):', e);
  }
}

/**
 * React hook to access and manage brands with live updates
 */
export function useEquipmentBrands() {
  const [inverterBrands, setInverterBrands] = useState<string[]>(() => getSavedBrands('inverter'));
  const [batteryBrands, setBatteryBrands] = useState<string[]>(() => getSavedBrands('battery'));
  const [solarBrands, setSolarBrands] = useState<string[]>(() => getSavedBrands('solar'));
  const [windBrands, setWindBrands] = useState<string[]>(() => getSavedBrands('wind'));

  const refreshAll = useCallback(() => {
    setInverterBrands(getSavedBrands('inverter'));
    setBatteryBrands(getSavedBrands('battery'));
    setSolarBrands(getSavedBrands('solar'));
    setWindBrands(getSavedBrands('wind'));
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refreshAll();
    };

    window.addEventListener('brands-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Initial check from Firestore
    async function loadRemoteBrands() {
      try {
        const ref = doc(db, 'app_settings', 'brands');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          (['inverter', 'battery', 'solar', 'wind'] as BrandCategory[]).forEach(cat => {
            if (Array.isArray(data[cat]) && data[cat].length > 0) {
              const merged = new Set([...getSavedBrands(cat), ...data[cat]]);
              const list = Array.from(merged).filter(b => b !== 'KHAC');
              list.push('KHAC');
              localStorage.setItem(STORAGE_KEYS[cat], JSON.stringify(list));
            }
          });
          refreshAll();
        }
      } catch (err) {
        // Silently continue with local brands
      }
    }
    loadRemoteBrands();

    return () => {
      window.removeEventListener('brands-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshAll]);

  const addBrand = useCallback((category: BrandCategory, name: string) => {
    const res = saveBrand(category, name);
    refreshAll();
    return res.savedBrand;
  }, [refreshAll]);

  return {
    inverterBrands,
    batteryBrands,
    solarBrands,
    windBrands,
    addBrand
  };
}
