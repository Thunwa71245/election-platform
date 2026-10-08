# แนวทางหน้าจอต้นแบบ

ใช้ภาพ `admin-concept.png` และ `member-concept.png` เป็นแนวทางที่เลือกในการพัฒนา ไม่ได้อ้างว่าลูกค้าอนุมัติแล้ว

- พื้นหลัง cool gray #f5f7fb, พื้นผิวขาว #ffffff, ตัวอักษร navy #162746, primary blue #2563eb, border #e3e9f2, เตือน amber #fff0c7
- ตัวอักษร Noto Sans Thai เก็บเป็นไฟล์ใน bundle ไม่เรียก Google Fonts หรือ third-party script; น้ำหนัก 400/600 หัวข้อ 30–34px เนื้อหา 14–16px ข้อมูลตาราง 13–14px
- Desktop: sidebar 230px, main gutter 28px, account header, 3 summary panels, table; มือถือเปลี่ยน sidebar เป็นแถบเมนูเลื่อนแนวนอน ตารางเลื่อนภายในกรอบ
- ส่วนสมาชิก: header ไม่มี admin navigation, รายการสิทธิ์แยกต่อหน่วย, การ์ดผู้สมัคร 3 คอลัมน์ desktop และรายการ compact มือถือ, native dialog สำหรับยืนยัน
- Controls: ขอบ 1px, radius 7–10px, primary สีน้ำเงิน, focus ring ชัด, label ทุก input, สถานะใช้ข้อความ+สี+เครื่องหมาย, native dialog จัดการ focus/Esc (ปิดไม่ได้ระหว่างส่ง/ผลยังไม่แน่นอน)
- Icons: lucide outline 16–24px, stroke 2, currentColor; Vote/Users/Check/Calendar/MapPin ตามความหมาย ไม่ใช้ raster screenshot เป็น UI
- Asset: `src/assets/candidates.png` ภาพบุคคลสมมติที่สร้างใหม่ 3 คน แสดงด้วยสัดส่วนไม่ยืดภาพ ไม่มีภาพบุคคลจริงจากลูกค้า
- จำเป็นต้องมี controls ที่ภาพ concept ไม่ครอบคลุม: mock clock/network/reset, CRUD/นำเข้า, QR/preview, role login และผลกรณีพิเศษ ตาม SPEC/P1

## ความแตกต่างที่ตั้งใจจากภาพแนวคิด

1. ใช้วันที่/สถานะ/จำนวนจริงจาก seed ตาม P1 แทนตัวเลขและวันที่ที่ image generation แต่งใน concept (เช่น 160 สิทธิ์ในหน่วยที่เปิด ไม่ใช่ 124)
2. ใช้ข้อความ UI ตาม SPEC และบัญชีบทบาทที่เลือก แทนชื่อผู้ดูแลที่ภาพแต่ง
3. ไม่มี notification bell/pagination ที่ภาพเพิ่ม เพราะไม่มีงานแจ้งเตือนและข้อมูลเพียง 10 หน่วย
4. เพิ่มบัญชี/เครื่องมือจำลองที่จำเป็นในการตรวจ P1; ทุกหน้าแสดงคำเตือนตาม SPEC
5. รูป generated standalone เป็นคนสมมติคนละชุดกับ concept; ใช้ photo frame และโทนสอดคล้องกัน
6. เส้นทาง hash เพื่อรองรับ GitHub Pages; ไม่มี server/DB/auth cookie จริงใน P1

ภาพ concept เป็นหลักฐานแนวทางออกแบบที่ตั้งใจเก็บ ไม่ใช่ไฟล์ screenshot ของระบบทำงาน และไม่ใช่ผลอนุมัติจากลูกค้า
