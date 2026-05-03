import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import axios from "axios";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import isEqual from "lodash/isEqual";
import SignaturePad from "./SignaturePad";
import html2canvas from "html2canvas";
import SignatureCanvas from "react-signature-canvas";
import { useEntries } from "../../hooks/useEntries";
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
const url = import.meta.env.VITE_API_URL;

// MUI Components
import {
    Card,
    Container,
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    IconButton,
} from "@mui/material";
import { RemarkDialog } from "../../turnoverReport";
import { TraderCard } from "../../turnoverReport";
import { useFetchList } from "../../hooks/LoadForm/useFetchList";
import TransporterFilter from "../LoadForm/TransporterFilter";
import DeliveryContent from "./DeliveryContent";
import useGeolocation from "../../hooks/geolocation";
import { cleanNumbers, } from "../../utils/cleanString";
import { CloseOutlined, PhotoCamera, CloudUpload, Send, Check } from "@mui/icons-material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useVoucherSync } from "../../hooks/useVoucherSync";
import { useCamera } from "../../hooks/useCamera";
import useFetchCustImgs from "../../hooks/useFetchCustImg";
import ErrorCard from "../Card";
import CashDetails from "./CashDetails";
import EntriesDisplay from "./EntriesDisplay";
import { set } from "lodash";

const API_URL = import.meta.env.VITE_API_URL;

export const RemarkDialogUI = ({
    open,
    onClose,
    images,
    setIsTally,
    customer,
    error,
    setCustomer,
    handleNavigate,
    handleSubmit,
    content: Content,
    cash,
    handleChange,
}) => {
    const captureRef = useRef();
    const [manualImage, setManualImage] = useState(null);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const handleManualImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setManualImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
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
            name: "کل آن لائن",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "purple",
            backgroundColor: "#f3e5f5",
            disabled: true,
            val: customer.todayBRV || 0,
        },
        {
            name: "کل باقی بیلنس",
            col: 2,
            align: "right",
            pa: 1,
            frontsize: 14,
            color: "blue",
            backgroundColor: "#e8eaf6",
            disabled: true,
            val:
                (customer?.currentBalance - (cash?.[customer?.ACID] || 0) - (customer?.todayBRV || 0)).toFixed(0) ||
                "err",
        },
    ];
    const handleBillReset = async (id) => {
        const conformation = window.confirm('do you want to return the bill?');
        if (!conformation) return;
        setCustomer((prev) => {
            const newAmount = 0;
            const newCurrentBalance = prev.prevBalance; // reset to previous balance
            return {
                ...prev,
                amount: newAmount,
                currentBalance: newCurrentBalance,
            };
        });

        await axios.put(`${url}/invoices/return`, {
            id: customer.doc,
            status: 'return',
        });
    };

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
                    setIsTally={setIsTally}
                    error={error}
                    images={images}
                    name={customer.UrduName}
                    shopper={customer.shopper}
                    id={customer.ACID}
                    onReset={handleBillReset}
                    doc={customer.doc}
                    dialogFields={dialogFields}
                    captureRef={captureRef}
                    handleChange={handleChange}
                />
            </DialogContent>
            <DialogActions sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("order")}
                        color="primary"
                    >
                        Order
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("recovery")}
                        color="secondary"
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
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%' }}>
                    <Button 
                        component="label" 
                        variant="contained" 
                        color="info" 
                        startIcon={<CloudUploadIcon />}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {manualImage ? 'Image Selected' : 'Upload Image'}
                        <input type="file" hidden accept="image/*" onChange={handleManualImageUpload} />
                    </Button>
                    <Button
                        onClick={() => {
                            setCustomer(prev => ({ ...prev, entry: 'done' }));
                            handleSubmit(customer.ACID, customer.UrduName, customer.doc, captureRef, manualImage);
                        }}
                        disabled={
                            (Number(cash?.[customer?.ACID]) > 0 && !manualImage && !user?.username?.toLowerCase().includes("danish"))
                        }
                        color="success"
                        variant="contained"
                    >
                        Submit
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

// Fields to display on each trader card
const fields = ["ACID", "UrduName", "date"];

const DeliveryTraderCard = ({
    trader,
    fields,
    onClick,
    doneEntries,
    onImageSelect,
    selectedImage,
    onClickPreview,
    onSubmit,
    isSubmitting
}) => {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onImageSelect(trader.doc, reader.result, true); // keyed by doc (unique per invoice)
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card sx={{ 
            position: 'relative', 
            boxShadow: 3, 
            borderRadius: '12px', 
            overflow: 'hidden', 
            border: selectedImage ? '2px solid green' : '1px solid #eee',
            display: 'flex',
            flexDirection: 'column',
            transition: 'transform 0.2s',
            "&:hover": {
                transform: 'scale(1.01)',
                boxShadow: 6
            }
        }}>
            <TraderCard
                fields={fields}
                trader={trader}
                onClick={onClick}
                doneEntries={[]}
                sx={{ 
                    boxShadow: 'none', 
                    borderRadius: 0,
                    "&:hover": { transform: 'none', boxShadow: 'none' } 
                }}
            />
            {selectedImage && (
                <Box 
                    sx={{ 
                        position: 'absolute', 
                        top: 5, 
                        left: 5, 
                        width: 50, 
                        height: 50, 
                        borderRadius: 1, 
                        overflow: 'hidden', 
                        border: '2px solid white',
                        boxShadow: 2,
                        cursor: 'pointer',
                        zIndex: 3
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClickPreview(selectedImage);
                    }}
                >
                    <img src={selectedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
            )}
            
            <Box
                sx={{
                    display: 'flex',
                    gap: 1,
                    p: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderTop: '1px solid #eee',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    mt: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Nug (shopper) Display - Swapped order: Number on left, Label on right */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5, 
                    bgcolor: '#e0e0e0', 
                    px: 1.5, 
                    py: 1   , 
                    borderRadius: '20px',
                    border: '1px solid #ccc'
                }}>
                    <Typography sx={{ 
                        fontSize: "2rem", 
                        fontWeight: 'bold',
                        fontFamily: "poppins, sans-serif"
                    }}>
                        {trader.shopper || 0}
                    </Typography>
                    <Typography sx={{ 
                        fontFamily: "Jameel Noori Nastaleeq, serif", 
                        fontSize: "2.5rem",
                        lineHeight: 1,
                        fontWeight: 'bold',
                        // mt: 0.5
                    }}>
                        :نگ
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, justifyContent: 'flex-end' }}>
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <input
                        type="file"
                        hidden
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                    />

                    <Button
                        // size="medium"
                        variant="contained"
                        sx={{ minWidth: 100, px: 1, fontSize: "1.5rem" }}
                        startIcon={<CloudUpload />}
                        onClick={() => fileInputRef.current.click()}
                    >
                        Upload
                    </Button>
                    <Button
                        // size="small"
                        variant="contained"
                        sx={{ minWidth: 100, px: 1, fontSize: "1.5rem" }}
                        startIcon={<PhotoCamera />}
                        onClick={() => cameraInputRef.current.click()}
                    >
                        Camera
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        sx={{ minWidth: 100, px: 1, fontSize: "1.5rem" }}
                        disabled={!selectedImage || isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                        onClick={() => onSubmit(trader)}
                    >
                        {isSubmitting ? "..." : "Submit"}
                    </Button>
                </Box>
            </Box>

            {selectedImage && (
                <Typography
                    variant="caption"
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        bgcolor: 'success.main',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontWeight: 'bold',
                        zIndex: 2
                    }}
                >
                    ✔️ SELECTED
                </Typography>
            )}
        </Card>
    );
};

const DeliveryForm = () => {
    // --- DIALOG STATE ---
    const [isTally, setIsTally] = useState(true);
    const [entries, setEntries] = useLocalStorageState('DeliveryEntries', { defaultValue: [] });
    const [status, setStatus] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [cash, setCash] = useLocalStorageState('DeliveryCash', {});
    const [pendingEntries, setPendingEntries] = useLocalStorageState('pendingDeliveryEntries', { defaultValue: [] });
    const [doneEntries, setDoneEntries] = useLocalStorageState('DeliveryDoneEntries', { defaultValue: [] });
    const [searchParams, setSearchParams] = useSearchParams();
    const [cardImages, setCardImages] = useState({});
    const [submittingCards, setSubmittingCards] = useState({});
    
    // Cropper & Preview States
    const [cropSrc, setCropSrc] = useState(null);
    const [cropAcid, setCropAcid] = useState(null);
    const cropperRef = useRef(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewSrc, setPreviewSrc] = useState(null);

    // const captureRef = useRef();
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
    const { coordinates, address } = useGeolocation();
    const { addEntry } = useEntries();
    const [loading, setLoading] = useState(false);
    const [openDetails, setOpenDetails] = useState(false)
    const { images, setImages, handleImageChange, resetImages } = useCamera();
    const { loading: imgLoading } = useFetchCustImgs(selectedTrader?.ACID, handleImageChange, setImages, 'agreement');
    const {
        customers,
        setCustomers,
        loading: listLoading,
        error,
        fetchList,
        routes
    } = useFetchList("delivery");

    const handleChange = (id, val) => {
        const cleaned = cleanNumbers(val);
        const number = parseFloat(cleaned);
        setCash((prev) => ({
            ...prev,
            [id]: number,
        }));
    };

    // --- DIALOG HANDLERS ---
    const openDialog = useCallback((trader) => {
        setSelectedTrader(trader);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedTrader(null);
        // Clear search params when closing
        setSearchParams({}, { replace: true });
    }, [setSearchParams]);

    const handleCapture = async (captureRef) => {
        if (!captureRef || !captureRef.current) return null;
        const canvas = await html2canvas(captureRef.current);
        const data = canvas.toDataURL("image/png");
        return data;
    };

    const compressImage = (dataUrl, callback) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_SIZE = 800;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let quality = 0.7;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            while (compressedDataUrl.length > 135000 && quality > 0.2) {
                quality -= 0.1;
                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            callback(compressedDataUrl);
        };
    };

    const handleCardImageSelect = (doc, image, triggerCrop = false) => {
        if (triggerCrop) {
            setCropSrc(image);
            setCropAcid(doc);
        } else {
            setCardImages(prev => ({ ...prev, [doc]: image }));
        }
    };

    const handleCropSave = () => {
        if (typeof cropperRef.current?.cropper !== "undefined") {
            const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
            const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg');
            
            compressImage(croppedDataUrl, (compressedResult) => {
                setCardImages(prev => ({ ...prev, [cropAcid]: compressedResult })); // cropAcid now holds doc
                setCropSrc(null);
                setCropAcid(null);
            });
        }
    };

    const handleCardSubmit = async (trader) => {
        const image = cardImages[trader.doc]; // keyed by doc
        if (!image) return;

        setSubmittingCards(prev => ({ ...prev, [trader.doc]: true }));
        try {
            await handlePost(trader.ACID, trader.UrduName || trader.Subsidary, trader.doc, null, image);
            // Clear the image after successful submission
            setCardImages(prev => {
                const newState = { ...prev };
                delete newState[trader.doc];
                return newState;
            });
        } catch (error) {
            console.error("Submission failed:", error);
        } finally {
            setSubmittingCards(prev => ({ ...prev, [trader.ACID]: false }));
        }
    };

    const posting = async (newEntry, image) => {
        const img = image || newEntry.img;
        try {
            const coordinates = newEntry.coordinates;
            const address = newEntry.address;

            let finalDoc = newEntry.doc;

            if (newEntry.amounts) {
                const statusCash = await addEntry(newEntry, coordinates, address);

                if (!statusCash.success) {
                    setPendingEntries((prev) => {
                        const dummy = [...prev];
                        const obj = dummy.filter(e => e.id === newEntry.id);
                        if (obj.length === 0) {
                            dummy.push(newEntry);
                        }
                        return dummy;
                    });
                } else if (!finalDoc && statusCash.generatedDocs && statusCash.generatedDocs.length > 0) {
                    finalDoc = statusCash.generatedDocs[0];
                }
            }
            if (img) {
                await axios.post(`${url}/customers/createDeliveryImages`, {
                    img,
                    id: newEntry.id,
                    doc: finalDoc,
                    type: newEntry.doc ? 'sale' : 'crv',
                    status: newEntry.status ? 'tally' : 'diff',
                    date: newEntry.timestamp,
                });
            }

            if (newEntry.doc) {
                await axios.put(`${url}/invoices/deliveryList/update`, {
                    status: "delivered",
                    id: newEntry.doc,
                    username: user?.username,
                });
            }

        } catch (error) {
            setPendingEntries(prev => {
                const dummy = [...prev];
                const index = dummy.findIndex(e => e.id === newEntry.id);

                if (index !== -1) {
                    dummy[index] = { ...dummy[index], img };
                } else {
                    dummy.push({ ...newEntry, img });
                }

                return dummy;
            });
            throw error;
        }
    }

    useVoucherSync(pendingEntries, setPendingEntries, posting)

    const handlePost = useCallback(
        async (acid, name, doc, captureRef, manualImage) => {
            const amount = cash[acid] || 0;
            const isDanish = user?.username?.toLowerCase().includes("danish");

            if (amount > 0 && !manualImage && !isDanish) {
                alert("نقد رقم کے لیے تصویر لازمی ہے۔ (Image is compulsory for cash recovery)");
                return;
            }

            setLoading(true);
            const img = manualImage || (captureRef ? await handleCapture(captureRef) : null);

            const newEntry = {
                doc,
                name,
                address,
                id: acid,
                coordinates,
                status: isTally ? 'tally' : 'diff',
                timestamp: new Date().toISOString(),
                userName: user?.username || "Unknown User",
                amounts: {
                    cash: cash[acid],
                },
            };
            setEntries(prev => [...prev, newEntry])

            try {
                await posting(newEntry, img)
                console.log("saving done...")
                setDoneEntries(prev => {
                    // avoid duplicates
                    if (prev.includes(acid)) return prev;
                    return [...prev, acid];
                });
                console.log("saving doned")
                fetchList();
                setStatus(200);
            } catch (error) {
                console.error("Posting error:", error);
                setStatus(500);
            } finally {
                setLoading(false);
                closeDialog();
            }
        },
        [user.username, cash, address, coordinates, isTally, posting, fetchList, closeDialog, setEntries, setDoneEntries]
    );

    // Custom navigation handler to preserve dialog state
    const customHandleNavigate = useCallback((page) => {
        if (!selectedTrader) return;
        
        // 1. Update current URL with dialog state so "Back" button works
        setSearchParams({ 
            acid: selectedTrader.ACID, 
            openDialog: 'true' 
        }, { replace: true });

        // 2. Navigation logic is handled by useRemarkDialog in RemarkDialog
        // But we want to trigger it from here or let it happen.
        // Actually, we'll just let the RemarkDialog's default handleNavigate run,
        // but we've now updated the 'back' state.
    }, [selectedTrader, setSearchParams]);

    const remarkDialogUI = useCallback((
        images,
        customer,
        remark,
        setRemark,
        pastRemarks,
        error,
        acid,
        handleNavigate,
        handleSubmit,
        onClose,
        setIsTally,
        setCustomer
    ) => {
        return (
            <Box>
                <RemarkDialogUI
                    setIsTally={setIsTally}
                    setCustomer={setCustomer}
                    images={images}
                    open={open}
                    onClose={onClose}
                    acid={acid}
                    handleChange={handleChange}
                    customer={customer}
                    error={error}
                    handleNavigate={(page) => {
                        customHandleNavigate(page);
                        handleNavigate(page);
                    }}
                    handleSubmit={handleSubmit}
                    content={DeliveryContent}
                    cash={cash}
                ></RemarkDialogUI>
            </Box>
        );
    }, [cash, handleChange, handlePost, closeDialog, customHandleNavigate]);

    // Re-open dialog on mount/load if acid is in URL
    useEffect(() => {
        if (customers.length > 0 && searchParams.get('openDialog') === 'true') {
            const acid = searchParams.get('acid');
            const customer = customers.find(c => String(c.ACID) === String(acid));
            if (customer && !dialogOpen) {
                setSelectedTrader(customer);
                setDialogOpen(true);
            }
        }
    }, [customers, searchParams, dialogOpen]);

    // --- DATA & FILTERING STATE ---

    // --- DATA FETCHING ---

    useEffect(() => {
        fetchList();
    }, []);

    useEffect(() => {
        console.log('done entries ', doneEntries)
    }, [doneEntries]);


    useEffect(() => {
        if (status)
            setTimeout(() => {
                setStatus(null);
            }, 2000);
    }, [status]);




    // --- RENDER ---
    return (
        <Container sx={{ p: 0 }}>
            {/* {(userRoles.isAdmin || userRoles.isZain) && ( */}
                <TransporterFilter onFilterChange={fetchList} routes={routes} />
            {/* )} */}

            {/* <Box sx={{
                marginBottom: 2,
                position: 'sticky',
                overflow: 'auto',
                backgroundColor: 'white',
                top: 60, // 🟢 important for sticky to work
                zIndex: 50,
            }}>
                <Box sx={{
                    // display: 'flex',
                    gap: 2,
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    m: 1,
                    backgroundColor: 'transparent',
                }}>
                    <Button variant='contained' onClick={() => setOpenDetails(true)} sx={{
                        m: 1,
                    }}>
                        details
                    </Button>
                    <Box sx={{
                        backgroundColor: 'lightgrey',
                        p: 1,
                    }}>
                        <CashDetails open={openDetails} onClose={() => setOpenDetails(false)} cash={cash} setCash={setCash} />
                    </Box>


                </Box>
            </Box> */}

            {/* total entries details display */}
            {/* <EntriesDisplay open={openDetails} onClose={() => setOpenDetails(false)} entries={entries} setEntries={setEntries} setDoneEntries={setDoneEntries} /> */}

            {/* not found */}
            {customers.length === 0 && !listLoading && (
                <Box
                    sx={{
                        height: "69vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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

            <Box sx={{
                display: "grid",
                gridTemplateColumns: { xs: '1fr', sm: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 2,
                p: 1
            }}>
                {customers.map((customer) => (
                    <DeliveryTraderCard
                        key={customer.doc || `${customer.ACID}-${Math.random()}`}
                        trader={customer}
                        fields={fields}
                        onClick={() => openDialog(customer)}
                        doneEntries={doneEntries}
                        onImageSelect={handleCardImageSelect}
                        selectedImage={cardImages[customer.doc]}
                        onClickPreview={(src) => {
                            setPreviewSrc(src);
                            setPreviewOpen(true);
                        }}
                        onSubmit={handleCardSubmit}
                        isSubmitting={submittingCards[customer.doc]}
                    />
                ))}
            </Box>

            {/* Cropper Dialog */}
            <Dialog open={!!cropSrc} onClose={() => { setCropSrc(null); setCropAcid(null); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>Crop Image</DialogTitle>
                <DialogContent sx={{ p: 0, bgcolor: 'black', height: '60vh', display: 'flex', flexDirection: 'column' }}>
                    {cropSrc && (
                        <Cropper
                            src={cropSrc}
                            style={{ flexGrow: 1, width: '100%', maxHeight: '60vh' }}
                            initialAspectRatio={null}
                            guides={true}
                            ref={cropperRef}
                            viewMode={1}
                            background={false}
                            responsive={true}
                            autoCropArea={1}
                            checkOrientation={false}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'space-between', p: 2, bgcolor: '#f5f5f5' }}>
                    <Button variant="outlined" color="error" onClick={() => { setCropSrc(null); setCropAcid(null); }}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleCropSave} startIcon={<Check />}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: 'black', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                    <IconButton
                        onClick={() => setPreviewOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 1 }}
                    >
                        <CloseOutlined />
                    </IconButton>
                    {previewSrc && (
                        <img
                            src={previewSrc}
                            alt="Preview"
                            style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
            {/* {selectedTrader && (
                <RemarkDialog
                    images={images}
                    setIsTally={setIsTally}
                    open={dialogOpen}
                    onClose={closeDialog}
                    onRender={remarkDialogUI}
                    customer={selectedTrader}
                    acid={selectedTrader.ACID}
                    onSubmitRemark={handlePost}
                    setCustomer={setSelectedTrader}
                    name={selectedTrader.Subsidary || selectedTrader.UrduName}
                />
            )} */}
        </Container>
    );
};

export default DeliveryForm;
