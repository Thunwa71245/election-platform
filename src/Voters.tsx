import { useState } from "react";
import { Download, Plus, Upload, Check } from "lucide-react";
import {
  inspectRows,
  stateOf,
  type ImportRow,
  type Role,
  type Store,
} from "./model";
import { canManage, mockRepository } from "./mock-repository";
import { Empty, Field, Modal, Notice, download } from "./ui";
const columns = ["member_code", "name", "affiliation", "email", "phone"];
async function excel() {
  return (await import("exceljs")).default;
}
async function exportRows(rows: (string | number)[][], filename: string) {
  const Excel = await excel();
  const book = new Excel.Workbook(),
    sheet = book.addWorksheet("รายชื่อ");
  rows.forEach((row) =>
    sheet.addRow(
      row.map((value) =>
        typeof value === "string" && /^[=+\-@]/.test(value)
          ? `'${value}`
          : value,
      ),
    ),
  );
  sheet.columns.forEach((column) => {
    column.width = 26;
    column.numFmt = "@";
  });
  const buffer = await book.xlsx.writeBuffer();
  download(
    new Blob([new Uint8Array(buffer)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
export function Voters({
  store,
  role,
  notify,
}: {
  store: Store;
  role: Role;
  notify: (s: string) => void;
}) {
  const [unitId, setUnit] = useState(store.units[0].id),
    [importing, setImport] = useState(false),
    [adding, setAdding] = useState(false),
    [search, setSearch] = useState("");
  const unit = store.units.find((u) => u.id === unitId)!,
    election = store.elections.find((e) => e.id === unit.electionId)!,
    state = stateOf(election, unit, store.now);
  const manage = canManage(role, unit.electionId),
    editable = manage && !["closed", "announced", "cancelled"].includes(state);
  if (["live_results_viewer", "helpdesk"].includes(role))
    return <Empty>บทบาทนี้ไม่เห็นสถานะรายบุคคล</Empty>;
  const rows = store.eligibility.filter(
    (x) => x.unitId === unitId && `${x.memberCode} ${x.name}`.includes(search),
  );
  return (
    <>
      <div className="toolbar">
        <Field label="การเลือกตั้ง / หน่วย">
          <select value={unitId} onChange={(e) => setUnit(e.target.value)}>
            {store.units
              .filter(
                (u) =>
                  canManage(role, u.electionId) || role === "results_certifier",
              )
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {store.elections.find((e) => e.id === u.electionId)?.title} —{" "}
                  {u.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="button-row">
          <button
            className="secondary"
            disabled={!editable}
            onClick={() => setImport(true)}
          >
            <Upload size={16} />
            นำเข้า Excel
          </button>
          <button
            className="primary"
            disabled={!editable}
            onClick={() => setAdding(true)}
          >
            <Plus size={16} />
            เพิ่มผู้มีสิทธิ์
          </button>
        </div>
      </div>
      <section className="panel">
        <div className="panel-toolbar">
          <div>
            <h2>รายชื่อผู้มีสิทธิ์</h2>
            <p>รหัสสมาชิกเป็นข้อความ • ไม่แสดงเวลาใช้สิทธิ์</p>
          </div>
          <input
            aria-label="ค้นหาผู้มีสิทธิ์"
            placeholder="ค้นหารหัสหรือชื่อ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>รหัสสมาชิก</th>
                <th>ชื่อ–สกุล</th>
                <th>สังกัด</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberCode}>
                  <td>
                    <code>{r.memberCode}</code>
                  </td>
                  <td>{r.name}</td>
                  <td>{r.affiliation}</td>
                  <td>
                    {r.voted ? (
                      <span className="badge announced">
                        <Check size={14} />
                        ใช้สิทธิ์แล้ว
                      </span>
                    ) : (
                      "ยังไม่ใช้สิทธิ์"
                    )}
                  </td>
                  <td>
                    <button
                      className="quiet"
                      disabled={!editable || r.voted}
                      onClick={() => {
                        const reason = prompt("เหตุผลการลบสิทธิ์");
                        if (!reason?.trim()) return;
                        try {
                          mockRepository.update((s) => {
                            const current = s.eligibility.find(
                              (x) =>
                                x.unitId === unitId &&
                                x.memberCode === r.memberCode,
                            );
                            if (current?.voted)
                              throw new Error("สมาชิกใช้สิทธิ์แล้ว ลบไม่ได้");
                            s.eligibility = s.eligibility.filter(
                              (x) => x !== current,
                            );
                            mockRepository.audit(s, "ลบสิทธิ์", unitId, reason);
                          });
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      ลบสิทธิ์
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">{rows.length} รายการ</div>
      </section>
      {importing && (
        <Importer
          key={unitId}
          unitId={unitId}
          store={store}
          close={() => setImport(false)}
          notify={notify}
        />
      )}{" "}
      {adding && (
        <AddVoter
          unitId={unitId}
          store={store}
          close={() => setAdding(false)}
          notify={notify}
        />
      )}
    </>
  );
}
function AddVoter({
  unitId,
  store,
  close,
  notify,
}: {
  unitId: string;
  store: Store;
  close: () => void;
  notify: (s: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({
      member_code: "",
      name: "",
      affiliation: "",
      email: "",
      phone: "",
    }),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  return (
    <Modal title="เพิ่มผู้มีสิทธิ์" close={close}>
      {error && <Notice>{error}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const rows = inspectRows(
            [values],
            store,
            store.units.find((u) => u.id === unitId)!,
          );
          if (rows[0].status !== "pass") {
            setError(rows[0].issue);
            return;
          }
          try {
            mockRepository.importRows(unitId, rows, reason);
            notify("เพิ่มผู้มีสิทธิ์แล้ว");
            close();
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        {columns.map((key, i) => (
          <Field
            key={key}
            label={
              ["รหัสสมาชิก (Text)", "ชื่อ–สกุล", "สังกัด", "อีเมล", "เบอร์โทร"][
                i
              ]
            }
          >
            <input
              required={i < 3}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="เหตุผล (จำเป็นระหว่างเปิดหีบ)">
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button className="primary">ตรวจและเพิ่ม</button>
      </form>
    </Modal>
  );
}
function Importer({
  unitId,
  store,
  close,
  notify,
}: {
  unitId: string;
  store: Store;
  close: () => void;
  notify: (s: string) => void;
}) {
  const [step, setStep] = useState(1),
    [rows, setRows] = useState<ImportRow[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(""),
    [result, setResult] = useState("");
  const unit = store.units.find((u) => u.id === unitId)!;
  async function template() {
    await exportRows(
      [
        columns,
        ["000128", "สมาชิกใหม่ตัวอย่าง", "ฝ่ายบริการ", "new@example.com", ""],
      ],
      "voter-template.xlsx",
    );
  }
  async function readFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (!file.name.endsWith(".xlsx") || file.size > 5 * 1024 * 1024)
        throw new Error("รองรับ .xlsx ไม่เกิน 5 MB");
      const Excel = await excel(),
        book = new Excel.Workbook();
      await book.xlsx.load(await file.arrayBuffer());
      const sheet = book.worksheets[0];
      if (!sheet || sheet.rowCount > 20001)
        throw new Error("ไม่พบตาราง หรือเกิน 20,000 แถว");
      const headers = columns.map((_, i) =>
        String(sheet.getRow(1).getCell(i + 1).value || "").trim(),
      );
      if (headers.some((h, i) => h !== columns[i]))
        throw new Error(
          "คอลัมน์ต้องเป็น member_code, name, affiliation, email, phone ตามแม่แบบ",
        );
      const raw: Record<string, unknown>[] = [];
      sheet.eachRow((row, index) => {
        if (index === 1) return;
        raw.push(
          Object.fromEntries(
            columns.map((key, i) => [key, row.getCell(i + 1).value ?? ""]),
          ),
        );
      });
      setRows(inspectRows(raw, store, unit));
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const counts = {
    pass: rows.filter((r) => r.status === "pass").length,
    review: rows.filter((r) => r.status === "review").length,
    skip: rows.filter((r) => r.status === "skip").length,
    error: rows.filter((r) => r.status === "error").length,
  };
  const unresolved = rows.some((r) => r.status === "review" && !r.resolution);
  return (
    <Modal title="นำเข้าผู้มีสิทธิ์จาก Excel" close={close} busy={busy}>
      <ol className="steps">
        {[
          "แม่แบบ",
          "เลือกไฟล์",
          "ดูตัวอย่าง",
          "ตรวจข้อมูล",
          "จัดการแถว",
          "ยืนยัน",
          "บันทึก",
          "สรุปผล",
        ].map((label, i) => (
          <li className={step >= i + 1 ? "active" : ""} key={label}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {error && <Notice>{error}</Notice>}
      {step <= 2 ? (
        <>
          <p>รหัสสมาชิกต้องเป็นข้อความ เพื่อคงเลข 0 นำหน้า</p>
          <button
            className="secondary"
            onClick={() => template().catch((e) => setError(e.message))}
          >
            <Download size={16} />
            ดาวน์โหลดแม่แบบ Excel
          </button>
          <Field label="เลือกไฟล์ .xlsx">
            <input
              type="file"
              accept=".xlsx"
              disabled={busy}
              onChange={(e) => readFile(e.target.files?.[0])}
            />
          </Field>
          <p>
            {busy
              ? "กำลังอ่านไฟล์…"
              : "ไม่เกิน 5 MB / 20,000 แถว • ใช้ข้อมูลสมมติเท่านั้น"}
          </p>
        </>
      ) : step === 8 ? (
        <>
          <Notice success>{result}</Notice>
          <p>
            สถานะใช้สิทธิ์ของสมาชิกเดิมไม่เปลี่ยน ช่องทางติดต่อเดิมไม่ถูกอัปเดต
          </p>
          <button
            className="secondary"
            onClick={() =>
              exportRows(
                [
                  ["แถว", "รหัสสมาชิก", "สถานะ", "เหตุผล"],
                  ...rows.map((r) => [r.row, r.code, r.status, r.issue]),
                ],
                "import-report.xlsx",
              ).catch((e) => setError(e.message))
            }
          >
            ดาวน์โหลดผลรายแถว
          </button>
          <button className="primary" onClick={close}>
            เสร็จสิ้น
          </button>
        </>
      ) : (
        <>
          <p>
            ผ่าน {counts.pass} • ต้องตรวจสอบ {counts.review} • ข้าม{" "}
            {counts.skip} • ต้องแก้ {counts.error}
          </p>
          <div className="table-scroll import-table">
            <table>
              <thead>
                <tr>
                  <th>แถว</th>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>ผลตรวจ / วิธีจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>
                      <code>{r.code}</code>
                    </td>
                    <td>{r.name}</td>
                    <td>
                      {r.issue || "ผ่าน"}
                      {r.status === "review" && (
                        <select
                          aria-label={`จัดการแถว ${r.row}`}
                          value={r.resolution || ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((x, index) =>
                                index === i
                                  ? {
                                      ...x,
                                      resolution: e.target
                                        .value as ImportRow["resolution"],
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <option value="">เลือกวิธีจัดการ</option>
                          <option value="keep">ใช้ข้อมูลทะเบียนเดิม</option>
                          <option value="update">
                            อัปเดตชื่อ/สังกัด (ไม่แก้ช่องทาง)
                          </option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {step >= 5 && (
            <>
              <Notice>
                รายการผิดพลาดและรายการซ้ำจะไม่ถูกนำเข้า
                รายการเดิมไม่ถูกลบหรือเปลี่ยน has_voted
              </Notice>
              <Field label="เหตุผลการเพิ่มสิทธิ์">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
            </>
          )}
          <div className="modal-actions">
            <button
              className="secondary"
              onClick={() => setStep(Math.max(2, step - 1))}
            >
              ย้อนกลับ
            </button>
            <button
              className="primary"
              disabled={busy || (step >= 5 && unresolved) || !rows.length}
              onClick={() => {
                if (step < 6) {
                  setStep(step + 1);
                  return;
                }
                setBusy(true);
                setStep(7);
                try {
                  mockRepository.importRows(unitId, rows, reason);
                  setResult(
                    `บันทึก ${counts.pass + counts.review} รายการ • ข้าม ${counts.skip} • ต้องแก้ ${counts.error}`,
                  );
                  setStep(8);
                  notify("นำเข้าข้อมูลตัวอย่างแล้ว");
                } catch (e) {
                  setError((e as Error).message);
                  setStep(6);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {step < 6 ? "ถัดไป" : "ยืนยันและบันทึก"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
