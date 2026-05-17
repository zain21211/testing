import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Chip,
  Button,
  Grid,
  CircularProgress,
  Avatar,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from "@mui/material";

import ListAltIcon from "@mui/icons-material/ListAlt";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventIcon from "@mui/icons-material/Event";
import EventBusyIcon from "@mui/icons-material/EventBusy";

// Standard Icons (Most likely to be available)
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import PersonIcon from "@mui/icons-material/Person";
import ClearIcon from "@mui/icons-material/Clear";

// Date Pickers
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";

const url = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STATUS_COLORS = {
  Present: "#00c853",
  Late: "#ffab00",
  "Half Day": "#f57c00",
  Leave: "#00b0ff",
  Absent: "#ff1744",
};

export default function AttendanceForm() {
  const [attendance, setAttendance] = useState([]);
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return todayStr;
    } catch {
      return "2026-05-14";
    }
  });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const isAdmin = user?.userType?.toLowerCase().includes("admin") || false;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilters, setStatusFilters] = useState(() => {
    return isAdmin ? ["Late", "Absent", "Leave"] : ["Unmark"];
  });
  const [showList, setShowList] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedListData = React.useMemo(() => {
    let sortableItems = [...(Array.isArray(attendance) ? attendance : [])];
    sortableItems.sort((a, b) => {
      let valA = a[sortConfig.key] || "";
      let valB = b[sortConfig.key] || "";
      if (sortConfig.key === "status") {
        valA = a.status || "Unmark";
        valB = b.status || "Unmark";
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [attendance, sortConfig]);

  const [isHoliday, setIsHoliday] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState({ employees: [], records: [], holidays: [] });
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Invalid";
      const day = String(date.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return "Error";
    }
  };

  const fetchAttendance = async (date) => {
    setLoading(true);
    try {
      const res = await axios.get(`${url}/attendance/data`, {
        params: { date: date || selectedDate },
      });
      const data = res.data?.data;
      setAttendance(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidayStatus = async (date) => {
    try {
      const res = await axios.get(`${url}/attendance/holiday/check`, {
        params: { date: date || selectedDate },
      });
      setIsHoliday(res.data?.isHoliday || false);
    } catch (err) {
      setIsHoliday(false);
    }
  };

  const handleToggleHoliday = async () => {
    try {
      const res = await axios.post(`${url}/attendance/holiday/toggle`, {
        date: selectedDate,
        description: "Global Holiday"
      });
      if (res.data?.success) {
        setIsHoliday(res.data.isHoliday);
      }
    } catch (err) {
      console.error("Error toggling holiday", err);
    }
  };

  const fetchMonthlyData = async () => {
    setMonthlyLoading(true);
    try {
      const res = await axios.get(`${url}/attendance/monthly`, {
        params: { month: monthlyMonth, year: monthlyYear }
      });
      if (res.data?.success) {
        setMonthlyData(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching monthly data", err);
    } finally {
      setMonthlyLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchHolidayStatus();
  }, [selectedDate]);

  useEffect(() => {
    if (showMonthly) {
      fetchMonthlyData();
    }
  }, [showMonthly, monthlyMonth, monthlyYear]);

  const updateLocalRow = (empId, field, value) => {
    setAttendance((prev) =>
      Array.isArray(prev) ? prev.map((row) => {
        if (row && row.employee_id === empId) {
          const updated = { ...row, [field]: value, is_dirty: true };
          
          if (field === "time_in" || field === "time_out") {
            // Auto-set time out if empty
            if (field === "time_in" && value && !updated.time_out) {
              updated.time_out = "20:00";
            }
            
            const tIn = field === "time_in" ? value : updated.time_in;
            const tOut = field === "time_out" ? value : updated.time_out;
            
            if (tIn && (!updated.status || ["Present", "Late", "Half Day", "Absent", "Leave"].includes(updated.status))) {
              const [inH, inM] = tIn.split(":").map(Number);
              const inMinutes = inH * 60 + inM;
              
              let outMinutes = 20 * 60; // default 20:00
              const hasValidOut = tOut && !tOut.startsWith("00:00");
              if (hasValidOut) {
                const [outH, outM] = tOut.split(":").map(Number);
                outMinutes = outH * 60 + outM;
              }

              const lateThreshold = 10 * 60 + 30; // 10:30
              const halfDayInThreshold = 11 * 60 + 30; // 11:30
              const outThreshold = 17 * 60 + 30; // 17:30

              if (inMinutes > halfDayInThreshold || (hasValidOut && outMinutes < outThreshold)) {
                updated.status = "Half Day";
              } else if (inMinutes > lateThreshold) {
                updated.status = "Late";
              } else {
                updated.status = "Present";
              }
            }
          }

          // Auto-clear times when marked Absent or Leave
          if (field === "status" && (value === "Absent" || value === "Leave")) {
            updated.time_in = "";
            updated.time_out = "";
          }
          
          return updated;
        }
        return row;
      }) : []
    );
  };

  const saveRow = async (row) => {
    if (!row?.employee_id) return;
    setSavingId(row.employee_id);
    try {
      const res = await axios.post(`${url}/attendance/save`, { ...row, date: selectedDate });
      const newAttendanceId = res.data?.attendance_id || row.attendance_id || Date.now();
      setAttendance(prev => prev.map(r => r.employee_id === row.employee_id ? { ...r, attendance_id: newAttendanceId, is_dirty: false } : r));
      setSearchTerm(""); // Automatically clear the filter after updating
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const filteredData = Array.isArray(attendance) ? attendance.filter(e => {
    const matchesSearch = (e?.name || "").toLowerCase().includes((searchTerm || "").toLowerCase());
    const eStatus = e.status || "Unmark";
    const matchesStatus = statusFilters.includes(eStatus);
    return matchesSearch && matchesStatus;
  }) : [];

  const summary = (Array.isArray(attendance) ? attendance : []).reduce((acc, row) => {
    if (row.status) {
      acc[row.status] = (acc[row.status] || 0) + 1;
    } else {
      acc.Unmark = (acc.Unmark || 0) + 1;
    }
    return acc;
  }, { Present: 0, Late: 0, "Half Day": 0, Absent: 0, Leave: 0, Unmark: 0 });

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ minHeight: "100vh", background: "#f0f2f5", py: { xs: 0, md: 4 }, px: { xs: 0, md: 3 } }}>
        <Paper elevation={0} sx={{ maxWidth: "1100px", margin: "auto", background: "white", borderRadius: { xs: 0, md: "24px" }, overflow: "hidden", minHeight: "100vh" }}>
        {/* Simple Robust Header */}
        <Box sx={{ background: "#1a237e", p: { xs: 2, md: 4 }, color: "white" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>Attendance Log</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5 }}>Shift: 10:00 AM — 08:00 PM</Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1.5, alignItems: "center" }}>
                <Chip
                  label={statusFilters.length > 0 ? "Clear All" : "All On"}
                  size="small"
                  onClick={() => {
                    if (statusFilters.length > 0) {
                      setStatusFilters([]);
                    } else {
                      setStatusFilters(Object.keys(summary));
                    }
                  }}
                  sx={{
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    padding: "2px 4px",
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" }
                  }}
                />
                {Object.entries(summary).map(([key, value]) => {
                  const isActive = statusFilters.includes(key);
                  return (
                    <Chip 
                      key={key} 
                      label={`${key}: ${value}`} 
                      size="small"
                      onClick={() => {
                        setStatusFilters(prev => 
                          prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                        );
                      }}
                      sx={{ 
                        fontWeight: 900, 
                        fontSize: "0.95rem",
                        padding: "2px 4px",
                        bgcolor: isActive ? (STATUS_COLORS[key] || "rgba(255,255,255,0.4)") : "rgba(0,0,0,0.2)", 
                        color: isActive ? "white" : "rgba(255,255,255,0.5)",
                        border: key === "Unmark" && isActive ? "1px solid rgba(255,255,255,0.5)" : "1px solid transparent",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: isActive ? (STATUS_COLORS[key] || "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.3)"
                        }
                      }} 
                    />
                  );
                })}
              </Stack>
              <Stack direction="row" flexWrap="nowrap" gap={1} sx={{ overflowX: "auto", pb: 0.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<ListAltIcon />}
                  onClick={() => setShowList(true)}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.5)",
                    borderRadius: "8px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                  }}
                >
                  Status List
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => setShowMonthly(true)}
                  sx={{
                    color: "white",
                    borderColor: "rgba(255,255,255,0.5)",
                    borderRadius: "8px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                  }}
                >
                  Monthly Report
                </Button>
                <Button
                  variant={isHoliday ? "contained" : "outlined"}
                  startIcon={isHoliday ? <EventBusyIcon /> : <EventIcon />}
                  onClick={handleToggleHoliday}
                  sx={{
                    color: isHoliday ? "white" : "white",
                    bgcolor: isHoliday ? "#ff1744" : "transparent",
                    borderColor: isHoliday ? "#ff1744" : "rgba(255,255,255,0.5)",
                    borderRadius: "8px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    "&:hover": { 
                      bgcolor: isHoliday ? "#d50000" : "rgba(255,255,255,0.1)",
                      borderColor: isHoliday ? "#d50000" : "white" 
                    }
                  }}
                >
                  {isHoliday ? "Unmark Holiday" : "Mark Holiday"}
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={1} justifyContent={{ md: "flex-end" }} alignItems="center">
                {/* Giant Date Filter */}
                <Box sx={{ position: "relative", width: { xs: "40%", md: "240px" } }}>
                  <TextField
                    fullWidth
                    label="Date"
                    value={formatDisplayDate(selectedDate)}
                    onClick={() => {
                      const p = document.getElementById('at-date-pk');
                      if (p) try { p.showPicker ? p.showPicker() : p.click(); } catch (e) { }
                    }}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        borderRadius: "12px",
                        background: "white",
                        fontWeight: 900,
                        fontSize: { xs: "1.1rem", md: "1.3rem" },
                        height: "52px"
                      }
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 900, fontSize: "1rem" } }}
                  />
                  <input id="at-date-pk" type="date" style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0, width: "100%", height: "100%" }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </Box>
                {/* Giant Search Bar */}
                <TextField
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "#1a237e", fontSize: { xs: "1.6rem", md: "2rem" } }} />,
                    endAdornment: searchTerm ? (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setSearchTerm("")} edge="end">
                          <ClearIcon sx={{ fontSize: "1.5rem" }} />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: {
                      borderRadius: "12px",
                      background: "white",
                      width: "100%",
                      height: "52px",
                      fontWeight: 900,
                      fontSize: { xs: "1.1rem", md: "1.3rem" }
                    }
                  }}
                  sx={{ width: { xs: "58%", md: "350px" } }}
                />
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: "center", py: 10 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ p: { xs: 1, md: 3 } }}>
            <Stack spacing={2}>
              {filteredData.map((row) => {
                const isLocked = !isAdmin && (selectedDate !== todayStr || !!row.attendance_id);
                return (
                <Paper key={row?.employee_id || Math.random()} sx={{ p: 2, borderRadius: "20px", border: "1px solid #ddd", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <Stack spacing={2}>
                    {/* Line 1: Employee Name */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ bgcolor: "#1a237e", width: 50, height: 50, fontWeight: 900, fontSize: "1.2rem" }}>
                        {(row?.name || "E").charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h5" sx={{ fontWeight: 900, color: "#1a237e", lineHeight: 1.1 }}>{row?.name}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "#666" }}>{row?.designation || "STAFF"}</Typography>
                      </Box>
                    </Stack>

                    {/* Line 2: Status Selection */}
                    <Stack direction="row" spacing={1} justifyContent="flex-start" flexWrap="wrap" sx={{ gap: '8px 0' }}>
                      {["Present", "Late", "Half Day", "Absent", "Leave"].map(s => (
                        <Button
                          key={s}
                          disabled={isLocked}
                          variant={row.status === s ? "contained" : "outlined"}
                          onClick={() => updateLocalRow(row.employee_id, "status", s)}
                          sx={{
                            flex: 1,
                            fontWeight: 900,
                            height: "46px",
                            fontSize: "0.9rem",
                            p: 0,
                            minWidth: "0",
                            bgcolor: row.status === s ? STATUS_COLORS[s] : "transparent",
                            color: row.status === s ? "white" : "#666",
                            borderColor: row.status === s ? "transparent" : "#ccc",
                            boxShadow: row.status === s ? "0 4px 10px rgba(0,0,0,0.15)" : "none",
                            "&:hover": {
                              bgcolor: row.status === s ? STATUS_COLORS[s] : "#f0f0f0",
                            }
                          }}
                        >
                          {s}
                        </Button>
                      ))}
                    </Stack>

                    {/* Line 3: Times & Save */}
                    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ width: "100%" }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, height: "32px" }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: "#999", fontSize: "0.75rem", pl: 0.5 }}>TIME IN</Typography>
                          <Button 
                            size="small" 
                            disabled={isLocked}
                            onClick={(e) => {
                              const now = new Date();
                              const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                              updateLocalRow(row.employee_id, "time_in", time);
                            }}
                            sx={{ 
                              minWidth: "80px", 
                              p: "4px 12px", 
                              fontWeight: 900, 
                              color: "#1a237e", 
                              bgcolor: "#e8eaf6", 
                              borderRadius: "8px",
                              fontSize: "0.95rem", 
                              lineHeight: 1.2 
                            }}
                          >
                            NOW
                          </Button>
                        </Box>
                        <MobileTimePicker
                          disabled={isLocked}
                          value={row.time_in ? dayjs(`2024-01-01T${row.time_in}`) : null}
                          onChange={(newValue) => {
                            if (newValue) updateLocalRow(row.employee_id, "time_in", newValue.format("HH:mm"));
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              InputProps: {
                                sx: { borderRadius: "12px", fontWeight: 900, bgcolor: "#f9f9f9", height: "48px" }
                              }
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, height: "32px" }}>
                          <Typography variant="caption" sx={{ fontWeight: 900, color: "#999", fontSize: "0.75rem", pl: 0.5 }}>TIME OUT</Typography>
                          <Button 
                            size="small" 
                            disabled={isLocked}
                            onClick={(e) => {
                              const now = new Date();
                              const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                              updateLocalRow(row.employee_id, "time_out", time);
                            }}
                            sx={{ 
                              minWidth: "80px", 
                              p: "4px 12px", 
                              fontWeight: 900, 
                              color: "#1a237e", 
                              bgcolor: "#e8eaf6", 
                              borderRadius: "8px",
                              fontSize: "0.95rem", 
                              lineHeight: 1.2 
                            }}
                          >
                            NOW
                          </Button>
                        </Box>
                        <MobileTimePicker
                          disabled={isLocked}
                          value={row.time_out ? dayjs(`2024-01-01T${row.time_out}`) : null}
                          onChange={(newValue) => {
                            if (newValue) updateLocalRow(row.employee_id, "time_out", newValue.format("HH:mm"));
                          }}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              InputProps: {
                                sx: { borderRadius: "12px", fontWeight: 900, bgcolor: "#f9f9f9", height: "48px" }
                              }
                            }
                          }}
                        />
                      </Box>
                      <Box sx={{ flexShrink: 0, width: "65px" }}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => saveRow(row)}
                          disabled={isLocked || savingId === row.employee_id}
                          sx={{ 
                            borderRadius: "12px", 
                            height: "52px", 
                            fontWeight: 900, 
                            fontSize: "0.9rem",
                            minWidth: "0",      
                            px: 1,              
                            bgcolor: (row.attendance_id && !row.is_dirty) ? "#2e7d32" : "#1a237e" 
                          }}
                        >
                          {savingId === row.employee_id ? <CircularProgress size={24} color="inherit" /> : ((row.attendance_id && !row.is_dirty) ? "OK" : "SAVE")}
                        </Button>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              )})}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Summary List Dialog */}
      <Dialog open={showList} onClose={() => setShowList(false)} maxWidth="xl" fullWidth PaperProps={{ sx: { maxHeight: "95vh", margin: 1, width: "100%", maxWidth: "98vw" } }}>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: "#1a237e", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Attendance List - {formatDisplayDate(selectedDate)}</span>
          <IconButton onClick={() => setShowList(false)} sx={{ color: "white", p: 0.5 }}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ height: "100%", overflowY: "auto" }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, fontSize: "1.1rem", width: "35%", px: 1 }}>
                    <TableSortLabel active={sortConfig.key === 'name'} direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'} onClick={() => handleSort('name')}>Employee</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: "0.85rem", whiteSpace: "nowrap", width: "20%", px: 1 }}>
                    <TableSortLabel active={sortConfig.key === 'time_in'} direction={sortConfig.key === 'time_in' ? sortConfig.direction : 'asc'} onClick={() => handleSort('time_in')}>IN</TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: "0.85rem", whiteSpace: "nowrap", width: "25%", px: 1 }}>
                    <TableSortLabel active={sortConfig.key === 'time_out'} direction={sortConfig.key === 'time_out' ? sortConfig.direction : 'asc'} onClick={() => handleSort('time_out')}>OUT</TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, fontSize: "1.1rem", width: "20%", px: 1 }}>
                    <TableSortLabel active={sortConfig.key === 'status'} direction={sortConfig.key === 'status' ? sortConfig.direction : 'asc'} onClick={() => handleSort('status')}>Status</TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedListData.map((row) => (
                  <TableRow key={row.employee_id} hover>
                    <TableCell sx={{ fontWeight: 800, fontSize: "1rem", px: 1 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", fontWeight: 700, whiteSpace: "nowrap", px: 1 }}>{row.time_in || "-"}</TableCell>
                    <TableCell sx={{ fontSize: "0.95rem", fontWeight: 700, whiteSpace: "nowrap", px: 1 }}>{row.time_out || "-"}</TableCell>
                    <TableCell align="center" sx={{ px: 1 }}>
                      <Chip
                        label={row.status || "Unmark"}
                        sx={{
                          fontWeight: 800,
                          fontSize: "0.9rem",
                          bgcolor: row.status ? (STATUS_COLORS[row.status] || "#9e9e9e") : "transparent",
                          color: row.status ? "white" : "#666",
                          border: row.status ? "none" : "1px solid #ccc",
                          minWidth: "85px"
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>

      {/* Monthly Report Dialog */}
      <Dialog open={showMonthly} onClose={() => setShowMonthly(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, bgcolor: "#1a237e", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Monthly Attendance</Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              type="month"
              size="small"
              value={`${monthlyYear}-${String(monthlyMonth).padStart(2, '0')}`}
              onChange={(e) => {
                const parts = e.target.value.split('-');
                if (parts.length === 2) {
                  setMonthlyYear(parseInt(parts[0], 10));
                  setMonthlyMonth(parseInt(parts[1], 10));
                }
              }}
              sx={{ bgcolor: "white", borderRadius: "8px", input: { fontWeight: 800, py: 1 } }}
            />
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {monthlyLoading ? (
            <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box>
          ) : (
            <TableContainer sx={{ maxHeight: { xs: "calc(100vh - 120px)", sm: "calc(100vh - 150px)", md: "calc(100vh - 200px)" }, overflow: "auto" }}>
              <Table stickyHeader size="small" sx={{ minWidth: "1200px" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, bgcolor: "#f5f5f5", position: "sticky", left: 0, zIndex: 3, borderRight: "2px solid #ddd", minWidth: "150px" }}>
                      Employee Name
                    </TableCell>
                    {(() => {
                      const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate();
                      return Array.from({ length: daysInMonth }).map((_, i) => (
                        <TableCell key={i} align="center" sx={{ fontWeight: 900, bgcolor: "#f5f5f5", minWidth: "35px", p: 0.5 }}>
                          {i + 1}
                        </TableCell>
                      ));
                    })()}
                    <TableCell align="center" sx={{ fontWeight: 900, bgcolor: "#f5f5f5", borderLeft: "2px solid #ddd", position: "sticky", right: 0, zIndex: 3 }}>
                      
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(monthlyData.employees || []).map((emp) => {
                    const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate();
                    let totalWorkingDays = 0;
                    
                    // Helpers to determine status for a specific date
                    const holidayDates = (monthlyData.holidays || []).map(h => new Date(h.holiday_date).toISOString().split('T')[0]);
                    
                    return (
                      <TableRow key={emp.id} hover>
                        <TableCell sx={{ fontWeight: 800, position: "sticky", left: 0, bgcolor: "white", zIndex: 2, borderRight: "2px solid #ddd", minWidth: "150px" }}>
                          {emp.name}
                        </TableCell>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dateObj = new Date(monthlyYear, monthlyMonth - 1, i + 1);
                          // Adjust for local time offset to get correct YYYY-MM-DD
                          const localDateStr = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                          
                          const isFriday = dateObj.getDay() === 5;
                          const isHol = holidayDates.includes(localDateStr);
                          
                          // Find record for this employee and date
                          const record = (monthlyData.records || []).find(r => r.employee_id === emp.id && r.attendance_date.startsWith(localDateStr));
                          
                          let mark = "";
                          let color = "transparent";
                          let textColor = "#333";
                          let fw = 800;

                          if (isHol) {
                            mark = "H";
                            color = "#ab47bc"; // Purple
                            textColor = "white";
                            totalWorkingDays += 1;
                          } else if (isFriday) {
                            mark = "F";
                            color = "#5c6bc0"; // Indigo
                            textColor = "white";
                            totalWorkingDays += 1;
                          } else if (record) {
                            if (record.status === "Present") { mark = "P"; color = "#00c853"; textColor = "white"; totalWorkingDays += 1; }
                            else if (record.status === "Late") { mark = "LT"; color = "#ffab00"; textColor = "white"; totalWorkingDays += 1; }
                            else if (record.status === "Half Day") { mark = "1/2"; color = "#f57c00"; textColor = "white"; totalWorkingDays += 0.5; }
                            else if (record.status === "Absent") { mark = "A"; color = "#ff1744"; textColor = "white"; } // 0
                            else if (record.status === "Leave") { mark = "L"; color = "#00b0ff"; textColor = "white"; } // 0
                          }

                          return (
                            <TableCell key={i} align="center" sx={{ p: 0.5, border: "1px solid #eee" }}>
                              {mark && (
                                <Box sx={{ 
                                  bgcolor: color, 
                                  color: textColor, 
                                  fontWeight: fw,
                                  fontSize: "0.75rem",
                                  borderRadius: "4px",
                                  py: 0.5,
                                  px: 0.2,
                                  minWidth: "24px"
                                }}>
                                  {mark}
                                </Box>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell align="center" sx={{ fontWeight: 900, fontSize: "1.1rem", borderLeft: "2px solid #ddd", position: "sticky", right: 0, bgcolor: "white", zIndex: 2 }}>
                          {totalWorkingDays}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button onClick={() => setShowMonthly(false)} variant="contained" sx={{ bgcolor: "#1a237e", fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </LocalizationProvider>
  );
}
