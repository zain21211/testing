import useLocalStorageState from "use-local-storage-state";

export const usePackingFormState = (id) => {
  const [updatedInvoice, setUpdatedInvoice] = useLocalStorageState(
    "packingQTY",
    {
      defaultValue: [],
    }
  );
  const user = JSON.parse(localStorage.getItem("user"));

  const [updatedInvoices, setUpdatedInvoices] = useLocalStorageState(
    "updatedInvoices",
    {
      defaultValue: [],
    }
  );

  const [nug, setNug] = useLocalStorageState("nug", {});
  const [person, setPerson] = useLocalStorageState("person", {});

  const updateQuantity = (row, qty) => {
    console.log("row:", row, qty);
    const now = new Date();
    now.setHours(now.getHours() + 5);
    const dateTime = now.toISOString().slice(0, 19).replace("T", " ");

    setUpdatedInvoice((prev) => {
      const existingIndex = prev.findIndex((item) => item.psid === row.psid);
      const updatedItem = {
        invoice: id,
        prid: row.prid,
        psid: row.psid,
        qty: qty,
        dateTime,
        user: user.username,
      };

      const updated = [...prev];
      if (existingIndex !== -1) {
        updated[existingIndex] = updatedItem;
      } else {
        updated.push(updatedItem);
      }

      // Update localStorage with current invoice data
      setUpdatedInvoices((allInvoices) => {
        const invoices = updated.filter(
          (item) => item.invoice === id && item.qty !== row.TQ
        );
        return {
          ...allInvoices,
          [id]: invoices,
        };
      });

      return updated;
    });
  };

  const updateNug = (value) => {
    setNug((prev) => ({ ...prev, [id]: value }));
  };

  const updatePerson = (value) => {
    setPerson((prev) => ({ ...prev, [id]: value }));
  };

  return {
    updatedInvoice,
    updatedInvoices,
    setUpdatedInvoice,
    setUpdatedInvoices,
    nug: nug[id] || "",
    person: person[id] || "",
    updateQuantity,
    updateNug,
    updatePerson,
  };
};
