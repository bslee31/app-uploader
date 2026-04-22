# App Uploader

桌面應用程式，上傳 IPA 到 TestFlight 和 AAB 到 Google Play，並可查詢版本資訊。

## 功能

- 上傳 IPA 到 Apple App Store Connect (TestFlight)
- 上傳 AAB 到 Google Play Console 內部測試軌道（自動組出 `{versionCode} ({versionName})` 格式的 release name，與後台上傳一致；選擇 AAB 後即時顯示預覽）
- 上傳 dSYM 到 Firebase Crashlytics
- 版本查詢：查詢 Apple builds 和 Google Play bundles
- 上傳進度條：Google Play 顯示步驟百分比，Apple / Firebase 顯示動畫進度
- 專案管理：不同的 App 各自設定認證資訊
- 專案拖曳排序
- 全域設定：upload-symbols 路徑等共用設定

## 技術棧

- Electron
- React
- TypeScript
- Google Play Developer API (`googleapis`)
- Apple App Store Connect API（JWT 認證，用於版本查詢）
- Apple `xcrun altool`（API Key 認證，用於上傳）
- Firebase Crashlytics `upload-symbols`（用於 dSYM 上傳）

## 環境需求

- macOS（Apple 上傳僅支援 macOS）
- Node.js >= 20
- Xcode Command Line Tools（用於 `xcrun altool`）
- Firebase iOS SDK 的 `upload-symbols`（用於 dSYM 上傳，見下方說明）

## 安裝

```bash
npm install
```

## 開發

```bash
npm start
```

## 打包

```bash
# 產出未封裝的應用程式
npm run pack

# 產出 .dmg 安裝檔
npm run dist
```

## 設定說明

### 全域設定

點擊 sidebar 標題列的 ⚙ 齒輪按鈕開啟全域設定：

- **upload-symbols 路徑**：Firebase Crashlytics dSYM 上傳需要的執行檔，所有專案共用

取得 `upload-symbols`：

```bash
# 從 GitHub 下載
curl -O https://raw.githubusercontent.com/firebase/firebase-ios-sdk/main/Crashlytics/upload-symbols
chmod +x upload-symbols
```

或從你的 iOS 專案中取得：
- CocoaPods：`Pods/FirebaseCrashlytics/upload-symbols`
- SPM：`SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/upload-symbols`

### Apple

需要從 [App Store Connect](https://appstoreconnect.apple.com) 取得 API Key：

1. 使用者與存取權限 → 整合 → App Store Connect API → Team Keys
2. 產生 API Key（權限：App Manager）
3. 記下 **API Key ID** 和 **Issuer ID**
4. 下載 `.p8` 金鑰檔案（只能下載一次）

在工具中建立專案時需填寫：
- **API Key ID**
- **Issuer ID**
- **Bundle ID**（如 `com.example.app`，用於版本查詢）
- **.p8 金鑰檔案**（選擇後會自動複製到 `~/.appstoreconnect/private_keys/`）
- **GoogleService-Info.plist**（選填，用於 dSYM 上傳到 Firebase Crashlytics）

### Google Play

需要設定 Service Account：

1. 在 [Google Cloud Console](https://console.cloud.google.com) 建立 Service Account
2. 建立金鑰 → 下載 JSON 檔案
3. 在 [Google Play Console](https://play.google.com/console) → 使用者與權限 → 邀請 Service Account 的 email
4. 授予權限：View app information (read-only)、Release apps to testing tracks

#### 發布狀態

- **草稿**：App 尚未在 Google Play Console 完成商店資訊設定時使用，上傳後需手動到 Console 發布
- **完成**：App 已正式發布過，上傳後自動發布到內部測試軌道

## 專案結構

```
src/
├── main/                    # Electron 主程序
│   ├── index.ts             # 視窗管理 + IPC handlers
│   ├── preload.ts           # Context Bridge
│   ├── project-store.ts     # 專案設定 CRUD + 排序
│   ├── settings-store.ts    # 全域設定
│   ├── google-uploader.ts   # Google Play API 上傳
│   ├── aab-parser.ts        # 解析 AAB 取得 versionCode / versionName
│   ├── apple-uploader.ts    # xcrun altool 上傳
│   ├── firebase-uploader.ts # Firebase Crashlytics dSYM 上傳
│   ├── google-query.ts      # Google Play 版本查詢
│   └── apple-query.ts       # App Store Connect 版本查詢
├── renderer/                # UI
│   ├── App.tsx              # 主介面
│   ├── components/
│   │   ├── ProjectForm.tsx    # 專案新增/編輯/刪除表單
│   │   ├── UploadPanel.tsx    # 上傳介面 + 版本查詢
│   │   └── SettingsForm.tsx   # 全域設定表單
│   └── styles.css
└── shared/
    └── types.ts             # 共用型別
```
