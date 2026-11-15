// Keeps unpublished edits (and uploaded files) in the browser, so nothing is lost on refresh.
const DB = 'wm-editor';
const STORE = 'draft';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export const saveDraft = draft => tx('readwrite', s => s.put(draft, 'current')).catch(() => {});
export const loadDraft = () => tx('readonly', s => s.get('current')).catch(() => null);
export const clearDraft = () => tx('readwrite', s => s.delete('current')).catch(() => {});
