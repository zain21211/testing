// src/components/InactiveItemsTable.jsx
import React, { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useInactiveItems } from "../hooks/useInactiveItems";
// import { fontWeight } from "html2canvas/dist/types/css/property-descriptors/font-weight";

const InactiveItemsTable = ({ acid, company = "fit-o%", fromDate = "2024-01-01", days = 30, handleRowClick }) => {
    const { items, loading, error } = useInactiveItems({ acid, company, fromDate, days });
    const columns = [
        {
            flex: 0.5,               // takes a little space compared to others
            field: "DOC",
            minWidth: 70,
            align: "center",
            headerName: "دن",
            headerAlign: "center",
            renderCell: (params) => (
                <strong>{params.value}</strong>
            ),
            renderHeader: () => (
                <strong style={{ fontFamily: "Jameel Noori Nastaleeq, serif", fontSize: '1.8rem' }}>
                    دن
                </strong>
            ),
        },
        {
            flex: 2,                   // takes more space, grows when possible
            minWidth: 300,
            field: "Product",
            headerName: "Product Name",
            renderCell: (param) => (
                <strong style={{ fontFamily: "Jameel Noori Nastaleeq, serif", fontSize: '1.4rem' }}>
                    {param.value}
                </strong>
            )
        },
        {
            flex: 1,
            minWidth: 110,
            field: "LODate",
            headerName: "Date",
        },
        {
            flex: 0.7,
            minWidth: 80,
            field: "QTY",
            align: "right",
            headerAlign: "right",
            headerName: "Qty",
            renderCell: (params) => (
                <strong style={{ fontSize: "1.2rem" }}>{params.value}</strong>
            )
        },
    ];



    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (

        <Box sx={{
            height: 250, width: "100%",
            marginBottom: 2,

        }}>

            <DataGrid
                rows={items.map((item, idx) => ({
                    id: idx + 1,
                    ...item,
                }))}
                columns={columns}
                disableRowSelectionOnClick
                hideFooter
                onRowDoubleClick={(params) => {
                    handleRowClick(params.row.PRID)
                    // Example: alert product name
                }}
                sx={{
                    backgroundColor: "#ffe600ff",
                    border: "2px solid black",
                    "& .MuiDataGrid-cell": {
                        border: "1px solid black",
                        fontSize: "1rem"
                    },
                    // ✅ force header background
                    "& .MuiDataGrid-columnHeaders": {
                        // borderBottom: "2px solid black",
                        backgroundColor: "black !important",  // <-- needs !important in v5
                        // fontWeight: "bold",
                    },

                    "& .MuiDataGrid-columnHeader": {
                        backgroundColor: "black !important",  // <-- needs !important in v5
                        color: "white",
                        fontWeight: "bold!important",
                        fontSize: '1.3rem'
                    },
                    "& .MuiDataGrid-columnHeaderTitle": {
                        fontWeight: "bold",   // ✅ applies directly to header text
                    },
                    "& .MuiDataGrid-row": {
                        borderBottom: "1px solid black"
                    },
                    "& .MuiDataGrid-row:nth-of-type(odd)": {
                        // backgroundColor: "#f9f9f9",
                    }

                }}

            />

        </Box>

    );
};

export default InactiveItemsTable;
