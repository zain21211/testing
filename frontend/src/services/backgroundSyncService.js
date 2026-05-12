import axios from "axios";
import localforage from "localforage";

const API_URL = import.meta.env.VITE_API_URL;

export const backgroundSyncService = {
  // --- INVOICES (ORDERS) ---
  syncInvoices: async () => {
    if (!navigator.onLine) return;
    const invoices = JSON.parse(localStorage.getItem("invoice") || "[]");
    if (invoices.length === 0) return;

    console.log(`📦 Syncing ${invoices.length} pending invoices...`);
    const remainingInvoices = [];

    for (const invoice of invoices) {
      try {
        const res = await axios.post(`${API_URL}/create-order`, invoice);
        // Treat 200, 201, and 204 (duplicate) as success
        if (res.status === 200 || res.status === 201 || res.status === 204) {
          console.log(`✅ Invoice ${invoice.transactionID} synced`);
        } else {
          remainingInvoices.push(invoice);
        }
      } catch (e) {
        console.error(`❌ Invoice sync failed for ${invoice.transactionID}:`, e);
        remainingInvoices.push(invoice);
      }
    }
    localStorage.setItem("invoice", JSON.stringify(remainingInvoices));
  },

  // --- RECOVERY ENTRIES ---
  syncRecoveries: async () => {
    if (!navigator.onLine) return;
    const recoveryStore = localforage.createInstance({ name: "localforage", storeName: "keyvaluepairs" }); // Matches useIndexedDBState
    const entries = await recoveryStore.getItem("recoveryPaperEntries") || [];
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

    await recoveryStore.setItem("recoveryPaperEntries", updatedEntries);
  }
};
