# Gurobi 基本语法

## `model.addConstr`

### 功能
向 Gurobi 模型中添加一条**单一约束**（线性、二次或一般约束），并返回该约束对象。

---

### 基本语法
```python
model.addConstr(constr, name="")
```

---

### 参数说明

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| constr | `TempConstr`（线性/二次表达式比较式） | 约束表达式，形如 `lhs <= rhs`、`lhs == rhs`、`lhs >= rhs`，其中 `lhs`、`rhs` 可以是变量、`LinExpr`、`QuadExpr` 或常数构成的表达式 |
| name | `str`，可选 | 约束的名称，便于后续通过名称查找、调试或输出模型文件（如 `.lp`）时识别，默认为空字符串（自动命名） |

---

### 返回值
返回一个 **`Constr`** 对象（若传入的是二次约束表达式，则返回 `QConstr` 对象），代表刚刚添加到模型中的约束。可以通过该返回值后续修改约束（如 `RHS`、`Sense` 等属性）或将其删除（`model.remove(constr)`）。

---

### 示例
```python
import gurobipy as gp
from gurobipy import GRB

model = gp.Model("example")

x = model.addVar(name="x")
y = model.addVar(name="y")

# 添加一条线性约束：x + 2y <= 10
c1 = model.addConstr(x + 2 * y <= 10, name="c1")

# 添加另一条约束并直接使用返回值
c2 = model.addConstr(x - y >= 1, name="c2")

model.optimize()

print(f"约束 c1 的右端项: {c1.RHS}")
```

输出（示例）
```python
约束 c1 的右端项: 10.0
```

## `model.Params.LazyConstraints`

### 功能

启用/禁用**惰性约束（Lazy Constraints）**
支持，使 Gurobi 允许在求解过程中通过回调（callback）动态地添加约束，而不是在建模时就把所有约束一次性加入模型。

---

### 基本语法

```python
model.Params.LazyConstraints = 1
```

---

### 参数说明

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| `LazyConstraints` | int (0 或 1) | 0 = 关闭（默认值），不允许在回调中添加惰性约束；1 = 开启，允许在求解过程中通过 `model.cbLazy()` 动态添加约束 |

---

### 返回值

无返回值，该属性仅用于设置模型参数，影响求解器的求解行为。
## `model.optimize`

### 功能

启动 Gurobi 求解器，对当前已构建好的模型进行求解（可选传入回调函数以支持惰性约束、终止控制等高级功能）。

---

### 基本语法

```python
model.optimize()
# 或带回调函数
model.optimize(callback_function)
```

---

### 参数说明

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| `callback_function` | function（可选） | 求解过程中被反复调用的回调函数，函数签名固定为 `callback(model, where)`；若不需要回调（如添加惰性约束、自定义终止条件等），可省略此参数 |

---

### 返回值

无返回值（`None`）。求解结果不通过返回值获取，而是求解结束后存储在模型对象的属性中，例如：

- `model.Status`：求解状态（如 `GRB.OPTIMAL`、`GRB.INFEASIBLE`、`GRB.TIME_LIMIT` 等）
- `model.ObjVal`：最优目标函数值
- `var.X`：各决策变量的最优取值

---

### 示例

```python
import gurobipy as gp
from gurobipy import GRB

model = gp.Model()
x = model.addVar(vtype=GRB.BINARY, name="x")
y = model.addVar(vtype=GRB.BINARY, name="y")
model.setObjective(x + y, GRB.MAXIMIZE)
model.addConstr(x + y <= 1)

# 直接求解，不使用回调
model.optimize()

if model.Status == GRB.OPTIMAL:
    print(f"最优目标值: {model.ObjVal}")
    print(f"x = {x.X}, y = {y.X}")
```

输出
```python
Optimal solution found (tolerance 1.00e-04)
Best objective 1.000000000000e+00, best bound 1.000000000000e+00, gap 0.0000%
最优目标值: 1.0
x = 1.0, y = 0.0
```


## `model.cbGetSolution`

### 功能

在求解回调（callback）中，用于获取当前 MIP 可行解（MIPSOL 回调阶段）中变量的取值。

---

### 基本语法

```python
model.cbGetSolution(vars)
```

---

### 参数说明

| 参数 | 类型 | 说明 |
| ---- | ---- | ---- |
| vars | Var 或 list/tuple/dict of Var | 需要获取解值的变量，可以是单个变量、变量列表、元组或字典（如 tupledict） |

---

### 返回值

返回与传入的 `vars` 结构相对应的解值：

- 若传入单个变量，返回一个浮点数
- 若传入变量列表/元组，返回浮点数列表
- 若传入字典（如 `tupledict`），返回值字典（保持相同的键）

该值来自 Gurobi 在 `MIPSOL` 回调状态下发现的新的整数可行解。

---

### 示例

```python
import gurobipy as gp
from gurobipy import GRB

def mycallback(model, where):
    if where == GRB.Callback.MIPSOL:
        # 获取所有变量在当前可行解中的取值
        sol = model.cbGetSolution(model._vars)
        # 举例：检查某个自定义割平面条件是否被违反
        total = sum(sol)
        if total > 10:
            print("发现一个解，变量之和超过10，考虑添加懒惰约束（lazy constraint）")

model = gp.Model()
x = model.addVars(5, vtype=GRB.BINARY)
model._vars = x
model.setObjective(sum(x[i] for i in range(5)), GRB.MAXIMIZE)
model.Params.LazyConstraints = 1
model.optimize(mycallback)
```

输出
```python
Optimal solution found (tolerance 1.00e-04)
Best objective 5.000000000000e+00, best bound 5.000000000000e+00, gap 0.0000%
User-callback calls 24, time in user-callback 0.00 sec
```













## 1 创建模型
## 2 添加变量

### addVars()：批量创建决策变量

在 Gurobi 中，`addVars()` 用于**批量创建决策变量**。相比于 `addVar()` 一次只能创建一个变量，`addVars()` 可以根据给定的索引集合，一次性创建多个变量。其基本语法如下：

```python
vars = model.addVars(
    index1, index2, ...,
    lb=0.0,
    ub=GRB.INFINITY,
    obj=0,
    vtype=GRB.CONTINUOUS,
    name=""
)
```

其中，各参数含义如下：

| 参数 | 说明 |
|------|------|
| `index1, index2, ...` | 变量的索引集合，可以是一维或多维 |
| `lb` | 下界（Lower Bound），默认 0 |
| `ub` | 上界（Upper Bound），默认无穷大 |
| `obj` | 目标函数系数，可省略 |
| `vtype` | 变量类型 |
| `name` | 变量名称 |

常见变量类型：

| 类型 | 含义 |
|------|------|
| `GRB.CONTINUOUS` | 连续变量 |
| `GRB.INTEGER` | 整数变量 |
| `GRB.BINARY` | 0-1变量 |

---

#### 返回值

`addVars()` 返回的是一个 **tupledict**（元组字典）。

例如：

```python
x = model.addVars(I, J)
```

即可通过

```python
x[i, j]
```

访问变量，而无需自己建立二维数组。

---

#### 示例

假设有 3 个工厂和 4 个仓库，需要定义变量 $x_{ij}$，表示工厂 $i$ 是否向仓库 $j$ 运输货物。

```python
plants = range(3)
warehouses = range(4)

x = model.addVars(
    plants,
    warehouses,
    vtype=GRB.BINARY,
    name="x"
)
```

上述代码创建了一个二维 0-1 决策变量：

$$
x_{ij}, \quad i \in \text{plants},\; j \in \text{warehouses}
$$

共创建

$$
3 \times 4 = 12
$$

个变量。

可以通过索引访问其中的任意一个变量，例如：

```python
x[1, 2]
```

表示变量 $x_{1,2}$。








## 3 设置目标函数
### `model.setObjective()`：设置目标函数

在 Gurobi 中，`model.setObjective()` 用于为优化模型设置目标函数。其基本语法如下：

```python
model.setObjective(expression, sense)
```

其中：

- `expression`：目标函数表达式，可以是单个决策变量，也可以是由多个变量构成的线性或二次表达式；
- `sense`：优化方向，包括：
  - `GRB.MINIMIZE`：最小化目标函数；
  - `GRB.MAXIMIZE`：最大化目标函数。

#### 最小化目标函数

例如：

```python
model.setObjective(
    quicksum(c[i] * x[i] for i in I),
    GRB.MINIMIZE
)
```

对应的数学表达式为：

$$
\min \sum_{i\in I} c_i x_i
$$

其中，$c_i$ 表示决策变量 $x_i$ 的目标函数系数。

#### 最大化目标函数

例如：

```python
model.setObjective(
    quicksum(p[i] * x[i] for i in I),
    GRB.MAXIMIZE
)
```

对应的数学表达式为：

$$
\max \sum_{i\in I} p_i x_i
$$

其中，$p_i$ 表示决策变量 $x_i$ 对目标函数的贡献。

#### 由多个部分组成的目标函数

目标函数可以包含多个求和项或其他表达式。例如：

```python
model.setObjective(
    quicksum(c[i] * x[i] for i in I)
    + quicksum(f[j] * y[j] for j in J),
    GRB.MINIMIZE
)
```

对应的数学表达式为：

$$
\min
\left(
\sum_{i\in I} c_i x_i
+
\sum_{j\in J} f_j y_j
\right)
$$

#### 省略优化方向

如果没有显式指定 `sense`，Gurobi 默认按照模型当前设置的优化方向求解。为了提高代码的可读性，通常建议明确写出 `GRB.MINIMIZE` 或 `GRB.MAXIMIZE`。

例如：

```python
model.setObjective(objective_expression)
```

也可以单独设置优化方向：

```python
model.ModelSense = GRB.MINIMIZE
```

或者：

```python
model.ModelSense = GRB.MAXIMIZE
```

> **说明：** 一个模型只能有一个普通目标函数。再次调用 `model.setObjective()` 时，新的目标函数会覆盖原来的目标函数。如果需要建立多目标优化模型，可以使用 `model.setObjectiveN()`。

## 4 添加约束

### `model.addConstr()`

#### 语法

```python
model.addConstr(lhs <= rhs, name="")
```

或

```python
model.addConstr(lhs == rhs, name="")
```

或

```python
model.addConstr(lhs >= rhs, name="")
```

#### 参数说明

| 参数 | 说明 |
|------|------|
| `lhs` | 约束左侧表达式（Linear Expression） |
| `<=`、`==`、`>=` | 约束关系符 |
| `rhs` | 约束右侧表达式（常数或线性表达式） |
| `name` *(可选)* | 约束名称，便于调试和查看模型 |

#### 示例

例如：

```python
model.addConstr(x + y <= 10)
```

表示添加一个线性约束：

\[
x+y\le10
\]

再例如：

```python
model.addConstr(
    quicksum(x[i] for i in range(5)) == 1,
    name="assign"
)
```

表示：

\[
\sum_{i=0}^{4}x_i=1
\]

即变量 \(x_0,x_1,\ldots,x_4\) 中有且仅有一个取值为 1。

!!! tip "提示"

    `addConstr()` 用于向模型中添加**单个约束**。如果需要批量添加多个约束，通常使用 `model.addConstrs()`，这样模型代码会更加简洁。
## 5 quicksum 的使用
## 6 optimize()
## 7 获取变量值
## 8 常见变量类型
## 9 常见参数
## 10 Callback
## 11 Lazy Constraint
## 12 一个完整模板

### `quicksum()`：快速构建求和表达式

在 Gurobi 中，`quicksum()` 用于对多个决策变量或表达式进行求和，其作用与 Python 内置函数 `sum()` 类似，但在构建大型优化模型时通常效率更高。其基本语法如下：

```python
quicksum(expression for index in index_set)
```

其中：

- `expression`：需要求和的变量或表达式；
- `index`：求和过程中使用的索引；
- `index_set`：索引对应的集合。

#### 1. 对一组决策变量求和

例如：

```python
quicksum(x[i] for i in I)
```

对应的数学表达式为：

$$
\sum_{i\in I} x_i
$$

如果将其添加到约束中：

```python
model.addConstr(
    quicksum(x[i] for i in I) <= b
)
```

则对应：

$$
\sum_{i\in I}x_i\leq b
$$

#### 2. 对带系数的决策变量求和

例如：

```python
quicksum(c[i] * x[i] for i in I)
```

对应：

$$
\sum_{i\in I}c_i x_i
$$

其中：

- `c[i]`：决策变量 `x[i]` 的系数；
- `x[i]`：索引为 `i` 的决策变量。

#### 3. 多重索引求和

对于具有多个索引的决策变量，可以在 `quicksum()` 中使用多层循环。

例如：

```python
quicksum(
    c[i, j] * x[i, j]
    for i in I
    for j in J
)
```

对应：

$$
\sum_{i\in I}\sum_{j\in J}c_{ij}x_{ij}
$$

如果变量包含三个索引，可以写为：

```python
quicksum(
    c[i, j, k] * x[i, j, k]
    for i in I
    for j in J
    for k in K
)
```

对应：

$$
\sum_{i\in I}\sum_{j\in J}\sum_{k\in K}
c_{ijk}x_{ijk}
$$

#### 4. 带条件的求和

可以在生成器表达式中加入条件，只对满足条件的元素进行求和。

例如：

```python
quicksum(
    x[i, j]
    for j in J
    if j != i
)
```

对应：

$$
\sum_{\substack{j\in J\\j\neq i}}x_{ij}
$$

该表达式表示对所有满足 $j\neq i$ 的变量 $x_{ij}$ 求和。

#### 5. 在目标函数中使用

例如：

```python
model.setObjective(
    quicksum(c[i] * x[i] for i in I),
    GRB.MINIMIZE
)
```

对应：

$$
\min \sum_{i\in I}c_i x_i
$$

#### 6. 在约束中使用

例如：

```python
for i in I:
    model.addConstr(
        quicksum(a[i, j] * x[j] for j in J) <= b[i]
    )
```

对应：

$$
\sum_{j\in J}a_{ij}x_j\leq b_i,
\qquad \forall i\in I
$$

> **说明：** `quicksum()` 主要用于构建 Gurobi 的线性或二次表达式。对于只包含普通 Python 数值的求和，直接使用内置的 `sum()` 即可；对于包含大量 Gurobi 决策变量的表达式，通常优先使用 `quicksum()`。