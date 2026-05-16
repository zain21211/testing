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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Dnd Kit Imports
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ALL_DASHBOARD_CARDS, FALLBACK_VISIBILITY, USER_TYPES } from "../dashboardConfig";

const url = import.meta.env.VITE_API_URL;

const USER_TYPE_COLORS = {
  admin:    "#6c63ff",
  sm:       "#1976d2",
  operator: "#0288d1",
  pack:     "#00897b",
  payment:  "#7b1fa2",
  spo:      "#f57c00",
  bilty:    "#c62828",
};

// ── Sortable Row Component ────────────────────────────────────────────────────
const SortableRow = ({ 
  form, 
  idx, 
  isLast, 
  dynamicUserTypes, 
  isVisible, 
  isSaving, 
  handleToggle, 
  USER_TYPE_COLORS 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: form.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: "relative",
    background: isDragging ? "rgba(108,99,255,0.2)" : (idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)"),
    opacity: isDragging ? 0.8 : 1,
  };

  const stickyBg = isDragging ? "#3a366a" : (idx % 2 === 0 ? "#2a264a" : "#2d294e");

  return (
    <tr ref={setNodeRef} style={style}>
      {/* Frozen label cell */}
      <td 
        {...attributes}
        {...listeners}
        style={{
          position: "sticky",
          left: 0,
          zIndex: 2,
          background: stickyBg,
          padding: "12px 10px",
          borderBottom: !isLast ? "1px solid rgba(255,255,255,0.06)" : "none",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          whiteSpace: "nowrap",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none", // Prevent page scroll during drag
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", color: "rgba(255,255,255,0.4)" }}>
            <DragIndicatorIcon fontSize="small" />
          </div>
          <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>{form.emoji}</span>
          <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.5px" }}>
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
            textAlign: "center", padding: "8px 6px",
            borderBottom: !isLast ? "1px solid rgba(255,255,255,0.06)" : "none",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
          }}>
            {saving ? (
              <CircularProgress size={20} sx={{ color: utColor }} />
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
      
      {/* Order Display (Optional indicator instead of arrows) */}
      <td style={{
        textAlign: "center", padding: "8px",
        borderBottom: !isLast ? "1px solid rgba(255,255,255,0.06)" : "none",
        borderLeft: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.3)",
        fontSize: "0.8rem",
        fontWeight: 700
      }}>
        #{idx + 1}
      </td>
    </tr>
  );
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
  const [formKeys, setFormKeys] = useState([]);
  const [dynamicUserTypes, setDynamicUserTypes] = useState([]);

  // DND Sensors: Long press for touch, standard for pointer
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Allow small movement before dragging
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Long press (250ms) for mobile reordering
        tolerance: 5,
      },
    })
  );

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVisibility = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await axios.get(`${url}/form-visibility`);
      const map = {};
      const orderMap = {}; // key -> sortOrder
      const utSet = new Set(USER_TYPES); // Always include standard user types

      res.data.forEach(({ usertype, form_key, is_visible, sort_order }) => {
        const ut = usertype.trim().toLowerCase();
        const fk = form_key.trim();
        map[`${ut}|${fk}`] = { isVisible: !!is_visible, sortOrder: sort_order };
        orderMap[fk] = sort_order;
        utSet.add(ut);
      });

      const missingUpdates = [];
      let maxOrder = Object.values(orderMap).length > 0 ? Math.max(...Object.values(orderMap)) : 0;

      // Auto-register any new forms not present in the database
      ALL_DASHBOARD_CARDS.filter(c => !c.adminOnly).forEach(card => {
        const hasAnyEntry = res.data.some(r => r.form_key === card.key);
        if (!hasAnyEntry) {
          maxOrder += 1;
          orderMap[card.key] = maxOrder;
          Array.from(utSet).forEach(ut => {
            const isVis = FALLBACK_VISIBILITY[card.key]?.includes(ut) ?? false;
            map[`${ut}|${card.key}`] = { isVisible: isVis, sortOrder: maxOrder };
            missingUpdates.push({ usertype: ut, form_key: card.key, is_visible: isVis, sort_order: maxOrder });
          });
        }
      });

      if (missingUpdates.length > 0) {
        try {
          await axios.put(`${url}/form-visibility/bulk`, { updates: missingUpdates }, { headers: { Authorization: `Bearer ${token}` } });
          setSnack({ open: true, msg: `✅ Registered new forms!`, severity: "info" });
        } catch (e) {
          console.error("Failed to auto-register new forms", e);
        }
      }

      setVisibility(map);
      
      // Sort user types: admin first, then alphabetical
      const uts = Array.from(utSet).sort((a, b) => {
        if (a === "admin") return -1;
        if (b === "admin") return 1;
        return a.localeCompare(b);
      });
      setDynamicUserTypes(uts);

      // Create form keys from ALL_DASHBOARD_CARDS
      const baseKeys = ALL_DASHBOARD_CARDS.filter(c => !c.adminOnly).map(c => ({
        key: c.key,
        label: c.title || (c.key.charAt(0).toUpperCase() + c.key.slice(1)),
        emoji: c.emoji || "🔹"
      }));

      // Also include any forms that are in DB but NOT in ALL_DASHBOARD_CARDS
      const existingKeys = new Set(baseKeys.map(f => f.key));
      const extraKeysFromData = Array.from(new Set(res.data.map(r => r.form_key)))
        .filter(k => !existingKeys.has(k))
        .map(k => ({ key: k, label: k.charAt(0).toUpperCase() + k.slice(1), emoji: "🔹" }));

      const finalKeys = [...baseKeys, ...extraKeysFromData].sort((a, b) => (orderMap[a.key] ?? 999) - (orderMap[b.key] ?? 999));
      setFormKeys(finalKeys);
    } catch (err) {
      setFetchError("Failed to load visibility settings. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [token]);

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

  const saveNewOrder = async (newKeys) => {
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = formKeys.findIndex((f) => f.key === active.id);
      const newIndex = formKeys.findIndex((f) => f.key === over.id);
      const newKeys = arrayMove(formKeys, oldIndex, newIndex);
      setFormKeys(newKeys);
      saveNewOrder(newKeys);
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
          maxHeight: "calc(100vh - 180px)", // Fixed height for vertical scroll
          overflow: "auto", // Enable both X and Y scrolling
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          // Custom scrollbar for better look
          "&::-webkit-scrollbar": { width: "8px", height: "8px" },
          "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,0.05)" },
          "&::-webkit-scrollbar-thumb": { background: "rgba(108,99,255,0.3)", borderRadius: "10px" },
          "&::-webkit-scrollbar-thumb:hover": { background: "rgba(108,99,255,0.5)" },
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
                <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "1.1rem", letterSpacing: 1.5, textTransform: "uppercase" }}>
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
                      fontWeight: 900, fontSize: "1.1rem",
                      letterSpacing: 1.2,
                      textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    }}>
                      {ut.toUpperCase()}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem", fontWeight: 700 }}>
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
                <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 800, fontSize: "0.9rem", letterSpacing: 1, textTransform: "uppercase" }}>
                  Order
                </span>
              </th>
            </tr>
          </thead>

          {/* tbody */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={formKeys.map((f) => f.key)}
              strategy={verticalListSortingStrategy}
            >
              <tbody>
                {formKeys.map((form, idx) => (
                  <SortableRow
                    key={form.key}
                    form={form}
                    idx={idx}
                    isLast={idx === formKeys.length - 1}
                    dynamicUserTypes={dynamicUserTypes}
                    isVisible={isVisible}
                    isSaving={isSaving}
                    handleToggle={handleToggle}
                    USER_TYPE_COLORS={USER_TYPE_COLORS}
                  />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
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
