const db = require('../db-sqlite');
const crypto = require('crypto');

const computeChecksum = (jsonStr) => {
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
};

const createVersion = async ({ type, configJson, createdBy, comment }) => {
    const checksum = computeChecksum(configJson);

    // Compute next version_number
    const rows = (await db.query(`SELECT MAX(version_number) as maxv FROM ScorecardVersions WHERE type = ?`, [type])).rows;
    const nextVersion = (rows && rows[0] && rows[0].maxv) ? rows[0].maxv + 1 : 1;

    // Insert new version and mark it active
    await db.runAsync(`UPDATE ScorecardVersions SET is_active = 0 WHERE type = ?`, [type]);
    const res = await db.runAsync(`INSERT INTO ScorecardVersions (type, version_number, config_json, created_by, comment, checksum, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [type, nextVersion, configJson, createdBy || 'unknown', comment || '', checksum]);

    return { id: res.id, version_number: nextVersion, checksum };
};

const listVersions = async (type) => {
    const rows = (await db.query(`SELECT id, type, version_number, created_by, created_at, comment, checksum, is_active FROM ScorecardVersions WHERE type = ? ORDER BY version_number DESC`, [type])).rows;
    return rows;
};

const getVersionById = async (id) => {
    const rows = (await db.query(`SELECT * FROM ScorecardVersions WHERE id = ?`, [id])).rows;
    return rows && rows[0] ? rows[0] : null;
};

const revertToVersion = async (id, performedBy) => {
    const version = await getVersionById(id);
    if (!version) throw new Error('Version not found');

    // Mark all versions for this type as inactive
    await db.runAsync(`UPDATE ScorecardVersions SET is_active = 0 WHERE type = ?`, [version.type]);

    // Insert a new version representing the revert (copy of selected)
    const newVersionNumberRows = (await db.query(`SELECT MAX(version_number) as maxv FROM ScorecardVersions WHERE type = ?`, [version.type])).rows;
    const nextVersion = (newVersionNumberRows && newVersionNumberRows[0] && newVersionNumberRows[0].maxv) ? newVersionNumberRows[0].maxv + 1 : 1;

    const res = await db.runAsync(`INSERT INTO ScorecardVersions (type, version_number, config_json, created_by, comment, checksum, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [version.type, nextVersion, version.config_json, performedBy || 'unknown', `Revert to version ${version.version_number}`, version.checksum]);

    return { id: res.id, version_number: nextVersion };
};

module.exports = {
    createVersion,
    listVersions,
    getVersionById,
    revertToVersion
};
