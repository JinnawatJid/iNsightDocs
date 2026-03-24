const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      if (file !== 'node_modules' && file !== 'logs' && file !== 'downloads' && file !== 'dist') {
        filelist = walkSync(path.join(dir, file), filelist);
      }
    }
    else {
      if (file.endsWith('.js') && file !== 'logger.js' && file !== 'server.js') {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const replaceLogs = () => {
  const filesToProcess = walkSync(path.join(__dirname, '../backend'));

  filesToProcess.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    if (content.includes('console.log') || content.includes('console.error')) {
      // Ensure logger is imported at the top if not already
      if (!content.includes("require('../utils/logger')") && !content.includes("require('./utils/logger')") && !content.includes("require('../../utils/logger')")) {
         // Determine relative path to logger
         const relativePath = path.relative(path.dirname(file), path.join(__dirname, '../backend/utils/logger.js'));
         // Convert windows backslashes to forward slashes for require
         const requirePath = relativePath.split(path.sep).join('/');
         content = `const logger = require('./${requirePath}');\n` + content;
         modified = true;
      }

      // Replace console.log with logger.info
      if (content.includes('console.log')) {
        content = content.replace(/console\.log/g, 'logger.info');
        modified = true;
      }

      // Replace console.error with logger.error
      if (content.includes('console.error')) {
        content = content.replace(/console\.error/g, 'logger.error');
        modified = true;
      }

      if (content.includes('console.warn')) {
        content = content.replace(/console\.warn/g, 'logger.warn');
        modified = true;
      }
    }

    if (modified) {
      // Fix import path edge case for files in root backend dir
      content = content.replace("require('./utils/logger.js')", "require('./utils/logger')");
      content = content.replace("require('./../utils/logger.js')", "require('../utils/logger')");
      content = content.replace("require('./../../utils/logger.js')", "require('../../utils/logger')");
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`Updated logs in: ${file}`);
    }
  });
};

replaceLogs();
