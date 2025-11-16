React + Vite + Tailwind 的簡易記帳 Dashboard，專門用來串接你的 line-budget-bot 後端 `/api/dashboard`。

## 開發步驟

```bash
npm install
npm run dev
```

預設前端跑在 `http://localhost:5173`，並透過 Vite proxy 轉發 `/api` 到 `http://localhost:3000`。

請確認：

- 後端 line-budget-bot 已在 `http://localhost:3000` 跑起來
- 可以在瀏覽器直接打 `http://localhost:3000/api/dashboard` 看到 JSON

之後打開 `http://localhost:5173` 就能看到 Dashboard 畫面。
