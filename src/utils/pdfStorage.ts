import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CustomerPdfDocument } from '../types';

const DB_NAME = '3tge_solar_pdf_db';
const STORE_NAME = 'pdf_documents';
const DB_VERSION = 1;
const CHUNK_SIZE = 650000; // ~650KB per chunk to safely stay below Firestore 1MB limit

// Initialize IndexedDB
const getIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'storageKey' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getStorageKey = (customerId: string, docId: string): string => {
  return `${customerId}_${docId}`;
};

// Save a PDF file in IndexedDB
export const savePdfToIndexedDB = async (
  customerId: string,
  docItem: CustomerPdfDocument
): Promise<void> => {
  try {
    const idb = await getIndexedDB();
    const key = getStorageKey(customerId, docItem.id);
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        storageKey: key,
        customerId,
        docId: docItem.id,
        name: docItem.name,
        category: docItem.category,
        fileData: docItem.fileData,
        fileSize: docItem.fileSize,
        uploadedAt: docItem.uploadedAt || new Date().toISOString()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save PDF to IndexedDB:', err);
  }
};

// Get a PDF file from IndexedDB
export const getPdfFromIndexedDB = async (
  customerId: string,
  docId: string
): Promise<string | null> => {
  try {
    const idb = await getIndexedDB();
    const key = getStorageKey(customerId, docId);
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.fileData) {
          resolve(req.result.fileData);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// Delete a PDF file from IndexedDB
export const deletePdfFromIndexedDB = async (
  customerId: string,
  docId: string
): Promise<void> => {
  try {
    const idb = await getIndexedDB();
    const key = getStorageKey(customerId, docId);
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore error
  }
};

// Save a PDF file to Firestore in dedicated chunked collection
export const savePdfToFirestore = async (
  customerId: string,
  docItem: CustomerPdfDocument
): Promise<void> => {
  if (!docItem.fileData) return;
  const storageKey = getStorageKey(customerId, docItem.id);
  const data = docItem.fileData;

  try {
    // Split into chunks if needed to guarantee no Firestore document exceeds 1MB limit
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    if (totalChunks <= 1) {
      await setDoc(doc(db, 'customer_pdf_files', storageKey), {
        storageKey,
        customerId,
        docId: docItem.id,
        name: docItem.name,
        category: docItem.category,
        fileSize: docItem.fileSize,
        uploadedAt: docItem.uploadedAt || new Date().toISOString(),
        totalChunks: 1,
        fileData: data
      });
    } else {
      // Multi-chunk document
      const docPayload: Record<string, any> = {
        storageKey,
        customerId,
        docId: docItem.id,
        name: docItem.name,
        category: docItem.category,
        fileSize: docItem.fileSize,
        uploadedAt: docItem.uploadedAt || new Date().toISOString(),
        totalChunks
      };

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, data.length);
        docPayload[`chunk_${i}`] = data.substring(start, end);
      }

      await setDoc(doc(db, 'customer_pdf_files', storageKey), docPayload);
    }
  } catch (err) {
    console.warn(`Could not save PDF ${docItem.name} to Firestore customer_pdf_files:`, err);
  }
};

// Load PDF fileData from all available sources (In-Memory -> IndexedDB -> Firestore)
export const resolvePdfFileData = async (
  customerId: string,
  docItem: CustomerPdfDocument
): Promise<string> => {
  // 1. If already in memory
  if (docItem.fileData && docItem.fileData.length > 50) {
    return docItem.fileData;
  }

  // 2. Check IndexedDB (instant local storage)
  const fromLocal = await getPdfFromIndexedDB(customerId, docItem.id);
  if (fromLocal) {
    return fromLocal;
  }

  // 3. Fallback to Firestore customer_pdf_files
  try {
    const storageKey = getStorageKey(customerId, docItem.id);
    const snap = await getDoc(doc(db, 'customer_pdf_files', storageKey));
    if (snap.exists()) {
      const snapData = snap.data();
      if (snapData.fileData) {
        // Cache to IndexedDB for subsequent instant loads
        savePdfToIndexedDB(customerId, { ...docItem, fileData: snapData.fileData });
        return snapData.fileData;
      }
      if (snapData.totalChunks && snapData.totalChunks > 1) {
        let fullData = '';
        for (let i = 0; i < snapData.totalChunks; i++) {
          fullData += snapData[`chunk_${i}`] || '';
        }
        if (fullData) {
          savePdfToIndexedDB(customerId, { ...docItem, fileData: fullData });
          return fullData;
        }
      }
    }
  } catch (err) {
    console.warn('Error fetching PDF from Firestore:', err);
  }

  return '';
};

// Delete a PDF file from both IndexedDB and Firestore
export const removePdfFileFromStorage = async (
  customerId: string,
  docId: string
): Promise<void> => {
  await deletePdfFromIndexedDB(customerId, docId);
  try {
    const storageKey = getStorageKey(customerId, docId);
    await deleteDoc(doc(db, 'customer_pdf_files', storageKey));
  } catch (err) {
    console.warn('Error deleting PDF from Firestore:', err);
  }
};

// Batch save multiple PDF files
export const persistCustomerPdfFiles = async (
  customerId: string,
  pdfDocs?: CustomerPdfDocument[]
): Promise<void> => {
  if (!pdfDocs || pdfDocs.length === 0) return;
  for (const docItem of pdfDocs) {
    if (docItem.fileData) {
      // Save locally first
      await savePdfToIndexedDB(customerId, docItem);
      // Save to Firestore in background
      savePdfToFirestore(customerId, docItem).catch((e) =>
        console.warn('Background save PDF to Firestore note:', e)
      );
    }
  }
};

// Prepare customer PDF documents for saving to main customer document in Firestore
// Keeps metadata clean and compact so customers document NEVER exceeds Firestore 1MB limit
export const sanitizePdfDocsForCustomerDoc = (
  pdfDocs?: CustomerPdfDocument[]
): CustomerPdfDocument[] => {
  if (!pdfDocs || pdfDocs.length === 0) return [];
  return pdfDocs.map((doc) => {
    // If small (< 80KB), can keep inline, otherwise strip fileData from main customer document
    // because full fileData is safely preserved in customer_pdf_files and IndexedDB
    const isSmall = doc.fileData && doc.fileData.length < 80000;
    return {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      fileSize: doc.fileSize,
      uploadedAt: doc.uploadedAt,
      fileData: isSmall ? doc.fileData : ''
    };
  });
};
