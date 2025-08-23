import React, { useCallback, forwardRef } from "react";
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
import { useNavigate } from "react-router-dom";
import { Typography, useTheme, useMediaQuery } from "@mui/material"; // Import useTheme and useMediaQuery
import Skeleton from "@mui/material/Skeleton";
import { FixedSizeList } from 'react-window';

// --- Helper Components & Hooks ---

// 1. innerElementType for react-window
const InnerElementType = forwardRef(({ style, ...rest }, ref) => (
  <div ref={ref} style={style} {...rest} />
));

// 2. Custom hook to get the current MUI breakpoint string (e.g., 'xs', 'sm', 'md')
// This is the reliable way to detect the active breakpoint.
function useWidth() {
  const theme = useTheme();
  // Get breakpoint keys and reverse them to check from largest to smallest
  const keys = [...theme.breakpoints.keys].reverse();
  return (
    keys.reduce((output, key) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const matches = useMediaQuery(theme.breakpoints.up(key));
      return !output && matches ? key : output;
    }, null) || 'xs'
  );
}

// 3. Helper to get the single pixel width based on the current breakpoint.
// This is ONLY used for the virtualized table.
const getResolvedWidth = (minWidth, currentBreakpoint) => {
  // If minWidth is just a number, return it.
  if (typeof minWidth === 'number') { return minWidth; }

  // If minWidth is a responsive object, find the correct value.
  if (typeof minWidth === 'object' && minWidth !== null) {
    const breakpointOrder = ['xl', 'lg', 'md', 'sm', 'xs'];
    const startIndex = breakpointOrder.indexOf(currentBreakpoint);

    // Find the most specific width for the current screen size or smaller
    for (let i = startIndex; i < breakpointOrder.length; i++) {
      const bp = breakpointOrder[i];
      if (minWidth[bp] !== undefined) {
        return minWidth[bp];
      }
    }
  }
  return 100; // Default fallback width
};


// --- Main DataTable Component ---

const DataTable = ({
  data = [],
  columns = [],
  rowKey,
  onDelete,
  apiEndpoint,
  isLedgerTable = false,
  usage = '',
  handleDoubleClick,
  tableHeight = 500,
}) => {
  const navigate = useNavigate();
  const currentBreakpoint = useWidth(); // Get the current breakpoint ('xs', 'sm', etc.)
  const tableData = Array.isArray(data) ? data : [];

  const deleteColumn = columns.find((col) => col.id === "delete");
  const enableDelete = !!(deleteColumn && onDelete && apiEndpoint && rowKey);

  const visibleColumns = columns;

  function formatDate(value) {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const handleDelete = useCallback(
    async (id) => {
      if (!enableDelete || !id) { return; }
      if (window.confirm("Are you sure you want to delete this item?")) {
        try {
          const deleteUrl = `http://localhost:3001/${apiEndpoint}/${id}`;
          await axios.delete(deleteUrl);
          onDelete(id);
        } catch (error) {
          console.error("Error deleting item:", error);
          const errorMsg = error.response?.data?.message || "Failed to delete item.";
          alert(`Delete failed: ${errorMsg}`);
        }
      }
    },
    [enableDelete, onDelete, apiEndpoint]
  );

  const handleDocumentClick = (docNo) => {
    if (docNo) {
      const url = isLedgerTable ? `/invoice/${docNo}` : `/pack/${docNo}`;
      navigate(url);
    }
  };

  const renderRowCells = (row, shouldHighlightRow) => {
    const rowId = rowKey ? row[rowKey] : null;

    return visibleColumns.map((column) => {
      if (column.id === "delete" && !enableDelete) return null;
      const value = row[column.id];
      // Get the single pixel width for the virtualized table
      const resolvedCellWidth = getResolvedWidth(column.minWidth, currentBreakpoint);

      let cellContent;
      // Logic to determine cell content...
      if (column.render) {
        cellContent = column.render(value, row);
      } else if (column.id === 'delete' && enableDelete) {
        cellContent = (
          <IconButton onClick={() => handleDelete(rowId)} disabled={!rowId} size="small">
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      } else if ((column?.id?.toLowerCase().includes("doc") && row.Type?.toLowerCase().includes("sale")) && value) {
        cellContent = (
          <Typography
            onClick={() => handleDocumentClick(value)}
            align={row.align || "left"}

            sx={{
              color: row.status === "pending" ? "black" : (column?.id?.toLowerCase().includes("doc") && shouldHighlightRow) ? "white" : "primary.main",
              fontWeight: "bold", fontSize: "1.2rem", textDecoration: "none",
              "&:hover": { textDecoration: "underline", color: row.status === "pending" ? "white!important" : "" },
              cursor: "pointer",
            }}
          >
            {value}
          </Typography>
        );
      } else if (isLedgerTable && column?.id?.toLowerCase() === "date") {
        cellContent = formatDate(value);
      } else {
        cellContent = value;
      }

      return (
        <TableCell
          key={column.id}
          align={"left"}
          sx={{
            border: "2px solid #000",
            color: shouldHighlightRow ? "white !important" : "black",
            fontWeight: "bold", padding: "4px", letterSpacing: "normal", textTransform: "uppercase", boxSizing: "border-box",
            fontSize: column.label.includes("ust") ? { xs: "2.5rem", sm: "2.5rem" } : { xs: "1.1rem", sm: "1.2rem" },
            fontFamily: 'Jameel Noori Nastaleeq, serif !important',
            ...(usage?.includes('coa')
              ? { // **VIRTUALIZED STYLES**
                flex: `0 0 ${resolvedCellWidth}px`, width: `${resolvedCellWidth}px`, display: 'flex',
                alignItems: 'left', justifyContent: 'left', padding: "8px 10px", boxSizing: "border-box",
                textWrap: "wrap", height: "auto", overflow: "hidden", minWidth: resolvedCellWidth, maxWidth: resolvedCellWidth,
              }
              : { // **STANDARD RESPONSIVE STYLES**
                minWidth: column.minWidth, // Pass the responsive object {xs:.., md:..} directly to MUI
                width: column.width,
              }
            )
          }}
        >
          {cellContent}
        </TableCell>
      );
    });
  };

  const VirtualizedRow = ({ index, style }) => {
    const row = tableData[index];
    const { shouldHighlightRow } = getRowStyles(row);
    return (
      <TableRow component="div" hover style={style} sx={getRowStyles(row).rowSx} role="checkbox" tabIndex={-1}>
        {renderRowCells(row, shouldHighlightRow)}
      </TableRow>
    );
  };

  const getRowStyles = (row) => {
    const rowDate = new Date(row.date);
    const today = new Date();
    rowDate.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
    const dayDiff = (today - rowDate) / (24 * 60 * 60 * 1000);
    const delayed = dayDiff >= 1;

    const shouldHighlightRow =
      Object.entries(row).some(([key, val]) => {
        const isEstimateOrPending = typeof val === "string" && isLedgerTable && (val.toLowerCase() === "estimate" || val.toLowerCase().includes("pending"));
        const isFullDiscount = key.toLowerCase().includes("dis") && typeof val === "number" && val === 100;
        return isEstimateOrPending || isFullDiscount;
      }) || delayed;

    const rowSx = {
      display: usage?.includes('coa') ? 'flex' : 'table-row',
      touchAction: "manipulation", userSelect: "none",
      backgroundColor: row.status === "pending" ? "yellow" : row.claimStatus === 1 ? "rgb(211, 211, 211)" : shouldHighlightRow ? "red" : "white",
      "& td": { color: row.status === "pending" ? "black !important" : shouldHighlightRow ? "white" : "inherit" },
      color: row.status === "pending" ? "black!important" : shouldHighlightRow ? "white" : "inherit",
      transition: "background-color 0.3s ease, color 0.3s ease",
      "&:hover": {
        backgroundColor: shouldHighlightRow ? "rgba(24, 24, 24, 0.85)!important" : "rgba(189, 236, 252, 1)!important",
        color: row.status === "pending" ? "white!important" : shouldHighlightRow ? "white" : "inherit",
        "& td": { color: row.status === "pending" ? "white !important" : shouldHighlightRow ? "white" : "inherit" },
      },
    };
    return { rowSx, shouldHighlightRow };
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", borderRadius: "7px", padding: 0, fontSize: "2rem", maxHeight: usage?.includes('coa') ? "80vh" : "auto" }}>
      <TableContainer sx={{ maxHeight: "inherit", overflow: 'hidden' }}>
        <Table stickyHeader aria-label="sticky table" component={usage?.includes('coa') ? "div" : "table"} sx={{ fontFamily: '"Times New Roman", Times, serif', borderCollapse: "collapse", border: "1px solid #ddd" }}>
          <TableHead component={usage?.includes('coa') ? "div" : "thead"}>
            <TableRow component={usage?.includes('coa') ? "div" : "tr"} sx={{ display: usage?.includes('coa') ? 'flex' : 'table-row' }}>
              {visibleColumns.map((column) => {
                if (column.id === "delete" && !enableDelete) return null;
                const resolvedCellWidth = getResolvedWidth(column.minWidth, currentBreakpoint);
                return (
                  <TableCell key={column.id} align={column.align || "left"} sx={{
                    fontSize: { xs: "1rem", sm: "1.3rem" }, textAlign: "center", fontWeight: "bold", textTransform: "uppercase",
                    color: "#fff", backgroundColor: "rgba(24, 24, 24, 0.85)", border: "2px solid #ddd", padding: "8px 10px", boxSizing: "border-box",
                    ...(usage?.includes('coa')
                      ? { flex: `0 0 ${resolvedCellWidth}px`, width: `${resolvedCellWidth}px` }
                      : { minWidth: column.minWidth, width: column.width } // Pass responsive object
                    )
                  }}>
                    {(column.label.includes("Amo") || column.label.includes("Rate")) ? column.id : column.label}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody component={usage?.includes('coa') ? "div" : "tbody"}>
            {tableData.length === 0 ? (
              <TableRow><TableCell colSpan={visibleColumns.length} align={"left"} sx={{ py: 5 }}><Skeleton height={30} width="80%" /></TableCell></TableRow>
            ) : usage?.includes('coa') ? (
              <FixedSizeList height={tableHeight - 60} itemCount={tableData.length} itemSize={55} width="100%" innerElementType={InnerElementType}>
                {VirtualizedRow}
              </FixedSizeList>
            ) : (
              tableData.map((row, index) => {
                const { rowSx, shouldHighlightRow } = getRowStyles(row);
                return (
                  <TableRow hover sx={rowSx} role="checkbox" tabIndex={-1} key={rowKey ? row[rowKey] : index}>
                    {renderRowCells(row, shouldHighlightRow)}
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