# UI Icon & Emoji Standards

## 1. Goal
The primary objective of this project's user interface is to maintain a **Clean, Minimal, Formal, and Professional** corporate system. The standard applies to all web application screens, alert dialogues, reports, and logs.

## 2. Core Rule: No Decorative Emojis
To achieve a unified and strictly professional appearance, the use of **decorative text-based emojis is strictly forbidden**. Emojis often render inconsistently across different operating systems (macOS, Windows, iOS, Android) and carry informal connotations that conflict with enterprise software standards.

**Do not use emojis for:**
- Section Headers, Navigations, or Tabs (e.g., `🏢 ดึงข้อมูลตามสาขา`)
- General Action Buttons (e.g., `⬇️ ดึงข้อมูล`, `▶ เริ่มประมวลผล`, `🔍 ตรวจสอบ`)
- Dropdown Options (e.g., `🌟 รวมทั้งหมดในภูมิภาค`)
- Abstract concepts like Settings, Export, or Tools (e.g., `⚙️`, `📊`, `📥`)

## 3. The "Enterprise Emoji" Exception
We recognize that visual cues are necessary for rapid scanning of tabular data and logs. As an exception to the Core Rule, a highly restricted set of Unicode characters is permitted **only** when acting as a functional indicator.

### Allowed Status Indicators
These are permitted strictly for communicating state (success, failure, warning).
- ✅ `(U+2705)`: Use for **Success**, Connection Established, or File Ready.
- ❌ `(U+274C)`: Use for **Error**, Connection Failed, File Missing, or Rejection.
- ⚠️ `(U+26A0)`: Use for **Warning**, Pending Action, or Partial Data.

### Allowed File Indicators
These are permitted strictly for interacting with files or generated reports.
- 📁 `(U+1F4C1)`: Use to indicate a directory of files or a "View Files" action.
- 📄 `(U+1F4C4)`: Use to indicate a singular document or a "View Report" action.

## 4. Implementation Guidelines
When building new views (e.g., Vue components) or refactoring existing ones:
1.  **Prefer standard UI patterns:** Rely on color (e.g., Bootstrap success/danger classes) and explicit text rather than icons for primary actions.
2.  **Use vector icons when possible:** If a decorative icon is absolutely necessary for navigation, use a monochrome vector icon library (e.g., FontAwesome, Material Icons) rather than a text emoji.
3.  **Strict Audit:** During code review, any PR introducing new Unicode emojis outside of the approved list in Section 3 will be rejected.
