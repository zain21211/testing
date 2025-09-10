import axios from "axios";
import React, { useRef, Suspense, useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Container, Paper, Box, Divider, Grid, Typography, Skeleton } from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useInvoice } from "./hooks/useInvoice";
import { usePackingFormState } from "./hooks/usePackingFormState";
import { useOrderCompletion } from "./hooks/useOrderCompletion";
import { useInvoiceLock } from "./hooks/useInvoiceLock";
import CustomerDetails from "./components/CustomerDetails";
import PackingNotes from "./components/PackingNotes";
import ProductTable from "./components/ProductTable";
import UpdateButton from "./components/UpdateButton";

const persons = ['zain']
const url = import.meta.env.VITE_API_URL;

const theme = createTheme({
    palette: {
        primary: { main: "#2d3436" },
        secondary: { main: "#0984e3" },
    },
    typography: {
        fontFamily: "Poppins, Arial, sans-serif",
    },
});

const PackingForm = ({ name = "ESTIMATE" }) => {
    const { id } = useParams();
    const navigator = useNavigate();
    const location = useLocation();
    const cameFromOrderPage = location.state?.fromOrderPage === true;
    const targetRef = useRef();

    const [isReady, setIsReady] = useState(false);
    const [empty, setEmpty] = useState(false);
    const [loading, setLoading] = useState(false);
    const user = JSON.parse(localStorage.getItem("user"));

    const { invoice, customer, products } = useInvoice(id);
    const {
        updatedInvoice,
        setUpdatedInvoice,
        updatedInvoices,
        setUpdatedInvoices,
        nug,
        person,
        updateQuantity,
        updateNug,
        updatePerson
    } = usePackingFormState(id);

    useOrderCompletion({
        id,
        customer,
        isReady,
        cameFromOrderPage,
        targetRef
    });

    const { handleUnlock } = useInvoiceLock(id);

    const nugRef = useRef(null);
    const packedByRef = useRef(null);

    useEffect(() => {
        if (products.length > 0) {
            setEmpty(false);
        } else {
            setEmpty(true);
        }
    }, [products]);

    useEffect(() => {
        if (!id) return;
        return () => {
            handleUpdate(); // unlock on mount
        };
    }, [id]);
    const handleUpdate = async () => {
        if (!updatedInvoices[id]) {
            alert("missing invoice data");
            return;
        }

        if (!nug) {
            nugRef.current?.focus();
            return;
        }

        if (!person) {
            packedByRef.current?.focus();
            return;
        }

        setLoading(true);

        try {
            const now = new Date();
            now.setHours(now.getHours() + 5);
            const time = now.toISOString().slice(0, 19).replace("T", " ");

            const body = {
                invoice: id,
                updatedInvoice: updatedInvoices[id],
                nug: nug,
                tallyBy: person,
                time,
                acid: customer?.Acid || "",
            };

            await axios.put(`${url}/invoices/${id}/update`, body);

            // Clear the updated invoices for this id
            setUpdatedInvoices(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });

            alert("Packing updated successfully");
            navigator("/pending");
        } catch (error) {
            alert(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Container disableGutters maxWidth="lg" sx={{ overflowX: "hidden", p: 0, mx: "auto" }}>
                <Paper elevation={3} sx={{ px: 0, m: 0, width: "100%" }}>
                    <Box ref={targetRef} sx={{ p: 1 }}>
                        <CustomerDetails customer={customer} />
                        <Divider sx={{ mb: 1 }} />

                        <Grid item xs={12} sx={{ marginTop: 3 }}>
                            <Suspense fallback={
                                <Box p={2}>
                                    <Skeleton height={30} width="90%" />
                                    <Skeleton height={30} width="70%" />
                                    <Skeleton height={30} width="80%" />
                                </Box>
                            }>
                                {empty ? (
                                    <Typography>not found</Typography>
                                ) : (
                                    <ProductTable
                                        products={products}
                                        updatedInvoice={updatedInvoice}
                                        onQuantityChange={updateQuantity}
                                        user={user}
                                        onLoad={() => setIsReady(true)}
                                    />
                                )}
                            </Suspense>
                        </Grid>

                        <PackingNotes
                            persons={persons}
                            nug={nug}
                            person={person}
                            onNugChange={updateNug}
                            onPersonChange={updatePerson}
                            nugRef={nugRef}
                            packedByRef={packedByRef}
                        />
                    </Box>

                    <UpdateButton loading={loading} onClick={handleUpdate} />
                </Paper>
            </Container>
        </ThemeProvider>
    );
};

export default PackingForm;