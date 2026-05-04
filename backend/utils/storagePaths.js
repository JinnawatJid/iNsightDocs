const fs = require('fs-extra');
const path = require('path');

function resolveProjectRoot() {
  let projectRoot = path.resolve(__dirname, '../../../../');

  const hasCustomers = fs.existsSync(path.join(projectRoot, 'customers'));
  const hasUploads = fs.existsSync(path.join(projectRoot, 'uploads'));

  if (!hasCustomers && !hasUploads) {
    projectRoot = path.resolve(__dirname, '../../');
  }

  return projectRoot;
}

function resolveBaseDir(envKeys, fallbackDirName) {
  for (const envKey of envKeys) {
    const configuredPath = process.env[envKey];
    if (configuredPath) {
      return path.resolve(process.cwd(), configuredPath);
    }
  }

  return path.join(resolveProjectRoot(), fallbackDirName);
}

function getUploadBaseDir() {
  return resolveBaseDir(['UPLOAD_PATH'], 'uploads');
}

function getCustomerBaseDir() {
  return resolveBaseDir(['CUSTOMERS_PATH', 'CUSTOMER_PATH'], 'customers');
}

module.exports = {
  resolveProjectRoot,
  getUploadBaseDir,
  getCustomerBaseDir,
};