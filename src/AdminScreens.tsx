import { useEffect, useState } from "react";
import {
  Vote,
  Home,
  ClipboardList,
  Users,
  ChartColumn,
  History,
  KeyRound,
  Plus,
  Search,
  ChevronRight,
  Check,
  Eye,
} from "lucide-react";
import {
  formatTime,
  resultOf,
  stateOf,
  shouldRefreshSnapshot,
  mockPrivacy,
  type Role,
  type Store,
} from "./model";
import { canManage, inScope, mockRepository } from "./mock-repository";
import { text } from "./text";
import { Badge, Empty, Field, Notice, go } from "./ui";
import { Ballot } from "./MemberScreens";
import { ElectionEditor, UnitDetail } from "./ElectionEditor";
import { Voters } from "./Voters";
const nav = [
  ["/", "ภาพรวม", Home],
  ["/elections", "การเลือกตั้ง", ClipboardList],
  ["/voters", "ผู้มีสิทธิ์", Users],
  ["/results", "คะแนนและผล", ChartColumn],
  ["/history", "ประวัติ", History],
  ["/access-codes", "รหัสสำรอง", KeyRound],
] as const;
export function AdminScreens({
  path,
  store,
  role,
  notify,
}: {
  path: string;
  store: Store;
  role: Role;
  notify: (s: string) => void;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [editing, setEditing] = useState<string | null>(null),
    [detail, setDetail] = useState<string | null>(null);
  const [electionFilter, setElectionFilter] = useState("all"),
    [unitFilter, setUnitFilter] = useState("all");
  const section = path.slice(6) || "/";
  const units = store.units.filter((u) => inScope(role, u.electionId, store));
  const active = units.filter(
    (u) =>
      stateOf(
        store.elections.find((e) => e.id === u.electionId)!,
        u,
        store.now,
      ) === "open",
  );
  const rights = store.eligibility.filter((x) =>
    active.some((u) => u.id === x.unitId),
  );
  const voted = rights.filter((x) => x.voted).length;
  const title = nav.find(([href]) => href === section)?.[1] || "โหมดดูตัวอย่าง";
  const previewUnit = path.includes("/preview/")
    ? store.units.find((u) => u.id === path.split("/")[3])
    : null;
  const visibleNav = nav
    .filter(([href]) => role !== "helpdesk" || href === "/access-codes")
    .filter(
      ([href]) =>
        role !== "live_results_viewer" ||
        ["/", "/results", "/history"].includes(href),
    );
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <Vote />
          Election Platform
        </div>
        <nav aria-label="เมนูผู้ดูแล">
          {visibleNav.map(([href, label, Icon]) => (
            <a
              className={section === href ? "active" : ""}
              key={href}
              href={`#/admin${href === "/" ? "" : href}`}
            >
              <Icon size={21} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="dot" />
          โหมดสาธิต
          <br />
          <small>ข้อมูลในเบราว์เซอร์นี้เท่านั้น</small>
        </div>
      </aside>
      <main className="admin-main">
        <div className="breadcrumb">
          หน้าหลัก
          <ChevronRight size={14} />
          {title}
        </div>
        {previewUnit ? (
          <Ballot
            key={previewUnit.id}
            unit={previewUnit}
            election={store.elections.find(
              (e) => e.id === previewUnit.electionId,
            )!}
            store={store}
            preview
            notify={notify}
          />
        ) : (
          <>
            <div className="page-title">
              <div>
                <h1>{section === "/" ? "ภาพรวมการเลือกตั้ง" : title}</h1>
                <p>
                  {section === "/"
                    ? "สรุปสถานะการเลือกตั้งทั้งหมดของหน่วยงาน"
                    : "ตรวจสอบและจัดการข้อมูลตัวอย่าง"}
                </p>
              </div>
              {["/", "/elections"].includes(section) &&
                ["super_admin", "election_admin"].includes(role) && (
                  <button className="primary" onClick={() => setEditing("new")}>
                    <Plus size={19} />
                    สร้างการเลือกตั้ง
                  </button>
                )}
            </div>
            {["/", "/elections"].includes(section) ? (
              <>
                {section === "/" && (
                  <div className="stats">
                    <Stat
                      title="การเลือกตั้งที่กำลังเปิด"
                      value={new Set(active.map((u) => u.electionId)).size}
                      description="หลายการเลือกตั้งเปิดพร้อมกัน"
                      icon={<Vote />}
                    />
                    <Stat
                      title="ผู้มีสิทธิ์ทั้งหมด"
                      value={rights.length}
                      description="จากหน่วยที่กำลังเปิด"
                      icon={<Users />}
                    />
                    <Stat
                      title="ใช้สิทธิ์แล้ว"
                      value={voted}
                      description={`${rights.length ? ((voted / rights.length) * 100).toFixed(1) : 0}% ของผู้มีสิทธิ์`}
                      icon={<Check />}
                    />
                  </div>
                )}
                <section className="panel">
                  <div className="panel-toolbar">
                    <div>
                      <h2>การเลือกตั้งทั้งหมด</h2>
                      <p>ผลคะแนนและผู้ชนะจะนับแยกตามหน่วย</p>
                    </div>
                    <div className="filters">
                      <select
                        aria-label="ตัวกรองสถานะ"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="all">ทุกสถานะ</option>
                        <option value="open">กำลังเปิด</option>
                        <option value="draft">ฉบับร่าง</option>
                        <option value="future">ยังไม่เปิด</option>
                        <option value="closed">ปิดแล้ว</option>
                        <option value="announced">ประกาศแล้ว</option>
                        <option value="cancelled">ยกเลิก</option>
                      </select>
                      <label className="search">
                        <Search size={17} />
                        <input
                          aria-label="ค้นหาการเลือกตั้ง"
                          placeholder="ค้นหาการเลือกตั้งหรือหน่วย..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="subfilters">
                    <select
                      aria-label="ตัวกรองการเลือกตั้ง"
                      value={electionFilter}
                      onChange={(e) => {
                        setElectionFilter(e.target.value);
                        setUnitFilter("all");
                      }}
                    >
                      <option value="all">ทุกการเลือกตั้ง</option>
                      {store.elections
                        .filter((e) => inScope(role, e.id, store))
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                    </select>
                    <select
                      aria-label="ตัวกรองหน่วย"
                      value={unitFilter}
                      onChange={(e) => setUnitFilter(e.target.value)}
                    >
                      <option value="all">ทุกหน่วย</option>
                      {units
                        .filter(
                          (u) =>
                            electionFilter === "all" ||
                            u.electionId === electionFilter,
                        )
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} —{" "}
                            {
                              store.elections.find((e) => e.id === u.electionId)
                                ?.title
                            }
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>การเลือกตั้ง / หน่วย</th>
                          <th>สถานะ</th>
                          <th>ผู้มีสิทธิ์</th>
                          <th>ใช้สิทธิ์แล้ว</th>
                          <th>เปิด–ปิดหีบ</th>
                          <th>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {units
                          .filter((u) => {
                            const e = store.elections.find(
                              (e) => e.id === u.electionId,
                            )!;
                            return (
                              (electionFilter === "all" ||
                                e.id === electionFilter) &&
                              (unitFilter === "all" || u.id === unitFilter) &&
                              `${e.title} ${u.name}`.includes(search) &&
                              (filter === "all" ||
                                stateOf(e, u, store.now) === filter)
                            );
                          })
                          .map((u) => {
                            const e = store.elections.find(
                                (e) => e.id === u.electionId,
                              )!,
                              eligible = store.eligibility.filter(
                                (x) => x.unitId === u.id,
                              ),
                              total = eligible.filter((x) => x.voted).length;
                            return (
                              <tr key={u.id}>
                                <td>
                                  <strong>{e.title}</strong>
                                  <small>{u.name}</small>
                                </td>
                                <td>
                                  <Badge state={stateOf(e, u, store.now)} />
                                </td>
                                <td>{eligible.length} คน</td>
                                <td>
                                  {total} คน (
                                  {eligible.length
                                    ? ((total / eligible.length) * 100).toFixed(
                                        1,
                                      )
                                    : 0}
                                  %)
                                  <progress
                                    max={eligible.length || 1}
                                    value={total}
                                  />
                                </td>
                                <td className="time-cell">
                                  {formatTime(u.open || e.open)}
                                  <br />— {formatTime(u.close || e.close)}
                                </td>
                                <td>
                                  <button
                                    className="quiet"
                                    aria-label={`จัดการ ${e.title} ${u.name}`}
                                    onClick={() => setDetail(u.id)}
                                  >
                                    ดูรายละเอียด
                                    <ChevronRight size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <div className="table-footer">
                    {units.length} หน่วย • ข้อมูลตัวอย่าง
                  </div>
                </section>
                <section className="panel election-actions">
                  <h2>การเลือกตั้งและฉบับร่าง</h2>
                  {store.elections
                    .filter((e) => inScope(role, e.id, store))
                    .map((e) => (
                      <div className="row-between" key={e.id}>
                        <span>{e.title}</span>
                        <button
                          className="secondary"
                          disabled={!canManage(role, e.id, store)}
                          onClick={() => setEditing(e.id)}
                        >
                          แก้ไข / เพิ่มหน่วย
                        </button>
                      </div>
                    ))}
                </section>
              </>
            ) : section === "/voters" ? (
              <Voters store={store} role={role} notify={notify} />
            ) : section === "/results" ? (
              <Results store={store} role={role} notify={notify} />
            ) : section === "/history" ? (
              <HistoryScreen store={store} />
            ) : section === "/access-codes" ? (
              <AccessCodes store={store} role={role} notify={notify} />
            ) : (
              <Empty>ไม่พบหน้าที่ต้องการ</Empty>
            )}
          </>
        )}
        {editing && (
          <ElectionEditor
            key={editing}
            electionId={editing}
            store={store}
            role={role}
            close={() => setEditing(null)}
            notify={notify}
          />
        )}{" "}
        {detail && (
          <UnitDetail
            key={detail}
            unitId={detail}
            store={store}
            role={role}
            close={() => setDetail(null)}
            notify={notify}
          />
        )}
      </main>
    </div>
  );
}
function Stat({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
function Results({
  store,
  role,
  notify,
}: {
  store: Store;
  role: Role;
  notify: (s: string) => void;
}) {
  const [unitId, setUnit] = useState(store.units[0].id),
    [note, setNote] = useState(""),
    [winners, setWinners] = useState<string[]>([]),
    [connected, setConnected] = useState(true),
    [lastPoll, setPoll] = useState(store.now);
  const unit = store.units.find((u) => u.id === unitId)!,
    e = store.elections.find((e) => e.id === unit.electionId)!;
  const state = stateOf(e, unit, store.now),
    total = store.eligibility.filter(
      (x) => x.unitId === unit.id && x.voted,
    ).length;
  const allowed = [
    "super_admin",
    "live_results_viewer",
    "results_certifier",
  ].includes(role);
  const liveAllowed = ["super_admin", "live_results_viewer"].includes(role);
  useEffect(() => {
    if (!allowed) return;
    mockRepository.update((s) =>
      mockRepository.audit(s, "เปิดดูคะแนน", unitId),
    );
  }, [unitId, allowed]);
  useEffect(() => {
    if (!connected || !liveAllowed) return;
    const timer = setInterval(() => {
      const current = mockRepository.read();
      setPoll(current.now);
      mockRepository.update((s) => {
        const u = s.units.find((u) => u.id === unitId)!;
        const count = s.eligibility.filter(
          (x) => x.unitId === unitId && x.voted,
        ).length;
        // OPEN-QUESTION(SPEC §7.2): mock snapshot 10 นาที / k=5 / ผู้ใช้สิทธิ์ขั้นต่ำ 10
        if (shouldRefreshSnapshot(u, count, s.now)) {
          u.snapshot = { ...u.tally };
          u.snapshotAbstain = u.abstainCount;
          u.snapshotTotal = count;
          u.snapshotAt = s.now;
        }
      });
    }, mockPrivacy.pollSeconds * 1000);
    return () => clearInterval(timer);
  }, [connected, liveAllowed, unitId]);
  if (!allowed) return <Empty>บทบาทนี้ไม่มีสิทธิ์ดูคะแนน</Empty>;
  const result = resultOf(e, unit, total),
    live = state === "open" || state === "future",
    hidden = live && (total < mockPrivacy.minimumVoters || !liveAllowed);
  const tally =
    unit.certification?.tally || (live ? unit.snapshot : unit.tally);
  return (
    <>
      <div className="toolbar">
        <Field label="การเลือกตั้ง / หน่วย">
          <select
            value={unitId}
            onChange={(ev) => {
              setUnit(ev.target.value);
              setWinners([]);
              setNote("");
            }}
          >
            {store.units.map((u) => (
              <option value={u.id} key={u.id}>
                {store.elections.find((e) => e.id === u.electionId)?.title} —{" "}
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="secondary" onClick={() => setConnected((c) => !c)}>
          {connected ? "จำลองขาดการเชื่อมต่อ" : "เชื่อมต่ออีกครั้ง"}
        </button>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>{live ? text.live : "ตรวจและประกาศผล"}</h2>
            <p>
              อัปเดตล่าสุด {formatTime(lastPoll)} •{" "}
              {connected ? "เชื่อมต่อ" : "ขาดการเชื่อมต่อ ลองใหม่อัตโนมัติ"}
            </p>
          </div>
          <Badge state={state} />
        </div>
        <p>
          ผู้มีสิทธิ์{" "}
          {store.eligibility.filter((x) => x.unitId === unit.id).length} คน •
          ใช้สิทธิ์แล้ว {total} คน
        </p>
        {hidden ? (
          <Notice>
            ไม่แสดงคะแนนรายผู้สมัครระหว่างเปิดหีบในหน่วยที่ผู้ใช้สิทธิ์น้อยกว่า
            {mockPrivacy.minimumVoters} คน หรือบทบาทไม่มีสิทธิ์ดูคะแนนสด
          </Notice>
        ) : (
          <div className="result-bars">
            {unit.candidates.map((c) => (
              <div key={c.id}>
                <div className="row-between">
                  <span>
                    หมายเลข {c.number} {c.name}
                  </span>
                  <strong>{tally[c.id] || 0}</strong>
                </div>
                <progress
                  max={Math.max(total, ...Object.values(tally), 1)}
                  value={tally[c.id] || 0}
                />
              </div>
            ))}
            <p>
              {text.abstain}:{" "}
              {unit.certification?.abstain ??
                (live ? unit.snapshotAbstain : unit.abstainCount)}
            </p>
          </div>
        )}
        {live && (
          <p className="muted">
            Snapshot ทุก {mockPrivacy.snapshotMinutes} นาที
            เมื่อมีบัตรใหม่อย่างน้อย {mockPrivacy.k} ใบ • ค่าจำลองรอลูกค้ายืนยัน
          </p>
        )}
        {state === "closed" && (
          <>
            {result.reason ? (
              <Notice>ต้องตัดสิน: {result.reason}</Notice>
            ) : (
              <Notice success>
                ผลเสนอ:{" "}
                {result.winners
                  .map((id) => unit.candidates.find((c) => c.id === id)?.name)
                  .join(", ")}
              </Notice>
            )}
            <p>
              การกระทบยอด:{" "}
              {unit.ballotCount === total
                ? "ตรงกัน ✓"
                : "ไม่ตรงกัน — ต้องตรวจสอบ"}{" "}
              • บัตร {unit.ballotCount} ใบ • ผู้ใช้สิทธิ์ {total} คน •
              คะแนนตัวเลือกรวม{" "}
              {Object.values(unit.tally).reduce((a, b) => a + b, 0)}{" "}
              (บัตรหลายตัวเลือกมีมากกว่าหนึ่งคะแนน)
            </p>
            {["super_admin", "results_certifier"].includes(role) && (
              <>
                <Field label="ผู้ชนะที่จะรับรอง (เลือกไม่เกินจำนวนที่นั่ง)">
                  <div className="checkbox-list">
                    {unit.candidates.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={winners.includes(c.id)}
                          onChange={(ev) =>
                            setWinners((prev) =>
                              ev.target.checked
                                ? [...prev, c.id]
                                : prev.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="บันทึกการตัดสิน / เหตุผล">
                  <textarea
                    value={note}
                    onChange={(ev) => setNote(ev.target.value)}
                  />
                </Field>
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      mockRepository.certify(
                        unit.id,
                        role,
                        result.reason ? winners : result.winners,
                        note,
                      );
                      notify("ประกาศผลแล้ว");
                    } catch (err) {
                      notify((err as Error).message);
                    }
                  }}
                >
                  รับรองและประกาศผล
                </button>
              </>
            )}
          </>
        )}
        {unit.certification && (
          <Notice success>
            ประกาศผลแล้ว • {unit.certification.by} •{" "}
            {formatTime(unit.certification.at)}
          </Notice>
        )}
      </section>
    </>
  );
}
function HistoryScreen({ store }: { store: Store }) {
  const [year, setYear] = useState("all");
  const [electionId, setElection] = useState("all"),
    [unitId, setUnit] = useState("all");
  const units = store.units.filter(
    (u) =>
      u.certification &&
      (electionId === "all" || u.electionId === electionId) &&
      (unitId === "all" || u.id === unitId) &&
      (year === "all" ||
        String(new Date(u.certification.at).getUTCFullYear() + 543) === year),
  );
  return (
    <>
      <Field label="ปี พ.ศ.">
        <select value={year} onChange={(e) => setYear(e.target.value)}>
          <option value="all">ทุกปี</option>
          <option>2568</option>
          <option>2569</option>
        </select>
      </Field>
      <div className="form-grid">
        <Field label="การเลือกตั้งในประวัติ">
          <select
            value={electionId}
            onChange={(e) => {
              setElection(e.target.value);
              setUnit("all");
            }}
          >
            <option value="all">ทุกการเลือกตั้ง</option>
            {store.elections
              .filter((e) =>
                store.units.some(
                  (u) => u.electionId === e.id && u.certification,
                ),
              )
              .map((e) => (
                <option value={e.id} key={e.id}>
                  {e.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="หน่วยในประวัติ">
          <select value={unitId} onChange={(e) => setUnit(e.target.value)}>
            <option value="all">ทุกหน่วย</option>
            {store.units
              .filter(
                (u) =>
                  u.certification &&
                  (electionId === "all" || u.electionId === electionId),
              )
              .map((u) => (
                <option value={u.id} key={u.id}>
                  {u.certification!.unitName}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {units.map((u) => (
        <section className="panel" key={u.id}>
          <Badge state="announced" />
          <h2>{u.certification!.title}</h2>
          <p>
            {u.certification!.unitName} • {u.location}
          </p>
          <p>
            ผู้ชนะ:{" "}
            {u
              .certification!.winners.map(
                (id) => u.candidates.find((c) => c.id === id)?.name,
              )
              .join(", ") || "ไม่มีผู้ชนะ"}
          </p>
          <p>
            ประกาศ {formatTime(u.certification!.at)} โดย {u.certification!.by}
          </p>
          <p>{u.certification!.note}</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ผู้สมัคร</th>
                  <th>คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {u.candidates.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{u.certification!.tally[c.id] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!units.length && <Empty>ไม่มีผลที่ประกาศในปีนี้</Empty>}
    </>
  );
}
function AccessCodes({
  store,
  role,
  notify,
}: {
  store: Store;
  role: Role;
  notify: (s: string) => void;
}) {
  const [code, setCode] = useState("000127"),
    [verified, setVerified] = useState(false),
    [issued, setIssued] = useState("");
  if (!["super_admin", "helpdesk"].includes(role))
    return <Empty>บทบาทนี้ไม่มีสิทธิ์ออกรหัสสำรอง</Empty>;
  const member = store.members.find((m) => m.code === code);
  return (
    <section className="panel narrow">
      <h2>ออกรหัสสำรอง (จำลอง)</h2>
      <p>ตรวจตัวตนต่อหน้าหรือวิดีโอคอลก่อนออกรหัสจริง</p>
      <Field label="รหัสสมาชิก">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setVerified(false);
            setIssued("");
          }}
        />
      </Field>
      {member ? (
        <p>
          {member.name} • {member.affiliation}
        </p>
      ) : (
        <Notice>ไม่พบสมาชิกตัวอย่าง</Notice>
      )}
      <label className="checkbox-line">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        จำลองว่าตรวจบัตรและยืนยันตัวตนแล้ว
      </label>
      <button
        className="primary"
        disabled={!member || !verified}
        onClick={() => {
          const token = crypto
            .randomUUID()
            .replaceAll("-", "")
            .slice(0, 10)
            .toUpperCase();
          sessionStorage.setItem(`demo-helpdesk-${code}`, token);
          setIssued(token);
          mockRepository.update((s) =>
            mockRepository.audit(s, "ออกรหัสสำรองจำลอง", code),
          );
          notify("ออกรหัสสำรองจำลองแล้ว");
        }}
      >
        ออกรหัสสำรอง
      </button>
      {issued && (
        <Notice success>
          แสดงครั้งเดียว: <code>{issued}</code>{" "}
          <button className="quiet" onClick={() => setIssued("")}>
            ปิดรหัส
          </button>
        </Notice>
      )}
      <p className="muted">
        รหัสนี้ใช้ทดสอบในแท็บนี้เท่านั้น ไม่มีการส่งข้อความจริง
      </p>
      <button className="secondary" onClick={() => go("/user/login")}>
        <Eye size={16} />
        เปิดหน้าทดสอบสมาชิก
      </button>
    </section>
  );
}
