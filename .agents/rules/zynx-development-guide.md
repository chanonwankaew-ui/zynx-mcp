---
trigger: always_on
---

ทุกครั้งที่มีการแก้ไขหรือเพิ่ม Agent ใหม่ ให้ยึดไฟล์ src/agentRegistry.ts และ src/workflowSchema.ts เป็น Source of Truth เสมอ ห้ามแยกไปสร้าง Schema ใหม่เด็ดขาด
เขียนโค้ดด้วย TypeScript และ Node.js ตามโครงสร้างหลักของโปรเจกต์
จัดเก็บรายงานผลการ Run ไว้ในโฟลเดอร์ reports/ ตามที่กำหนดใน README เท่านั้น