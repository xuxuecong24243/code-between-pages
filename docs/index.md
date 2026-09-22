---
layout: home

hero:
  name: Code Between Pages
  text: Personal Knowledge Base
  tagline: A personal knowledge base on optimization, scheduling, and programming.

  actions:
    - theme: brand
      text: Start Reading
      link: /programming/
    - theme: alt
      text: Research Notes
      link: /research/
---

## ⭐ Featured Posts

<div class="featured-grid">

<a class="featured-card" href="/code-between-pages/optimization/routing/lost-baggage-distribution/">
  <div class="featured-title">Lost Baggage Distribution</div>
  <div class="featured-desc">
    遗失行李配送问题：基于车辆路径优化建立整数规划模型，
    使用 Gurobi 进行两阶段优化，并通过 Lazy Constraints 消除子回路。
  </div>
  <div class="featured-tags">
    <span>VRP</span>
    <span>Gurobi</span>
    <span>Optimization</span>
  </div>
</a>

<a class="featured-card" href="/code-between-pages/programming/algorithms/graph/A-star.html">
  <div class="featured-title">A* Search Algorithm</div>
  <div class="featured-desc">
    A* 搜索算法原理、启发式函数、OPEN/CLOSED 集合、伪代码与 Python 实现。
  </div>
  <div class="featured-tags">
    <span>Python</span>
    <span>Algorithm</span>
    <span>Graph</span>
  </div>
</a>



<a class="featured-card" href="/code-between-pages/research/dynamic-programming/">
  <div class="featured-title">Dynamic Programming</div>
  <div class="featured-desc">
    从递归出发理解动态规划，介绍最优子结构、重叠子问题、
    记忆化搜索与自底向上的动态规划实现。
  </div>
  <div class="featured-tags">
    <span>DP</span>
    <span>Algorithm</span>
    <span>Python</span>
  </div>
</a>


</div>


## Explore by Topic

<div class="topic-grid">

<a class="topic-card" href="/code-between-pages/optimization/">
  <div class="topic-title">Optimization</div>
  <div class="topic-desc">
    Scheduling, routing, mathematical programming, and Gurobi-based optimization.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/software/">
  <div class="topic-title">Software</div>
  <div class="topic-desc">
    Development tools, software configuration, and practical engineering workflows.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/research/">
  <div class="topic-title">Research</div>
  <div class="topic-desc">
    Scheduling theory, literature reviews, papers, and thesis materials.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/programming/">
  <div class="topic-title">Programming</div>
  <div class="topic-desc">
    LaTeX, Git, Markdown, Python, algorithms, and development notes.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/ai/">
  <div class="topic-title">AI</div>
  <div class="topic-desc">
    ChatGPT, Claude, Cursor, prompt engineering, and AI workflows.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/interview/">
  <div class="topic-title">Interview</div>
  <div class="topic-desc">
    A collection of questions encountered during interviews.
  </div>
</a>

<a class="topic-card" href="/code-between-pages/about/">
  <div class="topic-title">About</div>
  <div class="topic-desc">
    About this site and how the knowledge base is organized.
  </div>
</a>

</div>

<style>

.featured-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 24px 0 48px;
}

.featured-card {
  display: block;
  padding: 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  transition: all 0.25s ease;
}

.featured-card:hover {
  transform: translateY(-4px);
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.featured-title {
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
  font-size: 18px;
  font-weight: 600;
}

.featured-desc {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.7;
}

.featured-tags {
  margin-top: 16px;
}

.featured-tags span {
  display: inline-block;
  padding: 3px 9px;
  margin-right: 6px;
  margin-bottom: 4px;
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-size: 12px;
}


/* 分类 */

.topic-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 24px 0 40px;
}

.topic-card {
  display: block;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  text-decoration: none !important;
  transition: all 0.2s ease;
}

.topic-card:hover {
  border-color: var(--vp-c-brand-1);
}

.topic-title {
  margin-bottom: 8px;
  color: var(--vp-c-text-1);
  font-weight: 600;
}

.topic-desc {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.6;
}


/* 手机端 */

@media (max-width: 768px) {
  .featured-grid,
  .topic-grid {
    grid-template-columns: 1fr;
  }
}

</style>