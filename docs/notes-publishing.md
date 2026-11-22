---
title: 学习笔记发布指南
description: 领域、书籍和 Markdown 学习笔记的维护方式。
---

# 学习笔记发布指南

笔记沿用本站的 VitePress、Markdown、代码高亮和 MathJax。内容放在 `docs/notes/content/`，页面由元数据自动生成，不需要逐篇修改 Vue 页面、路由或侧栏。VitePress 的 `srcExclude` 排除 `notes/content/**`，使源文件不会被直接当作页面发布；请保留这条隔离配置，避免绕过生成器暴露草稿。

```text
docs/notes/content/
├── catalog.json
└── llm/
    ├── llms-from-scratch/
    │   └── chapter-07-instruction-finetuning.md
    └── rag-practice/
        └── index.md          # 书籍介绍，目录与进度自动追加
docs/public/notes-assets/      # 笔记图片
└── rag-practice/
templates/notes/              # 项目根目录下，不参与发布
└── rag-practice.md
```

采用“技术领域 / 书籍”组织方式，后续新书继续放在对应领域下，不另建重复的“书籍”分类。普通笔记的磁盘文件名用于整理文件；URL 由 `category`、`book` 和 `slug` 确定，修改标题或文件名不会改变链接。`index.md` 专用于书籍首页。

## 新增技术领域与书籍

编辑 `docs/notes/content/catalog.json`。`categories` 保存领域，`books` 保存书籍。比如新增以下对象（合并进对应数组，保留已有条目）：

```json
{
  "categories": [
    {
      "slug": "machine-learning",
      "title": "机器学习",
      "description": "机器学习原理与实践中的学习记录。"
    }
  ],
  "books": [
    {
      "slug": "my-learning-book",
      "category": "machine-learning",
      "title": "我的技术书籍",
      "description": "这本书的学习背景和记录范围。"
    }
  ]
}
```

slug 使用小写英文字母、数字和连字符，例如 `llm`、`llms-from-scratch`。书籍引用的领域必须已存在。登记领域或书籍后，至少有一篇非草稿笔记，或有一份非草稿书籍首页 `index.md`，才显示对应目录。不需要封面图片。

书籍封面是可选项：将真实封面放入 `docs/public/images/book-covers/`，在对应 `books` 对象中增加 `"cover": "/images/book-covers/example.jpg"` 即可。文件名使用英文字母、数字、连字符或下划线，支持 JPG、PNG、WebP、AVIF、SVG；不要添加部署前缀。未配置或加载失败时显示默认书籍图标，封面按原比例完整显示。当前两本书使用 `llms-from-scratch.png` 和 `rag-practice.png`，替换上述文件后重新构建即可显示，无需修改组件或导航。

### 在零篇笔记时初始化书籍首页

在 `docs/notes/content/<领域>/<书籍>/index.md` 中写书籍介绍，使用以下 frontmatter：

```yaml
---
title: "《大模型应用开发 RAG 实战课》学习笔记"
category: llm
book: rag-practice
published: '2026-11-22'
status: in-progress
draft: false
---
```

首页不填写 `slug`、`chapter`、`chapterTitle` 或 `order`。正文保存书籍基本信息、学习目标和学习方式，系统在末尾追加“学习进度”和“学习笔记”，无需手工维护章节链接。进度统计已发布笔记与其中 `status: completed` 的篇数，不推断原书总章节数。首页不计入笔记数量，不进入上下篇导航；`draft: true` 的首页不发布。没有首页的旧书继续使用原来的自动目录。

同一本书只建一个 `index.md`；入口为 `/notes/<category>/<book>/`。第二本、第三本书同样只需登记一次 `books` 中的 `slug`、`category`、`title`、`description`，再建立首页。只有新技术领域才需要添加 `categories` 条目。

### RAG Practice 新增笔记 {#rag-practice-新增笔记}

《大模型应用开发 RAG 实战课》的入口是“学习笔记 → 大语言模型 → 大模型应用开发 RAG 实战课”。以后新增一篇笔记：

1. 复制项目根目录的 `templates/notes/rag-practice.md` 到 `docs/notes/content/llm/rag-practice/<english-slug>.md`。模板位于 `docs/` 之外，不生成页面、不进入导航或搜索；不要把未填写的模板放进内容目录，扫描器会校验其中所有 `.md`，包括下划线文件和草稿。
2. 修改中文 `title` 和正文标题、英文 `slug`、实际 `published: 'YYYY-MM-DD'` 与 `tags`。保留 `category: llm`、`book: rag-practice`，使用 `status: in-progress`；完成时可改为 `completed`，复习时可改为 `reviewing`。这些字段沿用本站规范，不使用 `date`、中文书名 `book` 或 `status: learning`。
3. 填写学习内容，保留“我的疑问”。已知原书章节时可添加 `chapter`（正整数）与 `chapterTitle`（真实章名）；专题笔记省略这两项。文件名与 slug 使用英文 kebab-case，例如 `text-splitting`，不要使用 `index` 作为文章 slug。
4. 图片放入 `docs/public/notes-assets/rag-practice/`，例如 `01-rag-pipeline.png`。正文引用 `![RAG 流程](/notes-assets/rag-practice/01-rag-pipeline.png)`；这是命名示例，请先保存真实图片再引用。
5. 发布前把 `draft: true` 改为 `draft: false`，执行下方测试和构建命令。若正在预览，重启开发服务器以刷新动态目录。
6. **新增本书笔记无需修改 catalog、导航或路由**。书籍首页、领域页、学习笔记首页及上下篇链接会自动更新。

## 新增一篇笔记

在 `docs/notes/content/<领域>/<书籍>/` 中添加 `.md` 文件，并在第一行写入 frontmatter：

```yaml
---
title: "第 8 章：我的学习问题"
slug: chapter-08-learning-questions
category: llm
book: llms-from-scratch
chapter: 8
chapterTitle: "本章主题"
published: '2026-11-20'
updated: '2026-11-20'
status: in-progress
tags:
  - PyTorch
draft: true
---
```

随后直接写原始 Markdown 正文，通常从一个 `# 文章标题` 开始。`title` 是目录与页面元信息中的显示标题；正文可以保留原有标题。请勿把整篇正文塞进元数据。

必填字段是 `title`、`slug`、`category`、`book`、`published`。其他字段均可省略：`chapter`、`chapterTitle`、`updated`、`draft`、`tags`、`status`、`order`、`description`。日期使用加引号的 `YYYY-MM-DD`，更新日期不能早于发布日期。`chapter` 使用正整数，`draft` 使用布尔值；省略 `draft` 表示发布，省略 `updated` 时显示发布日期。`status` 可取 `in-progress`、`completed`、`reviewing`。不要添加 VitePress 的 `head`、`layout`、`sidebar` 或脚本字段；笔记元数据采用白名单，只接受这些已定义字段。

同一书籍内的笔记按章节序号排序，同一章可以有多篇不同 slug 的笔记。使用可选的 `order` 非负整数明确同章内的先后次序，默认是 0；同章同 order 时按英文 slug 排序。独立专题笔记省略 `chapter` 和 `chapterTitle`，集中显示在章节之后的“专题笔记”分组。同章笔记应保持一致的 `chapterTitle`。同一本书内 slug 必须唯一，不同书籍可以复用同一 slug。

新增普通笔记后，系统自动更新：学习笔记首页的统计与更新时间、领域页、书籍的章节目录、正文路由、上下篇导航。上下篇按同一本书的章节顺序计算；只有一篇时不显示不存在的相邻笔记。

## 图片与说明

将图片放到 `docs/public/notes-assets/`，建议再按书籍与章节建立文件夹：

```text
docs/public/notes-assets/llms-from-scratch/chapter-07/batch-padding.png
```

Markdown 使用 public 目录对应的根路径：

```markdown
![同一批次内对变长序列补齐](/notes-assets/llms-from-scratch/chapter-07/batch-padding.png)

*图：inputs 和 targets 在同一批次内具有相同的序列长度。*
```

不要在正文手动添加部署前缀 `/code-between-pages/`，VitePress 会处理该前缀。图片路径使用英文、数字、连字符或下划线；不使用 `../`、本机盘符或 `./img/...`。支持 PNG、JPEG、GIF、WebP、AVIF、SVG，以及 HTTPS 远程图片。构建会检查本地图片是否存在，并防止路径越出 public 目录。远程图片的可用性由图片所在服务决定。

## 代码、表格和数学公式

代码块标注语言，例如 `python`、`text`。语法高亮、复制按钮和代码横向滚动由 VitePress 提供。表格使用普通 Markdown 表格，长表格在窄屏内横向滚动。

行内公式使用 `$...$`，块级公式使用独立的 `$$` 行：

```text
有效 token 数记作 $N$。

$$
\mathcal{L} = -\frac{1}{N}\sum_{i=1}^{N}\log p(y_i\mid x_i)
$$
```

公式支持基础 LaTeX 与 AMS 常用命令。为了让导入笔记仅作为内容显示，不启用可插入 HTML、链接或加载额外扩展的公式命令。

二、三级标题会进入文章目录并生成锚点。请保持标题有意义且层级连续。桌面端显示侧边目录，移动端通过 VitePress 的页面目录入口展开。

## 草稿、发布与修改

1. 新稿先设置 `draft: true`。草稿不会进入生成页面、目录、搜索或上下篇导航；它也不是需要隐藏链接才能访问的已发布页面。
2. 检查正文和元数据，准备发布时改为 `draft: false`，填写实际 `published` 日期。后续编辑保留该日期，只修改 `updated`。
3. 运行 `npm run test:notes` 与 `npm run docs:build`。测试检查笔记系统行为，构建会校验全部笔记元数据。校验失败时会指出文件或字段；修复重复 slug、缺失字段、错误日期、引用不存在等问题后再发布。
4. 运行 `npm run docs:dev`，访问 `/code-between-pages/notes/` 检查目录与正文。新增、移除笔记，或修改正文、catalog、frontmatter 后，都请重启开发服务器，确保内容、动态路径和导航重新生成。
5. 检查完成后按现有 Git 流程提交并推送到 `main`。原有 GitHub Actions 会执行 `npm ci`、`npm run docs:build`，将 `docs/.vitepress/dist` 发布到 GitHub Pages。无需新 CMS、数据库或另一套部署。

Windows PowerShell 若提示禁止运行 `npm.ps1`，将命令中的 `npm` 换成 `npm.cmd` 即可，无需更改系统执行策略。

修改已发布笔记时直接编辑同一 Markdown 文件。稳定链接由 slug 确定，普通文字修订不修改 slug。改变 `category`、`book` 或 `slug` 会改变 URL；需要迁移时应单独规划旧链接兼容，不要把改 slug 当成改标题。

## 内容安全与排错

笔记只使用普通 Markdown。原始 HTML 会按文本显示，Vue 插值不会执行。危险链接协议不生成可点击链接。VitePress include、外部代码 snippet、Vue 专用代码围栏和自定义容器不允许用于学习笔记，避免在构建或页面中执行外部内容；确需说明这些语法时，请改用文字描述。

首次导入的第 7 章原文逐字保留，只增加了 frontmatter；它原本没有图片或 LaTeX 定界符。此次导入已完成一次性 SHA-256 比对，正文摘要为 `0a047b931605ae2b3a181ed249490d18b0a7fa9b0509aff19d92230521c2a460`，原文包含 48 个编号问题与 49 个代码块。这是首次导入的验证记录，不限制以后正常修订。自动测试使用独立示例检查正文保真、公式、图片和安全行为，不会锁定这篇笔记的文字或向原文添加虚构内容。

如果构建失败，先查看报错中的具体笔记文件，再检查 frontmatter 的字段名、英文 slug、日期、章节号、关联目录和图片路径。已有网站页面仍按原来的 Markdown 流程维护，笔记限制只作用于学习笔记内容。
