# 💪 FitRecord · 训练记录

> 一款**超级便捷的健身训练记录 PWA** —— 专为力量训练者打造，**完全离线、永久免费、无需应用商店**。

<p align="center">
  <img src="https://img.shields.io/badge/PWA-离线可用-5a0fc8?style=for-the-badge&logo=pwa&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-Vanilla%20JS-f7df1e?style=for-the-badge&logo=javascript&logoColor=black"/>
  <img src="https://img.shields.io/badge/Server-Zero%20Cost-16a34a?style=for-the-badge"/>
  <img src="https://img.shields.io/badge/Platform-iOS%20%26%20Android-3b82f6?style=for-the-badge"/>
</p>

<p align="center">
  <b>🔗 在线体验：</b><a href="https://acffx.github.io/fitrecord/">https://acffx.github.io/fitrecord/</a>
</p>

---

📖 **开发全记录**：[《从想法到上线：纯前端 + AI 打造离线健身 App》](docs/DEV-STORY.md)

## 📖 背景：为什么做这个 App？

作为健身爱好者，我一直想找一个**顺手、纯粹、离线可用**的训练记录工具。市面上的健身 App 要么需要注册登录、要么充满广告和付费墙，要么记录逻辑不符合撸铁党的习惯。

于是，我决定**自己做一个原创工具**：从零设计、从零编码，只保留最核心、最顺手的训练记录交互 —— **做成一个 PWA（渐进式 Web 应用）**，让它可以像原生 App 一样安装在手机桌面，**没网也能用**。

---

## ✨ 核心功能

### 🏋️ 1. 训练计划管理
- 支持创建多个训练计划（如推/拉/腿循环），每个计划可编排动作顺序
- 首页只保留一个「+ 新建计划」入口，界面干净不冗余

### 📋 2. 动作库（内置 22 类动作）
- 每个动作配有 **AI 生成的肌肉解剖图**，展示目标肌群
- 左侧**解剖部位导航栏**（胸/背/肩/腿/核心…），右侧**器械筛选**（杠铃/哑铃/器械/自重…）
- **支持自由创建新动作**：上传图片、命名、选部位、选器械，一键入库

### ⏱️ 3. 训练进行页（专业训练交互）
- **每个动作独立设置组间休息**：倒计时器 + 可拖动调节时长
- **训练备注**：记录当天的组数、重量、次数、动作感受
- **超级组**：两个动作连做，休息时间共享
- **自由删组**：左滑组行即可「向下复制 / 标记热身组 / 删除」
- **滚轮选择器**：重量（KG/LB 可切换）和次数用 iOS 风格滚轮快速输入

### ⚙️ 4. 动作级菜单（左滑/长按）
- 替换动作 · 删除动作 · 动作排序 · 计时设置 · 记录想法 · 修改为 LB · 设为超级组 —— 全部可用

### 📴 5. 完全离线（PWA）
- **Service Worker 预缓存全部资源与图片**，首次加载后断网可用
- 安装到桌面后，从图标点开即是全屏 App 体验，无浏览器地址栏

### 📊 6. 数据统计
- 训练历史、次数/重量趋势可视化，帮你复盘每一次进步

---

## 🛠️ 技术架构

| 技术 | 用途 |
|------|------|
| **HTML5 + CSS3** | 移动端优先的 UI，430px 设计基准 |
| **Vanilla JavaScript** | 零依赖、零框架，全量逻辑手写（约 200KB） |
| **PWA / Service Worker** | 离线缓存策略：`stale-while-revalidate` + 预缓存 SHELL |
| **localStorage** | 训练数据 / 自定义动作持久化（含 base64 压缩图片） |
| **GitHub Pages** | 静态托管，零服务器成本，永久免费 |
| **AI 生图** | 22 张动作解剖图 + 首页 Hero 图全部由 AI 生成 |

### 离线缓存策略

```js
// 核心策略：stale-while-revalidate
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
```

---

## 📱 如何安装到手机

### iPhone（Safari）
1. 用 **Safari** 打开 `https://acffx.github.io/fitrecord/`
2. 点底部**分享按钮** → **「添加到主屏幕」**
3. 桌面出现 FitRecord 图标 → 打开即用 ✅

### Android（Chrome）
1. 用 **Chrome** 打开网址
2. 右上角 **⋮** → **「添加到主屏幕」/「安装应用」**
3. 桌面出现图标 → 打开即用 ✅

> 首次打开需联网（预缓存资源），之后**完全离线可用**。

---

## 🚀 本地运行 & 部署

```bash
# 1. 克隆仓库
git clone https://github.com/Acffx/fitrecord.git

# 2. 本地预览（任意静态服务器即可）
cd fitrecord
python -m http.server 8080
# 打开 http://localhost:8080

# 3. 部署到 GitHub Pages
# 仓库 Settings → Pages → Source: Deploy from a branch
# Branch: main / (root) → Save → 等待构建完成
```

---

## 🗺️ Roadmap

- [x] 训练计划与动作库
- [x] 动作级菜单（替换/排序/计时/备注/超级组/LB）
- [x] 组行左滑操作（复制/热身/删除）
- [x] 创建自定义动作
- [x] PWA 离线 + 桌面安装
- [x] iOS 刘海屏安全区域适配
- [ ] 数据导出（JSON/CSV）
- [ ] 云同步（可选，自建轻量后端）
- [ ] 更多数据可视化

---

## 📝 License

© 2026 Acffx. 本项目为**原创作品**，源码公开仅供学习参考。

**未经作者明确许可，禁止**：商业用途、二次发布/分发、去除版权标识、或将本项目代码用于商业产品。如需合作或授权，请通过 GitHub 联系作者。

---

<p align="center"><i>Built with 💙 by Acffx · Powered by AI · 为每一个撸铁的人</i></p>
