# Sitecore XM Cloud Helper Extension

A Chrome Extension to enhance the Sitecore XM Cloud **Workbox** experience by adding visibility into content item **paths**.

## 🚀 Why This Extension?

Sitecore XM Cloud does not currently provide a way to display the **full content item path** in the Workbox UI, which is critical for content editors and developers to understand where content items reside.

Since customizing Sitecore XM Cloud is **not recommended  **, this Chrome Extension provides a non-invasive way to **enhance the Workbox interface** directly in the browser.

Right now, the extension **adds the Item Path** below each Workbox item, but it is designed to be **extensible** and will include additional enhancements in the future.

---

## ✨ Features

- Shows the full **Item Path** of each content item in the Workbox.
- Automatically fetches item paths from the Sitecore GraphQL API.
- **Caches** item paths locally to reduce API calls and speed up loading.
- Securely stores API keys for different environments (Dev, QA, Prod) using Chrome local storage.
- AES encryption/decryption for API keys using a built-in crypto helper.

---

## 🧠 How It Works

1. **Content Script (`content-script.js`)**
   - Injected into the Sitecore Workbox page.
   - Detects and parses Workbox items.
   - Fetches paths using GraphQL API and environment-specific API keys.
   - Renders the item path below each Workbox entry.
   - Uses a caching mechanism with a configurable TTL to improve performance.

2. **Settings Page (`settings.html` + `settings.js`)**
   - Allows configuration of **Dev, QA, and Prod** environment API keys and domain URLs.
   - Encrypts API keys using AES before saving them to Chrome local storage.
   - Decrypts and displays stored keys securely.

3. **Crypto Helper (`crypto-js-min.js`)**
   - Provides AES encryption/decryption for secure API key handling.

---

## 🛠️ Setup Instructions

1. Clone or download this repository.

2. Go to `chrome://extensions/` in your browser and enable **Developer Mode**.

3. Click **Load unpacked** and select the root directory of this extension.

4. Click on the extension icon in your Chrome toolbar and open the popup.

5. In the popup:
   - Enter your **API keys** and **domain URLs** for Dev, QA, and Prod environments.
   - Click **Save Settings**.
   - The extension will now automatically inject item paths in the Sitecore Workbox view when you open it.

---

## 🔐 Security

- API keys are **encrypted locally** using AES before being stored in Chrome's local storage.
- The decryption happens only within the extension's runtime context and never leaves the user's browser.

---

## 🔄 Future Plans

- Display **Item Language**, **Version** and more in Workbox.
- Add multi selector tool to move mutiple Items to next workflow state.

---

## 📣 Contributions

Pull requests and feature suggestions are welcome! If you’ve got a use case or idea to improve the Workbox UX further, feel free to open an issue.

---

