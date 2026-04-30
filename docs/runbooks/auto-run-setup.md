# ⏰ Zynx Auto-Run ทุกเที่ยงคืน — คู่มือติดตั้ง

**ผู้ใช้:** Chanont Wankaew (กานต์)
**เป้าหมาย:** ให้ Mac รัน `organize_zynx_v3.sh --all --run` อัตโนมัติทุกวัน เวลา **00:00 (เที่ยงคืน)**

---

## 🚀 ติดตั้ง (Copy-paste ทีละบรรทัดก็พอ)

เปิด Terminal แล้วพิมพ์ตามนี้:

### 1. Copy plist ไปตำแหน่งที่ macOS ใช้งาน

```bash
cp ~/zynx-mcp/ops/launchd/com.chanont.zynx.consolidator.plist ~/Library/LaunchAgents/
```

### 2. สั่งให้ macOS "โหลด" schedule นี้

```bash
launchctl load ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
```

### 3. ตรวจสอบว่าโหลดสำเร็จ

```bash
launchctl list | grep zynx
```

ควรเห็นบรรทัดแบบนี้:
```
-	0	com.chanont.zynx.consolidator
```

**เสร็จแล้ว** ✅ ทุกเที่ยงคืน Mac จะรัน consolidator ให้เอง

---

## 🧪 ทดสอบทันที (ไม่ต้องรอเที่ยงคืน)

```bash
launchctl start com.chanont.zynx.consolidator
```

แล้วดู log:

```bash
tail -f ~/Documents/Zynx/00_INDEX/auto_run_stdout.log
```

(กด `Ctrl+C` ออกจาก tail)

---

## 📜 ดู log ว่ารันครบทุกคืนไหม

```bash
# log ปกติ
cat ~/Documents/Zynx/00_INDEX/auto_run_stdout.log

# log error (ถ้ามี)
cat ~/Documents/Zynx/00_INDEX/auto_run_stderr.log

# log รายละเอียดของ script
cat ~/Documents/Zynx/00_INDEX/organize_v3_log.txt
```

---

## 🛑 ยกเลิก / ปิด schedule

```bash
# หยุดชั่วคราว
launchctl unload ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist

# ลบถาวร
launchctl unload ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
rm ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
```

---

## ⚙️ ถ้าอยากเปลี่ยนเวลา

แก้ไฟล์:
```bash
nano ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
```

หา block นี้:
```xml
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key>
    <integer>0</integer>      ← ชั่วโมง (0-23)
    <key>Minute</key>
    <integer>0</integer>      ← นาที (0-59)
</dict>
```

เปลี่ยนเลขตามต้องการ เช่น `<integer>3</integer>` = ตี 3

**หลังแก้ต้อง reload:**
```bash
launchctl unload ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
launchctl load   ~/Library/LaunchAgents/com.chanont.zynx.consolidator.plist
```

---

## ❓ FAQ

**Q: ถ้าเครื่องปิดอยู่ตอนเที่ยงคืนล่ะ?**
A: macOS จะรันให้ทันทีที่เปิดเครื่องกลับมา (ถือว่าคิวไว้) — ไม่ต้องกลัวพลาด

**Q: ต้องเปิด Terminal ค้างไว้ไหม?**
A: ไม่ต้อง ✅ `launchd` เป็น background service ของ macOS

**Q: rclone จะยัง auth อยู่ไหม?**
A: ใช่ — rclone เก็บ refresh_token ไว้ auto-refresh ให้เอง

**Q: จะกิน battery ไหม?**
A: รอบละ < 1 นาที (ถ้าไม่มีไฟล์ใหม่) — แทบไม่กินเลย

**Q: ถ้า MacBook sleep ตอนเที่ยงคืน?**
A: macOS จะรันรอบที่พลาดให้ทันทีที่เครื่องตื่น (Power Nap นะ แต่ launchd จะไม่ wake เครื่องเพื่อรันนะครับ — ถ้าอยากให้ wake ต้องใช้ `pmset`)

---

## 🔔 (ถ้าอยาก) เพิ่ม notification ตอนรันเสร็จ

แก้ script ของคุณ เพิ่มบรรทัดท้ายสุด:

```bash
osascript -e 'display notification "Zynx consolidation done" with title "Zynx Auto-Run"'
```
