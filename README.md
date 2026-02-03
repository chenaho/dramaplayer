# 劇本殺：信仰與人生 🎭

一款專為教會社青小組設計的互動式劇本殺遊戲引擎，結合信仰反思與 AI 輔助討論功能。

![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.2-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)

## ✨ 功能特色

- 📖 **多劇本支援**：透過 JSON 格式定義劇本，輕鬆擴充新故事
- 🎮 **沉浸式體驗**：逐字顯示對話、打字機效果、背包系統
- 🔀 **分支劇情**：根據玩家選擇與收集的線索，解鎖不同結局
- 🙏 **禱告求智慧**：整合 Gemini AI，提供屬靈引導與鼓勵
- 💬 **AI 討論題目**：遊戲結束後自動生成小組討論問題
- 📱 **響應式設計**：支援桌面與行動裝置

## 🎬 內建劇本

| 劇本 | 描述 |
|------|------|
| **未爆彈** | 除夕夜的家族祭祖衝突，在「孝道」與「信仰」之間尋找智慧的出路 |
| **紅線與十字架的拔河** | 大年初二的催婚攻防戰，面對「算命配對」與家人期待的信仰挑戰 |

## 🚀 快速開始

### 環境需求

- Node.js 18+
- npm 或 yarn

### 安裝步驟

```bash
# 1. Clone 專案
git clone <repository-url>
cd workspace_drama_player

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
# 編輯 .env 填入你的 Gemini API Key

# 4. 啟動開發伺服器
npm run dev
```

### 環境變數

```env
VITE_GEMINI_API_KEY=你的_Gemini_API_Key
```

> 💡 沒有 API Key 也可以遊玩，只是「禱告求智慧」與「生成討論題目」功能會無法使用。

## 📁 專案結構

```
workspace_drama_player/
├── public/
│   └── scripts/           # 劇本 JSON 檔案
│       ├── index.json     # 劇本索引
│       ├── bomb_crisis.json
│       └── marriage_crisis.json
├── src/
│   ├── App.jsx            # 主應用程式 (遊戲引擎)
│   ├── main.jsx           # React 入口
│   └── index.css          # Tailwind 樣式
├── reference/             # 劇本原始設計文件
└── ...
```

## 📝 新增劇本

### 1. 建立劇本 JSON

在 `public/scripts/` 目錄下新增 `your_script.json`：

```json
{
  "id": "your_script",
  "title": "劇本標題",
  "description": "劇本簡介",
  "characters": [
    { "id": "PLAYER", "name": "玩家", "role": "角色", "desc": "角色描述" }
  ],
  "items": {
    "ITEM_KEY": { "id": "item_key", "name": "物品名稱", "desc": "物品描述" }
  },
  "scenes": {
    "INTRO": {
      "id": "INTRO",
      "title": "序章",
      "text": "劇情文字，使用 \\n\\n 分段",
      "options": [
        { "text": "選項文字", "next": "NEXT_SCENE" }
      ]
    }
  }
}
```

### 2. 註冊劇本

編輯 `public/scripts/index.json`，加入新劇本：

```json
[
  { "id": "your_script", "title": "劇本標題", "description": "劇本簡介" }
]
```

### 場景類型

| 類型 | 說明 |
|------|------|
| 一般場景 | 使用 `options` 提供單一或多個選項 |
| `character_intro` | 顯示人物卡片介紹 |
| `investigation` | 調查模式，使用 `choices` 並支援 `getItem` 獲取線索 |

### 選項屬性

| 屬性 | 說明 |
|------|------|
| `text` | 選項顯示文字 |
| `next` | 跳轉到指定場景 ID |
| `action` | 轉為大寫後作為場景 ID（如 `talk_mom` → `TALK_MOM`） |
| `getItem` | 獲得物品（填入 items 中的 id） |
| `req` | 解鎖條件，需擁有指定物品（多個用逗號分隔） |
| `style` | 設為 `"primary"` 顯示強調樣式 |

## 🛠️ 開發指令

```bash
npm run dev      # 啟動開發伺服器
npm run build    # 建置生產版本
npm run preview  # 預覽生產版本
```

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

如果你有新的劇本創意，也歡迎分享到 `reference/` 目錄。

## 📄 授權

MIT License

---

**Designed for Christian Study Group Discussion • Powered by Gemini AI** ✝️
