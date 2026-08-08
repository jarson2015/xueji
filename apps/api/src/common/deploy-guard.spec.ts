/**
 * 部署样例护栏：TRUST_PROXY / Nginx limit_req / 生产不映射 API·DB 端口。
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

/** True if host publish `host:container` for this container port appears in ports: blocks. */
function publishesHostPort(compose: string, containerPort: string): boolean {
  // Match "3000:3000" or "${VAR:-8080}:80" style — we care about mapping *to* containerPort
  const re = new RegExp(`["'][^"']*:${containerPort}["']`);
  return re.test(compose);
}

console.log('deploy-guard unit tests');

test('main.ts 仅在 TRUST_PROXY 开启时 set trust proxy', () => {
  const src = readApi('src', 'main.ts');
  assert.ok(src.includes('TRUST_PROXY'));
  assert.ok(src.includes("app.set('trust proxy', 1)"));
  assert.ok(src.includes("TRUST_PROXY === '1'"));
  assert.ok(src.includes('NODE_ENV=production'));
  assert.ok(/console\.warn/.test(src));
});

test('clientIp 不直接读取 X-Forwarded-For', () => {
  const src = readApi('src', 'common', 'client-ip.ts');
  assert.ok(!/headers\s*[.\[]/.test(src));
  assert.ok(!/x-forwarded-for['"`]\s*[,)]/i.test(src));
  assert.ok(/TRUST_PROXY|trust proxy/i.test(src));
});

test('deploy nginx 样例对 login / login-code / register 有 limit_req', () => {
  const conf = readRepo('deploy', 'fnos-native', 'nginx.xueji.conf');
  assert.ok(conf.includes('limit_req_zone'));
  assert.ok(conf.includes('limit_req zone=xueji_auth'));
  assert.ok(conf.includes('/api/auth/login-code'));
  assert.ok(conf.includes('/api/auth/login'));
  assert.ok(conf.includes('/api/auth/register'));
  assert.ok(conf.includes('X-Forwarded-For'));
  assert.ok(conf.includes('TRUST_PROXY'));
});

test('docker nginx 样例对 auth 有 limit_req', () => {
  const conf = readRepo('deploy', 'fnos-prebuilt-docker', 'nginx.conf');
  assert.ok(conf.includes('limit_req_zone'));
  assert.ok(conf.includes('/api/auth/login-code'));
  assert.ok(conf.includes('/api/auth/register'));
  assert.ok(conf.includes('study-api:3000') || conf.includes('api:3000'));
});

test('apps/web nginx.conf 对 auth 有 limit_req', () => {
  const conf = readRepo('apps', 'web', 'nginx.conf');
  assert.ok(conf.includes('limit_req_zone'));
  assert.ok(conf.includes('/api/auth/login-code'));
  assert.ok(conf.includes('/api/auth/register'));
});

test('nginx 样例含 CSP / nosniff / DENY frame（SEC P2b）', () => {
  for (const parts of [
    ['apps', 'web', 'nginx.conf'],
    ['deploy', 'fnos-prebuilt-docker', 'nginx.conf'],
    ['deploy', 'fnos-native', 'nginx.xueji.conf'],
  ]) {
    const conf = readRepo(...parts);
    assert.ok(conf.includes('Content-Security-Policy'), parts.join('/'));
    assert.ok(conf.includes('X-Content-Type-Options'), parts.join('/'));
    assert.ok(conf.includes('X-Frame-Options'), parts.join('/'));
    assert.ok(conf.includes("frame-ancestors 'none'"), parts.join('/'));
  }
});

test('API Dockerfile drops to non-root via su-exec', () => {
  const df = readApi('Dockerfile');
  assert.ok(df.includes('su-exec'));
  assert.ok(df.includes('node:node') || df.includes('USER node'));
  const ep = readApi('docker-entrypoint.sh');
  assert.ok(ep.includes('su-exec node'));
  assert.ok(ep.includes('id -u'));
});

test('deploy .env.example 含 TRUST_PROXY=1', () => {
  const env = readRepo('deploy', 'fnos-native', '.env.example');
  assert.ok(/TRUST_PROXY\s*=\s*1/.test(env));
  assert.ok(env.includes('JWT_SECRET'));
});

test('prebuilt .env.example 含 TRUST_PROXY=1', () => {
  const env = readRepo('deploy', 'fnos-prebuilt-docker', '.env.example');
  assert.ok(/TRUST_PROXY\s*=\s*1/.test(env));
});

test('apps/api .env.example 注释提示 TRUST_PROXY', () => {
  const env = readApi('.env.example');
  assert.ok(env.includes('TRUST_PROXY'));
  assert.ok(env.includes('JWT_SECRET'));
});

test('生产 compose 不映射宿主机 API 3000 / MySQL 3306', () => {
  const root = readRepo('docker-compose.yml');
  assert.ok(!publishesHostPort(root, '3000'), 'root compose must not publish 3000');
  assert.ok(!publishesHostPort(root, '3306'), 'root compose must not publish 3306');
  assert.ok(root.includes('TRUST_PROXY'));

  const fnos = readRepo('docker-compose.fnos.yml');
  assert.ok(!publishesHostPort(fnos, '3000'), 'fnos compose must not publish 3000');
  assert.ok(fnos.includes('TRUST_PROXY'));
  assert.ok(fnos.includes('nginx.conf'));

  const prebuilt = readRepo(
    'deploy',
    'fnos-prebuilt-docker',
    'docker-compose.fnos.yml',
  );
  assert.ok(!publishesHostPort(prebuilt, '3000'));
  assert.ok(prebuilt.includes('TRUST_PROXY'));
  assert.ok(prebuilt.includes('/etc/nginx/nginx.conf'));
});

test('demo compose 才映射 3000/3306 供本地调试', () => {
  const demo = readRepo('docker-compose.demo.yml');
  assert.ok(publishesHostPort(demo, '3000'));
  assert.ok(publishesHostPort(demo, '3306'));
});

test('pack script ships nginx.conf', () => {
  const pack = readRepo('scripts', 'pack-fnos-docker.ps1');
  assert.ok(pack.includes("nginx.conf'"));
  assert.ok(!/Copy-Item.*nginx-web\.conf/.test(pack));
});

console.log('deploy-guard unit tests passed');
