import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
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
import Card from "../Card";
import { Close, CloseOutlined, ContactSupportOutlined } from "@mui/icons-material";
import { set } from "lodash";

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
    secondaryFields,
    handleRadioChange,
    extra,
    handleChange,
}) => {
    const captureRef = useRef();
    const dialogFields = [
        {
            name: "Prev Bal",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "blue",
            backgroundColor: "#e8eaf6",
            disabled: true,
            val: customer.prevBalance,
        },
        {
            name: "Bill Amount",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "green",
            backgroundColor: "#e8f5e9",
            disabled: true,
            val: customer.amount,
        },
        {
            name: "Current Bal",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "blue",
            backgroundColor: "#e8eaf6",
            disabled: true,
            val: customer.currentBalance,
        },
        {
            name: "Cash Recovery",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "red",
            backgroundColor: "#ffebee",
            disabled: false,
            val: cash,
        },
        {
            name: "remaining Bal",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "blue",
            backgroundColor: "#e8eaf6",
            disabled: true,
            val:
                (customer.currentBalance - (cash[customer.ACID] || 0)).toFixed(0) ||
                "err",
        },
    ];
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Typography>Customer: {customer.UrduName}</Typography>
                    <Button onClick={onClose}><CloseOutlined /></Button>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Content
                    error={error}
                    name={customer.UrduName}
                    shopper={customer.shopper}
                    id={customer.ACID}
                    doc={customer.doc}
                    dialogFields={dialogFields}
                    extra={extra}
                    handleRadioChange={handleRadioChange}
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
                <Button
                    onClick={() => {
                        handleSubmit(customer.ACID, customer.doc, captureRef);
                    }}
                    color="success"
                    variant="contained"
                >
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Fields to display on each trader card
const fields = ["ACID", "UrduName"];
const SPECIAL_FIELDS = [];
const DeliveryForm = () => {
    // --- DIALOG STATE ---
    const [status, setStatus] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [cash, setCash] = useState({});
    const [pendingEntries, setPendingEntries] = useLocalStorageState('pendingDeliveryEntries', []);
    // const captureRef = useRef();
    const [loading, setLoading] = useState(false);
    const { coordinates, address } = useGeolocation();
    const { addEntry } = useEntries();
    const [secondaryFields, setSecondaryFields] = useState([]);
    const [extra, setExtra] = useState({
    }); // for Extra recovery fields

    useEffect(() => {
        console.log('Pending Entries:', pendingEntries);
    }, [pendingEntries]);

    const updateExtra = (label, id, val) => {
        const cleaned = cleanNumbers(val);
        const number = parseFloat(cleaned);
        setExtra((prev) => {
            const updated = { ...prev, [label.trim()]: number };
            console.log("Updated:", label, id, val);
            return updated;
        });
    };

    const handleRadioChange = (label) => {
        setSecondaryFields((prev) =>
            prev.some((item) => item.name === label) // check by name
                ? prev.filter((item) => item.name !== label) // remove if exists
                : [
                    ...prev,
                    {
                        name: label,
                        col: 2,
                        align: "left",
                        pa: 1,
                        frontsize: 14,
                        color: "teal",
                        backgroundColor: "#e0f2f1",
                        val: extra[label] || 0,
                        handleChange: (id, val) => updateExtra(label, id, val),
                    },
                ]
        );
    };

    const handleChange = (id, val) => {
        const cleaned = cleanNumbers(val);
        const number = parseFloat(cleaned);
        setCash((prev) => ({
            ...prev,
            [id]: number,
        }));
    };

    const remarkDialogUI = (
        customer,
        remark,
        setRemark,
        pastRemarks,
        error,
        acid,
        handleNavigate,
        handleSubmit,
        onClose
    ) => {
        return (
            <Box>
                <RemarkDialogUI
                    open={open}
                    onClose={onClose}
                    acid={acid}
                    handleChange={handleChange}
                    customer={customer}
                    error={error}
                    extra={extra}
                    secondaryFields={secondaryFields}
                    handleRadioChange={handleRadioChange}
                    handleNavigate={handleNavigate}
                    handleSubmit={handleSubmit}
                    content={DeliveryContent}
                    cash={cash}
                ></RemarkDialogUI>
            </Box>
        );
    };

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

    // --- DATA FETCHING ---
    const handleCapture = async (captureRef) => {
        if (!captureRef.current) return;
        const canvas = await html2canvas(captureRef.current);
        const data = canvas.toDataURL("image/png");
        return data;
    };

    const posting = async (newEntry, img) => {
        let entry = {};
        try {
            const coordinates = newEntry.coordinates;
            const address = newEntry.address;

            const statusCash = await addEntry(newEntry, coordinates, address);

            if (!statusCash) {
                entry[newEntry.id] = { ...newEntry };
                setPendingEntries((prev) => [...prev, newEntry]);
                localStorage.removeItem('pendingDeliveryEntry');
            } else {
                throw error("Failed to post cash entry");
            }

            const { status: statusImg } = await axios.post(`${url}/customers/createDeliveryImages`, {
                acid: newEntry.id,
                img,
            });

            if (statusImg !== 200 || statusImg !== 201) {
                setPendingEntries(prev => ({
                    ...prev,
                    [newEntry.id]: { ...(prev[newEntry.id] || {}), img },
                }));

            }
            localStorage.removeItem('pendingDeliveryImages');

            await axios.put(`${url}/invoices/deliveryList/update`, {
                status: "delivered",
                id: newEntry.doc,
            });
        } catch (error) {
            console.error(error);
            console.error(error.message);
            throw error;
        }
    }

    const handlePost = useCallback(
        async (acid, doc, captureRef) => {
            setLoading(true);

            const img = await handleCapture(captureRef);

            const pendingDeliveryImages = JSON.parse(localStorage.getItem('pendingDeliveryIamges') || "[]");
            pendingDeliveryImages.push({ img, acid });
            localStorage.setItem('pendingDeliveryImages', JSON.stringify(pendingDeliveryImages));

            const newEntry = {
                id: acid,
                amounts: {
                    cash: cash[acid],
                    ...extra,
                },
                userName: user?.username || "Unknown User",
                timestamp: new Date().toISOString(),
                coordinates,
                address,
                doc
            };

            const pendingDeliveryEntry = JSON.parse(localStorage.getItem('pendingDeliveryEntry') || "[]");
            pendingDeliveryEntry.push(newEntry);
            localStorage.setItem('pendingDeliveryEntry', JSON.stringify(pendingDeliveryEntry));

            try {
                // await addEntry(newEntry, coordinates, address);

                // await axios.post(`${url}/customers/createDeliveryImages`, {
                //     acid,
                //     img,
                // });

                // await axios.put(`${url}/invoices/deliveryList/update`, {
                //     status: "delivered",
                //     id: doc,
                // });
                console.log('posting the entry with', newEntry, typeof img)

                await posting(newEntry, img)

                fetchList();
                setStatus(800);
                setSecondaryFields([])
                // setExtra({})
            } catch (error) {
                console.error("Posting error:", error);
                setStatus(500);
            } finally {
                setLoading(false);
                closeDialog();
            }
        },
        [user.username, cash]
    );

    useEffect(() => {
        fetchList();
    }, []);

    useEffect(() => {
        if (status)
            setTimeout(() => {
                setStatus(null);
            }, 2000);
    }, [status]);

    // useEffect(() => {
    //     if (!dialogOpen) {
    //         fetchList();
    //     }
    // }, [dialogOpen]); // Refetch when dialog closes

    // --- DIALOG HANDLERS ---
    const openDialog = useCallback((trader) => {
        setSelectedTrader(trader);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedTrader(null);
    }, []);
    const {
        customers,
        loading: listLoading,
        error,
        fetchList,
        routes
    } = useFetchList("delivery");

    // --- RENDER ---
    return (
        <Container sx={{ p: 0 }}>
            <Box
                sx={{
                    // display: userRoles.isAdmin || userRoles.isZain ? "block" : "none",
                    m: 2,
                }}
            >
                <TransporterFilter onFilterChange={fetchList} routes={routes} />
            </Box>

            {/* not found */}
            {customers.length === 0 && !listLoading && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "69vh",
                    }}
                >
                    <Card text={"no customer found"} code={404} color="grey" />
                </Box>
            )}

            {/* while list loading */}
            {listLoading && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "69vh",
                    }}
                >
                    <Card
                        text={"your content is loading ..."}
                        code={"Loading"}
                        color="darkblue"
                    />
                </Box>
            )}

            {/* while list loading */}
            {status && !(customers.length === 0 || listLoading) && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        // height: '69vh'
                    }}
                >
                    <Card text={"posted"} code={status} color="green" />
                </Box>
            )}

            <Box sx={{ display: listLoading ? "none" : "grid", gap: 3, mb: "10rem" }}>
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
