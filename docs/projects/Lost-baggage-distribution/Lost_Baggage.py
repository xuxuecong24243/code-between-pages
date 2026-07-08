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

names = [
    "Heathrow", "Harrow", "Ealing", "Holborn", "Sutton",
    "Dartford", "Bromley", "Greenwich", "Barking",
    "Hammersmith", "Kingston", "Richmond", "Battersea",
    "Islington", "Woolwich"
]

n = 15
depot = 0
customers = range(1, n)
nodes = range(n)
K = range(6)
T = 120

# 返回 Heathrow 的时间不计入，所以设为 0
cost = [row[:] for row in c]
for i in customers:
    cost[i][depot] = 0


# =========================
# 2. subtour 检测函数
# =========================

def find_subtours(edges, visited_customers):
    """
    edges: 当前车辆选中的客户-客户边，不含 depot
    visited_customers: 当前车辆服务的客户集合
    返回所有不含 depot 的子回路
    """
    unvisited = set(visited_customers)
    subtours = []

    while unvisited:
        start = unvisited.pop()
        tour = [start]
        current = start

        while True:
            next_nodes = [j for i, j in edges if i == current and j in unvisited]
            if not next_nodes:
                break

            current = next_nodes[0]
            tour.append(current)
            unvisited.remove(current)

        subtours.append(tour)

    return subtours


# =========================
# 3. Lazy Callback
# =========================

def subtour_callback(model, where):
    if where == GRB.Callback.MIPSOL:
        x = model._x
        y = model._y

        for k in K:
            visited = [
                i for i in customers
                if model.cbGetSolution(y[i, k]) > 0.5
            ]

            if len(visited) <= 1:
                continue

            edges = [
                (i, j)
                for i in visited
                for j in visited
                if i != j and model.cbGetSolution(x[i, j, k]) > 0.5
            ]

            subtours = find_subtours(edges, visited)

            for S in subtours:
                if len(S) < len(visited):
                    model.cbLazy(
                        quicksum(x[i, j, k] for i in S for j in S if i != j)
                        <= len(S) - 1
                    )


# =========================
# 4. 建模函数
# =========================

def build_model(stage=1, fixed_vans=None):
    model = Model("Lost_Baggage_Distribution")

    x = model.addVars(nodes, nodes, K, vtype=GRB.BINARY, name="x")
    y = model.addVars(nodes, K, vtype=GRB.BINARY, name="y")
    use = model.addVars(K, vtype=GRB.BINARY, name="use")

    if stage == 1:
        model.setObjective(quicksum(use[k] for k in K), GRB.MINIMIZE)
    else:
        Z = model.addVar(lb=0, vtype=GRB.CONTINUOUS, name="Z")
        model.setObjective(Z, GRB.MINIMIZE)
        model.addConstr(quicksum(use[k] for k in K) == fixed_vans)

    # 禁止自环
    for k in K:
        for i in nodes:
            model.addConstr(x[i, i, k] == 0)

    # 每个客户必须由一辆车服务
    for i in customers:
        model.addConstr(quicksum(y[i, k] for k in K) == 1)

    # depot 与车辆使用变量绑定
    for k in K:
        model.addConstr(y[depot, k] == use[k])

    # 每辆被使用的车从 depot 出发一次
    for k in K:
        model.addConstr(
            quicksum(x[depot, j, k] for j in customers) == use[k]
        )

    # 每辆被使用的车最终回到 depot 一次
    # 回程成本为 0，因此只是用于形成闭合结构
    for k in K:
        model.addConstr(
            quicksum(x[i, depot, k] for i in customers) == use[k]
        )

    # 客户流入、流出约束
    for k in K:
        for i in customers:
            model.addConstr(
                quicksum(x[i, j, k] for j in nodes if j != i) == y[i, k]
            )
            model.addConstr(
                quicksum(x[j, i, k] for j in nodes if j != i) == y[i, k]
            )
            model.addConstr(y[i, k] <= use[k])

    # 每辆车配送时间不超过 120 分钟
    for k in K:
        route_time = quicksum(
            cost[i][j] * x[i, j, k]
            for i in nodes
            for j in nodes
            if i != j
        )

        model.addConstr(route_time <= T)

        if stage == 2:
            model.addConstr(route_time <= Z)

    # 对称性破除：优先使用编号小的车辆
    for k in range(5):
        model.addConstr(use[k] >= use[k + 1])

    model.Params.LazyConstraints = 1

    model._x = x
    model._y = y

    return model, x, y, use


# =========================
# 5. 路线提取
# =========================

def extract_routes(x, use):
    routes = []

    for k in K:
        if use[k].X < 0.5:
            continue

        route = [depot]
        current = depot

        while True:
            next_node = None

            for j in nodes:
                if j != current and x[current, j, k].X > 0.5:
                    next_node = j
                    break

            if next_node is None or next_node == depot:
                break

            route.append(next_node)
            current = next_node

        route_time = sum(
            c[route[i]][route[i + 1]]
            for i in range(len(route) - 1)
        )

        routes.append((k + 1, route, route_time))

    return routes


# =========================
# 6. 第一阶段：最小化车辆数
# =========================

model1, x1, y1, use1 = build_model(stage=1)
model1.optimize(subtour_callback)

V_star = round(sum(use1[k].X for k in K))

print("\n第一阶段结果")
print("最少车辆数 =", V_star)


# =========================
# 7. 第二阶段：固定车辆数，最小化最长配送时间
# =========================

model2, x2, y2, use2 = build_model(stage=2, fixed_vans=V_star)
model2.optimize(subtour_callback)

routes = extract_routes(x2, use2)

print("\n第二阶段结果")
for k, route, route_time in routes:
    print(f"\n车辆 {k}")
    print("节点编号:", [i + 1 for i in route])
    print("路线:", " -> ".join(names[i] for i in route))
    print("配送时间:", route_time, "min")

print("\n最长配送时间 =", max(t for _, _, t in routes), "min")