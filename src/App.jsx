import { useState, useEffect, useRef } from "react";

// ─── API CALL (goes through our secure backend) ───────────────────────────────
async function callAI(messages, system, maxTokens = 1200) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, max_tokens: maxTokens }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MATH_TOPICS = [
  "Sonlar nazariyasi", "Kasrlar", "Foizlar", "Nisbat va proporsiya",
  "Algebra asoslari", "Chiziqli tenglamalar", "Kvadrat tenglamalar",
  "Tengsizliklar", "Funktsiyalar", "Grafik chizish",
  "Ildizlar va darajalar", "Logarifmlar", "Trigonometriya asoslari",
  "Geometriya asoslari", "Uchburchaklar", "To'rtburchaklar va ko'pburchaklar",
  "Aylana va doira", "Koordinatalar sistemasi", "Vektorlar",
  "Matritsalar", "Kombinatorika", "Ehtimollik nazariyasi",
  "Statistika", "Ketma-ketliklar", "Arifmetik progressiya",
  "Geometrik progressiya", "Integral", "Differentsial hisob",
  "Limit nazariyasi", "Kompleks sonlar"
];

const DIFFICULTY = ["", "Boshlang'ich", "O'rta-quyi", "O'rta", "O'rta-yuqori",
  "Yuqori-quyi", "Yuqori", "Ilg'or-quyi", "Ilg'or", "Ekspert-quyi", "Ekspert"];

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg: "#07090F", panel: "#0E1320", card: "#111827",
  border: "#1A2540", borderHi: "#2A3F60",
  accent: "#38BDF8", accent2: "#818CF8", accent3: "#34D399",
  warn: "#FBBF24", danger: "#F87171",
  text: "#E2E8F0", muted: "#64748B", faint: "#1E293B",
  font: "'Sora',sans-serif", mono: "'JetBrains Mono',monospace",
};

const globalCSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:${C.bg};color:${C.text};font-family:${C.font};-webkit-font-smoothing:antialiased}
input,button,textarea{font-family:${C.font}}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:${C.panel}}
::-webkit-scrollbar-thumb{background:${C.accent};border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.fadeUp{animation:fadeUp .35s ease forwards}
.spin{animation:spin .8s linear infinite}
`;

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
const Spinner = ({ s = 18, c = C.accent }) => (
  <span style={{
    display: "inline-block", width: s, height: s,
    border: `2px solid ${c}30`, borderTopColor: c,
    borderRadius: "50%", animation: "spin .8s linear infinite",
  }} />
);

const Tag = ({ children, color = C.accent }) => (
  <span style={{
    display: "inline-block", padding: "2px 10px", borderRadius: 20,
    background: `${color}18`, color, border: `1px solid ${color}35`,
    fontSize: 12, fontWeight: 600, lineHeight: "20px",
  }}>{children}</span>
);

function Btn({ children, onClick, variant = "primary", disabled, small, full, style = {} }) {
  const v = {
    primary: { bg: `linear-gradient(135deg,${C.accent},${C.accent2})`, fg: "#fff", bdr: "none" },
    success: { bg: `linear-gradient(135deg,${C.accent3},#059669)`, fg: "#fff", bdr: "none" },
    ghost:   { bg: `${C.accent}14`, fg: C.accent, bdr: `1px solid ${C.accent}30` },
    outline: { bg: "transparent", fg: C.muted, bdr: `1px solid ${C.border}` },
    danger:  { bg: `${C.danger}18`, fg: C.danger, bdr: `1px solid ${C.danger}35` },
  }[variant];
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        padding: small ? "6px 14px" : "10px 22px",
        borderRadius: 10, border: v.bdr, background: v.bg, color: v.fg,
        fontWeight: 600, fontSize: small ? 13 : 14, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .45 : 1, transition: "opacity .15s, transform .1s",
        width: full ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
    >{children}</button>
  );
}

function Card({ children, style = {}, hi = false }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: 20,
      border: `1px solid ${hi ? C.borderHi : C.border}`, ...style,
    }}>{children}</div>
  );
}

// ─── STORAGE HELPERS ──────────────────────────────────────────────────────────
const DB = {
  getUsers: () => { try { return JSON.parse(localStorage.getItem("mu_users") || "{}"); } catch { return {}; } },
  saveUsers: (u) => localStorage.setItem("mu_users", JSON.stringify(u)),
  getCurrent: () => { try { return JSON.parse(localStorage.getItem("mu_me") || "null"); } catch { return null; } },
  saveCurrent: (u) => u ? localStorage.setItem("mu_me", JSON.stringify(u)) : localStorage.removeItem("mu_me"),
};

function userKey(name, surname) {
  return `${name.trim().toLowerCase()}_${surname.trim().toLowerCase()}`;
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("auth");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const me = DB.getCurrent();
    if (me) { setUser(me); setPage("home"); }
  }, []);

  function saveUser(u) {
    const users = DB.getUsers();
    users[userKey(u.name, u.surname)] = u;
    DB.saveUsers(users);
    DB.saveCurrent(u);
    setUser(u);
  }

  function handleRegister(name, surname) {
    const users = DB.getUsers();
    const key = userKey(name, surname);
    if (users[key]) return "Bu ism-familiya allaqachon ro'yxatda!";
    const u = {
      name: name.trim(), surname: surname.trim(),
      level: 1, totalTests: 0, totalCorrect: 0,
      weakTopics: {}, streak: 0, lastDate: "",
      achievements: [], testHistory: [],
    };
    users[key] = u;
    DB.saveUsers(users);
    DB.saveCurrent(u);
    setUser(u);
    setPage("home");
    return null;
  }

  function handleLogin(name, surname) {
    const users = DB.getUsers();
    const key = userKey(name, surname);
    if (!users[key]) return "Foydalanuvchi topilmadi!";
    DB.saveCurrent(users[key]);
    setUser(users[key]);
    setPage("home");
    return null;
  }

  function handleLogout() {
    DB.saveCurrent(null);
    setUser(null);
    setPage("auth");
  }

  const nav = (p) => setPage(p);

  return (
    <>
      <style>{globalCSS}</style>
      {page === "auth" && <AuthPage onRegister={handleRegister} onLogin={handleLogin} />}
      {page === "home" && <HomePage user={user} nav={nav} onLogout={handleLogout} />}
      {page === "test" && <TestPage user={user} saveUser={saveUser} nav={nav} />}
      {page === "learn" && <LearnPage user={user} nav={nav} />}
      {page === "stats" && <StatsPage user={user} nav={nav} />}
    </>
  );
}

// ─── AUTH PAGE ────────────────────────────────────────────────────────────────
function AuthPage({ onRegister, onLogin }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit() {
    setError("");
    if (!name.trim() || !surname.trim()) { setError("Ism va familiyani kiriting!"); return; }
    setLoading(true);
    const err = tab === "login" ? onLogin(name, surname) : onRegister(name, surname);
    setLoading(false);
    if (err) setError(err);
  }

  const inp = {
    width: "100%", padding: "11px 14px",
    background: C.panel, border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.text, fontSize: 14, outline: "none",
    transition: "border-color .2s",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: `radial-gradient(ellipse 60% 50% at 30% 20%,${C.accent}12 0%,transparent 60%),
                   radial-gradient(ellipse 50% 40% at 70% 80%,${C.accent2}12 0%,transparent 60%), ${C.bg}`,
      padding: 20,
    }}>
      <div className="fadeUp" style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, lineHeight: 1 }}>∑</div>
          <h1 style={{
            fontSize: 30, fontWeight: 800, marginTop: 8,
            background: `linear-gradient(135deg,${C.accent},${C.accent2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>MathAI Ustoz</h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
            Matematikani AI bilan o'rgan
          </p>
        </div>

        <Card>
          {/* Tab switcher */}
          <div style={{
            display: "flex", background: C.bg, borderRadius: 10,
            padding: 4, marginBottom: 22,
          }}>
            {[["login","Kirish"],["register","Ro'yxatdan o'tish"]].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 8, border: "none",
                  background: tab === t ? `linear-gradient(135deg,${C.accent},${C.accent2})` : "transparent",
                  color: tab === t ? "#fff" : C.muted,
                  fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: C.font,
                  transition: "all .2s",
                }}>{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Ism</label>
              <input
                style={inp} value={name} placeholder="Masalan: Alibek"
                onChange={e => setName(e.target.value)}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Familiya</label>
              <input
                style={inp} value={surname} placeholder="Masalan: Karimov"
                onChange={e => setSurname(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>

            {error && (
              <div style={{
                background: `${C.danger}15`, border: `1px solid ${C.danger}35`,
                borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.danger,
              }}>⚠ {error}</div>
            )}

            <Btn onClick={submit} disabled={loading} full>
              {loading ? <Spinner s={16} c="#fff" /> : tab === "login" ? "🚀 Kirish" : "✨ Ro'yxatdan o'tish"}
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ user, nav, onLogout }) {
  const acc = user.totalTests > 0
    ? Math.round((user.totalCorrect / (user.totalTests * 30)) * 100) : 0;
  const weakCount = Object.values(user.weakTopics || {})
    .filter(v => v.correct / v.total < 0.6).length;

  const levelEmoji = user.level <= 3 ? "🌱" : user.level <= 6 ? "🔥" : user.level <= 9 ? "⚡" : "👑";
  const levelLabel = user.level <= 3 ? "Boshlang'ich" : user.level <= 6 ? "O'rta" : user.level <= 9 ? "Ilg'or" : "Master";

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "20px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28, paddingTop:8 }}>
          <div>
            <p style={{ color: C.muted, fontSize: 12 }}>Xush kelibsiz 👋</p>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.name} {user.surname}</h2>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <Btn onClick={() => nav("stats")} variant="ghost" small>📊 Statistika</Btn>
            <Btn onClick={onLogout} variant="outline" small>Chiqish</Btn>
          </div>
        </div>

        {/* Level banner */}
        <div style={{
          borderRadius: 18, padding: "22px 24px", marginBottom: 18,
          background: `linear-gradient(135deg, ${C.accent}22, ${C.accent2}18)`,
          border: `1px solid ${C.accent}35`,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <p style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>Joriy daraja</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 800, color: C.accent, lineHeight: 1 }}>{user.level}</span>
              <span style={{ color: C.muted, fontSize: 14 }}>/ 10</span>
            </div>
            <Tag color={acc >= 70 ? C.accent3 : C.warn}>{levelEmoji} {levelLabel}</Tag>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { v: user.totalTests || 0, l: "Test" },
                { v: `${acc}%`, l: "Aniqlik" },
                { v: `${user.streak || 0}🔥`, l: "Streak" },
              ].map(s => (
                <div key={s.l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weak topics alert */}
        {weakCount > 0 && (
          <div style={{
            background: `${C.warn}12`, border: `1px solid ${C.warn}35`,
            borderRadius: 12, padding: "12px 16px", marginBottom: 18,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>⚠</span>
            <div>
              <p style={{ fontWeight: 600, color: C.warn, fontSize: 14 }}>
                {weakCount} ta zaif mavzu aniqlandi
              </p>
              <p style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                Keyingi testda bu mavzulardan ko'proq savol beradi
              </p>
            </div>
            <Btn onClick={() => nav("learn")} variant="warn" small style={{ marginLeft: "auto",
              background: `${C.warn}20`, color: C.warn, border: `1px solid ${C.warn}40` }}>
              O'rganish
            </Btn>
          </div>
        )}

        {/* Action cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <ActionCard
            emoji="🧠" title="Test Yechish"
            desc={`Darajangizga mos ${user.level <= 3 ? "oson" : user.level <= 6 ? "o'rta" : "qiyin"} savollar. AI har safar yangi generatsiya qiladi.`}
            color={C.accent} btnLabel="Testni boshlash →"
            onClick={() => nav("test")}
          />
          <ActionCard
            emoji="📚" title="Darsliklar"
            desc="30 ta mavzu bo'yicha nazariya, formulalar va yechilgan misollar."
            color={C.accent2} btnLabel="O'rganish →"
            variant="ghost2"
            onClick={() => nav("learn")}
          />
        </div>

        {/* Last test history */}
        {user.testHistory?.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <p style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, color: C.accent }}>
              📈 So'nggi natijalar
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 60 }}>
              {user.testHistory.slice(-10).map((t, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{
                    width: "100%", minHeight: 3,
                    height: `${Math.max(4, (t.score / 30) * 52)}px`,
                    background: t.score >= 25 ? C.accent3 : t.score >= 18 ? C.accent : C.warn,
                    borderRadius: "3px 3px 0 0",
                  }} />
                  <span style={{ fontSize: 10, color: C.muted }}>{t.score}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function ActionCard({ emoji, title, desc, color, btnLabel, onClick, variant }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, border: `1px solid ${color}35`,
        borderRadius: 16, padding: 20, cursor: "pointer",
        transition: "transform .15s, border-color .15s",
        background: `linear-gradient(145deg,${color}10,${C.card})`,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = `${color}70`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = `${color}35`; }}
    >
      <div style={{ fontSize: 36, marginBottom: 10 }}>{emoji}</div>
      <h3 style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 16 }}>{desc}</p>
      <Btn onClick={onClick} full style={{
        background: `${color}20`, color, border: `1px solid ${color}40`,
      }}>{btnLabel}</Btn>
    </div>
  );
}

// ─── TEST PAGE ────────────────────────────────────────────────────────────────
function TestPage({ user, saveUser, nav }) {
  const [phase, setPhase] = useState("loading"); // loading | quiz | results | analysis
  const [questions, setQuestions] = useState([]);
  const [qi, setQi] = useState(0);          // question index
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [results, setResults] = useState([]);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [levelChanged, setLevelChanged] = useState("");
  const [genError, setGenError] = useState("");
  const resultsRef = useRef([]);

  useEffect(() => { generateQuestions(); }, []);

  async function generateQuestions() {
    setPhase("loading");
    setGenError("");
    setResults([]);
    resultsRef.current = [];
    setQi(0);
    setSelected(null);
    setConfirmed(false);

    // Topic selection — takrorlanmaslik uchun shuffle + seed
    const weak = user.weakTopics || {};
    const weakKeys = Object.keys(weak).filter(k => weak[k].correct / weak[k].total < 0.6);

    // Fisher-Yates shuffle with time seed — har safar boshqa tartib
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    let topics = [];
    if (weakKeys.length > 0 && user.totalTests > 0) {
      // Zaif mavzular: max 10 ta slot, qolgani boshqa mavzulardan
      const weakShuffled = shuffle(weakKeys).slice(0, 10);
      const others = shuffle(MATH_TOPICS.filter(t => !weakKeys.includes(t)));
      // Zaif + boshqalar, jami 30, takrorsiz
      topics = [...weakShuffled, ...others].slice(0, 30);
      // Agar 30 ta bo'lmasa to'ldirish
      while (topics.length < 30) topics.push(shuffle(MATH_TOPICS)[topics.length % 30]);
    } else {
      // Birinchi test: barcha 30 mavzu, random tartibda
      topics = shuffle(MATH_TOPICS).slice(0, 30);
    }

    // Daraja bo'yicha qat'iy qoidalar
    const levelRules = {
      1: "FAQAT oddiy arifmetika: qo'shish, ayirish, ko'paytirish, bo'lish. Masalan: 24+18=?, 56-29=?, 7×8=?, 48÷6=?. Integral, ildiz, logarifm, daraja MUTLAQO YO'Q.",
      2: "Oddiy kasrlar va foizlar. Masalan: 1/2+1/4=?, 3/5-1/5=?, 40 ning 25%i=?. Integral, logarifm YO'Q.",
      3: "Kasrlar, foizlar, oddiy nisbatlar. Masalan: 2/3×9=?, 60 ning 30%i=?, 15:3=?. Integral YO'Q.",
      4: "Oddiy algebra va ildizlar. Masalan: x+7=15, 3x=21, √49=?, √81=?. Integral YO'Q.",
      5: "Chiziqli tenglamalar, oddiy geometriya. Masalan: 2x+3=11, to'rtburchak yuzi a=5 b=3. Integral YO'Q.",
      6: "Kvadrat tenglamalar, sin/cos asoslari. Masalan: x²-5x+6=0, sin30°=?.",
      7: "Logarifmlar, murakkab trigonometriya. Masalan: log₂8=?, 2sin²x+2cos²x=?.",
      8: "Kombinatorika, progressiyalar, murakkab log. Masalan: C(5,2)=?, 1+3+5+...+19=?.",
      9: "Hosilalar, murakkab funksiyalar. Masalan: f(x)=x²+3x, f'(x)=?.",
      10: "Integral, differentsial tenglamalar. Masalan: ∫(2x+1)dx=?, murakkab masalalar.",
    }[user.level] || "o'rta daraja";

    const SYSTEM = "Siz matematik test yaratuvchi AI siz. FAQAT sof JSON array qaytaring. Boshida [ belgisi, oxirida ] belgisi bo'lsin. Hech qanday ``` kod bloki, izoh yoki qo'shimcha matn YO'Q.";

    // Har batch uchun random raqamlar generatsiya — takrorlanmaslik uchun
    const randNums = () => {
      const a = Math.floor(Math.random()*50)+2;
      const b = Math.floor(Math.random()*30)+2;
      return {a, b, c: a+b, d: a-b, e: a*b};
    };

    function makePrompt(batchTopics) {
      const r = randNums();
      return `O'zbek tilida matematika testi. ANIQ ${batchTopics.length} ta savol yarat.

DARAJA ${user.level}/10: ${levelRules}

Har bir mavzu uchun 1 ta savol (tartibda):
${batchTopics.map((t,i)=>`${i+1}. ${t}`).join("\n")}

MAJBURIY QOIDALAR:
1. Har savol ANIQ raqamlar bilan: masalan "${r.a} + ${r.b} = ?" yoki "x + ${r.b} = ${r.c}, x = ?"
2. Savol matni kamida 10 belgi bo'lsin
3. "correct" — opts massividagi to'g'ri javobning AYNAN o'zi (nusxa ko'chir)
4. To'g'ri javob A, B, C, D da HAR XIL joylashsin
5. Barcha ${batchTopics.length} ta mavzu uchun savol bo'lishi SHART

JSON (faqat bu format, hech narsa qo'shma):
[{"topic":"mavzu","q":"to'liq savol?","opts":["A) qiymat1","B) qiymat2","C) qiymat3","D) qiymat4"],"correct":"B) qiymat2","exp":"qisqa yechim"}]`;
    }

    // Bir batch uchun so'rov + qayta urinish
    async function fetchBatch(batchTopics, attempt = 0) {
      const raw = await callAI([{ role:"user", content: makePrompt(batchTopics) }], SYSTEM, 2500);
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) { if (attempt < 2) return fetchBatch(batchTopics, attempt+1); return []; }
      try {
        const arr = JSON.parse(match[0]);
        const valid = arr.filter(q =>
          q.q && q.q.length >= 8 &&
          Array.isArray(q.opts) && q.opts.length === 4 &&
          q.opts.every(o => typeof o === "string" && o.length > 2) &&
          typeof q.correct === "string" && q.opts.includes(q.correct)
        ).map((q, i) => ({
          ...q,
          ans: q.opts.indexOf(q.correct),
          _topic: batchTopics[i] || q.topic || batchTopics[0],
        }));
        // Agar yetarli kelmasa qayta urinish (max 2 marta)
        if (valid.length < batchTopics.length * 0.6 && attempt < 2) {
          return fetchBatch(batchTopics, attempt + 1);
        }
        return valid;
      } catch {
        if (attempt < 2) return fetchBatch(batchTopics, attempt + 1);
        return [];
      }
    }

    try {
      const batch1 = topics.slice(0, 10);
      const batch2 = topics.slice(10, 20);
      const batch3 = topics.slice(20, 30);

      // Parallel so'rovlar
      const [q1, q2, q3] = await Promise.all([
        fetchBatch(batch1),
        fetchBatch(batch2),
        fetchBatch(batch3),
      ]);

      const all = [...q1, ...q2, ...q3];

      if (all.length < 10) {
        setGenError(`Savollar yetarli kelmadi (${all.length} ta). Internet yoki API kalitini tekshiring.`);
        setPhase("error");
        return;
      }

      // Aniq savollar sonini saqlash (nechtasi kelsa shuncha)
      setQuestions(all);
      setPhase("quiz");
    } catch (e) {
      setGenError("AI bilan bog'lanishda xatolik. Qaytadan urinib ko'ring.");
      setPhase("error");
    }
  }

  function confirm() {
    if (selected === null) return;
    const q = questions[qi];
    const correct = selected === q.ans;
    const newEntry = {
      topic: q.topic || q._topic,
      correct, question: q.q,
      explanation: q.exp,
      selectedIdx: selected, correctIdx: q.ans, options: q.opts,
    };
    const updated = [...resultsRef.current, newEntry];
    resultsRef.current = updated;
    setResults(updated);
    setConfirmed(true);
  }

  async function next() {
    const total = questions.length;
    if (qi + 1 >= total) {
      await finishTest(resultsRef.current);
    } else {
      setQi(i => i + 1);
      setSelected(null);
      setConfirmed(false);
    }
  }

  async function finishTest(res) {
    setPhase("results");
    setAnalysisLoading(true);

    const correct = res.filter(r => r.correct).length;

    // Topic stats
    const topicStats = {};
    res.forEach(r => {
      if (!topicStats[r.topic]) topicStats[r.topic] = { total: 0, correct: 0 };
      topicStats[r.topic].total++;
      if (r.correct) topicStats[r.topic].correct++;
    });

    // Merge weak topics
    const newWeak = { ...user.weakTopics };
    Object.entries(topicStats).forEach(([t, s]) => {
      if (!newWeak[t]) newWeak[t] = { total: 0, correct: 0 };
      newWeak[t].total += s.total;
      newWeak[t].correct += s.correct;
    });

    const pct = correct / questions.length; // questions.length — kelgan savollar soni
    let newLevel = user.level;
    let lvlChanged = "";
    if (pct >= 0.70 && user.level < 10) { newLevel = user.level + 1; lvlChanged = "up"; }
    else if (pct < 0.40 && user.level > 1) { newLevel = user.level - 1; lvlChanged = "down"; }
    setLevelChanged(lvlChanged);

    // Streak
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = user.lastDate === yesterday ? (user.streak || 0) + 1
      : user.lastDate === today ? user.streak : 1;

    // Achievements
    const achs = [...(user.achievements || [])];
    if (correct === 30 && !achs.includes("perfect")) achs.push("perfect");
    if (newStreak >= 7 && !achs.includes("streak7")) achs.push("streak7");
    if (newLevel === 10 && !achs.includes("master")) achs.push("master");

    const updated = {
      ...user, level: newLevel, totalTests: user.totalTests + 1,
      totalCorrect: (user.totalCorrect || 0) + correct,
      weakTopics: newWeak, streak: newStreak, lastDate: today,
      achievements: achs,
      testHistory: [...(user.testHistory || []).slice(-29), { 
        date: today, score: correct, level: newLevel, 
        pct: Math.round(pct * 100), levelChanged: lvlChanged
      }],
    };
    saveUser(updated);

    // AI analysis for failed topics
    const failed = Object.entries(topicStats)
      .filter(([, s]) => s.correct < s.total)
      .map(([t, s]) => `${t} (${s.correct}/${s.total} to'g'ri)`);

    if (failed.length > 0) {
      try {
        const txt = await callAI(
          [{ role: "user", content: `O'quvchi quyidagi mavzularda xato qildi: ${failed.join(", ")}.\n\nHar bir mavzu uchun yoz:\n🔴 Mavzu: [nom]\n📖 Asosiy nazariya: ...\n📐 Formula: ...\n✏ Misol: ...\n\nO'zbek tilida, qisqa va aniq.` }],
          "Siz matematika o'qituvchisisiz. O'zbek tilida aniq tushuntirish bering.",
          2000
        );
        setAnalysis(txt);
      } catch { setAnalysis("Tahlil yuklanmadi."); }
    } else {
      setAnalysis("🎉 Barcha mavzularda yaxshi natija! Zo'r!");
    }
    setAnalysisLoading(false);
  }

  // ── RENDER: loading ──
  if (phase === "loading") return (
    <FullCenter>
      <Spinner s={40} />
      <p style={{ color: C.muted, marginTop: 16 }}>AI {user.level}-daraja savollarini tayyorlamoqda...</p>
      <Btn onClick={() => nav("home")} variant="outline" small style={{ marginTop: 20 }}>← Orqaga</Btn>
    </FullCenter>
  );

  if (phase === "error") return (
    <FullCenter>
      <p style={{ color: C.danger, marginBottom: 16 }}>{genError}</p>
      <Btn onClick={generateQuestions}>🔄 Qaytadan urinish</Btn>
      <Btn onClick={() => nav("home")} variant="outline" small style={{ marginTop: 10 }}>← Orqaga</Btn>
    </FullCenter>
  );

  // ── RENDER: quiz ──
  if (phase === "quiz" && questions.length > 0) {
    const q = questions[qi];
    const progress = ((qi) / 30) * 100;

    return (
      <div style={{ minHeight: "100vh", background: C.bg, padding: "16px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {/* Top bar */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8, marginBottom:16 }}>
            <Btn onClick={() => nav("home")} variant="outline" small>← Chiqish</Btn>
            <span style={{ fontWeight:700, fontSize:15 }}>
              <span style={{ color: C.accent }}>{qi + 1}</span>
              <span style={{ color: C.muted }}> / {questions.length}</span>
            </span>
            <Tag color={C.accent2}>{DIFFICULTY[user.level]}</Tag>
          </div>

          {/* Progress bar */}
          <div style={{ height:4, background:C.faint, borderRadius:4, marginBottom:20 }}>
            <div style={{ height:"100%", width:`${(qi / questions.length) * 100}%`,
              background:`linear-gradient(90deg,${C.accent},${C.accent2})`,
              borderRadius:4, transition:"width .4s" }} />
          </div>

          <Card className="fadeUp" hi>
            <Tag color={C.accent3} style={{ marginBottom:12 }}>{q.topic || q._topic}</Tag>
            <p style={{ fontSize:18, fontWeight:600, lineHeight:1.65, margin:"10px 0 20px" }}>
              {q.q}
            </p>

            {/* Options */}
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {q.opts.map((opt, i) => {
                let bg = C.faint, border = `1px solid ${C.border}`, color = C.text, fw = 400;
                if (confirmed) {
                  if (i === q.ans) { bg=`${C.accent3}20`; border=`1px solid ${C.accent3}`; color=C.accent3; fw=700; }
                  else if (i === selected) { bg=`${C.danger}15`; border=`1px solid ${C.danger}`; color=C.danger; }
                } else if (selected === i) {
                  bg=`${C.accent}18`; border=`1px solid ${C.accent}`; color=C.accent; fw=600;
                }
                return (
                  <button key={i} onClick={() => !confirmed && setSelected(i)}
                    style={{
                      padding:"11px 15px", borderRadius:10, border, background:bg, color,
                      fontFamily:C.font, fontSize:15, textAlign:"left",
                      cursor:confirmed?"default":"pointer", transition:"all .15s", fontWeight:fw,
                    }}>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {confirmed && (
              <div className="fadeUp" style={{
                marginTop:14, padding:"10px 14px",
                background:`${C.accent3}12`, border:`1px solid ${C.accent3}35`, borderRadius:10,
              }}>
                <p style={{ fontSize:13, color:C.accent3, lineHeight:1.7 }}>💡 {q.exp}</p>
              </div>
            )}

            <div style={{ marginTop:18, display:"flex", gap:10 }}>
              {!confirmed
                ? <Btn onClick={confirm} disabled={selected===null} full>✔ Tasdiqlash</Btn>
                : <Btn onClick={next} variant="success" full>
                    {qi + 1 >= questions.length ? "🏁 Testni yakunlash" : "Keyingisi →"}
                  </Btn>
              }
            </div>
          </Card>

          <ChatBox systemPrompt="Siz matematik AI Ustoz siz. FAQAT matematikaga oid savollarga o'zbek tilida javob bering. Matematika bilan bog'liq bo'lmagan savollarga: 'Men faqat matematika bo'yicha yordam bera olaman' de." />
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const total = results.length;
    const correct = results.filter(r => r.correct).length;
    const pct = Math.round((correct / Math.max(total, 1)) * 100);
    const topicBreakdown = {};
    results.forEach(r => {
      if (!topicBreakdown[r.topic]) topicBreakdown[r.topic] = { t:0, c:0 };
      topicBreakdown[r.topic].t++;
      if (r.correct) topicBreakdown[r.topic].c++;
    });

    return (
      <div style={{ minHeight:"100vh", background:C.bg, padding:"16px" }}>
        <div style={{ maxWidth:720, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:8, marginBottom:20 }}>
            <h2 style={{ fontSize:20, fontWeight:800 }}>📊 Test natijalari</h2>
            <Btn onClick={() => nav("home")} variant="ghost" small>🏠 Bosh sahifa</Btn>
          </div>

          {/* Score */}
          <Card style={{ textAlign:"center", marginBottom:14,
            background:`linear-gradient(135deg,${pct>=70?C.accent3:C.danger}18,${C.card})`,
            border:`1px solid ${pct>=70?C.accent3:C.danger}40` }}>
            <div style={{ fontSize:58, fontWeight:800,
              color:pct>=70?C.accent3:pct>=50?C.warn:C.danger }}>
              {correct}/{total}
            </div>
            <div style={{ fontSize:24, color:C.muted, fontWeight:700 }}>{pct}%</div>
            <div style={{ fontSize:20, marginTop:8 }}>
              {pct>=70?"🏆 Ajoyib!":pct>=50?"👍 Yaxshi!":"💪 Ko'proq mashq kerak!"}
            </div>
            {/* Daraja o'zgardi xabari — state dan o'qiymiz */}
            {levelChanged === "up" && (
              <div className="fadeUp" style={{ marginTop:12, padding:"10px 16px",
                background:`${C.accent3}20`, border:`1px solid ${C.accent3}50`,
                borderRadius:10, fontSize:16, fontWeight:700, color:C.accent3 }}>
                🎉 Tabriklaymiz! Daraja oshdi → {user.level}
              </div>
            )}
            {levelChanged === "down" && (
              <div className="fadeUp" style={{ marginTop:12, padding:"10px 16px",
                background:`${C.warn}20`, border:`1px solid ${C.warn}50`,
                borderRadius:10, fontSize:14, fontWeight:600, color:C.warn }}>
                ⬇ Daraja tushdi → {user.level}. Ko'proq mashq qiling!
              </div>
            )}
            <div style={{ marginTop:10, fontSize:13, color:C.muted }}>
              Daraja oshish: 70%+ · Daraja tushish: 40%-
            </div>
          </Card>

          {/* Topic breakdown */}
          <Card style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, color:C.accent, marginBottom:14 }}>Mavzular bo'yicha</p>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {Object.entries(topicBreakdown).map(([t,s]) => (
                <div key={t} style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{
                    width:7, height:7, borderRadius:"50%", flexShrink:0,
                    background:s.c===s.t?C.accent3:s.c>0?C.warn:C.danger
                  }} />
                  <span style={{ flex:1, fontSize:13 }}>{t}</span>
                  <span style={{ fontSize:13, fontWeight:600,
                    color:s.c===s.t?C.accent3:s.c>0?C.warn:C.danger }}>
                    {s.c}/{s.t}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Analysis */}
          <Card style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, color:C.accent2, marginBottom:12 }}>
              🤖 AI Tahlil va Tushuntirish
            </p>
            {analysisLoading
              ? <div style={{ display:"flex", gap:10, alignItems:"center", color:C.muted }}>
                  <Spinner s={16} c={C.accent2} /> Tahlil qilinmoqda...
                </div>
              : <p style={{ fontSize:13, lineHeight:1.85, whiteSpace:"pre-wrap" }}>{analysis}</p>
            }
          </Card>

          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={generateQuestions} full>🔄 Yangi test</Btn>
            <Btn onClick={() => nav("learn")} variant="ghost" full>📚 Darsliklar</Btn>
          </div>

          <ChatBox systemPrompt="Siz matematik AI Ustoz siz. FAQAT matematikaga oid savollarga o'zbek tilida javob bering." />
        </div>
      </div>
    );
  }
  return null;
}

// ─── LEARN PAGE ───────────────────────────────────────────────────────────────
function LearnPage({ user, nav }) {
  const [topic, setTopic] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = MATH_TOPICS.filter(t => t.toLowerCase().includes(search.toLowerCase()));
  const weak = user.weakTopics || {};

  async function loadTopic(t) {
    setTopic(t);
    setContent("");
    setLoading(true);
    try {
      const txt = await callAI(
        [{ role:"user", content:`"${t}" mavzusini o'zbek tilida to'liq tushuntirib ber:\n\n## Nazariya\n(asosiy ta'rif)\n\n## Formulalar\n(asosiy formulalar)\n\n## Yechilgan misollar\n(2 ta misol batafsil yechim bilan)\n\n## Esda saqla\n(qisqa maslahatlar)\n\nAniq, tushunarli va foydali yoz.` }],
        "Siz o'zbek tilida matematika darsligini yozuvchi ekspert siz.",
        1800
      );
      setContent(txt);
    } catch { setContent("Kontent yuklanmadi. Qaytadan urinib ko'ring."); }
    setLoading(false);
  }

  function isWeak(t) {
    const w = weak[t];
    return w && w.correct / w.total < 0.6;
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"16px" }}>
      <div style={{ maxWidth:920, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          paddingTop:8, marginBottom:22 }}>
          <h2 style={{ fontSize:20, fontWeight:800 }}>📚 Darsliklar</h2>
          <Btn onClick={() => nav("home")} variant="ghost" small>← Orqaga</Btn>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:topic?"260px 1fr":"1fr", gap:16 }}>
          {/* Topic list */}
          <div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Mavzu qidiring..."
              style={{
                width:"100%", padding:"9px 14px", background:C.panel,
                border:`1px solid ${C.border}`, borderRadius:10, color:C.text,
                fontSize:14, outline:"none", marginBottom:12,
              }} />

            <div style={{
              display:"grid",
              gridTemplateColumns:topic?"1fr":"repeat(auto-fill,minmax(155px,1fr))",
              gap:8, maxHeight:topic?"78vh":"none", overflowY:topic?"auto":"visible",
            }}>
              {filtered.map(t => (
                <button key={t} onClick={() => loadTopic(t)}
                  style={{
                    padding:topic?"9px 12px":"14px 12px",
                    borderRadius:10, textAlign:"left",
                    background:topic===t?`${C.accent2}18`:C.card,
                    border:`1px solid ${topic===t?C.accent2:isWeak(t)?C.warn+"50":C.border}`,
                    color:topic===t?C.accent2:isWeak(t)?C.warn:C.text,
                    fontFamily:C.font, fontSize:topic?12:13, cursor:"pointer", fontWeight:topic===t?700:400,
                    transition:"all .15s",
                  }}>
                  {isWeak(t)?"⚠ ":""}{t}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {topic && (
            <div className="fadeUp">
              <Card hi style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                  <div>
                    <h3 style={{ fontSize:20, fontWeight:800, color:C.accent2 }}>{topic}</h3>
                    {isWeak(topic) && <Tag color={C.warn} style={{ marginTop:6 }}>⚠ Zaif mavzungiz</Tag>}
                  </div>
                  <Btn onClick={()=>setTopic(null)} variant="outline" small>✕</Btn>
                </div>
                {loading
                  ? <div style={{ display:"flex", gap:10, alignItems:"center", color:C.muted, padding:"20px 0" }}>
                      <Spinner s={16} c={C.accent2} /> Tushuntirish yuklanmoqda...
                    </div>
                  : <div style={{ fontSize:14, lineHeight:1.9 }}>
                      {content.split(/\n(##[^\n]+)/g).map((part,i)=>
                        part.startsWith("##")
                          ? <h4 key={i} style={{ color:C.accent, fontWeight:700, fontSize:15,
                              margin:"18px 0 8px" }}>{part.replace(/^##\s*/,"")}</h4>
                          : <span key={i} style={{ display:"block", whiteSpace:"pre-wrap" }}>{part}</span>
                      )}
                    </div>
                }
              </Card>
              <ChatBox systemPrompt={`Siz matematik AI Ustoz siz. Hozir o'quvchi "${topic}" mavzusini o'rganmoqda. FAQAT matematika savollariga o'zbek tilida javob bering.`} />
            </div>
          )}
        </div>

        {!topic && (
          <div style={{ marginTop:16 }}>
            <ChatBox systemPrompt="Siz matematik AI Ustoz siz. FAQAT matematika savollariga o'zbek tilida javob bering." />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STATS PAGE ───────────────────────────────────────────────────────────────
function StatsPage({ user, nav }) {
  const acc = user.totalTests > 0
    ? Math.round((user.totalCorrect / (user.totalTests * 30)) * 100) : 0;

  const ACHS = {
    perfect: { icon:"💯", label:"Mukammal", desc:"30/30 ball" },
    streak7: { icon:"🔥", label:"7-kun streak", desc:"Ketma-ket 7 kun" },
    master:  { icon:"👑", label:"Master", desc:"10-darajaga yetdi" },
  };

  const history = user.testHistory || [];
  const topWeak = Object.entries(user.weakTopics || {})
    .map(([t,v]) => ({ t, rate: Math.round((1-v.correct/v.total)*100) }))
    .sort((a,b)=>b.rate-a.rate).slice(0,8);

  // Chart dimensions
  const chartH = 120;
  const chartW = 100; // percentage based
  const maxScore = 30;

  // SVG line chart
  function LineChart({ data }) {
    if (!data || data.length < 2) return (
      <div style={{ textAlign:"center", color:C.muted, padding:"30px 0", fontSize:13 }}>
        Grafik uchun kamida 2 ta test yechish kerak
      </div>
    );
    const n = data.length;
    const pts = data.map((d, i) => ({
      x: (i / (n - 1)) * 100,
      y: 100 - (d.score / maxScore) * 100,
      d,
    }));

    const pathD = pts.map((p, i) =>
      `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
    ).join(" ");

    const areaD = `M ${pts[0].x} 100 ` +
      pts.map(p => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${pts[pts.length-1].x} 100 Z`;

    return (
      <div style={{ position:"relative" }}>
        {/* Y axis labels */}
        <div style={{ display:"flex", marginBottom:4 }}>
          <div style={{ width:28, display:"flex", flexDirection:"column",
            justifyContent:"space-between", height:chartH, paddingBottom:20 }}>
            {[30,20,10,0].map(v=>(
              <span key={v} style={{ fontSize:10, color:C.muted, lineHeight:1 }}>{v}</span>
            ))}
          </div>
          <div style={{ flex:1, position:"relative" }}>
            {/* Grid lines */}
            {[0,33,66,100].map(p=>(
              <div key={p} style={{
                position:"absolute", left:0, right:0,
                top:`${p}%`, height:1,
                background:`${C.border}80`,
              }} />
            ))}
            {/* SVG chart */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none"
              style={{ width:"100%", height:chartH, display:"block" }}>
              {/* Area fill */}
              <path d={areaD} fill={`${C.accent}18`} />
              {/* Line */}
              <path d={pathD} fill="none" stroke={C.accent} strokeWidth="2"
                vectorEffect="non-scaling-stroke" />
              {/* Level up markers */}
              {pts.map((p, i) => p.d.levelChanged === "up" && (
                <circle key={i} cx={p.x} cy={p.y} r="3"
                  fill={C.accent3} vectorEffect="non-scaling-stroke" />
              ))}
              {pts.map((p, i) => p.d.levelChanged === "down" && (
                <circle key={i} cx={p.x} cy={p.y} r="3"
                  fill={C.danger} vectorEffect="non-scaling-stroke" />
              ))}
              {/* Regular dots */}
              {pts.map((p, i) => !p.d.levelChanged && (
                <circle key={i} cx={p.x} cy={p.y} r="2"
                  fill={C.accent} vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
          </div>
        </div>

        {/* X labels */}
        <div style={{ display:"flex", paddingLeft:28, marginTop:4 }}>
          {data.slice(-1)[0] && (
            <div style={{ display:"flex", justifyContent:"space-between", width:"100%" }}>
              <span style={{ fontSize:10, color:C.muted }}>
                {data[0]?.date?.slice(4,10) || ""}
              </span>
              <span style={{ fontSize:10, color:C.muted }}>
                {data[data.length-1]?.date?.slice(4,10) || "Bugun"}
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:14, marginTop:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.accent3, display:"inline-block" }} />
            Daraja oshdi
          </span>
          <span style={{ fontSize:11, color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.danger, display:"inline-block" }} />
            Daraja tushdi
          </span>
          <span style={{ fontSize:11, color:C.muted, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:2, background:C.accent, display:"inline-block" }} />
            Ball
          </span>
        </div>
      </div>
    );
  }

  // Daraja tarixi grafigi
  function LevelChart({ data }) {
    if (!data || data.length < 2) return null;
    const n = data.length;
    const pts = data.map((d, i) => ({
      x: (i / (n - 1)) * 100,
      y: 100 - ((d.level - 1) / 9) * 100,
      d,
    }));
    const pathD = pts.map((p, i) => `${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div style={{ marginTop:16 }}>
        <p style={{ fontSize:13, color:C.accent2, fontWeight:600, marginBottom:8 }}>
          📶 Daraja o'zgarishi
        </p>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"
          style={{ width:"100%", height:60, display:"block" }}>
          {[1,3,5,7,9].map(l=>(
            <line key={l} x1="0" x2="100"
              y1={100-((l-1)/9)*100} y2={100-((l-1)/9)*100}
              stroke={`${C.border}60`} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={pathD} fill="none" stroke={C.accent2} strokeWidth="2.5"
            strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {pts.map((p,i)=>(
            <circle key={i} cx={p.x} cy={p.y} r="2.5"
              fill={C.accent2} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.muted }}>
          <span>Daraja 1</span>
          <span>Daraja 10</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, padding:"16px" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          paddingTop:8, marginBottom:22 }}>
          <h2 style={{ fontSize:20, fontWeight:800 }}>📊 Statistikam</h2>
          <Btn onClick={() => nav("home")} variant="ghost" small>← Orqaga</Btn>
        </div>

        {/* Profile card */}
        <Card style={{ display:"flex", alignItems:"center", gap:18, marginBottom:14,
          background:`linear-gradient(135deg,${C.accent}15,${C.card})` }}>
          <div style={{ width:60, height:60, borderRadius:"50%", flexShrink:0,
            background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24, fontWeight:800, color:"#fff" }}>
            {user.name[0].toUpperCase()}
          </div>
          <div style={{ flex:1 }}>
            <h3 style={{ fontSize:18, fontWeight:700 }}>{user.name} {user.surname}</h3>
            <div style={{ display:"flex", gap:8, marginTop:6, flexWrap:"wrap" }}>
              <Tag color={C.accent}>Daraja {user.level}</Tag>
              <Tag color={C.warn}>{user.streak||0} 🔥 streak</Tag>
              <Tag color={C.accent2}>{DIFFICULTY[user.level]}</Tag>
            </div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:11, color:C.muted }}>Daraja oshish</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.accent3 }}>70%+ (21/30)</div>
            <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>Daraja tushish</div>
            <div style={{ fontSize:13, fontWeight:600, color:C.danger }}>40%- (12/30)</div>
          </div>
        </Card>

        {/* Key numbers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:14 }}>
          {[
            {v:user.totalTests||0, l:"Jami testlar", icon:"📝", c:C.accent},
            {v:user.totalCorrect||0, l:"To'g'ri javoblar", icon:"✅", c:C.accent3},
            {v:`${acc}%`, l:"Umumiy aniqlik", icon:"🎯", c:C.accent2},
          ].map(s=>(
            <Card key={s.l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:22 }}>{s.icon}</div>
              <div style={{ fontSize:24, fontWeight:800, color:s.c, marginTop:4 }}>{s.v}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{s.l}</div>
            </Card>
          ))}
        </div>

        {/* GRAFIK */}
        {history.length > 0 && (
          <Card style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, color:C.accent, marginBottom:16 }}>
              📈 Ball o'zgarishi (so'nggi {history.length} ta test)
            </p>
            <LineChart data={history.slice(-20)} />
            <LevelChart data={history.slice(-20)} />
          </Card>
        )}

        {/* Weak topics */}
        {topWeak.length > 0 && (
          <Card style={{ marginBottom:14 }}>
            <p style={{ fontWeight:700, fontSize:14, color:C.warn, marginBottom:14 }}>
              ⚠ Zaif mavzular
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {topWeak.map(t=>(
                <div key={t.t}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:13 }}>{t.t}</span>
                    <span style={{ fontSize:13, fontWeight:600,
                      color:t.rate>60?C.danger:C.warn }}>{t.rate}% xato</span>
                  </div>
                  <div style={{ height:5, background:C.faint, borderRadius:4 }}>
                    <div style={{ height:"100%", width:`${t.rate}%`,
                      background:`linear-gradient(90deg,${t.rate>60?C.danger:C.warn},${t.rate>60?"#dc262680":C.warn+"80"})`,
                      borderRadius:4, transition:"width .6s" }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Achievements */}
        <Card>
          <p style={{ fontWeight:700, fontSize:14, color:C.accent3, marginBottom:14 }}>🏆 Yutuqlar</p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {Object.entries(ACHS).map(([k,a])=>{
              const earned = user.achievements?.includes(k);
              return (
                <div key={k} style={{
                  padding:"14px 18px", borderRadius:12, textAlign:"center", minWidth:100,
                  background:earned?`${C.accent3}15`:C.faint,
                  border:`1px solid ${earned?C.accent3:C.border}`,
                  opacity:earned?1:.35,
                }}>
                  <div style={{ fontSize:28 }}>{a.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:earned?C.accent3:C.muted, marginTop:4 }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize:11, color:C.muted }}>{a.desc}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── CHAT BOX (shared) ────────────────────────────────────────────────────────
function ChatBox({ systemPrompt }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  async function send() {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    setMsgs(m => [...m, { role:"user", content:txt }]);
    setLoading(true);
    try {
      const history = [...msgs, { role:"user", content:txt }];
      const reply = await callAI(history, systemPrompt);
      setMsgs(m => [...m, { role:"assistant", content:reply }]);
    } catch {
      setMsgs(m => [...m, { role:"assistant", content:"❌ Xatolik. Qaytadan urinib ko'ring." }]);
    }
    setLoading(false);
  }

  return (
    <div style={{
      marginTop:16, borderRadius:14, border:`1px solid ${C.accent2}35`,
      background:C.panel, overflow:"hidden",
    }}>
      <div style={{
        padding:"10px 14px", borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", gap:8,
      }}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:C.accent3,
          animation:"pulse 2s infinite", display:"inline-block" }} />
        <span style={{ fontWeight:700, fontSize:13, color:C.accent2 }}>🤖 AI Ustoz</span>
        <Tag color={C.accent2} style={{ fontSize:11 }}>Faqat matematika</Tag>
      </div>

      {msgs.length > 0 && (
        <div style={{ maxHeight:200, overflowY:"auto", padding:"12px 14px",
          display:"flex", flexDirection:"column", gap:8 }}>
          {msgs.map((m,i) => (
            <div key={i} style={{
              padding:"8px 12px", borderRadius:10, fontSize:13, lineHeight:1.7,
              alignSelf:m.role==="user"?"flex-end":"flex-start", maxWidth:"85%",
              background:m.role==="user"?`${C.accent}20`:`${C.accent2}15`,
              border:`1px solid ${m.role==="user"?C.accent+"30":C.border}`,
              color:m.role==="user"?C.accent:C.text,
            }}>
              {m.role==="assistant"&&<span style={{ fontSize:11, color:C.accent2, display:"block",marginBottom:3 }}>🤖</span>}
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf:"flex-start", display:"flex", gap:6, alignItems:"center",
              padding:"8px 12px", background:`${C.accent2}12`, borderRadius:10, fontSize:13 }}>
              <Spinner s={12} c={C.accent2} /> Javob yozilmoqda...
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      <div style={{ padding:"10px 12px", display:"flex", gap:8, borderTop:`1px solid ${C.border}` }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Matematik savolingizni yozing..."
          style={{
            flex:1, padding:"8px 12px", background:C.faint,
            border:`1px solid ${C.border}`, borderRadius:9,
            color:C.text, fontSize:13, outline:"none",
          }} />
        <Btn onClick={send} disabled={loading||!input.trim()} small>
          {loading?<Spinner s={14} c="#fff"/>:"→"}
        </Btn>
      </div>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function FullCenter({ children }) {
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:12, background:C.bg }}>
      {children}
    </div>
  );
}
