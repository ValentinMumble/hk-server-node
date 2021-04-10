module.exports = {
  apps: [
    {
      name: 'hk-server-node',
      script: 'build/index.js',
      combine_logs: true,
      log_type: 'json',
    },
  ],
};
