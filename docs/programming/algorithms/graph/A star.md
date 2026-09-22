---
sidebar: false

---

# A* 搜索算法

## [A* 搜索算法：游戏和 AI 中的寻路](https://learngraphtheory.org/articles/zh/a-star-search-algorithm.html)

## [路径规划与轨迹跟踪系列算法学习_第4讲_A*算法](https://www.bilibili.com/video/BV1Jt4y1z7Ry/?spm_id_from=333.337.search-card.all.click&vd_source=03d594f58a3288a4fdae6d89c0d842c4)



## 算法流程图
<div align="center">
  <img src="./img/Astar算法流程图.svg" width="100%">
</div>

## 伪代码
<div align="center">
  <img src="./img/A-star-img1.png" width="100%">
</div>



## Python实现
```python
import heapq


def reconstruct_path(parent, goal):
    """根据 parent 映射，从目标节点反向恢复路径。"""
    path = [goal]

    while goal in parent:
        goal = parent[goal]
        path.append(goal)

    path.reverse()
    return path


def a_star(graph, start, goal, h):
    # 1. 创建 OPEN、CLOSED、g、parent
    open_heap = []
    closed = set()

    g = {node: float("inf") for node in graph}
    parent = {}

    # 2. 初始化起点
    g[start] = 0
    f_start = g[start] + h[start]
    heapq.heappush(open_heap, (f_start, start))

    # 3. A* 主循环
    while open_heap:
        # 从 OPEN 中取出 f 值最小的节点
        current_f, current = heapq.heappop(open_heap)

        # 跳过优先队列中的旧记录
        if current_f > g[current] + h[current]:
            continue

        # 到达目标节点
        if current == goal:
            path = reconstruct_path(parent, goal)
            return path, g[goal]

        # 将 current 加入 CLOSED
        closed.add(current)

        # 遍历 current 的所有邻居
        for neighbor, cost in graph[current]:

            # 已经处理过的节点直接跳过
            if neighbor in closed:
                continue

            # 计算经过 current 到达 neighbor 的新路径长度
            new_g = g[current] + cost

            # 如果找到更短路径
            if new_g < g[neighbor]:
                g[neighbor] = new_g
                parent[neighbor] = current

                new_f = g[neighbor] + h[neighbor]

                # 将新记录加入 OPEN
                heapq.heappush(open_heap, (new_f, neighbor))

    # OPEN 为空仍未到达目标节点
    return None, float("inf")


# =========================
# 测试
# =========================

graph = {
    "A": [("B", 4), ("C", 2)],
    "B": [("A", 4), ("C", 1), ("D", 5)],
    "C": [("A", 2), ("B", 1), ("D", 8), ("E", 10)],
    "D": [("B", 5), ("C", 8), ("E", 2), ("F", 6)],
    "E": [("C", 10), ("D", 2), ("F", 2)],
    "F": [("D", 6), ("E", 2)]
}

# 启发式函数 h(n)
h = {
    "A": 10,
    "B": 8,
    "C": 9,
    "D": 4,
    "E": 2,
    "F": 0
}

start = "A"
goal = "F"

path, distance = a_star(graph, start, goal, h)

print("最短路径：", " -> ".join(path))
print("最短距离：", distance)

```

输出
```text
最短路径： A -> C -> B -> D -> E -> F
最短距离： 12
```

## 示例
输入图如下，其中A为起点，F为目标节点，需要找到从A到F的最短路径。
<div align="center">
  <img src="./img/A-star-img2.svg" width="100%">
</div>

<div align="center">
  <img src="./img/A-star-img3.png" width="100%">
</div>