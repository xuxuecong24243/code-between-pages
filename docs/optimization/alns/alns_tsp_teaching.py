"""用 XQF131 学习 ALNS：破坏、修复、选择、接受与完整搜索。

依赖：python -m pip install alns==7.0.0 numpy==1.26.4 tsplib95==0.7.1
在仓库根目录运行：python docs/optimization/alns/alns_tsp_teaching.py
独立使用时：python alns_tsp_teaching.py --data-file /path/to/xqf131.tsp
结果仅打印到终端；无需最优路线文件，也不写入已有实验结果。

改编自 N-Wouda/ALNS v7.0.0 的 TSP 示例：
https://github.com/N-Wouda/ALNS/blob/v7.0.0/examples/travelling_salesman_problem.ipynb
Copyright (c) 2019 Niels Wouda and contributors.
上游 MIT 许可证见同目录 LICENSE-ALNS.txt；实例数据归原作者所有。
"""

import argparse
from importlib.metadata import version
from pathlib import Path

import numpy as np
import tsplib95
from alns import ALNS
from alns.accept import HillClimbing
from alns.select import RouletteWheel
from alns.stop import MaxIterations


SEED = 7654
DEGREE = 0.1
ITERATIONS = 10_000
OPTIMUM = 564  # XQF131 的已知最优长度，仅用于输出差距。


def load_data(path):
    """读取城市及距离；预先算好边长，搜索时直接查字典。"""
    problem = tsplib95.load(str(path))
    if problem.name.lower() != "xqf131" or problem.dimension != 131:
        raise ValueError("请提供 XQF131 实例文件。")
    if problem.edge_weight_type != "EUC_2D":
        raise ValueError("本例要求 TSPLIB EUC_2D 距离。")
    nodes = tuple(problem.node_coords)
    # get_weight 对每条边执行 floor(欧氏距离 + 0.5)，不要改用 round()。
    distances = {
        (u, v): problem.get_weight(u, v) for u in nodes for v in nodes
    }
    return nodes, distances


class TspState:
    """edges[u] = v 表示 u → v；破坏后暂时是一组路径，修复后是完整回路。"""

    def __init__(self, nodes, distances, edges):
        self.nodes = nodes
        self.distances = distances
        self.edges = dict(edges)

    def copy(self):
        # 城市和距离只读共享；复制会变化的边，保护当前解与历史最优解。
        return TspState(self.nodes, self.distances, self.edges)

    def objective(self):
        """ALNS 用完整路线的总长度比较解的优劣，越小越好。"""
        if len(self.edges) != len(self.nodes):
            raise ValueError("请先修复路线，再计算完整解的目标值。")
        return sum(self.distances[u, self.edges[u]] for u in self.nodes)


def edges_to_remove(state):
    """每次破坏删除 10% 的边；XQF131 为 13 条，小实例至少一条。"""
    return max(1, int(len(state.nodes) * DEGREE))


def random_removal(current, rng):
    """随机删去不同的边，探索分散在路线各处的改动。"""
    destroyed = current.copy()
    indices = rng.choice(len(current.nodes), edges_to_remove(current), replace=False)
    for idx in indices:
        del destroyed.edges[destroyed.nodes[idx]]
    return destroyed


def path_removal(current, rng):
    """随机选起点，沿原路线连续删边，集中重建一段路径。"""
    destroyed = current.copy()
    node = destroyed.nodes[rng.choice(len(destroyed.nodes))]
    for _ in range(edges_to_remove(current)):
        node = destroyed.edges.pop(node)
    return destroyed


def worst_removal(current, rng):
    """删去最长的边，优先重新考虑代价大的连接。"""
    destroyed = current.copy()
    ordered = sorted(
        destroyed.nodes,
        key=lambda node: destroyed.distances[node, destroyed.edges[node]],
    )
    for idx in range(edges_to_remove(current)):
        del destroyed.edges[ordered[-(idx + 1)]]
    return destroyed


def would_form_subcycle(from_node, to_node, state):
    """判断新增 from_node → to_node 是否会提前封闭一条路径。

    前提：中间状态是不相交的路径（含孤立城市）；起点缺出边，终点缺入边。
    例如已有 1 → 2 和 3 → 4：2 → 1 会提前成环，2 → 3 则合并两条路径。
    从候选终点沿后继走到路径尾，若尾就是候选起点，新增边便会闭环。
    唯一例外是已有 n-1 条边：此时所有城市已连成一条路径，必须允许
    最后闭环。例如 1 → 2 → 3 → 4 可以补上 4 → 1。
    """
    if len(state.edges) == len(state.nodes) - 1:
        return False
    node = to_node
    while node in state.edges:
        node = state.edges[node]
    return node == from_node


def greedy_repair(current, rng):
    """把破坏产生的路径重新拼成一个环，也用于从空状态构造初始解。"""
    incoming = set(current.edges.values())
    # 随机安排处理顺序，让同一个残缺解也可能得到不同的修复结果。
    for idx in rng.permutation(len(current.nodes)):
        node = current.nodes[idx]
        if node in current.edges:
            continue
        candidates = {
            other for other in current.nodes
            if other != node
            if other not in incoming
            if not would_form_subcycle(node, other, current)
        }
        if not candidates:
            raise ValueError("没有可连接的城市，请检查输入是否为合法的路径集合。")
        # 保留原脚本的 set/min 平局处理，使同种子对照不因等长边改变。
        nearest = min(candidates, key=lambda other: current.distances[node, other])
        # 搜索时修改的是破坏算子创建的副本；每次连接两条路径，最后才闭环。
        current.edges[node] = nearest
        incoming.add(nearest)
    return current


def run_search(initial, seed=SEED, iterations=ITERATIONS):
    """注册算子，明确选择、接受和停止规则，交给 ALNS 执行搜索循环。"""
    algorithm = ALNS(np.random.default_rng(seed))
    algorithm.add_destroy_operator(random_removal)
    algorithm.add_destroy_operator(path_removal)
    algorithm.add_destroy_operator(worst_removal)
    algorithm.add_repair_operator(greedy_repair)

    # 四档奖励依次对应：刷新最优、改善当前、接受、拒绝；不是算子初始权重。
    # 每轮选中的算子更新为 0.8 * 旧权重 + 0.2 * 本轮奖励。
    # 按权重比例抽取三个破坏算子之一；修复算子只有一个，必然选中。
    selector = RouletteWheel([3, 2, 1, 0.5], 0.8, 3, 1)
    accept = HillClimbing()  # 接受更短或等长的解，拒绝更长的解。
    stop = MaxIterations(iterations)
    # 每轮：选择算子 → 破坏 → 修复 → 判断接受 → 更新权重与历史最优。
    result = algorithm.iterate(initial.copy(), selector, accept, stop)
    return result, selector


def main():
    default_data = Path(__file__).resolve().parent / (
        "../../../_private/ALNS/upstream-v7.0.0/data/xqf131.tsp"
    )
    parser = argparse.ArgumentParser(description="XQF131 的 ALNS 教学示例")
    parser.add_argument("--data-file", type=Path, default=default_data, help="xqf131.tsp 路径")
    args = parser.parse_args()
    if version("alns") != "7.0.0":
        parser.error("请先安装 alns==7.0.0。")

    nodes, distances = load_data(args.data_file)
    # 初始化与搜索各用一个新 RNG，避免初始化消耗的随机数改变搜索序列。
    initial = greedy_repair(TspState(nodes, distances, {}), np.random.default_rng(SEED))
    result, selector = run_search(initial)
    best = result.best_state

    route = [nodes[0]]
    for _ in nodes:
        route.append(best.edges[route[-1]])
    print(f"初始长度：{initial.objective()}")
    print(f"搜索最佳长度：{best.objective()}（迭代 {ITERATIONS:,} 次）")
    print(f"相对已知最优值 {OPTIMUM} 的差距：{100 * (best.objective() / OPTIMUM - 1):.3f}%")
    print("完整路线：", " → ".join(map(str, route)))
    print("破坏算子最终权重（随机、路径、最差）：", selector.destroy_weights)


if __name__ == "__main__":
    main()
