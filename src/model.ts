export type Role =
  | "super_admin"
  | "election_admin"
  | "live_results_viewer"
  | "results_certifier"
  | "helpdesk";
export type State =
  "draft" | "future" | "open" | "closed" | "announced" | "cancelled";
export type Rules = {
  seats: number;
  min: number;
  max: number;
  abstain: boolean;
  winnerRule: "plurality" | "undefined";
};
export type Election = Rules & {
  id: string;
  createdByRole?: Role;
  title: string;
  organizer: string;
  open: string;
  close: string;
  published: boolean;
  cancelled: boolean;
  multiUnit: boolean;
  version: number;
};
export type Candidate = {
  id: string;
  number: number;
  name: string;
  bio: string;
  policy: string;
  portrait: number;
};
export type Certification = {
  winners: string[];
  tally: Record<string, number>;
  abstain: number;
  note: string;
  by: string;
  at: string;
  title: string;
  unitName: string;
};
export type Unit = {
  id: string;
  publicId: string;
  electionId: string;
  name: string;
  location: string;
  open?: string;
  close?: string;
  cancelled: boolean;
  candidates: Candidate[];
  tally: Record<string, number>;
  abstainCount: number;
  ballotCount: number;
  snapshot: Record<string, number>;
  snapshotAbstain: number;
  snapshotTotal: number;
  snapshotAt: string;
  certification?: Certification;
};
export type Member = {
  code: string;
  name: string;
  affiliation: string;
  email: string;
  phone: string;
};
export type Eligibility = {
  memberCode: string;
  unitId: string;
  name: string;
  affiliation: string;
  voted: boolean;
  submissionKey?: string;
};
export type Audit = {
  action: string;
  target: string;
  reason: string;
  at: string;
};
export type Store = {
  version: 1;
  now: string;
  elections: Election[];
  units: Unit[];
  members: Member[];
  eligibility: Eligibility[];
  audit: Audit[];
};
export const DEMO_TIME = "2026-10-15T03:00:00.000Z";
export const mockPrivacy = {
  pollSeconds: 30,
  snapshotMinutes: 10,
  k: 5,
  minimumVoters: 10,
};
// OPEN-QUESTION(SPEC §7.2): ค่า snapshot สำหรับต้นแบบเท่านั้น
export function shouldRefreshSnapshot(unit: Unit, total: number, now: string) {
  return (
    total >= mockPrivacy.minimumVoters &&
    total - unit.snapshotTotal >= mockPrivacy.k &&
    Date.parse(now) - Date.parse(unit.snapshotAt) >=
      mockPrivacy.snapshotMinutes * 60000
  );
}
export const roles: Record<Role, string> = {
  super_admin: "ผู้ดูแลสูงสุด",
  election_admin: "ผู้ดูแลการเลือกตั้ง",
  live_results_viewer: "ผู้ดูคะแนนระหว่างเลือกตั้ง",
  results_certifier: "ผู้รับรองผล",
  helpdesk: "เจ้าหน้าที่ช่วยเหลือ",
};
export const stateLabels: Record<State, string> = {
  draft: "ฉบับร่าง",
  future: "ยังไม่เปิดหีบ",
  open: "กำลังเปิด",
  closed: "ปิดหีบแล้ว",
  announced: "ประกาศผลแล้ว",
  cancelled: "ยกเลิก",
};
export function stateOf(e: Election, u: Unit, now: string): State {
  if (e.cancelled || u.cancelled) return "cancelled";
  if (!e.published) return "draft";
  if (u.certification) return "announced";
  if (Date.parse(now) < Date.parse(u.open || e.open)) return "future";
  return Date.parse(now) < Date.parse(u.close || e.close) ? "open" : "closed";
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
export function validateChoice(
  r: Rules,
  u: Unit,
  ids: string[],
  abstain: boolean,
) {
  if (abstain) return r.abstain && ids.length === 0;
  return (
    ids.length >= r.min &&
    ids.length <= r.max &&
    new Set(ids).size === ids.length &&
    ids.every((id) => u.candidates.some((c) => c.id === id))
  );
}
export function resultOf(e: Rules, u: Unit, total: number) {
  const sorted = u.candidates.toSorted(
    (a, b) => (u.tally[b.id] || 0) - (u.tally[a.id] || 0),
  );
  const reason = !total
    ? "ไม่มีผู้ลงคะแนน"
    : sorted.length < e.seats
      ? "ผู้สมัครน้อยกว่าที่นั่ง"
      : e.winnerRule === "undefined"
        ? "กฎผู้ชนะยังไม่กำหนด"
        : sorted.length === 1
          ? "ผู้สมัครคนเดียว — รอยืนยันกฎ"
          : sorted[e.seats] &&
              (u.tally[sorted[e.seats - 1].id] || 0) ===
                (u.tally[sorted[e.seats].id] || 0)
            ? "คะแนนเสมอที่ลำดับตัด"
            : "";
  return {
    reason,
    winners: reason ? [] : sorted.slice(0, e.seats).map((c) => c.id),
  };
}
export function createSeed(): Store {
  const titles = [
    "กรรมการสวัสดิการ ประจำปี 2569",
    "ผู้แทนพนักงาน ประจำปี 2569",
    "กรรมการกิจกรรม ประจำปี 2569",
    "กรรมการตรวจสอบ ประจำปี 2569",
    "กรรมการสวัสดิการ ประจำปี 2568",
    "คณะทำงานใหม่ (ฉบับร่าง)",
  ];
  const elections: Election[] = titles.map((title, i) => ({
    id: `e${i}`,
    title,
    organizer: "หน่วยงานตัวอย่าง",
    open:
      i === 2
        ? "2026-10-20T01:00:00Z"
        : i === 4
          ? "2025-10-15T01:00:00Z"
          : i === 3
            ? "2026-10-14T01:00:00Z"
            : "2026-10-15T01:00:00Z",
    close:
      i === 2
        ? "2026-10-20T10:00:00Z"
        : i === 4
          ? "2025-10-15T10:00:00Z"
          : i === 3
            ? "2026-10-14T10:00:00Z"
            : "2026-10-15T10:00:00Z",
    published: i !== 5,
    cancelled: false,
    seats: i === 1 ? 2 : 1,
    min: i === 1 ? 2 : 1,
    max: i === 1 ? 2 : 1,
    abstain: i !== 1,
    multiUnit: false,
    winnerRule: "plurality",
    version: 1,
  }));
  const descriptions = [
    ["e0", "สำนักงานใหญ่", 80, 36],
    ["e0", "สาขา", 44, 12],
    ["e1", "สำนักงานใหญ่", 32, 0],
    ["e2", "สำนักงานใหญ่", 12, 0],
    ["e3", "สำนักงานใหญ่", 12, 4],
    ["e4", "สำนักงานใหญ่", 24, 18],
    ["e5", "สำนักงานใหญ่", 8, 0],
    ["e0", "หน่วยเล็ก", 4, 0],
    ["e0", "หน่วยยกเลิก", 4, 0],
    ["e3", "หน่วยไม่มีผู้ลงคะแนน", 4, 0],
  ] as const;
  const units: Unit[] = descriptions.map(([electionId, name, , total], i) => {
    const names =
      i === 1
        ? ["ศิริพร แสงทอง", "ปรีชา รักษ์ดี", "วรัญญา มีสุข"]
        : ["กิตติพงษ์ ใจดี", "ณัฐพร สุขใจ", "ธนกร มั่นคง"];
    const candidates = names.map((name, j) => ({
      id: `c${i}-${j}`,
      number: j + 1,
      name,
      bio: "บุคลากรหน่วยงานตัวอย่าง มีประสบการณ์ทำงานร่วมกับทีมและกิจกรรมสวัสดิการ",
      policy: [
        "พัฒนาสวัสดิการให้เข้าถึงทุกคนอย่างเท่าเทียม",
        "รับฟังข้อเสนอ และรายงานผลอย่างโปร่งใส",
        "ส่งเสริมสุขภาพและคุณภาพชีวิตของบุคลากร",
      ][j],
      portrait: j,
    }));
    const tally = Object.fromEntries(
      candidates.map((c, j) => [
        c.id,
        i === 4
          ? [2, 2, 0][j]
          : j === 0
            ? Math.ceil(total * 0.55)
            : j === 1
              ? Math.floor(total * 0.3)
              : total - Math.ceil(total * 0.55) - Math.floor(total * 0.3),
      ]),
    );
    return {
      id: `u${i}`,
      publicId: crypto.randomUUID(),
      electionId,
      name,
      location: "ห้องประชุม / ออนไลน์",
      cancelled: i === 8,
      candidates,
      tally,
      abstainCount: 0,
      ballotCount: total,
      snapshot: { ...tally },
      snapshotAbstain: 0,
      snapshotTotal: total,
      snapshotAt: DEMO_TIME,
    };
  });
  const members: Member[] = [
    {
      code: "000123",
      name: "สมชาย ใจดี",
      affiliation: "ฝ่ายบริหาร",
      email: "somchai@example.com",
      phone: "",
    },
    {
      code: "000124",
      name: "มณี สุขใจ",
      affiliation: "ฝ่ายบริการ",
      email: "manee@example.com",
      phone: "",
    },
    {
      code: "000125",
      name: "วิชัย มีสุข",
      affiliation: "ฝ่ายบัญชี",
      email: "wichai@example.com",
      phone: "",
    },
    {
      code: "000126",
      name: "ผู้ทดสอบไม่มีสิทธิ์",
      affiliation: "ภายนอก",
      email: "test@example.com",
      phone: "",
    },
    {
      code: "000127",
      name: "ผู้ทดสอบไม่มีช่องทางติดต่อ",
      affiliation: "ฝ่ายบริการ",
      email: "",
      phone: "",
    },
  ];
  const eligibility: Eligibility[] = [];
  [
    "000901",
    "000902",
    "000903",
    "000904",
    "000905",
    "000906",
    "000907",
  ].forEach((code, i) =>
    members.push({
      code,
      name: [
        "ผู้ทดสอบหน่วยเล็ก",
        "ผู้ทดสอบหน่วยยกเลิก",
        "ผู้ทดสอบหน่วยไม่มีคะแนน",
        "ผู้ทดสอบยังไม่เปิด",
        "ผู้ทดสอบปิดหีบ",
        "ผู้ทดสอบประวัติ",
        "ผู้ทดสอบฉบับร่าง",
      ][i],
      affiliation: "หน่วยงานตัวอย่าง",
      email: `demo${i}@example.com`,
      phone: "",
    }),
  );
  descriptions.forEach(([, , count, total], i) => {
    for (let j = 0; j < count; j++) {
      let memberCode = `sample-${i}-${j}`;
      if (i === 0 && j < 4)
        memberCode = ["000123", "000124", "000125", "000127"][j];
      if ([2, 3, 4, 5, 6].includes(i) && j === 0)
        memberCode = ["000124", "000904", "000905", "000906", "000907"][i - 2];
      if ([7, 8, 9].includes(i) && j === 0)
        memberCode = ["000901", "000902", "000903"][i - 7];
      const member = members.find((m) => m.code === memberCode);
      const voted =
        i === 0 ? j === 2 || (j >= 4 && j < total + 3) : j > 0 && j <= total;
      eligibility.push({
        memberCode,
        unitId: `u${i}`,
        name: member?.name || `สมาชิกตัวอย่าง ${i + 1}-${j + 1}`,
        affiliation: member?.affiliation || "หน่วยงานตัวอย่าง",
        voted,
      });
    }
  });
  eligibility.forEach((right) => {
    if (!members.some((m) => m.code === right.memberCode))
      members.push({
        code: right.memberCode,
        name: right.name,
        affiliation: right.affiliation,
        email: `${right.memberCode}@example.com`,
        phone: "",
      });
  });
  const old = units[5];
  old.certification = {
    winners: [old.candidates[0].id],
    tally: { ...old.tally },
    abstain: 0,
    note: "รับรองผลตัวอย่าง",
    by: "ผู้รับรองผลตัวอย่าง",
    at: "2025-10-15T11:00:00Z",
    title: elections[4].title,
    unitName: old.name,
  };
  return {
    version: 1,
    now: DEMO_TIME,
    elections,
    units,
    members,
    eligibility,
    audit: [],
  };
}
export type ImportRow = {
  row: number;
  code: string;
  name: string;
  affiliation: string;
  email: string;
  phone: string;
  issue: string;
  status: "pass" | "review" | "skip" | "error";
  resolution?: "keep" | "update";
};
export function inspectRows(
  raw: Record<string, unknown>[],
  store: Store,
  unit: Unit,
): ImportRow[] {
  const seen = new Set<string>();
  const election = store.elections.find((e) => e.id === unit.electionId)!;
  return raw.map((r, i) => {
    const code = String(r.member_code ?? "").trim(),
      name = String(r.name ?? "").trim(),
      affiliation = String(r.affiliation ?? "").trim(),
      email = String(r.email ?? "").trim(),
      phone = String(r.phone ?? "").trim();
    let issue = "",
      status: ImportRow["status"] = "pass";
    if (
      Object.values(r).some(
        (v) => v != null && !["string", "number"].includes(typeof v),
      )
    ) {
      issue = "เซลล์ต้องเป็นข้อความธรรมดา ไม่รับสูตรหรือข้อมูลชนิดอื่น";
      status = "error";
    } else if (!code || !name || !affiliation) {
      issue = "รหัส ชื่อ หรือสังกัดว่าง";
      status = "error";
    } else if (typeof r.member_code === "number") {
      issue = "เซลล์รหัสเป็นตัวเลข เลข 0 อาจหาย กรุณาแก้เป็น Text";
      status = "error";
    } else if (seen.has(code)) {
      issue = "รหัสซ้ำในไฟล์";
      status = "error";
    } else if (
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      (phone && !/^[+\d ()-]{8,20}$/.test(phone))
    ) {
      issue = "รูปแบบอีเมลหรือเบอร์ไม่ถูกต้อง";
      status = "error";
    } else if (
      store.eligibility.some(
        (x) => x.memberCode === code && x.unitId === unit.id,
      )
    ) {
      issue = "มีสิทธิ์ในหน่วยนี้แล้ว ไม่เปลี่ยนสถานะใช้สิทธิ์";
      status = "skip";
    } else if (
      !election.multiUnit &&
      store.eligibility.some(
        (x) =>
          x.memberCode === code &&
          store.units.some(
            (u) => u.id === x.unitId && u.electionId === unit.electionId,
          ),
      )
    ) {
      issue = "มีสิทธิ์หน่วยอื่นในการเลือกตั้งเดียวกัน";
      status = "error";
    } else {
      const member = store.members.find((m) => m.code === code);
      if (
        member &&
        (member.name !== name ||
          member.affiliation !== affiliation ||
          member.email !== email ||
          member.phone !== phone)
      ) {
        issue = "ข้อมูลต่างจากทะเบียน ช่องทางติดต่อจะไม่อัปเดตอัตโนมัติ";
        status = "review";
      }
    }
    seen.add(code);
    return { row: i + 2, code, name, affiliation, email, phone, issue, status };
  });
}
