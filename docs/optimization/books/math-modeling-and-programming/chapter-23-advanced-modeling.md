---
title: Gurobi 高级建模方法：多目标优化、惰性约束与特殊约束
description: 整理 Gurobi 多目标优化、惰性约束与特殊约束的核心原理、适用场景和 Python 接口。
outline: deep
---

# Gurobi 高级建模方法：多目标优化、惰性约束与特殊约束

在基础模型中，我们通常只设置一个目标函数，并在求解前一次性加入全部约束。但在更复杂的优化问题中，还会遇到三类需求：

- 同时考虑多个相互冲突的目标；
- 约束数量过多，无法或不适合在求解前全部加入模型；
- 需要表达最大值、逻辑关系、指示关系、范围或特殊顺序集等结构。

Gurobi 分别通过**多目标优化、惰性约束和特殊约束**处理这些问题。本文整理三部分的核心思想、常用接口和容易混淆之处。

## 0. 先区分四类 Gurobi 接口

Gurobi Python 接口经常都写成 `对象.名称`，但它们的作用并不相同：

| 类型 | 形式 | 示例 | 含义 |
| --- | --- | --- | --- |
| 方法 | `对象.方法(...)` | `model.setObjectiveN(...)` | 执行一个操作 |
| 属性 | `对象.属性` | `model.NumObj`、`constr.Lazy` | 查询或修改对象的状态 |
| 参数 | `model.Params.参数` | `model.Params.ObjNumber = 1` | 控制求解器的行为或查询上下文 |
| 回调方法 | `model.cbXxx(...)` | `model.cbLazy(...)` | 只能在适当的回调位置调用 |

理解这一区别后，下面各接口会更容易记忆。

## 1. 多目标优化

### 1.1 三种处理方式

设模型包含目标函数 $f_1(x),f_2(x),\ldots,f_k(x)$。Gurobi 支持三种多目标处理方式。

#### 1. 合成法：为目标设置权重

合成法把多个目标加权为一个目标：

$$
\min \sum_{i=1}^{k} w_i f_i(x).
$$

权重 $w_i$ 越大，目标 $f_i(x)$ 对合成目标的影响通常越大。对应接口是 `Model.setObjectiveN()` 的 `weight` 参数，或目标属性 `ObjNWeight`。

#### 2. 分层法：为目标设置优先级

分层法又称词典序优化。Gurobi 先优化最高优先级目标，再在高优先级目标不发生不可接受退化的前提下优化下一层目标。

对应接口是 `Model.setObjectiveN()` 的 `priority` 参数，或目标属性 `ObjNPriority`。`priority` 数值越大，优先级越高。

#### 3. 合成法与分层法结合

权重和优先级可以同时设置：

1. Gurobi 按优先级从高到低处理目标；
2. 优先级相同的目标先按照权重合成为一个目标。

| 方法 | 目标之间的关系 | 主要设置 |
| --- | --- | --- |
| 合成法 | 可以相互补偿 | `weight` / `ObjNWeight` |
| 分层法 | 有明确的主次顺序 | `priority` / `ObjNPriority` |
| 混合法 | 先分层，同层再加权 | 同时设置 `priority` 和 `weight` |

### 1.2 设置多目标函数

多目标函数的核心接口为：

```python
model.setObjectiveN(
    expr,
    index,
    priority=0,
    weight=1.0,
    abstol=1e-6,
    reltol=0.0,
    name="",
)
```

| 参数 | 含义 |
| --- | --- |
| `expr` | 目标函数表达式 |
| `index` | 目标索引，从 `0` 开始 |
| `priority` | 目标优先级，数值越大越优先 |
| `weight` | 合成目标中的权重 |
| `abstol` | 高优先级目标允许的绝对退化量 |
| `reltol` | 高优先级目标允许的相对退化量 |
| `name` | 目标名称 |

需要注意：

1. Gurobi 多目标模型中的各个目标都必须是**线性函数**；
2. `ModelSense` 为所有目标设置统一的优化方向；
3. 如果某个目标方向相反，可以使用负权重。例如，在全局最小化模型中令 `weight=-1`，相当于最大化该目标；
4. 原单目标模型扩展为多目标模型后，原目标成为索引为 `0` 的主目标。

### 1.3 常用属性与参数

| 名称 | 类型 | 作用 |
| --- | --- | --- |
| `NumObj` | 模型属性 | 模型中的目标函数数量 |
| `ModelSense` | 模型属性 | 设置全局最大化或最小化方向 |
| `ObjNCon` | 多目标属性 | 当前所选目标的常数项 |
| `ObjNPriority` | 多目标属性 | 当前所选目标的优先级 |
| `ObjNWeight` | 多目标属性 | 当前所选目标的权重 |
| `ObjNRelTol` | 多目标属性 | 当前所选目标的相对退化容差 |
| `ObjNAbsTol` | 多目标属性 | 当前所选目标的绝对退化容差 |
| `ObjNName` | 多目标属性 | 当前所选目标的名称 |
| `ObjNVal` | 多目标属性 | 当前解在所选目标上的取值 |
| `ObjN` | 变量属性 | 某变量在当前所选目标中的系数 |
| `ObjNumber` | 参数 | 选择当前要查询或修改的目标索引 |
| `SolutionNumber` | 参数 | 选择解池中的解 |

`ObjNumber` 本身不保存目标函数，它只是告诉 Gurobi：接下来访问的 `ObjNWeight`、`ObjNName`、`ObjNVal` 等信息属于哪一个目标。

例如，修改第 2 个目标的权重：

```python
model.Params.ObjNumber = 1
model.ObjNWeight = 2.0
```

### 1.4 员工排班问题中的两种设置方式

假设排班模型中已经建立以下变量：

- `total_slack`：所有工作日缺失的员工总数；
- `max_shift - min_shift`：员工工作天数的最大差异。

#### 合成目标

```python
from gurobipy import GRB

model.ModelSense = GRB.MINIMIZE

model.setObjectiveN(
    total_slack,
    index=0,
    weight=1.0,
    name="TotalSlack",
)
model.setObjectiveN(
    max_shift - min_shift,
    index=1,
    weight=1.0,
    name="Fairness",
)

model.optimize()
```

此时实际优化的是：

$$
\min\bigl(\text{total\_slack}+\text{max\_shift}-\text{min\_shift}\bigr).
$$

#### 分层目标

```python
model.ModelSense = GRB.MINIMIZE

model.setObjectiveN(
    total_slack,
    index=0,
    priority=2,
    name="TotalSlack",
)
model.setObjectiveN(
    max_shift - min_shift,
    index=1,
    priority=1,
    name="Fairness",
)

model.optimize()
```

该设置首先最小化缺失人数，然后在不显著破坏该结果的前提下改善排班公平性。

### 1.5 高优先级目标的退化容差

在分层优化中，如果完全禁止高优先级目标退化，低优先级目标可调整的空间可能很小。可以使用：

- `ObjNAbsTol`：允许的绝对退化量；
- `ObjNRelTol`：允许的相对退化比例。

例如，高优先级最小化目标的最优值为 $100$，绝对退化量设为 $10$。直观上，求解下一个目标时可以接受该目标上升至 $110$。对于 MIP，Gurobi 会结合 incumbent、界和容差确定允许范围；对于 LP，退化控制主要通过 `ObjNAbsTol` 影响变量的 reduced-cost fixing，`ObjNRelTol` 不起作用。

### 1.6 获取不同目标和不同解的结果

```python
if model.SolCount > 0:
    for solution_index in range(model.SolCount):
        model.Params.SolutionNumber = solution_index
        print(f"解 {solution_index}")

        for objective_index in range(model.NumObj):
            model.Params.ObjNumber = objective_index
            print(
                model.ObjNName,
                model.ObjNVal,
            )
```

这里两个索引不要混淆：

- `SolutionNumber` 选择“第几个解”；
- `ObjNumber` 选择“这个解的第几个目标值”。

### 1.7 为不同优化阶段设置求解参数

分层多目标模型包含多个优化阶段。可以使用 `getMultiobjEnv()` 为某一阶段单独设置参数：

```python
first_pass = model.getMultiobjEnv(0)
first_pass.setParam("TimeLimit", 10)

second_pass = model.getMultiobjEnv(1)
second_pass.setParam("TimeLimit", 30)

model.optimize()
```

这些设置会作用于之后的求解。如果希望放弃它们，可以调用：

```python
model.discardMultiobjEnvs()
```

### 1.8 多目标建模注意事项

- 权重不宜相差过大，以免造成数值问题或使较小的目标被容差“淹没”；
- 分层法表达的是明确的业务优先级，不能只凭目标量纲大小代替优先级设计；
- 连续多目标模型中，一些对偶和单纯形基属性不可直接访问；
- 多目标 MIP 也不能把单目标模型的全局 `ObjBound`、`MIPGap` 等结果属性直接解释为每个优化阶段的对应结果。

## 2. 惰性约束

### 2.1 惰性更新不等于惰性约束

这两个概念名称相似，但含义不同。

| 概念 | 含义 |
| --- | --- |
| 惰性更新（lazy update） | 模型修改先进入等待队列，不一定立刻同步到底层模型 |
| 惰性约束（lazy constraint） | MIP 模型中的必要约束，先不全部激活，发现违背它的整数候选解时再加入 |

Gurobi 通常会在以下操作发生时执行等待中的模型更新：

1. `model.update()`；
2. `model.optimize()`；
3. `model.write()`。

批量处理更新可以减少频繁重建模型带来的开销。

### 2.2 回调函数基础

回调函数允许用户在求解过程中读取信息或影响后续搜索。基本结构如下：

```python
def callback(model, where):
    if where == GRB.Callback.MIPSOL:
        # 在发现新的 MIP 可行解时执行
        pass

model.optimize(callback)
```

其中：

- `where` 表示当前回调触发位置；
- `what` 通常作为 `model.cbGet(what)` 的参数，表示需要查询的信息；
- 可使用的 `what` 取值由当前 `where` 决定。

几个常用的回调接口如下：

| 接口 | 常用触发位置 | 作用 |
| --- | --- | --- |
| `model.cbGetSolution(vars)` | `GRB.Callback.MIPSOL` | 读取当前整数候选解 |
| `model.cbGetNodeRel(vars)` | `GRB.Callback.MIPNODE` | 读取当前节点松弛解 |
| `model.cbLazy(constr)` | `MIPSOL` 或 `MIPNODE` | 添加惰性约束 |
| `model.cbCut(constr)` | `MIPNODE` | 添加用户割平面 |

例如，每次发现新的 MIP 可行解时输出变量值：

```python
variables = model.getVars()

def print_solution(model, where):
    if where == GRB.Callback.MIPSOL:
        values = model.cbGetSolution(variables)
        print(values)

model.optimize(print_solution)
```

### 2.3 惰性约束的工作原理

惰性约束是完整模型中的必要约束，但不会像一般约束那样全部参与初始求解。其基本过程为：

1. 暂不激活部分必要约束，先求解较小的松弛模型；
2. Gurobi 得到一个整数候选解；
3. 检查该解是否违反惰性约束；
4. 如果违反，则舍弃该候选解，并加入相应的惰性约束；
5. 继续求解，直到最优整数解不违反任何惰性约束。

惰性约束仅适用于 **MIP 模型**。LP、QP 或 SOCP 等连续模型不使用这种机制。

### 2.4 方法一：设置约束的 `Lazy` 属性

如果所有约束都能在建模阶段枚举出来，可以先创建约束，再设置其 `Lazy` 属性：

```python
constr = model.addConstr(lhs <= rhs, name="lazy_constr")
constr.Lazy = 1
```

`Lazy` 属性的取值如下：

| 取值 | 含义 |
| --- | --- |
| `-1` | 将约束作为用户割平面放入 cut pool |
| `0` | 一般约束，默认值 |
| `1` | 可用于排除违反它的整数候选解，但不保证同时加入所有被违反的惰性约束 |
| `2` | 加入当前整数候选解违反的所有惰性约束 |
| `3` | 除上述行为外，还可在根节点加入被根松弛解违反的惰性约束 |

这种方式简单，但前提是可以事先创建全部约束对象。

### 2.5 方法二：在回调中动态生成惰性约束

如果约束数量巨大，或者只有看到候选解后才能找出被违反的约束，就需要使用回调动态生成。

假设完整模型要求 $x_1+x_2\leq 0$：

```python
def lazy_callback(model, where):
    if where == GRB.Callback.MIPSOL:
        x1_value, x2_value = model.cbGetSolution([x1, x2])

        if x1_value + x2_value > 1e-6:
            model.cbLazy(x1 + x2 <= 0)

model.Params.LazyConstraints = 1
model.optimize(lazy_callback)
```

这里有两个关键点：

1. 回调中要先通过 `cbGetSolution()` 读取候选解，再判断它是否违背约束；
2. 使用 `cbLazy()` 前必须设置 `LazyConstraints = 1`，使 Gurobi 避免与惰性约束不兼容的预处理变换。

如果使用的是约束对象的 `Lazy` 属性，则不需要手动设置 `LazyConstraints` 参数。

### 2.6 两种构造方式如何选择

| 情形 | 推荐方式 |
| --- | --- |
| 约束可以全部枚举，只是不希望一开始全部激活 | 设置 `constr.Lazy` |
| 约束数量呈指数增长，无法事先枚举 | 回调中使用 `model.cbLazy()` |
| 只有看到候选解后才能识别具体违约结构 | 回调中使用 `model.cbLazy()` |

典型例子是车辆路径问题中的子回路消除约束。所有点集子集对应的约束数量呈指数增长，因此没有必要在求解前全部生成。更常见的做法是：

1. 在 `MIPSOL` 回调中读取当前路径；
2. 检测是否存在子回路；
3. 只对实际出现的子回路调用 `cbLazy()` 添加消除约束。

### 2.7 惰性约束与割平面的区别

惰性约束和用户割都会删去当前搜索中的某些解，但二者的数学地位不同。

| 对比项 | 惰性约束 | 用户割平面 |
| --- | --- | --- |
| 是否属于完整模型 | 是，缺少它会使模型错误 | 否，只用于加强松弛 |
| 主要处理对象 | 不满足完整模型的整数候选解 | 节点处的分数松弛解 |
| 能否改变整数可行域 | 会删除原松弛模型中不合规的整数解 | 不能删除完整模型的整数可行解 |
| 典型回调位置 | `MIPSOL` | `MIPNODE` |
| 回调接口 | `model.cbLazy()` | `model.cbCut()` |
| 预先创建约束时 | `constr.Lazy = 1/2/3` | `constr.Lazy = -1` |

判断标准可以概括为：

- **没有这条约束，模型是否仍然正确？**如果不正确，它是惰性约束；
- **这条约束是否只为收紧松弛、加快搜索？**如果是，它是割平面。

## 3. 特殊约束

Gurobi 中常见的约束可以分为四类：

1. 一般约束；
2. 广义约束；
3. 范围约束；
4. 特殊顺序集约束。

### 3.1 一般约束

线性约束和二次约束等常见约束通常使用以下接口：

```python
# 添加一条约束
model.addConstr(lhs <= rhs, name="constr")

# 使用生成器批量添加约束
model.addConstrs(
    (x[i] <= upper[i] for i in index_set),
    name="upper_bound",
)
```

对应方法为：

```python
Model.addConstr(constr, name="")
Model.addConstrs(generator, name="")
```

### 3.2 广义约束

广义约束用于直接表达最大值、最小值、绝对值、逻辑关系、指示关系和常见函数关系。接口通常写成 `Model.addGenConstrXxx()`。

#### 常见简单广义约束

| 数学关系 | Gurobi 接口 |
| --- | --- |
| $z=\max\{x_1,\ldots,x_n,c\}$ | `Model.addGenConstrMax()` |
| $z=\min\{x_1,\ldots,x_n,c\}$ | `Model.addGenConstrMin()` |
| $z=\lvert x\rvert$ | `Model.addGenConstrAbs()` |
| $z=x_1\land\cdots\land x_n$ | `Model.addGenConstrAnd()` |
| $z=x_1\lor\cdots\lor x_n$ | `Model.addGenConstrOr()` |
| $z=\lVert x\rVert_p$ | `Model.addGenConstrNorm()` |
| $z=b\Rightarrow a^Tx\leq d$ | `Model.addGenConstrIndicator()` |
| $y=\operatorname{PWL}(x)$ | `Model.addGenConstrPWL()` |

#### 本章涉及的函数约束

| 数学关系 | Gurobi 接口 |
| --- | --- |
| $y=p(x)$ | `Model.addGenConstrPoly()` |
| $y=e^x$ | `Model.addGenConstrExp()` |
| $y=a^x$ | `Model.addGenConstrExpA()` |
| $y=\ln(x)$ | `Model.addGenConstrLog()` |
| $y=\log_a(x)$ | `Model.addGenConstrLogA()` |
| $y=x^a$ | `Model.addGenConstrPow()` |
| $y=\sin(x)$ | `Model.addGenConstrSin()` |
| $y=\cos(x)$ | `Model.addGenConstrCos()` |
| $y=\tan(x)$ | `Model.addGenConstrTan()` |

Gurobi 会为简单广义约束构造等价的 MIP 表达，并可能通过预处理获得更紧凑的形式。对于函数约束，现代版本既可以采用分段线性近似，也可以通过 `FuncNonlinear` 选择非线性处理方式，因此不能简单地认为它们始终只做分段线性近似。

#### 三个常用例子

```python
# z = max(x, y)
model.addGenConstrMax(z, [x, y], name="max_constr")

# b = b1 OR b2
model.addGenConstrOr(b, [b1, b2], name="or_constr")

# b = 1 -> x + y <= 1
model.addGenConstrIndicator(
    b,
    True,
    x + y,
    GRB.LESS_EQUAL,
    1,
    name="indicator_constr",
)
```

### 3.3 范围约束

范围约束表示同一个表达式同时具有下界和上界：

$$
l\leq a^Tx\leq u.
$$

正确接口是：

```python
Model.addRange(expr, lower, upper, name="")
```

例如，添加 $0\leq x+y\leq 1$：

```python
model.addRange(x + y, 0, 1, name="range_constr")
```

也可以使用重载形式：

```python
model.addConstr(x + y == [0, 1], name="range_constr")
```

::: warning 最容易混淆的三个接口

- `addGenConstrOr()` 表示逻辑或，例如 $z=x\lor y$；
- `addGenConstrIndicator()` 表示条件蕴含，例如 $z=1\Rightarrow x+y\leq1$；
- `addRange()` 表示上下界，例如 $0\leq x+y\leq1$。

原 PDF 将 Or 示例标题误写成了“范围约束 Or”，又在 Range 示例中重复放入了 Indicator 代码，并把接口拼成 `adddRange`。这些都是排版或代码笔误；范围约束的接口应为 `addRange()`。

:::

### 3.4 特殊顺序集约束

特殊顺序集（Special Ordered Set，SOS）通过以下接口添加：

```python
Model.addSOS(type, vars, wts=None)
```

| 类型 | 含义 |
| --- | --- |
| `GRB.SOS_TYPE1` | 有序变量中至多一个变量非零 |
| `GRB.SOS_TYPE2` | 有序变量中至多两个变量非零，且两个非零变量必须相邻 |

`wts` 决定变量在集合中的顺序，因此权重应能清楚、唯一地确定顺序。

```python
model.addSOS(
    GRB.SOS_TYPE2,
    [x, y, z],
    [1.0, 2.0, 3.0],
)
```

### 3.5 使用重载运算符表达特殊约束

除了显式调用 `addGenConstrXxx()`，还可以结合 `addConstr()` 与 Gurobi 提供的辅助函数或运算符，使表达式更接近数学形式。

```python
import gurobipy as gp

# 最大值与最小值
model.addConstr(z == gp.max_(x, y))
model.addConstr(z == gp.min_(x, y))

# 逻辑关系
model.addConstr(b == gp.or_(b1, b2))
model.addConstr(b == gp.and_(b1, b2))

# 指示约束
model.addConstr((b == 1) >> (x + y <= 1))

# 绝对值
model.addConstr(z == gp.abs_(x))

# 范围约束
model.addConstr(x + y == [0, 1])
```

如果使用 Gurobi 的矩阵友好接口，`@` 还可以构造矩阵表达式：

```python
model.addConstr(A @ x_vector <= b_vector)
model.addConstr(x_vector @ Q @ x_vector <= 1)
```

这里的 `x_vector` 应是 `MVar` 等矩阵接口对象。

## 4. 接口选择速查

| 建模需求 | 首选接口 |
| --- | --- |
| 添加一个普通线性或二次约束 | `model.addConstr()` |
| 按索引批量添加约束 | `model.addConstrs()` |
| 设置多个目标 | `model.setObjectiveN()` |
| 选择要访问的目标 | `model.Params.ObjNumber` |
| 约束可枚举，但希望延迟激活 | `constr.Lazy = 1/2/3` |
| 根据候选解动态生成必要约束 | `model.cbLazy()` |
| 只加强节点松弛 | `model.cbCut()` |
| 最大值、逻辑、指示或函数关系 | `model.addGenConstrXxx()` |
| 为同一表达式设置上下界 | `model.addRange()` |
| 限制有序变量中的非零结构 | `model.addSOS()` |

## 5. 本章小结

本章三部分分别解决了不同层次的问题：

- **多目标优化**决定多个目标之间如何权衡，核心是 `weight`、`priority` 和退化容差；
- **惰性约束**决定数量巨大或需要动态识别的必要约束何时加入，核心是 `Lazy` 属性、回调和 `cbLazy()`；
- **特殊约束**决定如何简洁地表达特殊结构，核心是 `addGenConstrXxx()`、`addRange()` 与 `addSOS()`。

最重要的区分是：范围约束、指示约束和逻辑 Or 约束是三种完全不同的关系；惰性约束与割平面也有不同的数学作用。接口名称虽然相似，但只要先判断“要表达什么数学关系”，通常就能选到正确的方法。

## 参考资料

- [Gurobi Optimizer Reference Manual：Multiple Objectives](https://docs.gurobi.com/projects/optimizer/en/current/features/multiobjective.html)
- [Gurobi Python API：Model](https://docs.gurobi.com/projects/optimizer/en/current/reference/python/model.html)
- [Gurobi Python API：Callbacks](https://docs.gurobi.com/projects/optimizer/en/current/reference/python/callback.html)
- [Gurobi Reference Manual：Linear Constraint Attributes](https://docs.gurobi.com/projects/optimizer/en/current/reference/attributes/constraintlinear.html)
- [Gurobi Reference Manual：Constraints](https://docs.gurobi.com/projects/optimizer/en/current/concepts/modeling/constraints.html)
