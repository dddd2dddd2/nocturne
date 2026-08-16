# 静态审查报告 · gaotai

- 方法：区间抽象解释（fixpoint，over-approx）+ 定向 DFS 见证路径
- 节点数：28

## 一、节点可达性

- 可达节点：28 / 28
- 不可达节点（抽象区间从未被填充）：无

## 二、死选项与软锁

- 死选项：无
- 软锁节点（非结局且无可满足选项）：无

## 三、结局可达性

| 结局 | 抽象可达 | 见证路径 |
|---|---|---|
| Node_End_1 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_5 -> Node_1_6 -> Node_1_7 -> Node_1_8 -> Node_2_1 -> Node_2_2 -> Node_2_3 -> Node_2_4 -> Node_2_5 -> Node_2_6 -> Node_2_7 -> Node_2_8 -> Node_3_1 -> Node_3_2 -> Node_3_4 -> Node_3_5 -> Node_3_6 -> Node_End_1 |
| Node_End_2 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_3 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_5 -> Node_1_6 -> Node_1_7 -> Node_1_8 -> Node_2_1 -> Node_2_2 -> Node_2_3 -> Node_2_4 -> Node_2_5 -> Node_2_6 -> Node_2_7 -> Node_2_8 -> Node_3_1 -> Node_3_2 -> Node_3_4 -> Node_3_5 -> Node_3_6 -> Node_End_3 |
| Node_End_4 | ✅ | （抽象可达，未找到见证/超预算） |
| Node_End_5 | ✅ | ✅ Node_1_1 -> Node_1_2 -> Node_1_3 -> Node_1_4 -> Node_1_5 -> Node_1_6 -> Node_1_7 -> Node_1_8 -> Node_2_1 -> Node_2_2 -> Node_2_3 -> Node_2_4 -> Node_2_5 -> Node_2_6 -> Node_2_7 -> Node_2_8 -> Node_3_1 -> Node_3_2 -> Node_3_3 -> Node_End_5 |
| Node_End_6 | ✅ | （抽象可达，未找到见证/超预算） |

⚠️ 注：抽象可达为 over-approximation；缺见证路径的结局需人工复核条件组合。

---
结论：❌ 发现问题（退出码 1）
