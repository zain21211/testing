import axios from "axios";
import localforage from "localforage";

const API_URL = import.meta.env.VITE_API_URL;

export const backgroundSyncService = {
  // --- INVOICES (ORDERS) ---
  syncInvoices: async () => {
    if (!navigator.onLine) return;
    
    let dailyOrders = await localforage.getItem("dailyOrders") || [];
    const pendingOrders = dailyOrders.filter(o => !o.synced);
    
    if (pendingOrders.length === 0) return;

    console.log(`📦 [Sync] Starting background sync for ${pendingOrders.length} orders...`);

    for (const order of pendingOrders) {
      try {
        console.log(`📡 [Sync] Posting order ${order.transactionID}...`);
        const res = await axios.post(`${API_URL}/create-order`, order);
        
        if (res.status === 200 || res.status === 201) {
          const serverDoc = res.data?.doc;
          console.log(`✅ [Sync] Order ${order.transactionID} synced. Doc: ${serverDoc}`);
          
          // Refresh list from storage in case it changed
          dailyOrders = await localforage.getItem("dailyOrders") || [];
          
          dailyOrders = dailyOrders.map(o => 
            String(o.transactionID).trim() === String(order.transactionID).trim()
            ? { ...o, synced: true, doc: serverDoc || o.doc } 
            : o
          );
          
          await localforage.setItem("dailyOrders", dailyOrders);
          window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'dailyOrders' } }));
          
          // Clean up localStorage
          const invoices = JSON.parse(localStorage.getItem("invoice") || "[]");
          localStorage.setItem("invoice", JSON.stringify(invoices.filter(i => String(i.transactionID).trim() !== String(order.transactionID).trim())));
        }
      } catch (e) {
        console.error(`❌ [Sync] Order ${order.transactionID} failed:`, e.message);
      }
    }
  },

  syncOneInvoice: async (transactionID) => {
    if (!navigator.onLine) throw new Error("Offline");
    
    console.log(`📡 [Manual Sync] Attempting sync for ${transactionID}...`);
    let dailyOrders = await localforage.getItem("dailyOrders") || [];
    const orderToSync = dailyOrders.find(o => String(o.transactionID).trim() === String(transactionID).trim());
    
    if (!orderToSync) {
        console.warn(`⚠️ [Manual Sync] Order ${transactionID} not found in history.`);
        return;
    }
    if (orderToSync.synced) {
        console.log(`ℹ️ [Manual Sync] Order ${transactionID} is already marked as synced.`);
        return;
    }

    try {
        const res = await axios.post(`${API_URL}/create-order`, orderToSync);
        if (res.status === 200 || res.status === 201) {
            const serverDoc = res.data?.doc;
            console.log(`✅ [Manual Sync] Success. Doc: ${serverDoc}`);
            
            dailyOrders = await localforage.getItem("dailyOrders") || [];
            dailyOrders = dailyOrders.map(o => 
                String(o.transactionID).trim() === String(transactionID).trim()
                ? { ...o, synced: true, doc: serverDoc || o.doc } 
                : o
            );
            
            await localforage.setItem("dailyOrders", dailyOrders);
            window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'dailyOrders' } }));
            
            const invoices = JSON.parse(localStorage.getItem("invoice") || "[]");
            localStorage.setItem("invoice", JSON.stringify(invoices.filter(i => String(i.transactionID).trim() !== String(transactionID).trim())));
        }
    } catch (e) {
        console.error(`❌ [Manual Sync] Failed for ${transactionID}:`, e.message);
        throw e;
    }
  },

  // --- RECOVERY ENTRIES ---
  syncRecoveries: async () => {
    if (!navigator.onLine) return;
    const entries = await localforage.getItem("recoveryPaperEntries") || [];
    const pendingEntries = entries.filter(e => !e.status);
    
    if (pendingEntries.length === 0) return;

    console.log(`💰 Syncing ${pendingEntries.length} pending recoveries...`);
    const updatedEntries = [...entries];

    for (const entry of pendingEntries) {
      const { amounts, id, userName, description, timestamp, paymentImages, creditID, debitID, subEntryStatus = {} } = entry;
      const entriesToPost = Object.entries(amounts).filter(([method, amount]) => amount > 0 && subEntryStatus[method] !== true);
      
      let allSuccess = true;
      const newSubStatus = { ...subEntryStatus };

      for (const [method, amount] of entriesToPost) {
        const payload = {
          creditID: `${creditID}_${method}`,
          debitID: `${debitID}_${method}`,
          paymentMethod: method.toLowerCase() === "crownwallet" ? "crownone" : 
                         method.toLowerCase() === "crownfit" ? "crownfit" :
                         method.toLowerCase().includes("meezan") ? "mbl" : method,
          custId: id,
          receivedAmount: amount,
          userName,
          desc: description,
          time: timestamp,
          paymentImage: paymentImages?.[method] || null,
          location: entry.location || { latitude: 0, longitude: 0, address: "Offline Entry" },
          imageStatus: entry.imageStatus,
        };

        try {
          const res = await axios.post(`${API_URL}/cash-entry`, payload);
          if (res.status === 200 || res.status === 201 || (res.status === 400 && res.data?.error === "Duplicate transaction IDs")) {
             newSubStatus[method] = true;
          } else {
             allSuccess = false;
          }
        } catch (e) {
          if (e.response && e.response.status === 400 && e.response.data?.error === "Duplicate transaction IDs") {
             newSubStatus[method] = true;
          } else {
             allSuccess = false;
          }
        }
      }

      // Check if all parts of this multi-payment entry are now done
      const allRequired = Object.entries(amounts).filter(([_, a]) => a > 0).every(([m]) => newSubStatus[m]);
      
      // Update the entry in the main list
      const idx = updatedEntries.findIndex(e => e.creditID === entry.creditID);
      if (idx !== -1) {
        updatedEntries[idx] = { ...entry, status: allRequired, subEntryStatus: newSubStatus };
      }
    }

    await localforage.setItem("recoveryPaperEntries", updatedEntries);
    window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: 'recoveryPaperEntries' } }));
  }
};
