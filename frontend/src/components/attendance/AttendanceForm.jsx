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
} from "@mui/material";

// Standard Icons (Most likely to be available)
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import PersonIcon from "@mui/icons-material/Person";

// Date Pickers
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";

const url = import.meta.env.VITE_API_URL || "http://localhost:3001";

const STATUS_COLORS = {
  Present: "#00c853",
  Late: "#ffab00",
  Leave: "#00b0ff",
  Absent: "#ff1744",
};

export default function AttendanceForm() {
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return new Date().toISOString().split("T")[0];
    } catch {
      return "2026-05-14";
    }
  });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate]);

  const updateLocalRow = (empId, field, value) => {
    setAttendance((prev) =>
      Array.isArray(prev) ? prev.map((row) => {
        if (row && row.employee_id === empId) {
          const updated = { ...row, [field]: value };
          if (field === "time_in" && value && !updated.time_out) {
            updated.time_out = "20:00";
            if (!updated.status || updated.status === "Absent") {
              if (typeof value === "string" && value.includes(":")) {
                const [h, m] = value.split(":").map(Number);
                updated.status = (h > 10 || (h === 10 && m > 0)) ? "Late" : "Present";
              }
            }
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
      await axios.post(`${url}/attendance/save`, { ...row, date: selectedDate });
      updateLocalRow(row.employee_id, "attendance_id", row.attendance_id || Date.now());
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const filteredData = Array.isArray(attendance) ? attendance.filter(e =>
    (e?.name || "").toLowerCase().includes((searchTerm || "").toLowerCase())
  ) : [];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ minHeight: "100vh", background: "#f0f2f5", py: { xs: 0, md: 4 }, px: { xs: 0, md: 3 } }}>
        <Paper elevation={0} sx={{ maxWidth: "1100px", margin: "auto", background: "white", borderRadius: { xs: 0, md: "24px" }, overflow: "hidden", minHeight: "100vh" }}>
        {/* Simple Robust Header */}
        <Box sx={{ background: "#1a237e", p: { xs: 2, md: 4 }, color: "white" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>Attendance Log</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Shift: 10:00 AM — 08:00 PM</Typography>
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
                        fontSize: { xs: "1.3rem", md: "1.5rem" },
                        height: "64px"
                      }
                    }}
                    InputLabelProps={{ shrink: true, sx: { fontWeight: 900, fontSize: "1.1rem" } }}
                  />
                  <input id="at-date-pk" type="date" style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: 0, left: 0, width: "100%", height: "100%" }} value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </Box>
                {/* Giant Search Bar */}
                <TextField
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: "#1a237e", fontSize: { xs: "1.6rem", md: "2.5rem" } }} />,
                    sx: {
                      borderRadius: "12px",
                      background: "white",
                      width: "100%",
                      height: "64px",
                      fontWeight: 900,
                      fontSize: { xs: "1.3rem", md: "1.5rem" }
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
              {filteredData.map((row) => (
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
                    <Stack direction="row" spacing={1} justifyContent="flex-start" flexWrap="wrap">
                      {["Present", "Late", "Absent", "Leave"].map(s => (
                        <Chip
                          key={s}
                          label={s}
                          onClick={() => updateLocalRow(row.employee_id, "status", s)}
                          sx={{
                            flex: 1,
                            fontWeight: 900,
                            height: "40px",
                            fontSize: "0.8rem",
                            bgcolor: row.status === s ? STATUS_COLORS[s] : "#f0f0f0",
                            color: row.status === s ? "white" : "#444",
                            border: row.status === s ? "none" : "1px solid #ccc"
                          }}
                        />
                      ))}
                    </Stack>

                    {/* Line 3: Times & Save */}
                    <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ width: "100%" }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 0.5, position: "relative", height: "28px" }}>
                          <Typography variant="caption" sx={{ position: "absolute", left: 4, fontWeight: 900, color: "#999", fontSize: "0.75rem" }}>TIME IN</Typography>
                          <Button 
                            size="small" 
                            onClick={(e) => {
                              const now = new Date();
                              const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                              updateLocalRow(row.employee_id, "time_in", time);
                            }}
                            sx={{ 
                              minWidth: "70px", 
                              p: "2px 8px", 
                              fontWeight: 900, 
                              color: "#1a237e", 
                              bgcolor: "#e8eaf6", 
                              borderRadius: "8px",
                              fontSize: "0.85rem", 
                              lineHeight: 1.2 
                            }}
                          >
                            NOW
                          </Button>
                        </Box>
                        <MobileTimePicker
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
                        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 0.5, position: "relative", height: "28px" }}>
                          <Typography variant="caption" sx={{ position: "absolute", left: 4, fontWeight: 900, color: "#999", fontSize: "0.75rem" }}>TIME OUT</Typography>
                          <Button 
                            size="small" 
                            onClick={(e) => {
                              const now = new Date();
                              const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                              updateLocalRow(row.employee_id, "time_out", time);
                            }}
                            sx={{ 
                              minWidth: "70px", 
                              p: "2px 8px", 
                              fontWeight: 900, 
                              color: "#1a237e", 
                              bgcolor: "#e8eaf6", 
                              borderRadius: "8px",
                              fontSize: "0.85rem", 
                              lineHeight: 1.2 
                            }}
                          >
                            NOW
                          </Button>
                        </Box>
                        <MobileTimePicker
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
                          disabled={savingId === row.employee_id}
                          sx={{ 
                            borderRadius: "12px", 
                            height: "52px", 
                            fontWeight: 900, 
                            fontSize: "0.9rem",
                            minWidth: "0",      
                            px: 1,              
                            bgcolor: row.attendance_id ? "#2e7d32" : "#1a237e" 
                          }}
                        >
                          {savingId === row.employee_id ? "..." : (row.attendance_id ? "OK" : "SAVE")}
                        </Button>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
    </LocalizationProvider>
  );
}
