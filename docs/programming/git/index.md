# 🌱 Git

记录日常开发中常用的 Git 命令及工作流程。

> 持续更新中……

---

## 完成某个模块修改后，如何提交代码至git?
### 1.查看有哪些文件被修改
输入
```bash
git status
```

输出
![alt text](./img/01.png)
输出说明：
- **On branch main**：当前所在分支。
- **Your branch is up to date with 'origin/main'.**：本地与远程仓库同步。
- **modified**：已修改的文件。
- **deleted**：已删除的文件。
- **Untracked files**：新建但尚未纳入 Git 管理的文件，需要执行 `git add` 后才能提交。



### 2.添加至暂存区

添加全部
```bash
git add .
```



## 📦 仓库初始化

```bash
git init
git clone <url>
```

---

## 📄 查看状态

```bash
git status
git log --oneline
git log --graph --oneline --all
git diff
```

---

## ➕ 提交代码

```bash
git add .
git commit -m "message"
git push origin main
```

---

## 🔄 拉取更新

```bash
git pull
git fetch
```

---

## 🌿 分支管理

```bash
git branch
git branch new-branch
git checkout new-branch
git switch new-branch
git checkout -b new-branch
git merge branch-name
git branch -d branch-name
```

---

## ↩️ 回退

### 撤销工作区修改

```bash
git restore file
```

### 撤销暂存

```bash
git restore --staged file
```

### 回退到指定版本

```bash
git reset --hard HEAD~1
```

---

## 🗑️ 删除文件

```bash
git rm file
git rm --cached file
```

---

## 🚫 .gitignore

忽略指定文件：

```gitignore
node_modules/
.vscode/
*.log
```

忽略模板：

```gitignore
**/.template.md
```

---

## 🚀 我的博客发布流程

```bash
git status
git add .
git commit -m "update blog"
git push origin main
```

GitHub Actions 自动部署。

---

## 💡 常用技巧

查看远程仓库：

```bash
git remote -v
```

修改远程仓库：

```bash
git remote set-url origin <url>
```

查看提交历史：

```bash
git log --oneline --graph
```

查看某个文件修改历史：

```bash
git log -- file.md
```