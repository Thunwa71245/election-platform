import { test, expect, type Page } from "@playwright/test";
import ExcelJS from "exceljs";

test("publishing a draft with past closing time does not disable save before persistence", async ({
  page,
}) => {
  await admin(page);
  await page
    .locator(".election-actions .row-between")
    .filter({ hasText: "คณะทำงานใหม่ (ฉบับร่าง)" })
    .getByRole("button")
    .click();
  await page
    .getByLabel("เวลาเปิด (เวลาไทย)", { exact: true })
    .fill("2026-10-14T08:00");
  await page
    .getByLabel("เวลาปิด (เวลาไทย)", { exact: true })
    .fill("2026-10-14T17:00");
  await page
    .getByRole("checkbox", { name: "เผยแพร่การเลือกตั้ง", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "บันทึก", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: "เผยแพร่การเลือกตั้ง", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(
    page
      .locator("table tbody tr")
      .filter({ hasText: "คณะทำงานใหม่ (ฉบับร่าง)" }),
  ).toContainText("ปิดหีบแล้ว");
});

test("draft election can publish for its creator and cancel an incomplete draft unit", async ({
  page,
}) => {
  await admin(page, "election_admin");
  await page
    .getByRole("button", { name: "สร้างการเลือกตั้ง", exact: true })
    .click();
  await page
    .getByLabel("ชื่อการเลือกตั้ง", { exact: true })
    .fill("การเลือกตั้งสร้างใหม่");
  await page
    .getByLabel("เวลาเปิด (เวลาไทย)", { exact: true })
    .fill("2026-10-15T08:00");
  await page
    .getByLabel("เวลาปิด (เวลาไทย)", { exact: true })
    .fill("2026-10-15T17:00");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  const edit = page
    .locator(".election-actions .row-between")
    .filter({ hasText: "การเลือกตั้งสร้างใหม่" })
    .getByRole("button");
  await expect(edit).toBeEnabled();
  await edit.click();
  await expect(
    page.getByText("ฉบับร่าง — ยังไม่เผยแพร่", { exact: false }),
  ).toBeVisible();
  for (const name of ["หน่วยพร้อมใช้", "หน่วยไม่ใช้"]) {
    await page.getByLabel("ชื่อหน่วย", { exact: true }).fill(name);
    await page.getByRole("button", { name: "เพิ่มหน่วย", exact: true }).click();
  }
  await page
    .getByRole("dialog", { name: "แก้ไขการเลือกตั้ง", exact: true })
    .getByLabel("ปิด", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "จัดการ การเลือกตั้งสร้างใหม่ หน่วยไม่ใช้",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "ยกเลิกหน่วย", exact: true }).click();
  await expect(
    page.getByLabel("เหตุผลการยกเลิกหน่วย", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("เหตุผลการยกเลิกหน่วย", { exact: true })
    .fill("ไม่ใช้หน่วยนี้ในการสาธิต");
  await page.getByRole("button", { name: "ยกเลิกหน่วย", exact: true }).click();
  await expect(page.getByText("หน่วยลงคะแนนนี้ถูกยกเลิกแล้ว")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ปิด", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "จัดการ การเลือกตั้งสร้างใหม่ หน่วยพร้อมใช้",
      exact: true,
    })
    .click();
  await page.getByLabel("ชื่อผู้สมัคร", { exact: true }).fill("ผู้สมัครใหม่");
  await page.getByLabel("ประวัติ", { exact: true }).fill("ประวัติตัวอย่าง");
  await page.getByLabel("นโยบาย", { exact: true }).fill("นโยบายตัวอย่าง");
  await page
    .getByRole("button", { name: "เพิ่มผู้สมัคร", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ปิด", exact: true })
    .click();
  const unitId = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("election-demo-v1")!).units.find(
        (u: { name: string }) => u.name === "หน่วยพร้อมใช้",
      ).id,
  );
  await page.getByRole("link", { name: "ผู้มีสิทธิ์", exact: true }).click();
  await page
    .getByLabel("การเลือกตั้ง / หน่วย", { exact: true })
    .selectOption(unitId);
  await page
    .getByRole("button", { name: "เพิ่มผู้มีสิทธิ์", exact: true })
    .click();
  await page.getByLabel("รหัสสมาชิก (Text)", { exact: true }).fill("000128");
  await page.getByLabel("ชื่อ–สกุล", { exact: true }).fill("สมาชิกใหม่");
  await page.getByLabel("สังกัด", { exact: true }).fill("ฝ่ายบริการ");
  await page.getByRole("button", { name: "ตรวจและเพิ่ม", exact: true }).click();
  await page.getByRole("link", { name: "การเลือกตั้ง", exact: true }).click();
  await edit.click();
  await page
    .getByRole("checkbox", { name: "เผยแพร่การเลือกตั้ง", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "บันทึก", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  const row = page
    .locator("table tbody tr")
    .filter({ hasText: "หน่วยพร้อมใช้" });
  await expect(row).toContainText("กำลังเปิด");
  await page
    .getByRole("button", {
      name: "จัดการ การเลือกตั้งสร้างใหม่ หน่วยพร้อมใช้",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "ยกเลิกหน่วย", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("หน่วยกำลังเปิดหีบ ยกเลิกได้เฉพาะผู้ดูแลสูงสุด"),
  ).toBeVisible();
});

test("super admin cancellation shows the reason field and retains existing mock votes", async ({
  page,
}) => {
  await admin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "จัดการ กรรมการสวัสดิการ ประจำปี 2569 สำนักงานใหญ่",
      exact: true,
    })
    .click();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page
    .getByLabel("เหตุผลการยกเลิกหน่วย", { exact: true })
    .fill("ทดสอบการยกเลิก");
  await page.getByRole("button", { name: "ยกเลิกหน่วย", exact: true }).click();
  await expect(page.getByText("หน่วยลงคะแนนนี้ถูกยกเลิกแล้ว")).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("election-demo-v1")!),
  );
  expect(data.units[0].cancelled).toBe(true);
  expect(data.units[0].ballotCount).toBe(36);
  expect(data.audit.at(-1).reason).toBe("ทดสอบการยกเลิก");
});
test("filter elections and edit candidate biography during open period with audit", async ({
  page,
}) => {
  await admin(page);
  await page.getByLabel("ตัวกรองการเลือกตั้ง").selectOption("e0");
  await page.getByLabel("ตัวกรองหน่วย").selectOption("u0");
  await expect(page.locator(".panel table tbody tr").first()).toContainText(
    "สำนักงานใหญ่",
  );
  await page
    .getByRole("button", {
      name: "จัดการ กรรมการสวัสดิการ ประจำปี 2569 สำนักงานใหญ่",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "แก้ไข", exact: true })
    .first()
    .click();
  const editor = page.getByRole("dialog", {
    name: "แก้ไขข้อมูลผู้สมัคร",
    exact: true,
  });
  await expect(
    editor.getByLabel("ชื่อผู้สมัคร", { exact: true }),
  ).toBeDisabled();
  await editor
    .getByLabel("ประวัติ", { exact: true })
    .fill("แก้คำผิดในประวัติตัวอย่าง");
  await editor.getByLabel("เหตุผลการแก้ไข").fill("แก้คำสะกด");
  await editor.getByRole("button", { name: "บันทึกผู้สมัคร" }).click();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("election-demo-v1")!),
  );
  expect(data.units[0].candidates[0].bio).toBe("แก้คำผิดในประวัติตัวอย่าง");
  expect(data.audit.at(-1).action).toBe("แก้ข้อมูลผู้สมัคร");
});
test("certifier records manual tie decision and immutable result snapshot", async ({
  page,
}) => {
  await admin(page, "results_certifier");
  await page.getByRole("link", { name: "คะแนนและผล", exact: true }).click();
  await page
    .getByLabel("การเลือกตั้ง / หน่วย", { exact: true })
    .selectOption("u4");
  await expect(
    page.getByText("ต้องตัดสิน: คะแนนเสมอที่ลำดับตัด"),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "กิตติพงษ์ ใจดี", exact: true })
    .check();
  await page
    .getByLabel("บันทึกการตัดสิน / เหตุผล")
    .fill("จำลองคำตัดสินจากกรรมการ");
  await page.getByRole("button", { name: "รับรองและประกาศผล" }).click();
  await expect(
    page.getByRole("button", { name: "รับรองและประกาศผล" }),
  ).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("election-demo-v1")!),
  );
  expect(data.units[4].certification.winners).toEqual(["c4-0"]);
  expect(data.units[4].certification.note).toBe("จำลองคำตัดสินจากกรรมการ");
  await page.getByRole("link", { name: "ประวัติ", exact: true }).click();
  await page.getByLabel("ปี พ.ศ.").selectOption("2569");
  await expect(
    page.getByRole("heading", { name: "กรรมการตรวจสอบ ประจำปี 2569" }),
  ).toBeVisible();
});
test("mock expired and locked code states, separate member and admin sessions", async ({
  page,
}) => {
  await page.goto("/#/user/login");
  await page.getByRole("button", { name: "ขอรหัสจำลอง" }).click();
  await expect(
    page.getByText("รหัสสำหรับผู้ทดสอบ: 123456", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("รหัสเข้าใช้", { exact: true }).fill("123456");
  await page.getByLabel("สถานะรหัสจำลอง").selectOption("expired");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.getByText("รหัสหมดอายุ กรุณาขอรหัสใหม่")).toBeVisible();
  await page.getByLabel("สถานะรหัสจำลอง").selectOption("locked");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByText("ถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง"),
  ).toBeVisible();
  await page.getByLabel("สถานะรหัสจำลอง").selectOption("normal");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.goto("/#/admin");
  await expect(
    page.getByRole("heading", { name: "เข้าสู่ระบบผู้ดูแล" }),
  ).toBeVisible();
});
async function login(page: Page, code = "000123") {
  await page.goto("/#/user/login");
  await page.getByLabel("รหัสสมาชิก", { exact: true }).fill(code);
  await page.getByRole("button", { name: "ขอรหัสจำลอง" }).click();
  await expect(
    page.getByText("รหัสสำหรับผู้ทดสอบ: 123456", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("รหัสเข้าใช้", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "รายการที่ฉันมีสิทธิ์", exact: true }),
  ).toBeVisible();
}
async function admin(page: Page, role = "super_admin") {
  await page.goto("/#/admin/login");
  await page.getByLabel("บทบาทตัวอย่าง").selectOption(role);
  await page.getByLabel("รหัสผ่านตัวอย่าง").fill("demo123");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "ภาพรวมการเลือกตั้ง", exact: true }),
  ).toBeVisible();
}
async function publicId(page: Page, unitId: string) {
  return page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("election-demo-v1")!).units.find(
        (u: { id: string }) => u.id === id,
      ).publicId,
    unitId,
  );
}
test("single choice, confirmation, success and no repeat or persisted member choices", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  await page.getByRole("button", { name: "ลงคะแนน", exact: true }).click();
  await page
    .getByRole("button", { name: "เลือกหมายเลข 1", exact: false })
    .click();
  await page
    .getByRole("button", { name: "ยืนยันลงคะแนน", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "รายการที่ฉันมีสิทธิ์", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("ใช้สิทธิ์แล้ว", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ลงคะแนน", exact: true }),
  ).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("election-demo-v1")!),
  );
  const right = data.eligibility.find(
    (x: { memberCode: string }) => x.memberCode === "000123",
  );
  expect(Object.keys(right)).not.toContain("candidateIds");
  expect(data.ballots).toBeUndefined();
});
test("multiple elections, select exactly two candidates", async ({ page }) => {
  await login(page, "000124");
  await page.goto(`/#/user/u/${await publicId(page, "u2")}`);
  await page
    .getByRole("button", { name: "เลือกหมายเลข 1", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "ตรวจทานและยืนยัน" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "เลือกหมายเลข 2", exact: false })
    .click();
  await page.getByRole("button", { name: "ตรวจทานและยืนยัน" }).click();
  await expect(page.locator("dialog .confirm-person")).toHaveCount(2);
  await page
    .getByRole("button", { name: "ยืนยันลงคะแนน", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/user$/);
});
test("abstention is exclusive and counts as participation", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "ลงคะแนน", exact: true }).click();
  await page
    .getByRole("button", { name: "ไม่ประสงค์ลงคะแนน", exact: true })
    .click();
  await expect(
    page.getByText("คุณต้องการยืนยันไม่ประสงค์ลงคะแนนใช่หรือไม่?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "ยืนยันลงคะแนน", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/user$/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("election-demo-v1")!).units[0]
          .abstainCount,
    ),
  ).toBe(1);
});
test("unauthorized user sees no candidate in DOM", async ({ page }) => {
  await login(page, "000126");
  await page.goto(`/#/user/u/${await publicId(page, "u0")}`);
  await expect(page.getByText("คุณไม่มีสิทธิ์ลงคะแนนในหน่วยนี้")).toBeVisible();
  await expect(page.getByText("กิตติพงษ์ ใจดี")).toHaveCount(0);
  await expect(page.locator(".candidate-card")).toHaveCount(0);
});
test("unit link before login returns to original unit", async ({ page }) => {
  await page.goto("/");
  const id = await publicId(page, "u0");
  await page.goto(`/#/user/u/${id}`);
  await page.getByRole("button", { name: "ขอรหัสจำลอง" }).click();
  await expect(
    page.getByText("รหัสสำหรับผู้ทดสอบ: 123456", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("รหัสเข้าใช้", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page.locator(".candidate-card")).toHaveCount(3);
});
test("future, closed, cancelled, draft and invalid link states", async ({
  page,
}) => {
  await login(page, "000124");
  for (const [id, message] of [
    ["u3", "ยังไม่เปิดหีบ"],
    ["u4", "ปิดหีบแล้ว"],
    ["u8", "หน่วยลงคะแนนนี้ถูกยกเลิก"],
    ["u6", "ไม่พบหน่วยลงคะแนน หรือยังไม่พร้อมใช้งาน"],
  ] as const) {
    const code = (
      { u3: "000904", u4: "000905", u8: "000902", u6: "000907" } as Record<
        string,
        string
      >
    )[id];
    await login(page, code);
    await page.goto(`/#/user/u/${await publicId(page, id)}`);
    await expect(
      page.getByText(message, { exact: false }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "ยืนยันลงคะแนน", exact: true }),
    ).toHaveCount(0);
  }
  await page.goto("/#/user/u/not-found");
  await expect(
    page.getByText("ไม่พบหน่วยลงคะแนน หรือยังไม่พร้อมใช้งาน"),
  ).toBeVisible();
});
test("two tabs cannot record the same entitlement twice", async ({
  page,
  context,
}) => {
  await login(page);
  const id = await publicId(page, "u0");
  const second = await context.newPage();
  await login(second);
  await Promise.all([
    page.goto(`/#/user/u/${id}`),
    second.goto(`/#/user/u/${id}`),
  ]);
  await page
    .getByRole("button", { name: "เลือกหมายเลข 1", exact: false })
    .click();
  await second
    .getByRole("button", { name: "เลือกหมายเลข 2", exact: false })
    .click();
  await Promise.all([
    page.getByRole("button", { name: "ยืนยันลงคะแนน", exact: true }).click(),
    second.getByRole("button", { name: "ยืนยันลงคะแนน", exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/#\/user$/);
  await expect(second).toHaveURL(/#\/user$/);
  expect(
    await page.evaluate(() =>
      Object.values(
        JSON.parse(localStorage.getItem("election-demo-v1")!).units[0].tally,
      ).reduce((a: number, b) => a + Number(b), 0),
    ),
  ).toBe(37);
});
for (const mode of ["after", "before"])
  test(`recover uncertain submission (${mode})`, async ({ page }) => {
    await login(page);
    await page.getByLabel("เครือข่ายจำลอง").selectOption(mode);
    await page.getByRole("button", { name: "ลงคะแนน", exact: true }).click();
    await page
      .getByRole("button", { name: "เลือกหมายเลข 1", exact: false })
      .click();
    await page
      .getByRole("button", { name: "ยืนยันลงคะแนน", exact: true })
      .click();
    await expect(
      page.getByText("ยังไม่ทราบผล กรุณาอย่าปิดหน้านี้ / ลองตรวจสถานะอีกครั้ง"),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: mode === "after" ? "ลองตรวจสถานะอีกครั้ง" : "ส่งใหม่ด้วยคำขอเดิม",
      })
      .click();
    await expect(page).toHaveURL(/#\/user$/);
  });
test("preview shows QR, never modifies tallies or entitlement", async ({
  page,
}) => {
  await admin(page);
  await page
    .getByRole("button", {
      name: "จัดการ กรรมการสวัสดิการ ประจำปี 2569 สำนักงานใหญ่",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("img", { name: "QR สำหรับหน่วย สำนักงานใหญ่" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ดูตัวอย่างหน้าสมาชิก" }).click();
  const before = await page.evaluate(() =>
    localStorage.getItem("election-demo-v1"),
  );
  await page
    .getByRole("button", { name: "เลือกหมายเลข 1", exact: false })
    .click();
  await page
    .getByRole("button", { name: "ยืนยันลงคะแนน", exact: true })
    .click();
  await expect(
    page.getByText("(ตัวอย่าง) ระบบจะบันทึกคะแนนที่ขั้นตอนนี้"),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("election-demo-v1")),
  ).toBe(before);
});
test("Excel import preserves leading zero, reports duplicates, never resets has_voted", async ({
  page,
}) => {
  await admin(page);
  await page.getByRole("link", { name: "ผู้มีสิทธิ์", exact: true }).click();
  await page.getByRole("button", { name: "นำเข้า Excel" }).click();
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("voters");
  sheet.addRow(["member_code", "name", "affiliation", "email", "phone"]);
  sheet.addRow(["000128", "New Member", "Office", "new@example.com", ""]);
  sheet.addRow(["000128", "New Member", "Office", "", ""]);
  sheet.addRow(["000125", "Existing", "Office", "", ""]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "voters.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  });
  await expect(page.getByText("รหัสซ้ำในไฟล์")).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "ถัดไป", exact: true }).click();
  await page.getByLabel("เหตุผลการเพิ่มสิทธิ์").fill("ทดสอบนำเข้าข้อมูลสมมติ");
  await page.getByRole("button", { name: "ยืนยันและบันทึก" }).click();
  await expect(
    page.getByText("บันทึก 1 รายการ • ข้าม 1 • ต้องแก้ 1"),
  ).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("election-demo-v1")!),
  );
  expect(data.members.some((m: { code: string }) => m.code === "000128")).toBe(
    true,
  );
  expect(
    data.eligibility.find(
      (x: { memberCode: string }) => x.memberCode === "000125",
    ).voted,
  ).toBe(true);
});
test("role separation, small-unit live privacy and history snapshot", async ({
  page,
}) => {
  await admin(page, "live_results_viewer");
  await expect(
    page.getByRole("link", { name: "ผู้มีสิทธิ์", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "คะแนนและผล", exact: true }).click();
  await page.getByLabel("การเลือกตั้ง / หน่วย").selectOption("u7");
  await expect(
    page.getByText("ไม่แสดงคะแนนรายผู้สมัครระหว่างเปิดหีบ", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".result-bars")).toHaveCount(0);
  await page.getByRole("link", { name: "ประวัติ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "กรรมการสวัสดิการ ประจำปี 2568" }),
  ).toBeVisible();
});
test("admin creates draft election and open-election rules stay locked", async ({
  page,
}) => {
  await admin(page);
  await page
    .getByRole("button", { name: "สร้างการเลือกตั้ง", exact: true })
    .click();
  await page.getByLabel("ชื่อการเลือกตั้ง").fill("การเลือกตั้งทดสอบ");
  await page.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(
    page
      .locator(".election-actions")
      .getByText("การเลือกตั้งทดสอบ", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".election-actions .row-between")
    .filter({ hasText: "กรรมการสวัสดิการ ประจำปี 2569" })
    .getByRole("button")
    .click();
  await expect(page.getByLabel("จำนวนที่นั่ง", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("เวลาเปิด (เวลาไทย)", { exact: true }),
  ).toBeDisabled();
});
test("desktop and mobile render without errors or page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await admin(page);
  await page.screenshot({ path: ".qa/admin-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".qa/admin-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "ออกจากระบบ" }).click();
  await login(page);
  await page.getByRole("button", { name: "ลงคะแนน", exact: true }).click();
  await page.screenshot({ path: ".qa/member-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.screenshot({ path: ".qa/member-desktop.png" });
  expect(errors).toEqual([]);
});
