# 静态审查报告 · charon

- 方法：区间抽象解释（fixpoint，over-approx）+ 定向 DFS 见证路径
- 节点数：42

## 一、节点可达性

- 可达节点：42 / 42
- 不可达节点（抽象区间从未被填充）：无

## 二、死选项与软锁

- 死选项：无
- 软锁节点（非结局且无可满足选项）：无

## 三、结局可达性

| 结局 | 抽象可达 | 见证路径 |
|---|---|---|
| Node_End_1 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_2 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_10 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_11 -> Node_End_2 |
| Node_End_3 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_4 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_10 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_11 -> Node_1_13 -> Node_1_14 -> Node_2_1 -> Node_2_5 -> Node_2_6 -> Node_2_7 -> Node_2_9 -> Node_2_10 -> Node_2_11 -> Node_3_1 -> Node_3_5 -> Node_3_6 -> Node_3_8 -> Node_3_2 -> Node_3_5 -> Node_3_6 -> Node_3_8 -> Node_End_4 |
| Node_End_5 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_10 -> Node_1_2 -> Node_1_6 -> Node_1_10 -> Node_1_11 -> Node_1_13 -> Node_1_14 -> Node_2_1 -> Node_2_5 -> Node_2_6 -> Node_2_7 -> Node_2_9 -> Node_2_10 -> Node_2_11 -> Node_3_1 -> Node_3_5 -> Node_3_6 -> Node_3_7 -> Node_End_5 |
| Node_End_6 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_7 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_8 | ✅ | （抽象可达，未找到见证/超预算） |

⚠️ 注：抽象可达为 over-approximation；缺见证路径的结局需人工复核条件组合。

---
结论：❌ 发现问题（退出码 1）
