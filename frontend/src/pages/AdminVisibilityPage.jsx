import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Switch, CircularProgress, Alert, Tooltip,
  Paper, Chip, Snackbar, IconButton, Divider,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import RefreshIcon from "@mui/icons-material/Refresh";

const url = import.meta.env.VITE_API_URL;

// ── Config ──────────────────────────────────────────────────────────────────
const FORM_KEYS = [
  { key: "packing",        label: "Packing",        emoji: "📦" },
  { key: "load",           label: "Load",            emoji: "🚚" },
  { key: "spo",            label: "SPO",             emoji: "📊" },
  { key: "paymentvoucher", label: "Payment Voucher", emoji: "💳" },
  { key: "saleshistory",   label: "History",         emoji: "🕐" },
  { key: "accounts",       label: "Accounts",        emoji: "👥" },
  { key: "recovery",       label: "Recovery",        emoji: "🧾" },
  { key: "sales",          label: "Sales",           emoji: "📈" },
  { key: "neworder",       label: "New Order",       emoji: "🛒" },
  { key: "products",       label: "Products",        emoji: "🛍️" },
  { key: "routes",         label: "Routes",          emoji: "🗺️" },
  { key: "delivery",       label: "Delivery",        emoji: "🛵" },
  { key: "imageviewer",    label: "Image Viewer",    emoji: "🖼️" },
  { key: "ledger",         label: "Ledger",          emoji: "📖" },
];

const USER_TYPES = ["admin", "sm", "operator", "pack", "payment", "spo", "bilty"];

const USER_TYPE_COLORS = {
  admin:    "#6c63ff",
  sm:       "#1976d2",
  operator: "#0288d1",
  pack:     "#00897b",
  payment:  "#7b1fa2",
  spo:      "#f57c00",
  bilty:    "#c62828",
};

// ── Main Component ───────────────────────────────────────────────────────────
const AdminVisibilityPage = () => {
  const navigate = useNavigate();

  // Auth guard
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();
  useEffect(() => {
    if (!currentUser || currentUser.userType?.toLowerCase() !== "admin") {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const token = localStorage.getItem("authToken");

  // ── State ────────────────────────────────────────────────────────────────
  const [visibility, setVisibility] = useState({}); // { "admin|packing": true, ... }
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState({}); // { "admin|packing": true } while PUT in-flight
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVisibility = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${url}/form-visibility`);
      const map = {};
      res.data.forEach(({ usertype, form_key, is_visible }) => {
        map[`${usertype}|${form_key}`] = !!is_visible;
      });
      setVisibility(map);
    } catch (err) {
      setFetchError("Failed to load visibility settings. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVisibility(); }, [fetchVisibility]);

  // ── Toggle ───────────────────────────────────────────────────────────────
  const handleToggle = async (usertype, form_key, newValue) => {
    const key = `${usertype}|${form_key}`;
    setSaving((p) => ({ ...p, [key]: true }));
    // Optimistic update
    setVisibility((p) => ({ ...p, [key]: newValue }));
    try {
      await axios.put(
        `${url}/form-visibility`,
        { usertype, form_key, is_visible: newValue },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnack({ open: true, msg: `✅ ${usertype} → ${form_key} set to ${newValue ? "visible" : "hidden"}`, severity: "success" });
    } catch (err) {
      // Revert on failure
      setVisibility((p) => ({ ...p, [key]: !newValue }));
      setSnack({ open: true, msg: `❌ Failed to update: ${err.response?.data?.message || err.message}`, severity: "error" });
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isVisible = (usertype, form_key) => {
    const key = `${usertype}|${form_key}`;
    return visibility[key] ?? false;
  };

  const isSaving = (usertype, form_key) => saving[`${usertype}|${form_key}`] ?? false;

  // How many forms are visible for a user type
  const countVisible = (usertype) =>
    FORM_KEYS.filter((f) => isVisible(usertype, f.key)).length;

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <CircularProgress size={56} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        py: { xs: 2, md: 4 },
        px: { xs: 1, md: 3 },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 4,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 48, color: "#6c63ff" }} />
          <Box>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{
                color: "white",
                letterSpacing: "-1px",
                fontSize: { xs: "1.4rem", md: "2rem" },
              }}
            >
              Form Visibility Manager
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.55)" }}>
              Toggle which cards each user type can see on the dashboard
            </Typography>
          </Box>
        </Box>
        <Tooltip title="Refresh from server">
          <IconButton
            onClick={fetchVisibility}
            sx={{
              color: "white",
              bgcolor: "rgba(255,255,255,0.1)",
              "&:hover": { bgcolor: "rgba(108,99,255,0.4)" },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px" }}>
          {fetchError}
        </Alert>
      )}

      {/* ── Matrix table ── */}
      <Box
        sx={{
          overflowX: "auto",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
          {/* thead */}
          <thead>
            <tr>
              <th style={{
                position: "sticky", top: 0, left: 0, zIndex: 4,
                background: "#1a1630",
                padding: "14px 8px", textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                borderRight: "1px solid rgba(255,255,255,0.12)",
                minWidth: 100, width: 100, whiteSpace: "nowrap",
              }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: "0.65rem", letterSpacing: 2, textTransform: "uppercase" }}>
                  Form / User Type
                </span>
              </th>
              {USER_TYPES.map((ut) => (
                <th key={ut} style={{
                  position: "sticky", top: 0, zIndex: 3,
                  background: "#1a1630",
                  padding: "10px 4px",
                  borderBottom: "1px solid rgba(255,255,255,0.12)",
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                  textAlign: "center", minWidth: 75,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{
                      display: "inline-block", padding: "2px 8px", borderRadius: 99,
                      background: USER_TYPE_COLORS[ut] + "33", color: USER_TYPE_COLORS[ut],
                      fontWeight: 800, fontSize: "0.62rem",
                      border: `1px solid ${USER_TYPE_COLORS[ut]}55`, letterSpacing: 1,
                    }}>
                      {ut.toUpperCase()}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.58rem" }}>
                      {countVisible(ut)}/{FORM_KEYS.length}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* tbody */}
          <tbody>
            {FORM_KEYS.map((form, idx) => {
              const rowBg = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)";
              const stickyBg = idx % 2 === 0 ? "#1c1836" : "#1e1a3a";
              return (
                <tr
                  key={form.key}
                  style={{ background: rowBg, transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(108,99,255,0.07)"}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  {/* Frozen label cell */}
                  <td style={{
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    background: stickyBg,
                    padding: "10px 8px",
                    borderBottom: idx < FORM_KEYS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    whiteSpace: "nowrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{form.emoji}</span>
                      <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: "0.8rem" }}>
                        {form.label}
                      </span>
                    </div>
                  </td>

                  {/* Toggle cells */}
                  {USER_TYPES.map((ut) => {
                    const visible = isVisible(ut, form.key);
                    const saving = isSaving(ut, form.key);
                    return (
                      <td key={ut} style={{
                        textAlign: "center", padding: "6px 4px",
                        borderBottom: idx < FORM_KEYS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        borderLeft: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        {saving ? (
                          <CircularProgress size={18} sx={{ color: USER_TYPE_COLORS[ut] }} />
                        ) : (
                          <Tooltip title={`${visible ? "Hide" : "Show"} ${form.label} for ${ut}`} placement="top" arrow>
                            <Switch
                              checked={visible}
                              onChange={(e) => handleToggle(ut, form.key, e.target.checked)}
                              size="small"
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": { color: USER_TYPE_COLORS[ut] },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: USER_TYPE_COLORS[ut] + "88" },
                              }}
                            />
                          </Tooltip>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {/* ── Legend ── */}
      <Box sx={{ mt: 3, display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
            Visible — card shown on dashboard
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CancelIcon sx={{ color: "#ef5350", fontSize: 18 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
            Hidden — card not shown
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)" }}>
          Changes take effect on next login / page reload.
        </Typography>
      </Box>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((p) => ({ ...p, open: false }))}
          sx={{ borderRadius: "12px", fontWeight: 600 }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminVisibilityPage;
