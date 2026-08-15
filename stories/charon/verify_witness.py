#!/usr/bin/env python3
"""确定性验证：手写 8 条选项序列，逐一走引擎确认落到对应结局。"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tools.engine import Engine  # noqa: E402

NODES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nodes")

PATHS = {
    "Node_End_1": [
        ("Node_1_1", "接受授权，问清规则"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "强查原始门锁日志"), ("Node_1_7", "强制调取原始数据"),
        ("Node_1_4", "诈她：死者像自己用了药"), ("Node_1_9", "答应保密"),
        ("Node_1_10", "继续深挖"), ("Node_1_13", "独自继续调查"),
        ("Node_1_14", "进入第二幕"), ("Node_2_1", "救沈棠"),
        ("Node_2_2", "追问我们是谁"), ("Node_2_5", "调查死因"),
        ("Node_2_6", "弃权观察"), ("Node_2_7", "质疑为什么这么完美"),
        ("Node_2_9", "告诉纪岚"), ("Node_2_10", "听纪岚讲完旧案"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "继续深挖真相"),
        ("Node_3_6", "都不信，要求当众摊牌"), ("Node_3_7", "牺牲一名 NPC 逼现形"),
    ],
    "Node_End_2": [
        ("Node_1_1", "接受授权，问清规则"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "接受密室结论"), ("Node_1_4", "接受官方结论"),
        ("Node_1_10", "指认裴延"), ("Node_1_11", "接受裁决"),
    ],
    "Node_End_3": [
        ("Node_1_1", "拒绝授权，独立调查"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "接受密室结论"), ("Node_1_4", "接受官方结论"),
        ("Node_1_10", "指认裴延"), ("Node_1_11", "最后一刻反悔"),
        ("Node_1_13", "独自继续调查"), ("Node_1_14", "进入第二幕"),
        ("Node_2_1", "找白烬"), ("Node_2_4", "与他结盟"),
        ("Node_2_5", "质问某人"), ("Node_2_6", "支持处决裴延"),
        ("Node_2_7", "接受证据链"), ("Node_2_8", "逼他认罪"),
        ("Node_2_10", "两不相帮"), ("Node_2_11", "进入第三幕"),
        ("Node_3_1", "主导重启推进器"), ("Node_3_2", "用交易换取授权"),
        ("Node_3_4", "与白烬独走"),
    ],
    "Node_End_4": [
        ("Node_1_1", "拒绝授权，独立调查"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "接受密室结论"), ("Node_1_4", "接受官方结论"),
        ("Node_1_10", "指认裴延"), ("Node_1_11", "最后一刻反悔"),
        ("Node_1_13", "独自继续调查"), ("Node_1_14", "进入第二幕"),
        ("Node_2_1", "留在安全区观察"), ("Node_2_5", "质问某人"),
        ("Node_2_6", "支持处决裴延"), ("Node_2_7", "接受证据链"),
        ("Node_2_8", "逼他认罪"), ("Node_2_10", "两不相帮"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "主导重启推进器"),
        ("Node_3_2", "用交易换取授权"), ("Node_3_4", "授权失败·净舱"),
    ],
    "Node_End_5": [
        ("Node_1_1", "接受授权，问清规则"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "接受密室结论"), ("Node_1_4", "接受官方结论"),
        ("Node_1_10", "指认裴延"), ("Node_1_11", "最后一刻反悔"),
        ("Node_1_13", "独自继续调查"), ("Node_1_14", "进入第二幕"),
        ("Node_2_1", "留在安全区观察"), ("Node_2_5", "调查死因"),
        ("Node_2_6", "弃权观察"), ("Node_2_7", "质疑为什么这么完美"),
        ("Node_2_9", "独自深挖"), ("Node_2_10", "两不相帮"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "主导指认异常体"),
        ("Node_3_5", "指认死者林溯"), ("Node_3_6", "相信林溯，联手逼回声体现形"),
        ("Node_3_7", "犹豫不决"),
    ],
    "Node_End_6": [
        ("Node_1_1", "接受授权，问清规则"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "强查原始门锁日志"), ("Node_1_7", "强制调取原始数据"),
        ("Node_1_4", "诈她：死者像自己用了药"), ("Node_1_9", "答应保密"),
        ("Node_1_10", "继续深挖"), ("Node_1_13", "独自继续调查"),
        ("Node_1_14", "进入第二幕"), ("Node_2_1", "救沈棠"),
        ("Node_2_2", "追问我们是谁"), ("Node_2_5", "调查死因"),
        ("Node_2_6", "弃权观察"), ("Node_2_7", "质疑为什么这么完美"),
        ("Node_2_9", "告诉纪岚"), ("Node_2_10", "听纪岚讲完旧案"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "继续深挖真相"),
        ("Node_3_6", "都不信，要求当众摊牌"), ("Node_3_7", "自己顶上被牺牲的位置"),
        ("Node_3_10", "与童野保住种子库"),
    ],
    "Node_End_7": [
        ("Node_1_1", "接受授权，问清规则"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "强查原始门锁日志"), ("Node_1_7", "强制调取原始数据"),
        ("Node_1_4", "诈她：死者像自己用了药"), ("Node_1_9", "答应保密"),
        ("Node_1_10", "继续深挖"), ("Node_1_13", "独自继续调查"),
        ("Node_1_14", "进入第二幕"), ("Node_2_1", "救沈棠"),
        ("Node_2_2", "追问我们是谁"), ("Node_2_5", "调查死因"),
        ("Node_2_6", "弃权观察"), ("Node_2_7", "质疑为什么这么完美"),
        ("Node_2_9", "告诉纪岚"), ("Node_2_10", "听纪岚讲完旧案"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "继续深挖真相"),
        ("Node_3_6", "都不信，要求当众摊牌"), ("Node_3_7", "自己顶上被牺牲的位置"),
        ("Node_3_10", "面对自己的身份"),
    ],
    "Node_End_8": [
        ("Node_1_1", "拒绝授权，独立调查"), ("Node_1_2", "先去现场看尸体"),
        ("Node_1_3", "接受密室结论"), ("Node_1_4", "诈她：死者像自己用了药"),
        ("Node_1_9", "答应保密"), ("Node_1_10", "继续深挖"),
        ("Node_1_13", "独自继续调查"), ("Node_1_14", "进入第二幕"),
        ("Node_2_1", "留在安全区观察"), ("Node_2_5", "调查死因"),
        ("Node_2_6", "弃权观察"), ("Node_2_7", "质疑为什么这么完美"),
        ("Node_2_9", "独自深挖"), ("Node_2_10", "两不相帮"),
        ("Node_2_11", "进入第三幕"), ("Node_3_1", "只记录，不干预"),
        ("Node_3_9", "接受这个意外结局"),
    ],
}


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    engine = Engine(nodes_dir=NODES)
    ok = True
    for end, seq in PATHS.items():
        state = engine.initial_state()
        visits = {}
        node = "Node_1_1"
        fail = None
        for expected, text in seq:
            if node != expected:
                fail = f"期望在 {expected}，实际在 {node}"
                break
            try:
                res = engine.choose(node, text, state, visits)
            except (KeyError, ValueError) as e:
                fail = str(e)
                break
            node = res["next_node"]
            state = res["state"]
        if node != end:
            fail = fail or f"最终节点 {node} != {end}"
        mark = "✅" if not fail else "❌"
        if fail:
            ok = False
        print(f"{mark} {end}: {'；'.join(t for _, t in seq)}")
        if fail:
            print(f"   失败于：{fail}")
    print(f"\n结论：{'✅ 8/8 结局均有确定性见证路径' if ok else '❌ 存在无法走通的路径'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
