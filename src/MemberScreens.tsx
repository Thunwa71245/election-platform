import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Check,
  UserCheck,
} from "lucide-react";
import {
  formatTime,
  stateOf,
  validateChoice,
  type Candidate,
  type Election,
  type Store,
  type Unit,
} from "./model";
import { mockRepository } from "./mock-repository";
import { text } from "./text";
import { Badge, Empty, Modal, Notice, Portrait, go } from "./ui";

export function MemberScreens({
  path,
  store,
  code,
  network,
  notify,
}: {
  path: string;
  store: Store;
  code: string;
  network: string;
  notify: (s: string) => void;
}) {
  if (path.startsWith("/user/u/")) {
    const unit = store.units.find((u) => u.publicId === path.split("/")[3]);
    const election = store.elections.find((e) => e.id === unit?.electionId);
    if (!unit || !election || !election.published)
      return (
        <main className="member-main">
          <Empty>{text.missing}</Empty>
          <a href="#/user">ดูหน่วยที่ฉันมีสิทธิ์</a>
        </main>
      );
    if (
      !store.eligibility.some(
        (x) => x.memberCode === code && x.unitId === unit.id,
      )
    )
      return (
        <main className="member-main">
          <Empty>{text.denied}</Empty>
          <a href="#/user">ดูหน่วยที่ฉันมีสิทธิ์</a>
        </main>
      );
    return (
      <main className="member-main">
        <Ballot
          key={unit.id}
          unit={unit}
          election={election}
          store={store}
          code={code}
          network={network}
          notify={notify}
        />
      </main>
    );
  }
  const rights = store.eligibility.filter(
    (x) =>
      x.memberCode === code &&
      store.elections.find(
        (e) => e.id === store.units.find((u) => u.id === x.unitId)?.electionId,
      )?.published,
  );
  return (
    <main className="member-main">
      <div className="page-title">
        <div>
          <h1>รายการที่ฉันมีสิทธิ์</h1>
          <p>เลือกการเลือกตั้งที่ต้องการใช้สิทธิ์จากรายการด้านล่าง</p>
        </div>
        <span className="count-label">
          <UserCheck size={18} />
          {rights.length} รายการ
        </span>
      </div>
      {!rights.length ? (
        <Empty>ไม่มีรายการที่คุณมีสิทธิ์ลงคะแนน</Empty>
      ) : (
        <div className="entitlements">
          {rights.map((right) => {
            const u = store.units.find((u) => u.id === right.unitId)!,
              e = store.elections.find((e) => e.id === u.electionId)!,
              state = stateOf(e, u, store.now);
            return (
              <article className="entitlement" key={u.id}>
                <div className="entitlement-icon">
                  <UserCheck />
                </div>
                <div className="entitlement-content">
                  <div className="row-between">
                    <h2>{e.title}</h2>
                    {right.voted ? (
                      <span className="badge announced">
                        <Check size={14} />
                        {text.voted}
                      </span>
                    ) : (
                      <Badge state={state} />
                    )}
                  </div>
                  <p>
                    {u.name} • {right.affiliation}
                  </p>
                  <div className="metadata">
                    <span>
                      <MapPin size={16} />
                      {u.location}
                    </span>
                    <span>
                      <Calendar size={16} />
                      {formatTime(u.open || e.open)} —{" "}
                      {formatTime(u.close || e.close)}
                    </span>
                  </div>
                  <div className="row-between entitlement-bottom">
                    <span>
                      เลือกได้ {e.min === e.max ? e.max : `${e.min}–${e.max}`}{" "}
                      คน • {e.seats} ที่นั่ง
                    </span>
                    <button
                      className={
                        state === "open" && !right.voted
                          ? "primary"
                          : "secondary"
                      }
                      onClick={() => go(`/user/u/${u.publicId}`)}
                    >
                      {state === "open" && !right.voted ? "ลงคะแนน" : "ดูสถานะ"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  {u.certification && (
                    <p className="certified">
                      ผู้ชนะที่ประกาศแล้ว:{" "}
                      {u.certification.winners
                        .map(
                          (id) => u.candidates.find((c) => c.id === id)?.name,
                        )
                        .join(", ") || "ไม่มีผู้ชนะ"}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export function Ballot({
  unit,
  election,
  store,
  code,
  network = "normal",
  preview = false,
  notify,
}: {
  unit: Unit;
  election: Election;
  store: Store;
  code?: string;
  network?: string;
  preview?: boolean;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [abstain, setAbstain] = useState(false),
    [confirm, setConfirm] = useState(false),
    [bio, setBio] = useState<Candidate | null>(null);
  const [key, setKey] = useState(""),
    [busy, setBusy] = useState(false),
    [unknown, setUnknown] = useState(false),
    [error, setError] = useState("");
  const right = store.eligibility.find(
      (x) => x.memberCode === code && x.unitId === unit.id,
    ),
    state = stateOf(election, unit, store.now);
  const canVote = preview || (state === "open" && !right?.voted);
  const openConfirm = () => {
    setKey(crypto.randomUUID());
    setConfirm(true);
    setError("");
  };
  const choose = (id: string) => {
    setAbstain(false);
    if (election.max === 1) {
      setSelected([id]);
      openConfirm();
    } else
      setSelected((prev) =>
        prev.includes(id)
          ? prev.filter((x) => x !== id)
          : prev.length < election.max
            ? [...prev, id]
            : prev,
      );
  };
  async function send(retry = false) {
    if (preview) {
      setConfirm(false);
      setSelected([]);
      setAbstain(false);
      notify("(ตัวอย่าง) ระบบจะบันทึกคะแนนที่ขั้นตอนนี้");
      return;
    }
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (network !== "before" || retry)
        await mockRepository.vote(code!, unit.id, key, selected, abstain);
      if (network !== "normal" && !retry) {
        setUnknown(true);
        return;
      }
      setSelected([]);
      setAbstain(false);
      setConfirm(false);
      setUnknown(false);
      go("/user");
      setTimeout(() => notify(text.success), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function recover() {
    try {
      const voted = mockRepository
        .read()
        .eligibility.find(
          (x) => x.memberCode === code && x.unitId === unit.id,
        )?.voted;
      if (voted) {
        setSelected([]);
        setAbstain(false);
        setUnknown(false);
        setConfirm(false);
        go("/user");
        setTimeout(() => notify(text.success), 50);
      } else {
        setError("ตรวจแล้ว: ยังไม่ใช้สิทธิ์ ส่งใหม่ด้วยรหัสคำขอเดิมได้");
      }
    } catch {
      setError(text.unknown);
    }
  }
  return (
    <>
      <a className="back-link" href={preview ? "#/admin/elections" : "#/user"}>
        <ArrowLeft size={16} />
        {preview ? "กลับหน้าผู้ดูแล" : "รายการที่ฉันมีสิทธิ์"}
      </a>
      {preview && <Notice>{text.preview}</Notice>}
      <div className="ballot-heading">
        <h1>{election.title}</h1>
        <p>
          {unit.name} • {unit.location}
        </p>
        <div className="row-between">
          <span className="instruction">
            เลือกได้{" "}
            {election.min === election.max
              ? election.max
              : `${election.min}–${election.max}`}{" "}
            คน
          </span>
          <Badge state={state} />
        </div>
      </div>
      {!preview && right?.voted && <Notice success>{text.voted}</Notice>}
      {!preview && state === "cancelled" && (
        <Notice>หน่วยลงคะแนนนี้ถูกยกเลิก</Notice>
      )}
      {!preview && state === "closed" && <Notice>ปิดหีบแล้ว</Notice>}
      {!preview && state === "future" && (
        <Notice>
          ยังไม่เปิดหีบ • เปิด {formatTime(unit.open || election.open)}
        </Notice>
      )}
      {!preview && unit.certification && (
        <Notice success>
          ประกาศผลแล้ว • ผู้ชนะ:{" "}
          {unit.certification.winners
            .map((id) => unit.candidates.find((c) => c.id === id)?.name)
            .join(", ") || "ไม่มีผู้ชนะ"}
        </Notice>
      )}
      {(preview || (["open", "future"].includes(state) && !right?.voted)) && (
        <>
          <div className="candidate-grid">
            {unit.candidates.map((c) => (
              <article
                key={c.id}
                className={`candidate-card ${selected.includes(c.id) ? "selected" : ""}`}
              >
                <button
                  className="candidate-choice"
                  onClick={() => choose(c.id)}
                  disabled={!canVote || busy}
                  aria-pressed={selected.includes(c.id)}
                  aria-label={`เลือกหมายเลข ${c.number} ${c.name}`}
                >
                  <Portrait index={c.portrait} name={c.name} />
                  <span className="candidate-number">{c.number}</span>
                  {selected.includes(c.id) && (
                    <span className="selection-check">
                      <Check size={20} />
                    </span>
                  )}
                  <h2>{c.name}</h2>
                </button>
                <button className="quiet full" onClick={() => setBio(c)}>
                  ดูประวัติ / นโยบาย
                </button>
              </article>
            ))}
          </div>
          {election.abstain && (
            <button
              className={`abstain-option ${abstain ? "selected" : ""}`}
              aria-pressed={abstain}
              disabled={!canVote}
              onClick={() => {
                setSelected([]);
                setAbstain(true);
                openConfirm();
              }}
            >
              <span className="check-box">
                {abstain && <Check size={18} />}
              </span>
              {text.abstain}
            </button>
          )}
          {election.max > 1 && (
            <div className="selection-bar">
              <span>
                เลือกแล้ว {selected.length} / {election.max} คน
              </span>
              <button
                className="primary"
                disabled={
                  !canVote || !validateChoice(election, unit, selected, abstain)
                }
                onClick={openConfirm}
              >
                ตรวจทานและยืนยัน
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
      {bio && (
        <Modal title={bio.name} close={() => setBio(null)}>
          <Portrait index={bio.portrait} name={bio.name} />
          <h3>ประวัติ</h3>
          <p>{bio.bio}</p>
          <h3>นโยบาย</h3>
          <p>{bio.policy}</p>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={unknown ? "ตรวจสอบสถานะการลงคะแนน" : "ยืนยันการลงคะแนน"}
          busy={busy || unknown}
          close={() => setConfirm(false)}
        >
          {unknown ? (
            <>
              <Notice>{text.unknown}</Notice>
              <p>กำลังตรวจสอบสถานะการลงคะแนน…</p>
              {error && <Notice>{error}</Notice>}
              <div className="modal-actions">
                <button className="secondary" disabled={busy} onClick={recover}>
                  ลองตรวจสถานะอีกครั้ง
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => send(true)}
                >
                  ส่งใหม่ด้วยคำขอเดิม
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                {abstain
                  ? text.confirmAbstain
                  : selected.length > 1
                    ? text.confirmMany
                    : text.confirm}
              </p>
              {abstain ? (
                <div className="confirm-person">{text.abstain}</div>
              ) : (
                selected.map((id) => {
                  const c = unit.candidates.find((c) => c.id === id)!;
                  return (
                    <div className="confirm-person" key={id}>
                      <Portrait index={c.portrait} name={c.name} />
                      <div>
                        <small>หมายเลข {c.number}</small>
                        <strong>{c.name}</strong>
                      </div>
                    </div>
                  );
                })
              )}
              <Notice>{text.irreversible}</Notice>
              {error && <Notice>{error}</Notice>}
              <div className="modal-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setConfirm(false)}
                >
                  {text.back}
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => send()}
                >
                  {busy ? "กำลังส่งคะแนน…" : text.submit}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
