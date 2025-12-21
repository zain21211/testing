// coa.jsx
import axios from 'axios';
import { Box } from '@mui/material';
import { useState, useEffect, useRef, use } from 'react';
import useWindowDimensions from './useWindowDimensions'; // Import the custom hook
import { useCamera } from './hooks/useCamera';
import ImagePreview from './components/ImagePreview';
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
    const { images, loading: imgLoading } = useCamera();
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
            setTableHeight(divHeight);
        }
    }, [containerRef]); // or any dependency you want to trigger recalculation

    useEffect(() => {
        console.log("this is the images", images)
    }, [images]);
    useEffect(() => {
        handleUpdate();
    }, []);

    // FUNCTIONS
    const handleUpdate = async () => {
        try {

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
                my: 2,
                height: { xs: '500vh', lg: '80vh' },
                overflow: 'hidden',
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                gap: { xs: 1, lg: 3 }, // reduce mobile gaps
            }}
        >
            {/* Left panel: CUSTOMER FORM */}
            <Box
                ref={containerRef}
                sx={{ width: { md: '40%' } }}>
                <CustomerForm
                    onCustomerCreated={handleUpdate}
                    accounts={names}
                    urdu={urdu}
                />
            </Box>

            {/* Right panel: CUSTOMER LIST */}
            {/* <Box > */}
            <Box sx={{ display: 'flex', flexDirection: 'column', width: { md: '56.5%' } }}>
                <Box sx={{ height: '55%', overflow: 'hidden', }}>
                    <CustomerList
                        customer={masterCustomerList}
                        onAccountDeleted={handleUpdate}
                        tableHeight={tableHeight}
                    />
                </Box>
                <Box sx={{ height: '45%', border: '1px solid black', mt: 1, display: { xs: 'none', lg: 'block' }, background: "#c5c5c5ff" }}>
                    <ImagePreview images={images} loading={imgLoading} />
                </Box>

            </Box>
        </Box >

    );
};

export default CreateCustomer;