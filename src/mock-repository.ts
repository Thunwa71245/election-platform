import {
  createSeed,
  inspectRows,
  resultOf,
  stateOf,
  validateChoice,
  type Election,
  type ImportRow,
  type Role,
  type Store,
  type Unit,
} from "./model";
const KEY = "election-demo-v1";
export const mockRepository = {
  read(): Store {
    const value = localStorage.getItem(KEY);
    if (!value) {
      const seed = createSeed();
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const store = JSON.parse(value) as Store;
    if (store.version !== 1)
      throw new Error("ข้อมูลตัวอย่างคนละเวอร์ชัน กรุณารีเซ็ต");
    return store;
  },
  update(change: (s: Store) => void) {
    const s = this.read();
    change(s);
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("demo-update"));
    return s;
  },
  reset() {
    localStorage.setItem(KEY, JSON.stringify(createSeed()));
    window.dispatchEvent(new Event("demo-update"));
  },
  audit(s: Store, action: string, target: string, reason = "") {
    s.audit.push({ action, target, reason, at: s.now });
  },
  async vote(
    code: string,
    unitId: string,
    key: string,
    ids: string[],
    abstain: boolean,
  ) {
    // ponytail: browser-wide mock lock; replace with a DB transaction and row lock in P4.
    return navigator.locks.request(KEY, () => {
      let outcome = "recorded";
      this.update((s) => {
        const u = s.units.find((u) => u.id === unitId),
          eligibility = s.eligibility.find(
            (x) => x.memberCode === code && x.unitId === unitId,
          );
        if (!u || !eligibility)
          throw new Error("คุณไม่มีสิทธิ์ลงคะแนนในหน่วยนี้");
        if (eligibility.voted) {
          outcome =
            eligibility.submissionKey === key ? "recorded" : "already_voted";
          return;
        }
        const e = s.elections.find((e) => e.id === u.electionId)!;
        if (stateOf(e, u, s.now) !== "open")
          throw new Error("หน่วยนี้ยังไม่เปิดหรือปิดหีบแล้ว");
        if (!validateChoice(e, u, ids, abstain))
          throw new Error("ตัวเลือกไม่ถูกต้องตามกติกา");
        // Only aggregate mock tallies persist. Never persist a member's choices or ballot-to-member link.
        if (abstain) u.abstainCount++;
        else
          ids.forEach((id) => {
            u.tally[id] = (u.tally[id] || 0) + 1;
          });
        u.ballotCount++;
        eligibility.voted = true;
        eligibility.submissionKey = key;
      });
      return outcome;
    });
  },
  saveElection(value: Election, expectedVersion?: number, reason = "") {
    return this.update((s) => {
      const current = s.elections.find((e) => e.id === value.id);
      if (current && current.version !== expectedVersion)
        throw new Error("ข้อมูลถูกแก้จากอีกหน้าต่าง กรุณาโหลดใหม่");
      if (
        !(
          value.min >= 1 &&
          value.min <= value.max &&
          value.max <= value.seats
        ) ||
        !(Date.parse(value.close) > Date.parse(value.open))
      )
        throw new Error("ตรวจจำนวนเลือก/ที่นั่ง และเวลาปิดต้องหลังเวลาเปิด");
      const states = s.units
        .filter((u) => u.electionId === value.id)
        .map((u) => stateOf(current || value, u, s.now));
      if (states.some((x) => ["closed", "announced"].includes(x)))
        throw new Error("ปิดหีบแล้ว อ่านอย่างเดียว");
      if (current && states.includes("open")) {
        if (
          (
            [
              "seats",
              "min",
              "max",
              "abstain",
              "winnerRule",
              "multiUnit",
              "open",
            ] as const
          ).some((k) => value[k] !== current[k])
        )
          throw new Error("กติกาและเวลาเปิดถูกล็อกระหว่างเปิดหีบ");
        if (
          value.close !== current.close &&
          (!reason.trim() || Date.parse(value.close) < Date.parse(s.now))
        )
          throw new Error("แก้เวลาปิดต้องมีเหตุผล และไม่ก่อนเวลาจำลองปัจจุบัน");
      }
      const units = s.units.filter(
        (u) => u.electionId === value.id && !u.cancelled,
      );
      if (
        value.published &&
        !current?.published &&
        (!units.length ||
          units.some(
            (u) =>
              !u.candidates.length ||
              !s.eligibility.some((x) => x.unitId === u.id),
          ))
      )
        throw new Error(
          "Checklist ไม่ครบ: ต้องมีหน่วย ผู้สมัคร และผู้มีสิทธิ์ทุกหน่วยที่ใช้งาน",
        );
      if (current)
        Object.assign(current, value, { version: current.version + 1 });
      else s.elections.push(value);
      this.audit(s, "บันทึกการเลือกตั้ง", value.id, reason);
    });
  },
  importRows(unitId: string, rows: ImportRow[], reason: string) {
    return this.update((s) => {
      const u = s.units.find((u) => u.id === unitId)!;
      const e = s.elections.find((e) => e.id === u.electionId)!;
      if (["closed", "announced", "cancelled"].includes(stateOf(e, u, s.now)))
        throw new Error("หน่วยนี้อ่านอย่างเดียว");
      if (stateOf(e, u, s.now) === "open" && !reason.trim())
        throw new Error("เพิ่มสิทธิ์ระหว่างเปิดหีบต้องระบุเหตุผล");
      const raw = rows.map((r) => ({
        member_code: r.code,
        name: r.name,
        affiliation: r.affiliation,
        email: r.email,
        phone: r.phone,
      }));
      const fresh = inspectRows(raw, s, u);
      rows.forEach((r, i) => {
        if (!["pass", "review"].includes(r.status)) return;
        if (["error", "skip"].includes(fresh[i].status))
          throw new Error("ข้อมูลสิทธิ์เปลี่ยนหลัง preview กรุณาตรวจไฟล์ใหม่");
        if (r.status === "review" && !r.resolution)
          throw new Error("เลือกวิธีจัดการข้อมูลที่ต้องตรวจสอบก่อน");
        let member = s.members.find((m) => m.code === r.code);
        if (!member) {
          member = {
            code: r.code,
            name: r.name,
            affiliation: r.affiliation,
            email: r.email,
            phone: r.phone,
          };
          s.members.push(member);
        } else if (r.resolution === "update") {
          member.name = r.name;
          member.affiliation = r.affiliation;
        }
        s.eligibility.push({
          memberCode: member.code,
          unitId,
          name: member.name,
          affiliation: member.affiliation,
          voted: false,
        });
      });
      this.audit(s, "นำเข้าสิทธิ์", unitId, reason);
    });
  },
  certify(unitId: string, role: Role, winners: string[], note: string) {
    return this.update((s) => {
      if (!["super_admin", "results_certifier"].includes(role))
        throw new Error("ไม่มีสิทธิ์รับรองผล");
      const u = s.units.find((u) => u.id === unitId)!,
        e = s.elections.find((e) => e.id === u.electionId)!;
      if (stateOf(e, u, s.now) !== "closed" || u.certification)
        throw new Error("รับรองได้หลังปิดหีบ และรับรองได้ครั้งเดียว");
      const total = s.eligibility.filter(
        (x) => x.unitId === unitId && x.voted,
      ).length;
      const result = resultOf(e, u, total);
      if (u.ballotCount !== total)
        throw new Error(
          "จำนวนบัตรไม่ตรงจำนวนผู้ใช้สิทธิ์ ต้องตรวจสอบก่อนรับรอง",
        );
      if (result.reason && !note.trim())
        throw new Error("กรณีต้องตัดสิน ต้องระบุเหตุผล");
      if (
        winners.length > e.seats ||
        new Set(winners).size !== winners.length ||
        winners.some((id) => !u.candidates.some((c) => c.id === id))
      )
        throw new Error("รายชื่อผู้ชนะไม่ถูกต้อง");
      u.certification = {
        winners,
        tally: { ...u.tally },
        abstain: u.abstainCount,
        note,
        by: rolesName(role),
        at: s.now,
        title: e.title,
        unitName: u.name,
      };
      this.audit(s, "ประกาศผล", unitId, note);
    });
  },
};
function rolesName(role: Role) {
  return role === "super_admin"
    ? "ผู้ดูแลสูงสุดตัวอย่าง"
    : "ผู้รับรองผลตัวอย่าง";
}
export function canManage(role: Role, electionId: string) {
  return (
    role === "super_admin" ||
    (role === "election_admin" && ["e0", "e2", "e5"].includes(electionId))
  );
}
export function inScope(role: Role, electionId: string) {
  return role === "super_admin" ||
    role === "results_certifier" ||
    role === "live_results_viewer" ||
    role === "helpdesk"
    ? true
    : ["e0", "e2", "e5"].includes(electionId);
}
export function newUnit(
  electionId: string,
  name: string,
  location: string,
  now: string,
): Unit {
  return {
    id: crypto.randomUUID(),
    publicId: crypto.randomUUID(),
    electionId,
    name,
    location,
    cancelled: false,
    candidates: [],
    tally: {},
    abstainCount: 0,
    ballotCount: 0,
    snapshot: {},
    snapshotAbstain: 0,
    snapshotTotal: 0,
    snapshotAt: now,
  };
}
