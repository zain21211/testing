import React, { useState, useEffect, useRef, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fixDate = (dt) => {
  if (!dt) return null;
  if (typeof dt === "string") {
    // Manually parse to ensure it's treated as local time regardless of 'Z' or 'T'
    const m = dt.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      return new Date(m[1], m[2] - 1, m[3], m[4], m[5], m[6]);
    }
  }
  return new Date(dt);
};

const fmt = (dt) => {
  const d = fixDate(dt);
  if (!d) return "—";
  return d.toLocaleTimeString("en-PK", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true
  });
};
const fmtDate = (dt) => {
  const d = fixDate(dt);
  if (!d) return "—";
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "2-digit" });
};
const minsAgo = (dt) => {
  const d = fixDate(dt);
  if (!d) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 60000);
};
const statusColor = (dt) => {
  const m = minsAgo(dt);
  if (m < 10) return "#00c853";
  if (m < 30) return "#ffab00";
  return "#9e9e9e";
};
const statusLabel = (dt) => {
  const m = minsAgo(dt);
  if (m < 10) return "Active";
  if (m < 30) return "Idle";
  return "Offline";
};

const today = () => new Date().toISOString().split("T")[0];

// ── CSS injected once ─────────────────────────────────────────────────────────
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS  = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet"; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = LEAFLET_JS; script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

function makeIcon(L, color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16], iconAnchor: [8, 8],
  });
}
function makePulseIcon(L, color) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:22px;height:22px">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:.3;animation:ping 1.5s infinite"></div>
      <div style="position:absolute;inset:3px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>
    </div>`,
    iconSize: [22, 22], iconAnchor: [11, 11],
  });
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { height: "calc(100vh - 64px)", background: "#0f0c29", fontFamily: "Inter,sans-serif", color: "#fff", overflow: "hidden", position: "relative" },
  header: { padding: "24px 20px 12px", display: "flex", flexDirection: "column", gap: 4 },
  title: { fontSize: "1.6rem", fontWeight: 900, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: 10 },
  tabs: { display: "flex", gap: 8, padding: "0 20px 20px" },
  tab: (active) => ({ padding: "8px 18px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", background: active ? "linear-gradient(135deg,#a78bfa,#60a5fa)" : "rgba(255,255,255,.08)", color: active ? "#fff" : "rgba(255,255,255,.6)", transition: "all .2s", flex: 1 }),
  body: { position: "relative", width: "100%", height: "100%" },
  sidebar: (collapsed) => ({ 
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 320, 
    zIndex: 1002,
    background: "rgba(15, 12, 41, 0.95)", 
    backdropFilter: "blur(20px)", 
    boxShadow: collapsed ? "none" : "10px 0 30px rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    transform: collapsed ? "translateX(-100%)" : "translateX(0)",
    transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    borderRight: "1px solid rgba(167, 139, 250, 0.2)"
  }),
  sidebarContent: { flex: 1, overflowY: "auto", overflowX: "hidden" },
  mapWrap: { width: "100%", height: "100%", position: "absolute", top: 0, left: 0 },
  toggleBtn: (collapsed) => ({
    position: "absolute",
    left: collapsed ? 0 : 320,
    top: 150,
    zIndex: 1003,
    background: "rgba(30, 27, 75, 0.95)",
    color: "#a78bfa",
    border: "1px solid rgba(167, 139, 250, 0.4)",
    borderLeft: "none",
    borderRadius: "0 8px 8px 0",
    width: 30,
    height: 80,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
    boxShadow: "4px 0 15px rgba(0,0,0,0.4)",
    transition: "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  }),
  card: (active) => ({ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,.06)", cursor: "pointer", background: active ? "rgba(167,139,250,.15)" : "transparent", transition: "background .15s" }),
  dot: (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }),
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.08)", color: "#fff", fontSize: "0.9rem", outline: "none" },
  badge: (color) => ({ background: color + "22", color, border: `1px solid ${color}44`, padding: "2px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 700 }),
  btn: { padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", background: "rgba(167,139,250,.25)", color: "#a78bfa", transition: "all .2s" },
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveTrackingPage() {
  const [tab, setTab]           = useState("live");
  const [liveData, setLiveData] = useState([]);
  const [users, setUsers]       = useState([]);
  const [selUser, setSelUser]   = useState("");
  const [selDate, setSelDate]   = useState(today());
  const [history, setHistory]   = useState([]);
  const [selCard, setSelCard]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [L, setL]               = useState(null);
  const [playStep, setPlayStep] = useState(null); // null = not playing, else index
  const [collapsed, setCollapsed] = useState(true);
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);
  const markersRef = useRef([]);
  const polyRef    = useRef(null);
  const timerRef   = useRef(null);
  const hasFitLive = useRef(false);
  const hasFitHist = useRef(false);

  // check if admin
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();
  const isAdmin = user?.userType?.toLowerCase().includes("admin");

  // ── Load Leaflet ─────────────────────────────────────────────────────────
  useEffect(() => { loadLeaflet().then(setL); }, []);

  // ── Init map once Leaflet + DOM ready ────────────────────────────────────
  useEffect(() => {
    if (!L || !mapRef.current || mapInst.current) return;
    const map = L.map(mapRef.current, { center: [30.3753, 69.3451], zoom: 6 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(map);
    mapInst.current = map;
  }, [L]);

  // Update map size when sidebar collapses/expands
  useEffect(() => {
    if (mapInst.current) {
      setTimeout(() => {
        mapInst.current.invalidateSize();
      }, 450); // Slightly more than the transition duration
    }
  }, [collapsed]);

  // ── Fetch live data ───────────────────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tracking/live`);
      const j = await r.json();
      if (j.success) setLiveData(j.data);
    } catch {}
  }, []);

  useEffect(() => {
    if (tab !== "live") {
      hasFitLive.current = false; // Reset when leaving tab
      return;
    }
    fetchLive();
    const id = setInterval(fetchLive, 30000);
    return () => clearInterval(id);
  }, [tab, fetchLive]);

  // ── Fetch users list for history tab ─────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch(`${API}/tracking/users?date=${selDate}`);
      const j = await r.json();
      if (j.success) { 
        setUsers(j.data); 
        if (!selUser && j.data.length) setSelUser(j.data[0].username); 
      }
    } catch {}
  }, [selDate, selUser]);

  useEffect(() => { if (tab === "history") fetchUsers(); }, [tab, selDate, fetchUsers]);

  // ── Fetch history ─────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    if (!selUser) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/tracking/history?username=${encodeURIComponent(selUser)}&date=${selDate}`);
      const j = await r.json();
      if (j.success) { 
        setHistory(j.data); 
        setPlayStep(null); 
        hasFitHist.current = false; // Trigger refit for new history
      }
    } catch {}
    setLoading(false);
  };

  // ── Draw live markers ─────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInst.current;
    if (!L || !map || tab !== "live") return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (!liveData.length) return;
    const bounds = [];
    liveData.forEach(u => {
      const color = statusColor(u.recorded_at);
      const icon = minsAgo(u.recorded_at) < 10 ? makePulseIcon(L, color) : makeIcon(L, color);
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${u.latitude},${u.longitude}`;
      const m = L.marker([u.latitude, u.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <b>${u.username}</b><br/>
          📍 ${u.location_name || "—"}<br/>
          🕐 ${fmt(u.recorded_at)}<br/>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 5px;">Get Directions</a>
        `);
      markersRef.current.push(m);
      bounds.push([u.latitude, u.longitude]);
    });
    
    if (bounds.length && !hasFitLive.current) { 
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      hasFitLive.current = true;
    }
  }, [L, liveData, tab]);

  // ── Draw history route ────────────────────────────────────────────────────
  const drawRoute = useCallback((data, upToIndex) => {
    const map = mapInst.current;
    if (!L || !map || !data.length) return;
    const pts = data.slice(0, upToIndex + 1).map(p => [p.latitude, p.longitude]);

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }

    if (pts.length > 1) {
      polyRef.current = L.polyline(pts, { color: "#a78bfa", weight: 4, opacity: 0.85 }).addTo(map);
    }

    data.slice(0, upToIndex + 1).forEach((p, i) => {
      const isLast = i === upToIndex;
      const color = isLast ? "#60a5fa" : "#a78bfa";
      const icon = isLast ? makePulseIcon(L, color) : makeIcon(L, "#a78bfa55");
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
      const m = L.marker([p.latitude, p.longitude], { icon }).addTo(map)
        .bindPopup(`
          <b>${fmt(p.recorded_at)}</b><br/>
          📍 ${p.location_name || "—"}<br/>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 5px;">Get Directions</a>
        `);
      if (isLast) m.openPopup();
      markersRef.current.push(m);
    });

    if (pts.length && !hasFitHist.current) {
      map.fitBounds(pts, { padding: [50, 50], maxZoom: 12 });
      hasFitHist.current = true;
    } else if (pts.length) {
      // Just center on last point without zooming out completely if already focused
      map.setView(pts[pts.length - 1], Math.min(map.getZoom(), 12));
    }
  }, [L]);

  useEffect(() => {
    if (tab !== "history" || !history.length || playStep === null) return;
    drawRoute(history, playStep);
  }, [tab, history, playStep, drawRoute]);

  // Full route when history loads
  useEffect(() => {
    if (tab !== "history" || !history.length) return;
    drawRoute(history, history.length - 1);
  }, [tab, history, drawRoute]);

  // ── Playback ──────────────────────────────────────────────────────────────
  const startPlay = () => {
    setPlayStep(0);
    timerRef.current = setInterval(() => {
      setPlayStep(prev => {
        const next = (prev ?? -1) + 1;
        if (next >= history.length) { clearInterval(timerRef.current); return history.length - 1; }
        return next;
      });
    }, 800);
  };
  const stopPlay = () => { clearInterval(timerRef.current); setPlayStep(null); };

  // ── Download CSV ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const rows = [["Time", "Lat", "Lng", "Location", "Accuracy"]];
    history.forEach(p => rows.push([fixDate(p.recorded_at).toLocaleString(), p.latitude, p.longitude, p.location_name || "", p.accuracy || ""]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `route_${selUser}_${selDate}.csv`; a.click();
  };

  // ── Focus card ────────────────────────────────────────────────────────────
  const focusUser = (u) => {
    setSelCard(u.username);
    const map = mapInst.current;
    if (map && u.latitude) map.setView([u.latitude, u.longitude], 15);
    markersRef.current.forEach(m => {
      if (m.getLatLng().lat === parseFloat(u.latitude)) m.openPopup();
    });
  };

  if (!isAdmin) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <div style={{ fontWeight: 700 }}>Admin access only</div>
    </div>
  );

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        @keyframes ping { 0%,100%{transform:scale(1);opacity:.3} 50%{transform:scale(2);opacity:0} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:rgba(255,255,255,.04)}
        ::-webkit-scrollbar-thumb{background:rgba(167,139,250,.3);border-radius:4px}
        #tracking-map .leaflet-container{background:#1a1a2e}
        .leaflet-popup-content-wrapper{background:#1e1b4b;color:#fff;border:1px solid rgba(167,139,250,.3)}
        .leaflet-popup-tip{background:#1e1b4b}
        .leaflet-control-zoom { margin-left: 45px !important; margin-top: 20px !important; }
      `}</style>

      <div style={S.body}>
        {/* ── Map ── */}
        <div style={S.mapWrap}>
          <div id="tracking-map" ref={mapRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />
          {!L && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,12,41,.8)", zIndex: 2 }}>
              <div style={{ color: "#a78bfa", fontWeight: 700 }}>Loading map…</div>
            </div>
          )}
        </div>

        {/* ── Side Menu (Overlay) ── */}
        <button 
          style={S.toggleBtn(collapsed)} 
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Show Menu" : "Hide Menu"}
        >
          {collapsed ? "›" : "‹"}
        </button>

        <div style={S.sidebar(collapsed)}>
          <div style={S.header}>
            <div style={S.title}>
              <span>📍</span>
              <span>Live Tracking</span>
            </div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: "0.75rem" }}>
              Field team GPS • 10:00 AM – 8:00 PM
            </div>
          </div>

          <div style={S.tabs}>
            <button style={S.tab(tab === "live")} onClick={() => setTab("live")}>Live</button>
            <button style={S.tab(tab === "history")} onClick={() => setTab("history")}>History</button>
          </div>

          <div style={S.sidebarContent}>
            {tab === "live" ? (
              <>
                <div style={{ padding: "0 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "rgba(255,255,255,.3)", letterSpacing: 1, textTransform: "uppercase" }}>
                    {liveData.length} Users Active
                  </div>
                  <button style={{ ...S.btn, padding: "4px 10px", fontSize: "0.75rem" }} onClick={fetchLive}>Refresh</button>
                </div>
                {liveData.length === 0 && (
                  <div style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,.3)", fontSize: "0.9rem" }}>
                    No pings today yet
                  </div>
                )}
                {liveData.map(u => {
                  const color = statusColor(u.recorded_at);
                  const active = selCard === u.username;
                  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${u.latitude},${u.longitude}`;
                  return (
                    <div key={u.username} style={S.card(active)} onClick={() => focusUser(u)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={S.dot(color)} />
                        <span style={{ fontWeight: 800, fontSize: "0.9rem", flex: 1 }}>{u.username}</span>
                        <span style={S.badge(color)}>{statusLabel(u.recorded_at)}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.45)", paddingLeft: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div>🕐 {fmt(u.recorded_at)}</div>
                          <div style={{ marginTop: 2, fontSize: "0.7rem", opacity: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {u.location_name || "—"}</div>
                        </div>
                        <a 
                          href={directionsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 700, fontSize: "0.75rem", background: "rgba(96,165,250,0.15)", padding: "4px 8px", borderRadius: "6px", marginLeft: 8, whiteSpace: "nowrap" }}
                        >
                          Directions
                        </a>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div style={{ padding: "0 20px 20px" }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.4)", marginBottom: 4 }}>DATE</div>
                      <input type="date" value={selDate} max={today()} onChange={e => setSelDate(e.target.value)} style={{ ...S.input, width: "100%", padding: "6px 10px" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.4)", marginBottom: 4 }}>USER</div>
                    <select value={selUser} onChange={e => setSelUser(e.target.value)} style={{ ...S.input, width: "100%", padding: "6px 10px" }}>
                      <option value="">— select user —</option>
                      {users.map(u => (
                        <option key={u.username} value={u.username}>{u.username} ({u.ping_count})</option>
                      ))}
                    </select>
                  </div>
                  <button style={{ ...S.btn, width: "100%", marginBottom: 8, background: "linear-gradient(135deg,#60a5fa,#3b82f6)", color: "#fff" }} onClick={fetchHistory} disabled={loading}>
                    {loading ? "Loading…" : "Load Route"}
                  </button>
                  
                  {history.length > 0 && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...S.btn, flex: 1 }} onClick={playStep !== null ? stopPlay : startPlay}>
                        {playStep !== null ? "Stop" : "Play"}
                      </button>
                      <button style={{ ...S.btn, flex: 1 }} onClick={downloadCSV}>CSV</button>
                    </div>
                  )}
                </div>

                 {history.length > 0 && (
                   <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                     {history.map((p, i) => {
                       const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
                       return (
                         <div key={p.id} onClick={() => { setPlayStep(i); drawRoute(history, i); }}
                           style={{ ...S.card(playStep === i), display: "flex", gap: 10, alignItems: "center" }}>
                           <div style={{ ...S.dot(i === 0 ? "#00c853" : i === history.length - 1 ? "#60a5fa" : "#a78bfa88"), flexShrink: 0 }} />
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontWeight: 700, fontSize: "0.8rem" }}>{fmt(p.recorded_at)}</div>
                             <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.45)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.location_name || "—"}</div>
                           </div>
                           <a 
                             href={directionsUrl} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             onClick={(e) => e.stopPropagation()} 
                             style={{ color: "#a78bfa", textDecoration: "none", fontWeight: 700, fontSize: "0.7rem", background: "rgba(167,139,250,0.15)", padding: "3px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}
                           >
                             Directions
                           </a>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </>
            )}
          </div>
        </div>

        {tab === "history" && history.length > 0 && !collapsed && (
          <div style={{ position: "absolute", bottom: 24, left: 344, zIndex: 1000, background: "rgba(30,27,75,.9)", backdropFilter: "blur(8px)", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(167,139,250,.25)", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: 4 }}>{selUser}</div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.6)" }}>
              📅 {fmtDate(selDate)} • 📍 {history.length} pings
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
