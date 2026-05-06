const logger = require("../utils/logger");
const db = require("../db");
const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const fileResolver = require("../utils/fileResolver");
const {
  normalizeBranchCode,
  getBranchCodeFromUser,
} = require("../utils/branchCode");

let projectRoot = path.resolve(__dirname, "../../../../");
if (!fs.existsSync(path.join(projectRoot, "customers"))) {
  projectRoot = path.resolve(__dirname, "../../");
}
const defaultUploadPath = path.join(projectRoot, "uploads");

const UPLOAD_BASE = process.env.UPLOAD_PATH
  ? path.resolve(process.cwd(), process.env.UPLOAD_PATH)
  : defaultUploadPath;

exports.getCreditRequestDetail = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id

  try {
    let sql;
    if (db.dbType === "mssql") {
      sql = "SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?";
    } else {
      sql = "SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1";
    }

    const { rows } = await db.query(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Credit request not found" });
    }

    const request = rows[0];

    // Fetch Attachments (excluding soft-deleted)
    const attachmentsSql =
      "SELECT * FROM CreditRequestAttachments WHERE tx_id = ? AND (is_deleted IS NULL OR is_deleted = 0)";
    const { rows: attachments } = await db.query(attachmentsSql, [id]);

    // Fetch Comments
    const commentsSql =
      "SELECT * FROM RequestComments WHERE tx_id = ? ORDER BY created_at ASC";
    const { rows: comments } = await db.query(commentsSql, [id]);

    // Parse snapshot data if string
    let snapshotData = request.snapshot_data;
    if (typeof snapshotData === "string") {
      try {
        snapshotData = JSON.parse(snapshotData);
      } catch (e) {
        logger.error("Error parsing snapshot JSON:", e);
        snapshotData = {};
      }
    }

    const responseData = {
      id: request.id,
      txId: request.tx_id,
      status: request.status,
      customer_no: request.customer_no,
      customer_name: request.customer_name,
      request_amount: request.request_amount,
      request_reason: request.request_reason,
      request_credit_term: request.request_credit_term,
      term_gs: request.term_gs,
      term_ae: request.term_ae,
      term_yc: request.term_yc,
      request_type: request.request_type,
      created_at: request.created_at,
      updated_at: request.updated_at,
      snapshot_data: snapshotData,
      attachments: attachments || [],
      comments: comments || [],
    };

    res.status(200).json({ data: responseData });
  } catch (error) {
    logger.error("Error fetching credit request detail:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.deleteAdditionalDocument = async (req, res) => {
  const { id, fileId } = req.params;
  const actor_role = req.body.actor_role;
  const username = req.user ? req.user.empname || req.user.username : "System";

  try {
    // Get file details to delete it physically and add to audit log
    const fileSql = `SELECT file_path, original_name, file_type, uploaded_by FROM CreditRequestAttachments WHERE id = ? AND tx_id = ?`;
    const { rows: files } = await db.query(fileSql, [fileId, id]);

    if (!files || files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = files[0];

    // Check permissions: only the original uploader may delete the document.
    if (file.uploaded_by !== username) {
      return res.status(403).json({ error: "Permission denied. You can only delete your own documents." });
    }

    if (!file.file_path) {
      return res
        .status(400)
        .json({ error: "File path is missing in the database" });
    }

    let normalizedPath = file.file_path.replace(/\\/g, "/");

    if (normalizedPath.startsWith("customers/")) {
      normalizedPath = normalizedPath.replace(/^customers\//, "");
    } else if (normalizedPath.startsWith("uploads/")) {
      normalizedPath = normalizedPath.replace(/^uploads\//, "");
    }

    let resolvedPath = await fileResolver.resolveFilePath(
      normalizedPath,
      UPLOAD_BASE,
      projectRoot,
    );
    let fullPath = resolvedPath || normalizedPath;

    // Soft Delete from database
    const deleteSql = `UPDATE CreditRequestAttachments SET is_deleted = 1 WHERE id = ?`;
    await db.runAsync(deleteSql, [fileId]);

    // Try to delete physically
    try {
      if (await fs.pathExists(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (fsError) {
      logger.error(`Failed to delete file physically: ${fullPath}`, fsError);
      // We continue even if physical delete fails, database is primary source of truth
    }

    // Add audit comment
    const comment = `เอกสาร ${file.original_name} (${file.file_type || "เอกสารเพิ่มเติม"}) ถูกลบโดย ${username}`;
    let commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    let commentParams = [id, actor_role || "System", comment, username];

    if (db.dbType === "mssql") {
      commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, GETUTCDATE())`;
    }

    await db.runAsync(commentSql, commentParams);

    logger.info(`Deleted file ${fileId} from request ${id}`);

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    logger.error("Error deleting file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.downloadCreditRequestFile = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id
  const { fileId } = req.params; // attachment ID

  try {
    let sql;
    if (db.dbType === "mssql") {
      sql =
        "SELECT TOP 1 * FROM CreditRequestAttachments WHERE id = ? AND tx_id = ?";
    } else {
      sql =
        "SELECT * FROM CreditRequestAttachments WHERE id = ? AND tx_id = ? LIMIT 1";
    }

    const { rows } = await db.query(sql, [fileId, id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileRecord = rows[0];
    let filePath = fileRecord.file_path;

    if (!filePath) {
      return res
        .status(404)
        .json({ error: "File path is missing in the database" });
    }

    // Normalize path separators (handle backslashes from legacy Windows systems)
    let normalizedPath = filePath.replace(/\\/g, "/");

    // Strip out erroneous legacy prefixes
    if (normalizedPath.startsWith("customers/")) {
      normalizedPath = normalizedPath.replace(/^customers\//, "");
    } else if (normalizedPath.startsWith("uploads/")) {
      normalizedPath = normalizedPath.replace(/^uploads\//, "");
    }

    let foundPath = await fileResolver.resolveFilePath(
      normalizedPath,
      UPLOAD_BASE,
      projectRoot,
    );

    if (!foundPath) {
      logger.error(
        `File not found on server. DB Path: ${fileRecord.file_path}, Normalized: ${normalizedPath}`,
      );
      return res.status(404).json({ error: "File not found on server" });
    }

    filePath = foundPath;

    const mimeType = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);

    // Use the actual physical file name for downloads instead of the short original name
    const physicalFilename = path.basename(filePath);
    // Use filename*=UTF-8''... for better browser support of non-ASCII characters
    const encodedFilename = encodeURIComponent(physicalFilename);

    // Check if the client requested inline viewing (e.g. for native PDF/Image preview in browser)
    const disposition = req.query.inline === "true" ? "inline" : "attachment";
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error("Error downloading file:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Core unified endpoint logic for inserting OR updating a Credit Request.
 * Utilizes SQL Transactions to ensure file attachments and core data
 * are committed together safely.
 */
exports.createCreditRequest = async (req, res) => {
  // When using multer, text fields are in req.body and files in req.files
  const {
    tx_id,
    customer_no,
    customer_name,
    request_amount,
    request_reason,
    request_credit_term,
    term_gs,
    term_ae,
    term_yc,
    request_type,
    snapshot_data,
    is_submit,
  } = req.body;

  logger.info("createCreditRequest Body:", {
    tx_id,
    customer_no,
    request_amount,
    term_gs,
    term_ae,
    term_yc,
    request_type,
    is_submit,
    status: req.body.status,
  });

  if (!customer_name || !customer_no) {
    return res
      .status(400)
      .json({ error: "Customer name and Customer No (ID) are required" });
  }

  // Determine who uploaded the file
  let uploadedBy = null;
  if (req.user && req.user.empname) {
    uploadedBy = req.user.empname;
  } else if (req.user && req.user.username) {
    uploadedBy = req.user.username;
  } else if (req.body.actor_role) {
    uploadedBy = req.body.actor_role;
  }

  // Parse snapshot_data if it's a string
  let parsedSnapshot = snapshot_data;
  if (typeof parsedSnapshot === "string") {
    try {
      parsedSnapshot = JSON.parse(parsedSnapshot);
    } catch (e) {
      logger.error("Error parsing snapshot data:", e);
      parsedSnapshot = {};
    }
  }

  try {
    let existing = null;

    // Check for existing active request for this customer
    // Legacy statuses: Submitted, Reviewed
    // New statuses: RegionalSubmitted, SalesSubmitted, FinanceReviewed, Reviewed
    const activeStatuses = [
      "Draft",
      "Opened",
      "RegionalSubmitted",
      "SalesSubmitted",
      "FinanceReviewed",
      "Reviewed",
      "Submitted",
    ];
    const statusPlaceholders = activeStatuses.map(() => "?").join(",");

    let rows = [];

    // If client specifies tx_id, always update that exact request first.
    // This prevents accidentally updating another active request for the same customer.
    if (tx_id) {
      let txSql;
      if (db.dbType === "mssql") {
        txSql = `SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?`;
      } else {
        txSql = `SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1`;
      }
      const { rows: txRows } = await db.query(txSql, [tx_id]);
      rows = txRows || [];
    }

    if (!rows.length) {
      let existingSql;
      if (db.dbType === "mssql") {
        existingSql = `
          SELECT TOP 1 * FROM CreditRequests
          WHERE customer_no = ? AND status IN (${statusPlaceholders})
          ORDER BY updated_at DESC
        `;
      } else {
        existingSql = `
          SELECT * FROM CreditRequests
          WHERE customer_no = ? AND status IN (${statusPlaceholders})
          ORDER BY updated_at DESC
          LIMIT 1
        `;
      }
      const { rows: existingRows } = await db.query(existingSql, [
        customer_no,
        ...activeStatuses,
      ]);
      rows = existingRows || [];
    }

    let txId;
    let requestId;
    let status;
    let responseSnapshot = null;
    let responseAmount = null;
    let responseReason = null;
    let responseCreditTerm = null;
    let responseTermGS = null;
    let responseTermAE = null;
    let responseTermYC = null;
    let responseRequestType = null;

    if (rows && rows.length > 0) {
      existing = rows[0];

      // CONCURRENCY CHECK
      // If the client provided a tx_id (meaning they think they are updating a specific request)
      // and it does not match the active request's tx_id (e.g. they submitted a Draft that is now Opened with a real ID),
      // or if they are trying to create/submit without a tx_id but an active non-Draft request already exists.
      const clientTxIdMismatch = tx_id && tx_id !== existing.tx_id;
      const existingNotDraft = existing.status !== "Draft";

      // If client submits a request, but the existing request in DB is no longer a Draft,
      // AND it's a new submission attempt (either no tx_id, or they are trying to transition it),
      // it means someone else already submitted it.
      // We check if the client is trying to transition to 'Opened' (which indicates initial submission)
      // or if they are simply doing a saveDraft (which will have no req.body.status but is_submit will be false).
      const isSubmittingNewRequest =
        is_submit === "true" &&
        (!req.body.status || req.body.status === "Opened");

      if (clientTxIdMismatch || (isSubmittingNewRequest && existingNotDraft)) {
        logger.warn(
          `Concurrency conflict detected for customer ${customer_no}. Client tx_id: ${tx_id}, Active tx_id: ${existing.tx_id}, Active status: ${existing.status}`,
        );
        return res
          .status(409)
          .json({
            error:
              "มีคำขอเครดิตที่กำลังดำเนินการอยู่สำหรับลูกค้ารายนี้ โปรดรีเฟรชหน้าจอ",
          });
      }

      // EXISTING REQUEST FOUND
      txId = existing.tx_id;
      requestId = existing.id;
      status = existing.status;

      // If is_submit is true, we update the data and possibly the status
      // We also handle "status" passed explicitly in the body for status transitions
      if (is_submit === "true" || is_submit === true || req.body.status) {
        let newStatus = req.body.status || existing.status;

        // --- TxID Generation Logic (Draft -> Opened) ---
        // If we are transitioning from Draft to Opened, we must generate the real ID
        if (
          existing.status === "Draft" &&
          newStatus === "Opened" &&
          !existing.tx_id.includes("-R")
        ) {
          const now = new Date();
          const year = now.getFullYear();
          const yy = (year + 543).toString().slice(-2);
          const mm = (now.getMonth() + 1).toString().padStart(2, "0");

          // Extract branchCode from JWT payload (req.user is set by authMiddleware)
          const branchCode = normalizeBranchCode(
            getBranchCodeFromUser(req.user),
          );
          if (branchCode === "XX") {
            logger.warn(
              `Branch code missing in JWT payload for user ${req.user?.username || "unknown"}; falling back to XX`,
            );
          }
          const prefix = `${branchCode}CA${yy}${mm}/`;

          // Find the latest running number
          let latestSql;
          if (db.dbType === "mssql") {
            latestSql = `SELECT TOP 1 tx_id FROM CreditRequests WHERE tx_id LIKE ? ORDER BY tx_id DESC`;
          } else {
            latestSql = `SELECT tx_id FROM CreditRequests WHERE tx_id LIKE ? ORDER BY tx_id DESC LIMIT 1`;
          }
          const { rows: latestRows } = await db.query(latestSql, [
            `${prefix}%`,
          ]);

          let runningNum = 1;
          if (latestRows && latestRows.length > 0) {
            const lastTxId = latestRows[0].tx_id;
            const lastNumStr = lastTxId.split("/")[1];
            const lastNum = parseInt(lastNumStr, 10);
            if (!isNaN(lastNum)) runningNum = lastNum + 1;
          }

          // If DB rows were deleted manually, old upload folders may still exist.
          // Skip numbers that would collide with an existing folder on disk.
          while (runningNum <= 99) {
            const candidateTxId = `${prefix}${runningNum
              .toString()
              .padStart(2, "0")}`;
            const candidateDir = path.join(
              UPLOAD_BASE,
              existing.customer_no,
              candidateTxId.replace(/\//g, "_"),
            );

            if (!(await fs.pathExists(candidateDir))) {
              break;
            }

            runningNum += 1;
          }

          if (runningNum > 99)
            return res
              .status(500)
              .json({
                error: "Transaction limit exceeded for this month (max 99)",
              });

          const newRealTxId = `${prefix}${runningNum.toString().padStart(2, "0")}`;
          const oldTxId = txId;
          const oldRequestId = requestId;

          logger.info(`Finalizing Draft ${oldTxId} to ${newRealTxId}`);

          // 1. Rename Folder
          // Determine old and new directory paths based on customer code
          const cleanOldTxId = oldTxId.replace(/\//g, "_");
          const cleanNewTxId = newRealTxId.replace(/\//g, "_");

          const oldDir = path.join(
            UPLOAD_BASE,
            existing.customer_no,
            cleanOldTxId,
          );
          const newDir = path.join(
            UPLOAD_BASE,
            existing.customer_no,
            cleanNewTxId,
          );

          if (await fs.pathExists(oldDir)) {
            // Ensure parent of newDir exists
            await fs.ensureDir(path.dirname(newDir));
            await fs.move(oldDir, newDir);
          }

          // 2. Clone Parent Record with New ID (to satisfy FK constraints in MSSQL)
          // We insert a new record, move children, then delete the old record.
          const insertSql = `INSERT INTO CreditRequests (
                tx_id, customer_no, customer_name, status,
                request_amount, request_reason, request_credit_term,
                term_gs, term_ae, term_yc, request_type, snapshot_data, created_at, created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          const insertResult = await db.runAsync(insertSql, [
            newRealTxId,
            existing.customer_no,
            existing.customer_name,
            existing.status,
            request_amount !== undefined
              ? request_amount
              : existing.request_amount,
            request_reason !== undefined
              ? request_reason
              : existing.request_reason,
            request_credit_term !== undefined
              ? request_credit_term
              : existing.request_credit_term,
            term_gs !== undefined ? term_gs : existing.term_gs,
            term_ae !== undefined ? term_ae : existing.term_ae,
            term_yc !== undefined ? term_yc : existing.term_yc,
            request_type !== undefined ? request_type : existing.request_type,
            snapshot_data !== undefined
              ? snapshot_data
              : existing.snapshot_data,
            existing.created_at,
            existing.created_by || "Unknown",
            req.body.uploaded_by || req.user?.username || "Unknown",
          ]);

          const newRequestId = insertResult.id;

          // 3. Update DB Attachments Paths (Move Children)
          // Path format: customer_no/TXID/file.ext
          const cleanOldTxIdUpdate = oldTxId.replace(/\//g, "_");
          const cleanNewTxIdUpdate = newRealTxId.replace(/\//g, "_");
          const oldPathSegment = `${cleanOldTxIdUpdate}/`;
          const newPathSegment = `${cleanNewTxIdUpdate}/`;

          await db.runAsync(
            `UPDATE CreditRequestAttachments SET tx_id = ?, file_path = REPLACE(file_path, ?, ?) WHERE tx_id = ?`,
            [newRealTxId, oldPathSegment, newPathSegment, oldTxId],
          );

          // 4. Update Comments (Move Children)
          await db.runAsync(
            `UPDATE RequestComments SET tx_id = ? WHERE tx_id = ?`,
            [newRealTxId, oldTxId],
          );

          // 5. Delete Old Parent Record
          await db.runAsync("DELETE FROM CreditRequests WHERE id = ?", [
            oldRequestId,
          ]);

          // 6. Update Variables for subsequent logic
          txId = newRealTxId;
          requestId = newRequestId;
        }

        status = newStatus;

        // Update Query (including tx_id in case it changed)
        // Use one shared timestamp so the request row and the workflow comment stay in sync.
        const statusEventAt = new Date().toISOString();
        await db.runAsync(
          "UPDATE CreditRequests SET tx_id = ?, request_amount = ?, request_reason = ?, request_credit_term = ?, term_gs = ?, term_ae = ?, term_yc = ?, request_type = ?, snapshot_data = ?, status = ?, updated_at = ? WHERE id = ?",
          [
            txId,
            request_amount,
            request_reason,
            request_credit_term,
            term_gs,
            term_ae,
            term_yc,
            request_type,
            snapshot_data,
            status,
            statusEventAt,
            requestId,
          ],
        );

        // Handle Comment insertion
        if (req.body.comment && req.body.actor_role) {
          await db.runAsync(
            "INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, ?)",
            [
              txId,
              req.body.actor_role,
              req.body.comment,
              req.body.uploaded_by || req.user?.username || "Unknown",
              statusEventAt,
            ],
          );
        }

        // --- Notification Logic ---
        if (existing.status !== newStatus) {
            let targetRole = null;
            let targetUsername = null;
            let message = '';

            // 1. Notify the next approver role (if applicable)
            switch(newStatus) {
                case 'Opened':
                    targetRole = 'ผู้พิจารณาของพื้นที่';
                    message = `คำขอ ${txId} รอการพิจารณาจากคุณ`;
                    break;
                case 'RegionalSubmitted':
                    targetRole = 'ผู้พิจารณาฝ่ายขาย';
                    message = `คำขอ ${txId} รอการพิจารณาจากคุณ`;
                    break;
                case 'SalesSubmitted':
                    targetRole = 'ผู้ตรวจสอบเอกสาร';
                    message = `คำขอ ${txId} รอการตรวจสอบเอกสาร`;
                    break;
                case 'FinanceReviewed':
                  targetRole = 'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)';
                    message = `คำขอ ${txId} รอการพิจารณาอนุมัติ`;
                    break;
                case 'Reviewed':
                  targetRole = 'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)';
                    message = `คำขอ ${txId} รอการพิจารณาอนุมัติ`;
                    break;
            }

            if (targetRole) {
                await db.runAsync(
                    "INSERT INTO Notifications (tx_id, target_role, target_username, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    [txId, targetRole, null, message, statusEventAt]
                );
            }

            // 2. Always notify the initiator of ANY status change (if they aren't the one making the change)
            const currentUser = req.user?.username;
            logger.info(`[Notification Debug] Status changed from ${existing.status} to ${newStatus}`);
            logger.info(`[Notification Debug] Created By: ${existing.created_by}, Current User: ${currentUser}`);

            // Note: In DEV_MODE, everyone shares the username "DEV_MODE_USER".
            // We bypass the strict currentUser check if the username is DEV_MODE_USER so testing works.
            if (existing.created_by && (existing.created_by !== currentUser || currentUser === 'DEV_MODE_USER')) {
                logger.info(`[Notification Debug] Sending notification to initiator: ${existing.created_by}`);
                const initiatorMessage = `คำขอ ${txId} ถูกเปลี่ยนสถานะเป็น ${newStatus}`;
                await db.runAsync(
                    "INSERT INTO Notifications (tx_id, target_role, target_username, message, created_at) VALUES (?, ?, ?, ?, ?)",
                    [txId, null, existing.created_by, initiatorMessage, statusEventAt]
                );
            } else {
                logger.info(`[Notification Debug] Skipping notification to initiator because they made the change.`);
            }
        }
      } else {
        // Just return existing request
        responseSnapshot = existing.snapshot_data;
        responseAmount = existing.request_amount;
        responseReason = existing.request_reason;
        responseCreditTerm = existing.request_credit_term;
        responseTermGS = existing.term_gs;
        responseTermAE = existing.term_ae;
        responseTermYC = existing.term_yc;
        responseRequestType = existing.request_type;
      }
    } else {
      // Create NEW Request (DRAFT)
      // Generate Temporary TxId: TMP-[Timestamp]
      const now = new Date();
      txId = `TMP-${now.getTime()}`;

      status = "Draft";

      const result = await db.runAsync(
        "INSERT INTO CreditRequests (tx_id, customer_no, customer_name, status, request_amount, request_reason, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          txId,
          customer_no,
          customer_name,
          status,
          request_amount,
          request_reason,
          request_credit_term,
          term_gs,
          term_ae,
          term_yc,
          request_type,
          snapshot_data,
          new Date().toISOString(),
          req.body.uploaded_by || req.user?.username || "Unknown",
          req.body.uploaded_by || req.user?.username || "Unknown",
        ],
      );
      requestId = result.id;
    }

    // Handle File Uploads
    // --- HANDLE NO FINANCIAL DATA MARKER ---
    const activeCustomerNo = customer_no || existing?.customer_no;

    // Extract date calculation variables to be used by both blocks
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");

    if (
      activeCustomerNo &&
      parsedSnapshot?.transaction_data?.noFinancialData === true
    ) {
      try {
        const dateFolder = `${yyyy}${mm}${dd}`;

        const customerDir = path.join(
          projectRoot,
          "customers",
          activeCustomerNo,
          dateFolder,
        );
        await fs.ensureDir(customerDir);

        const markerPath = path.join(customerDir, "DBD_NoFinancialData.txt");
        await fs.outputFile(
          markerPath,
          "No financial statements submitted by customer.",
        );
        logger.info(
          `[Financial Sync] Created no financial data marker at ${markerPath}`,
        );
      } catch (markerErr) {
        logger.error(
          `[Financial Sync] Error creating no financial data marker:`,
          markerErr,
        );
      }
    }

    // Handle explicitly referenced previous files
    let previousFiles = [];
    if (req.body.previous_files) {
      const parsedPreviousFiles = Array.isArray(req.body.previous_files)
        ? req.body.previous_files.map(f => JSON.parse(f))
        : [JSON.parse(req.body.previous_files)];

      // Look up files securely from the DB
      for (const prevFile of parsedPreviousFiles) {
        let attSql = "SELECT * FROM CreditRequestAttachments WHERE id = ?";
        let { rows: attRows } = await db.query(attSql, [prevFile.id]);
        if (attRows && attRows.length > 0) {
          const dbFile = attRows[0];
          // Ensure it belongs to the same customer (via tx_id relation, roughly)
          let reqSql = "SELECT customer_no FROM CreditRequests WHERE tx_id = ?";
          let { rows: reqRows } = await db.query(reqSql, [dbFile.tx_id]);
          if (reqRows && reqRows.length > 0 && reqRows[0].customer_no === (customer_no || existing?.customer_no)) {
            previousFiles.push({
              ...dbFile,
              key: prevFile.key // override with the key the frontend requested it to be placed under
            });
          } else {
            logger.warn(`Attempted to copy file from another customer: ${dbFile.id}`);
          }
        }
      }
    }

    if ((req.files && req.files.length > 0) || previousFiles.length > 0) {
      // Construct relative path components based on customer code and transaction ID
      const activeCustomerNo = customer_no || existing?.customer_no;
      if (!activeCustomerNo) {
        throw new Error("Customer Number is required to save uploaded files.");
      }

      const cleanTxId = txId.replace(/\//g, "_");
      const relativeDir = path.join(activeCustomerNo, cleanTxId);
      const targetDir = path.join(UPLOAD_BASE, relativeDir);
      await fs.ensureDir(targetDir);

      // Handle newly uploaded files
      for (const file of (req.files || [])) {
        // Fix for Thai characters in fieldname (similar to originalname fix in upload.js)
        // Browser sends UTF-8, but it might be interpreted as Latin-1 by the parser
        try {
          // Only attempt to fix if the string contains only Latin-1 characters (Mojibake usually fits in Latin-1)
          // If it already contains characters > 255 (e.g. Thai), it is likely already correct/decoded.
          if (!/[^\u0000-\u00ff]/.test(file.fieldname)) {
            file.fieldname = Buffer.from(file.fieldname, "latin1").toString(
              "utf8",
            );
          }
        } catch (e) {
          logger.error(
            "Error fixing encoding for fieldname:",
            file.fieldname,
            e,
          );
        }

        // Generate secure contextual file name: [Customer_No]_[Original_Name_Without_Ext]_[YYYYMMDD_HHMMSS]_[Milliseconds].[Ext]
        const parsedName = path.parse(file.originalname);
        const originalNameWithoutExt = parsedName.name;
        const ext = parsedName.ext;

        // Format timestamp (YYYYMMDD_HHMMSS_SSS)
        const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}_${ms}`;

        // Replace spaces with underscores and remove any problematic characters from the original name (optional but good practice)
        // But we'll mostly leave it alone to preserve the original as requested, just appending the rest.
        const safeOriginalName = originalNameWithoutExt.replace(
          /[\/:*?"<>|]/g,
          "_",
        );

        const secureFileName = `${customer_no}_${safeOriginalName}_${timestamp}${ext}`;

        const finalPath = path.join(targetDir, secureFileName);
        await fs.move(file.path, finalPath, { overwrite: true });

        // Store relative path in DB (e.g., 00001AY/TXID/file.pdf)
        // Use path.relative to get the relative path from UPLOAD_BASE
        // and normalize slashes to forward slashes for cross-platform compatibility
        const relativeFilePath = path
          .relative(UPLOAD_BASE, finalPath)
          .split(path.sep)
          .join("/");

        await db.runAsync(
          "INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
          [
            txId,
            file.fieldname,
            relativeFilePath,
            file.originalname,
            uploadedBy,
            uploadedBy,
          ],
        );

        // --- SYNC TO FINANCIAL CACHE (customers/YYYYMMDD) ---
        const financialFields = {
          company_profile_doc: "DBD_Profile.pdf",
          balance_sheet_doc: "DBD_BalanceSheet.xlsx",
          profit_loss_doc: "DBD_IncomeStatement.xlsx",
          financial_ratios_doc: "DBD_FinancialRatios.xlsx",
        };

        if (financialFields[file.fieldname]) {
          try {
            // Determine Date Folder (YYYYMMDD)
            const dateFolder = `${yyyy}${mm}${dd}`;
            const customerDir = path.join(
              projectRoot,
              "customers",
              activeCustomerNo,
              dateFolder,
            );
            await fs.ensureDir(customerDir);

            const cachedFileName = financialFields[file.fieldname];
            const cachedFilePath = path.join(customerDir, cachedFileName);

            // Copy file to financial cache
            await fs.copy(finalPath, cachedFilePath, { overwrite: true });
            logger.info(
              `[Financial Sync] Copied ${file.fieldname} to ${cachedFilePath}`,
            );
          } catch (syncErr) {
            logger.error(
              `[Financial Sync] Error copying ${file.fieldname} to financial cache:`,
              syncErr,
            );
          }
        }
      }

      // Handle copied previous files securely based on DB results
      for (const prevFile of previousFiles) {
        const sourcePath = path.join(UPLOAD_BASE, prevFile.file_path);

        if (await fs.pathExists(sourcePath)) {
            const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}_${ms}`;
            const parsedName = path.parse(prevFile.original_name);
            const safeOriginalName = parsedName.name.replace(/[\/:*?"<>|]/g, "_");
            const secureFileName = `${activeCustomerNo}_${safeOriginalName}_${timestamp}${parsedName.ext}`;
            const finalPath = path.join(targetDir, secureFileName);

            await fs.copy(sourcePath, finalPath, { overwrite: true });

            const relativeFilePath = path
              .relative(UPLOAD_BASE, finalPath)
              .split(path.sep)
              .join("/");

            await db.runAsync(
              "INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
              [
                txId,
                prevFile.key, // Ensure frontend requested key is used
                relativeFilePath,
                prevFile.original_name,
                uploadedBy,
                uploadedBy,
              ]
            );

            // Sync copied file to financial cache if applicable
            const financialFields = {
              company_profile_doc: "DBD_Profile.pdf",
              balance_sheet_doc: "DBD_BalanceSheet.xlsx",
              profit_loss_doc: "DBD_IncomeStatement.xlsx",
              financial_ratios_doc: "DBD_FinancialRatios.xlsx",
            };

            if (financialFields[prevFile.key]) {
              try {
                const dateFolder = `${yyyy}${mm}${dd}`;
                const customerDir = path.join(
                  projectRoot,
                  "customers",
                  activeCustomerNo,
                  dateFolder,
                );
                await fs.ensureDir(customerDir);

                const cachedFileName = financialFields[prevFile.key];
                const cachedFilePath = path.join(customerDir, cachedFileName);

                await fs.copy(finalPath, cachedFilePath, { overwrite: true });
                logger.info(
                  `[Financial Sync] Copied ${prevFile.key} (from previous) to ${cachedFilePath}`,
                );
              } catch (syncErr) {
                logger.error(
                  `[Financial Sync] Error copying ${prevFile.key} (from previous) to financial cache:`,
                  syncErr,
                );
              }
            }
        } else {
            logger.warn(`Source file not found for copying: ${sourcePath}`);
        }
      }
    }

    // Fetch attachments to return in response (essential for auto-resume flow)
    let attachments = [];
    if (txId) {
      const attSql = "SELECT * FROM CreditRequestAttachments WHERE tx_id = ?";
      const { rows } = await db.query(attSql, [txId]);
      attachments = rows || [];
    }

    let responseData = {
      id: requestId,
      txId,
      status,
      customer_name,
      customer_no,
      attachments,
      // For Opened requests (existing or new), return what we have
      snapshot_data: responseSnapshot || snapshot_data,
      request_amount: responseAmount || request_amount,
      request_reason: responseReason || request_reason,
      request_credit_term: responseCreditTerm || request_credit_term,
      term_gs: responseTermGS !== null ? responseTermGS : term_gs,
      term_ae: responseTermAE !== null ? responseTermAE : term_ae,
      term_yc: responseTermYC !== null ? responseTermYC : term_yc,
      request_type: responseRequestType || request_type,
    };

    res.status(201).json({
      message:
        status === "Submitted"
          ? "Credit request submitted successfully"
          : "Credit request initialized/retrieved",
      data: responseData,
    });
  } catch (error) {
    logger.error("Error processing credit request:", error);
    if (req.files) {
      req.files.forEach((f) => fs.remove(f.path).catch(() => {}));
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getRecentApprovedRequest = async (req, res) => {
  const isAutoCarryoverEnabled = process.env.FEATURE_AUTO_CARRYOVER === 'true';

  if (!isAutoCarryoverEnabled) {
    return res.status(403).json({ error: "Auto carry-over feature is disabled" });
  }

  const customerNo = req.params.customerNo;

  try {
    let sql;
    if (db.dbType === "mssql") {
      sql = "SELECT TOP 1 * FROM CreditRequests WHERE customer_no = ? AND status = 'Approved' ORDER BY updated_at DESC";
    } else {
      sql = "SELECT * FROM CreditRequests WHERE customer_no = ? AND status = 'Approved' ORDER BY updated_at DESC LIMIT 1";
    }

    const { rows } = await db.query(sql, [customerNo]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No recent approved request found" });
    }

    const request = rows[0];

    // Fetch Attachments (excluding soft-deleted)
    const attachmentsSql =
      "SELECT * FROM CreditRequestAttachments WHERE tx_id = ? AND (is_deleted IS NULL OR is_deleted = 0)";
    const { rows: attachments } = await db.query(attachmentsSql, [request.tx_id]);

    // Parse snapshot data if string
    let snapshotData = request.snapshot_data;
    if (typeof snapshotData === "string") {
      try {
        snapshotData = JSON.parse(snapshotData);
      } catch (e) {
        logger.error("Error parsing snapshot JSON in getRecentApprovedRequest:", e);
        snapshotData = {};
      }
    }

    res.status(200).json({
      data: {
        id: request.id,
        txId: request.tx_id,
        status: request.status,
        customer_no: request.customer_no,
        customer_name: request.customer_name,
        snapshot_data: snapshotData,
        attachments: attachments || [],
      },
    });
  } catch (error) {
    logger.error("Error fetching recent approved request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Cache for REGION_BRANCH_CONFIG to avoid excessive DB queries
let regionBranchConfigCache = null;
let regionBranchConfigCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

exports.getCreditRequests = async (req, res) => {

  const { status, search } = req.query;

  // Determine user info and roles from req.user
  const username = req.user?.username || "";
  const roles = req.user?.roles || [];
  const isInitiator = roles.some((r) => r.role === 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)');

  try {
    let sql = `
      SELECT id, tx_id, customer_no, customer_name, status, request_amount, request_credit_term, term_gs, term_ae, term_yc, request_type, snapshot_data, created_at, updated_at
      FROM CreditRequests
    `;
    const params = [];
    const conditions = [];

    if (status) {
      // Split status by comma if multiple statuses are provided (e.g. ?status=Submitted,Reviewed)
      const statusList = status.split(",").map((s) => s.trim());

      // Check if we are viewing the Pending List (active statuses) vs History (final statuses)
      // If it's a mix or active, we restrict it for Initiators.
      const hasFinalStatuses = statusList.some(s => ['Approved', 'Rejected', 'Closed', 'Canceled'].includes(s));
      const restrictToOwner = process.env.RESTRICT_PENDING_LIST_TO_OWNER === 'true';

      // Branch Managers / Initiators should only see requests they created, but ONLY when viewing pending requests
      if (isInitiator && !hasFinalStatuses && restrictToOwner) {
        conditions.push(`created_by = ?`);
        params.push(username);
      }

      // Regional Managers should only see requests from their assigned branches
      const isRegionalManager = roles.some((r) => r.role === 'ผู้พิจารณาของพื้นที่');
      if (isRegionalManager && !hasFinalStatuses) {
        try {
          let regionConfig = null;
          const now = Date.now();
          if (regionBranchConfigCache && (now - regionBranchConfigCacheTime < CACHE_TTL)) {
              regionConfig = regionBranchConfigCache;
          } else {
              const configRes = await db.query("SELECT config_value FROM Configurations WHERE config_key = 'REGION_BRANCH_CONFIG'");
              const rows = configRes.rows || configRes.recordset || configRes; // Handle different DB wrapper return formats (Postgres, MSSQL, raw array)
              if (rows && rows.length > 0) {
                  let configVal = rows[0].config_value;
                  if (typeof configVal === 'string') {
                      configVal = JSON.parse(configVal);
                  }
                  regionConfig = configVal;
                  regionBranchConfigCache = regionConfig;
                  regionBranchConfigCacheTime = now;
              }
          }

          if (regionConfig) {

            const userBranchCode = req.user?.branchCode || "";
            let allowedBranches = [];

            // Find which region the user belongs to
            for (const region of regionConfig) {
              const hasBranch = region.zones.some(z => z.code === userBranchCode);
              if (hasBranch) {
                allowedBranches = region.zones.map(z => z.code);
                break;
              }
            }

            if (allowedBranches.length > 0) {
              // As requested by user, don't rely on the '00' prefix.
              // tx_id format is e.g. 00TRCA6903/01. We can use __TR% or %TR%
              const branchConditions = allowedBranches.map(() => `tx_id LIKE ?`).join(" OR ");
              conditions.push(`(${branchConditions})`);
              allowedBranches.forEach(code => params.push(`__${code}%`));
            } else {
              // If branch not found in any region config, show nothing or fallback gracefully.
              // To restrict to nothing, we could enforce an impossible condition.
              conditions.push(`1 = 0`);
            }
          } else {
             conditions.push(`1 = 0`);
          }
        } catch (e) {
            logger.error("Error applying regional manager branch filter:", e);
            conditions.push(`1 = 0`); // Fail-closed on error
        }
      }

      if (statusList.length > 0) {
        const placeholders = statusList.map(() => "?").join(",");
        conditions.push(`status IN (${placeholders})`);
        params.push(...statusList);
      }
    }

    if (search) {
      conditions.push(`customer_name LIKE ?`);
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += ` ORDER BY updated_at DESC`;

    const { rows } = await db.query(sql, params);

    // Parse snapshot_data to extract transaction_data terms in case direct columns are null
    const processedRows = rows.map(row => {
      let snapshot = {};
      if (row.snapshot_data) {
        try {
          snapshot = typeof row.snapshot_data === 'string' ? JSON.parse(row.snapshot_data) : row.snapshot_data;
        } catch (e) {
          logger.warn(`Failed to parse snapshot data for tx_id ${row.tx_id}`);
        }
      }

      const txData = snapshot.transaction_data || {};

      let billingTermCode = null;
      let tempInitialCR = null;

      if (snapshot.billing_terms_code) {
        // e.g., "B00CR30" -> extract "B00"
        const match = snapshot.billing_terms_code.match(/^B\d+/);
        if (match) {
           billingTermCode = match[0];
        } else {
           billingTermCode = snapshot.billing_terms_code;
        }

        // [TEMPORARY WORKAROUND]
        // Industry Standard Note: For pending requests, baseline/original data (the initial credit terms)
        // should be separated from requested data (the new terms being applied for). Since the current
        // term_gs, term_ae, term_yc in transaction_data reflect the *new* request, we temporarily parse
        // the initial CR term from the snapshot's billing_terms_code (e.g. CR30 -> 30) to display the
        // initial state (e.g. CR30/30/30) in the list until final approval updates the main tables.
        const crMatch = snapshot.billing_terms_code.match(/CR(\d+)/);
        if (crMatch) {
            tempInitialCR = crMatch[1]; // e.g. "30"
        }
      }

      return {
        ...row,
        request_credit_term: row.request_credit_term !== null && row.request_credit_term !== undefined ? row.request_credit_term : txData.creditTerm,
        billing_terms_code: billingTermCode,
        // Override the terms with the temporary initial CR if found, otherwise fallback to transaction data
        term_gs: tempInitialCR !== null ? tempInitialCR : (row.term_gs !== null && row.term_gs !== undefined ? row.term_gs : txData.termGS),
        term_ae: tempInitialCR !== null ? tempInitialCR : (row.term_ae !== null && row.term_ae !== undefined ? row.term_ae : txData.termAE),
        term_yc: tempInitialCR !== null ? tempInitialCR : (row.term_yc !== null && row.term_yc !== undefined ? row.term_yc : txData.termYC),
        snapshot_data: undefined // do not send massive snapshot data over the wire for the list view
      };
    });

    res.status(200).json({
      data: processedRows,
    });
  } catch (error) {
    logger.error("Error fetching credit requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.cancelCreditRequest = async (req, res) => {
  const id = decodeURIComponent(req.params.id);

  try {
    // Check if request exists
    let requestSql;
    if (db.dbType === "mssql") {
      requestSql = "SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?";
    } else {
      requestSql = "SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1";
    }
    const { rows } = await db.query(requestSql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Credit request not found" });
    }

    // Allow cancel for any active status
    const activeStatuses = [
      "Draft",
      "Opened",
      "RegionalSubmitted",
      "SalesSubmitted",
      "FinanceReviewed",
      "Reviewed",
      "Submitted",
    ];
    const request = rows[0];

    if (!activeStatuses.includes(request.status)) {
      return res
        .status(400)
        .json({ error: "Cannot cancel request in current status" });
    }

    const statusEventAt = new Date().toISOString();
    const username = req.user ? req.user.empname || req.user.username : "System";
    let lastCommentSql;
    if (db.dbType === "mssql") {
      lastCommentSql = "SELECT TOP 1 actor_role FROM RequestComments WHERE tx_id = ? ORDER BY created_at DESC";
    } else {
      lastCommentSql = "SELECT actor_role FROM RequestComments WHERE tx_id = ? ORDER BY created_at DESC LIMIT 1";
    }
    const { rows: lastCommentRows } = await db.query(lastCommentSql, [id]);
    const actorRole = (lastCommentRows && lastCommentRows[0] && lastCommentRows[0].actor_role) || request.updated_by || "System";

    await db.runAsync(
      "UPDATE CreditRequests SET status = ?, updated_at = ? WHERE tx_id = ?",
      ["Canceled", statusEventAt, id],
    );

    // Keep the timeline and list in sync by writing a cancellation audit comment
    await db.runAsync(
      "INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, actorRole, "ยกเลิกคำขอ", username, statusEventAt],
    );

    res.status(200).json({ message: "Credit request canceled successfully" });
  } catch (error) {
    logger.error("Error canceling credit request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getComments = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id
  try {
    let sql = `SELECT * FROM RequestComments WHERE tx_id = ? ORDER BY created_at ASC`;
    const { rows } = await db.query(sql, [id]);
    res.status(200).json({ data: rows });
  } catch (error) {
    logger.error("Error fetching comments:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.reviseRequest = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id
  logger.info(`Revise Request called for tx_id: ${id}`);
  try {
    // 1. Fetch the existing rejected request
    let requestSql;
    if (db.dbType === "mssql") {
      requestSql = "SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?";
    } else {
      requestSql = "SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1";
    }
    const { rows } = await db.query(requestSql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Credit request not found" });
    }

    const oldRequest = rows[0];

    // 2. Verify it's rejected
    if (oldRequest.status !== "Rejected") {
      return res
        .status(400)
        .json({ error: "Only rejected requests can be revised." });
    }

    // 3. Generate new revision ID
    let baseId = id;
    let revisionNumber = 1;

    const match = id.match(/(.*?)-R(\d+)$/);
    if (match) {
      baseId = match[1];
      revisionNumber = parseInt(match[2], 10) + 1;
    }

    const newTxId = `${baseId}-R${revisionNumber}`;
    logger.info(`Creating revision: ${newTxId} from ${id}`);

    // Check if this revision already exists (safety check)
    let checkRevisionSql;
    if (db.dbType === "mssql") {
      checkRevisionSql = "SELECT TOP 1 * FROM CreditRequests WHERE tx_id = ?";
    } else {
      checkRevisionSql = "SELECT * FROM CreditRequests WHERE tx_id = ? LIMIT 1";
    }
    const { rows: existingRevision } = await db.query(checkRevisionSql, [
      newTxId,
    ]);

    if (existingRevision && existingRevision.length > 0) {
      return res
        .status(400)
        .json({ error: `Revision ${newTxId} already exists.` });
    }

    // 4. Duplicate the request record (exclude approval flags, comments, set status to Draft)
    let snapshotDataObj = {};
    if (oldRequest.snapshot_data) {
      try {
        snapshotDataObj =
          typeof oldRequest.snapshot_data === "string"
            ? JSON.parse(oldRequest.snapshot_data)
            : oldRequest.snapshot_data;

        // Clear out approval comments from snapshot data if they exist
        if (snapshotDataObj.review_comment) snapshotDataObj.review_comment = "";
        if (snapshotDataObj.regional_review_comment)
          snapshotDataObj.regional_review_comment = "";
        if (snapshotDataObj.sales_review_comment)
          snapshotDataObj.sales_review_comment = "";
      } catch (e) {
        logger.error("Error parsing old snapshot data for revision", e);
      }
    }

    // Convert back to string for db storage
    const newSnapshotData = JSON.stringify(snapshotDataObj);

    let insertSql;
    let insertParams;

    if (db.dbType === "mssql") {
      insertSql = `
                INSERT INTO CreditRequests (
                    customer_no, customer_name, tx_id, status, request_amount,
                    request_reason, request_credit_term, term_gs, term_ae, term_yc,
                    request_type, snapshot_data, updated_at, created_by, updated_by
                )
                OUTPUT INSERTED.id
                VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
      insertParams = [
        oldRequest.customer_no,
        oldRequest.customer_name,
        newTxId,
        oldRequest.request_amount,
        oldRequest.request_reason,
        oldRequest.request_credit_term,
        oldRequest.term_gs,
        oldRequest.term_ae,
        oldRequest.term_yc,
        oldRequest.request_type,
        newSnapshotData,
        new Date().toISOString(),
        req.body.uploaded_by || req.user?.username || "Unknown",
        req.body.uploaded_by || req.user?.username || "Unknown",
      ];
    } else {
      insertSql = `
                INSERT INTO CreditRequests (
                    customer_no, customer_name, tx_id, status, request_amount,
                    request_reason, request_credit_term, term_gs, term_ae, term_yc,
                    request_type, snapshot_data, updated_at, created_by, updated_by
                )
                VALUES (?, ?, ?, 'Draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
      insertParams = [
        oldRequest.customer_no,
        oldRequest.customer_name,
        newTxId,
        oldRequest.request_amount,
        oldRequest.request_reason,
        oldRequest.request_credit_term,
        oldRequest.term_gs,
        oldRequest.term_ae,
        oldRequest.term_yc,
        oldRequest.request_type,
        newSnapshotData,
        new Date().toISOString(),
        req.body.uploaded_by || req.user?.username || "Unknown",
        req.body.uploaded_by || req.user?.username || "Unknown",
      ];
    }

    const insertResult = await db.query(insertSql, insertParams);

    // 5. Copy physical files
    const cleanOldId = id.replace(/\//g, "_");
    const cleanNewId = newTxId.replace(/\//g, "_");
    const oldDirPath = path.join(
      UPLOAD_BASE,
      oldRequest.customer_no,
      cleanOldId,
    );
    const newDirPath = path.join(
      UPLOAD_BASE,
      oldRequest.customer_no,
      cleanNewId,
    );

    if (await fs.pathExists(oldDirPath)) {
      await fs.copy(oldDirPath, newDirPath);
      logger.info(`Copied files from ${oldDirPath} to ${newDirPath}`);

      // After copying physical files, copy the DB attachment records for the new revision
      // with updated relative paths.
      const oldAttSql =
        "SELECT * FROM CreditRequestAttachments WHERE tx_id = ?";
      const { rows: oldAttachments } = await db.query(oldAttSql, [id]);

      if (oldAttachments && oldAttachments.length > 0) {
        for (const att of oldAttachments) {
          // Path format: customer_no/oldTxId/file.ext
          const oldPathSegment = `${cleanOldId}/`;
          const newPathSegment = `${cleanNewId}/`;
          const newRelativePath = att.file_path.replace(
            oldPathSegment,
            newPathSegment,
          );

          await db.runAsync(
            "INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
            [
              newTxId,
              att.file_type,
              newRelativePath,
              att.original_name,
              att.uploaded_by || null,
              att.uploaded_by || null,
            ],
          );
        }
      }
    } else {
      logger.info(`No files found to copy at ${oldDirPath}`);
    }

    res.status(200).json({
      message: "Request revised successfully",
      newTxId: newTxId,
    });
  } catch (error) {
    logger.error("Error revising credit request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.uploadAdditionalDocument = async (req, res) => {
  const txId = decodeURIComponent(req.params.id);
  const { documentType, documentDescription } = req.body;

  logger.info(`Uploading additional document for TX ID: ${txId}`, {
    documentType,
    documentDescription,
  });

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No file provided." });
  }

  const file = req.files[0];

  // Resolve user identity
  let uploadedBy = null;
  if (req.user) {
    uploadedBy = req.user.empname || req.user.username;
  } else if (req.body.actor_role) {
    uploadedBy = req.body.actor_role;
  }

  try {
    // Fetch the request to verify it exists and get customer info for folder structure
    let reqSql = `SELECT customer_no, created_at FROM CreditRequests WHERE tx_id = ?`;
    const { rows: reqResult } = await db.query(reqSql, [txId]);

    if (!reqResult || reqResult.length === 0) {
      return res.status(404).json({ error: "Credit request not found." });
    }

    const requestData = reqResult[0];
    const customerNo = requestData.customer_no;

    // Create the physical folder structure matching existing uploads
    const creationDate = new Date(requestData.created_at);
    const yyyymmdd = `${creationDate.getFullYear()}${String(creationDate.getMonth() + 1).padStart(2, "0")}${String(creationDate.getDate()).padStart(2, "0")}`;

    const customerDir = path.join(defaultUploadPath, customerNo, yyyymmdd);
    if (!(await fs.pathExists(customerDir))) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}_${String(now.getMilliseconds()).padStart(3, "0")}`;

    const ext = path.extname(file.originalname).toLowerCase();

    // Allowed extensions map (similar to the frontend restriction)
    const allowedExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".xlsx",
      ".xls",
    ];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({ error: "Invalid file type." });
    }

    const safeOriginalName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9ก-๙]/g, "_");
    const physicalFileName = `${customerNo}_${safeOriginalName}_${dateStr}${ext}`;
    const newPhysicalPath = path.join(customerDir, physicalFileName);

    // Move the file from temp storage to final destination
    fs.renameSync(file.path, newPhysicalPath);

    // Prepare the logical path to store in DB (relative to base dir)
    const relativeFilePath = path
      .join(customerNo, yyyymmdd, physicalFileName)
      .replace(/\\/g, "/");

    // Define file type as additional document, include document type if available
    let fileType = "additional_doc";
    if (documentType) {
      fileType = `additional_doc:${documentType}`;
    }

    // Use the user's provided document name (passed via documentDescription) if available,
    // otherwise fall back to the original physical file name.
    let displayName = file.originalname;
    if (documentDescription && documentDescription.trim() !== "") {
      let cleanDesc = documentDescription.trim();
      // Ensure the extension is preserved so frontend preview logic works
      if (!cleanDesc.toLowerCase().endsWith(ext.toLowerCase())) {
        cleanDesc += ext;
      }
      displayName = cleanDesc;
    }

    const insertSql =
      "INSERT INTO CreditRequestAttachments (tx_id, file_type, file_path, original_name, uploaded_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)";
    const insertParams = [
      txId,
      fileType,
      relativeFilePath,
      displayName,
      uploadedBy,
      uploadedBy,
    ];

    const result = await db.runAsync(insertSql, insertParams);

    let newId = result.insertId;
    if (db.dbType === "mssql") {
      // Retrieve identity from last insert
      const { rows: identQuery } = await db.query(
        "SELECT @@IDENTITY AS insertId",
      );
      if (identQuery && identQuery.length > 0) {
        newId = identQuery[0].insertId;
      }
    }

    // Also log the description if provided
    if (documentDescription) {
      let commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
      if (db.dbType === "mssql") {
        commentSql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, GETUTCDATE())`;
      }
      await db.runAsync(commentSql, [
        txId,
        "System",
        `Additional Document Uploaded (${file.originalname}): ${documentDescription}`,
        uploadedBy,
      ]);
    }

    logger.info(
      `Successfully uploaded additional document for ${txId}. File ID: ${newId}`,
    );

    res.status(200).json({
      message: "Additional document uploaded successfully",
      file: {
        id: newId,
        file_type: fileType,
        original_name: file.originalname,
        uploaded_by: uploadedBy,
      },
    });
  } catch (error) {
    logger.error(
      `Error uploading additional document for TX ID: ${txId}`,
      error,
    );
    res
      .status(500)
      .json({ error: "Internal server error while uploading document." });
  }
};

exports.addComment = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id
  const { comment, actor_role } = req.body;

  // Resolve user identity
  const username = req.user ? req.user.empname || req.user.username : "System";

  try {
    let sql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
    let params = [id, actor_role || "System", comment, username];

    if (db.dbType === "mssql") {
      sql = `INSERT INTO RequestComments (tx_id, actor_role, comment_text, username, created_at) VALUES (?, ?, ?, ?, GETUTCDATE())`;
    }

    await db.query(sql, params);

    logger.info(`Added system comment to ${id}: ${comment}`);

    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    logger.error("Error adding comment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.saveDraftComment = async (req, res) => {
  const id = decodeURIComponent(req.params.id); // tx_id
  const { draft_comment } = req.body;

  try {
    // 1. Fetch current snapshot
    let selectSql = db.dbType === 'mssql'
      ? `SELECT TOP 1 snapshot_data FROM CreditRequests WHERE tx_id = ?`
      : `SELECT snapshot_data FROM CreditRequests WHERE tx_id = ? LIMIT 1`;

    const { rows } = await db.query(selectSql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    let snapshotData = rows[0].snapshot_data;
    if (typeof snapshotData === 'string') {
        try {
            snapshotData = JSON.parse(snapshotData);
        } catch (e) {
            logger.error("Error parsing snapshot for draft comment", e);
            snapshotData = {};
        }
    }

    // 2. Safely inject draftComment
    if (!snapshotData.transaction_data) {
        snapshotData.transaction_data = {};
    }
    snapshotData.transaction_data.draftComment = draft_comment;

    // 3. Update database WITHOUT modifying updated_at or status to prevent conflicts
    let updateSql = `UPDATE CreditRequests SET snapshot_data = ? WHERE tx_id = ?`;
    await db.query(updateSql, [JSON.stringify(snapshotData), id]);

    res.status(200).json({ message: 'Draft comment saved' });
  } catch (error) {
    logger.error('Error saving draft comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
