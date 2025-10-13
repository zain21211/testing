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
import { cleanNumbers, } from "../../utils/cleanString";
import { CloseOutlined } from "@mui/icons-material";
import { useVoucherSync } from "../../hooks/useVoucherSync";
import { useCamera } from "../../hooks/useCamera";
import useFetchCustImgs from "../../hooks/useFetchCustImg";
import Card from "../Card";

const API_URL = import.meta.env.VITE_API_URL;

export const RemarkDialogUI = ({
    open,
    onClose,
    images,
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
            name: "پچھلا بیلنس",
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
            name: "بل کی رقم",
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
            name: "موجودہ بیلنس",
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
            name: "نقد رقم کی ادائیگی",
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
            name: "باقی بل",
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
                    images={images}
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
const fields = ["ACID", "UrduName", 'shopper'];

const DeliveryForm = () => {
    // --- DIALOG STATE ---
    const [status, setStatus] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [cash, setCash] = useState({});
    const [pendingEntries, setPendingEntries] = useLocalStorageState('pendingDeliveryEntries', { defaultValue: [] });
    // const captureRef = useRef();
    const [loading, setLoading] = useState(false);
    const { coordinates, address } = useGeolocation();
    const { addEntry } = useEntries();
    const [secondaryFields, setSecondaryFields] = useState([]);
    const [extra, setExtra] = useState({}); // for Extra recovery fields

    const { images, setImages, handleImageChange, resetImages } = useCamera();
    const { loading: imgLoading } = useFetchCustImgs(selectedTrader?.ACID, handleImageChange, setImages, 'agreement');

    const posting = async (newEntry, image) => {
        const img = image || newEntry.img;
        try {
            const coordinates = newEntry.coordinates;
            const address = newEntry.address;

            if (newEntry.amounts) {
                const statusCash = await addEntry(newEntry, coordinates, address);

                if (!statusCash) {
                    setPendingEntries((prev) => {
                        const dummy = [...prev];
                        const obj = dummy.filter(e => e.id === newEntry.id);
                        if (obj.length === 0) {
                            dummy.push(newEntry);
                        }
                        return dummy;
                    });
                }
            }
            if (image) {
                await axios.post(`${url}/customers/createDeliveryImages`, {
                    acid: newEntry.id,
                    img,
                });
            }

            await axios.put(`${url}/invoices/deliveryList/update`, {
                status: "delivered",
                id: newEntry.doc,
            });

        } catch (error) {
            setPendingEntries(prev => {
                const dummy = [...prev];
                const index = dummy.findIndex(e => e.id === newEntry.id);

                if (index !== -1) {
                    dummy[index] = { ...dummy[index], img };
                } else {
                    dummy.push({ id: acid, img });
                }

                return dummy;
            });
            throw error;
        }
    }
    useVoucherSync(pendingEntries, setPendingEntries, posting)

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
        images,
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
                    images={images}
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

    const handlePost = useCallback(
        async (acid, doc, captureRef) => {
            setLoading(true);

            const img = await handleCapture(captureRef);

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

            try {
                await posting(newEntry, img)

                fetchList();
                setStatus(200);
                setExtra({})
                setSecondaryFields([])
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
                    <Card text={"posted"} code={status} color={status === 200 ? "green" : "red"} />
                </Box>
            )}

            <Box sx={{ display: listLoading ? "none" : "grid", gap: 3, mb: "10rem" }}>
                {customers.map((customer) => (
                    <TraderCard
                        fields={fields}
                        trader={customer}
                        key={customers.acid}
                        onClick={() => openDialog(customer)}
                    />
                ))}
            </Box>
            {selectedTrader && (
                <RemarkDialog
                    images={images}
                    open={dialogOpen}
                    onClose={closeDialog}
                    onRender={remarkDialogUI}
                    customer={selectedTrader}
                    acid={selectedTrader.ACID}
                    onSubmitRemark={handlePost}
                    name={selectedTrader.Subsidary || selectedTrader.UrduName}
                />
            )}
        </Container>
    );
};

export default DeliveryForm;
