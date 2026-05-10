// scripts/build-stamp.js
// 生成 .next/BUILD_STAMP：当前 commit hash
// 由 npm run build 的 postbuild 自动调用

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const buildStampPath = path.join(projectRoot, '.next', 'BUILD_STAMP');

try {
  const commitHash = execSync('git rev-parse HEAD', {
    cwd: projectRoot,
    encoding: 'utf-8',
  }).trim();

  // 确保 .next 目录存在
  const nextDir = path.dirname(buildStampPath);
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }

  fs.writeFileSync(buildStampPath, commitHash + '\n');
  console.log(`[BUILD_STAMP] ✅ ${commitHash}`);
  process.exit(0);
} catch (err) {
  console.error('[BUILD_STAMP] ❌ Failed:', err.message);
  process.exit(1);
}
