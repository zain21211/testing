import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchMasterCustomerList } from "../store/slices/CustomerData";

export function useMasterCustomerList() {
  // REACT HOOKS
  const dispatch = useDispatch();

  // REDUX STATES
  const { masterCustomerList, status } = useSelector(
    (state) => state.customerData
  );

  // for Customer list
  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchMasterCustomerList());
    }
  }, [dispatch, status]);

  return { masterCustomerList };
}
