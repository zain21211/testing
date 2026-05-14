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
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

const url = import.meta.env.VITE_API_URL;

// ── Config ──────────────────────────────────────────────────────────────────
const INITIAL_FORM_KEYS = [
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
  { key: "pendingdemand",  label: "Pending Demand",  emoji: "📝" },
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
  const [visibility, setVisibility] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [saving, setSaving] = useState({}); 
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [formKeys, setFormKeys] = useState(INITIAL_FORM_KEYS);
  const [dynamicUserTypes, setDynamicUserTypes] = useState([]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVisibility = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${url}/form-visibility`);
      const map = {};
      const orderMap = {}; // key -> sortOrder
      const utSet = new Set();

      res.data.forEach(({ usertype, form_key, is_visible, sort_order }) => {
        map[`${usertype}|${form_key}`] = { isVisible: !!is_visible, sortOrder: sort_order };
        orderMap[form_key] = sort_order;
        utSet.add(usertype);
      });

      setVisibility(map);
      
      // Sort user types: admin first, then alphabetical
      const uts = Array.from(utSet).sort((a, b) => {
        if (a === "admin") return -1;
        if (b === "admin") return 1;
        return a.localeCompare(b);
      });
      setDynamicUserTypes(uts);

      // Re-sort the local formKeys based on the fetched sort_order
      setFormKeys(prev => {
        const sorted = [...prev].sort((a, b) => (orderMap[a.key] ?? 999) - (orderMap[b.key] ?? 999));
        // Also check if there are keys in the data that are NOT in INITIAL_FORM_KEYS
        const existingKeys = new Set(prev.map(f => f.key));
        const newKeysFromData = Array.from(new Set(res.data.map(r => r.form_key)))
          .filter(k => !existingKeys.has(k))
          .map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), emoji: "🔹" }));
        
        return [...sorted, ...newKeysFromData].sort((a, b) => (orderMap[a.key] ?? 999) - (orderMap[b.key] ?? 999));
      });
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
    const currentOrder = visibility[key]?.sortOrder ?? 0;
    
    setSaving((p) => ({ ...p, [key]: true }));
    setVisibility((p) => ({ ...p, [key]: { ...p[key], isVisible: newValue } }));

    try {
      await axios.put(
        `${url}/form-visibility`,
        { usertype, form_key, is_visible: newValue, sort_order: currentOrder },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnack({ open: true, msg: `✅ ${usertype} → ${form_key} set to ${newValue ? "visible" : "hidden"}`, severity: "success" });
    } catch (err) {
      setVisibility((p) => ({ ...p, [key]: { ...p[key], isVisible: !newValue } }));
      setSnack({ open: true, msg: `❌ Failed to update: ${err.response?.data?.message || err.message}`, severity: "error" });
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
  };

  const moveRow = async (index, direction) => {
    const newKeys = [...formKeys];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newKeys.length) return;

    // Swap elements in local state
    [newKeys[index], newKeys[targetIndex]] = [newKeys[targetIndex], newKeys[index]];
    setFormKeys(newKeys);

    // Save ALL orders for ALL usertypes to backend in ONE BULK request
    setLoading(true);
    try {
      const updates = [];
      for (let i = 0; i < newKeys.length; i++) {
        const fkey = newKeys[i].key;
        for (const ut of dynamicUserTypes) {
          const vis = visibility[`${ut}|${fkey}`]?.isVisible ?? false;
          updates.push({ 
            usertype: ut, 
            form_key: fkey, 
            is_visible: vis, 
            sort_order: i 
          });
        }
      }
      
      await axios.put(
        `${url}/form-visibility/bulk`,
        { updates },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSnack({ open: true, msg: "✅ Dashboard order updated successfully!", severity: "success" });
      fetchVisibility(); // Refresh to ensure sync
    } catch (err) {
      setSnack({ open: true, msg: `❌ Failed to reorder: ${err.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isVisible = (usertype, form_key) => {
    const key = `${usertype}|${form_key}`;
    return visibility[key]?.isVisible ?? false;
  };

  const isSaving = (usertype, form_key) => saving[`${usertype}|${form_key}`] ?? false;

  // How many forms are visible for a user type
  const countVisible = (usertype) =>
    formKeys.filter((f) => isVisible(usertype, f.key)).length;

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
                background: "#25213d",
                padding: "14px 12px", textAlign: "left",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                borderRight: "1px solid rgba(255,255,255,0.15)",
                minWidth: 180, width: 180, whiteSpace: "nowrap",
              }}>
                <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "0.85rem", letterSpacing: 1.5, textTransform: "uppercase" }}>
                  Form / User Type
                </span>
              </th>
              {dynamicUserTypes.map((ut) => (
                <th key={ut} style={{
                  position: "sticky", top: 0, zIndex: 3,
                  background: "#25213d",
                  padding: "12px 6px",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                  borderLeft: "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center", minWidth: 110,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <span style={{
                      color: "#ffffff",
                      fontWeight: 900, fontSize: "0.8rem",
                      letterSpacing: 1.2,
                      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    }}>
                      {ut.toUpperCase()}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.65rem", fontWeight: 700 }}>
                      {countVisible(ut)}/{formKeys.length} Visible
                    </span>
                  </div>
                </th>
              ))}
              <th style={{
                position: "sticky", top: 0, zIndex: 3,
                background: "#25213d",
                padding: "10px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
                textAlign: "center", minWidth: 90,
              }}>
                <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 1, textTransform: "uppercase" }}>
                  Order
                </span>
              </th>
            </tr>
          </thead>

          {/* tbody */}
          <tbody>
            {formKeys.map((form, idx) => {
              const rowBg = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)";
              const stickyBg = idx % 2 === 0 ? "#2a264a" : "#2d294e";
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
                    borderBottom: idx < formKeys.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderRight: "1px solid rgba(255,255,255,0.1)",
                    whiteSpace: "nowrap",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>{form.emoji}</span>
                      <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.5px" }}>
                        {form.label}
                      </span>
                    </div>
                  </td>

                  {/* Toggle cells */}
                  {dynamicUserTypes.map((ut) => {
                    const visible = isVisible(ut, form.key);
                    const saving = isSaving(ut, form.key);
                    const utColor = USER_TYPE_COLORS[ut] || "#555";
                    return (
                      <td key={ut} style={{
                        textAlign: "center", padding: "6px 4px",
                        borderBottom: idx < formKeys.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                        borderLeft: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        {saving ? (
                          <CircularProgress size={18} sx={{ color: utColor }} />
                        ) : (
                          <Tooltip title={`${visible ? "Hide" : "Show"} ${form.label} for ${ut}`} placement="top" arrow>
                            <Switch
                              checked={visible}
                              onChange={(e) => handleToggle(ut, form.key, e.target.checked)}
                              size="small"
                              sx={{
                                "& .MuiSwitch-switchBase.Mui-checked": { color: utColor },
                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: utColor + "88" },
                              }}
                            />
                          </Tooltip>
                        )}
                      </td>
                    );
                  })}
                  {/* Order controls cell */}
                  <td style={{
                    textAlign: "center", padding: "4px",
                    borderBottom: idx < formKeys.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderLeft: "1px solid rgba(255,255,255,0.12)",
                  }}>
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => moveRow(idx, -1)}
                        disabled={idx === 0}
                        sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#6c63ff" } }}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => moveRow(idx, 1)}
                        disabled={idx === formKeys.length - 1}
                        sx={{ color: "rgba(255,255,255,0.6)", "&:hover": { color: "#6c63ff" } }}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </td>
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
