// @ts-nocheck
import { FormEvent, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleUserRound,
  FilePlus2,
  Inbox,
  LayoutGrid,
  LogOut,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rexnet_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
type Block = {
  id: string;
  kind: "REQUEST" | "OFFER";
  description: string;
  status: "ACTIVE" | "PAUSED" | "MATCHED" | "COMPLETED";
  allowsMultipleMatches: boolean;
  matchCount: number;
  createdAt: string;
  matchedUser?: { fullName: string; contactInfo: string } | null;
};
type User = {
  fullName: string;
  email: string;
  contactInfo: string;
  createdAt: string;
};
const statusText: Record<Block["status"], string> = {
  ACTIVE: "Faol",
  PAUSED: "To‘xtatilgan",
  MATCHED: "Mos topildi",
  COMPLETED: "Yakunlangan",
};
const errorText = (e: any) =>
  e?.response?.data?.message || "Amalni bajarishda xatolik yuz berdi.";

function App() {
  const [token, setToken] = useState(localStorage.getItem("rexnet_token"));
  const [page, setPage] = useState<
    "home" | "login" | "register" | "verify" | "dashboard" | "profile"
  >(token ? "dashboard" : "home");
  const [verifyToken, setVerifyToken] = useState(
    new URLSearchParams(location.search).get("token") || "",
  );
  useEffect(() => {
    if (location.pathname === "/verify-email") setPage("verify");
  }, []);
  const enter = (next: string) => {
    setPage(next as typeof page);
  };
  const onLogin = (value: string) => {
    localStorage.setItem("rexnet_token", value);
    setToken(value);
    setPage("dashboard");
  };
  const logout = () => {
    localStorage.removeItem("rexnet_token");
    setToken(null);
    setPage("home");
  };
  if (page === "home")
    return (
      <Landing
        onLogin={() => enter("login")}
        onRegister={() => enter("register")}
      />
    );
  if (page === "login")
    return (
      <AuthPage
        mode="login"
        onBack={() => enter("home")}
        onLogin={onLogin}
        onRegister={() => enter("register")}
      />
    );
  if (page === "register")
    return (
      <AuthPage
        mode="register"
        onBack={() => enter("home")}
        onLogin={() => enter("login")}
        onRegister={() => {}}
      />
    );
  if (page === "verify")
    return <Verify token={verifyToken} onLogin={() => enter("login")} />;
  if (!token)
    return (
      <Landing
        onLogin={() => enter("login")}
        onRegister={() => enter("register")}
      />
    );
  return <Dashboard page={page} setPage={setPage} logout={logout} />;
}

function Landing({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <main className="landing">
      <div className="landing-glow" />
      <nav className="topbar">
        <div className="brand">
          <span className="brand-mark">R</span> Rexnet
        </div>
        <div className="nav-actions">
          <button className="button ghost" onClick={onLogin}>
            Kirish
          </button>
          <button className="button primary" onClick={onRegister}>
            Ro‘yxatdan o‘tish <ArrowRight size={17} />
          </button>
        </div>
      </nav>
      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={15} /> Odamlar va imkoniyatlar
        </div>
        <h1>
          Ehtiyojingizni taklif bilan <em>bog‘lang.</em>
        </h1>
        <p>
          Rexnet sizga kerakli narsani izlayotgan yoki uni taklif qilayotgan
          insonlarni aqlli moslashtirish orqali topishga yordam beradi.
        </p>
        <div className="hero-actions">
          <button className="button primary large" onClick={onRegister}>
            Boshlash <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={onLogin}>
            Hisobim bor <ArrowRight size={16} />
          </button>
        </div>
      </section>
      <div className="hero-note">
        <span className="note-dot" /> Sizning aloqangiz faqat moslik topilganda
        ko‘rinadi
      </div>
    </main>
  );
}

function AuthPage({
  mode,
  onBack,
  onLogin,
  onRegister,
}: {
  mode: "login" | "register";
  onBack: () => void;
  onLogin: (token: string) => void;
  onRegister: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    contactInfo: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registered, setRegistered] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") {
        const r = await api.post("/auth/login", {
          email: form.email,
          password: form.password,
        });
        onLogin(r.data.accessToken);
      } else {
        await api.post("/auth/register", form);
        setRegistered(true);
        setMessage(
          "Ro‘yxatdan o‘tish muvaffaqiyatli. Elektron pochtangizni tasdiqlash uchun xatni tekshiring.",
        );
      }
    } catch (err) {
      setMessage(errorText(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="auth-shell">
      <button className="back-link" onClick={onBack}>
        ← Bosh sahifa
      </button>
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">R</span> Rexnet
        </div>
        <h1>{mode === "login" ? "Xush kelibsiz" : "Hisob yarating"}</h1>
        <p className="muted">
          {mode === "login"
            ? "Rexnet hisobingizga kiring."
            : "Ehtiyoj va takliflaringizni bir joyda boshqaring."}
        </p>
        {message && <div className="notice">{message}</div>}
        {!(mode === "register" && registered) && (
          <form onSubmit={submit}>
            {mode === "register" && (
              <Field
                label="To‘liq ism"
                value={form.fullName}
                onChange={(v) => setForm({ ...form, fullName: v })}
                placeholder="Ismingiz va familiyangiz"
              />
            )}
            <Field
              label="Elektron pochta"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="siz@example.com"
            />
            <Field
              label="Parol"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              placeholder="Kamida 8 ta belgi"
            />
            {mode === "register" && (
              <>
                <Field
                  label="Aloqa ma’lumotlari"
                  value={form.contactInfo}
                  onChange={(v) => setForm({ ...form, contactInfo: v })}
                  placeholder="Telegram, telefon yoki boshqa aloqa"
                />
                <p className="hint">
                  Aloqa ma’lumotlaringiz faqat mos kelgan foydalanuvchiga
                  ko‘rsatiladi.
                </p>
              </>
            )}
            <button className="button primary full" disabled={loading}>
              {loading
                ? "Kutilmoqda..."
                : mode === "login"
                  ? "Kirish"
                  : "Ro‘yxatdan o‘tish"}
            </button>
          </form>
        )}
        {mode === "register" && registered && (
          <div className="verification-wait">
            <div className="verify-icon">
              <Check size={24} />
            </div>
            <h2>Tasdiqlash xati yuborildi</h2>
            <p className="muted">
              Elektron pochtangizdagi havolani oching. Tasdiqlashdan keyin login
              sahifasiga kiring.
            </p>
            <button className="button ghost full" onClick={onLogin}>
              Login sahifasiga o‘tish
            </button>
          </div>
        )}
        {!(mode === "register" && registered) && (
          <p className="switch">
            {mode === "login" ? "Hisobingiz yo‘qmi?" : "Hisobingiz bormi?"}{" "}
            <button onClick={mode === "login" ? onRegister : onLogin}>
              {mode === "login" ? "Ro‘yxatdan o‘ting" : "Kirish"}
            </button>
          </p>
        )}
      </div>
    </main>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Verify({ token, onLogin }: { token: string; onLogin: () => void }) {
  const [state, setState] = useState("Tekshirilmoqda...");
  useEffect(() => {
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        window.history.replaceState({}, "", "/");
        setState("Elektron pochtangiz muvaffaqiyatli tasdiqlandi.");
      })
      .catch((e) => setState(errorText(e)));
  }, [token]);
  return (
    <main className="auth-shell">
      <div className="auth-card centered">
        <div className="brand">
          <span className="brand-mark">R</span> Rexnet
        </div>
        <div className="verify-icon">
          <Check />
        </div>
        <h1>Elektron pochta tasdig‘i</h1>
        <p className="muted">{state}</p>
        <button className="button primary full" onClick={onLogin}>
          Kirishga o‘tish
        </button>
      </div>
    </main>
  );
}

function Dashboard({
  page,
  setPage,
  logout,
}: {
  page: "dashboard" | "profile";
  setPage: (v: any) => void;
  logout: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<"REQUEST" | "OFFER">("REQUEST");
  const [modal, setModal] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const load = () => {
    api
      .get("/data-blocks")
      .then((r) => setBlocks(r.data))
      .catch((e) => setToast(errorText(e)));
    api.get("/users/me").then((r) => setUser(r.data));
  };
  useEffect(load, []);
  const act = async (path: string, id: string) => {
    try {
      const r = await api.post(`/data-blocks/${id}/${path}`);
      if (path === "activate") setBlocks(r.data);
      else load();
    } catch (e) {
      setToast(errorText(e));
    }
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">R</span> Rexnet
        </div>
        <div className="side-links">
          <button
            className={page === "dashboard" ? "selected" : ""}
            onClick={() => setPage("dashboard")}
          >
            <LayoutGrid size={18} /> Bloklar
          </button>
        </div>
        <div className="side-bottom">
          <button onClick={() => setPage("profile")}>
            <UserRound size={18} /> Profil
          </button>
          <button onClick={logout}>
            <LogOut size={18} /> Chiqish
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="mobile-header">
          <div className="brand">
            <span className="brand-mark">R</span> Rexnet
          </div>
          <button
            className="icon-button mobile-menu-trigger"
            aria-label="Menyuni ochish"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          {menu && (
            <div className="mobile-menu">
              <button
                onClick={() => {
                  setPage("dashboard");
                  setMenu(false);
                }}
              >
                <LayoutGrid size={17} /> Bloklar
              </button>
              <button
                onClick={() => {
                  setPage("profile");
                  setMenu(false);
                }}
              >
                <UserRound size={17} /> Profil
              </button>
              <button onClick={logout}>
                <LogOut size={17} /> Chiqish
              </button>
            </div>
          )}
        </header>
        {page === "profile" ? (
          <Profile user={user} onSave={load} />
        ) : (
          <>
            <div className="page-head">
              <div>
                <p className="eyebrow">Bugun siz uchun</p>
                <h1>Ehtiyoj va takliflar</h1>
                <p className="muted">
                  Sizning resurslaringiz va izlanishlaringiz.
                </p>
              </div>
              <button className="button primary" onClick={() => setModal(true)}>
                <FilePlus2 size={17} /> Qo‘shish
              </button>
            </div>
            <div className="tabs">
              <button
                className={tab === "REQUEST" ? "active" : ""}
                onClick={() => setTab("REQUEST")}
              >
                Ehtiyojlar{" "}
                <b>{blocks.filter((b) => b.kind === "REQUEST").length}</b>
              </button>
              <button
                className={tab === "OFFER" ? "active" : ""}
                onClick={() => setTab("OFFER")}
              >
                Takliflar{" "}
                <b>{blocks.filter((b) => b.kind === "OFFER").length}</b>
              </button>
            </div>
            <section className="block-grid">
              {blocks
                .filter((b) => b.kind === tab)
                .map((b) => (
                  <BlockCard
                    key={b.id}
                    block={b}
                    onAction={act}
                    onDelete={async () => {
                      await api.delete(`/data-blocks/${b.id}`);
                      load();
                    }}
                  />
                ))}
              {!blocks.filter((b) => b.kind === tab).length && (
                <div className="empty">
                  <div className="empty-icon">
                    <Inbox />
                  </div>
                  <h2>
                    {tab === "REQUEST"
                      ? "Hali ehtiyojlar yo‘q"
                      : "Hali takliflar yo‘q"}
                  </h2>
                  <p>
                    Birinchi blokingizni qo‘shing va Rexnet sizga mos insonlarni
                    izlasin.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => setModal(true)}
                  >
                    Blok qo‘shish
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        {toast && (
          <div className="toast">
            {toast}
            <button onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {modal && (
          <AddModal
            onClose={() => setModal(false)}
            onDone={() => {
              setModal(false);
              load();
            }}
          />
        )}
      </main>
    </div>
  );
}
function BlockCard({
  block,
  onAction,
  onDelete,
}: {
  block: Block;
  onAction: (a: string, id: string) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  return (
    <article className="block-card" onClick={() => setDetails(true)}>
      <div className="card-top">
        <div className="card-tags">
          <span
            className={`kind ${block.kind === "REQUEST" ? "request" : "offer"}`}
          >
            {block.kind === "REQUEST" ? "Ehtiyoj" : "Taklif"}
          </span>
          <span className="capacity-tag">
            {block.allowsMultipleMatches ? "Ko‘p moslik" : "Bitta moslik"}
          </span>
        </div>
        <button
          className="icon-button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(!open);
          }}
        >
          <MoreHorizontal size={19} />
        </button>
        {open && (
          <div className="menu">
            {block.status === "ACTIVE" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("pause", block.id);
                }}
              >
                <Pause /> To‘xtatib turish
              </button>
            )}
            {block.status === "PAUSED" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("activate", block.id);
                }}
              >
                <Play /> Faollashtirish
              </button>
            )}
            {block.status === "MATCHED" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onAction("complete", block.id);
                }}
              >
                <Check /> Yakunlash
              </button>
            )}
            <button
              className="danger"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 /> O‘chirish
            </button>
          </div>
        )}
      </div>
      <p className="description">{block.description}</p>
      <div className="card-bottom">
        <span className={`status ${block.status.toLowerCase()}`}>
          <i /> {statusText[block.status]}
        </span>
        <span className="matches">
          {block.allowsMultipleMatches
            ? `${block.matchCount} ta moslik`
            : "Bitta moslik"}
        </span>
      </div>
      {block.matchedUser && (
        <div
          className="matched"
          onClick={(event) => {
            event.stopPropagation();
            setDetails(true);
          }}
        >
          <CircleUserRound size={16} />{" "}
          <span>{block.matchedUser.fullName}</span>
        </div>
      )}
      {details && (
        <div
          className="overlay card-detail-overlay"
          onClick={() => setDetails(false)}
        >
          <div
            className="modal detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <span
                  className={`kind ${block.kind === "REQUEST" ? "request" : "offer"}`}
                >
                  {block.kind === "REQUEST" ? "Ehtiyoj" : "Taklif"}
                </span>
                <h2>Blok tafsilotlari</h2>
              </div>
              <button className="icon-button" onClick={() => setDetails(false)}>
                <X />
              </button>
            </div>
            <p className="detail-description">{block.description}</p>
            <div className="detail-line">
              <strong>Holati</strong>
              <span className={`status ${block.status.toLowerCase()}`}>
                <i /> {statusText[block.status]}
              </span>
            </div>
            <div className="detail-line">
              <strong>Uchrashuv turi</strong>
              <span>
                {block.allowsMultipleMatches
                  ? "Ko‘p moslikka ochiq"
                  : "Bitta moslik"}
              </span>
            </div>
            <p className="hint">
              {block.allowsMultipleMatches
                ? "Bu blok bir nechta foydalanuvchi bilan mos kelishi mumkin. Bu yerda faqat mosliklar soni ko‘rsatiladi."
                : "Bu blok faqat bitta foydalanuvchi bilan mos keladi."}
            </p>
            {block.allowsMultipleMatches ? (
              <div className="match-count-large">
                {block.matchCount}
                <small>ta moslik</small>
              </div>
            ) : (
              block.matchedUser && (
                <div className="contact-box">
                  <strong>{block.matchedUser.fullName}</strong>
                  <span>{block.matchedUser.contactInfo}</span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </article>
  );
}
function AddModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<Block[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const process = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await api.post("/data-blocks/process", { text });
      setItems(r.data);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  const activate = async () => {
    setLoading(true);
    try {
      await api.post("/data-blocks/activate-all", {
        ids: items.map((x) => x.id),
      });
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  const remove = async () => {
    await api.delete("/data-blocks/batch", {
      data: { ids: items.map((x) => x.id) },
    });
    onDone();
  };
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Yangi blok</p>
            <h2>
              {items.length
                ? "Natijalarni ko‘rib chiqing"
                : "Ehtiyoj yoki taklifingizni yozing"}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        {!items.length ? (
          <>
            <p className="muted">
              Oddiy tilda yozing. AI matningizdan mustaqil ehtiyoj va
              takliflarni ajratadi.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Masalan: Men Pythonni yaxshi bilaman va boshlovchilarga yordam bera olaman..."
              maxLength={4000}
            />
            {error && <div className="error">{error}</div>}
            <button
              className="button primary full"
              disabled={loading || text.length < 5}
              onClick={process}
            >
              {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
            </button>
          </>
        ) : (
          <>
            <div className="review-list">
              {items.map((i) => (
                <div className="review-item" key={i.id}>
                  <span
                    className={`kind ${i.kind === "REQUEST" ? "request" : "offer"}`}
                  >
                    {i.kind === "REQUEST" ? "Ehtiyoj" : "Taklif"}
                  </span>
                  <p>{i.description}</p>
                  <div className="review-capacity">
                    <strong>
                      {i.allowsMultipleMatches
                        ? "Ko‘p moslikka ochiq"
                        : "Bitta moslik"}
                    </strong>
                    <span>
                      {i.allowsMultipleMatches
                        ? "Bir nechta foydalanuvchi bilan mos kelishi mumkin; faqat mosliklar soni ko‘rsatiladi."
                        : "Faqat bitta foydalanuvchi bilan mos keladi."}
                    </span>
                  </div>
                  <span className="status paused">
                    <i /> To‘xtatilgan
                  </span>
                </div>
              ))}
            </div>
            {error && <div className="error">{error}</div>}
            <div className="modal-actions">
              <button className="button ghost" onClick={remove}>
                Barchasini o‘chirish
              </button>
              <button
                className="button primary"
                disabled={loading}
                onClick={activate}
              >
                {loading ? "Saqlanmoqda..." : "Barchasini faollashtirish"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function Profile({ user, onSave }: { user: User | null; onSave: () => void }) {
  const [contact, setContact] = useState(user?.contactInfo || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setContact(user?.contactInfo || ""), [user]);
  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/users/me/contact", { contactInfo: contact });
      setMessage("Aloqa ma’lumotlari saqlandi.");
      onSave();
    } catch (e) {
      setMessage(errorText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="profile">
      <p className="eyebrow">Hisob sozlamalari</p>
      <h1>Profil</h1>
      <p className="muted">Shaxsiy ma’lumotlaringizni boshqaring.</p>
      <div className="profile-card">
        <div className="profile-avatar">{user?.fullName?.charAt(0)}</div>
        <div className="profile-info">
          <h2>{user?.fullName}</h2>
          <p>{user?.email}</p>
        </div>
        <label className="field">
          <span>Aloqa ma’lumotlari</span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <p className="hint">
          Bu ma’lumot faqat sizning blokingiz bilan moslik topgan
          foydalanuvchiga ko‘rsatiladi.
        </p>
        {message && <div className="notice">{message}</div>}
        <button
          className="button primary"
          disabled={saving || contact.length < 3}
          onClick={save}
        >
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </section>
  );
}
export default App;
