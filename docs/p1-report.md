# P1 — ต้นแบบสำหรับโชว์ลูกค้า

วันที่ 8 ต.ค. 2569, branch `dev-election-stage-1` ผู้ใช้อนุญาตสร้างแอปหลัง P0 และต้องการเผยแพร่ผ่าน GitHub เพื่อสาธิตเท่านั้น

## สิ่งที่ทำ

- React/TypeScript/Vite แบบ static; หน้าต้อนรับและ login สมาชิก/ผู้ดูแลแยกกัน ใช้ hash route รองรับ GitHub Pages
- แถบเตือนทุกหน้า ข้อมูลตัวอย่างหลายการเลือกตั้ง/หน่วย สถานะเปิด/ยังไม่เปิด/ปิด/ประกาศ/ร่าง/ยกเลิก/หน่วยเล็ก/เสมอ/ไม่มีคะแนน
- สมาชิก: สิทธิ์ต่อสมาชิก × หน่วย, 1/2 ตัวเลือก, ประวัติ/นโยบาย, abstain exclusive, native modal, กลับรายการหลังส่ง, ป้องกันซ้ำหลายแท็บด้วย mock Web Locks และ idempotency, จำลองเครือข่ายก่อน/หลังบันทึกและการกู้สถานะ
- ผู้ดูแล: ภาพรวม/ตัวกรอง, สร้างและแก้การเลือกตั้ง, checklist เผยแพร่, เพิ่มหน่วย, เวลา override, ผู้สมัคร/หมายเลขไม่ซ้ำในหน่วย, แก้คำผิดระหว่างเปิดพร้อม audit, เพิ่ม/ลบสิทธิ์ตามสถานะ, Excel template Text/ตรวจ/preview/จัดการแถว/สรุป/ส่งออก
- PublicId สุ่ม, copy link, QR PNG, preview แสดงลายน้ำและไม่บันทึกข้อมูล
- แยกบทบาทจำลอง, หน่วยเล็กซ่อนคะแนนรายผู้สมัคร, polling/snapshot ตามค่า mockPrivacy, รับรองผลหลังปิดพร้อมเหตุผลกรณีพิเศษ, กระทบยอด ballotCount และผล snapshot/history
- Fonts อยู่ใน bundle, รูปผู้สมัครสร้างเป็นบุคคลสมมติ; ไม่มี analytics/third-party script/secret/message provider
- GitHub Actions ตรวจ lint/typecheck/unit/E2E/build ก่อน deploy Pages; ยังไม่มี remote หรือ repository ปลายทาง จึงยังไม่เผยแพร่จริง

ไฟล์หลัก: `src/model.ts`, `src/mock-repository.ts`, `src/App.tsx`, `src/MemberScreens.tsx`, `src/AdminScreens.tsx`, `src/ElectionEditor.tsx`, `src/Voters.tsx`, `src/ui.tsx`, `src/text.ts`, `src/styles.css`, `tests/prototype.spec.ts`, manifest/config/workflow และ README

## เกณฑ์รับงาน

| ข้อ | Implementation/หลักฐาน |
|---|---|
| D1 แยกสมาชิก/ผู้ดูแล | Layout/login/sessionStorage key แยก; E2E สมาชิกเข้า admin ต้อง login อีกครั้ง; ไม่ใช่ session cookie จริง |
| D2 หลายการเลือกตั้ง/หลายหน่วยพร้อมกัน | seed 6 การเลือกตั้ง/10 หน่วย, E2E บัญชี 000124 มี 2 รายการคนละการเลือกตั้ง |
| D3 ผู้สมัครและผู้มีสิทธิ์ต่อหน่วย | model/หมายเลขซ้ำข้ามหน่วย/นำเข้า; unit ตรวจไม่ให้ seed สมาชิกมีหลายหน่วยในครั้งเดียว |
| D4 ลิงก์/QR/preview | E2E QR โหลด, preview ยืนยันแล้ว store ไม่เปลี่ยน; link ก่อน login กลับหน่วยเดิม |
| D5 ผู้ไม่มีสิทธิ์ไม่เห็นผู้สมัคร | E2E ไม่มีชื่อ/การ์ดใน DOM; ไม่ใช่ server authorization เพราะเป็น static demo |
| D6 คะแนนสำหรับบทบาทที่ได้รับสิทธิ์ | role mock, E2E live viewer/หน่วยเล็ก, unit ตรวจ snapshot interval/k/threshold; เป็นคะแนนรวมจำลอง |
| D7 สมาชิกไม่เห็นคะแนนระหว่างเปิด | MemberScreens ไม่มีคะแนน, E2E ตรวจหน้าและไม่มีลิงก์ admin |
| D8 Modal ยืนยัน | Native dialog, 1/2 คน/abstain มี E2E; Esc/focus เป็น native dialog ปิดไม่ได้ระหว่างส่ง |
| D9 กลับรายการ/ใช้สิทธิ์แล้ว | E2E ส่งสำเร็จ/เครือข่ายขาด/สองแท็บ |
| D10 ไม่ประสงค์ลงคะแนน | unit validation และ E2E exclusive/นับใช้สิทธิ์ |
| ข้อความ/ต้นแบบ | ข้อความสำคัญใน text.ts ตาม SPEC; ข้อความหลายคนเป็น OPEN-QUESTION; every-page warning |
| เอกสารสาธิต | README และ prototype-review-script.md รวมบัญชีและคำถาม §9 |

การผ่านอัตโนมัติเป็นผลของ implementation ไม่ใช่การเซ็นรับ P1 ของลูกค้า ไม่เริ่ม P2 จนกว่าจะผ่านเงื่อนไขที่ตกลง

## ขอบเขตที่ตั้งใจไม่ทำและข้อจำกัด

1. ไม่มี DB/backend/server sessions/cookies/OTP delivery/SSO/MFA หรือ cryptographic privacy การจำลองสิทธิ์ฝั่งเบราว์เซอร์ไม่ใช่มาตรการความปลอดภัย
2. ไม่เก็บบัตรรายใบหรือตัวเลือกรายบุคคลใน storage เก็บยอดรวม mock เท่านั้น สมาชิก/คะแนนไม่เชื่อมกัน แต่ผู้ที่แก้ localStorage/devtools เปลี่ยนข้อมูลสาธิตได้ ทุกเครื่องมีชุดสาธิตของตนเอง
3. เวลาจำลองไม่เดินตามนาฬิกาเครื่อง เพื่อรักษาสถานะสาธิต; ค่า OTP/session/rate limit จริงต้องทำใน P2 ต้นแบบมีสวิตช์หมดอายุ/ล็อกและนับลองผิด
4. รหัสสำรอง mock อยู่ใน sessionStorage เฉพาะแท็บเพื่อทดลองใช้ครั้งเดียว ไม่ใช่ hash/อายุจริง; ไม่มีการส่งข้อความ
5. สร้างรูปผู้สมัครสมมติ ไม่ทำ pipeline อัปโหลดรูป/EXIF ฝั่ง server ของ P3
6. เก็บยอดรวมเพื่อสาธิต จึงไม่มี recount บัตรรายใบ; ปุ่มรับรองตรวจ ballotCount ตรง has_voted เท่านั้น
7. การสวมสองบทบาท/ข้อจำกัด super_admin และเกณฑ์ความลับจริงต้องยืนยัน ยังไม่อ้างว่าซ่อนผลเอกฉันท์หรือป้องกันผู้ดูแลโฮสต์ได้
8. ExcelJS dynamic chunk ขนาดใหญ่ (~930KB ก่อน gzip) โหลดเมื่อใช้ Excel; audit ตรวจชุด lockfile และ override UUID แล้ว ต้องทบทวน parser ฝั่ง server อีกครั้งใน P3
9. Hash route ต่างจาก production paths; stack/hosting production ยังไม่ยืนยัน ค่า default P1 ไม่ใช่คำตอบลูกค้า
10. บางข้อความประกอบฟอร์มอยู่ใน screen files; ข้อความสำคัญตาม SPEC รวม text.ts แล้ว การรวมข้อความทั้งหมดเพิ่มเติมทำได้เมื่อ copy ผ่านลูกค้าตรวจ

## OPEN-QUESTION

ดู ADR-024–033 และ ADR ระบบจริงใน decisions.md: ระดับกติกา (election vs unit), ข้อความหลายคน/วันใช้สิทธิ์, ผลสมาชิกหลังประกาศ, ค่า privacy, การยกเลิกคะแนน, retry หลังปิดหีบ, เงื่อนไขเริ่ม P2 และคำถาม §9 ทั้ง 19 ข้อ

ยังต้องได้ URL หรือ owner/repo ของ GitHub เป้าหมายและตรวจ Pages workflow ออนไลน์ก่อนรายงาน deploy สำเร็จ ไม่มีการเดาหรือเผยแพร่ไป repository อื่น

## วิธีตรวจด้วยมือ

ใช้ README สำหรับรัน/บัญชี และ [prototype-review-script.md](prototype-review-script.md) สำหรับเดินหน้าจอ ผู้ดูแล `demo123`, สมาชิกขอรหัสจำลอง `123456`; reset ก่อนเริ่มแต่ละกรณี

## ผลตรวจอัตโนมัติและภาพ

ตรวจรอบสุดท้ายด้วย Node 22 ที่เรียกจาก npm registry (เครื่องมี Node 23 เดิม ไม่เปลี่ยน runtime ของเครื่อง):

| คำสั่ง | ผล |
|---|---|
| npm run lint | ผ่าน, 0 errors / 0 warnings |
| npm run typecheck | ผ่าน, 0 TypeScript errors |
| npm test | 8 ผ่าน, 0 ไม่ผ่าน (สถานะ/กติกา/ผล/นำเข้า/seed/snapshot) |
| npm run test:e2e | Chromium 17 ผ่าน, 0 ไม่ผ่าน |
| npm run build | ผ่าน; ExcelJS lazy chunk มี size warning ที่ระบุด้านบน |
| npm audit และ npm audit --omit=dev | 0 vulnerabilities ที่รายงาน |
| git diff --check | ผ่าน |
| Built preview บน http://127.0.0.1:4173/ | Login → เลือกผู้สมัคร → ยืนยัน → กลับรายการ ผ่าน; 0 runtime errors / 0 failed asset responses |

IAB เปิดไม่ได้ (`Browser is not available: iab`), `cua.getState()` คืน browsers=[] จึงใช้ Playwright Chromium ตาม fallback ใน skill ตรวจ frontend ไม่ได้อ้างว่าใช้ IAB สำเร็จ
Screenshot จาก test ที่ viewport 1536×1024 เท่าขนาด concept และมือถือ 390×844; ตรวจไม่มี page overflow/runtime errors ภาพส่งมอบอยู่ใน `docs/design/admin-render.png`, `member-render.png`, `member-mobile-render.png`

ใช้ view_image เปิด concept ทั้งสองกับ screenshot ล่าสุดในรอบ QA เดียวกัน เปรียบเทียบคำเตือน/ข้อความ, layout/ลำดับข้อมูล, typography, palette, photo crop, icons, spacing และมือถือ แก้รูปยืด/ครอปตัดศีรษะ ตัวอักษรไทย และ sidebar/header rhythm แล้ว การตรวจ field label เพิ่มพบ accessible name ปน options/textarea จึงแก้ shared Field ด้วย label htmlFor + id และ E2E ผ่านหลังแก้

## Fidelity ledger

| จุดตรวจ | Concept | Render/การแก้ |
|---|---|---|
| ข้อความ above the fold | คำเตือน/ภาพรวม/สร้างการเลือกตั้ง/ชื่อผู้สมัคร | คำเตือนและข้อความสำคัญตรง SPEC; ชื่อบทบาท/ตัวเลข/วันใช้ seed จริง; เพิ่มตัวกรองหน่วยตาม SPEC โดยตั้งใจ ไม่ใช้วันที่ที่ภาพแต่ง |
| Layout | sidebar ซ้าย, 3 summary panels, table; member cards 3 คอลัมน์ | รักษาโครงสร้าง; มี row ของ filter เพิ่มและรายการมากกว่า 5 แถวตาม seed; scrolling ตั้งใจแทน pagination ที่ภาพแต่ง |
| Typography | Thai sans, หัวข้อใหญ่และ chrome อ่านง่าย | Noto Sans Thai local bundle, heading 30–34px, ไม่ใช้ browser-default controls; mobile ใช้ 23px |
| Palette/container | cool gray background, white surface, navy, blue, amber | คง #f5f7fb/#fff/#162746/#2563eb/#fff0c7, radius และ border สอดคล้อง |
| Asset | portrait frame สัดส่วนเท่ากัน | รูปสมมติ standalone 3 คน; แก้ background size ให้รักษาสัดส่วนและตำแหน่ง top ไม่บิด/ตัดศีรษะ |
| Icons/focus | outline icons, check state | lucide currentColor, label/focus/dialog native, ไม่ใช้สีอย่างเดียว |
| Mobile | compact stacked candidates | 390px ไม่มี page overflow, cards รูปเล็ก+ชื่อ+ปุ่มประวัติ; demo bar ติดด้านล่างและมีพื้นที่เลื่อนถึง controls |

Above-the-fold copy diff ตรวจแล้ว ความต่างจาก concept ที่ตั้งใจอยู่ใน design-system.md (ข้อมูล seed จริง, account จริงตามบทบาท, controls จำลอง/filters ตาม SPEC, ไม่มี bell/pagination) ไม่มี marketing section ที่เพิ่มนอกขอบเขต
ตรวจการนำแนวทางที่เลือกมาใช้ตาม design system พร้อมความต่างที่บันทึกไว้ ไม่อ้างว่า pixel-identical กับภาพ generated หรือว่าลูกค้าอนุมัติแล้ว

## แก้ปัญหาฉบับร่าง/ยกเลิกหน่วย (8 ต.ค. 2569)

- สถานะฉบับร่างถูกต้องจนกว่าจะเผยแพร่ เพิ่มคำอธิบายขั้นตอนในฟอร์ม ไม่เผยแพร่โดยอัตโนมัติหรือข้าม checklist
- แก้ฟอร์มที่ล็อกด้วยสถานะของค่าที่ยังไม่บันทึก: เมื่อติ๊กเผยแพร่รายการที่วันเปิดถึงแล้ว เดิมกติกา/checkbox อาจล็อก และหากเวลาปิดผ่านแล้วปุ่มบันทึกจะถูกปิดก่อนบันทึกสำเร็จ ปัจจุบันใช้สถานะที่บันทึกจริงเป็นฐาน
- Checklist UI นับเฉพาะหน่วยที่ไม่ยกเลิกให้ตรง repository; หน่วยที่เลิกใช้และยังไม่มีข้อมูลไม่ขวางการเผยแพร่หน่วยที่พร้อม
- เพิ่ม createdByRole สำหรับบัญชีผู้ดูแลจำลองหนึ่งบัญชีต่อบทบาท เพื่อให้ election_admin จัดการการเลือกตั้งใหม่ที่ตนสร้างได้ ใช้ helper เดียวกันในรายการ/ผู้สมัคร/ผู้มีสิทธิ์/แก้ไข/ยกเลิก ไม่เปิดสิทธิ์การเลือกตั้งอื่นให้โดยอัตโนมัติ
- ย้ายยกเลิกออกจากฟอร์มแก้เวลา มีช่องเหตุผลของตัวเองที่ required และแสดงผลผิดพลาด/เหตุผล disabled ใกล้ปุ่ม ไม่ซ่อนปุ่มเมื่อปิดหีบแล้ว
- ตรวจขอบเขต/บทบาท/สถานะล่าสุด/เหตุผลซ้ำใน mockRepository.cancelUnit และบันทึก audit; คงคะแนนและข้อมูลจำลองเดิม

ไฟล์แก้: ElectionEditor, mock-repository, model, text, AdminScreens, Voters และ unit/E2E tests; ยังไม่มี backend จริง ไม่มี OPEN-QUESTION ใหม่ และยังไม่ deploy GitHub
รายการที่สร้างก่อนมี metadata ผู้สร้างต้องใช้ super_admin จัดการ ไม่เดาหรือย้ายเจ้าของ ไม่ลบ/reset ข้อมูลผู้ใช้

ตรวจด้วยมือ: login super_admin (`demo123`) → รายละเอียดหน่วย → กรอกเหตุผลการยกเลิกหน่วย → ยกเลิก; หากใช้ election_admin กับหน่วยที่กำลังเปิดจะเห็นคำอธิบายให้ใช้ผู้ดูแลสูงสุดตาม SPEC §4.3
สำหรับเผยแพร่ สร้าง draft → เพิ่มหน่วย/ผู้สมัคร/ผู้มีสิทธิ์ → แก้ไขการเลือกตั้ง → ติ๊กเผยแพร่ → บันทึก สถานะถัดไปอิงเวลาจำลองตามเดิม

ผลตรวจสำหรับการแก้ไขนี้: lint ผ่าน (0 errors), typecheck ผ่าน, unit 9/9 และ E2E 20/20 ผ่าน, build ผ่าน (ยังมี warning ขนาด ExcelJS เดิม) รวม regression การเผยแพร่วันที่ปิดผ่านแล้ว, การยกเลิกก่อน/ระหว่างเปิด, ขอบเขตผู้สร้าง, คะแนนเดิมไม่ถูกลบ และ dialog มือถือไม่ล้นแนวนอน
QA ใช้ Playwright ตามเหตุผล IAB unavailable เดิม เปิด built preview 4173 และ view_image ภาพ desktop/mobile ของฟอร์มยกเลิก เพิ่มช่องเหตุผล/ข้อความข้างปุ่ม; พบ datetime input 2 คอลัมน์ล้นบนมือถือจึงจัดเป็นคอลัมน์เดียว ยังใช้ design system เดิม ไม่มีแนวทางภาพใหม่
