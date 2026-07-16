from gurobipy import Model, GRB, quicksum


# =========================
# 1. 数据
# =========================

c = [
    [0, 20, 25, 35, 65, 90, 85, 80, 86, 25, 35, 20, 44, 35, 82],
    [20, 0, 15, 35, 60, 55, 57, 85, 90, 25, 35, 30, 37, 20, 40],
    [25, 15, 0, 30, 50, 70, 55, 50, 65, 10, 25, 15, 24, 20, 90],
    [35, 35, 30, 0, 45, 60, 53, 55, 47, 12, 22, 20, 12, 10, 21],
    [65, 60, 50, 45, 0, 46, 15, 45, 75, 25, 11, 19, 15, 25, 25],
    [90, 55, 70, 60, 46, 0, 15, 15, 25, 45, 65, 53, 43, 63, 70],
    [85, 57, 55, 53, 15, 15, 0, 17, 25, 41, 25, 33, 27, 45, 30],
    [80, 85, 50, 55, 45, 15, 17, 0, 25, 40, 34, 32, 20, 30, 10],
    [86, 90, 65, 47, 75, 25, 25, 25, 0, 65, 70, 72, 61, 45, 13],
    [25, 25, 10, 12, 25, 45, 41, 40, 65, 0, 20, 8, 7, 15, 25],
    [35, 35, 25, 22, 11, 65, 25, 34, 70, 20, 0, 5, 12, 45, 65],
    [20, 30, 15, 20, 19, 53, 33, 32, 72, 8, 5, 0, 14, 34, 56],
    [44, 37, 24, 12, 15, 43, 27, 20, 61, 7, 12, 14, 0, 30, 40],
    [35, 20, 20, 10, 25, 63, 45, 30, 45, 15, 45, 34, 30, 0, 27],
    [82, 40, 90, 21, 25, 70, 30, 10, 13, 25, 65, 56, 40, 27, 0]
]


# 第一个地点为配送中心
cities = [
    "Heathrow", "Harrow", "Ealing", "Holborn", "Sutton",
    "Dartford", "Bromley", "Greenwich", "Barking",
    "Hammersmith", "Kingston", "Richmond", "Battersea",
    "Islington", "Woolwich"
]


n = len(cities)

depot = 0
nodes = range(n)
customers = range(1, n)

# 最多使用6辆车
K = range(6)

# 每辆车最大配送时间
T = 120


# 返回Heathrow的时间不计入
cost = [row[:] for row in c]

for i in customers:
    cost[i][depot] = 0


# =========================
# 2. 环路查找函数
# =========================

def find_cycles(edges, active_nodes):
    """
    根据当前车辆选中的有向边，查找所有相互独立的环。

    参数
    ----------
    edges:
        当前车辆选中的有向边，例如：
        [(0, 1), (1, 2), (2, 0), (3, 4), (4, 3)]

    active_nodes:
        当前车辆实际经过的节点，包括配送中心和服务客户。

    返回
    ----------
    cycles:
        当前车辆形成的所有环，例如：
        [[0, 1, 2], [3, 4]]
    """

    # 每个节点只有一个后继节点
    successor = {
        i: j
        for i, j in edges
    }

    unvisited = set(active_nodes)
    cycles = []

    while unvisited:

        start = next(iter(unvisited))
        current = start
        cycle = []

        # 沿后继节点不断向前走
        while current in unvisited:
            unvisited.remove(current)
            cycle.append(current)

            if current not in successor:
                break

            current = successor[current]

        cycles.append(cycle)

    return cycles


# =========================
# 3. Lazy Callback
# =========================

def subtour_callback(model, where):
    """
    当Gurobi找到一个整数可行解时，检查每辆车是否存在
    不包含配送中心的独立子回路。
    """

    if where != GRB.Callback.MIPSOL:
        return

    x = model._x
    y = model._y
    use = model._use

    for k in K:

        # 未使用的车辆无需检查
        if model.cbGetSolution(use[k]) < 0.5:
            continue

        # 当前车辆服务的客户
        visited_customers = [
            i
            for i in customers
            if model.cbGetSolution(y[i, k]) > 0.5
        ]

        # 当前车辆实际涉及的节点
        active_nodes = [depot] + visited_customers

        # 当前车辆选中的所有边，包括与depot相连的边
        selected_edges = [
            (i, j)
            for i in active_nodes
            for j in active_nodes
            if (
                i != j
                and model.cbGetSolution(x[i, j, k]) > 0.5
            )
        ]

        # 找出当前车辆形成的所有环
        cycles = find_cycles(
            selected_edges,
            active_nodes
        )

        for cycle in cycles:

            # 包含配送中心的环是车辆的合法主路线
            if depot in cycle:
                continue

            # 不包含配送中心的环是子回路，需要排除
            model.cbLazy(
                quicksum(
                    x[i, j, k]
                    for i in cycle
                    for j in cycle
                    if i != j
                )
                <= len(cycle) - 1
            )


# =========================
# 4. 建模函数
# =========================

def build_model(stage=1, fixed_vans=None):

    model = Model("Lost_Baggage_Distribution")

    # x[i,j,k] = 1：
    # 车辆k从节点i行驶到节点j
    x = model.addVars(
        nodes,
        nodes,
        K,
        vtype=GRB.BINARY,
        name="x"
    )

    # y[i,k] = 1：
    # 节点i由车辆k访问
    y = model.addVars(
        nodes,
        K,
        vtype=GRB.BINARY,
        name="y"
    )

    # use[k] = 1：
    # 车辆k被使用
    use = model.addVars(
        K,
        vtype=GRB.BINARY,
        name="use"
    )

    # -------------------------
    # 目标函数
    # -------------------------

    if stage == 1:

        # 第一阶段：最小化车辆数量
        model.setObjective(
            quicksum(use[k] for k in K),
            GRB.MINIMIZE
        )

    elif stage == 2:

        if fixed_vans is None:
            raise ValueError(
                "第二阶段必须指定fixed_vans"
            )

        # 最长配送时间
        Z = model.addVar(
            lb=0,
            vtype=GRB.CONTINUOUS,
            name="Z"
        )

        # 第二阶段：最小化最长配送时间
        model.setObjective(
            Z,
            GRB.MINIMIZE
        )

        # 固定车辆数量
        model.addConstr(
            quicksum(use[k] for k in K)
            == fixed_vans
        )

    else:
        raise ValueError("stage只能取1或2")

    # -------------------------
    # 禁止自环
    # -------------------------

    for k in K:
        for i in nodes:
            model.addConstr(
                x[i, i, k] == 0
            )

    # -------------------------
    # 每个客户必须由一辆车服务
    # -------------------------

    for i in customers:
        model.addConstr(
            quicksum(
                y[i, k]
                for k in K
            )
            == 1
        )

    # -------------------------
    # 配送中心与车辆使用变量绑定
    # -------------------------

    for k in K:
        model.addConstr(
            y[depot, k] == use[k]
        )

    # -------------------------
    # 每辆使用的车从depot出发一次
    # -------------------------

    for k in K:
        model.addConstr(
            quicksum(
                x[depot, j, k]
                for j in customers
            )
            == use[k]
        )

    # -------------------------
    # 每辆使用的车返回depot一次
    # -------------------------

    for k in K:
        model.addConstr(
            quicksum(
                x[i, depot, k]
                for i in customers
            )
            == use[k]
        )

    # -------------------------
    # 客户流入、流出约束
    # -------------------------

    for k in K:
        for i in customers:

            # 如果车辆k访问客户i，
            # 则必须从客户i离开一次
            model.addConstr(
                quicksum(
                    x[i, j, k]
                    for j in nodes
                    if j != i
                )
                == y[i, k]
            )

            # 如果车辆k访问客户i，
            # 则必须进入客户i一次
            model.addConstr(
                quicksum(
                    x[j, i, k]
                    for j in nodes
                    if j != i
                )
                == y[i, k]
            )

            # 未使用的车辆不能服务客户
            model.addConstr(
                y[i, k] <= use[k]
            )

    # -------------------------
    # 配送时间约束
    # -------------------------

    for k in K:

        route_time = quicksum(
            cost[i][j] * x[i, j, k]
            for i in nodes
            for j in nodes
            if i != j
        )

        # 每辆车配送时间不超过120分钟
        model.addConstr(
            route_time <= T
        )

        if stage == 2:

            # Z不小于任何车辆的配送时间
            model.addConstr(
                route_time <= Z
            )

    # -------------------------
    # 对称性破除
    # -------------------------

    # 优先使用编号较小的车辆
    for k in range(len(K) - 1):
        model.addConstr(
            use[k] >= use[k + 1]
        )

    # 启用Lazy Constraint
    model.Params.LazyConstraints = 1

    # 保存变量，供callback读取
    model._x = x
    model._y = y
    model._use = use

    return model, x, y, use


# =========================
# 5. 路线提取函数
# =========================

def extract_routes(x, use):
    """
    从最优解中提取每辆车的实际路线。
    """

    routes = []

    for k in K:

        if use[k].X < 0.5:
            continue

        route = [depot]
        current = depot

        # 防止异常情况下无限循环
        visited_nodes = {depot}

        while True:

            next_node = None

            for j in nodes:
                if (
                    j != current
                    and x[current, j, k].X > 0.5
                ):
                    next_node = j
                    break

            if next_node is None:
                raise RuntimeError(
                    f"车辆{k + 1}在节点{current}处没有后继节点"
                )

            # 返回配送中心，路线结束
            if next_node == depot:
                break

            if next_node in visited_nodes:
                raise RuntimeError(
                    f"车辆{k + 1}路线中出现重复节点"
                )

            route.append(next_node)
            visited_nodes.add(next_node)

            current = next_node

        # 返回Heathrow的时间不计入
        route_time = sum(
            c[route[i]][route[i + 1]]
            for i in range(len(route) - 1)
        )

        routes.append(
            (k + 1, route, route_time)
        )

    return routes


# =========================
# 6. 第一阶段：最小化车辆数
# =========================

model1, x1, y1, use1 = build_model(
    stage=1
)

model1.optimize(
    subtour_callback
)


if model1.SolCount == 0:
    raise RuntimeError(
        "第一阶段没有找到可行解"
    )


V_star = round(
    sum(
        use1[k].X
        for k in K
    )
)


print("\n第一阶段结果")
print("最少车辆数 =", V_star)


# =========================
# 7. 第二阶段：最小化最长配送时间
# =========================

model2, x2, y2, use2 = build_model(
    stage=2,
    fixed_vans=V_star
)

model2.optimize(
    subtour_callback
)


if model2.SolCount == 0:
    raise RuntimeError(
        "第二阶段没有找到可行解"
    )


routes = extract_routes(
    x2,
    use2
)


print("\n第二阶段结果")

for vehicle_number, route, route_time in routes:

    print(f"\n车辆 {vehicle_number}")

    print(
        "节点编号:",
        [i + 1 for i in route]
    )

    print(
        "路线:",
        " -> ".join(
            cities[i]
            for i in route
        )
    )

    print(
        "配送时间:",
        route_time,
        "min"
    )


longest_time = max(
    route_time
    for _, _, route_time in routes
)

print(
    "\n最长配送时间 =",
    longest_time,
    "min"
)

