# UI/UX & Icon Standard Guidelines

This document outlines the standard UI/UX and icon (emoji) conventions for the corporate system. These standards ensure consistency, readability, and a professional appearance across the application.

## 1. General UI/UX Philosophy

*   **Clean & Minimal:** The system must maintain a professional, corporate appearance.
*   **Formal:** Avoid overly casual language or excessive decoration.
*   **Localization:** Thai language should be prioritized for the user interface, unless a specific technical term is widely accepted in English.

## 2. Icon & Emoji Usage

**Decorative, text-based emojis are strictly forbidden.** Emojis are only permitted for specific functional purposes to convey status or content type quickly.

### 2.1 Status Icons

Status icons should be used to clearly indicate the current state of a process, connection, or request.

| Emoji | Meaning / State | Thai Label Example | Use Case |
| :---: | :--- | :--- | :--- |
| ⏳ | In Progress / Loading / Waiting | ⏳ กำลังตรวจสอบ..., ⏳ รอคิว, ⏳ กำลังทำ | Background processes, API calls, Queue items |
| ✅ | Success / Done / Connected | ✅ เชื่อมต่อสำเร็จ, ✅ เสร็จสิ้น | Completed tasks, successful connections |
| ❌ | Error / Failed / Disconnected | ❌ ไม่สามารถเชื่อมต่อได้, ❌ ผิดพลาด | Failed tasks, connection drops, validation errors |
| ⚠️ | Warning / Skipped / Attention | ⚠️ ข้าม, ⚠️ แจ้งเตือน | Non-critical issues, skipped tasks, warnings |

### 2.2 File Icons

File icons should be used to help users quickly identify file types and attachments.

| Emoji | Meaning / State | Thai Label Example | Use Case |
| :---: | :--- | :--- | :--- |
| 📁 | Folder / Collection of Files | 📁 ไฟล์, 📁 ดาวน์โหลดทั้งหมด | Buttons or directories containing multiple files |
| 📄 | Single Document / File | 📄 ข้อมูลบริษัท, 📄 งบดุล | Individual file listings, document attachments |

## 3. Implementation Rules

*   **Spacing:** Always include a single space between the functional emoji and the text label (e.g., `✅ เชื่อมต่อสำเร็จ` NOT `✅เชื่อมต่อสำเร็จ`).
*   **Consistency:** Do not mix different emojis for the same state across different pages. Stick strictly to the mapping above.
*   **No Redundancy:** Avoid stacking emojis (e.g., `❌⚠️ ผิดพลาด`). Pick the single most appropriate functional icon.
