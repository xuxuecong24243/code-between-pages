"""Reproduce the ALNS 7.0.0 TSP example and a paired selector experiment.

Adapted from N-Wouda/ALNS, tag v7.0.0, examples/travelling_salesman_problem.ipynb:
https://github.com/N-Wouda/ALNS/blob/v7.0.0/examples/travelling_salesman_problem.ipynb
Upstream copyright and MIT license are retained in LICENSE-ALNS.txt beside this file.
The XQF131 data belongs to its original authors; this script does not download it.

Run `python alns_tsp.py --help`. All paths can be supplied explicitly. The defaults
locate this blog repository's existing private data and write results beside this
script. The program only writes outputs for the explicitly requested command.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.metadata
import json
import os
import platform
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from types import MappingProxyType
from typing import Mapping

import numpy as np
import tsplib95
from tsplib95.distances import euclidean

from alns import ALNS
from alns.accept import HillClimbing
from alns.select import RandomSelect, RouletteWheel
from alns.stop import MaxIterations, MaxRuntime


HERE = Path(__file__).resolve().parent
SEED = 7654
SCORES = [3, 2, 1, 0.5]
DECAY = 0.8
DEGREE = 0.1
UPSTREAM = "https://github.com/N-Wouda/ALNS/tree/v7.0.0"


@dataclass(frozen=True)
class TspData:
    """Shared immutable instance; node IDs need not be consecutive integers."""

    name: str
    nodes: tuple[int, ...]
    coords: Mapping[int, tuple[float, float]]
    index: Mapping[int, int]
    distances: np.ndarray
    optimum: float
    optimal_route: tuple[int, ...]

    def distance(self, left: int, right: int) -> float:
        return float(self.distances[self.index[left], self.index[right]])


def load_data(data_dir: Path) -> TspData:
    problem = tsplib95.load(str(data_dir / "xqf131.tsp"))
    tour_path = data_dir / "xqf131.opt.tour"
    if not tour_path.is_file():
        tour_path = data_dir / "xqf131.tour"
    solution = tsplib95.load(str(tour_path))
    if problem.edge_weight_type != "EUC_2D":
        raise ValueError("This example expects TSPLIB EUC_2D distances.")
    nodes = tuple(problem.node_coords)
    coords = {node: tuple(problem.node_coords[node]) for node in nodes}
    index = {node: idx for idx, node in enumerate(nodes)}
    matrix = np.array(
        [[euclidean(coords[a], coords[b]) for b in nodes] for a in nodes],
        dtype=np.float64,
    )
    matrix.setflags(write=False)
    route = tuple(solution.tours[0])
    if len(route) != len(nodes) or set(route) != set(nodes):
        raise ValueError("The reference tour must visit every instance node once.")
    optimum = float(problem.trace_tours([list(route)])[0])
    data = TspData(
        str(problem.name), nodes, MappingProxyType(coords), MappingProxyType(index),
        matrix, optimum, route,
    )
    reference = state_from_route(data, route)
    validate_state(reference)
    if reference.objective() != optimum or optimum != 564:
        raise ValueError("XQF131 reference tour must have TSPLIB length 564.")
    # Independent library accessor checks the matrix convention for every pair.
    if any(data.distance(a, b) != problem.get_weight(a, b) for a in nodes for b in nodes):
        raise ValueError("Distance matrix disagrees with TSPLIB weights.")
    return data


# region state
class TspState:
    """A complete tour or a set of directed paths during repair."""

    def __init__(self, data: TspData, edges: dict[int, int]):
        self.data = data
        self.nodes = data.nodes
        self.edges = dict(edges)  # edges[u] = v means the tour goes from u to v.

    def copy(self) -> TspState:
        # Only edges changes. Coordinates, node IDs and distance matrix are read-only.
        return TspState(self.data, self.edges)

    def objective(self) -> float:
        # Only call on complete states: a partial state's cost is not a TSP objective.
        if len(self.edges) != len(self.nodes):
            raise ValueError("Repair this partial state before evaluating its objective.")
        return sum(self.data.distance(node, self.edges[node]) for node in self.nodes)
# endregion state


def state_from_route(data: TspData, route: tuple[int, ...] | list[int]) -> TspState:
    return TspState(data, dict(zip(route, (*route[1:], route[0]))))


def validate_state(state: TspState) -> list[int]:
    """Independently verify in/out degrees AND exactly one cycle, then return it."""
    nodes = set(state.nodes)
    if set(state.edges) != nodes:
        raise ValueError("A complete tour needs one outgoing edge for every node.")
    values = list(state.edges.values())
    if len(values) != len(set(values)) or set(values) != nodes:
        raise ValueError("A complete tour needs one incoming edge for every node.")
    start = state.nodes[0]
    route, seen, node = [], set(), start
    for _ in state.nodes:
        if node in seen:
            raise ValueError("The tour contains a premature subcycle.")
        route.append(int(node))
        seen.add(node)
        node = state.edges[node]
    if node != start or seen != nodes:
        raise ValueError("The route does not form a single Hamiltonian cycle.")
    return route


# region destroy
def edges_to_remove(state: TspState, degree: float = DEGREE) -> int:
    if not 0 < degree <= 1:
        raise ValueError("The destruction fraction must be in (0, 1].")
    return max(1, int(len(state.edges) * degree))


def random_removal(current: TspState, rng, degree=DEGREE) -> TspState:
    destroyed = current.copy()
    indices = rng.choice(len(current.nodes), edges_to_remove(current, degree), replace=False)
    for idx in indices:
        del destroyed.edges[destroyed.nodes[idx]]
    return destroyed


def path_removal(current: TspState, rng, degree=DEGREE) -> TspState:
    destroyed = current.copy()
    node = destroyed.nodes[rng.choice(len(destroyed.nodes))]
    for _ in range(edges_to_remove(current, degree)):
        node = destroyed.edges.pop(node)
    return destroyed


def worst_removal(current: TspState, rng, degree=DEGREE) -> TspState:
    destroyed = current.copy()
    ordered = sorted(
        destroyed.nodes,
        key=lambda node: destroyed.data.distance(node, destroyed.edges[node]),
    )
    for idx in range(edges_to_remove(current, degree)):
        del destroyed.edges[ordered[-(idx + 1)]]
    return destroyed
# endregion destroy


# region repair
def would_form_subcycle(from_node: int, to_node: int, state: TspState) -> bool:
    # Follow existing successors. A cycle is allowed only when it visits ALL nodes.
    for step in range(1, len(state.nodes)):
        if to_node not in state.edges:
            return False
        to_node = state.edges[to_node]
        if from_node == to_node and step != len(state.nodes) - 1:
            return True
    return False


def greedy_repair(current: TspState, rng, **kwargs) -> TspState:
    visited = set(current.edges.values())  # Nodes that already have an incoming edge.
    indices = rng.permutation(len(current.nodes))
    nodes = [current.nodes[idx] for idx in indices]

    while len(current.edges) != len(current.nodes):
        node = next(node for node in nodes if node not in current.edges)
        unvisited = {
            other for other in current.nodes
            if other != node
            if other not in visited
            if not would_form_subcycle(node, other, current)
        }
        if not unvisited:
            raise ValueError("No feasible repair edge; the partial state is invalid.")
        # Retain the upstream set/min tie handling for this integer-ID example.
        nearest = min(unvisited, key=lambda other: current.data.distance(node, other))
        current.edges[node] = nearest
        visited.add(nearest)
    return current
# endregion repair


def initial_solution(data: TspData, seed: int = SEED) -> TspState:
    state = greedy_repair(TspState(data, {}), np.random.default_rng(seed))
    validate_state(state)
    return state


def digest_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def digest_object(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


# region run
def run_search(initial: TspState, selector_name: str, seed: int,
               iterations: int | None = None, seconds: float | None = None) -> dict:
    if (iterations is None) == (seconds is None):
        raise ValueError("Specify exactly one stopping budget: iterations or seconds.")

    # Every run gets fresh RNG, ALNS, selector, acceptance and stopping objects.
    algorithm = ALNS(np.random.default_rng(seed))
    algorithm.add_destroy_operator(random_removal)
    algorithm.add_destroy_operator(path_removal)
    algorithm.add_destroy_operator(worst_removal)
    algorithm.add_repair_operator(greedy_repair)
    if selector_name == "roulette":
        selector = RouletteWheel(SCORES, DECAY, 3, 1)
    elif selector_name == "random":
        selector = RandomSelect(3, 1)
    else:
        raise ValueError(f"Unknown selector: {selector_name}")
    accept = HillClimbing()
    stop = MaxIterations(iterations) if iterations is not None else MaxRuntime(seconds)

    before = dict(initial.edges)
    start = time.perf_counter()
    result = algorithm.iterate(initial.copy(), selector, accept, stop, degree=DEGREE)
    elapsed = time.perf_counter() - start
    if initial.edges != before:
        raise AssertionError("Search mutated the shared initial solution.")
    route = validate_state(result.best_state)
    objective = result.best_state.objective()
    current = result.statistics.objectives
    best = np.minimum.accumulate(current)  # Valid here: HillClimbing accepts all improvements.
    total_iterations = len(current) - 1
    if iterations is not None and total_iterations != iterations:
        raise AssertionError("The requested iteration budget was not respected.")
    if np.any(np.diff(current) > 0):
        raise AssertionError("HillClimbing must not accept an objective increase.")
    config = {
        "selector": selector_name, "search_seed": seed, "initial_seed": SEED,
        "initial_route_sha256": digest_object(validate_state(initial)),
        "degree_of_destruction": DEGREE, "removed_edges": edges_to_remove(initial),
        "scores": SCORES, "decay": DECAY, "acceptance": "HillClimbing",
        "max_iterations": iterations, "max_runtime_seconds": seconds,
        "destroy_operators": [name for name, _ in algorithm.destroy_operators],
        "repair_operators": [name for name, _ in algorithm.repair_operators],
        "distance_rule": "TSPLIB EUC_2D: floor(Euclidean distance + 0.5)",
    }
    # Keep a small, explicitly sampled trace; endpoints and exact run totals remain.
    stride = 50 if iterations is not None else max(1, total_iterations // 1200)
    indices = sorted(set(range(0, total_iterations + 1, stride)) | {total_iterations})
    times = np.r_[0.0, np.cumsum(result.statistics.runtimes)]
    return {
        "config": config, "config_sha256": digest_object(config),
        "initial_objective": initial.objective(), "objective": objective,
        "optimum": initial.data.optimum,
        "gap_percent": 100 * (objective - initial.data.optimum) / initial.data.optimum,
        "iterations": total_iterations, "elapsed_seconds": elapsed,
        "library_runtime_seconds": result.statistics.total_runtime,
        "feasible": True, "route": route,
        "destroy_counts": dict(result.statistics.destroy_operator_counts),
        "outcome_order": ["BEST", "BETTER", "ACCEPT", "REJECT"],
        "final_destroy_weights": selector.destroy_weights.tolist()
            if selector_name == "roulette" else None,
        "trace_stride": stride,
        "trace": [{"iteration": idx, "seconds": float(times[idx]),
                   "current": float(current[idx]), "best": float(best[idx])}
                  for idx in indices],
    }
# endregion run


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def environment(data_dir: Path) -> dict:
    packages = ["alns", "numpy", "matplotlib", "tsplib95", "networkx", "nbformat", "nbclient", "ipykernel"]
    versions = {}
    for package in packages:
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = None
    inputs = [path for path in data_dir.iterdir() if path.is_file() and path.suffix in {".tsp", ".tour"}]
    notebook = data_dir.parent / "travelling_salesman_problem.ipynb"
    if notebook.is_file():
        inputs.append(notebook)
    return {
        "recorded_at_utc": datetime.now(timezone.utc).isoformat(),
        "python": sys.version, "platform": platform.platform(),
        "machine": platform.machine(), "processor": platform.processor(),
        "logical_cpu_count": os.cpu_count(), "packages": versions,
        "script_sha256": digest_file(Path(__file__)),
        "input_sha256": {path.name: digest_file(path) for path in sorted(inputs)},
        "upstream": UPSTREAM,
        "implementation_changes": [
            "Copy mutable edges while sharing immutable instance instead of deepcopy.",
            "Explicit node-ID mapping rather than assuming consecutive one-based IDs.",
            "Remove at least one edge (unchanged for 131 nodes and degree 0.1).",
            "Guard partial objectives and empty repair candidates; validate complete tours.",
            "Preserve upstream set/min tie handling and random-number consumption.",
        ],
    }


def verify(data: TspData) -> dict:
    """Contract checks exercise mutation, subtours, rounding and reproducibility."""
    initial = initial_solution(data)
    if initial.objective() != 854:
        raise AssertionError(f"Expected official initial cost 854, got {initial.objective()}.")
    if euclidean((0, 0), (2.5, 0)) != 3:
        raise AssertionError("Use TSPLIB nint, not Python banker's round.")
    original = dict(initial.edges)
    cases = 0
    for operator in (random_removal, path_removal, worst_removal):
        for seed in range(10):
            destroyed = operator(initial, np.random.default_rng(seed))
            if initial.edges != original or destroyed.edges is initial.edges:
                raise AssertionError("Destroy modified or aliased the current state.")
            if len(destroyed.edges) != 118:
                raise AssertionError("10% destruction must remove 13 XQF131 edges.")
            try:
                destroyed.objective()
            except ValueError:
                pass
            else:
                raise AssertionError("Partial objective should be rejected.")
            validate_state(greedy_repair(destroyed, np.random.default_rng(seed)))
            cases += 1
    # Nonconsecutive IDs catch accidental use of IDs as matrix indices.
    ids = (10, 20, 30, 40)
    coords = {10: (0, 0), 20: (1, 0), 30: (1, 1), 40: (0, 1)}
    matrix = np.array([[euclidean(coords[a], coords[b]) for b in ids] for a in ids])
    matrix.setflags(write=False)
    tiny = TspData("square", ids, MappingProxyType(coords),
                   MappingProxyType({v: i for i, v in enumerate(ids)}), matrix, 4, ids)
    partial = TspState(tiny, {10: 20})
    if not would_form_subcycle(20, 10, partial):
        raise AssertionError("A two-node subcycle must be rejected.")
    almost = TspState(tiny, {10: 20, 20: 30, 30: 40})
    if would_form_subcycle(40, 10, almost):
        raise AssertionError("Closing the complete tour must be allowed.")
    invalid = TspState(tiny, {10: 20, 20: 10, 30: 40, 40: 30})
    try:
        validate_state(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError("Correct degrees alone do not exclude subtours.")
    square = state_from_route(tiny, ids)
    for operator in (random_removal, path_removal, worst_removal):
        for seed in range(10):
            rng = np.random.default_rng(seed)
            damaged = operator(square, rng)
            if len(damaged.edges) != 3:
                raise AssertionError("Small instances still need a nonempty destroy move.")
            validate_state(greedy_repair(damaged, rng))
            cases += 1
    for name in ("random", "roulette"):
        first = run_search(initial, name, 123, iterations=100)
        second = run_search(initial, name, 123, iterations=100)
        if first["route"] != second["route"] or first["destroy_counts"] != second["destroy_counts"]:
            raise AssertionError("Fresh components must reproduce a fixed-seed run.")
    return {
        "passed": True, "initial_objective": initial.objective(), "reference_objective": data.optimum,
        "destroy_repair_cases": cases,
        "checks": ["all matrix entries agree with TSPLIB", "reference tour feasible and length 564",
                   "official initial solution length 854", "TSPLIB half-up rounding",
                   "destroy state isolation", "partial objective guard", "repair feasibility",
                   "nonconsecutive node IDs", "small-instance nonempty destruction",
                   "premature subcycle rejected", "complete tour closure allowed",
                   "independent single-cycle validation", "fresh-component seed reproducibility"],
    }


def comparison_summary(runs: list[dict]) -> dict:
    summary = {}
    for name in ("random", "roulette"):
        selected = [run for run in runs if run["config"]["selector"] == name]
        objectives = np.array([run["objective"] for run in selected])
        times = np.array([run["elapsed_seconds"] for run in selected])
        gaps = np.array([run["gap_percent"] for run in selected])
        summary[name] = {
            "runs": len(selected), "mean_objective": float(objectives.mean()),
            "std_objective_ddof1": float(objectives.std(ddof=1)),
            "min_objective": float(objectives.min()), "max_objective": float(objectives.max()),
            "mean_gap_percent": float(gaps.mean()), "std_gap_percent_ddof1": float(gaps.std(ddof=1)),
            "mean_elapsed_seconds": float(times.mean()), "std_elapsed_seconds_ddof1": float(times.std(ddof=1)),
            "all_feasible": all(run["feasible"] for run in selected),
        }
    by_seed = {}
    for run in runs:
        by_seed.setdefault(run["config"]["search_seed"], {})[run["config"]["selector"]] = run["objective"]
    differences = np.array([pair["roulette"] - pair["random"] for pair in by_seed.values()])
    summary["paired_roulette_minus_random"] = {
        "mean_objective_difference": float(differences.mean()),
        "std_difference_ddof1": float(differences.std(ddof=1)),
        "roulette_better": int(np.sum(differences < 0)), "tie": int(np.sum(differences == 0)),
        "random_better": int(np.sum(differences > 0)),
    }
    return summary


def write_comparison_csv(path: Path, runs: list[dict]) -> None:
    fields = ["selector", "seed", "initial_objective", "objective", "gap_percent",
              "iterations", "elapsed_seconds", "feasible", "config_sha256"]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for run in runs:
            row = {field: run[field] for field in fields if field not in {"selector", "seed"}}
            row.update(selector=run["config"]["selector"], seed=run["config"]["search_seed"])
            writer.writerow(row)


def make_plots(data: TspData, results_dir: Path, image_dir: Path) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    image_dir.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.size": 11, "axes.spines.top": False, "axes.spines.right": False})
    baseline_path = results_dir / "baseline.json"
    if baseline_path.exists():
        result = json.loads(baseline_path.read_text(encoding="utf-8"))
        initial = initial_solution(data)
        fig, axes = plt.subplots(1, 2, figsize=(11, 5), constrained_layout=True)
        for axis, route, title in zip(axes, [validate_state(initial), result["route"]],
                                    [f"Initial: {initial.objective():.0f}",
                                     f"Local baseline: {result['objective']:.0f} (gap {result['gap_percent']:.2f}%)"]):
            closed = route + [route[0]]
            xy = np.array([data.coords[node] for node in closed])
            axis.plot(xy[:, 0], xy[:, 1], "o-", markersize=2.4, linewidth=0.8, color="#287f9c")
            axis.set(title=title, aspect="equal", xlabel="x", ylabel="y")
        fig.savefig(image_dir / "baseline-routes.png", dpi=170)
        plt.close(fig)
        trace = result["trace"]
        fig, axis = plt.subplots(figsize=(9, 4), constrained_layout=True)
        axis.plot([p["seconds"] for p in trace], [p["current"] for p in trace], label="Current (= best under HC)")
        axis.axhline(data.optimum, color="#b45b36", linestyle="--", label="Known optimum: 564")
        budget = result["config"]["max_runtime_seconds"]
        axis.set(xlabel="Elapsed search time (seconds)", ylabel="Tour length",
                 title=f"Local {budget:g}-second baseline (sampled trace)")
        axis.legend()
        fig.savefig(image_dir / "baseline-convergence.png", dpi=170)
        plt.close(fig)
    comparison_path = results_dir / "comparison.json"
    if comparison_path.exists():
        runs = json.loads(comparison_path.read_text(encoding="utf-8"))["runs"]
        fig, axis = plt.subplots(figsize=(9, 4.5), constrained_layout=True)
        for name, color in (("random", "#526a91"), ("roulette", "#bd6538")):
            chosen = sorted((run for run in runs if run["config"]["selector"] == name), key=lambda run: run["config"]["search_seed"])
            axis.plot([run["config"]["search_seed"] for run in chosen], [run["objective"] for run in chosen], "o-", label=name, color=color)
        axis.axhline(data.optimum, color="#777777", linestyle="--", label="Known optimum: 564")
        budget = runs[0]["config"]["max_iterations"]
        axis.set(xlabel="Search seed", ylabel="Final tour length",
                 title=f"Paired selector comparison ({budget:,} iterations each)")
        axis.legend()
        fig.savefig(image_dir / "comparison-objectives.png", dpi=170)
        plt.close(fig)
        fig, axis = plt.subplots(figsize=(9, 4.5), constrained_layout=True)
        for name, color in (("random", "#526a91"), ("roulette", "#bd6538")):
            chosen = [run for run in runs if run["config"]["selector"] == name]
            histories = np.array([[point["best"] for point in run["trace"]] for run in chosen])
            axis.plot([point["iteration"] for point in chosen[0]["trace"]], histories.mean(axis=0), label=name, color=color)
        axis.axhline(data.optimum, color="#777777", linestyle="--", label="Known optimum: 564")
        count = len(runs) // 2
        axis.set(xlabel="Iteration", ylabel=f"Mean best tour length ({count} seeds)",
                 title="Selector comparison (every 50 iterations)")
        axis.legend()
        fig.savefig(image_dir / "comparison-convergence.png", dpi=170)
        plt.close(fig)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["validate", "baseline", "compare", "report", "all"])
    parser.add_argument("--data-dir", type=Path, default=HERE.parents[2] / "_private/ALNS/upstream-v7.0.0/data")
    parser.add_argument("--results-dir", type=Path, default=HERE / "results")
    parser.add_argument("--image-dir", type=Path, default=HERE / "img")
    parser.add_argument("--seconds", type=float, default=60)
    parser.add_argument("--iterations", type=int, default=10_000)
    parser.add_argument("--seeds", nargs="+", type=int, default=list(range(10)))
    args = parser.parse_args()
    if args.seconds <= 0 or args.iterations <= 0:
        parser.error("Budgets must be positive.")
    if len(args.seeds) < 2 or len(set(args.seeds)) != len(args.seeds):
        parser.error("Use at least two distinct seeds for a sample standard deviation.")
    if importlib.metadata.version("alns") != "7.0.0":
        parser.error("This version-pinned experiment requires alns==7.0.0.")
    data = load_data(args.data_dir)
    args.results_dir.mkdir(parents=True, exist_ok=True)
    env = environment(args.data_dir)
    if args.command != "report":
        write_json(args.results_dir / "environment.json", env)
    if args.command in {"validate", "all"}:
        checks = verify(data)
        write_json(args.results_dir / "validation.json", checks)
        print(json.dumps(checks, ensure_ascii=False), flush=True)
    if args.command in {"baseline", "all"}:
        baseline = run_search(initial_solution(data), "roulette", SEED, seconds=args.seconds)
        baseline["environment"] = env
        write_json(args.results_dir / "baseline.json", baseline)
        print(f"baseline: objective={baseline['objective']:.0f}, gap={baseline['gap_percent']:.3f}%, "
              f"iterations={baseline['iterations']}, seconds={baseline['elapsed_seconds']:.3f}", flush=True)
    if args.command in {"compare", "all"}:
        initial = initial_solution(data)
        runs = []
        for idx, seed in enumerate(args.seeds):
            # Alternate execution order to reduce simple warm-up/load-order bias.
            names = ("random", "roulette") if idx % 2 == 0 else ("roulette", "random")
            for name in names:
                result = run_search(initial, name, seed, iterations=args.iterations)
                runs.append(result)
                write_json(args.results_dir / "comparison.json", {"environment": env, "runs": runs})
                print(f"{name:8s} seed={seed}: objective={result['objective']:.0f}, "
                      f"gap={result['gap_percent']:.3f}%, seconds={result['elapsed_seconds']:.3f}", flush=True)
        write_comparison_csv(args.results_dir / "comparison.csv", runs)
        summary = comparison_summary(runs)
        write_json(args.results_dir / "summary.json", summary)
        print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    if args.command in {"baseline", "compare", "report", "all"}:
        make_plots(data, args.results_dir, args.image_dir)


if __name__ == "__main__":
    main()
