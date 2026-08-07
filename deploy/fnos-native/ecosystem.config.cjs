const path = require('path');

const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'xueji-api',
      cwd: path.join(root, 'api'),
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // 从安装根目录加载 .env（api/.env 为软链）
      max_memory_restart: '400M',
      time: true,
    },
  ],
};
