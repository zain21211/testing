// coa.jsx
import axios from 'axios';
import { Box } from '@mui/material';
import { useState, useEffect, useRef, use } from 'react';
import useWindowDimensions from './useWindowDimensions'; // Import the custom hook

// REDUX STATES FUNCTIONS
import {
    persistMasterCustomerList,
} from "./store/slices/CustomerData";

// COMPONENTS
import CustomerForm from './components/CustomerForm';
import CustomerList from './components/CustomerList';
import { useMasterCustomerList } from './hooks/useMasterCustomerList';
import { fetchCustomers } from './utils/api';
import { useDispatch } from 'react-redux';

// PARENT COMPONENT
const CreateCustomer = () => {

    // CUSTOM HOOKS
    const { masterCustomerList } = useMasterCustomerList();

    // LOCAL STATES
    const user = JSON.parse(localStorage.getItem("user"));
    const token = useState(localStorage.getItem("authToken"));
    const { height } = useWindowDimensions(); // Get window height
    const containerRef = useRef(null);
    const [tableHeight, setTableHeight] = useState(0);
    const names = masterCustomerList.map(account => account.name);
    const urdu = masterCustomerList.map(account => account.UrduName);
    const dispatch = useDispatch();

    // useEffects

    // FOR TABLE HEIGHT
    useEffect(() => {
        if (containerRef.current) {
            const divHeight = containerRef.current.offsetHeight;
            console.log("Div height:", divHeight);
            setTableHeight(divHeight);
        }
    }, [containerRef]); // or any dependency you want to trigger recalculation


    useEffect(() => {
        console.log("Window table height changed:", tableHeight);
    }, [tableHeight]);

    useEffect(() => {
        handleUpdate();
    }, []);

    // FUNCTIONS
    const handleUpdate = async () => {
        try {

            console.log("Fetching customers to update master list...");
            // FETCH API
            const response = await fetchCustomers()

            const data = Array.isArray(response) ? response : [];
            dispatch(persistMasterCustomerList(data))

        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    // RENDERING
    return (
        <Box
            sx={{
                width: '100%',
                // my: 2,
                display: { xs: 'flex', sm: 'grid' },
                flexDirection: 'column',
                // overflow: 'hidden',

                gridTemplateColumns: {
                    xs: '1fr',       // mobile → single column
                    md: '1fr 2fr',   // desktop → 1/3 + 2/3
                },
                gap: { xs: 1, md: 3 }, // reduce mobile gaps
            }}
        >
            {/* Left panel: CUSTOMER FORM */}
            <Box
                ref={containerRef}
                sx={{ position: { md: 'sticky' }, alignSelf: "start" }}>
                <CustomerForm
                    onCustomerCreated={handleUpdate}
                    accounts={names}
                    urdu={urdu}
                />
            </Box>

            {/* Right panel: CUSTOMER LIST */}
            <Box>
                <CustomerList
                    customer={masterCustomerList}
                    onAccountDeleted={handleUpdate}
                    tableHeight={tableHeight}
                />
            </Box>
        </Box>

    );
};

export default CreateCustomer;