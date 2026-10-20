import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// 源码放在frontend根目录，uni-app默认却寻找src/。
// 必须传绝对路径；传“.”虽然能编译页面，却会漏拷贝static资源。
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')), 'bin', 'uni.js');
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  // 不使用 VAR=value 命令前缀，兼容 Windows CMD / PowerShell。
  // 构建版本永远不默认开启开发登录。
  env: { ...process.env, UNI_INPUT_DIR: root,
    VITE_ENABLE_DEV_LOGIN: process.env.VITE_ENABLE_DEV_LOGIN ?? (process.argv.includes('build') ? 'false' : 'true') },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
