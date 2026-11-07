# 纸间代码｜小红书 LaTeX 学术技术绘图 Prompt

这套规范命名为 **Paper Code Academic Blue**，用 XeLaTeX 与 TikZ 把技术内容排成宋体风格、白底、浅蓝重点模块的学术插图。需要直接开始绘图时，复制[第 10 节的完整 Prompt](#complete-prompt)，再附上技术内容即可。

**目录**

1. [使用场景与设计目标](#purpose)
2. [参考图视觉特点](#reference)
3. [页面比例与尺寸规范](#page)
4. [字体规范](#typography)
5. [颜色与底纹规范](#colors)
6. [模块、边框、圆角与箭头规范](#shapes)
7. [技术图内容组织与多图拆分规则](#structure)
8. [数学和代码准确性要求](#accuracy)
9. [LaTeX/TikZ 通用模板](#template)
10. [可直接复制使用的完整技术绘图 Prompt](#complete-prompt)
11. [使用示例](#examples)
12. [编译、检查与输出要求](#validation)

## 1. 使用场景与设计目标 {#purpose}

用于「纸间代码」的 Python、PyTorch、Transformer、机器学习、深度学习、数学和运筹优化笔记，将原理、推导、代码逻辑、张量形状与算法流程转成适合手机阅读的独立技术图片。

设计定位是 **Minimalist Academic Style / Scientific Diagram / LaTeX TikZ Illustration**：数学教材式公式排版、论文级技术准确性、计算机科学教科书式结构表达。固定字体、颜色、线宽和间距，让同一系列图片保持一致；版式随信息结构调整。

禁止卡通插画、商业宣传海报、3D 立方体与立体张量、复杂渐变、投影、发光、大面积高饱和色块、彩色编号圆圈、无意义装饰和营销式标题。不要为了填满页面补充无关内容。

## 2. 参考图视觉特点 {#reference}

GPT-2 参考图通过五个分区组织整体结构、Transformer Block、注意力、前馈网络和参数比较。可复用的是以下视觉规则：

| 参考图特征 | 固化规则 |
| --- | --- |
| 白色画布与较大的外层圆角分区 | 保留白色主体；灰色细线表达分组，不用背景色区分所有区域 |
| 中文宋体风格、英文衬线字、粗体标题 | 统一中英文字体体系，标题加粗，公式保持原生数学排版 |
| MHA、FFN 等关键计算使用柔和浅蓝 | 统一使用 `ModuleBlue` 纯色填充 |
| 参数、维度与总结使用灰蓝底纹 | 统一使用 `NoteBlue`，与计算模块区分 |
| 细黑边框、短箭头和直角残差回路 | 使用统一线宽，明确分支起点与加法合流节点 |
| `(a)` 至 `(e)` 的分区编号 | 多子图可保留黑色文字编号；单主题图无需强制编号 |
| 公式、维度紧邻对应计算 | 让读者顺着数据流核对形状，减少跨区寻找 |

参考图是风格依据，本文 HEX 色值是复用时采用的标准设计值，不声称是对截图逐像素采样的结果。参考图中轻微的明暗变化统一为纯色 `fill`；整体横向布局也不作为所有主题的固定版式。

参考图里的技术标注仍须独立核对。例如，图中写明 Q/K/V 无偏置，而原始 GPT-2 实现的投影包含偏置；原始实现还包含因果掩码和分头后的合并操作。这些差异影响公式、流程和参数统计，不能只换一个标题就沿用参考图的数值。相关实现见 [OpenAI GPT-2 源码中的 `conv1d`、`attn` 与 `block`](https://github.com/openai/gpt-2/blob/master/src/model.py)。

## 3. 页面比例与尺寸规范 {#page}

| 页面 | 尺寸 | 比例 | 使用场景 |
| --- | --- | --- | --- |
| 竖版，默认 | 180 × 240 mm | 3:4 | 数学推导、注意力、PyTorch 代码、分步算法、张量维度 |
| 横版 | 240 × 180 mm | 4:3 | 网络模块、横向数据流、多矩阵比较、算法框架 |
| 超宽版 | 280 × 140 mm | 2:1 | 确实需要同屏呈现的复杂模型全貌 |

三种画布的 `geometry` 配置分别为：

```latex
% 每个文档只选一种；共享样式已加载 geometry 时，使用第 9 节的页面命令。
\usepackage[paperwidth=180mm,paperheight=240mm,margin=0mm]{geometry}
% \usepackage[paperwidth=240mm,paperheight=180mm,margin=0mm]{geometry}
% \usepackage[paperwidth=280mm,paperheight=140mm,margin=0mm]{geometry}
```

`margin=0mm` 只定义画布，不表示内容可以贴边。所有文字、边框、箭头尖端默认距离页面边缘至少 **10 mm**，并把节点内边距与公式高度计入实际边界。模块间距建议 6–10 mm，有箭头标签时按需加大。

单页拥挤时，优先删去重复说明、重排或拆图，不能通过全图缩放、缩小全部字号或强行改成超宽版容纳内容。系列图默认使用相同尺寸；改变方向须有明确的内容理由。

## 4. 字体规范 {#typography}

使用 **XeLaTeX**，源文件保存为 UTF-8。

| 内容 | 首选 | 回退与用法 |
| --- | --- | --- |
| 中文 | Noto Serif CJK SC，思源宋体风格 | FandolSong-Regular.otf；粗体使用 FandolSong-Bold.otf |
| 英文 | Noto Serif | TeX Gyre Termes |
| 代码 | Latin Modern Mono | 使用 `\texttt{...}`，特殊字符正确转义 |
| 公式 | 标准 LaTeX 数学字体 | `amsmath`、`amssymb`，保持黑色与清晰上下标 |

用 `\IfFontExistsTF` 检测字体，不把本机绝对字体路径写进模板。回退字体也缺失时，应报告缺失项；不悄悄换成微软雅黑、黑体或商业 UI 字体。中文标题使用粗体，正文常规字重。

| 层级 | 建议字号 | 模板命令 | 默认字号 / 行距 |
| --- | --- | --- | --- |
| 页面主标题 | 20–23 pt | `\PaperTitleFont` | 22 / 28 pt |
| 分区标题 | 14–17 pt | `\PaperSectionFont` | 15 / 19 pt |
| 模块标题 | 11–14 pt | `\PaperModuleFont` | 12 / 16 pt |
| 正文、公式 | 10–12 pt | `\PaperBodyFont` | 11 / 15 pt |
| 注释 | 9–10 pt | `\PaperNoteFont` | 9.5 / 13 pt |

这些数值是基础层级。需要调整时统一修改相应命令，并检查手机宽度下的效果。数学使用 `\mathbb{R}`、`\mathrm{...}`、`\operatorname{Softmax}` 等规范命令；不要用普通文本模拟上下标，或将公式截图贴回图中。

## 5. 颜色与底纹规范 {#colors}

| 颜色变量 | HEX | 用途 |
| --- | --- | --- |
| `PaperWhite` | `#FFFFFF` | 页面背景、普通模块 |
| `TextBlack` | `#171717` | 标题、正文、公式 |
| `DeepGray` | `#444444` | 次要说明 |
| `AcademicBlue` | `#3B82C4` | 少量重点文字、强调线 |
| `ModuleBlue` | `#E1EFFC` | 关键计算模块填充 |
| `NoteBlue` | `#EDF0F5` | 公式注释、参数与总结区域 |
| `BorderGray` | `#777777` | 外层容器边框 |
| `LineBlack` | `#292929` | 箭头、模块边框 |

```latex
\definecolor{PaperWhite}{HTML}{FFFFFF}
\definecolor{TextBlack}{HTML}{171717}
\definecolor{DeepGray}{HTML}{444444}
\definecolor{AcademicBlue}{HTML}{3B82C4}
\definecolor{ModuleBlue}{HTML}{E1EFFC}
\definecolor{NoteBlue}{HTML}{EDF0F5}
\definecolor{BorderGray}{HTML}{777777}
\definecolor{LineBlack}{HTML}{292929}
```

白色应占主要面积，黑色与深灰承担主要信息。浅蓝只标识核心计算，灰蓝只承载辅助说明；一页尽量只使用这两种蓝色背景层级，不为不同模块另配颜色。强调蓝用于少量线条或文字，不作为大面积底色；数学公式保持黑色。使用纯色填充，不使用渐变或透明度叠加制造新的色阶。

## 6. 模块、边框、圆角与箭头规范 {#shapes}

共享样式提供四种基础模块和一种数据流箭头：

```latex
\usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds}
\tikzset{
  basicblock/.style={draw=LineBlack,fill=PaperWhite,
    line width=0.65pt,rounded corners=2mm,inner sep=3mm,align=center},
  keyblock/.style={basicblock,fill=ModuleBlue},
  noteblock/.style={draw=none,fill=NoteBlue,
    rounded corners=2mm,inner sep=3mm,align=left},
  sectionbox/.style={draw=BorderGray,fill=none,
    line width=0.6pt,rounded corners=3mm,inner sep=4mm},
  flowarrow/.style={-{Stealth[length=2.2mm]},
    draw=LineBlack,line width=0.75pt}
}
```

普通计算用 `basicblock`；关键计算用 `keyblock`；说明与总结用 `noteblock`；相关模块的外层分区用 `sectionbox`。同一系列不能任意改变边框粗细、圆角半径和填充含义。容器在背景层绘制，避免盖住节点与连线。

优先使用水平、竖直和正交折线，通过节点的 `north`、`south`、`east`、`west` 锚点连接。分支与合流必须可辨认；残差使用绕开计算模块的路径和黑色加法节点。加法节点是运算符，区别于禁止使用的装饰性彩色编号圆圈。

箭头不得穿过文字、公式或无关模块，也不能为整齐而改变计算顺序。必要的交叉应有清晰语义；单纯为了挤入页面而形成的交叉应通过重排消除。

## 7. 技术图内容组织与多图拆分规则 {#structure}

每张图遵循 **主标题 → 核心技术图 → 公式和维度 → 必要说明**。标题直接描述技术主题，关键形状紧邻对应模块，参数与总结集中放入灰蓝区；相关模块通过外层容器分组，保持一致的间距和对齐方式。

### 按技术主题组织

| 主题 | 优先呈现 | 必须核对 |
| --- | --- | --- |
| 神经网络 | GPT / Transformer、MHA、FFN、LayerNorm、残差、Embedding、CNN、RNN 的连接 | 数据流、运算顺序、输入输出、参数矩阵、偏置、参数量 |
| 张量维度 | 二维矩阵、Batch / Head 分组、`view` / `reshape`、`transpose` / `permute`、`matmul`、Softmax、广播 | 每个轴的含义、被收缩的维度、转置范围、广播规则 |
| 数学推导 | LayerNorm、Softmax、梯度下降、损失、反向传播、概率与线性代数 | 符号、等号、适用条件、关键变换；只保留必要解释 |
| 运筹与算法 | 动态规划、状态转移、分支定界、FPTAS、调度与启发式算法 | 输入、状态、递推、决策、更新、终止、输出与保证条件 |

高维张量用二维切片和外层分组表达，不用立体方块堆叠。例如，自注意力中令 $B$ 为批大小、$h$ 为头数、$T$ 为序列长度、$d_h$ 为每头维度：

$$
Q\in\mathbb{R}^{B\times h\times T\times d_h},\qquad
K^{\mathsf T}\in\mathbb{R}^{B\times h\times d_h\times T},
$$

$$
QK^{\mathsf T}\in\mathbb{R}^{B\times h\times T\times T}.
$$

这里的转置只交换最后两个轴；$B,h$ 是批处理轴，矩阵乘法沿 $d_h$ 收缩。图中应写清这一约定，代码可标为 `K.transpose(-2, -1)`，对应 [PyTorch `transpose` 的指定轴交换语义](https://docs.pytorch.org/docs/2.15/generated/torch.transpose.html)。

### 多图拆分

内容超出单页可读范围时，优先拆为 **2–5 张**独立页面，每张只处理一个完整主题。例如 GPT-2 可拆为整体结构、Block 数据流、多头注意力、FFN 参数与维度；确有比较需求时再增加参数量对比页。

多页统一尺寸、标题、字体、底纹、线宽、圆角、公式和信息密度。子图编号可用 `(a)`、`(b)`、`(c)`，系列页也可用简洁的页码。不得为了增加页数补内容；能清楚放入一张时无需拆分。

## 8. 数学和代码准确性要求 {#accuracy}

绘图前整理用户提供的文字、代码、公式、参数、形状、模型结构和截图，先形成符号表与计算顺序，再决定布局。对已校验内容只优化表达；发现数学或代码问题时，明确列出原始问题、修正依据和影响，将技术修正与视觉调整分开说明，不静默改变结论。

缺少模型版本、偏置设置、权重共享等会影响结果的条件时，使用符号、注明假设或提出最少的必要问题。不要编造模型参数、实验数值和算法结论。

重点核对以下事项：

1. **权重方向**：数学右乘约定可写 $XW+b$，其中 $W\in\mathbb{R}^{d_{\mathrm{in}}\times d_{\mathrm{out}}}$；若 $W$ 表示 PyTorch `nn.Linear` 实际存储权重，则形状为 $(d_{\mathrm{out}},d_{\mathrm{in}})$，应写 $XW^{\mathsf T}+b$。两种约定不能混用，见 [PyTorch Linear 官方文档](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Linear.html)。
2. **形状变化**：区分改变形状与交换轴。`view` 要满足形状和步长兼容条件；`reshape` 可能返回视图或执行复制，不能把它与转置等同。核对依据见 [PyTorch Tensor.view 官方文档](https://docs.pytorch.org/docs/2.15/generated/torch.Tensor.view.html)。
3. **注意力语义**：区分分数 $S$、权重 $P=\operatorname{Softmax}(S)$ 与上下文 $C=PV$；写明 Softmax 轴。若画因果模型，还须表达因果掩码；多头结果须先合并再做输出投影。不同符号可用，但必须定义清楚。
4. **归一化与残差**：注明 LayerNorm 的轴，区分 Pre-LN 与 Post-LN；加法两端形状必须兼容。不要为了省空间把归一化移到残差的另一侧。
5. **参数量**：逐项列权重、偏置、归一化参数；明确是否计入共享参数、输出头及 Embedding。共享权重不能重复统计，激活张量不是可学习参数。
6. **推导与算法**：写出变量定义、递推边界、初始状态和终止条件；近似比、复杂度或最优性保证必须连同成立条件一起呈现。

## 9. LaTeX/TikZ 通用模板 {#template}

工程放在仓库根目录的 `latex/`，所有图共享同一份样式：

```text
latex/
  .gitignore                 # 忽略 .build/ 编译中间文件
  paper-code-style.tex       # 字体、颜色、字号、页面与 TikZ 样式
  example-transformer.tex    # 可独立编译的主文件，加载同目录样式
  .build/                    # 编译日志、辅助文件及待检查 PDF
  output/                    # 检查后的 PDF 与 PNG
```

“可独立编译”指示例是带有 `\documentclass` 和 `document` 环境的入口文件，与共享样式放在同一目录后即可编译，不依赖其他章节或私有图片。复制到新工程时应同时复制这两个 `.tex` 文件。

### 共享样式

以下代码直接从仓库内的 `latex/paper-code-style.tex` 引入，站点构建时展开为可复制代码块，避免文档与实际模板不同步。

<<< ../../../latex/paper-code-style.tex{latex}

页面命令在导言区、加载样式后调用：`\PaperCodePortrait`（默认）、`\PaperCodeLandscape`、`\PaperCodeWide`。`papercodepage` 的原点在页面左上角，坐标以 mm 为单位，向右、向下为正。

`\PaperSafeMargin` 的默认值为 10 mm，是布局边界约定，不自动裁剪或移动节点。改变纸张方向后须重新布局，不能只换页面命令就假定原有坐标适配；多页可以分别使用独立主文件，共享样式即可。

### 最小完整示例

示例定义一个 **无 Dropout 的 Pre-LN FFN 残差子层**，不是完整 GPT-2 Block。它包含白色 LayerNorm 模块、蓝色 FFN、灰蓝说明区、外层容器、数学公式和残差箭头；权重采用数学右乘约定，偏置沿 Batch 和序列维广播。

为改善手机宽度下的阅读，示例通过共享命令将模块标题、正文公式调为 14 pt，注释调为 11 pt，并相应重排间距。这是按实际画布放大基础字号的示范；同一系列沿用这组覆盖值，不逐个节点随意修改。

<<< ../../../latex/example-transformer.tex{latex}

## 10. 可直接复制使用的完整技术绘图 Prompt {#complete-prompt}

复制下面整个代码块，再在末尾附上技术材料即可。该 Prompt 已包含独立使用所需的设计值、技术检查规则、工程要求和验收流程，不需要另行复制本文其他章节或上传参考图。

```text
你是一名擅长数学、机器学习、深度学习、Python、PyTorch 和运筹优化的学术技术绘图工程师。
请将我附在末尾的技术内容绘制为「纸间代码」的小红书技术图片，使用 XeLaTeX + TikZ，交付可编辑源码、PDF 和 PNG；环境不支持某项输出时须准确说明。

一、目标与工作顺序
采用固定设计系统 Paper Code Academic Blue，定位为 Minimalist Academic Style / Scientific Diagram / LaTeX TikZ Illustration。
先分析文字、代码、公式、参数、张量形状、模型结构及截图，整理符号与计算顺序；再决定分图与布局；最后生成源码、编译、渲染并逐张检查。
保持数学教材式排版、论文级技术准确性、教科书式结构表达，以及手机端可读性。
有参考图时提取视觉语言，但仍须核对其技术内容；没有参考图时直接按以下规范工作。

二、固定视觉语言
- 白色背景，中文宋体风格，英文衬线字，黑色数学公式。
- 普通计算为白色圆角矩形；关键计算为柔和浅蓝矩形；说明与总结为浅灰蓝区域。
- 黑色或深灰细线和箭头，外层分区使用灰色细边框，圆角轻微。
- 保持留白、对齐和清晰分组，优先用原生 LaTeX 公式及二维矩阵表达技术。
- 禁止卡通、商业海报、3D 立方体、立体张量、复杂渐变、投影、发光、大面积高饱和色块、彩色编号圆圈、无意义装饰及营销式标题。
- 不为了填满页面或增加页数添加无关内容。

三、颜色系统
在共享样式中使用 xcolor，逐项定义：
\definecolor{PaperWhite}{HTML}{FFFFFF}
\definecolor{TextBlack}{HTML}{171717}
\definecolor{DeepGray}{HTML}{444444}
\definecolor{AcademicBlue}{HTML}{3B82C4}
\definecolor{ModuleBlue}{HTML}{E1EFFC}
\definecolor{NoteBlue}{HTML}{EDF0F5}
\definecolor{BorderGray}{HTML}{777777}
\definecolor{LineBlack}{HTML}{292929}
PaperWhite 用于画布和普通模块；TextBlack 用于标题、正文、公式；DeepGray 用于次要文字；AcademicBlue 只用于少量重点文字和强调线；ModuleBlue 用于关键计算；NoteBlue 用于公式注释、参数与总结；BorderGray 用于外框；LineBlack 用于箭头和模块边框。
白色占主要面积，黑色与深灰承载主要信息。一页尽量只用 ModuleBlue、NoteBlue 两种蓝色背景层级。使用纯色 fill，不另加颜色或渐变，公式保持黑色。

四、字体与字号
使用 XeLaTeX、fontspec、xeCJK，源文件为 UTF-8。
中文优先 Noto Serif CJK SC，常规正文与粗体标题；不可用时回退到 FandolSong-Regular.otf，并显式指定 BoldFont=FandolSong-Bold.otf。
英文优先 Noto Serif，否则 TeX Gyre Termes；代码使用 Latin Modern Mono。
用 \IfFontExistsTF 检查字体；不得依赖个人绝对路径；回退也缺失时报告缺失项，不悄悄改用微软雅黑、黑体或商业 UI 字体。
公式使用 amsmath、amssymb，保留标准数学字体，使用 \mathbb、\mathrm、\operatorname 等规范命令。
把字号定义为共享命令：
- \PaperTitleFont：主标题 22 pt / 行距 28 pt，可在 20–23 pt 调整；
- \PaperSectionFont：分区标题 15 / 19 pt，可在 14–17 pt 调整；
- \PaperModuleFont：模块标题 12 / 16 pt，可在 11–14 pt 调整；
- \PaperBodyFont：正文与公式 11 / 15 pt，可在 10–12 pt 调整；
- \PaperNoteFont：注释 9.5 / 13 pt，可在 9–10 pt 调整。
标题粗体，正文常规。按页面实际尺寸统一调整层级，不单独把拥挤的模块文字缩得很小。

五、页面与安全边距
默认竖版 180mm × 240mm，比例 3:4，geometry 配置：
\usepackage[paperwidth=180mm,paperheight=240mm,margin=0mm]{geometry}
横向网络、数据流、多矩阵比较可用 240mm × 180mm，比例 4:3。
仅在复杂模型全貌确有需要时用 280mm × 140mm，比例 2:1。
共享样式提供 \PaperCodePortrait、\PaperCodeLandscape、\PaperCodeWide，在导言区选择一种尺寸。
margin=0mm 只定义画布；文字、公式、边框和箭头尖端距四边至少 10mm，计入节点内边距和实际高度。定义 \PaperSafeMargin=10mm 作为布局约定。
模块间距参考 6–10mm，有标签时适当增大。内容过多应删重复说明、重排或拆图，不使用全图缩放或缩小全部字号来挤入页面。

六、TikZ 样式与连接规则
加载 \usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds}，定义：
\tikzset{
  basicblock/.style={draw=LineBlack,fill=PaperWhite,line width=0.65pt,
    rounded corners=2mm,inner sep=3mm,align=center},
  keyblock/.style={basicblock,fill=ModuleBlue},
  noteblock/.style={draw=none,fill=NoteBlue,rounded corners=2mm,
    inner sep=3mm,align=left},
  sectionbox/.style={draw=BorderGray,fill=none,line width=0.6pt,
    rounded corners=3mm,inner sep=4mm},
  flowarrow/.style={-{Stealth[length=2.2mm]},draw=LineBlack,line width=0.75pt}
}
普通模块用 basicblock，关键模块用 keyblock，说明总结用 noteblock，外分组用 sectionbox；整套图片保持这些含义一致。
外容器在背景层绘制。优先水平或竖直正交连线，使用节点锚点，不能穿过文字、公式和模块；消除无意义交叉。
分支与合流必须明确，残差连接用绕行路径与黑色加法节点。不能为整齐改变计算顺序。

七、信息组织与多图拆分
层级为：主标题 → 核心技术图 → 公式和维度 → 必要说明。
标题简洁准确；维度紧邻对应计算；参数与公式总结放在灰蓝区；相关模块可放入外框；子图编号 (a)、(b)、(c) 可选。
单页可读性不足时优先拆为 2–5 张，每张一个完整主题。GPT-2 可拆为整体结构、Block 数据流、多头注意力、FFN 参数维度；只有内容需要时才增加参数比较页。
系列图统一页面尺寸、标题、字体、底纹、线宽、圆角、公式排版和信息密度；不同方向须有明确理由。

八、按内容类型绘制
1. 神经网络：适用于 GPT / Transformer、MHA、FFN、LayerNorm、残差、Embedding、CNN、RNN。检查数据流、连接关系、输入输出形状、参数矩阵形状、偏置、顺序和参数量。
2. 张量维度：使用二维矩阵和 Batch / Head 分组，标明 view、reshape、transpose、permute、matmul、Softmax 和广播的作用。明确批处理轴与收缩轴，不用 3D 方块替代维度说明。
   例如 Q∈R^(B×h×T×d_h)，K 转置后为 R^(B×h×d_h×T)，QK^T 为 R^(B×h×T×T)；这里的转置只交换最后两个轴，B,h 是批处理轴，乘法沿 d_h 收缩。图中用原生数学公式排版这些形状。
3. 数学推导：适用于 LayerNorm、Softmax、梯度下降、损失、反向传播、概率和线性代数。定义符号，保留关键步骤及成立条件，核对等号，关键公式可用浅蓝框，不添加冗长解释。
4. 运筹算法：适用于动态规划、状态转移、分支定界、FPTAS、调度和启发式算法。展示输入、状态、递推、决策、更新、终止条件及输出；保证算法逻辑与理论条件一致。

九、技术准确性
- 用户提供已校验内容时，只优化表达和排版，不擅自修改技术结论。
- 发现错误时先明确原始问题、修正依据和影响；将技术修正与视觉调整分开说明，禁止静默改变公式含义。
- 不编造模型参数、实验数值或算法结论。缺失数值用符号；影响正确性的关键歧义要明确指出并提出最少的必要问题，不猜测。
- 权重约定保持一致：数学右乘 W 形状为 (输入特征,输出特征)，写 XW+b；若 W 是 PyTorch nn.Linear 存储权重，则形状为 (输出特征,输入特征)，写 XW^T+b。偏置与广播轴单独注明。
- reshape/view 不等于 transpose/permute；view 还需检查形状与步长兼容性，reshape 可能复制数据。
- 注意力应区分分数、Softmax 权重和加权后的上下文，标明 Softmax 轴；因果模型必须考虑掩码；多头结果合并后再做输出投影。
- 明确 LayerNorm 轴、Pre-LN/Post-LN 位置与残差形状；参数量逐项核对偏置、归一化参数和权重共享，不能把激活算成参数，或重复统计共享权重。
- 参考图不能代替模型实现；核对来源与版本，不能照抄未确认的参数量和结论。

十、工程交付
使用 XeLaTeX、TikZ、xeCJK、fontspec、amsmath、amssymb、xcolor、geometry。
在工作目录创建或复用 latex/paper-code-style.tex，统一字体、八种配色、字号、四类模块、箭头、标题和三种页面尺寸；各图片用 \input{paper-code-style.tex} 加载，避免每张重复定义。
每张图提供包含 documentclass 与 document 环境的独立主文件，与共享样式一起即可编译，不依赖私有图片或未提供的资源。
如需最小样例，创建 latex/example-transformer.tex，至少包含白色模块、浅蓝重点模块、灰蓝说明区、外层容器、数学公式与箭头；内容必须准确，明确示例的适用范围。
中间文件放 latex/.build/；检查后的 PDF 与 PNG 放 latex/output/，采用清晰稳定的文件名。
保留现有工程与用户修改，不覆盖无关内容，不自动 commit、push、部署或发布。

十一、编译、视觉验收与报告
1. 检查源码语法、符号、维度、运算顺序、偏置与参数统计。
2. 在主文件所在目录用 XeLaTeX 编译；使用 -interaction=nonstopmode、-halt-on-error、-file-line-error。需要时再编译以稳定页面锚点和引用。
3. 检查日志中的错误、缺字、字体替代、Overfull/Underfull hbox 或 vbox。修复影响正确性和排版的问题。
4. 检查 PDF 页数、尺寸、字体和内容边界；TikZ overlay 的越界未必产生 Overfull 警告，必须另查实际画面。
5. 将每页 PDF 渲染为 PNG，长边至少 2000px，建议 2400px；保持原始比例和白底，优先保证 PDF 矢量质量。
6. 逐张打开 PNG，检查截断、重叠、箭头交叉与遮挡、上下标、中文缺字、对齐、圆角、填充及四周安全边距；再按约 375–430px 手机宽度检查阅读体验。
7. 发现问题后修改、重新编译并重新检查。编译成功不能代替视觉验收。
8. 最后列出文件路径、技术修正与假设、编译及视觉检查结果。如环境缺少编译器、字体或渲染器，给出具体缺失项与可运行命令，不声称已编译或已目视检查。

十二、我的绘图任务
主题：[填写]
技术材料（文字、代码、公式、截图或结构）：[粘贴或附上]
符号与输入输出形状：[填写；没有具体数值时用符号]
必须展示的步骤与结论：[填写]
内容是否已校验：[填写]
模型/实现版本与偏置、掩码、权重共享等约定：[按需填写]
期望方向与张数：[默认竖版，按可读性决定是否拆图]
额外限制：[填写或写“无”]
```

## 11. 使用示例 {#examples}

将下面任一任务描述附在第 10 节之后，不必改动通用风格规范。

### 示例 A：前馈网络与残差连接

```text
主题：Transformer 中无 Dropout 的 Pre-LN FFN 残差子层。
输入：X∈R^(B×T×d)，B 为批大小，T 为序列长度，d 为特征维；中间维为 d_f。
计算：U=LN(X)，H=GELU(UW_1+b_1)，F=HW_2+b_2，Y=X+F。
约定：LN 沿最后一维；使用数学右乘权重。
W_1∈R^(d×d_f)，W_2∈R^(d_f×d)，b_1∈R^d_f，b_2∈R^d。
偏置沿 B,T 广播；H∈R^(B×T×d_f)，U,F,Y 的形状均为 (B,T,d)。
要求：一张竖图；LN 白底、FFN 浅蓝、维度说明灰蓝；绘制绕行的恒等分支与加法节点。
只展示这个子层，不把它标成完整 GPT-2 Block；所有参数用符号，不补出数值。
```

对应源码见第 9 节，编译产物为 `latex/output/example-transformer.pdf` 与 `latex/output/example-transformer.png`。

### 示例 B：注意力矩阵乘法的维度

```text
主题：无掩码的缩放点积自注意力；只画已完成分头后的计算，不表示完整因果模型。
输入：Q,K,V 的形状均为 (B,h,T,d_h)，令 S=QK^T/sqrt(d_h)。
K^T 只转置最后两轴，形状为 (B,h,d_h,T)。
P=Softmax(S)，沿最后一个键位置轴归一化；S,P 的形状为 (B,h,T,T)。
C=PV，形状为 (B,h,T,d_h)。
要求：用二维切片表示单个 batch 和 head，外框标注 B,h 分组；箭头上标明收缩维。
所有公式用 LaTeX，不能把注意力权重 P 标成 C 的形状；若拥挤，拆成打分与加权求和两张。
```

### 示例 C：0/1 背包动态规划

```text
主题：0/1 背包的二维动态规划状态转移，不使用滚动数组。
假设：容量 C 为非负整数，各物品重量 w_i 为正整数，价值 v_i≥0，每件最多取一次。
定义：f(i,c) 为只考虑前 i 件物品、容量不超过 c 时的最大总价值。
边界：f(0,c)=0；c<w_i 时 f(i,c)=f(i-1,c)。
c≥w_i 时 f(i,c)=max(f(i-1,c),f(i-1,c-w_i)+v_i)。
遍历 i=1,…,n，c=0,…,C；输出 f(n,C)。
要求：显示状态含义、容量判断、两个候选状态、更新和终止输出。
一张竖图，浅蓝突出转移式，灰蓝列出边界与约束；不生成未提供的实例数值。
```

## 12. 编译、检查与输出要求 {#validation}

以下 PowerShell 命令从仓库根目录开始执行。先确认已安装包含 XeLaTeX、xeCJK、TikZ、Fandol 的 TeX 发行版，以及 `pdftoppm`、`pdfinfo`；不会自动安装或升级全局环境。

```powershell
Set-Location latex
New-Item -ItemType Directory -Path .build, output -Force | Out-Null
xelatex '-interaction=nonstopmode' '-halt-on-error' '-file-line-error' '-output-directory=.build' example-transformer.tex
if ($LASTEXITCODE -ne 0) { throw 'XeLaTeX 编译失败，请检查日志。' }
xelatex '-interaction=nonstopmode' '-halt-on-error' '-file-line-error' '-output-directory=.build' example-transformer.tex
if ($LASTEXITCODE -ne 0) { throw 'XeLaTeX 第二次编译失败。' }
Select-String -Path .build/example-transformer.log -Pattern 'Overfull|Underfull|Missing character|Warning|Error'
pdfinfo .build/example-transformer.pdf
pdftoppm -png -singlefile -scale-to 2400 .build/example-transformer.pdf .build/example-transformer
if ($LASTEXITCODE -ne 0) { throw 'PNG 导出失败。' }
```

两次编译用于稳定 `remember picture` 页面锚点。检查日志后，打开 `.build/example-transformer.png` 逐项核对：

- 页面为 180 × 240 mm，3:4；PNG 约为 1800 × 2400 px，PDF 点数取整可能使宽度多 1 px。
- 中文、英文、公式和上下标无缺字，字号层级清楚，填充和边框符合规范。
- 模块、公式与安全边距无冲突，箭头不穿过文字，恒等分支准确接到加法节点。
- 权重、偏置和中间张量维度一致；示例的局部范围与无 Dropout 约定可见。
- 在原始大小及约 375–430 px 宽的手机预览下检查；不要靠高分辨率掩盖拥挤排版。

`overlay` 定位超出页面时，TeX 不一定报告 `Overfull \hbox`。因此日志、PDF 元数据与实际 PNG 目视检查缺一不可；有问题就修改并重新渲染。

验收通过后再复制成正式输出：

```powershell
Copy-Item -LiteralPath .build/example-transformer.pdf -Destination output/example-transformer.pdf
Copy-Item -LiteralPath .build/example-transformer.png -Destination output/example-transformer.png
Set-Location ..
npm.cmd run docs:build
```

多页 PDF 不使用 `-singlefile`，应导出并检查每一页。保留矢量 PDF，PNG 长边至少 2000 px；截图不能替代 PDF 源文件。交付时列出源码和产物、实际检查结果、必要假设与技术修正；工具缺失时说明未完成的检查，不将“提供了命令”写成“验证通过”。
