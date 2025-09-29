import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import isEqual from "lodash/isEqual";
import SignaturePad from "./SignaturePad";
import html2canvas from "html2canvas";
import SignatureCanvas from "react-signature-canvas";
import { useEntries } from "../../hooks/useEntries";
const url = import.meta.env.VITE_API_URL;

// MUI Components
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import { RemarkDialog } from "../../turnoverReport";
import { TraderCard } from "../../turnoverReport";
import { useFetchList } from "../../hooks/LoadForm/useFetchList";
import TransporterFilter from "../LoadForm/TransporterFilter";
import DeliveryContent from "./DeliveryContent";
import useGeolocation from "../../hooks/geolocation";
import { cleanNumbers, cleanString } from "../../utils/cleanString";

// Local Component Imports (assuming they are in the same directory or configured path)
// import DataTable from "./table";
const API_URL = import.meta.env.VITE_API_URL;

export const RemarkDialogUI = ({
    open,
    onClose,
    customer,
    error,
    handleNavigate,
    handleSubmit,
    content: Content,
    cash,
    handleChange,
}) => {
    const captureRef = useRef();
    const dialogFields = [
        { name: 'Prev Bal', col: 2, align: 'right', pa: 1, frontsize: 14, color: 'blue', backgroundColor: '#e8eaf6', disabled: true, val: customer.prevBalance },
        { name: 'Amount', col: 2, align: 'right', pa: 1, frontsize: 14, color: 'green', backgroundColor: '#e8f5e9', disabled: true, val: customer.amount },
        { name: 'Current Bal', col: 2, align: 'right', pa: 1, frontsize: 14, color: 'blue', backgroundColor: '#e8eaf6', disabled: true, val: customer.currentBalance },
        { name: 'Recovery', col: 2, align: 'right', pa: 1, frontsize: 14, color: 'red', backgroundColor: '#ffebee', disabled: false, val: cash },
        { name: 'remaining Bal', col: 2, align: 'right', pa: 1, frontsize: 14, color: 'blue', backgroundColor: '#e8eaf6', disabled: true, val: (customer.currentBalance - (cash || 0)) || "err" },
    ];

    const secondaryFields = [
        { name: 'Shopper', col: 2, align: 'left', pa: 1, frontsize: 14, color: 'teal', backgroundColor: '#e0f2f1', val: customer.shopper },
        { name: 'Name', col: 2, align: 'left', pa: 1, frontsize: 14, color: 'teal', backgroundColor: '#e0f2f1', val: customer.UrduName },
    ];
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Customer: {customer.UrduName}</DialogTitle>
            <DialogContent>
                <Content
                    error={error}
                    name={customer.UrduName}
                    shopper={customer.shopper}
                    dialogFields={dialogFields}
                    secondaryFields={secondaryFields}
                    captureRef={captureRef}
                    handleChange={handleChange}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                <Box>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("order")}
                        color="primary"
                        sx={{ mr: 1 }}
                    >
                        Order
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("recovery")}
                        color="secondary"
                        sx={{ mr: 1 }}
                    >
                        Recovery
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("ledger")}
                        color="warning"
                    >
                        Ledger
                    </Button>
                </Box>
                <Button onClick={() => { handleSubmit(616, captureRef) }} color="success" variant="contained">
                    Submit Remark
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Fields to display on each trader card
const fields = [
    "ACID",
    "UrduName",
];
const SPECIAL_FIELDS = [

];
const DeliveryForm = () => {
    // --- DIALOG STATE ---
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [cash, setCash] = useState(0)
    const captureRef = useRef();
    const { coordinates, address } = useGeolocation();
    const { addEntry } = useEntries();
    const handleChange = (val) => {
        const cleaned = cleanNumbers(val);
        const number = parseFloat(cleaned)
        setCash(number);
    }
    const remarkDialogUI = (customer, remark, setRemark, pastRemarks, error, acid, handleNavigate, handleSubmit, onClose,) => {
        return (
            <Box>
                <RemarkDialogUI
                    open={open}
                    onClose={onClose}
                    acid={acid}
                    handleChange={handleChange}
                    customer={customer}
                    error={error}
                    handleNavigate={handleNavigate}
                    handleSubmit={handleSubmit}
                    content={DeliveryContent}
                    cash={cash}
                >
                </RemarkDialogUI>
            </Box>
        )
    }
    // --- USER & ROLES ---
    const user = useMemo(
        () => JSON.parse(localStorage.getItem("user") || "{}"),
        []
    );
    const userRoles = useMemo(
        () => ({
            isZain: user?.username?.toLowerCase().includes("zain"),
            isAdmin: user?.userType?.toLowerCase().includes("admin"),
            isClassic: user?.userType?.toLowerCase().includes("clas"),
        }),
        [user]
    );

    // --- DATA & FILTERING STATE ---
    const [turnoverData, setTurnoverData] = useLocalStorageState("turnoverData", {
        defaultValue: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [params, setParams] = useState({
        route: "",
        spo: userRoles.isAdmin || userRoles.isZain ? "" : user.username,
        date: new Date().toISOString().split("T")[0],
        nameFilter: "",
        statusFilter: "Pending",
    });

    // --- DATA FETCHING ---
    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/turnover`, {
                params: {
                    route: params.route,
                    spo: params.spo,
                    date: new Date(params.date),
                    company: userRoles.isClassic ? "classic" : "",
                },
            });
            if (!isEqual(turnoverData, res.data)) {
                setTurnoverData(res.data);
            }
        } catch (error) {
            console.error("Error fetching turnover data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        params.route,
        params.spo,
        params.date,
        userRoles.isClassic,
        turnoverData,
        setTurnoverData,
    ]);

    const handleCapture = async (captureRef) => {
        if (!captureRef.current) return;
        const canvas = await html2canvas(captureRef.current);
        const data = canvas.toDataURL("image/png");
        return data;
    }

    const handlePost = useCallback(
        async (acid, captureRef) => {
            const img = await handleCapture(captureRef);
            const newEntry = {
                id: acid,
                amounts: {
                    cash,
                },
                userName: user?.username || 'Unknown User',
                timestamp: new Date().toISOString(),
            };

            console.log('posting cash...');
            await addEntry(newEntry, coordinates, address);

            console.log('posting img...');

            await axios.post(`${url}/customers/createDeliveryImages`, {
                acid,
                img,
            })
            fetchReport(); // Re-fetch data to reflect changes
        },
        [user.username, fetchReport]
    );

    useEffect(() => {
        if (!dialogOpen) {
            fetchReport();
        }
    }, [dialogOpen]); // Refetch when dialog closes

    // --- DIALOG HANDLERS ---
    const openDialog = useCallback((trader) => {
        setSelectedTrader(trader);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedTrader(null);
    }, []);
    const { customers, loading, error, fetchList } = useFetchList('delivery');

    // --- RENDER ---
    return (
        <Container sx={{ p: 0 }}>

            <TransporterFilter onFilterChange={fetchList} />

            <Box sx={{ display: "grid", gap: 3, mb: "10rem" }}>
                {customers.map((customer) => (
                    <TraderCard
                        key={customers.acid}
                        fields={fields}
                        trader={customer}
                        onClick={() => openDialog(customer)}
                    />
                ))}
            </Box>
            {selectedTrader && (
                <RemarkDialog
                    open={dialogOpen}
                    onClose={closeDialog}
                    acid={selectedTrader.ACID}
                    customer={selectedTrader}
                    name={selectedTrader.Subsidary || selectedTrader.UrduName}
                    onSubmitRemark={handlePost}
                    onRender={remarkDialogUI}
                />
            )}
        </Container>
    );
};

export default DeliveryForm;