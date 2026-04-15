const normalizeBranchCode = (rawBranchCode) => {
  const code = String(rawBranchCode || "").trim().toUpperCase();
  const normalized = code.replace(/^\d+/, "");
  return normalized || "XX";
};

module.exports = {
  normalizeBranchCode,
};
