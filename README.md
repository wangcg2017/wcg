# 记账APP (Bookkeeping App)

一款运行在 macOS 上的个人记账工具，记录每一笔人民币花销，并按二级分类统计。

## 怎么运行

```bash
# 1. 安装依赖（只第一次需要）
npm install

# 2. 启动 App（开发模式，会自动弹出记账窗口）
npm run dev
```

## 账本存在哪

数据保存在你电脑的「用户数据」目录下（`data.json`），不联网、不上传。
具体位置一般是：

```
~/Library/Application Support/heima-bookkeeping/data.json
```

想备份账本，把这个文件复制走即可。

## 常用命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 开发模式启动（改代码自动刷新） |
| `npm run build` | 打包前端与主进程代码 |
| `npm run start` | 以生产模式预览（需先 build） |

## 产品文档 / 协作约定

详见 [CLAUDE.md](./CLAUDE.md)。
