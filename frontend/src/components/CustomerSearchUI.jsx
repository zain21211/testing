import React, { forwardRef, useCallback } from "react";
import {
  TextField,
  Typography,
  Button,
  Grid, // Still used for its "item" behavior within a CSS Grid context if needed, but we'll primarily use Box
  CircularProgress,
  Box,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem as MuiMenuItem,
  Select,
  Paper,
  ClickAwayListener,
  Popper,
  ListItemText,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PersonIcon from "@mui/icons-material/Person";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { FixedSizeList } from "react-window";

const ITEM_SIZE = 48;
const allowedDateRangeOptions = [
  { label: "3-Months", value: "3-Months" },
  { label: "This Week", value: "thisWeek" },
  { label: "Last Week", value: "lastWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Year", value: "thisYear" },
  { label: "Last Year", value: "lastYear" },
  { label: "Custom Range", value: "custom" },
];

const VirtualizedSuggestionsList = forwardRef(
  function VirtualizedSuggestionsList(props, listRef) {
    const { data, onSelect, highlightedIndex } = props;
    const itemCount = data.length;
    const listHeight = Math.min(itemCount * ITEM_SIZE, 300);

    const Row = useCallback(
      ({ index, style }) => {
        const customer = data[index];
        const isHighlighted = index === highlightedIndex;
        if (!customer?.name || !customer?.acid) return null;

        return (
          <div style={style} key={customer.acid}>
            <MuiMenuItem
              component="li"
              onClick={() => onSelect(customer)}
              selected={isHighlighted}
              sx={{
                height: "100%",
                backgroundColor: isHighlighted ? "action.hover" : "transparent",
              }}
            >
              <ListItemText
                primary={customer.name}
                secondary={`ID #${customer.acid}${customer.route ? ` - Route: ${customer.route}` : ""
                  }`}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            </MuiMenuItem>
          </div>
        );
      },
      [onSelect, highlightedIndex, data]
    );

    return (
      <FixedSizeList
        ref={listRef}
        height={listHeight}
        itemCount={itemCount}
        itemSize={ITEM_SIZE}
        outerElementType="div"
        innerElementType="ul"
      >
        {({ index, style }) => <Row index={index} style={style} />}
      </FixedSizeList>
    );
  }
);

const CustomerSearchUI = forwardRef(
  (
    {
      customerInput,
      acidInput,
      selectedCustomer,
      phoneNumber,
      suggestions,
      isPopperOpen,
      highlightedIndex,
      error,
      isCustomerLoading,
      dates,
      dateRangeType,
      customerInputRef,
      listRef,
      searchButtonRef,
      handleCustomerInputChange,
      handleAcidInputChange,
      handleReset,
      handleSuggestionClick,
      handleTriggerFetch,
      handleInputKeyDown,
      handleClickAway,
      handleInputFocus,
      setDateRangeType,
      handleDateChange,
      usage,
      disabled,
      ledgerLoading,
    },
    ref
  ) => {
    const isSearchButtonDisabled =
      isCustomerLoading ||
      !selectedCustomer ||
      !!error ||
      ledgerLoading ||
      disabled;
    const showInputError = !!error && !isPopperOpen;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2, // This replaces Grid's "spacing" for rows
          my: usage === "ledger" ? 2 : 1,
        }}
      >
        {/* Customer Input Section */}
        <ClickAwayListener onClickAway={handleClickAway}>
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                display: "grid",
                gap: 2, // This replaces Grid's "spacing" for columns
                // Responsive columns: 1 column on small screens, 2 columns on larger screens
                gridTemplateColumns: {
                  xs: "1fr 3fr", // 1 column on extra-small screens (stacked)
                  sm: "1fr 3fr", // 2 columns with a 1:3 ratio on small screens and up
                  md: "2fr 4fr 6fr", // 2 columns with a 1:3 ratio on small screens and up
                },
              }}
            >
              {/* Account ID Input */}
              <TextField
                label="ID"
                variant="outlined"
                fullWidth
                value={acidInput ?? ""}
                onChange={handleAcidInputChange}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                inputProps={{ inputMode: "numeric" }}
              />

              {/* Customer Name Input */}
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search Customer"
                value={customerInput ?? ""}
                onChange={handleCustomerInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={handleInputFocus}
                inputRef={customerInputRef}
                disabled={disabled}
                error={showInputError}
                helperText={showInputError ? error : null}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      {isCustomerLoading ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PersonIcon color="primary" />
                      )}
                    </InputAdornment>
                  ),
                  endAdornment: (customerInput || selectedCustomer) &&
                    !disabled && (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleReset}
                          edge="end"
                          aria-label="clear input"
                        >
                          <RestartAltIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                }}
              />

              {/* Selected Customer Details */}
              <TextField
                value={phoneNumber || ""}
                fullWidth
                variant="outlined"
                sx={{
                  gridColumn: { xs: 'span 2', sm: 'span 2', md: 'span 1' },
                  "& input": {
                    borderRight: "1px solid black",
                    width: "30%",
                    marginY: { xs: 2, sm: 0 },
                  },
                }}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Typography
                      sx={{
                        px: 2,
                        color: "text.primary",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        fontSize: "3rem",
                        fontWeight: "bold",
                        width: "100%",
                        textAlign: "center",
                      }}
                    >
                      {selectedCustomer?.UrduName}
                    </Typography>
                  ),
                }}
              />
            </Box>
            <Popper
              open={isPopperOpen && suggestions?.length > 0 && !disabled}
              anchorEl={customerInputRef?.current}
              placement="bottom-end"
              modifiers={[{ name: "flip", enabled: false }]}
              sx={{
                zIndex: 1300,
                width: customerInputRef?.current
                  ? `${customerInputRef?.current.clientWidth}px`
                  : "auto",
              }}
            >
              <Paper elevation={3}>
                <VirtualizedSuggestionsList
                  ref={listRef}
                  data={suggestions}
                  onSelect={handleSuggestionClick}
                  highlightedIndex={highlightedIndex}
                />
              </Paper>
            </Popper>
          </Box>
        </ClickAwayListener>



        {/* Ledger-specific Controls */}
        {usage === "ledger" && (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              alignItems: "stretch",
              // Complex responsive grid columns to match the original layout
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm:
                  dateRangeType === "custom"
                    ? "repeat(2, 1fr)"
                    : "repeat(3, 1fr)",
                md:
                  dateRangeType === "custom"
                    ? "repeat(5, 1fr)"
                    : "repeat(3, 1fr)",
              },
            }}
          >
            {/* Date Range Dropdown */}
            <FormControl
              fullWidth
              sx={{ gridColumn: { xs: "span 2", sm: "span 1" } }}
            >
              <InputLabel id="date-range-select-label">Date Range</InputLabel>
              <Select
                labelId="date-range-select-label"
                value={dateRangeType}
                label="Date Range"
                onChange={(e) => setDateRangeType(e.target.value)}
                disabled={disabled}
              >
                {allowedDateRangeOptions.map((opt) => (
                  <MuiMenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Date Inputs */}
            {dateRangeType === "custom" && (
              <>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={dates.startDate}
                  onChange={handleDateChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    gridColumn: { xs: "span 2", sm: "span 1", md: "span 1" },
                  }}
                />
                <TextField
                  fullWidth
                  label="End Date"
                  name="endDate"
                  type="date"
                  value={dates.endDate}
                  onChange={handleDateChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    gridColumn: { xs: "span 2", sm: "span 1", md: "span 1" },
                  }}
                />
              </>
            )}

            {/* Reset Button */}
            <Button
              fullWidth
              variant="outlined"
              onClick={handleReset}
              disabled={disabled}
              sx={{
                minHeight: "56px",
                gridColumn:
                  dateRangeType === "custom"
                    ? { xs: "span 1", md: "span 1" }
                    : { xs: "span 1", sm: "span 1" },
              }}
            >
              Reset
            </Button>

            {/* Search Button */}
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleTriggerFetch}
              disabled={isSearchButtonDisabled}
              ref={searchButtonRef}
              sx={{
                minHeight: "56px",
                gridColumn:
                  dateRangeType === "custom"
                    ? { xs: "span 1", md: "span 1" }
                    : { xs: "span 1", sm: "span 1" },
              }}
              startIcon={
                ledgerLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <SearchIcon />
                )
              }
            >
              {ledgerLoading ? "Searching..." : "Search"}
            </Button>
          </Box>
        )}
      </Box>
    );
  }
);

export default CustomerSearchUI;
