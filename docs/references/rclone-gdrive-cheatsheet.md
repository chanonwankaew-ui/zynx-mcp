# 🚀 Zynx × rclone × Google Drive — Cheatsheet

**ผู้ใช้:** Chanont Wankaew (กานต์)
**วันที่:** 2026-04-20
**เป้าหมาย:** ต่อจาก `rclone config` ที่ค้างอยู่ → sync ไฟล์ Zynx จาก Google Drive ทั้งหมดลง `~/Documents/Zynx/10_Sources/GoogleDrive/`

---

## 📍 ตอนนี้คุณอยู่ตรงไหน

คำสั่งล่าสุด:
```bash
rclone config
# → n) New remote
# → name> gdrive
# → Storage>   ← ค้างอยู่ที่นี่
```

---

## ✅ ขั้นตอนถัดไป (กดตามนี้ทีละบรรทัด)

| Prompt | ค่าที่พิมพ์ | หมายเหตุ |
|---|---|---|
| `Storage>` | `24` | Google Drive (หรือพิมพ์ `drive` ก็ได้) |
| `client_id>` | *(Enter ข้าม)* | ใช้ของ rclone default ได้เลย (ช้ากว่านิด แต่ไม่ต้องตั้ง GCP) |
| `client_secret>` | *(Enter ข้าม)* | |
| `scope>` | `1` | Full access — อ่าน/เขียน/ลบได้ทั้ง Drive |
| `service_account_file>` | *(Enter ข้าม)* | ไม่ใช้ service account |
| `Edit advanced config? y/n>` | `n` | |
| `Use web browser to automatically authenticate rclone? y/n>` | `y` | เพราะรันบน Mac ที่มี browser |
| *(browser เปิดขึ้นมา → login Google → Allow)* | | ดูที่หน้าเว็บ |
| `Configure this as a Shared Drive (Team Drive)? y/n>` | `n` | ถ้าไม่ได้ใช้ Shared Drive |
| *(สรุป config แสดง → ถาม)* `y/e/d>` | `y` | Yes, this is OK |
| `e/n/d/r/c/s/q>` | `q` | Quit config |

---

## 🧪 ทดสอบว่า config ถูกต้อง

```bash
# ต้องเห็น "gdrive:"
rclone listremotes

# ลอง list ไฟล์ที่ชื่อมี "zynx" บน Drive (ไม่โหลด)
rclone lsf gdrive: --include "*[Zz]ynx*" --max-depth 3

# ดู total size ของ Drive (optional)
rclone size gdrive:
```

---

## 🎯 ขั้นตอนรวมไฟล์ Zynx จาก Google Drive

### Step 1 — Dry-run ก่อน (ดูว่าจะย้ายอะไรบ้าง ยังไม่โหลดจริง)

```bash
bash ~/Documents/Zynx/00_INDEX/Consolidation_v3/organize_zynx_v3.sh --rclone --dry-run
```

Script จะใช้ filter ในตัว:
```
+ *Zynx*/**  + *zynx*/**
+ *Deeja*/** + *deeja*/**
+ *ZACP*/**
+ **/*Zynx*  + **/*zynx*
+ **/*Deeja* + **/*deeja*
+ **/*ZACP*
- **
```

จะโชว์ว่าไฟล์/โฟลเดอร์ไหนบ้างจะถูก copy ลง `10_Sources/GoogleDrive/`

### Step 2 — รันจริง

```bash
bash ~/Documents/Zynx/00_INDEX/Consolidation_v3/organize_zynx_v3.sh --rclone --run
```

หรือถ้าจะรัน **ทุกอย่างรวมทีเดียว** (Downloads + Desktop + iCloud + Drive + SSD + GitHub symlink):

```bash
bash ~/Documents/Zynx/00_INDEX/Consolidation_v3/organize_zynx_v3.sh --all --run
```

---

## 🧰 คำสั่ง rclone เสริม (ถ้าอยากยืดหยุ่นกว่า script)

```bash
# Sync แบบ dry-run (เห็นทั้งหมดก่อน)
rclone copy gdrive: ~/Documents/Zynx/10_Sources/GoogleDrive \
  --include "**Zynx**" --include "**zynx**" \
  --include "**Deeja**" --include "**deeja**" \
  --include "**ZACP**" \
  --dry-run --progress

# Sync จริง (เพิ่ม --transfers 8 ให้เร็ว)
rclone copy gdrive: ~/Documents/Zynx/10_Sources/GoogleDrive \
  --include "**Zynx**" --include "**zynx**" \
  --include "**Deeja**" --include "**deeja**" \
  --include "**ZACP**" \
  --transfers 8 --checkers 16 --progress

# ถ้าอยาก mount Drive แบบเสมือน disk (ต้องมี macFUSE)
# rclone ไม่รองรับ mount บน macOS (Homebrew build) → ใช้ Drive for desktop แทน

# สร้าง index ของ Drive (เฉพาะไฟล์ Zynx)
rclone lsjson gdrive: --recursive \
  --include "**[Zz]ynx**" \
  > ~/Documents/Zynx/00_INDEX/gdrive_zynx_index.json
```

---

## 🔐 ไฟล์ config เก็บที่ไหน

```
~/.config/rclone/rclone.conf
```

ถ้าอยาก backup remote config:
```bash
cp ~/.config/rclone/rclone.conf ~/Documents/Zynx/00_INDEX/rclone.conf.backup
```

---

## 🚨 Troubleshooting

| ปัญหา | วิธีแก้ |
|---|---|
| `token expired` | `rclone config reconnect gdrive:` |
| `too many requests` | เพิ่ม `--tpslimit 10` ลดอัตราขอ |
| ไฟล์ Google Docs ไม่ copy | default ของ rclone จะแปลง Google Docs → .docx/.xlsx/.pdf อัตโนมัติ ถ้าอยากปิดใส่ `--drive-export-formats=""` |
| `gdrive:` ยังไม่โผล่ใน `listremotes` | รัน `rclone config` ซ้ำ แล้วเช็คว่าได้กด `y` ยืนยัน + `q` quit ตอนท้าย |

---

## 📝 Checklist วันนี้

- [ ] พิมพ์ `24` ที่ `Storage>`
- [ ] ข้าม client_id/client_secret (Enter 2 ครั้ง)
- [ ] เลือก scope `1`
- [ ] ไม่แก้ advanced (`n`)
- [ ] auth ผ่าน browser (`y`) → login + Allow
- [ ] ไม่ใช่ Shared Drive (`n`) → ยืนยัน `y` → quit `q`
- [ ] `rclone listremotes` เห็น `gdrive:`
- [ ] รัน `--rclone --dry-run` ดูลิสต์
- [ ] รัน `--rclone --run` โหลดจริง
- [ ] เช็ค `~/Documents/Zynx/10_Sources/GoogleDrive/` ว่ามีไฟล์

---

💡 *หลังรวมเสร็จ ลองดู `00_INDEX/organize_v3_manifest.csv` จะเห็น manifest ทุกไฟล์ที่ย้าย/copy มาครับ*
