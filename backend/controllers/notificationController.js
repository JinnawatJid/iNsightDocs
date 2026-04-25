const db = require("../db");
const logger = require("../utils/logger");

exports.getNotifications = async (req, res) => {
  try {
    const username = req.user.username;
    const roles = req.user.roles ? req.user.roles.map(r => r.role) : [];

    let sql = `SELECT * FROM Notifications WHERE (target_username = ?)`;
    const params = [username];

    if (roles.length > 0) {
      const placeholders = roles.map(() => "?").join(",");
      sql += ` OR (target_role IN (${placeholders}))`;
      params.push(...roles);
    }

    sql += ` ORDER BY created_at DESC LIMIT 50`;

    const { rows } = await db.query(sql, params);

    // Process rows to determine if they are read by this specific user
    const processedRows = (rows || []).map(row => {
        const readByArray = row.read_by ? row.read_by.split(',') : [];
        const isReadByUser = row.is_read || readByArray.includes(username);
        return {
            ...row,
            is_read: isReadByUser ? 1 : 0
        };
    });

    res.status(200).json({ data: processedRows });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const username = req.user.username;
  try {
    // We append the username to the read_by list
    const getSql = `SELECT * FROM Notifications WHERE id = ?`;
    const { rows } = await db.query(getSql, [id]);

    if (rows && rows.length > 0) {
        const notification = rows[0];
        let readBy = notification.read_by || '';
        const readByArray = readBy ? readBy.split(',') : [];

        if (!readByArray.includes(username)) {
            readByArray.push(username);
            readBy = readByArray.join(',');

            const updateSql = `UPDATE Notifications SET read_by = ? WHERE id = ?`;
            await db.runAsync(updateSql, [readBy, id]);
        }
    }

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const username = req.user.username;
    const roles = req.user.roles ? req.user.roles.map(r => r.role) : [];

    let sql = `SELECT * FROM Notifications WHERE (target_username = ?)`;
    const params = [username];

    if (roles.length > 0) {
      const placeholders = roles.map(() => "?").join(",");
      sql += ` OR (target_role IN (${placeholders}))`;
      params.push(...roles);
    }

    const { rows } = await db.query(sql, params);

    for (const notification of (rows || [])) {
        let readBy = notification.read_by || '';
        const readByArray = readBy ? readBy.split(',') : [];
        if (!readByArray.includes(username)) {
            readByArray.push(username);
            const updateSql = `UPDATE Notifications SET read_by = ? WHERE id = ?`;
            await db.runAsync(updateSql, [readByArray.join(','), notification.id]);
        }
    }

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};