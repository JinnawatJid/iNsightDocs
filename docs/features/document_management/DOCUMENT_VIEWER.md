# Document Viewer (ดูเอกสารทั้งหมด)

This document outlines the behavior and specific business rules applied to the "ดูเอกสารทั้งหมด" (View All Documents) modal UI (`AllDocumentsModal.vue`), which is accessible from the Review Dashboard.

## 1. Document Grouping

Documents in the modal sidebar are divided into two primary groups based on their configuration keys:
- **เอกสารหลัก (Main Documents):** Pre-defined standard documents mapped in the system.
- **เอกสารอื่นๆ (Other Documents):** Any ad-hoc uploaded documents, prefixed with `other_` in their internal keys.

## 2. Main Documents Sorting Order

To provide a consistent and prioritized viewing experience for underwriters and reviewers, the "เอกสารหลัก" (Main Documents) list is explicitly sorted using a hardcoded configuration in the frontend code.

The top 7 documents are always displayed in the following fixed order, regardless of when they were uploaded:

1. **ใบขอเปิดเครดิต** (`credit_application_doc`)
2. **สำเนาทะเบียนบ้าน** (`home_reg`)
3. **สำเนาบัตรประชาชน** (`id_card`)
4. **หนังสือรับรองนิติบุคคล** (`legal_entity_certificate`)
5. **ภพ.20** (`vat_document`)
6. **รูปถ่ายบริษัท** (`company_photo`)
7. **รูปถ่าย** (`home_photo` / รูปถ่ายบ้านพักอาศัย)

### Unlisted Main Documents

Any other standard document types that are attached to the request but are **not** present in the explicit top 7 list above (e.g., รายการเดินบัญชี/Bank Statement, แผนที่/Map, รูปร้านค้า/Store Photo) will be appended below the top 7 list. They will appear in their natural, relative upload order.

## 3. Multiple Files per Category

The sorting logic is designed to support multiple files within a single category (e.g., `credit_application_doc_0`, `credit_application_doc_1`). The system strips the numerical index to identify the base document type and applies the sort order to the group as a whole.

## 4. File Preview Capabilities

The right pane of the modal acts as a file viewer, adapting its behavior based on the file type selected:

- **PDF Files:** Rendered using the browser's native built-in PDF viewer via an `<iframe>`.
- **Image Files (JPG, JPEG, PNG, WEBP, GIF):** Rendered using an interactive inline viewer (`v-viewer`). This allows users to pan (click and drag) and zoom (mouse wheel) the images. The interactive toolbar at the bottom is customized to show only relevant controls: **Zoom In, Zoom Out, 1:1 Actual Size, and Reset**. Slideshow, navigation, and rotation buttons are intentionally hidden for single-file preview clarity.
- **Unsupported Files:** For file formats that cannot be previewed natively in the browser, the system displays a placeholder UI prompting the user to download the file directly.
