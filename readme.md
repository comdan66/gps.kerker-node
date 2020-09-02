於 server/sys/ 內執行以下


開發
npx pm2 start pm2.config.js --only dev

正式
npx pm2 start pm2.config.js --only production

列出
npx pm2 list

停止所有
npx pm2 stop all

刪除所有
npx pm2 delete all