import React, { useCallback, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
// Import useNavigate from react-router-dom
import { useNavigate, useLocation } from "react-router-dom";
import { Typography } from "@mui/material"; // For consistent styling
import Skeleton from "@mui/material/Skeleton";


// Add isLedgerTable prop (defaults to false)
const DataTable = ({
  data = [],
  columns = [],
  rowKey,
  onDelete,
  apiEndpoint,
  isLedgerTable = false,
  handleDoubleClick,
}) => {
  // console.log("tavle rerender")
  const navigate = useNavigate(); // Initialize the navigate function

  const deleteColumn = columns.find((col) => col.id === "delete");
  const enableDelete = !!(deleteColumn && onDelete && apiEndpoint && rowKey);
  // alert(toString(data[0]))
  // alert(data[0].toString());
  // alert(JSON.stringify(data[2], null, 2)); // Pretty format
  // alert(data[2].Type); // Pretty format


  const visibleColumns = columns;

  function formatDate(value) {
    const date = new Date(value); // convert input to Date
    const day = String(date.getDate()).padStart(2, "0"); // get day and pad with 0 if needed
    const month = String(date.getMonth() + 1).padStart(2, "0"); // get month (0-based) +1 and pad
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  }
  // useEffect(() => {
  //   let lastTouchEnd = 0;

  //   const handleTouchEnd = (event) => {
  //     const now = new Date().getTime();
  //     if (now - lastTouchEnd <= 300) {
  //       event.preventDefault();
  //     }
  //     lastTouchEnd = now;
  //   };

  //   document.addEventListener("touchend", handleTouchEnd, false);

  //   return () => {
  //     document.removeEventListener("touchend", handleTouchEnd);
  //   };
  // }, []);

  const handleDelete = useCallback(
    async (id) => {
      // ... (handleDelete logic remains the same) ...
      if (!enableDelete || !id) {
        console.warn(
          "Delete cancelled: Delete functionality not fully configured or ID missing."
        );
        return;
      }
      if (window.confirm("Are you sure you want to delete this item?")) {
        try {
          const deleteUrl = `http://localhost:3001/${apiEndpoint}/${id}`;
          console.log(`Attempting DELETE: ${deleteUrl}`);
          await axios.delete(deleteUrl);
          onDelete(id);
          console.log("Delete successful for ID:", id);
        } catch (error) {
          console.error("Error deleting item:", error);
          const errorMsg =
            error.response?.data?.message ||
            "Failed to delete item. Please check server logs.";
          alert(`Delete failed: ${errorMsg}`);
        }
      }
    },
    [enableDelete, onDelete, apiEndpoint]
  ); // Removed rowKey from here as it's not directly used by handleDelete

  const tableData = Array.isArray(data) ? data : [];

  const handleDocumentClick = (docNo) => {
    if (docNo) {
      // Adjust your route structure as needed
      const url = isLedgerTable ? `/invoice/${docNo}` : `/pack/${docNo}`;
      navigate(url);
    }
  };

  return (
    <Paper
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: "7px",
        padding: 0,
        fontSize: "2rem"
      }}
    >
      <TableContainer sx={{ maxHeight: "auto" }}>
        <Table
          stickyHeader
          aria-label="sticky table"
          sx={{
            fontFamily: '"Times New Roman", Times, serif',
            borderCollapse: "collapse",
            border: "1px solid #ddd",
            minWidth: columns.reduce(
              (sum, col) =>
                sum + (col.minWidth || (col.id === "narration" ? 200 : 100)),
              0
            ),
          }}
        >
          <TableHead>
            <TableRow>
              {visibleColumns.map(
                (column) =>

                  (column.id !== "delete" || enableDelete) && (
                    <TableCell
                      key={column.id}
                      align={column.align || "center"}
                      sx={{
                        minWidth:
                          column.minWidth ||
                          (column.id === "narration" ? 200 : 100),
                        width: column.width,
                        fontSize: { xs: "1rem", sm: "1.3rem" },
                        textAlign: "center",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        color: "#fff",
                        backgroundColor: "rgba(24, 24, 24, 0.85)",
                        border: "2px solid #ddd",
                        padding: "8px 10px",
                        // borderRadius: "8px",
                        boxSizing: "border-box",
                      }}
                    >
                      {(column.label.includes("Amo") || column.label.includes("Rate")) ? column.id : column.label}
                    </TableCell>
                  )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumns.length}
                  align="center"
                  sx={{ py: 5 }}
                >
                  <Skeleton height={30} width="80%" />
                </TableCell>
              </TableRow>
            ) : (
              tableData.map((row, index) => {
                const rowId = rowKey ? row[rowKey] : null;
                const rowDate = new Date(row.date);
                const today = new Date();
                // console.log("value", value)

                // Normalize both dates to midnight
                rowDate.setHours(0, 0, 0, 0);
                today.setHours(0, 0, 0, 0);

                // Calculate the difference in days
                const oneDayInMs = 24 * 60 * 60 * 1000;
                const dayDiff = (today - rowDate) / oneDayInMs;

                const delayed = dayDiff >= 1;

                // console.log(row)
                const shouldHighlightRow =
                  Object.entries(row).some(([key, val]) => {
                    const isEstimateOrPending =
                      typeof val === "string" &&
                      isLedgerTable &&
                      (val.toLowerCase() === "estimate" || val.toLowerCase().includes("pending"));

                    const isFullDiscount =
                      key.toLowerCase().includes("dis") &&
                      typeof val === "number" &&
                      val === 100;

                    return isEstimateOrPending || isFullDiscount;
                  }) || delayed;


                let lastTap = 0;
                return (
                  <TableRow
                    hover
                    // onTouchEnd={(e) => {
                    //   const now = new Date().getTime();
                    //   if (now - lastTap < 300) {
                    //     // It's a double-tap!
                    //     e.preventDefault(); // optional, might help prevent ghost click
                    //     if (handleDoubleClick)
                    //       handleDoubleClick(row.prid, row.psid, row.TQ);
                    //   }
                    //   lastTap = now;
                    // }}
                    sx={{
                      touchAction: "manipulation", // ⛔ Prevents double-tap zoom
                      userSelect: "none",
                      backgroundColor:
                        row.status === "pending"
                          ? "yellow" : row.claimStatus === 1 ? "rgb(211, 211, 211)"
                            : shouldHighlightRow
                              ? "red"
                              : "white",
                      "& td": {
                        color:
                          row.status === "pending"
                            ? "black !important"
                            : shouldHighlightRow
                              ? "white"
                              : "inherit",
                      },
                      color:
                        row.status === "pending"
                          ? "black!important"
                          : shouldHighlightRow
                            ? "white"
                            : "inherit",
                      transition: "background-color 0.3s ease, color 0.3s ease",
                      "&:hover": {
                        backgroundColor: shouldHighlightRow
                          ? "rgba(24, 24, 24, 0.85)!important"
                          : "rgba(189, 236, 252, 1)!important",
                        color:
                          row.status === "pending"
                            ? "white!important"
                            : shouldHighlightRow
                              ? "white"
                              : "inherit",
                        "& td": {
                          color:
                            row.status === "pending"
                              ? "white !important"
                              : shouldHighlightRow
                                ? "white"
                                : "inherit",
                        },
                      },
                    }}
                    role="checkbox"
                    tabIndex={-1}
                    key={rowId || index}
                  >
                    {visibleColumns.map((column) => {
                      if (column.id === "delete" && !enableDelete) return null;
                      // console.table(row)
                      const value = row[column.id]; // Use column.id to get value
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align || "center"}
                          sx={{
                            border: "2px solid #000",
                            color: shouldHighlightRow ? "white !important" : "black",
                            fontWeight: "bold",
                            // fontWeight: shouldHighlightRow ? "bold" : "normal",
                            padding: "4px",
                            letterSpacing: "normal",
                            textTransform: "uppercase",
                            minWidth:
                              column.minWidth ||
                              (column.id === "narration" ? 200 : 100),
                            boxSizing: "border-box",
                            fontSize: column.label.includes("ust")
                              ? { xs: "2.5rem", sm: "2.5rem" }
                              : { xs: "1.1rem", sm: "1.2rem" },
                            fontFamily: 'Jameel Noori Nastaleeq, serif !important',
                          }}
                        >
                          {
                            (column?.id?.toLowerCase().includes("doc") &&
                              row.Type?.toLowerCase().includes("sale")) &&
                              value ? (
                              <Typography
                                onClick={() => handleDocumentClick(value)} // Call handler on click
                                sx={{
                                  color: row.status === "pending" ? "black" : (column?.id?.toLowerCase().includes("doc") && shouldHighlightRow) ? "white" : "primary.main",
                                  fontWeight: "bold",
                                  fontSize: "1.2rem",
                                  textDecoration: "none",
                                  "&:hover": {
                                    textDecoration: "underline",
                                    color: row.status === "pending" ? "white!important" : ""
                                  },
                                  cursor: "pointer", // Make it look clickable
                                }}
                              >
                                {value}
                              </Typography>
                            ) : isLedgerTable &&
                              column?.id?.toLowerCase() === "date" ? (
                              formatDate(value)
                            ) : column.id === "delete" && enableDelete ? (
                              <IconButton
                                onClick={() => handleDelete(rowId)}
                                disabled={!rowId}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            ) : column.render ? (
                              column.render(value, row)
                            ) : (
                              value
                            )
                          }
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default React.memo(DataTable);
