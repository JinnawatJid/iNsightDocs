const normalizeBranchCode = (rawBranchCode) => {
  const code = String(rawBranchCode || "").trim().toUpperCase();
  const normalized = code.replace(/^\d+/, "");
  return normalized || "XX";
};

const getBranchCodeFromUser = (user) => {
  if (!user || typeof user !== "object") return "";

  if (Array.isArray(user.branches) && user.branches.length > 0) {
    return user.branches[0] || "";
  }

  return (
    user.branchCode ||
    user.branch_code ||
    user.branch ||
    user.office ||
    user.officeCode ||
    ""
  );
};


const getBranchCodesFromUser = (user) => {
  if (!user || typeof user !== "object") return [];

  if (Array.isArray(user.branches) && user.branches.length > 0) {
    return [...user.branches];
  }

  const singleBranch = user.branchCode ||
    user.branch_code ||
    user.branch ||
    user.office ||
    user.officeCode;

  return singleBranch ? [singleBranch] : [];
};

module.exports = {
  getBranchCodesFromUser,
  normalizeBranchCode,
  getBranchCodeFromUser,
};
