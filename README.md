# 🎯 Sitecore XM Cloud Helper Extension

A powerful Chrome Extension that enhances the Sitecore XM Cloud experience by adding essential productivity features for content editors and developers.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=flat-square&logo=googlechrome)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![Sitecore](https://img.shields.io/badge/Sitecore-XM%20Cloud-red?style=flat-square&logo=sitecore)

## 🚀 Why This Extension?

Sitecore XM Cloud lacks several critical productivity features that content editors and developers need daily:

- **No Item Path Visibility**: Understanding content structure and location
- **Limited Workflow Management**: Bulk workflow operations are cumbersome  

Since customizing Sitecore XM Cloud is **not recommended**, this Chrome Extension provides a **non-invasive** way to enhance the interface directly in your browser.

---

## ✨ Features

### 📍 **Item Path Display**
- Shows the full **Item Path** of each content item in the Workbox
- Automatically fetches paths from Sitecore GraphQL API
- **Smart caching** reduces API calls and speeds up loading
- Works across all Workbox views

### 🔄 **Advanced Workflow Management** ⭐ *NEW*
- **Dynamic Checkbox Addition**: Automatically adds checkboxes to page items in the content tree
- **Bulk Workflow Updates**: Select multiple items and advance them to the next workflow state
- **Smart State Detection**: Automatically determines the next appropriate workflow state
- **Real-time Notifications**: Visual feedback with detailed update results
- **Skip Logic**: Automatically skips items that are already approved or have no workflow

### 🔐 **Multi-Environment Support**
- Securely stores API keys for **Dev, QA, and Prod** environments
- **AES encryption** for API keys using built-in crypto helper
- **Auto-detection** of current environment based on domain
- Chrome local storage integration

### 🎨 **User Experience**
- **Non-intrusive design** that integrates seamlessly with Sitecore UI
- **Real-time updates** with loading indicators
- **Error handling** with user-friendly messages
- **Responsive notifications** with auto-dismiss

---

## 🧠 How It Works

### 🎯 **Modular Architecture** (Manifest V3 Compatible)
```
├── Config Module      → Constants & workflow states
├── Utils Module       → Cache, DOM, encryption utilities  
├── API Module         → GraphQL operations & authentication
├── Workflow Module    → State management & bulk updates
├── Checkbox Module    → Dynamic UI enhancements
├── Notification Module → User feedback system
└── Workbox Module     → Core item processing
```

### 📋 **Core Functionality**

**Item Path Enhancement:**
- Detects Workbox items automatically
- Fetches item paths via GraphQL API
- Renders paths below each Workbox entry
- Implements intelligent caching (24-hour TTL)

**Workflow Management:**
- Scans content tree for page-based items
- Adds interactive checkboxes to qualifying nodes
- Queries current workflow states via GraphQL
- Performs bulk workflow state updates
- Provides detailed success/failure reporting

---

## 🛠️ Setup Instructions

### 1. **Installation**
1. Clone or download this repository
2. Go to `chrome://extensions/` in your browser
3. Enable **Developer Mode** (toggle in top-right)
4. Click **"Load unpacked"** and select the extension's root directory

### 2. **Configuration**
1. Click the extension icon in your Chrome toolbar
2. Configure your environments:

   **Development Environment:**
   - API Key: `your-dev-api-key`
   - Domain: `dev.yoursite.com`

   **QA Environment:**
   - API Key: `your-qa-api-key`  
   - Domain: `qa.yoursite.com`

   **Production Environment:**
   - API Key: `your-prod-api-key`
   - Domain: `www.yoursite.com`

3. Click **"Save Settings"**

### 3. **Usage**
1. Navigate to your Sitecore XM Cloud instance
2. **Workbox**: Item paths will appear automatically below each item
3. **Content Tree Workflow Management**:
   - Click **"Add Dynamic Checkboxes"** to add checkboxes to page items
   - Select items you want to update
   - Click **"Update Workflow State"** to advance selected items

---

## 🎮 Feature Walkthrough

### 📍 **Item Path Display**
- **Automatic**: Works immediately after configuration
- **Visual**: Paths appear below each Workbox item
- **Smart**: Cached for performance, refreshed as needed

### ☑️ **Checkbox Management** ⭐ *NEW*
1. **Add Checkboxes**: Click the button in settings popup
2. **Auto-Detection**: Only adds checkboxes to page-based content items
3. **Visual Integration**: Checkboxes blend seamlessly with Sitecore UI

### 🔄 **Workflow Updates** ⭐ *NEW*
1. **Select Items**: Check the boxes for items you want to update
2. **Bulk Update**: Click "Update Workflow State" button
3. **Smart Processing**: 
   - Queries current workflow states
   - Determines next appropriate state
   - Skips items already approved or without workflow
4. **Real-time Feedback**: Detailed notification with results

### 📊 **Supported Workflow States**
- **Draft** → **Awaiting Approval**
- **Awaiting Approval** → **Content Review**  
- **Content Review** → **Approved**
- **Auto-skip**: Already approved items

---

## 🔐 Security Features

- **🔒 AES Encryption**: API keys encrypted before local storage
- **🏠 Local Only**: All data stays in your browser
- **🔑 Secure Context**: Decryption only within extension runtime
- **🌐 Domain Isolation**: Environment detection prevents cross-environment issues

---

## 🎯 Advanced Features

### **Smart Caching System**
- 24-hour TTL for item paths
- Automatic cache invalidation
- Performance optimization

### **Error Handling**
- Graceful API failure handling
- User-friendly error messages
- Automatic retry mechanisms

### **Multi-Environment Detection**
- Automatic environment detection based on domain
- Fallback API key resolution
- Cross-environment compatibility

---

## 🔄 Roadmap & Future Plans

### **Phase 1** ✅ (Current)
- ✅ Item path display in Workbox
- ✅ Multi-environment API key management
- ✅ Dynamic checkbox addition
- ✅ Bulk workflow state updates

### **Phase 2** 🚧 (In Progress)
- 🔄 Item language and version display
- 🔄 Advanced workflow state filtering
- 🔄 Bulk item operations (move, copy, delete)

### **Phase 3** 📋 (Planned)
- 📋 Custom workflow state definitions
- 📋 Workflow history tracking
- 📋 Advanced search and filtering
- 📋 Export/import functionality

---

## 🛠️ Technical Architecture

### **Manifest V3 Compliance**
- Modern Chrome extension architecture
- Service worker background script
- Secure content script injection
- Namespace-based modules (no ES6 import issues)

### **Performance**
- **⚡ Fast Loading**: Optimized content script injection
- **💾 Smart Caching**: Reduces API calls by 90%
- **🔄 Async Operations**: Non-blocking UI updates
- **📱 Responsive**: Works on all screen sizes

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### **🐛 Bug Reports**
- Use GitHub Issues with detailed reproduction steps
- Include browser version and Sitecore version

### **💡 Feature Requests**
- Describe the use case and expected behavior
- Consider implementation complexity

### **🔧 Pull Requests**
- Follow existing code style
- Test across different Sitecore environments
- Update documentation

---

## 📞 Support & Community

- **📖 Documentation**: This README and inline code comments
- **🐛 Issues**: Report bugs and request features
- **💬 Discussions**: Share ideas and get help
- **📧 Contact**: Reach out for enterprise support

---

**Made with ❤️ for the Sitecore community**

*Enhance your Sitecore XM Cloud experience without touching the platform itself!*
