const { defineConfig } = require('@playwright/test');
require('dotenv').config();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  reporter: [
    ['html'],
    ['list']
  ],
  use: {
    baseURL: 'https://live.fastn.ai',
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    },
    trace: 'on-first-retry',
  },
});
