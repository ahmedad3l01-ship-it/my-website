import { useState, useEffect, useRef, useCallback } from "react";

// ─── Firebase REST helpers ───────────────────────────────────────────────────
const DB = "https://sofara-adahi-default-rtdb.firebaseio.com";
const fbGet = async (path) => {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? r.json() : null;
};
const fbSet = async (path, data) => {
  await fetch(`${DB}/${path}.json`, { method: "PUT", body: JSON.stringify(data) });
};
const fbPush = async (path, data) => {
  const r = await fetch(`${DB}/${path}.json`, { method: "POST", body: JSON.stringify(data) });
  const j = await r.json();
  return j.name;
};
const fbDelete = async (path) => {
  await fetch(`${DB}/${path}.json`, { method: "DELETE" });
};
const fbUpdate = async (path, data) => {
  await fetch(`${DB}/${path}.json`, { method: "PATCH", body: JSON.stringify(data) });
};

// ─── Hardcoded accounts ───────────────────────────────────────────────────────
const ACCOUNTS = [
  { username: "admin",   password: "admin123", role: "admin",  teamId: null },
  { username: "leader1", password: "L1@sofara", role: "leader", teamId: 1 },
  { username: "leader2", password: "L2@sofara", role: "leader", teamId: 2 },
  { username: "leader3", password: "L3@sofara", role: "leader", teamId: 3 },
];

// ─── Default data ─────────────────────────────────────────────────────────────
const DEFAULT_TEAMS = [
  { id: 1, name: "تيم 1", color: "#FBAE42", emoji: "🌟" },
  { id: 2, name: "تيم 2", color: "#0A4976", emoji: "🌿" },
  { id: 3, name: "تيم 3", color: "#22C55E", emoji: "❤️" },
];
const DEFAULT_TASKS = [
  { name: "ستوري",              points: 2,  icon: "📱" },
  { name: "بوست",               points: 5,  icon: "📝" },
  { name: "فيديو",              points: 10, icon: "🎬" },
  { name: "جاب متبرع جديد",     points: 15, icon: "💰" },
  { name: "جاب متطوع جديد",     points: 20, icon: "🙌" },
  { name: "ساعة القوة اليومية", points: 5,  icon: "⚡" },
  { name: "مشاركة ميدانية",    points: 25, icon: "🏃" },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  gold:   "#FBAE42",
  blue:   "#0A4976",
  green:  "#22C55E",
  bg:     "#F5F7FA",
  white:  "#FFFFFF",
  text:   "#1a2b3c",
  muted:  "#6b7c93",
  danger: "#ef4444",
  card:   "rgba(255,255,255,0.95)",
};

const s = {
  page: { minHeight: "100vh", background: C.bg, fontFamily: "'Segoe UI', Tahoma, sans-serif", direction: "rtl" },
  header: { background: `linear-gradient(135deg, ${C.blue} 0%, #0d5fa0 100%)`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(10,73,118,0.3)" },
  logo: { color: C.gold, fontWeight: 800, fontSize: 18, letterSpacing: 0.5 },
  badge: (color) => ({ background: color, color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }),
  tabs: { display: "flex", gap: 4, overflowX: "auto", padding: "10px 12px", background: C.white, borderBottom: `2px solid ${C.bg}`, scrollbarWidth: "none" },
  tab: (active) => ({ padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: active ? 700 : 500, fontSize: 13, whiteSpace: "nowrap", background: active ? C.blue : "transparent", color: active ? "#fff" : C.muted, transition: "all 0.2s" }),
  content: { padding: "16px", maxWidth: 700, margin: "0 auto" },
  card: { background: C.card, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)" },
  btn: (color = C.blue, sm) => ({ background: color, color: "#fff", border: "none", borderRadius: sm ? 10 : 12, padding: sm ? "6px 14px" : "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: sm ? 12 : 14, fontFamily: "inherit" }),
  btnOutline: (color = C.blue) => ({ background: "transparent", color: color, border: `2px solid ${color}`, borderRadius: 12, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }),
  input: { width: "100%", padding: "10px 14px", borderRadius: 12, border: `1.5px solid #dde3ec`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "#f9fafc", direction: "rtl" },
  label: { fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 4, display: "block" },
  row: { display: "flex", gap: 10, alignItems: "center" },
  toast: (type) => ({ position: "fixed", bottom: 24, right: 24, background: type === "error" ? C.danger : type === "success" ? C.green : C.blue, color: "#fff", padding: "12px 20px", borderRadius: 14, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease", maxWidth: 320 }),
};

// ─── Helper components ────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={s.toast(type)}>{msg}</div>;
}

function ProgressBar({ value, max, color = C.green, milestones = [] }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div style={{ background: "#e8edf3", borderRadius: 99, height: 18, position: "relative", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, height: "100%", borderRadius: 99, transition: "width 0.6s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingLeft: 6 }}>
          {pct > 10 && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, paddingLeft: 6 }}>{pct}%</span>}
        </div>
        {milestones.map((m, i) => (
          <div key={i} style={{ position: "absolute", top: 0, left: `${m.pct}%`, width: 2, height: "100%", background: "rgba(0,0,0,0.2)" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 4 }}>
        <span>{value.toLocaleString()} / {max.toLocaleString()} جنيه</span>
        <span>{pct}%</span>
      </div>
      {milestones.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {milestones.map((m, i) => (
            <span key={i} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: m.reached ? "#dcfce7" : "#f1f5f9", color: m.reached ? "#166534" : C.muted, fontWeight: 600, border: `1px solid ${m.reached ? "#86efac" : "#e2e8f0"}` }}>
              {m.reached ? "✅" : "🎯"} {m.pct}% = {m.points} نقطة
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ ...s.card, maxWidth: 480, width: "100%", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: C.blue, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const handle = () => {
    const acc = ACCOUNTS.find(a => a.username === u && a.password === p);
    if (acc) onLogin(acc); else setErr("بيانات غير صحيحة");
  };
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${C.blue} 0%, #0d5fa0 60%, #0a3d6e 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 24, padding: "40px 32px", width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🌟</div>
          <h1 style={{ color: C.blue, margin: "8px 0 4px", fontSize: 22, fontWeight: 800 }}>سفراء الأضاحي</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>منصة إدارة المتطوعين</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>اسم المستخدم</label>
          <input style={s.input} value={u} onChange={e => setU(e.target.value)} placeholder="admin" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>كلمة المرور</label>
          <input style={s.input} type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handle()} />
        </div>
        {err && <p style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{err}</p>}
        <button style={{ ...s.btn(C.blue), width: "100%", padding: "13px 0", fontSize: 16 }} onClick={handle}>دخول 🚀</button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 20 }}>إنت مش متطوع… إنت سفير 🌟</p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Data
  const [teams, setTeams] = useState([]);
  const [volTasks, setVolTasks] = useState([]);
  const [volunteers, setVolunteers] = useState({});
  const [volLogs, setVolLogs] = useState({});
  const [teamLogs, setTeamLogs] = useState({});
  const [moneyLogs, setMoneyLogs] = useState({});
  const [teamMissions, setTeamMissions] = useState({});
  const [weeklyWinners, setWeeklyWinners] = useState({});

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, id: Date.now() });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, vt, vs, vl, tl, ml, tm, ww] = await Promise.all([
        fbGet("teams"), fbGet("volTasks"), fbGet("volunteers"),
        fbGet("volLogs"), fbGet("teamLogs"), fbGet("moneyLogs"),
        fbGet("teamMissions"), fbGet("weeklyWinners"),
      ]);
      setTeams(t ? Object.entries(t).map(([k, v]) => ({ ...v, _key: k })) : []);
      setVolTasks(vt ? Object.entries(vt).map(([k, v]) => ({ ...v, _key: k })) : []);
      setVolunteers(vs || {});
      setVolLogs(vl || {});
      setTeamLogs(tl || {});
      setMoneyLogs(ml || {});
      setTeamMissions(tm || {});
      setWeeklyWinners(ww || {});
    } catch { showToast("خطأ في تحميل البيانات", "error"); }
    setLoading(false);
  }, [showToast]);

  // Seed defaults if empty
  const seedData = useCallback(async () => {
    const existing = await fbGet("teams");
    if (!existing) {
      const teamsObj = {};
      DEFAULT_TEAMS.forEach(t => { teamsObj[`team_${t.id}`] = t; });
      await fbSet("teams", teamsObj);
    }
    const existingTasks = await fbGet("volTasks");
    if (!existingTasks) {
      const tasksObj = {};
      DEFAULT_TASKS.forEach((t, i) => { tasksObj[`task_${i}`] = t; });
      await fbSet("volTasks", tasksObj);
    }
  }, []);

  useEffect(() => {
    if (user) { seedData().then(loadAll); }
  }, [user, seedData, loadAll]);

  // ── Computed aggregates ──
  const getVolPoints = useCallback((volId) => {
    return Object.values(volLogs).filter(l => l.volId === volId).reduce((s, l) => s + (l.points || 0), 0);
  }, [volLogs]);

  const getTeamMoneyTotal = useCallback((teamId) => {
    return Object.values(moneyLogs).filter(l => l.teamId === teamId).reduce((s, l) => s + (l.amount || 0), 0);
  }, [moneyLogs]);

  const getTeamVolPoints = useCallback((teamId) => {
    const vols = Object.entries(volunteers).filter(([, v]) => v.teamId === teamId);
    return vols.reduce((s, [vid]) => s + getVolPoints(vid), 0);
  }, [volunteers, getVolPoints]);

  const getTeamTeamPoints = useCallback((teamId) => {
    return Object.values(teamLogs).filter(l => l.teamId === teamId).reduce((s, l) => s + (l.points || 0), 0);
  }, [teamLogs]);

  const getTeamMoneyPoints = useCallback((teamId) => {
    const money = getTeamMoneyTotal(teamId);
    const shares = Math.floor(money / 3000);
    return Math.floor(money / 10) + shares * 100;
  }, [getTeamMoneyTotal]);

  // Auto-check milestones
  const checkMilestones = useCallback(async (teamId) => {
    const missions = Object.entries(teamMissions).filter(([, m]) => m.teamId === teamId);
    const money = getTeamMoneyTotal(teamId);
    for (const [mKey, mission] of missions) {
      const updated = { ...mission, milestones: [...(mission.milestones || [])] };
      let changed = false;
      for (let i = 0; i < updated.milestones.length; i++) {
        const ms = updated.milestones[i];
        const threshold = (ms.pct / 100) * mission.target;
        if (!ms.reached && money >= threshold) {
          updated.milestones[i] = { ...ms, reached: true };
          changed = true;
          await fbPush("teamLogs", { teamId, points: ms.points, desc: `مبروك! وصل ${mission.name} ${ms.pct}%`, date: new Date().toISOString() });
          showToast(`🎉 وصل التيم ${ms.pct}% في ${mission.name}! +${ms.points} نقطة للتيم`);
        }
      }
      if (changed) await fbSet(`teamMissions/${mKey}`, updated);
    }
  }, [teamMissions, getTeamMoneyTotal, showToast]);

  if (!user) return <Login onLogin={(acc) => { setUser(acc); setTab(0); }} />;

  const ADMIN_TABS = ["🏆 الترتيب", "👥 المتطوعين", "➕ نقاط أفراد", "🎯 مهام التيم", "⚙️ مهام الأفراد", "✏️ التيمات", "📤 مشاركة", "🗓️ حسم"];
  const LEADER_TABS = ["👥 تيمي", "➕ نقاط", "📤 مشاركة"];
  const tabs = user.role === "admin" ? ADMIN_TABS : LEADER_TABS;

  const teamData = teams.find(t => t.id === user.teamId);

  const renderTab = () => {
    if (user.role === "admin") {
      switch (tab) {
        case 0: return <AdminLeaderboard {...{ teams, volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyTotal, getTeamMoneyPoints }} />;
        case 1: return <AdminVolunteers {...{ teams, volunteers, volTasks, getVolPoints, getTeamMoneyTotal, loadAll, showToast }} />;
        case 2: return <AddPoints {...{ teams, volunteers, volTasks, moneyLogs, loadAll, showToast, checkMilestones, isAdmin: true }} />;
        case 3: return <TeamMissionsTab {...{ teams, teamMissions, getTeamMoneyTotal, loadAll, showToast }} />;
        case 4: return <VolTasksTab {...{ volTasks, loadAll, showToast }} />;
        case 5: return <EditTeamsTab {...{ teams, loadAll, showToast }} />;
        case 6: return <ShareTab {...{ teams, volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyTotal, getTeamMoneyPoints, isAdmin: true }} />;
        case 7: return <WeeklyWinnerTab {...{ teams, volunteers, weeklyWinners, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyPoints, getVolPoints, loadAll, showToast }} />;
        default: return null;
      }
    } else {
      const myTeam = teams.find(t => t.id === user.teamId);
      switch (tab) {
        case 0: return <LeaderTeam {...{ myTeam, volunteers, volLogs, moneyLogs, teamMissions, getVolPoints, getTeamMoneyTotal, getTeamVolPoints, getTeamTeamPoints }} />;
        case 1: return <AddPoints {...{ teams: myTeam ? [myTeam] : [], volunteers, volTasks, moneyLogs, loadAll, showToast, checkMilestones, isAdmin: false, fixedTeamId: user.teamId }} />;
        case 2: return <ShareTab {...{ teams: myTeam ? [myTeam] : [], volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyTotal, getTeamMoneyPoints, isAdmin: false, fixedTeamId: user.teamId }} />;
        default: return null;
      }
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.logo}>🌟 سفراء الأضاحي</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            {user.role === "admin" ? "مدير النظام" : `قائد ${teamData?.name || ""}`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {loading && <span style={{ color: C.gold, fontSize: 12 }}>⏳</span>}
          <button onClick={loadAll} style={{ ...s.btn(C.gold), padding: "6px 12px", fontSize: 12 }}>🔄</button>
          <button onClick={() => setUser(null)} style={{ ...s.btn("#dc2626"), padding: "6px 12px", fontSize: 12 }}>خروج</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {tabs.map((t, i) => (
          <button key={i} style={s.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {renderTab()}
      </div>

      {/* Toast */}
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

// ─── Admin Leaderboard ────────────────────────────────────────────────────────
function AdminLeaderboard({ teams, volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyTotal, getTeamMoneyPoints }) {
  const ranked = [...teams].map(t => ({
    ...t,
    volPts: getTeamVolPoints(t.id),
    teamPts: getTeamTeamPoints(t.id),
    moneyPts: getTeamMoneyPoints(t.id),
    money: getTeamMoneyTotal(t.id),
    total: getTeamVolPoints(t.id) + getTeamTeamPoints(t.id) + getTeamMoneyPoints(t.id),
  })).sort((a, b) => b.total - a.total);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 style={{ color: C.blue, marginBottom: 16, fontSize: 18 }}>🏆 ترتيب التيمات</h2>
      {ranked.map((t, i) => (
        <div key={t.id} style={{ ...s.card, borderRight: `5px solid ${t.color}`, background: i === 0 ? `linear-gradient(135deg, #fffbf0, #fff)` : C.card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{medals[i] || `#${i + 1}`} {t.emoji} {t.name}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: t.color }}>{t.total.toLocaleString()} نقطة</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: C.muted }}>
              <div>👤 نقاط أفراد: <b style={{ color: C.text }}>{t.volPts}</b></div>
              <div>🎯 نقاط تيم: <b style={{ color: C.text }}>{t.teamPts}</b></div>
              <div>💰 نقاط تبرع: <b style={{ color: C.text }}>{t.moneyPts}</b></div>
              <div>💵 المال: <b style={{ color: C.green }}>{t.money.toLocaleString()} جنيه</b></div>
            </div>
          </div>
        </div>
      ))}

      <h3 style={{ color: C.blue, marginTop: 24, marginBottom: 12 }}>👤 أفضل المتطوعين</h3>
      {Object.entries(volunteers)
        .map(([id, v]) => ({ ...v, id, pts: getVolPoints(id) }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 10)
        .map((v, i) => {
          const t = teams.find(t => t.id === v.teamId);
          return (
            <div key={v.id} style={{ ...s.card, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: C.muted, minWidth: 24 }}>#{i + 1}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</div>
                  <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, background: t?.color + "22", color: t?.color || C.muted, fontWeight: 600 }}>{t?.emoji} {t?.name}</span>
                </div>
              </div>
              <div style={{ fontWeight: 800, color: C.blue, fontSize: 16 }}>{v.pts} نقطة</div>
            </div>
          );
        })}
    </div>
  );
}

// ─── Admin Volunteers ─────────────────────────────────────────────────────────
function AdminVolunteers({ teams, volunteers, volTasks, getVolPoints, getTeamMoneyTotal, loadAll, showToast }) {
  const [filterTeam, setFilterTeam] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState(teams[0]?.id || 1);
  const [delConfirm, setDelConfirm] = useState(null);

  const filtered = Object.entries(volunteers)
    .filter(([, v]) => filterTeam === "all" || v.teamId === parseInt(filterTeam))
    .map(([id, v]) => ({ ...v, id, pts: getVolPoints(id) }))
    .sort((a, b) => b.pts - a.pts);

  const addVol = async () => {
    if (!newName.trim()) return;
    await fbPush("volunteers", { name: newName.trim(), teamId: parseInt(newTeam), createdAt: new Date().toISOString() });
    showToast(`تم إضافة ${newName} ✅`);
    setNewName(""); setShowAdd(false);
    loadAll();
  };

  const delVol = async (id) => {
    await fbDelete(`volunteers/${id}`);
    showToast("تم حذف المتطوع", "error");
    setDelConfirm(null); loadAll();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: C.blue, margin: 0, fontSize: 18 }}>👥 المتطوعين</h2>
        <button style={s.btn(C.green)} onClick={() => setShowAdd(true)}>+ إضافة</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={s.tab(filterTeam === "all")} onClick={() => setFilterTeam("all")}>الكل ({Object.keys(volunteers).length})</button>
        {teams.map(t => (
          <button key={t.id} style={{ ...s.tab(filterTeam === String(t.id)), borderRight: `3px solid ${t.color}` }} onClick={() => setFilterTeam(String(t.id))}>
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {filtered.map((v) => {
        const t = teams.find(t => t.id === v.teamId);
        return (
          <div key={v.id} style={{ ...s.card, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{v.name}</div>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: t?.color + "22", color: t?.color, fontWeight: 600 }}>{t?.emoji} {t?.name}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontWeight: 800, color: C.blue }}>{v.pts} نقطة</div>
              <button onClick={() => setDelConfirm(v)} style={{ ...s.btn(C.danger, true), padding: "4px 10px" }}>حذف</button>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>لا يوجد متطوعين</div>}

      {showAdd && (
        <Modal title="إضافة متطوع جديد" onClose={() => setShowAdd(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>الاسم</label>
            <input style={s.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المتطوع" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>التيم</label>
            <select style={s.input} value={newTeam} onChange={e => setNewTeam(e.target.value)}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
            </select>
          </div>
          <button style={{ ...s.btn(C.green), width: "100%" }} onClick={addVol}>إضافة ✅</button>
        </Modal>
      )}

      {delConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDelConfirm(null)}>
          <p style={{ color: C.text, marginBottom: 16 }}>هتحذف {delConfirm.name}؟ مش هترجع البيانات.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...s.btn(C.danger), flex: 1 }} onClick={() => delVol(delConfirm.id)}>حذف 🗑️</button>
            <button style={{ ...s.btnOutline(), flex: 1 }} onClick={() => setDelConfirm(null)}>إلغاء</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Add Points (shared admin + leader) ──────────────────────────────────────
function AddPoints({ teams, volunteers, volTasks, moneyLogs, loadAll, showToast, checkMilestones, isAdmin, fixedTeamId }) {
  const [selTeam, setSelTeam] = useState(fixedTeamId || teams[0]?.id || "");
  const [selVol, setSelVol] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [note, setNote] = useState("");
  const [moneyAmt, setMoneyAmt] = useState("");
  const [loading, setLoading] = useState(false);

  const teamVols = Object.entries(volunteers)
    .filter(([, v]) => v.teamId === parseInt(selTeam))
    .map(([id, v]) => ({ ...v, id }));

  useEffect(() => { setSelVol(""); }, [selTeam]);

  const addVolPoints = async () => {
    if (!selVol || !activeTask) return;
    const vol = volunteers[selVol];
    setLoading(true);
    await fbPush("volLogs", { volId: selVol, teamId: parseInt(selTeam), points: activeTask.points, desc: activeTask.name, note, date: new Date().toISOString() });
    showToast(`✅ ${activeTask.points} نقطة لـ ${vol.name}`);
    setNote(""); setActiveTask(null);
    loadAll(); setLoading(false);
  };

  const addMoney = async () => {
    if (!selVol || !moneyAmt || parseInt(moneyAmt) <= 0) return;
    const amt = parseInt(moneyAmt);
    const vol = volunteers[selVol];
    const pts = Math.floor(amt / 10) + (Math.floor(amt / 3000) * 100);
    setLoading(true);
    await fbPush("moneyLogs", { volId: selVol, teamId: parseInt(selTeam), amount: amt, date: new Date().toISOString() });
    await fbPush("volLogs", { volId: selVol, teamId: parseInt(selTeam), points: pts, desc: `تبرع ${amt} جنيه`, note, date: new Date().toISOString() });
    showToast(`✅ ${amt} جنيه = ${pts} نقطة لـ ${vol.name}`);
    await checkMilestones(parseInt(selTeam));
    setMoneyAmt(""); setNote(""); loadAll(); setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: C.blue, marginBottom: 16, fontSize: 18 }}>➕ إضافة نقاط</h2>

      {isAdmin && (
        <div style={{ ...s.card }}>
          <label style={s.label}>اختر التيم</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {teams.map(t => (
              <button key={t.id} onClick={() => setSelTeam(t.id)} style={{ ...s.btn(selTeam === t.id ? t.color : "#e8edf3"), color: selTeam === t.id ? "#fff" : C.muted, padding: "8px 16px", fontSize: 13 }}>
                {t.emoji} {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={s.card}>
        <label style={s.label}>اختر المتطوع</label>
        <select style={s.input} value={selVol} onChange={e => setSelVol(e.target.value)}>
          <option value="">-- اختر --</option>
          {teamVols.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {selVol && (
        <>
          <div style={s.card}>
            <label style={s.label}>المهمة</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {volTasks.map((t, i) => (
                <button key={i} onClick={() => setActiveTask(activeTask?._key === t._key ? null : t)}
                  style={{ padding: "8px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTask?._key === t._key ? C.blue : "#f1f5f9", color: activeTask?._key === t._key ? "#fff" : C.text, transition: "all 0.2s" }}>
                  {t.icon} {t.name} ({t.points}نق)
                </button>
              ))}
            </div>
          </div>

          <div style={s.card}>
            <label style={s.label}>💰 تبرع بالفلوس</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...s.input, flex: 1 }} type="number" value={moneyAmt} onChange={e => setMoneyAmt(e.target.value)} placeholder="المبلغ بالجنيه" />
              <button style={s.btn(C.green)} onClick={addMoney} disabled={loading}>تسجيل</button>
            </div>
            {moneyAmt && <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>= {Math.floor(parseInt(moneyAmt || 0) / 10) + Math.floor(parseInt(moneyAmt || 0) / 3000) * 100} نقطة</p>}
          </div>

          <div style={s.card}>
            <label style={s.label}>ملاحظة (اختياري)</label>
            <input style={s.input} value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظة..." />
          </div>

          <button style={{ ...s.btn(C.blue), width: "100%", padding: "13px 0", fontSize: 15 }} onClick={addVolPoints} disabled={!activeTask || loading}>
            {loading ? "⏳ جاري..." : `إضافة ${activeTask ? activeTask.points + " نقطة" : "نقاط"} ✅`}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Team Missions Tab (Admin) ────────────────────────────────────────────────
function TeamMissionsTab({ teams, teamMissions, getTeamMoneyTotal, loadAll, showToast }) {
  const [selTeam, setSelTeam] = useState(teams[0]?.id || 1);
  const [showModal, setShowModal] = useState(false);
  const [editMission, setEditMission] = useState(null);
  const [form, setForm] = useState({ name: "", target: "", milestones: [{ pct: 50, points: 30 }, { pct: 80, points: 60 }, { pct: 100, points: 100 }] });

  const teamMissionsList = Object.entries(teamMissions)
    .filter(([, m]) => m.teamId === selTeam)
    .map(([k, m]) => ({ ...m, _key: k }));

  const openAdd = () => { setEditMission(null); setForm({ name: "", target: "", milestones: [{ pct: 50, points: 30 }, { pct: 80, points: 60 }, { pct: 100, points: 100 }] }); setShowModal(true); };
  const openEdit = (m) => { setEditMission(m); setForm({ name: m.name, target: m.target, milestones: m.milestones || [] }); setShowModal(true); };

  const save = async () => {
    if (!form.name || !form.target) return;
    const data = { teamId: selTeam, name: form.name, target: parseInt(form.target), milestones: form.milestones.map(ms => ({ ...ms, pct: parseInt(ms.pct), points: parseInt(ms.points), reached: ms.reached || false })) };
    if (editMission) await fbSet(`teamMissions/${editMission._key}`, data);
    else await fbPush("teamMissions", data);
    showToast("تم حفظ المهمة ✅");
    setShowModal(false); loadAll();
  };

  const del = async (key) => {
    await fbDelete(`teamMissions/${key}`);
    showToast("تم حذف المهمة", "error"); loadAll();
  };

  const updateMS = (i, field, val) => {
    const ms = [...form.milestones];
    ms[i] = { ...ms[i], [field]: val };
    setForm(f => ({ ...f, milestones: ms }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: C.blue, margin: 0, fontSize: 18 }}>🎯 مهام التيم</h2>
        <button style={s.btn(C.green)} onClick={openAdd}>+ مهمة جديدة</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {teams.map(t => <button key={t.id} style={s.tab(selTeam === t.id)} onClick={() => setSelTeam(t.id)}>{t.emoji} {t.name}</button>)}
      </div>

      {teamMissionsList.length === 0 && <div style={{ textAlign: "center", color: C.muted, padding: 40 }}>لا توجد مهام</div>}

      {teamMissionsList.map(m => {
        const money = getTeamMoneyTotal(m.teamId);
        return (
          <div key={m._key} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>🎯 {m.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>الهدف: {m.target?.toLocaleString()} جنيه</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={s.btn(C.gold, true)} onClick={() => openEdit(m)}>✏️</button>
                <button style={s.btn(C.danger, true)} onClick={() => del(m._key)}>🗑️</button>
              </div>
            </div>
            <ProgressBar value={money} max={m.target || 1} milestones={m.milestones || []} />
          </div>
        );
      })}

      {showModal && (
        <Modal title={editMission ? "تعديل المهمة" : "مهمة جديدة"} onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>اسم المهمة</label>
            <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: جمع تبرعات" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>الهدف (جنيه)</label>
            <input style={s.input} type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} placeholder="3000" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>المراحل</label>
            {form.milestones.map((ms, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input style={{ ...s.input, flex: 1 }} type="number" value={ms.pct} onChange={e => updateMS(i, "pct", e.target.value)} placeholder="%" />
                <span style={{ color: C.muted, fontSize: 12 }}>%</span>
                <input style={{ ...s.input, flex: 1 }} type="number" value={ms.points} onChange={e => updateMS(i, "points", e.target.value)} placeholder="نقاط" />
                <span style={{ color: C.muted, fontSize: 12 }}>نق</span>
                <button onClick={() => setForm(f => ({ ...f, milestones: f.milestones.filter((_, j) => j !== i) }))} style={{ ...s.btn(C.danger, true) }}>✕</button>
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, milestones: [...f.milestones, { pct: "", points: "" }] }))} style={{ ...s.btnOutline(C.blue), fontSize: 12, padding: "6px 12px" }}>+ مرحلة</button>
          </div>
          <button style={{ ...s.btn(C.green), width: "100%" }} onClick={save}>حفظ ✅</button>
        </Modal>
      )}
    </div>
  );
}

// ─── Vol Tasks Tab ────────────────────────────────────────────────────────────
function VolTasksTab({ volTasks, loadAll, showToast }) {
  const [showModal, setShowModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ name: "", points: "", icon: "⭐" });

  const openAdd = () => { setEdit(null); setForm({ name: "", points: "", icon: "⭐" }); setShowModal(true); };
  const openEdit = (t) => { setEdit(t); setForm({ name: t.name, points: t.points, icon: t.icon || "⭐" }); setShowModal(true); };

  const save = async () => {
    if (!form.name || !form.points) return;
    const data = { name: form.name, points: parseInt(form.points), icon: form.icon };
    if (edit) await fbSet(`volTasks/${edit._key}`, data);
    else await fbPush("volTasks", data);
    showToast("تم الحفظ ✅"); setShowModal(false); loadAll();
  };

  const del = async (key) => { await fbDelete(`volTasks/${key}`); showToast("تم الحذف", "error"); loadAll(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: C.blue, margin: 0, fontSize: 18 }}>⚙️ مهام الأفراد</h2>
        <button style={s.btn(C.green)} onClick={openAdd}>+ مهمة</button>
      </div>
      {volTasks.map(t => (
        <div key={t._key} style={{ ...s.card, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 18, marginLeft: 8 }}>{t.icon}</span>
            <b style={{ fontSize: 14 }}>{t.name}</b>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: C.gold, fontSize: 15 }}>{t.points} نق</span>
            <button style={s.btn(C.gold, true)} onClick={() => openEdit(t)}>✏️</button>
            <button style={s.btn(C.danger, true)} onClick={() => del(t._key)}>🗑️</button>
          </div>
        </div>
      ))}
      {showModal && (
        <Modal title={edit ? "تعديل مهمة" : "مهمة جديدة"} onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>الإيموجي</label>
            <input style={s.input} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={2} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>اسم المهمة</label>
            <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>النقاط</label>
            <input style={s.input} type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
          </div>
          <button style={{ ...s.btn(C.green), width: "100%" }} onClick={save}>حفظ ✅</button>
        </Modal>
      )}
    </div>
  );
}

// ─── Edit Teams Tab ───────────────────────────────────────────────────────────
function EditTeamsTab({ teams, loadAll, showToast }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const openEdit = (t) => { setEditing(t); setForm({ name: t.name, color: t.color, emoji: t.emoji }); };

  const save = async () => {
    await fbSet(`teams/${editing._key}`, { ...editing, name: form.name, color: form.color, emoji: form.emoji });
    showToast("تم تحديث التيم ✅"); setEditing(null); loadAll();
  };

  return (
    <div>
      <h2 style={{ color: C.blue, marginBottom: 16, fontSize: 18 }}>✏️ التيمات</h2>
      {teams.map(t => (
        <div key={t.id} style={{ ...s.card, borderRight: `5px solid ${t.color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 20 }}>{t.emoji} <b>{t.name}</b></div>
            <button style={s.btn(C.gold, true)} onClick={() => openEdit(t)}>✏️ تعديل</button>
          </div>
          {editing?._key === t._key && (
            <div style={{ marginTop: 14 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>الإيموجي</label>
                <input style={s.input} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={s.label}>اسم التيم</label>
                <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={s.label}>اللون</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer" }} />
                  <input style={{ ...s.input, flex: 1 }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...s.btn(C.green), flex: 1 }} onClick={save}>حفظ</button>
                <button style={{ ...s.btnOutline(), flex: 1 }} onClick={() => setEditing(null)}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Leader's Team View ───────────────────────────────────────────────────────
function LeaderTeam({ myTeam, volunteers, volLogs, moneyLogs, teamMissions, getVolPoints, getTeamMoneyTotal, getTeamVolPoints, getTeamTeamPoints }) {
  if (!myTeam) return <div style={{ textAlign: "center", padding: 40, color: C.muted }}>تيمك مش موجود</div>;

  const teamVols = Object.entries(volunteers)
    .filter(([, v]) => v.teamId === myTeam.id)
    .map(([id, v]) => ({ ...v, id, pts: getVolPoints(id) }))
    .sort((a, b) => b.pts - a.pts);

  const money = getTeamMoneyTotal(myTeam.id);
  const volPts = getTeamVolPoints(myTeam.id);
  const teamPts = getTeamTeamPoints(myTeam.id);
  const moneyPts = Math.floor(money / 10) + Math.floor(money / 3000) * 100;

  const missions = Object.entries(teamMissions)
    .filter(([, m]) => m.teamId === myTeam.id)
    .map(([k, m]) => ({ ...m, _key: k }));

  return (
    <div>
      <div style={{ ...s.card, background: `linear-gradient(135deg, ${myTeam.color}22, ${myTeam.color}11)`, borderRight: `5px solid ${myTeam.color}` }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>{myTeam.emoji}</div>
        <h2 style={{ textAlign: "center", color: myTeam.color, margin: "0 0 16px" }}>{myTeam.name}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[["نقاط أفراد", volPts, C.blue], ["نقاط تيم", teamPts, C.green], ["نقاط تبرع", moneyPts, C.gold], ["جنيه", money, "#7c3aed"]].map(([label, val, col]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.8)", borderRadius: 12, padding: "10px 4px" }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: col }}>{val.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {missions.length > 0 && (
        <div style={s.card}>
          <h3 style={{ color: C.blue, marginTop: 0, fontSize: 15 }}>🎯 مهام التيم</h3>
          {missions.map(m => (
            <div key={m._key} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>🎯 {m.name}</div>
              <ProgressBar value={money} max={m.target || 1} milestones={m.milestones || []} color={myTeam.color} />
            </div>
          ))}
        </div>
      )}

      <h3 style={{ color: C.blue, marginBottom: 12, fontSize: 16 }}>👥 أعضاء التيم ({teamVols.length})</h3>
      {teamVols.map((v, i) => (
        <div key={v.id} style={{ ...s.card, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: C.muted, fontSize: 13 }}>#{i + 1}</span>
            <span style={{ fontWeight: 600 }}>{v.name}</span>
          </div>
          <span style={{ fontWeight: 800, color: myTeam.color, fontSize: 16 }}>{v.pts} نقطة</span>
        </div>
      ))}
    </div>
  );
}

// ─── Share Images Tab ─────────────────────────────────────────────────────────
function ShareTab({ teams, volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyTotal, getTeamMoneyPoints, isAdmin, fixedTeamId }) {
  const canvasRef = useRef(null);
  const [type, setType] = useState("daily");
  const [selTeam, setSelTeam] = useState(fixedTeamId || teams[0]?.id);
  const [preview, setPreview] = useState(null);

  const drawShare = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = 800; canvas.height = 900;

    // Background
    ctx.fillStyle = "#0A4976";
    ctx.fillRect(0, 0, 800, 900);

    // Header gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 200);
    grad.addColorStop(0, "#0d5fa0"); grad.addColorStop(1, "#0A4976");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 200);

    // Gold accent line
    ctx.fillStyle = "#FBAE42"; ctx.fillRect(0, 198, 800, 4);

    // Title
    ctx.fillStyle = "#FBAE42"; ctx.font = "bold 36px 'Segoe UI', Tahoma, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("سفراء الأضاحي 🌟", 400, 70);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "20px 'Segoe UI'";
    ctx.fillText(type === "daily" ? "أبطال اليوم" : type === "cumulative" ? "النتائج التراكمية" : "مقارنة التيمات", 400, 110);

    const now = new Date();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "14px 'Segoe UI'";
    ctx.fillText(now.toLocaleDateString("ar-EG"), 400, 150);

    if (type === "comparison" && isAdmin) {
      // All teams comparison
      const sorted = [...teams].map(t => ({
        ...t,
        total: getTeamVolPoints(t.id) + getTeamTeamPoints(t.id) + getTeamMoneyPoints(t.id),
      })).sort((a, b) => b.total - a.total);

      sorted.forEach((t, i) => {
        const y = 240 + i * 200;
        const medals = ["🥇", "🥈", "🥉"];
        ctx.fillStyle = t.color + "33"; roundRect(ctx, 60, y, 680, 160, 20);
        ctx.fillStyle = t.color; ctx.fillRect(60, y, 8, 160);
        ctx.fillStyle = "#fff"; ctx.font = "bold 28px 'Segoe UI'";
        ctx.textAlign = "right"; ctx.fillText(`${medals[i] || "#" + (i + 1)} ${t.emoji} ${t.name}`, 700, y + 50);
        ctx.font = "bold 40px 'Segoe UI'"; ctx.fillStyle = t.color;
        ctx.fillText(`${t.total.toLocaleString()} نقطة`, 700, y + 110);
      });
    } else {
      // Single team top 3
      const tid = parseInt(selTeam);
      const team = teams.find(t => t.id === tid);
      if (!team) return;
      const top = Object.entries(volunteers)
        .filter(([, v]) => v.teamId === tid)
        .map(([id, v]) => ({ ...v, id, pts: getVolPoints(id) }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 3);

      ctx.fillStyle = team.color; ctx.font = "bold 32px 'Segoe UI'";
      ctx.textAlign = "center"; ctx.fillText(`${team.emoji} ${team.name}`, 400, 250);

      const medals = ["🥇", "🥈", "🥉"];
      top.forEach((v, i) => {
        const y = 300 + i * 170;
        ctx.fillStyle = "rgba(255,255,255,0.08)"; roundRect(ctx, 80, y, 640, 140, 16);
        ctx.fillStyle = "#fff"; ctx.font = "bold 22px 'Segoe UI'"; ctx.textAlign = "right";
        ctx.fillText(`${medals[i]} ${v.name}`, 680, y + 50);
        ctx.fillStyle = "#FBAE42"; ctx.font = "bold 34px 'Segoe UI'";
        ctx.fillText(`${v.pts.toLocaleString()} نقطة`, 680, y + 100);
      });
    }

    // Footer
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(0, 820, 800, 80);
    ctx.fillStyle = "#FBAE42"; ctx.font = "bold 18px 'Segoe UI'"; ctx.textAlign = "center";
    ctx.fillText("إنت مش متطوع… إنت سفير 🌟", 400, 865);

    setPreview(canvas.toDataURL("image/png"));
  }, [type, selTeam, teams, volunteers, getVolPoints, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyPoints, isAdmin]);

  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath(); ctx.fill();
  };

  useEffect(() => { if (teams.length) drawShare(); }, [drawShare, teams]);

  const download = () => {
    const a = document.createElement("a");
    a.href = preview; a.download = `sofara-${type}-${Date.now()}.png`; a.click();
  };

  return (
    <div>
      <h2 style={{ color: C.blue, marginBottom: 16, fontSize: 18 }}>📤 مشاركة</h2>
      <div style={s.card}>
        <label style={s.label}>نوع الصورة</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {[["daily", "📅 يومي"], ["cumulative", "📊 تراكمي"], ...(isAdmin ? [["comparison", "🆚 مقارنة"]] : [])].map(([v, l]) => (
            <button key={v} style={s.tab(type === v)} onClick={() => setType(v)}>{l}</button>
          ))}
        </div>

        {type !== "comparison" && (
          <>
            <label style={s.label}>التيم</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {teams.map(t => <button key={t.id} style={s.tab(selTeam === t.id)} onClick={() => setSelTeam(t.id)}>{t.emoji} {t.name}</button>)}
            </div>
          </>
        )}

        <button style={{ ...s.btn(C.blue), width: "100%", marginBottom: 12 }} onClick={drawShare}>🎨 توليد الصورة</button>
        {preview && <button style={{ ...s.btn(C.green), width: "100%" }} onClick={download}>⬇️ تحميل</button>}
      </div>

      {preview && <img src={preview} alt="preview" style={{ width: "100%", borderRadius: 16, marginTop: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

// ─── Weekly Winner Tab ────────────────────────────────────────────────────────
function WeeklyWinnerTab({ teams, volunteers, weeklyWinners, getTeamVolPoints, getTeamTeamPoints, getTeamMoneyPoints, getVolPoints, loadAll, showToast }) {
  const [form, setForm] = useState({ note: "" });
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);
  const [preview, setPreview] = useState(null);

  const ranked = [...teams].map(t => ({
    ...t,
    total: getTeamVolPoints(t.id) + getTeamTeamPoints(t.id) + getTeamMoneyPoints(t.id),
  })).sort((a, b) => b.total - a.total);

  const topVol = Object.entries(volunteers)
    .map(([id, v]) => ({ ...v, id, pts: getVolPoints(id) }))
    .sort((a, b) => b.pts - a.pts)[0];

  const winner = ranked[0];

  const saveWinner = async () => {
    setLoading(true);
    await fbPush("weeklyWinners", {
      date: new Date().toISOString(),
      teamWinner: winner?.name,
      topVolName: topVol?.name,
      topVolPoints: topVol?.pts,
      note: form.note,
    });
    showToast("تم حفظ الحسم الأسبوعي ✅");
    setLoading(false); loadAll();
  };

  const drawWinner = () => {
    const canvas = canvasRef.current;
    if (!canvas || !winner) return;
    const ctx = canvas.getContext("2d");
    canvas.width = 800; canvas.height = 900;

    ctx.fillStyle = "#0A4976"; ctx.fillRect(0, 0, 800, 900);
    const grad = ctx.createRadialGradient(400, 400, 0, 400, 400, 600);
    grad.addColorStop(0, "#1a6fa8"); grad.addColorStop(1, "#0A4976");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 900);

    ctx.fillStyle = "#FBAE42"; ctx.font = "bold 40px 'Segoe UI', Tahoma";
    ctx.textAlign = "center"; ctx.fillText("🏆 الحسم الأسبوعي", 400, 80);

    ctx.fillStyle = winner.color + "44";
    ctx.beginPath(); ctx.arc(400, 320, 200, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = winner.color; ctx.font = "bold 100px 'Segoe UI'"; ctx.fillText(winner.emoji, 400, 370);
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px 'Segoe UI'"; ctx.fillText(winner.name, 400, 450);
    ctx.fillStyle = "#FBAE42"; ctx.font = "bold 28px 'Segoe UI'"; ctx.fillText(`${winner.total.toLocaleString()} نقطة`, 400, 500);

    if (topVol) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect(150, 560, 500, 100, 20); ctx.fill();
      ctx.fillStyle = "#FBAE42"; ctx.font = "bold 18px 'Segoe UI'"; ctx.fillText("⭐ أفضل متطوع", 400, 600);
      ctx.fillStyle = "#fff"; ctx.font = "bold 24px 'Segoe UI'"; ctx.fillText(topVol.name, 400, 635);
      ctx.fillStyle = "#22C55E"; ctx.font = "16px 'Segoe UI'"; ctx.fillText(`${topVol.pts} نقطة`, 400, 660);
    }

    if (form.note) {
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "18px 'Segoe UI'"; ctx.fillText(form.note, 400, 720);
    }

    ctx.fillStyle = "#FBAE42"; ctx.font = "bold 18px 'Segoe UI'"; ctx.fillText("إنت مش متطوع… إنت سفير 🌟", 400, 860);
    setPreview(canvas.toDataURL("image/png"));
  };

  const download = () => {
    const a = document.createElement("a"); a.href = preview;
    a.download = `winner-${Date.now()}.png`; a.click();
  };

  const winnersList = Object.entries(weeklyWinners).sort((a, b) => new Date(b[1].date) - new Date(a[1].date));

  return (
    <div>
      <h2 style={{ color: C.blue, marginBottom: 16, fontSize: 18 }}>🗓️ الحسم الأسبوعي</h2>

      <div style={s.card}>
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          {winner && <><div style={{ fontSize: 60 }}>{winner.emoji}</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: winner.color, marginTop: 8 }}>{winner.name}</div>
          <div style={{ color: C.gold, fontWeight: 700 }}>{winner.total.toLocaleString()} نقطة</div></>}
          {topVol && <div style={{ marginTop: 12, color: C.muted, fontSize: 14 }}>⭐ أفضل متطوع: <b style={{ color: C.text }}>{topVol.name}</b> ({topVol.pts} نقطة)</div>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>رسالة خاصة (اختياري)</label>
          <input style={s.input} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="جملة تحفيزية..." />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ ...s.btn(C.gold), flex: 1 }} onClick={drawWinner}>🎨 توليد</button>
          <button style={{ ...s.btn(C.green), flex: 1 }} onClick={saveWinner} disabled={loading}>💾 حفظ</button>
        </div>
        {preview && (
          <>
            <img src={preview} style={{ width: "100%", borderRadius: 12, marginTop: 12 }} alt="winner" />
            <button style={{ ...s.btn(C.blue), width: "100%", marginTop: 8 }} onClick={download}>⬇️ تحميل</button>
          </>
        )}
      </div>

      {winnersList.length > 0 && (
        <>
          <h3 style={{ color: C.blue, marginBottom: 12 }}>السجل السابق</h3>
          {winnersList.slice(0, 5).map(([k, w]) => (
            <div key={k} style={{ ...s.card, padding: "12px 14px" }}>
              <div style={{ fontWeight: 700 }}>🏆 {w.teamWinner}</div>
              <div style={{ fontSize: 12, color: C.muted }}>⭐ {w.topVolName} — {w.topVolPoints} نقطة</div>
              {w.note && <div style={{ fontSize: 12, color: C.text, marginTop: 4 }}>{w.note}</div>}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{new Date(w.date).toLocaleDateString("ar-EG")}</div>
            </div>
          ))}
        </>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
