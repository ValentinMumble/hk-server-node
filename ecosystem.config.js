module.exports = {
  apps: [
    {
      name: 'hk-server-node',
      script: 'build/index.js',
      combine_logs: true,
      log_file: '/home/pi/.pm2/logs/hk-server-node.log',
      log_type: 'json',
    },
  ],
};
