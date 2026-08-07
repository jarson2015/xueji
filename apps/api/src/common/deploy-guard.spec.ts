/**
 * 部署样例护栏：TRUST_PROXY / Nginx limit_req 不从仓库样例消失。
 * run via ts-node (see package.json test:unit)
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

const apiRoot = path.join(__dirname, '..', '..');
const repoRoot = path.join(apiRoot, '..', '..');

function readRepo(...parts: string[]) {
  return fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');
}

function readApi(...parts: string[]) {
  return fs.readFileSync(path.join(apiRoot, ...parts), 'utf8');
}

console.log('deploy-guard unit tests');

test('main.ts 仅在 TRUST_PROXY 开启时 set trust proxy', () => {
  const src = readApi('src', 'main.ts');
  assert.ok(src.includes('TRUST_PROXY'));
  assert.ok(src.includes("app.set('trust proxy', 1)"));
  assert.ok(src.includes("TRUST_PROXY === '1'"));
});

test('clientIp 不直接读取 X-Forwarded-For', () => {
  const src = readApi('src', 'common', 'client-ip.ts');
  // 注释可提及该头；实现不得从 headers 取值
  assert.ok(!/headers\s*[.\[]/.test(src));
  assert.ok(!/x-forwarded-for['"`]\s*[,)]/i.test(src));
  assert.ok(/TRUST_PROXY|trust proxy/i.test(src));
});

test('deploy nginx 样例对 login / login-code 有 limit_req', () => {
  const conf = readRepo('deploy', 'fnos-native', 'nginx.xueji.conf');
  assert.ok(conf.includes('limit_req_zone'));
  assert.ok(conf.includes('limit_req zone=xueji_auth'));
  assert.ok(conf.includes('/api/auth/login-code'));
  assert.ok(conf.includes('/api/auth/login'));
  assert.ok(conf.includes('X-Forwarded-For'));
  assert.ok(conf.includes('TRUST_PROXY'));
});

test('deploy .env.example 含 TRUST_PROXY=1', () => {
  const env = readRepo('deploy', 'fnos-native', '.env.example');
  assert.ok(/TRUST_PROXY\s*=\s*1/.test(env));
  assert.ok(env.includes('JWT_SECRET'));
});

test('apps/api .env.example 注释提示 TRUST_PROXY', () => {
  const env = readApi('.env.example');
  assert.ok(env.includes('TRUST_PROXY'));
  assert.ok(env.includes('JWT_SECRET'));
});

console.log('deploy-guard unit tests passed');
