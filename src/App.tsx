import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Vote,
  RotateCcw,
  Clock,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { formatTime, roles, type Role, type Store } from "./model";
import { mockRepository } from "./mock-repository";
import { text } from "./text";
import { Empty, Field, Notice, go } from "./ui";
import { MemberScreens } from "./MemberScreens";
import { AdminScreens } from "./AdminScreens";

export default function App() {
  const [path, setPath] = useState(() => location.hash.slice(1) || "/");
  const [store, setStore] = useState<Store | null>(null);
  const [fatal, setFatal] = useState("");
  const [member, setMember] = useState(
    () => sessionStorage.getItem("demo-member") || "",
  );
  const [role, setRole] = useState<Role | "">(
    () => (sessionStorage.getItem("demo-admin") || "") as Role,
  );
  const [network, setNetwork] = useState<"normal" | "after" | "before">(
    "normal",
  );
  const [toast, setToast] = useState("");
  useEffect(() => {
    const read = () => {
      try {
        setStore(mockRepository.read());
        setFatal("");
      } catch {
        setFatal(
          "ไม่สามารถอ่านข้อมูลตัวอย่างได้ กรุณารีเซ็ตข้อมูล หรืออนุญาตพื้นที่จัดเก็บในเบราว์เซอร์",
        );
      }
    };
    const navigate = () => {
      setPath(location.hash.slice(1) || "/");
      setToast("");
    };
    read();
    window.addEventListener("demo-update", read);
    window.addEventListener("storage", read);
    window.addEventListener("hashchange", navigate);
    return () => {
      window.removeEventListener("demo-update", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("hashchange", navigate);
    };
  }, []);
  const admin = path.startsWith("/admin");
  const logout = () => {
    if (admin) {
      sessionStorage.removeItem("demo-admin");
      setRole("");
      go("/admin/login");
    } else {
      sessionStorage.removeItem("demo-member");
      setMember("");
      go("/user/login");
    }
  };
  const notify = (message: string) => setToast(message);
  const loggedIn = admin ? !!role : !!member;
  const login =
    path === "/user/login" ||
    path === "/admin/login" ||
    (path.startsWith("/user") && !member) ||
    (admin && !role);
  const name =
    admin && role
      ? roles[role]
      : store?.members.find((m) => m.code === member)?.name;
  return (
    <>
      <div className="prototype">
        <AlertTriangle size={18} />
        {text.prototype}
      </div>
      {path === "/" ? (
        <div className="welcome">
          <div className="brand">
            <Vote />
            Election Platform
          </div>
          <h1>ระบบเลือกตั้งภายในหน่วยงาน</h1>
          <p>ต้นแบบสำหรับตรวจหน้าจอและขั้นตอนกับลูกค้า</p>
          <div className="entry-grid">
            <a href="#/user/login">
              <Vote />
              <h2>สำหรับสมาชิก</h2>
              <p>ตรวจสิทธิ์และทดลองลงคะแนน</p>
              <span>
                เข้าสู่หน้าสมาชิก <ArrowRight size={18} />
              </span>
            </a>
            <a href="#/admin/login">
              <Vote />
              <h2>สำหรับผู้ดูแล</h2>
              <p>จัดการการเลือกตั้งและตรวจผลจำลอง</p>
              <span>
                เข้าสู่หน้าผู้ดูแล <ArrowRight size={18} />
              </span>
            </a>
          </div>
          <p className="muted">
            ใช้ข้อมูลสมมติเท่านั้น • ไม่มีการส่งรหัสหรือบันทึกคะแนนจริง
          </p>
        </div>
      ) : fatal ? (
        <Empty>{fatal}</Empty>
      ) : !store ? (
        <Empty>กำลังโหลดข้อมูลตัวอย่าง…</Empty>
      ) : login ? (
        <Login
          key={admin ? "admin" : "member"}
          admin={admin}
          store={store}
          destination={path}
          loginMember={(code) => {
            sessionStorage.setItem("demo-member", code);
            setMember(code);
            go(path.startsWith("/user/u/") ? path : "/user");
          }}
          loginAdmin={(r) => {
            sessionStorage.setItem("demo-admin", r);
            setRole(r);
            go("/admin");
          }}
        />
      ) : (
        <>
          <header className={admin ? "admin-top" : "member-header"}>
            {!admin && (
              <div className="brand">
                <Vote />
                Election Platform
              </div>
            )}
            <div className="account">
              <span className="avatar">{name?.slice(0, 1)}</span>
              <div>
                <strong>{name}</strong>
                <small>
                  {admin ? "บัญชีผู้ดูแลตัวอย่าง" : `รหัสสมาชิก ${member}`}
                </small>
              </div>
              <button className="quiet" onClick={logout}>
                <LogOut size={16} />
                ออกจากระบบ
              </button>
            </div>
          </header>
          {toast && (
            <div className="toast">
              <Notice success>{toast}</Notice>
            </div>
          )}
          {admin && role ? (
            <AdminScreens
              path={path}
              store={store}
              role={role}
              notify={notify}
            />
          ) : (
            <MemberScreens
              path={path}
              store={store}
              code={member}
              network={network}
              notify={notify}
            />
          )}
        </>
      )}
      <footer className="demo-bar">
        <span>
          <Clock size={16} />
          เวลาจำลอง: {store ? formatTime(store.now) : "—"}
        </span>
        <div className="demo-actions">
          {loggedIn && (
            <label>
              เครือข่ายจำลอง
              <select
                aria-label="เครือข่ายจำลอง"
                value={network}
                onChange={(e) => setNetwork(e.target.value as typeof network)}
              >
                <option value="normal">เชื่อมต่อปกติ</option>
                <option value="after">ขาดหลังบันทึก</option>
                <option value="before">ขาดก่อนบันทึก</option>
              </select>
            </label>
          )}
          {admin && role === "super_admin" && (
            <button
              className="quiet"
              onClick={() => {
                try {
                  mockRepository.update((s) => {
                    s.now =
                      s.now === "2026-10-15T03:00:00.000Z"
                        ? "2026-10-15T11:00:00.000Z"
                        : "2026-10-15T03:00:00.000Z";
                  });
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              สลับเวลาเปิด / ปิด
            </button>
          )}
          <button
            className="reset"
            onClick={() => {
              if (
                !window.confirm("รีเซ็ตข้อมูลตัวอย่างทั้งหมดในเบราว์เซอร์นี้?")
              )
                return;
              try {
                mockRepository.reset();
                sessionStorage.removeItem("demo-member");
                sessionStorage.removeItem("demo-admin");
                setMember("");
                setRole("");
                setNetwork("normal");
                go("/");
              } catch {
                setFatal("รีเซ็ตไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บ");
              }
            }}
          >
            <RotateCcw size={15} />
            รีเซ็ตข้อมูลตัวอย่าง
          </button>
        </div>
      </footer>
    </>
  );
}

function Login({
  admin,
  store,
  destination,
  loginMember,
  loginAdmin,
}: {
  admin: boolean;
  store: Store;
  destination: string;
  loginMember: (c: string) => void;
  loginAdmin: (r: Role) => void;
}) {
  const [code, setCode] = useState("000123"),
    [password, setPassword] = useState(""),
    [selectedRole, setRole] = useState<Role>("super_admin");
  const [issued, setIssued] = useState(false),
    [issuedAt, setIssuedAt] = useState(0),
    [attempts, setAttempts] = useState(0),
    [lockedUntil, setLocked] = useState(0);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [scenario, setScenario] = useState("normal");
  async function requestCode() {
    setError("");
    if (performance.now() < lockedUntil) {
      setError("ถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง");
      return;
    }
    const m = store.members.find((m) => m.code === code);
    if (!m?.email && !m?.phone) {
      setError(
        "ไม่มีช่องทางติดต่อ กรุณาติดต่อเจ้าหน้าที่ช่วยเหลือเพื่อขอรหัสสำรองจำลอง",
      );
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    setIssued(true);
    setIssuedAt(performance.now());
    setAttempts(0);
    setBusy(false);
  }
  function submit(e: React.SubmitEvent) {
    e.preventDefault();
    setError("");
    if (admin) {
      if (password !== "demo123") {
        setError("รหัสผ่านตัวอย่างไม่ถูกต้อง");
        return;
      }
      loginAdmin(selectedRole);
      return;
    }
    if (scenario === "locked" || performance.now() < lockedUntil) {
      setError("ถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง");
      return;
    }
    if (
      scenario === "expired" ||
      (issued && performance.now() - issuedAt > 300000)
    ) {
      setError("รหัสหมดอายุ กรุณาขอรหัสใหม่");
      return;
    }
    const helpdesk = sessionStorage.getItem(`demo-helpdesk-${code}`);
    if (
      !store.members.some((m) => m.code === code) ||
      (password !== "123456" && password !== helpdesk) ||
      (!issued && password !== helpdesk)
    ) {
      const count = attempts + 1;
      setAttempts(count);
      if (count >= 5) {
        setLocked(performance.now() + 900000);
        setError("ถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง");
      } else setError("รหัสผิด กรุณาตรวจสอบรหัสเข้าใช้");
      return;
    }
    setIssued(false);
    sessionStorage.removeItem(`demo-helpdesk-${code}`);
    loginMember(code);
  }
  return (
    <main className="login-page">
      <div className="login-intro">
        <div className="brand">
          <Vote />
          Election Platform
        </div>
        <h1>
          {admin
            ? "จัดการการเลือกตั้ง\nอย่างเป็นระบบ"
            : "ทุกสิทธิ์มีความหมาย\nทุกเสียงมีคุณค่า"}
        </h1>
        <p>
          {admin
            ? "จัดการข้อมูล ตรวจขั้นตอน และทดลองประกาศผล\nในต้นแบบระบบเลือกตั้งของหน่วยงาน"
            : "ตรวจสอบรายการที่คุณมีสิทธิ์\nแล้วทดลองลงคะแนนได้ในไม่กี่ขั้นตอน"}
        </p>
        <div className="intro-note">
          <Vote size={32} />
          <p>
            ข้อมูลสมมติสำหรับการสาธิต
            <br />
            ไม่มีการลงคะแนนจริง
          </p>
        </div>
      </div>
      <section className="login-card">
        <h2>{admin ? "เข้าสู่ระบบผู้ดูแล" : "เข้าสู่ระบบสมาชิก"}</h2>
        <p className="muted">
          {admin
            ? "ใช้บัญชีตัวอย่างตามบทบาทที่ต้องการตรวจ"
            : "กรอกรหัสสมาชิก และขอรหัสเข้าใช้จำลอง"}
        </p>
        {error && <Notice>{error}</Notice>}
        <form onSubmit={submit}>
          {admin ? (
            <Field label="บทบาทตัวอย่าง">
              <select
                value={selectedRole}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {Object.entries(roles).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="รหัสสมาชิก">
              <input
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setIssued(false);
                }}
                autoComplete="username"
              />
            </Field>
          )}
          <Field label={admin ? "รหัสผ่านตัวอย่าง" : "รหัสเข้าใช้"}>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </Field>
          {!admin && (
            <button
              type="button"
              className="secondary full"
              disabled={busy}
              onClick={requestCode}
            >
              {busy ? "กำลังดำเนินการ…" : "ขอรหัสจำลอง"}
            </button>
          )}
          <button className="primary full" disabled={busy}>
            เข้าสู่ระบบ
            <ArrowRight size={17} />
          </button>
        </form>
        {issued && (
          <Notice success>
            (จำลอง) ส่งรหัสไปที่ s****@example.com แล้ว • รหัสสำหรับผู้ทดสอบ:
            123456
          </Notice>
        )}
        <details open className="tester">
          <summary>บัญชีและเครื่องมือสำหรับผู้ทดสอบ</summary>
          {admin ? (
            <p>
              รหัสผ่านทุกบทบาท: <code>demo123</code>
            </p>
          ) : (
            <>
              <p>
                รหัสสมาชิก: 000123 (1 รายการ), 000124 (หลายรายการ), 000125
                (ใช้สิทธิ์แล้ว), 000126 (ไม่มีสิทธิ์), 000127
                (ไม่มีช่องทางติดต่อ)
              </p>
              <Field label="สถานะรหัสจำลอง">
                <select
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                >
                  <option value="normal">ปกติ</option>
                  <option value="expired">รหัสหมดอายุ</option>
                  <option value="locked">ถูกล็อกชั่วคราว</option>
                </select>
              </Field>
            </>
          )}
          {destination.startsWith("/user/u/") && (
            <p>เข้าสู่ระบบแล้วจะกลับหน่วยเดิม</p>
          )}
        </details>
      </section>
    </main>
  );
}
