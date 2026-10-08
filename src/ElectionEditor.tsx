import { useEffect, useState } from "react";
import { Plus, Copy, Download, ExternalLink } from "lucide-react";
import { stateOf, type Election, type Role, type Store } from "./model";
import {
  canManage,
  cancellationBlock,
  mockRepository,
  newUnit,
} from "./mock-repository";
import { text } from "./text";
import { Badge, Field, Modal, Notice, download, go } from "./ui";
function thaiInput(utc: string) {
  return new Date(Date.parse(utc) + 7 * 3600000).toISOString().slice(0, 16);
}
function utcInput(local: string) {
  return new Date(`${local}:00+07:00`).toISOString();
}
function CandidateEditor({
  unitId,
  candidateId,
  store,
  role,
  close,
  notify,
}: {
  unitId: string;
  candidateId: string;
  store: Store;
  role: Role;
  close: () => void;
  notify: (s: string) => void;
}) {
  const unit = store.units.find((u) => u.id === unitId)!,
    candidate = unit.candidates.find((c) => c.id === candidateId)!,
    election = store.elections.find((e) => e.id === unit.electionId)!;
  const [value, setValue] = useState({ ...candidate }),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const state = stateOf(election, unit, store.now),
    locked = state === "open";
  return (
    <Modal title="แก้ไขข้อมูลผู้สมัคร" close={close}>
      {locked && (
        <Notice>
          ระหว่างเปิดหีบแก้คำผิดในประวัติได้เฉพาะผู้ดูแลสูงสุด พร้อมเหตุผล
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            mockRepository.update((s) => {
              const u = s.units.find((u) => u.id === unitId)!,
                current = u.candidates.find((c) => c.id === candidateId)!,
                el = s.elections.find((e) => e.id === u.electionId)!;
              const status = stateOf(el, u, s.now);
              if (
                !canManage(role, el.id, s) ||
                ["closed", "announced", "cancelled"].includes(status)
              )
                throw new Error("แก้ข้อมูลในสถานะนี้ไม่ได้");
              if (
                status === "open" &&
                (role !== "super_admin" ||
                  !reason.trim() ||
                  value.name !== current.name ||
                  value.number !== current.number ||
                  value.policy !== current.policy)
              )
                throw new Error(
                  "ระหว่างเปิดหีบแก้ได้เฉพาะคำผิดในประวัติ พร้อมเหตุผล",
                );
              if (
                u.candidates.some(
                  (c) => c.id !== candidateId && c.number === value.number,
                )
              )
                throw new Error("หมายเลขซ้ำในหน่วย");
              Object.assign(current, value);
              mockRepository.audit(s, "แก้ข้อมูลผู้สมัคร", unitId, reason);
            });
            close();
            notify("บันทึกข้อมูลผู้สมัครแล้ว");
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <Field label="หมายเลข">
          <input
            type="number"
            min="1"
            required
            disabled={locked}
            value={value.number}
            onChange={(e) =>
              setValue({ ...value, number: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="ชื่อผู้สมัคร">
          <input
            required
            disabled={locked}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
          />
        </Field>
        <Field label="ประวัติ">
          <textarea
            required
            value={value.bio}
            onChange={(e) => setValue({ ...value, bio: e.target.value })}
          />
        </Field>
        <Field label="นโยบาย">
          <textarea
            required
            disabled={locked}
            value={value.policy}
            onChange={(e) => setValue({ ...value, policy: e.target.value })}
          />
        </Field>
        <Field label="เหตุผลการแก้ไข">
          <input
            required={locked}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <button className="primary">บันทึกผู้สมัคร</button>
      </form>
    </Modal>
  );
}
export function ElectionEditor({
  electionId,
  store,
  role,
  close,
  notify,
}: {
  electionId: string;
  store: Store;
  role: Role;
  close: () => void;
  notify: (s: string) => void;
}) {
  const existing = store.elections.find((e) => e.id === electionId);
  const [value, setValue] = useState<Election>(() =>
    existing
      ? { ...existing }
      : {
          id: crypto.randomUUID(),
          title: "",
          organizer: "หน่วยงานตัวอย่าง",
          open: "2026-10-20T01:00:00Z",
          close: "2026-10-20T10:00:00Z",
          published: false,
          cancelled: false,
          seats: 1,
          min: 1,
          max: 1,
          abstain: true,
          multiUnit: false,
          winnerRule: "undefined",
          version: 1,
        },
  );
  const [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [unitName, setUnitName] = useState(""),
    [location, setLocation] = useState("ออนไลน์");
  const states = store.units
    .filter((u) => u.electionId === electionId)
    .map((u) => stateOf(existing || value, u, store.now));
  const readonly = states.some((s) => ["closed", "announced"].includes(s)),
    locked = readonly || states.includes("open");
  const set = <K extends keyof Election>(key: K, v: Election[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));
  const ownUnits = store.units.filter(
    (u) => u.electionId === electionId && !u.cancelled,
  );
  return (
    <Modal
      title={existing ? "แก้ไขการเลือกตั้ง" : "สร้างการเลือกตั้ง"}
      close={close}
    >
      {!existing?.published && <Notice>{text.draftHelp}</Notice>}
      {locked && (
        <Notice>
          {readonly
            ? "ปิดหีบแล้ว / ประกาศแล้ว อ่านอย่างเดียว"
            : "กำลังเปิดหีบ: กติกาและเวลาเปิดถูกล็อก"}
        </Notice>
      )}
      {error && <Notice>{error}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (existing && !canManage(role, existing.id, store))
              throw new Error("ไม่มีสิทธิ์แก้ไขการเลือกตั้งนี้");
            mockRepository.saveElection(value, role, existing?.version, reason);
            notify("บันทึกการเลือกตั้งแล้ว");
            close();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        <Field label="ชื่อการเลือกตั้ง">
          <input
            required
            value={value.title}
            disabled={readonly}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label="ผู้จัด">
          <input
            required
            value={value.organizer}
            disabled={readonly}
            onChange={(e) => set("organizer", e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="เวลาเปิด (เวลาไทย)">
            <input
              required
              type="datetime-local"
              value={thaiInput(value.open)}
              disabled={locked}
              onChange={(e) =>
                e.target.value && set("open", utcInput(e.target.value))
              }
            />
          </Field>
          <Field label="เวลาปิด (เวลาไทย)">
            <input
              required
              type="datetime-local"
              value={thaiInput(value.close)}
              disabled={readonly}
              onChange={(e) =>
                e.target.value && set("close", utcInput(e.target.value))
              }
            />
          </Field>
        </div>
        <p className="muted">
          ปีในช่องกรอกเป็น ค.ศ.; หน้าแสดงผลใช้เวลาไทย ปี พ.ศ.
        </p>
        <div className="form-grid three">
          {(["seats", "min", "max"] as const).map((key, i) => (
            <Field
              label={["จำนวนที่นั่ง", "เลือกขั้นต่ำ", "เลือกสูงสุด"][i]}
              key={key}
            >
              <input
                required
                type="number"
                min="1"
                max="20"
                disabled={locked}
                value={value[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </Field>
          ))}
        </div>
        <Field label="กฎผู้ชนะ">
          <select
            disabled={locked}
            value={value.winnerRule}
            onChange={(e) =>
              set("winnerRule", e.target.value as Election["winnerRule"])
            }
          >
            <option value="undefined">ยังไม่กำหนด — รอตัดสิน</option>
            <option value="plurality">คะแนนสูงสุดตามจำนวนที่นั่ง</option>
          </select>
        </Field>
        <label className="checkbox-line">
          <input
            type="checkbox"
            disabled={locked}
            checked={value.abstain}
            onChange={(e) => set("abstain", e.target.checked)}
          />
          อนุญาตไม่ประสงค์ลงคะแนน
        </label>
        <label className="checkbox-line">
          <input
            type="checkbox"
            disabled={locked}
            checked={value.multiUnit}
            onChange={(e) => set("multiUnit", e.target.checked)}
          />
          อนุญาตสมาชิกมีสิทธิ์หลายหน่วยในการเลือกตั้งนี้
        </label>
        <Field label="เหตุผลการแก้ไข / ขยายเวลาปิด">
          <textarea
            value={reason}
            disabled={readonly}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
        <section className="checklist">
          <h3>Checklist ก่อนเผยแพร่</h3>
          <p>{ownUnits.length ? "✓" : "○"} มีหน่วยลงคะแนน</p>
          <p>
            {ownUnits.length && ownUnits.every((u) => u.candidates.length)
              ? "✓"
              : "○"}{" "}
            มีผู้สมัครทุกหน่วย
          </p>
          <p>
            {ownUnits.length &&
            ownUnits.every((u) =>
              store.eligibility.some((x) => x.unitId === u.id),
            )
              ? "✓"
              : "○"}{" "}
            มีผู้มีสิทธิ์ทุกหน่วย
          </p>
          <label className="checkbox-line">
            <input
              type="checkbox"
              disabled={locked}
              checked={value.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            เผยแพร่การเลือกตั้ง
          </label>
        </section>
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={close}>
            ปิด
          </button>
          <button className="primary" disabled={readonly}>
            บันทึก
          </button>
        </div>
      </form>
      {existing && !locked && (
        <section className="add-unit">
          <h3>เพิ่มหน่วยลงคะแนน</h3>
          <p className="muted">ผลคะแนนและผู้ชนะจะนับแยกตามหน่วย</p>
          <Field label="ชื่อหน่วย">
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
            />
          </Field>
          <Field label="สถานที่">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <button
            className="secondary"
            disabled={!unitName.trim()}
            onClick={() => {
              try {
                mockRepository.update((s) => {
                  s.units.push(
                    newUnit(existing.id, unitName.trim(), location, s.now),
                  );
                  mockRepository.audit(s, "เพิ่มหน่วย", existing.id);
                });
                setUnitName("");
                notify("สร้างหน่วยพร้อม publicId สุ่มแล้ว");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <Plus size={16} />
            เพิ่มหน่วย
          </button>
        </section>
      )}
    </Modal>
  );
}
export function UnitDetail({
  unitId,
  store,
  role,
  close,
  notify,
}: {
  unitId: string;
  store: Store;
  role: Role;
  close: () => void;
  notify: (s: string) => void;
}) {
  const unit = store.units.find((u) => u.id === unitId)!,
    election = store.elections.find((e) => e.id === unit.electionId)!;
  const [qr, setQR] = useState(""),
    [name, setName] = useState(""),
    [number, setNumber] = useState(1),
    [bio, setBio] = useState(""),
    [policy, setPolicy] = useState("");
  const [editingCandidate, setEditingCandidate] = useState<string | null>(null);
  const [error, setError] = useState(""),
    [overrideOpen, setOpen] = useState(unit.open ? thaiInput(unit.open) : ""),
    [overrideClose, setClose] = useState(
      unit.close ? thaiInput(unit.close) : "",
    ),
    [reason, setReason] = useState("");
  const [cancelReason, setCancelReason] = useState(""),
    [cancelError, setCancelError] = useState("");
  const state = stateOf(election, unit, store.now),
    manage = canManage(role, unit.electionId, store),
    locked = !["draft", "future"].includes(state),
    readonly = ["closed", "announced", "cancelled"].includes(state);
  const link = `${location.origin}${location.pathname}#/user/u/${unit.publicId}`;
  const cancelBlocked = cancellationBlock(role, election, unit, store);
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((q) => q.toDataURL(link, { width: 220, margin: 2 }))
      .then((url) => {
        if (!cancelled) setQR(url);
      })
      .catch(() => setError("สร้าง QR ไม่สำเร็จ"));
    return () => {
      cancelled = true;
    };
  }, [link]);
  return (
    <Modal title={`${election.title} — ${unit.name}`} close={close}>
      <Badge state={state} />
      {error && <Notice>{error}</Notice>}
      <p>{unit.location}</p>
      <h3>ลิงก์ใช้สิทธิ์เฉพาะหน่วย</h3>
      <input aria-label="ลิงก์ใช้สิทธิ์" readOnly value={link} />
      <div className="button-row">
        <button
          className="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              notify("คัดลอกลิงก์แล้ว");
            } catch {
              setError("คัดลอกไม่ได้ กรุณาเลือกและคัดลอกลิงก์ด้วยตนเอง");
            }
          }}
        >
          <Copy size={15} />
          คัดลอก
        </button>
        <button
          className="secondary"
          onClick={() => {
            close();
            go(`/admin/preview/${unit.id}`);
          }}
        >
          <ExternalLink size={15} />
          ดูตัวอย่างหน้าสมาชิก
        </button>
      </div>
      {qr && (
        <div className="qr-section">
          <img src={qr} alt={`QR สำหรับหน่วย ${unit.name}`} />
          <a className="secondary" href={qr} download={`unit-${unit.id}.png`}>
            <Download size={15} />
            ดาวน์โหลด QR PNG
          </a>
        </div>
      )}
      {store.eligibility.filter((x) => x.unitId === unit.id).length < 10 && (
        <Notice>
          หน่วยนี้มีผู้มีสิทธิ์น้อยกว่า 10 คน ต้องระวังความลับของคะแนน
        </Notice>
      )}
      <h3>ผู้สมัครของหน่วย</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>หมายเลข</th>
              <th>ชื่อ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {unit.candidates.map((c) => (
              <tr key={c.id}>
                <td>{c.number}</td>
                <td>{c.name}</td>
                <td>
                  <button
                    className="quiet"
                    disabled={
                      !manage || readonly || (locked && role !== "super_admin")
                    }
                    onClick={() => setEditingCandidate(c.id)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="quiet"
                    disabled={!manage || locked}
                    onClick={() =>
                      mockRepository.update((s) => {
                        const u = s.units.find((u) => u.id === unit.id)!;
                        u.candidates = u.candidates.filter(
                          (x) => x.id !== c.id,
                        );
                        delete u.tally[c.id];
                      })
                    }
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {locked && (
        <p className="muted">
          ผู้สมัครและกติกาล็อกตามสถานะ • การแก้คำผิดในระบบจริงต้องมีสิทธิ์และ
          audit
        </p>
      )}
      {manage && !locked && (
        <form
          className="add-unit"
          onSubmit={(e) => {
            e.preventDefault();
            if (unit.candidates.some((c) => c.number === number)) {
              setError("หมายเลขผู้สมัครซ้ำในหน่วย");
              return;
            }
            mockRepository.update((s) => {
              const u = s.units.find((u) => u.id === unit.id)!;
              const id = crypto.randomUUID();
              u.candidates.push({
                id,
                number,
                name,
                bio,
                policy,
                portrait: (number - 1) % 3,
              });
              u.tally[id] = 0;
              mockRepository.audit(s, "เพิ่มผู้สมัคร", unit.id);
            });
            setName("");
            setError("");
          }}
        >
          <div className="form-grid">
            <Field label="หมายเลข">
              <input
                required
                type="number"
                min="1"
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
              />
            </Field>
            <Field label="ชื่อผู้สมัคร">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </div>
          <Field label="ประวัติ">
            <textarea
              required
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
          <Field label="นโยบาย">
            <textarea
              required
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
            />
          </Field>
          <button className="secondary">
            <Plus size={16} />
            เพิ่มผู้สมัคร
          </button>
        </form>
      )}
      {manage && !readonly && (
        <section className="add-unit">
          <h3>เวลาที่หน่วยกำหนดทับ (เว้นว่างใช้เวลาการเลือกตั้ง)</h3>
          <div className="form-grid">
            <Field label="เวลาเปิดหน่วย (เวลาไทย)">
              <input
                type="datetime-local"
                disabled={locked}
                value={overrideOpen}
                onChange={(e) => setOpen(e.target.value)}
              />
            </Field>
            <Field label="เวลาปิดหน่วย (เวลาไทย)">
              <input
                type="datetime-local"
                value={overrideClose}
                onChange={(e) => setClose(e.target.value)}
              />
            </Field>
          </div>
          <Field label="เหตุผล">
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <button
            className="secondary"
            onClick={() => {
              try {
                const open = overrideOpen
                    ? utcInput(overrideOpen)
                    : election.open,
                  shut = overrideClose
                    ? utcInput(overrideClose)
                    : election.close;
                if (Date.parse(shut) <= Date.parse(open))
                  throw new Error("เวลาปิดต้องหลังเวลาเปิด");
                if (
                  state === "open" &&
                  (!reason.trim() || Date.parse(shut) < Date.parse(store.now))
                )
                  throw new Error("ระบุเหตุผล และเวลาปิดต้องไม่ก่อนเวลาจำลอง");
                mockRepository.update((s) => {
                  const u = s.units.find((u) => u.id === unit.id)!;
                  if (!locked) u.open = overrideOpen ? open : undefined;
                  u.close = overrideClose ? shut : undefined;
                  mockRepository.audit(s, "แก้เวลาหน่วย", unit.id, reason);
                });
                notify("บันทึกเวลาหน่วยแล้ว");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            บันทึกเวลาหน่วย
          </button>
        </section>
      )}
      <form
        className="add-unit"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            mockRepository.cancelUnit(unit.id, role, cancelReason);
            setCancelError("");
            notify(text.cancelSuccess);
          } catch (err) {
            setCancelError((err as Error).message);
          }
        }}
      >
        <h3>ยกเลิกหน่วยลงคะแนน</h3>
        {cancelBlocked ? (
          <Notice>{cancelBlocked}</Notice>
        ) : (
          <p className="muted">
            ระบุเหตุผลก่อนยกเลิก ข้อมูลและคะแนนจำลองเดิมจะคงอยู่
          </p>
        )}
        <Field label={text.cancelReason}>
          <input
            required
            disabled={!!cancelBlocked}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </Field>
        {cancelError && <Notice>{cancelError}</Notice>}
        <button className="reset" disabled={!!cancelBlocked}>
          ยกเลิกหน่วย
        </button>
      </form>
      {editingCandidate && (
        <CandidateEditor
          unitId={unit.id}
          candidateId={editingCandidate}
          store={store}
          role={role}
          close={() => setEditingCandidate(null)}
          notify={notify}
        />
      )}
      <button
        className="quiet"
        onClick={() =>
          download(
            new Blob(
              [
                JSON.stringify(
                  { unit: unit.name, publicId: unit.publicId },
                  null,
                  2,
                ),
              ],
              { type: "application/json" },
            ),
            "unit-link.json",
          )
        }
      >
        ดาวน์โหลดข้อมูลลิงก์
      </button>
    </Modal>
  );
}
