"""Generate the explicitly constructed six-city example, not experiment results."""
import json
import math
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch

HERE = Path(__file__).resolve().parent
POINTS = {"A": (0, 0), "B": (2, 0), "C": (4, 0),
          "D": (4, 3), "E": (2, 3), "F": (0, 3)}
ROUTES = [list("ACBDFE"), list("ABCDFE"), list("ABCDEF")]


def length(route):
    return sum(math.dist(POINTS[a], POINTS[b])
               for a, b in zip(route, route[1:] + route[:1]))


def draw(axis, route, title, partial=False):
    edges = list(zip(route, route[1:]))
    if not partial:
        edges.append((route[-1], route[0]))
    for a, b in edges:
        # Curve long horizontal links slightly so intermediate city labels stay clear.
        bend = 0.14 if POINTS[a][1] == POINTS[b][1] and abs(POINTS[a][0]-POINTS[b][0]) > 2 else 0
        arrow = FancyArrowPatch(POINTS[a], POINTS[b], arrowstyle="-|>",
                                mutation_scale=14, linewidth=2, color="#287f9c",
                                shrinkA=13, shrinkB=13, connectionstyle=f"arc3,rad={bend}")
        axis.add_patch(arrow)
    for name, (x, y) in POINTS.items():
        axis.scatter(x, y, s=360, color="#f4f8fb", edgecolors="#287f9c", zorder=3)
        axis.text(x, y, name, ha="center", va="center", fontsize=12, zorder=4)
    axis.set(xlim=(-.5, 4.5), ylim=(-.65, 3.7), aspect="equal", title=title)
    axis.axis("off")


def main():
    lengths = [length(route) for route in ROUTES]
    expected = [12 + 2 * math.sqrt(13), 13 + math.sqrt(13), 14]
    assert all(math.isclose(a, b) for a, b in zip(lengths, expected))
    probability = math.exp(-(lengths[1] - lengths[2]) / 2)
    fig, axes = plt.subplots(2, 2, figsize=(10, 8), constrained_layout=True)
    draw(axes[0, 0], ROUTES[0], f"1. Initial: {lengths[0]:.3f}")
    draw(axes[0, 1], ROUTES[1], f"2. After 2-opt: {lengths[1]:.3f}")
    draw(axes[1, 0], list("ABCD"), "3. Destroy D-F, F-E, E-A", partial=True)
    axes[1, 0].text(2, -.52, "Incomplete paths: no tour objective", ha="center", fontsize=10)
    draw(axes[1, 1], ROUTES[2], f"4. Repair D-E, E-F, F-A: {lengths[2]:.3f}")
    fig.suptitle("Constructed teaching example | unrounded Euclidean distances", fontsize=13)
    (HERE / "img").mkdir(exist_ok=True)
    fig.savefig(HERE / "img/tsp-teaching.png", dpi=170)
    plt.close(fig)
    record = {"kind": "constructed teaching example, not a stochastic run",
              "coordinates": POINTS, "distance_rule": "unrounded Euclidean",
              "routes": ROUTES, "lengths": lengths,
              "annealing_example": {"temperature": 2, "acceptance_probability": probability},
              "updated_weights": [1, 1.4, 1], "probabilities": [1/3.4, 1.4/3.4, 1/3.4]}
    (HERE / "results").mkdir(exist_ok=True)
    (HERE / "results/teaching-example.json").write_text(
        json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(record))


if __name__ == "__main__":
    main()
