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
| 白色画布与较大的外层圆角分区 | 保留白色主体；外层逻辑分组统一使用浅灰色细虚线圆角矩形，不用背景色区分所有区域 |
| 中文宋体风格、英文衬线字、粗体标题 | 统一中英文字体体系，标题加粗，公式保持原生数学排版 |
| MHA、FFN 等关键计算使用柔和浅蓝 | 统一使用 `ModuleBlue` 纯色填充 |
| 参数、维度与总结使用灰蓝底纹 | 统一使用 `NoteBlue`，与计算模块区分 |
| 细黑边框、短箭头和直角残差回路 | 内部计算模块使用黑色或深灰色细实线圆角边框，计算流程箭头保持实线，明确分支起点与加法合流节点 |
| `(a)` 至 `(e)` 的分区编号 | 多子图可保留黑色文字编号；单主题图无需强制编号 |
| 公式、维度紧邻对应计算 | 让读者顺着数据流核对形状，减少跨区寻找 |

参考图是风格依据，本文 HEX 色值是复用时采用的标准设计值，不声称是对截图逐像素采样的结果。参考图中轻微的明暗变化统一为纯色 `fill`；整体横向布局也不作为所有主题的固定版式。

参考图里的技术标注仍须独立核对。例如，图中写明 Q/K/V 无偏置，而原始 GPT-2 实现的投影包含偏置；原始实现还包含因果掩码和分头后的合并操作。这些差异影响公式、流程和参数统计，不能只换一个标题就沿用参考图的数值。相关实现见 [OpenAI GPT-2 源码中的 `conv1d`、`attn` 与 `block`](https://github.com/openai/gpt-2/blob/master/src/model.py)。

## 3. 页面比例与尺寸规范 {#page}

先分析技术内容的计算依赖与布局结构，再选择页面方向；不机械优先使用竖版，也不先选定竖版后强行排版。

| 页面 | 尺寸 | 比例 | 使用场景 |
| --- | --- | --- | --- |
| 竖版 | 180 × 240 mm | 3:4 | 纵向顺序计算、数学推导优先采用 |
| 横版 | 240 × 180 mm | 4:3 | 多阶段计算流程、左右对比、双分支结构优先采用 |
| 宽版 | 280 × 140 mm | 2:1 | 复杂模型全貌、多 GPU 数据流、跨模块同步可采用 |

三种画布的 `geometry` 配置分别为（下例仅以竖版展示启用方式，实际按技术结构选择对应的一项）：

```latex
% 在 main.tex 的导言区为整组页面选择一种；共享样式已加载 geometry 时，使用第 9 节的页面命令。
\usepackage[paperwidth=180mm,paperheight=240mm,margin=0mm]{geometry}
% \usepackage[paperwidth=240mm,paperheight=180mm,margin=0mm]{geometry}
% \usepackage[paperwidth=280mm,paperheight=140mm,margin=0mm]{geometry}
```

`margin=0mm` 只定义画布，不表示内容可以贴边。所有文字、边框、箭头尖端默认距离页面边缘至少 **10 mm**，并把节点内边距与公式高度计入实际边界。模块间距建议 6–10 mm，有箭头标签时按需加大。

单页拥挤时，先删去重复说明，利用页面宽度尝试多列、左右并列或对称布局，并评估是否应选择横版或宽版；只有重新组织后仍无法保持清晰的字体、公式与连接关系时，才按第 7 节的条件拆图。不能为减少页数而全图缩放、压缩字体或强行塞入过多内容。系列图在选定合适方向后统一尺寸；改变方向须有明确的内容理由。

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
| `ModuleBlue` | `#E1EFFC` | 关键计算模块填充、阶段标题栏 |
| `NoteBlue` | `#EDF0F5` | 公式注释、参数与总结区域 |
| `BorderGray` | `#777777` | 外层容器边框、阶段分隔线 |
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

白色应占主要面积，黑色与深灰承担主要信息。浅蓝用于核心计算及阶段式布局的标题栏，灰蓝只承载辅助说明；一页尽量只使用这两种蓝色背景层级，不为不同模块另配颜色。强调蓝用于少量线条或文字，不作为大面积底色；数学公式保持黑色。使用纯色填充，不使用渐变或透明度叠加制造新的色阶。

## 6. 模块、边框、圆角与箭头规范 {#shapes}

共享样式提供三种内容模块、一种逻辑分组框和一种数据流箭头：

```latex
\usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds}
\tikzset{
  basicblock/.style={draw=LineBlack,fill=PaperWhite,
    line width=0.65pt,rounded corners=2mm,inner sep=3mm,align=center},
  keyblock/.style={basicblock,fill=ModuleBlue},
  noteblock/.style={draw=none,fill=NoteBlue,
    rounded corners=2mm,inner sep=3mm,align=left},
  sectionbox/.style={
    draw=BorderGray,
    fill=none,
    dash pattern=on 2.5pt off 2pt,
    line width=0.5pt,
    rounded corners=3mm,
    inner sep=4mm
  },
  flowarrow/.style={-{Stealth[length=2.2mm]},
    draw=LineBlack,line width=0.75pt}
}
```

所有外层逻辑分组框统一复用 `sectionbox`，不创建多个含义相同的外框样式，也不将 `basicblock` 或 `keyblock` 改成虚线。同一系列不能任意改变边框粗细、圆角半径和填充含义。分组框在背景层绘制，避免盖住节点与连线；它只表示逻辑分组，不表示计算步骤。

### 边框类型

**1. 逻辑分组框（sectionbox）**

用于包围多个相关内容模块，例如：

- GPT 输入与目标关系
- 训练集与验证集划分
- 两种损失汇总口径
- Transformer 内部功能分区

采用浅灰色细虚线圆角矩形。

**2. 普通计算模块（basicblock）**

用于表示具体计算步骤，例如 GPT Model、Softmax、Flatten、Cross Entropy。采用白底、黑灰色细实线圆角矩形。

**3. 关键计算模块（keyblock）**

用于强调主要计算结果或核心公式。保持浅蓝色底纹和黑灰色细实线圆角边框。

**4. 说明模块（noteblock）**

用于参数解释、公式注释和技术总结。保持浅灰蓝背景，默认无边框。

### 连接线规则

- 计算流程连接线统一采用 `flowarrow`，使用黑色或深灰色实线。
- 优先使用水平、竖直及正交路径。
- 使用 TikZ 节点的 `north`、`south`、`east`、`west` 锚点连接模块。
- 保证数据流和计算顺序正确，不能为整齐改变计算顺序。
- 分支与合流关系必须明确。
- 不得穿过文字、公式或无关计算模块。
- 允许连接线跨越外层逻辑分组框，不允许为了避免穿框而删除、截断或改变必要的连接线。

残差使用绕开计算模块的路径和黑色加法节点。加法节点是运算符，区别于禁止使用的装饰性彩色编号圆圈。计算流程自身的无意义交叉可在保持技术计算顺序的前提下通过布局调整消除；连接线跨越分组边界不属于此类问题，按下述规则处理。

**外层虚线框是分组边界，不是流程终点。** 当连接线必须从外部进入分组框时，必须保留完整连接路径，不得简单将线条截断在分组框内部或外部。

### 连接线与外框交叉

1. 当流程连接线穿过外层虚线框时，保持连接线连续。
2. 优先调整外框的虚线绘制相位（`dash phase`），避免虚线段与实线箭头在交叉点重叠。
3. 如果调整虚线相位仍无法消除明显冲突，可仅在交叉位置对分组边界做极小范围断开，不能断开连接线。
4. 不允许通过删除连接线、改变箭头方向或重新排列计算模块来掩盖交叉问题。
5. 不在穿越分组边界的位置额外增加箭头。
6. 保持外层虚线框完整的视觉轮廓，使读者仍能明确识别分组范围。

## 7. 技术图内容组织与多图拆分规则 {#structure}

每张图遵循 **主标题 → 核心技术图 → 公式和维度 → 必要说明**。标题直接描述技术主题，相关公式、张量维度与说明紧邻对应计算模块；跨阶段的参数解释与总结可集中放入灰蓝区。通过阶段分区或局部逻辑分组组织相关模块，保持一致的间距和对齐方式。

### 整体布局与信息密度

**优先保持完整的计算流程，在保证手机端可读性的前提下提高单页信息密度。** 目标是信息充分、层次清楚、留白适度的数学教材式示意图。

- 绘图前分析技术内容之间的逻辑关系，梳理连续数据流、计算依赖和对比关系，优先在同一张图中展示这些相关内容。
- 不因模块数量较多而直接拆成多页，也不强制每张图只包含一个独立知识点。
- 优先利用页面宽度组织相关模块；连续流程可采用多列布局，保留清晰的计算顺序与跨列连接。
- 对比内容可左右并列，重复结构可上下或左右对称；相关公式、张量维度和说明紧邻对应模块。
- 避免一个简单公式或单独函数占据大半页，也避免连续多页只有少量内容。
- 删除重复解释后，优先重新组织剩余内容，避免保留大面积无意义空白；保持适度留白，不以“留白越多越好”为目标。
- 不为了增加图片数量而人为拆分完整的计算过程，也不为了减少图片数量而压缩字体或强行塞入过多内容。

### 阶段式分区布局

多阶段技术流程可参考 PyTorch DDP 多 GPU 训练数据流的阶段组织方式，优先考虑在同一页面内按阶段划分区域：

- 各阶段顶部使用浅蓝色标题栏，复用 `ModuleBlue`，只承担阶段导航作用，不表示额外的计算步骤。
- 阶段之间使用浅灰色细虚线分隔；横向多列阶段可使用竖向分隔线，复用 `BorderGray`、0.5 pt 线宽及 `on 2.5pt off 2pt` 虚线节奏。
- 阶段内部使用实线计算模块，关键步骤使用浅蓝色重点模块。
- 计算流程使用黑灰色实线 `flowarrow` 箭头，保持跨阶段数据流连续且容易追踪。
- 必要时在底部设置横向总结区域，复用 `NoteBlue`，局部说明仍紧邻对应计算模块。

阶段分隔线不必闭合成完整圆角外框，也不要求每个阶段都增加外框。外层圆角虚线框仍可用于局部逻辑分组，并统一复用 `sectionbox`；不强制所有内容都套框。连接线穿越阶段分隔线时，沿用第 6 节的交叉处理规则，保持流程线完整，不在分界处额外增加箭头。

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

先尝试构建完整的技术流程布局，再根据实际内容决定图片数量，不预先规定张数。对于相关的计算过程，只有在去重、重排并选择合适页面方向后，单页仍无法保持清晰的字体、公式与连接关系时，才进行拆图。

以下情况优先保持在一张图内：

1. 同一个算法的连续执行步骤。
2. 同一个模型的完整数据流。
3. 同一计算过程的多个阶段。
4. 需要直接比较的两个或多个方案。
5. 存在明确数据依赖或箭头连接的相关模块。

以下情况可以作为拆图的内容或可读性依据：

1. 重新组织后，单页仍出现明显的文字、公式或箭头拥挤。
2. 手机端无法辨认必要内容。
3. 不同部分能够形成独立且完整的知识主题，分开呈现更有利于理解。
4. 多个复杂推导放在同一页会削弱理解效果。

拆图必须说明具体依据，不能仅凭模块数量决定。拆分相关流程时，标明各页承接的输入、输出和阶段关系，保持计算过程的连续性；不得为增加页数人为拆开完整过程，也不得为减少页数牺牲公式正确性或手机端可读性。

多页统一尺寸、标题、字体、底纹、线宽、圆角和公式排版，信息密度与各页内容复杂程度匹配。子图编号可用 `(a)`、`(b)`、`(c)`，系列页也可用简洁的页码。不得为了增加页数补内容；能清楚放入一张时无需拆分。

这里的“多图”默认是同一项目中的多个页面：由一个 `main.tex` 统一组织，编译为一个多页 `main.pdf`，再按页导出 PNG；每页 PDF / PNG 对应一张图。拆分技术主题不意味着拆成多个独立主文件。

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

优先复用工作目录中已有的 LaTeX 工程、`main.tex`、共享样式与可用图源码，先检查现有内容，再补充本次任务所需部分；已有样式符合本规范时直接沿用，避免重复创建工程或重新定义整套样式。工程放在仓库根目录的 `latex/`，默认结构如下（以四张图为例）：

```text
latex/
├── .gitignore                 # 忽略 .build/ 编译中间文件
├── paper-code-style.tex       # 字体、颜色、字号、页面与 TikZ 样式
├── main.tex                   # 整组图片唯一的主编译入口
├── figures/
│   ├── 01_topic_a.tex          # 仅包含该页的 TikZ / 页面主体
│   ├── 02_topic_b.tex
│   ├── 03_topic_c.tex
│   └── 04_topic_d.tex
├── .build/                    # 编译日志、辅助文件与待检查的 PDF / PNG
└── output/
    ├── main.pdf               # 每页一张图的多页 PDF
    ├── 01_topic_a.png
    ├── 02_topic_b.png
    ├── 03_topic_c.png
    └── 04_topic_d.png
```

`main.tex` 是唯一主编译入口，包含 `\documentclass` 和 `document` 环境，并在导言区用 `\input{paper-code-style.tex}` 加载共享样式。多张图优先分别存入 `figures/`，由 `main.tex` 按页面顺序统一 `\input`；子图文件只包含该页的 TikZ / 页面主体，不重复声明文档或加载整套样式。单张图也使用 `main.tex`，只生成一页；内容很少时可直接在主文件中写页面主体。

相邻图页之间由 `main.tex` 显式使用 `\clearpage` 分页；子图文件不自行分页，避免同页叠图或意外空白页。复制到新工程时应同时提供 `main.tex`、共享样式及所有被引用的子图源码，不依赖其他章节、私有图片或未提供的资源。

先完成全部技术图的可用源码版本，再集中编译整组图片并逐页进行视觉验收；不要在其余页面尚未完成时反复打磨某一页。只对技术错误、编译阻塞或明显排版问题进行有依据的定向修复，达到验收要求后停止，不为主观美化无限循环修改。

**例外**：只有用户明确要求“每张图单独交付、单独维护、单独编译”时，才切换为每张图一个独立主文件的模式，仍复用共享样式；这不是默认模式。仅要求每张图各有一张 PNG，不触发该例外。

### 共享样式

以下代码直接从仓库内的 `latex/paper-code-style.tex` 引入，站点构建时展开为可复制代码块，展示现有模板内容。

<<< ../../../latex/paper-code-style.tex{latex}

**分组边框适配**：以上现有模板中的 `sectionbox` 仍是旧版实线定义。按本规范复用时，须在加载共享样式后，用第 6 节的虚线定义覆盖同名 `sectionbox`，并让全部外层逻辑分组框复用它；不新增同义外框样式。其他模块与箭头样式保持原样，下方最小示例中的外框也遵循此规则。

页面命令在 `main.tex` 的导言区、加载样式后调用，依据第 3 节的技术结构为整组页面选择尺寸：`\PaperCodePortrait`、`\PaperCodeLandscape`、`\PaperCodeWide`。现有模板的初始竖版尺寸仅是配置起点，不是布局方向的优先规则。`papercodepage` 的原点在页面左上角，坐标以 mm 为单位，向右、向下为正。

`\PaperSafeMargin` 的默认值为 10 mm，是布局边界约定，不自动裁剪或移动节点。改变纸张方向后须重新布局，不能只换页面命令就假定原有坐标适配。本模板默认整组使用同一尺寸；确需混用方向时，应在同一个主入口中显式处理逐页纸张尺寸并分别重排、验收，不能直接在子图中调用仅用于导言区的页面命令，也不能因此默认拆成多个主文件。

### 最小完整示例

示例定义一个 **无 Dropout 的 Pre-LN FFN 残差子层**，不是完整 GPT-2 Block。它包含白色 LayerNorm 模块、蓝色 FFN、灰蓝说明区、外层容器、数学公式和残差箭头；权重采用数学右乘约定，偏置沿 Batch 和序列维广播。

为改善手机宽度下的阅读，示例通过共享命令将模块标题、正文公式调为 14 pt，注释调为 11 pt，并相应重排间距。这是按实际画布放大基础字号的示范；同一系列沿用这组覆盖值，不逐个节点随意修改。

主文件 `latex/main.tex` 负责加载共享样式、统一字号并组织图页：

<<< ../../../latex/main.tex{latex}

子图源码 `latex/figures/01_transformer.tex` 只保留该页的绘图主体：

<<< ../../../latex/figures/01_transformer.tex{latex}

扩展为多张图时，保留主文件的导言区，将正文按下列方式组织；文件名应与实际技术主题对应：

```latex
\begin{document}
\input{figures/01_topic_a.tex}
\clearpage
\input{figures/02_topic_b.tex}
\clearpage
\input{figures/03_topic_c.tex}
\clearpage
\input{figures/04_topic_d.tex}
\end{document}
```

以上四个子图文件各包含一个完整的 `papercodepage` 环境，不包含 `\documentclass`、`\begin{document}` 或 `\end{document}`。统一编译 `main.tex` 后得到四页 `main.pdf`，按相同顺序导出四张 PNG；仓库内的最小示例只有 `01_transformer.tex`，因此生成一页 PDF 和一张 PNG。

## 10. 可直接复制使用的完整技术绘图 Prompt {#complete-prompt}

复制下面整个代码块，再在末尾附上技术材料即可。该 Prompt 已包含独立使用所需的设计值、技术检查规则、工程要求和验收流程，不需要另行复制本文其他章节或上传参考图。

```text
你是一名擅长数学、机器学习、深度学习、Python、PyTorch 和运筹优化的学术技术绘图工程师。
请将我附在末尾的技术内容绘制为「纸间代码」的小红书技术图片，使用 XeLaTeX + TikZ，交付可编辑源码、PDF 和 PNG；环境不支持某项输出时须准确说明。

一、目标与工作顺序
采用固定设计系统 Paper Code Academic Blue，定位为 Minimalist Academic Style / Scientific Diagram / LaTeX TikZ Illustration。
先检查并优先复用已有工程、主文件、共享样式和可用图源码；分析文字、代码、公式、参数、张量形状、模型结构及截图，整理符号、计算顺序及内容间的逻辑关系，先尝试完整流程布局，再根据实际内容与可读性决定是否拆图。
优先保持完整的计算流程，在保证手机端可读性的前提下提高单页信息密度；有连续数据流、计算依赖或对比关系的内容优先同页呈现，不因模块多直接拆页，也不强制每张图只有一个独立知识点。
先完成全部技术图的可用源码版本，再统一编译 main.tex，渲染整份 PDF 并逐页进行视觉验收，不在其他页面尚未完成时反复打磨某一页。
只针对技术错误、编译阻塞或明显排版问题进行定向修复；达到验收要求后停止，不为主观美化无限制自动修改。
保持数学教材式排版、论文级技术准确性、教科书式结构表达，以及手机端可读性。
有参考图时提取视觉语言，但仍须核对其技术内容；没有参考图时直接按以下规范工作。

二、固定视觉语言
- 白色背景，中文宋体风格，英文衬线字，黑色数学公式。
- 普通计算模块为白底、黑色或深灰色细实线圆角矩形；关键计算模块保持浅蓝色背景和黑灰色细实线圆角边框；说明与总结模块保持浅灰蓝背景，默认无边框。
- 外层逻辑分组框使用浅灰色细虚线圆角矩形，只表示逻辑分组，不表示计算步骤。
- 计算流程箭头使用黑色或深灰色实线，不允许为了避免穿框而删除、截断或改变必要的连接线。
- 保持适度留白、对齐和清晰分组，使信息密度与内容复杂程度匹配，不以留白越多越好为目标；优先用原生 LaTeX 公式及二维矩阵表达技术。
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
PaperWhite 用于画布和普通模块；TextBlack 用于标题、正文、公式；DeepGray 用于次要文字；AcademicBlue 只用于少量重点文字和强调线；ModuleBlue 用于关键计算及阶段标题栏；NoteBlue 用于公式注释、参数与总结；BorderGray 用于外框及阶段分隔线；LineBlack 用于箭头和模块边框。
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
先根据计算依赖与布局结构选择方向，不预设竖版后强行排版：
- 纵向顺序计算、数学推导优先使用竖版 180mm × 240mm，比例 3:4。
- 多阶段计算流程、左右对比、双分支结构优先使用横版 240mm × 180mm，比例 4:3。
- 复杂模型全貌、多 GPU 数据流、跨模块同步可使用宽版 280mm × 140mm，比例 2:1。
geometry 配置以竖版为示例，实际选择对应尺寸；已加载共享样式时使用相应页面命令：
\usepackage[paperwidth=180mm,paperheight=240mm,margin=0mm]{geometry}
共享样式提供 \PaperCodePortrait、\PaperCodeLandscape、\PaperCodeWide，在 main.tex 的导言区为整组页面选择一种尺寸。
确需混用方向时，在同一主入口中显式处理逐页纸张尺寸并重排、验收；不在子图中调用仅用于导言区的页面命令，不因此默认拆成多个主文件。
margin=0mm 只定义画布；文字、公式、边框和箭头尖端距四边至少 10mm，计入节点内边距和实际高度。定义 \PaperSafeMargin=10mm 作为布局约定。
模块间距参考 6–10mm，有标签时适当增大。内容过多时先去重并重新组织，尝试多列、左右并列或对称布局，评估适合的横版或宽版；仍无法清晰呈现必要内容时才拆图。不使用全图缩放、压缩字体或强行塞入过多内容来减少页数。

六、TikZ 样式与连接规则
加载 \usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds}，定义：
\tikzset{
  basicblock/.style={draw=LineBlack,fill=PaperWhite,line width=0.65pt,
    rounded corners=2mm,inner sep=3mm,align=center},
  keyblock/.style={basicblock,fill=ModuleBlue},
  noteblock/.style={draw=none,fill=NoteBlue,rounded corners=2mm,
    inner sep=3mm,align=left},
  sectionbox/.style={
    draw=BorderGray,
    fill=none,
    dash pattern=on 2.5pt off 2pt,
    line width=0.5pt,
    rounded corners=3mm,
    inner sep=4mm
  },
  flowarrow/.style={-{Stealth[length=2.2mm]},draw=LineBlack,line width=0.75pt}
}
所有外层逻辑分组框统一复用 sectionbox，不创建多个含义相同的外框样式，不将 basicblock 或 keyblock 改成虚线；整套图片保持边框、圆角与填充含义一致。
分组框在背景层绘制，避免遮挡节点与连线，只表示逻辑分组，不表示计算步骤。复用的共享样式若仍含旧版实线 sectionbox，应在加载后用上述定义覆盖同名样式，其他模块与箭头的核心样式保持不变。

边框类型
1. 逻辑分组框（sectionbox）：用于包围多个相关内容模块，例如 GPT 输入与目标关系、训练集与验证集划分、两种损失汇总口径、Transformer 内部功能分区。采用浅灰色细虚线圆角矩形。
2. 普通计算模块（basicblock）：用于具体计算步骤，例如 GPT Model、Softmax、Flatten、Cross Entropy。采用白底、黑灰色细实线圆角矩形。
3. 关键计算模块（keyblock）：用于强调主要计算结果或核心公式。保持浅蓝色底纹和黑灰色细实线圆角边框。
4. 说明模块（noteblock）：用于参数解释、公式注释和技术总结。保持浅灰蓝背景，默认无边框。

连接线规则
- 计算流程连接线统一采用 flowarrow，使用黑色或深灰色实线。
- 优先使用水平、竖直及正交路径。
- 使用 TikZ 节点的 north、south、east、west 锚点连接模块。
- 保证数据流和计算顺序正确，不能为整齐改变计算顺序。
- 分支与合流关系必须明确，残差连接用绕开计算模块的路径与黑色加法节点。
- 不得穿过文字、公式或无关计算模块。
- 允许连接线跨越外层逻辑分组框，不允许为了避免穿框而删除、截断或改变必要的连接线。
计算流程自身的无意义交叉可在保持计算顺序的前提下通过布局调整消除；跨越分组边界不属于此类问题，按下述规则处理。

特别注意：外层虚线框是分组边界，不是流程终点。
当连接线必须从外部进入分组框时，必须保留完整连接路径，不得简单将线条截断在分组框内部或外部。

连接线与外框交叉
1. 当流程连接线穿过外层虚线框时，保持连接线连续。
2. 优先调整外框的虚线绘制相位（dash phase），避免虚线段与实线箭头在交叉点重叠。
3. 如果调整虚线相位仍无法消除明显冲突，可仅在交叉位置对分组边界做极小范围断开，不能断开连接线。
4. 不允许通过删除连接线、改变箭头方向或重新排列计算模块来掩盖交叉问题。
5. 不在穿越分组边界的位置额外增加箭头。
6. 保持外层虚线框完整的视觉轮廓，使读者仍能明确识别分组范围。

七、信息组织与多图拆分
层级为：主标题 → 核心技术图 → 公式和维度 → 必要说明。
标题简洁准确；相关公式、张量维度和说明紧邻对应模块，跨阶段参数与总结可放在灰蓝区；通过阶段分区或局部逻辑分组组织相关模块；子图编号 (a)、(b)、(c) 可选。

整体布局与信息密度
- 先梳理连续数据流、计算依赖和对比关系，优先保持完整计算流程，不因模块多直接拆页，不强制每页只有一个独立知识点。
- 优先利用页面宽度，连续流程可用多列布局，对比内容可左右并列，重复结构可上下或左右对称；跨列连接与计算顺序必须容易追踪。
- 避免一个简单公式或单独函数占据大半页，避免连续多页只有少量内容。
- 删除重复解释后，先重新组织剩余内容，避免大面积无意义空白；保持适度留白，不以留白越多越好为目标。
- 不为增加图片数量人为拆分完整计算过程，也不为减少图片数量压缩字体或强行塞入过多内容。

阶段式分区布局
多阶段流程可参考 PyTorch DDP 多 GPU 训练数据流的阶段组织方式：
- 各阶段顶部使用 ModuleBlue 浅蓝色标题栏，只承担阶段导航作用，不表示额外计算步骤。
- 阶段之间用浅灰色细虚线分隔；横向多列阶段可用竖向分隔线，复用 BorderGray、0.5pt 线宽和 on 2.5pt off 2pt 的虚线节奏。
- 阶段内部保持实线计算模块，关键步骤使用浅蓝色 keyblock，流程采用黑灰色实线 flowarrow。
- 必要时在底部设置 NoteBlue 横向总结区域，局部说明仍紧邻对应模块。
阶段分隔线不必闭合成圆角外框，不要求每个阶段套框；局部逻辑分组若使用完整外框，仍统一复用 sectionbox。穿越阶段分隔线时沿用第六部分的交叉规则，保持连接线完整，不在分界处额外增加箭头。

拆图条件
先尝试完整技术流程布局，再根据实际内容决定图片数量，不预先规定张数。相关计算过程只有在去重、重排并选择合适方向后，单页仍无法保持清晰的字体、公式和连接关系时，才进行拆图。
以下情况优先同页呈现：同一算法的连续步骤、同一模型的完整数据流、同一计算过程的多个阶段、需要直接比较的多个方案，以及存在明确数据依赖或箭头连接的相关模块。
以下情况可作为拆图依据：
1. 重新组织后单页仍出现明显的文字、公式或箭头拥挤。
2. 手机端无法辨认必要内容。
3. 不同部分能够形成独立且完整的知识主题，分开呈现更有利于理解。
4. 多个复杂推导同页呈现会削弱理解效果。
必须说明具体内容或可读性依据，不能只凭模块数量拆图；跨页标明承接的输入、输出和阶段关系，保持连续性，不为减少页数牺牲公式正确性或手机端可读性。

多张图默认属于同一个项目，由一个 main.tex 组织为多页 main.pdf，每页一张图，再按页导出 PNG；拆图不等于拆成多个独立主文件。
系列图统一页面尺寸、标题、字体、底纹、线宽、圆角和公式排版，信息密度与各页内容复杂程度匹配；不同方向须有明确理由。

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
优先复用已有 LaTeX 工程、main.tex、paper-code-style.tex 和可用图源码，检查后按需补充；已有样式符合规范时直接沿用，不重复创建工程或重写整套样式。
默认工程结构（以四张图为例，按实际主题调整文件名和数量）：
latex/
├── paper-code-style.tex
├── main.tex
├── figures/
│   ├── 01_topic_a.tex
│   ├── 02_topic_b.tex
│   ├── 03_topic_c.tex
│   └── 04_topic_d.tex
├── .build/
└── output/
    ├── main.pdf
    ├── 01_topic_a.png
    ├── 02_topic_b.png
    ├── 03_topic_c.png
    └── 04_topic_d.png
main.tex 是唯一主编译入口，包含 \documentclass 与 document 环境，在导言区用 \input{paper-code-style.tex} 加载共享样式。
共享样式统一字体、八种配色、字号、四类模块、箭头、标题和三种可选页面尺寸；整组只加载一次，避免每张重复定义。
多张图优先使用 \input{figures/01_topic_a.tex} 等方式按页组织；子图文件只包含该页的 TikZ / 页面主体，不重复写完整 document 或加载整套共享样式。
每张图占 PDF 的独立一页，相邻图页由 main.tex 用 \clearpage 分隔；子图不自行分页，避免同页叠图或意外空白页。使用 papercodepage 环境时，每个子图包含一个完整环境。
单张图任务仍使用 main.tex，只生成一页；内容很少时可直接把页面主体写在主文件中。
交付 main.tex、共享样式及所有被引用的子图源码，保证从 latex/ 编译即可生成完整 PDF，不依赖私有图片或未提供的资源。
如需最小样例，用 main.tex 加载 figures/01_transformer.tex，至少包含白色模块、浅蓝重点模块、灰蓝说明区、外层容器、数学公式与箭头；内容必须准确，明确示例的适用范围。
中间文件与待检查产物放 latex/.build/；验收后的整份 PDF 放 latex/output/main.pdf，PNG 按 PDF 页序导出，采用与图页对应的稳定文件名，如 01_topic_a.png。每页 PDF / PNG 对应一张图，保留页码、主题与文件名的映射。
仅当用户明确要求每张图单独交付、单独维护或单独编译时，才采用每张图一个独立主文件的模式，并继续复用共享样式；这不是默认模式。仅要求逐张提供 PNG 不触发该例外。
保留现有工程与用户修改，不覆盖无关内容，不自动 commit、push、部署或发布。

十一、编译、视觉验收与报告
1. 先完成全部技术图的可用源码版本，检查各页语法、符号、维度、运算顺序、偏置与参数统计，再集中进入编译和视觉验收。
2. 默认在 latex/ 中仅编译 main.tex：xelatex -interaction=nonstopmode -halt-on-error -file-line-error -output-directory=.build main.tex。需要时再次编译同一入口以稳定页面锚点和引用，不分别编译 figures/ 下的子图文件。
3. 检查日志中的错误、缺字、字体替代、Overfull/Underfull hbox 或 vbox。修复影响正确性和排版的问题。
4. 优先检查 .build/main.pdf，确认页数与计划图数一致、页序正确、每页恰好一张图，没有空白页；逐页检查尺寸、字体和内容边界。TikZ overlay 的越界未必产生 Overfull 警告，必须另查实际画面。
5. 从同一份 main.pdf 按页导出全部 PNG，不只导出首页。长边至少 2000px，建议 2400px；保持原始比例和白底，优先保证 PDF 矢量质量，核对 PNG 数量、页序与文件名映射。
6. 按 PDF 页序逐页打开对应 PNG，检查截断、重叠、箭头交叉与遮挡、上下标、中文缺字、对齐、圆角、填充及四周安全边距；再按约 375–430px 手机宽度检查阅读体验。验收对象是整份 PDF 的各页，不是多个独立 tex 主文件。
   - 检查外层逻辑分组框是否统一使用 sectionbox 虚线，内部计算模块是否保持实线。
   - 检查连接线跨越外框的位置是否存在明显线条叠加，必要的连接线是否完整，分支和合流关系是否正确。
   - 检查外层虚线框是否错误地遮挡箭头、文字或公式；不得在分组边界额外增加箭头。
   - 不允许为了修复视觉问题而改变原有技术计算顺序。
   - 检查是否存在大面积无意义空白，相关模块是否被不必要地拆到不同页面。
   - 检查能否通过横向布局减少页数，同时保持公式正确性和手机端可读性。
   - 检查完整计算流程是否容易追踪，各阶段是否有明确的视觉分组。
   - 检查信息密度是否与内容复杂程度匹配，是否因过度拆图导致页面之间缺乏连续性。
7. 集中记录问题，只对技术错误、编译阻塞或明显排版问题（如缺字、截断、重叠、越界、箭头遮挡、手机宽度下不可读）做必要修复；重新编译 main.tex 后，复查受影响页面及整份 PDF 的页数、页序。若修改共享样式，则复查全部页面。编译成功不能代替视觉验收。
8. 达到技术正确、页面完整和可读性要求后停止；不因主观美化偏好反复重排或无限制自动修复。同一问题修复无进展时停止自动重试，报告剩余问题与原因，不掩盖未通过项。
9. 验收后将 main.pdf 与全部按页命名的 PNG 放入 output/。最后列出文件路径、页码与 PNG 对应关系、技术修正与假设、编译及逐页视觉检查结果。如环境缺少编译器、字体或渲染器，给出具体缺失项与可运行命令，不声称已编译或已目视检查。

十二、我的绘图任务
主题：[填写]
技术材料（文字、代码、公式、截图或结构）：[粘贴或附上]
符号与输入输出形状：[填写；没有具体数值时用符号]
必须展示的步骤与结论：[填写]
内容是否已校验：[填写]
模型/实现版本与偏置、掩码、权重共享等约定：[按需填写]
期望方向与张数：[按计算依赖与布局结构选择方向；先尝试完整流程布局，不预设张数，必要时说明拆图依据]
已有工程与共享样式路径：[按需填写；存在时优先复用]
工程交付方式：[默认一个 main.tex + 多页 main.pdf + 按页 PNG；单张任务为一页 PDF]
额外限制：[填写或写“无”]
```

## 11. 使用示例 {#examples}

将下面任一任务描述附在第 10 节之后，不必改动通用风格规范。示例中的竖版要求仅适用于相应任务，不作为其他技术内容的默认方向。

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

对应源码见第 9 节，由 `latex/main.tex` 加载 `latex/figures/01_transformer.tex`；编译产物为一页的 `latex/output/main.pdf` 与 `latex/output/01_transformer.png`。

### 示例 B：注意力矩阵乘法的维度

```text
主题：无掩码的缩放点积自注意力；只画已完成分头后的计算，不表示完整因果模型。
输入：Q,K,V 的形状均为 (B,h,T,d_h)，令 S=QK^T/sqrt(d_h)。
K^T 只转置最后两轴，形状为 (B,h,d_h,T)。
P=Softmax(S)，沿最后一个键位置轴归一化；S,P 的形状为 (B,h,T,T)。
C=PV，形状为 (B,h,T,d_h)。
要求：用二维切片表示单个 batch 和 head，外框标注 B,h 分组；箭头上标明收缩维。
所有公式用 LaTeX，不能把注意力权重 P 标成 C 的形状；优先在一张图内串联打分、Softmax 与加权求和，先尝试横向或多列布局。只有重排后仍无法保持公式、维度和连线清晰且手机端可读时，才考虑拆成打分与加权求和两张，并标明跨页承接的 P。
若拆成两张，由同一个 main.tex 加载两页子图源码，生成两页 main.pdf，再分别导出 01_attention_scores.png 与 02_attention_context.png。
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

优先复用已有工程和共享样式，先完成全部技术图的可用源码版本，再集中编译 `main.tex`、检查整份 `main.pdf` 并逐页验收。不要在其他图页尚未完成时，为某一页反复编译和微调。

以下 PowerShell 命令从仓库根目录开始执行。先确认已安装包含 XeLaTeX、xeCJK、TikZ、Fandol 的 TeX 发行版，以及 `pdftoppm`、`pdfinfo`；不会自动安装或升级全局环境。`$figureNames` 按 `main.tex` 的实际图页顺序填写，不带扩展名；仓库最小示例只有一页，多图任务则列出全部图页名称。

```powershell
Set-Location latex
New-Item -ItemType Directory -Path .build, output -Force | Out-Null
$figureNames = @('01_transformer')
# 四页工程示例：@('01_topic_a', '02_topic_b', '03_topic_c', '04_topic_d')
xelatex '-interaction=nonstopmode' '-halt-on-error' '-file-line-error' '-output-directory=.build' main.tex
if ($LASTEXITCODE -ne 0) { throw 'XeLaTeX 编译失败，请检查日志。' }
xelatex '-interaction=nonstopmode' '-halt-on-error' '-file-line-error' '-output-directory=.build' main.tex
if ($LASTEXITCODE -ne 0) { throw 'XeLaTeX 第二次编译失败。' }
Select-String -Path .build/main.log -Pattern 'Overfull|Underfull|Missing character|Warning|Error'
pdfinfo .build/main.pdf
if ($LASTEXITCODE -ne 0) { throw 'PDF 信息读取失败。' }
# 每次使用新的待检查目录，避免将上次导出的旧页混入本次验收。
$renderDir = Join-Path '.build' ('render-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $renderDir | Out-Null
pdftoppm -png -scale-to 2400 .build/main.pdf (Join-Path $renderDir 'main')
if ($LASTEXITCODE -ne 0) { throw 'PNG 导出失败。' }
$pagePngs = @(Get-ChildItem -LiteralPath $renderDir -Filter 'main-*.png' -File |
  Sort-Object { [int]($_.BaseName -replace '^main-', '') })
if ($pagePngs.Count -ne $figureNames.Count) {
  throw 'PDF 导出页数与图页清单不一致，请检查漏页、叠页或空白页。'
}
$pagePngs.FullName
```

两次编译均针对同一个 `main.tex`，用于稳定 `remember picture` 页面锚点，不分别编译子图。批量导出时不使用 `-singlefile`，由 `pdftoppm` 生成带页码的 PNG，并按数字页码排序，避免第 10 页排在第 2 页前面。检查日志与 `.build/main.pdf` 后，按 `$pagePngs` 顺序逐页打开 PNG，核对页码、主题和 `$figureNames` 的映射：

- PDF 页数与计划图数、PNG 数量一致，每页恰好一张图，页序正确，无意外空白页或叠图。
- 页面方向与计算依赖、布局结构一致，按所选的 180 × 240 mm、240 × 180 mm 或 280 × 140 mm 核对比例；竖版示例的 PNG 约为 1800 × 2400 px，PDF 点数取整可能使宽度多 1 px。其他方向按该页实际比例检查。
- 中文、英文、公式和上下标无缺字，字号层级清楚，填充和边框符合规范。
- 外层逻辑分组框统一复用 `sectionbox` 并使用虚线，内部计算模块保持实线。
- 连接线跨越外框的位置无明显线条叠加，必要的连接线完整，分支和合流关系正确。
- 外层虚线框不遮挡箭头、文字或公式，分组边界没有额外箭头。
- 不允许为了修复视觉问题而改变原有技术计算顺序。
- 模块、公式与安全边距无冲突，箭头不穿过文字；第 9 节示例的恒等分支准确接到加法节点。
- 各页权重、偏置和中间张量维度一致；第 9 节示例的局部范围与无 Dropout 约定可见。
- 在原始大小及约 375–430 px 宽的手机预览下检查；不要靠高分辨率掩盖拥挤排版。

整体布局还须检查：

- 页面是否存在大面积无意义空白。
- 相关模块是否被不必要地拆到不同页面。
- 是否可以通过横向布局减少页数。
- 计算流程是否完整且容易追踪。
- 各阶段是否有明确的视觉分组。
- 页面信息密度是否与内容复杂程度匹配。
- 是否因为过度拆图导致图片之间缺乏连续性。

不为减少页数牺牲公式正确性或手机端可读性；需要拆图时，应能说明具体内容或可读性依据。

`overlay` 定位超出页面时，TeX 不一定报告 `Overfull \hbox`。因此日志、PDF 元数据与实际 PNG 目视检查缺一不可。先集中记录全组问题，再对技术错误、编译阻塞或明显排版问题（缺字、截断、重叠、越界、箭头遮挡、手机宽度下不可读等）定向修复；重新编译 `main.tex`、按页导出，并复查受影响页面及整份 PDF 的页数和页序。修改共享样式后须复查全部页面。

达到技术正确、页面完整和可读性要求后停止，不为主观美化反复重排，也不进行无限制的自动修复。同一问题修复无进展时停止自动重试，报告剩余问题与原因；未通过项不能标记为验收通过。

逐页验收通过后，在同一个 PowerShell 会话中继续，将整份 PDF 与按主题命名的 PNG 复制为正式输出：

```powershell
Copy-Item -LiteralPath .build/main.pdf -Destination output/main.pdf
for ($i = 0; $i -lt $pagePngs.Count; $i++) {
  $targetPng = Join-Path 'output' ($figureNames[$i] + '.png')
  Copy-Item -LiteralPath $pagePngs[$i].FullName -Destination $targetPng
}
Set-Location ..
```

若同时修改本博客页面或其引用的模板，再从仓库根目录运行 `npm.cmd run docs:build`，检查文档构建。

正式交付以 `output/main.pdf` 为主，每页对应一张 PNG；单图任务沿用同一流程，只生成一页。保留矢量 PDF，PNG 长边至少 2000 px；截图不能替代 PDF 源文件。交付时列出 `main.tex`、共享样式、子图源码和产物，说明 PDF 页码与 PNG 文件名的对应关系、实际逐页检查结果、必要假设与技术修正；工具缺失时说明未完成的检查，不将“提供了命令”写成“验证通过”。
