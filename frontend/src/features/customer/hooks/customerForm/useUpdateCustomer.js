import { useEffect, useState } from "react";
import { useMasterCustomerList } from "./useMasterCustomerList";

export default function useUpdateCustomer(name) {
  const { masterCustomerList: customers } = useMasterCustomerList();
  const [selectedCustomer, setSelectedCustomer] = useState({});

  const handleSelection = () => {
    const cust = customers.filter((c) => c.name === name)[0];

    if (cust) setSelectedCustomer(cust);
  };

  useEffect(() => {
    if (name && customers) handleSelection();
  }, [customers, name]);

  return { selectedCustomer, setSelectedCustomer };
}
