---
title: "GPT-2 第 7 章：指令微调学习笔记与问题整理"
slug: chapter-07-instruction-finetuning
category: llm
book: llms-from-scratch
chapter: 7
chapterTitle: 指令微调
published: '2026-11-20'
updated: '2026-11-20'
status: completed
tags:
  - GPT-2
  - PyTorch
  - Instruction Fine-Tuning
  - DataLoader
draft: false
---
# 《从零构建大模型》第 7 章：GPT-2 指令微调学习笔记与问题整理

> 本笔记根据本次会话的阅读、代码识别和逐次提问整理。重点不是逐页复述，而是记录**学习过程中真正提出的问题、产生疑惑的原因、相应代码和结论**。
>
> 书中示例：1100 条指令样本；训练集 935 条、验证集 55 条、测试集 110 条；`batch_size=8`；GPT-2 指令微调使用 355M 模型。代码中的演示 Token ID（如 10、20、30）只是帮助理解的假设数值。

## 一、全流程总览

```text
下载 instruction-data.json（1100 条）
          ↓
字典：instruction / input / output
          ↓
format_input(entry) → Alpaca 风格提示词
          ↓
划分 train / val / test（935 / 55 / 110）
          ↓
InstructionDataset：格式化、编码、缓存 Token ID 列表
          ↓
DataLoader：索引采样 → 按 batch_size 收集样本
          ↓
customized_collate_fn(batch)
    ├─ 补结束 Token（50256）
    ├─ 动态 Padding 到当前批次最大长度
    ├─ inputs = padded[:-1]
    ├─ targets = padded[1:]
    ├─ 多余 target 填充位置设为 -100
    └─ torch.stack → [B,T]、[B,T]
          ↓
加载 GPT-2 预训练权重（355M）
          ↓
初始损失 → AdamW 监督微调 → 训练/验证损失曲线
          ↓
生成测试集回复 → JSON 保存回复 → 保存 .pth 模型状态
```

---

## 二、数据集下载、字典结构与提示词格式

### 1. 下载与加载

```python
import json
import os
import urllib.request


def download_and_load_file(file_path, url):
    if not os.path.exists(file_path):
        with urllib.request.urlopen(url) as response:
            text_data = response.read().decode("utf-8")
        with open(file_path, "w", encoding="utf-8") as file:
            file.write(text_data)

    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return data


file_path = "instruction-data.json"
url = (
    "https://raw.githubusercontent.com/rasbt/LLMs-from-scratch"
    "/main/ch07/01_main-chapter-code/instruction-data.json"
)
data = download_and_load_file(file_path, url)
print("Number of entries:", len(data))  # 1100
```

- `data` 类型：`list`；包含 1100 个元素。
- `data[50]` 类型：`dict`；一个字典代表一条样本。
- 字典字段：`instruction`（任务要求）、`input`（可选额外输入）、`output`（期望回复）。

### 2. Alpaca 格式化函数

```python
def format_input(entry):
    instruction_text = (
        f"Below is an instruction that describes a task. "
        f"Write a response that appropriately completes the request."
        f"\n\n### Instruction:\n{entry['instruction']}"
    )
    input_text = (
        f"\n\n### Input:\n{entry['input']}" if entry["input"] else ""
    )
    return instruction_text + input_text


model_input = format_input(data[50])
desired_response = f"\n\n### Response:\n{data[50]['output']}"
print(model_input + desired_response)
```

**问：`input` 为空时会怎样？**

答：`if entry["input"] else ""` 会让 `input_text` 成为空字符串，不出现 `### Input:` 这一小节。`format_input()` 本身**不包含 `output`**；训练数据集稍后再把 `### Response:` 与 `output` 拼接进去。

### 3. 划分数据集

```python
train_portion = int(len(data) * 0.85)
test_portion = int(len(data) * 0.1)
val_portion = len(data) - train_portion - test_portion

train_data = data[:train_portion]
test_data = data[train_portion:train_portion + test_portion]
val_data = data[train_portion + test_portion:]
```

| 数据集 | 数量 | 比例 |
|---|---:|---:|
| 训练集 | 935 | 85% |
| 验证集 | 55 | 5% |
| 测试集 | 110 | 10% |

`data[a:b]` 包含索引 `a`，不包含 `b`。这里按原始顺序切片；若原始数据具有顺序偏差，实际项目中通常应先考虑随机化或分层切分。

---

## 三、`InstructionDataset`：你问过的数据类型与取样过程

```python
from torch.utils.data import Dataset

class InstructionDataset(Dataset):
    def __init__(self, data, tokenizer):
        self.data = data
        self.encoded_texts = []
        for entry in data:
            instruction_plus_input = format_input(entry)
            response_text = f"\n\n### Response:\n{entry['output']}"
            full_text = instruction_plus_input + response_text
            self.encoded_texts.append(tokenizer.encode(full_text))

    def __getitem__(self, index):
        return self.encoded_texts[index]

    def __len__(self):
        return len(self.data)
```

### Q1. `tokenizer.encode(full_text)` 返回张量吗？

**不是。** 这里使用 `tiktoken`，`encode()` 返回 `list[int]`，每个元素是一个整数 Token ID。例如（示意）：`[10, 20, 30]`。要成为张量需显式 `torch.tensor(...)`。

### Q2. `self.encoded_texts` 是什么类型？

它是 Python 列表，其中每个元素也是 Token ID 列表：

```python
self.encoded_texts = [
    [10, 20, 30, 40],
    [50, 60],
    [70, 80, 90]
]
```

不同子列表长度可以不同，**这不是规则二维 Tensor**。

### Q3. `return self.encoded_texts[index]` 返回什么？

返回**一个样本的完整 Token ID 序列**，而不是一个 Token，也不是一个批次。

```python
dataset[1]  # 等价于 dataset.__getitem__(1)
# → [50, 60]
```

这个样本包含格式化后的 instruction、非空 input 和 output 的所有 Token ID。

### Q4. 为什么 `dataset[index]` 不需要显式写 `dataset.__getitem__(index)`？

Python 的索引语法 `dataset[index]` 会调用特殊方法 `__getitem__`。`DataLoader` 也会借助 Dataset 提供的索引访问接口提取样本。

### Q5. `__init__` 与 `__getitem__` 何时执行？

- `InstructionDataset(train_data, tokenizer)`：**立即执行 `__init__`**，编码并缓存所有训练样本。
- `train_dataset[i]` 或 DataLoader 读取某个索引：执行 `__getitem__`，取出已经缓存的列表。
- `len(train_dataset)`：执行 `__len__`。

---

## 四、同一批次为什么需要相同的序列长度？

### Q6. 不同样本长度不同，会发生什么？

假设同一批次有：

```python
batch = [[10, 20, 30, 40], [50, 60], [70, 80, 90]]
```

不能直接用 `torch.tensor(batch)` 创建规则的 `[3,T]` 张量，因为三行长度分别为 4、2、3。对当前这套**常规密集 Tensor + GPT 批量前向计算**流程，必须让批次内的每行长度一致。

### Q7. 怎么解决？

使用 Padding，例如将较短序列填充到当前批次最长长度：

```text
[10, 20, 30, 40]
[50, 60, 50256, 50256]
[70, 80, 90, 50256]
```

这些 Token ID 列表现在可以堆叠成 `[B,T] = [3,4]`。

### Q8. 不同批次的 `T` 必须一样吗？

**不需要。** 例如第一批 `[8,61]`，第二批 `[8,76]`，第三批 `[8,73]` 都可以。当前实现是**批次内动态 Padding**。注意各批次长度仍须在模型允许的上下文范围内。

### Q9. `50256` 是什么？

GPT-2 分词器把 `<|endoftext|>` 识别为特殊 Token，其 ID 为 50256：

```python
import tiktoken
tokenizer = tiktoken.get_encoding("gpt2")
print(tokenizer.encode("<|endoftext|>", allowed_special={"<|endoftext|>"}))
# [50256]
```

这里 `allowed_special` 告诉分词器把它作为特殊 Token 处理，而非普通文本片段。

---

## 五、`custom_collate_fn`：你提问最多的核心部分

### 最终版本代码

```python
import torch

def custom_collate_fn(
    batch,
    pad_token_id=50256,
    ignore_index=-100,
    allowed_max_length=None,
    device="cpu"
):
    batch_max_length = max(len(item) + 1 for item in batch)
    inputs_lst, targets_lst = [], []

    for item in batch:
        new_item = item.copy()
        new_item += [pad_token_id]
        padded = (
            new_item + [pad_token_id] *
            (batch_max_length - len(new_item))
        )

        inputs = torch.tensor(padded[:-1])
        targets = torch.tensor(padded[1:])

        mask = targets == pad_token_id
        indices = torch.nonzero(mask).squeeze()
        if indices.numel() > 1:
            targets[indices[1:]] = ignore_index

        if allowed_max_length is not None:
            inputs = inputs[:allowed_max_length]
            targets = targets[:allowed_max_length]

        inputs_lst.append(inputs)
        targets_lst.append(targets)

    inputs_tensor = torch.stack(inputs_lst).to(device)
    targets_tensor = torch.stack(targets_lst).to(device)
    return inputs_tensor, targets_tensor
```

> **精确性备注：**上面保留书中写法。若 `indices` 只包含一个位置，`.squeeze()` 可能产生 0 维张量；书中 `if indices.numel() > 1` 避开了对这种情况切片，但更直观稳健的索引形式是 `torch.nonzero(mask).squeeze(1)`。这里的遮罩逻辑还假定原始有效 Token 中不夹杂需要保留的 50256。

### Q10. 输入参数 `batch` 是什么类型？

对当前 `InstructionDataset` 而言，DataLoader 常规调用聚合函数时传入一个 **Python 列表，里面是多个 Token ID 列表**，即 `list[list[int]]`。

```python
batch = [[10, 20, 30, 40], [50, 60], [70, 80, 90]]
```

书中手动测试则使用 `batch = (inputs_1, inputs_2, inputs_3)`，其类型为 **tuple**；这个函数只遍历 `batch`，所以列表和元组都可以。

### Q11. `len(item) + 1` 为什么要加 1？

代码：

```python
batch_max_length = max(len(item) + 1 for item in batch)
```

为了预留一个额外 Token，作为**原始序列最后一个 Token 的下一词元预测目标**。这也让原始序列全部 Token 都能够出现在 `inputs` 里。

示例：

```text
原始 item:      [10, 20, 30, 40]
额外添加结束符: [10, 20, 30, 40, 50256]
inputs:         [10, 20, 30, 40]
targets:        [20, 30, 40, 50256]
```

### Q12. `new_item += [pad_token_id]` 为什么要先加一个？

**先加的一个 50256**，在没有截断的情况下，用作该样本的结束标记目标；而**后续加的多个 50256** 用来补齐批次长度。两处 ID 相同，但训练角色不同。

```python
new_item = item.copy()         # 避免修改 Dataset 缓存的原始列表
new_item += [pad_token_id]     # 额外追加一个结束标记
```

### Q13. `padded = (...)` 是元组吗？

**不是。** 外层括号只帮助跨行书写表达式，结果仍是列表：

```python
padded = (
    new_item + [pad_token_id] *
    (batch_max_length - len(new_item))
)
# 类型：list
```

Python 元组的关键通常是逗号，不是单纯的圆括号，例如 `(1,)` 是单元素元组，而 `(1)` 是整数。

### Q14. `padded[:-1]` 和 `padded[1:]` 分别是什么？

```python
inputs = torch.tensor(padded[:-1])
targets = torch.tensor(padded[1:])
```

- `[:-1]`：去掉末尾一个 Token，构造输入。
- `[1:]`：去掉开头一个 Token，构造目标。
- `targets` 相比 `inputs` 在**序列内容上左移一位**，使每个位置学习预测下一个 Token。

### Q15. 最长样本的 `inputs` 里可能没有 50256 吗？

**对。** 如果最长样本原始编码中没有 50256，新增的 50256 会位于 `padded` 的最后一位，又被 `padded[:-1]` 切掉，所以它的 `inputs` 没有 50256；但 `targets` 最后一个位置仍有 50256。

```text
padded:  [10, 20, 30, 40, 50256]
inputs:  [10, 20, 30, 40]
targets: [20, 30, 40, 50256]
```

这并不矛盾：`mask` 处理的是目标 `targets` 而非 `inputs`。

### Q16. `inputs_lst` 是列表吗？里面是什么？

**是 Python 列表。** 里面每一项是一个形状 `[T]` 的一维 PyTorch 张量：

```python
inputs_lst = [
    torch.tensor([10, 20, 30]),
    torch.tensor([40, 50, 60])
]
```

### Q17. `torch.stack(inputs_lst)` 做了什么？

沿着**新的维度**堆叠形状相同的张量。默认 `dim=0`：

```python
torch.stack(inputs_lst)    # 两个 [3] → 一个 [2,3]
```

`torch.stack` 可以接收装有 Tensor 的 Python 列表，但每个 Tensor 形状必须相同。

### Q18. `mask = targets == pad_token_id` 的类型、元素与维度？

`targets` 是单个样本的 `[T]` 一维整数 Tensor；比较之后 `mask` 是**同形状 `[T]` 的一维布尔 Tensor**，`dtype=torch.bool`。

```python
targets = torch.tensor([6, 50256, 50256, 50256])
mask = targets == 50256
# tensor([False, True, True, True])
# shape: [4], dtype: torch.bool
```

### Q19. `torch.nonzero(mask)` 返回什么？

返回非零（对布尔张量即 `True`）位置的**坐标张量**。对于 `[T]` 一维 mask，形状为 `[K,1]`，K 是 True 的个数：

```python
mask = torch.tensor([False, True, True, False, True])
torch.nonzero(mask)
# tensor([[1],
#         [2],
#         [4]])      shape [3,1]
```

### Q20. `.squeeze()` 做了什么？

移除大小为 1 的维度，通常 `[K,1]` → `[K]`：

```python
torch.nonzero(mask).squeeze()
# tensor([1, 2, 4])，形状 [3]
```

特别注意：K=1 时，直接 `.squeeze()` 会变成**0 维 Tensor**；若需要始终保留 `[K]`，使用 `.squeeze(1)`。

### Q21. `targets[indices[1:]] = ignore_index` 做了什么？

保留第一个 50256，后续所有 50256 对应的**目标位置**设成 `-100`：

```python
targets = torch.tensor([6, 50256, 50256, 50256])
indices = torch.tensor([1, 2, 3])
targets[indices[1:]] = -100
# tensor([6, 50256, -100, -100])
```

- `indices[1:]` 取得第 2 个及其后的匹配位置索引。
- `targets[indices[1:]]` 是张量的高级索引操作。
- `-100` 是 `torch.nn.functional.cross_entropy()` 默认忽略的目标标签值。

### Q22. 为什么要保留第一个 50256？

因为它是模型要学习预测的结束标记；其余只是补齐批次的冗余位置，不应贡献损失。

### Q23. `allowed_max_length` 做什么？

```python
if allowed_max_length is not None:
    inputs = inputs[:allowed_max_length]
    targets = targets[:allowed_max_length]
```

截取前面最多 `allowed_max_length` 个 Token。本章的 GPT-2 配置为 `context_length=1024`，因此使用 `allowed_max_length=1024`。若长样本被截断，额外添加的结束 Token 可能也被截掉；它不会凭空被强行保留到截断后的最后位置。

### 用一次完整运行串起上述问题

```python
batch = [
    [0, 1, 2, 3, 4],
    [5, 6],
    [7, 8, 9]
]
inputs, targets = custom_collate_fn(batch)
```

`inputs`：

```text
tensor([[    0,     1,     2,     3,     4],
        [    5,     6, 50256, 50256, 50256],
        [    7,     8,     9, 50256, 50256]])
```

`targets`：

```text
tensor([[    1,     2,     3,     4, 50256],
        [    6, 50256,  -100,  -100,  -100],
        [    8,     9, 50256,  -100,  -100]])
```

两者形状都是 `[B,T]=[3,5]`。

---

## 六、`DataLoader` 内部执行：你反复追问的关键

### 代码

```python
from functools import partial
from torch.utils.data import DataLoader

customized_collate_fn = partial(
    custom_collate_fn,
    device=device,
    allowed_max_length=1024
)

batch_size = 8
num_workers = 0

train_dataset = InstructionDataset(train_data, tokenizer)
train_loader = DataLoader(
    train_dataset,
    batch_size=batch_size,
    collate_fn=customized_collate_fn,
    shuffle=True,
    drop_last=True,
    num_workers=num_workers
)

val_dataset = InstructionDataset(val_data, tokenizer)
val_loader = DataLoader(
    val_dataset,
    batch_size=batch_size,
    collate_fn=customized_collate_fn,
    shuffle=False,
    drop_last=False,
    num_workers=num_workers
)
```

### Q24. `partial(...)` 是什么？

它**预先绑定一部分函数参数**，生成新的可调用对象，但此时不执行函数：

```python
customized_collate_fn(batch)
# 等效于
custom_collate_fn(batch, device=device, allowed_max_length=1024)
```

这是为了让 DataLoader 只需传入 `batch` 即可调用聚合函数。

### Q25. 创建 `DataLoader(...)` 时数据已经全部分批了吗？

**没有。** 创建加载器主要是配置数据源、批次大小、采样规则、聚合函数和工作进程数。实际的取样与批次处理发生在迭代时。

### Q26. DataLoader 内部按什么顺序调用？

在本章的 map-style Dataset、`num_workers=0` 情况下，可理解成：

```text
创建 train_loader
    ↓
开始 for inputs, targets in train_loader
    ↓
创建迭代器，按 shuffle 规则确定索引读取顺序
    ↓
按 batch_size=8 收集一组索引
    ↓
按照索引取得 8 个 Dataset 样本（通常用 __getitem__）
    ↓
得到 batch：8 个 list[int] 构成的列表
    ↓
调用 customized_collate_fn(batch)
    ↓
返回两个 Tensor：[8,T] 和 [8,T]
    ↓
继续下一批
```

下面是**解释原理的简化伪代码**，不是 PyTorch 实际源码：

```python
indices = [3, 0, 4, 1, 2]    # 假设随机排列后
batch_size = 2

for start in range(0, len(indices), batch_size):
    batch_indices = indices[start:start + batch_size]
    if len(batch_indices) < batch_size:
        continue               # drop_last=True
    batch = [dataset[i] for i in batch_indices]
    inputs, targets = customized_collate_fn(batch)
```

### Q27. 随机索引何时生成：创建 DataLoader 时，还是遍历时？

**在遍历过程中采样/生成读取顺序，不是在创建 DataLoader 时一次性固定所有 Epoch 的随机索引。** `shuffle=True` 配置在创建时指定；每轮新迭代通常产生新的随机顺序。

```python
for epoch in range(2):
    for inputs, targets in train_loader:
        ...  # 两轮读取顺序通常不同
```

技术细节：具体随机采样器可能按需迭代而不是提前完整物化索引列表；这里的关键是**随机顺序并非创建 DataLoader 时永久固定**。

### Q28. 这里一轮有多少批？

训练集 935 条，`batch_size=8`，`drop_last=True`：

```text
935 = 8 × 116 + 7
```

所以一轮得到 116 个完整批次，最后 7 个样本在**该轮**被舍弃；下一轮由于重新打乱，未被包含的样本未必还是同样 7 个。

### Q29. `shuffle=True/False` 的具体作用？

- 训练集 `shuffle=True`：每次重新迭代时顺序通常变化。
- 验证集 `shuffle=False`：按相同索引顺序读取，更便于对比不同训练步骤的验证损失。
- `drop_last=False`：验证集末批不足 8 也保留，所以 55 条样本是 7 批（最后一批 7 条）。

### Q30. `collate_fn` 必须返回两个 Tensor 吗？

**不必须。** 它可以返回张量、元组、字典等。只是这段代码专门返回 `(inputs_tensor, targets_tensor)`，因此训练时可写：

```python
for inputs, targets in train_loader:
    ...
```

### Q31. 为什么不同批次的形状会不同？

因为当前批次以最长样本为准动态填充；示例：

```text
torch.Size([8, 61])
torch.Size([8, 76])
torch.Size([8, 73])
```

这里 `8` 是 Batch 维度，`61/76/73` 是 Token 序列长度；不是 Embedding 特征维度。

---

## 七、交叉熵、`-100` 与训练/验证损失

### Q32. 为什么 `-100` 可以被忽略？

`torch.nn.functional.cross_entropy` 的默认参数是 `ignore_index=-100`（用于整数类别目标）。目标位置为 `-100` 时，该位置不贡献损失；默认 `reduction="mean"` 会按**非忽略位置**进行平均。

```python
import torch
import torch.nn.functional as F

logits_1 = torch.tensor([[-1.0, 1.0], [-0.5, 1.5]])
targets_1 = torch.tensor([0, 1])
loss_1 = F.cross_entropy(logits_1, targets_1)  # 约 1.1269

logits_2 = torch.tensor([[-1.0, 1.0], [-0.5, 1.5], [-0.5, 1.5]])
targets_2 = torch.tensor([0, 1, 1])
loss_2 = F.cross_entropy(logits_2, targets_2)  # 约 0.7936

targets_3 = torch.tensor([0, 1, -100])
loss_3 = F.cross_entropy(logits_2, targets_3)  # 约 1.1269
```

所以第三个目标设为 `-100` 后，损失与只使用前两个有效目标相同。

### Q33. 验证集多次算 Loss，用的是同样批次吗？

本章的 `val_loader` 使用 `shuffle=False`。只要数据集、批大小、聚合规则不变，`calc_loss_loader(val_loader, ..., num_batches=5)` 每次读取前 5 批，即相同的前 40 个验证样本。

即使样本相同，模型权重训练中会更新，所以验证 Loss 可以变化。评估时通常切换 `model.eval()`，避免 Dropout 随机性。

### Q34. 那训练集 Loss 也会有“每次样本不同”的问题吗？

**会，这正是本次会话发现的重要问题。** `train_loader` 使用 `shuffle=True`，而 `calc_loss_loader(train_loader, ..., num_batches=5)` 只检查前 5 批；每次重新遍历，选中的前 40 个训练样本通常不同。

因此训练损失变化有两类来源：

1. 模型参数更新，预测发生变化。
2. 评估样本变动，样本难度不同产生统计波动。

这种训练 Loss 能反映大体学习趋势，但**不是对同一固定训练子集做的严格逐次对比**。

### Q35. 若希望训练损失每次可严格比较，如何处理？

额外创建一个 `shuffle=False` 的训练评估加载器，训练本身仍然使用 `shuffle=True`：

```python
train_eval_loader = DataLoader(
    train_dataset,
    batch_size=8,
    collate_fn=customized_collate_fn,
    shuffle=False,
    drop_last=False,
    num_workers=0
)

train_loss = calc_loss_loader(
    train_eval_loader, model, device, num_batches=5
)
```

这样每次评估都使用相同的前 40 个训练样本。更全面的方案是评估全部训练集，但计算量也更大。

### Q36. `calc_loss_loader` 中 `num_batches=5` 代表什么？

每次最多处理 5 个批次，不是 5 个样本。若批次大小为 8，则一般是 40 个样本；若最后一批不足 8，样本数可能更少。`eval_iter=5` 是训练代码将这个数量传给评估逻辑的配置。

### Q37. 每批 Loss 再取平均是否等于所有 Token 的平均 Loss？

不一定。如果每批有效 Token 数不等，**批次等权平均**与**所有有效 Token 等权平均**不同。本章 `-100` 会让每批的有效 Token 数更加不均匀。若需要精确总体 Token 平均损失，应按每批的有效目标 Token 数加权。

---

## 八、模型结构、加载预训练权重与微调

### Q38. GPT-2 从 124M 换成 355M，模型不也应该变化吗？

**是的，模型结构规模变化。** 不变的是 GPT-2 Transformer 架构范式和 `GPTModel` 这份可配置的类定义；实例的层数、宽度和权重形状会发生变化。

| 配置 | Small 124M | Medium 355M |
|---|---:|---:|
| `vocab_size` | 50257 | 50257 |
| `context_length` | 1024 | 1024 |
| `emb_dim` | 768 | 1024 |
| `n_layers` | 12 | 24 |
| `n_heads` | 12 | 16 |
| 每头维度 | 64 | 64 |
| 词嵌入权重 | `[50257,768]` | `[50257,1024]` |

同一个类通过 `config` 创建不同规模的网络：

```python
BASE_CONFIG = {
    "vocab_size": 50257,
    "context_length": 1024,
    "drop_rate": 0.0,
    "qkv_bias": True
}

model_configs = {
    "gpt2-small (124M)": {"emb_dim": 768, "n_layers": 12, "n_heads": 12},
    "gpt2-medium (355M)": {"emb_dim": 1024, "n_layers": 24, "n_heads": 16},
    "gpt2-large (774M)": {"emb_dim": 1280, "n_layers": 36, "n_heads": 20},
    "gpt2-xl (1558M)": {"emb_dim": 1600, "n_layers": 48, "n_heads": 25}
}

CHOOSE_MODEL = "gpt2-medium (355M)"
BASE_CONFIG.update(model_configs[CHOOSE_MODEL])
model_size = CHOOSE_MODEL.split(" ")[-1].lstrip("(").rstrip(")")

settings, params = download_and_load_gpt2(model_size=model_size, models_dir="gpt2")
model = GPTModel(BASE_CONFIG)
load_weights_into_gpt(model, params)
model.eval()
```

`load_weights_into_gpt` 加载的是与当前**模型结构相匹配**的预训练权重，不能把 124M 对应形状的权重直接塞入 355M 的网络。

### Q39. 微调前为什么计算训练集、验证集初始损失？

作为基线：

```python
model.to(device)
torch.manual_seed(123)
with torch.no_grad():
    train_loss = calc_loss_loader(train_loader, model, device, num_batches=5)
    val_loss = calc_loss_loader(val_loader, model, device, num_batches=5)
```

书中的参考输出为 Train loss ≈ 3.8259，Val loss ≈ 3.7619。注意这里只评估各 5 个批次，不代表整份数据集的严格总体损失。

### Q40. 微调训练的关键参数是什么？

```python
optimizer = torch.optim.AdamW(
    model.parameters(), lr=0.00005, weight_decay=0.1
)
num_epochs = 2

train_losses, val_losses, tokens_seen = train_model_simple(
    model, train_loader, val_loader, optimizer, device,
    num_epochs=num_epochs, eval_freq=5, eval_iter=5,
    start_context=format_input(val_data[0]), tokenizer=tokenizer
)
```

- `num_epochs=2`：完整遍历训练加载器 2 轮。
- `eval_freq=5`：训练的全局步数每隔 5 步评估一次（包含第 0 步）。
- `eval_iter=5`：训练/验证评估都只取最多 5 批。
- `tokens_seen`：到评估点为止累计处理的**输入 Token 数**；它是训练处理量，不表示有效目标数或去 Padding 后的 Token 数。
- `AdamW`：优化模型参数。

### Q41. `epochs_tensor = torch.linspace(...)` 有什么用？

```python
from chapter05 import plot_losses

epochs_tensor = torch.linspace(0, num_epochs, len(train_losses))
plot_losses(epochs_tensor, tokens_seen, train_losses, val_losses)
```

`linspace(0, 2, N)` 产生 N 个等间距坐标，用于把损失评估点映射到横轴 `Epochs`；`tokens_seen` 为第二条横轴提供累计 Token 量。它是画图坐标，**不直接参与训练**。严格说均匀插值的 epoch 坐标不一定逐点精确对应评估时刻的实际训练进度。

---

## 九、生成回复、字符串处理与保存模型

### Q42. `.strip()` 是干什么的？

删除字符串**开头和结尾**的空格、换行、制表符等，不会删除内部的空白：

```python
"\n  Hello World  \n".strip()  # 'Hello World'
```

```python
response_text = generated_text[len(input_text):].strip()
```

这里先去掉输入提示词对应的前缀字符，再清理剩余回复的首尾空白。

### Q43. `generated_text[len(input_text):]` 为什么能去掉输入？

书中 `generate()` 返回的是**输入 Token + 新生成 Token** 的整个序列；解码后得到提示词与回复拼在一起的字符串。这里用输入提示词的字符长度切去前缀。在当前示例中可这样使用；更通用的实现可以按输入 Token 长度切掉前缀 Token，再独立解码生成部分，以减少字符串边界的潜在问题。

### Q44. `tqdm(enumerate(test_data), total=len(test_data))` 是什么？

- `enumerate(test_data)`：迭代产生 `(i, entry)`，同时得到索引和样本。
- `tqdm(...)`：包装迭代器，显示进度条。
- `total=len(test_data)`：显式告诉 tqdm 总共应处理 110 条样本；因为 `enumerate` 对象通常没有可直接供 tqdm 使用的长度。

```python
from tqdm import tqdm
for i, entry in tqdm(enumerate(test_data), total=len(test_data)):
    ...
```

### Q45. `test_data[i]["model_response"] = response_text` 修改了什么？

在第 `i` 个样本字典中增加（或更新） `model_response` 键：

```python
{
    "instruction": "Rewrite the sentence using a simile.",
    "input": "The car is very fast.",
    "output": "The car is as fast as lightning.",
    "model_response": "The car is as fast as a bullet."
}
```

这个操作是更新列表中该字典的内容，而不是新建另一份 `test_data`。

### Q46. `json.dump(..., indent=4)` 的作用？

把 Python 数据结构序列化到 JSON 文件；`indent=4` 指每层缩进 4 个空格，使文件便于人工查看。书中输出文件名为 `instruction-data-with-response.json`。

### Q47. `re.sub(r'[ ()]', '', CHOOSE_MODEL)` 做了什么？

正则替换：把模型名中的**空格、左括号、右括号**全部替换为空字符串：

```python
import re
CHOOSE_MODEL = "gpt2-medium (355M)"
file_name = f"{re.sub(r'[ ()]', '', CHOOSE_MODEL)}-sft.pth"
# 'gpt2-medium355M-sft.pth'
```

`-sft` 表示监督微调；`.pth` 是 PyTorch 中常用的模型文件扩展名。

### Q48. `model.state_dict()` 与 `torch.save()` 保存了什么？

```python
torch.save(model.state_dict(), file_name)
```

保存模型的**参数张量和持久化缓冲区**的状态字典，不是完整模型类定义。重新使用时先创建**结构匹配**的模型对象，再加载：

```python
# 已创建与保存时结构相同的 model
state = torch.load("gpt2-medium355M-sft.pth", map_location="cpu", weights_only=True)
model.load_state_dict(state)
```

`weights_only=True` 是更稳妥的状态字典加载方式（支持它的 PyTorch 版本中）。

---

## 十、此前解释中最值得注意的五个边界

1. **“同一批次长度一定一样”是针对本项目的常规密集 Tensor 训练流程。** 并不意味着所有张量技术都完全不能处理变长序列；也存在单样本处理、packed/ragged 等专门方案。
2. **`50256` 与 `-100` 不是同一回事。** `50256` 是 GPT-2 词表内的实际 Token ID；`-100` 是交叉熵的忽略标签，不能拿它去做模型的词嵌入索引。
3. **最长样本的输入可能没有 50256。** 结束符作为最后一个 *target* 仍然存在；较短样本的 inputs 中可能包含用于补齐的 50256。
4. **训练集的部分批次评估有采样波动。** `shuffle=True` 且只取前 5 批，所以同一个 `train_loader` 重新迭代时，前 5 批样本通常不同；验证集 `shuffle=False` 则保持固定顺序。
5. **模型规模变大，网络实例会变化。** 同一 `GPTModel` 类只是通用模板，`emb_dim`、`n_layers`、`n_heads` 变化会改变网络结构和参数张量形状。

---

## 十一、复习时应能独立回答的 12 个问题

1. `tokenizer.encode(full_text)` 返回的是 `list` 还是 `Tensor`？
2. `dataset[index]` 实际执行哪个特殊方法？返回的是一个 Token 还是一个 Token ID 序列？
3. 为什么同一批次必须 Padding，而不同批次允许不同 `T`？
4. `batch_max_length = max(len(item)+1 ...)` 的 `+1` 为什么存在？
5. 第一次 `new_item += [50256]` 和后续补齐 `50256` 的作用有何不同？
6. `padded[:-1]` 与 `padded[1:]` 如何构成下一 Token 预测任务？
7. `inputs_lst`、`batch`、`inputs_tensor` 分别是什么数据类型、什么维度？
8. `mask`、`torch.nonzero(mask)`、`.squeeze()` 分别返回什么类型和形状？
9. 为什么只把第二个及后续 `50256` 的目标位置改为 `-100`？
10. `DataLoader` 何时生成随机读取顺序、何时执行 `__getitem__` 与 `collate_fn`？
11. 为什么训练集两次评估的 5 个批次可能不同，但验证集通常相同？
12. 为什么同一个 `GPTModel` 类能创建 124M 和 355M 两种规模的模型？

**一条总主线：**`Dataset` 定义如何得到单个已编码样本 → `DataLoader` 决定怎样收集样本 → `collate_fn` 将变长 Token ID 列表转成 Inputs/Targets 张量 → GPT 根据 Inputs 预测下一个 Token → 通过 Targets 与忽略掩码计算 Loss → 微调参数并评估/保存。
