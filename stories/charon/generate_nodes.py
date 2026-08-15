#!/usr/bin/env python3
"""生成《卡戎回声》节点 JSON（供 tools/engine.py + tools/audit_paths.py 使用）。

变量映射见 stories/charon/nodes/README.md。
运行：python stories/charon/generate_nodes.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "nodes")


def C(text, target, effect=None, condition=None, outcome=None, guard=None):
    d = {"text": text, "target": target}
    if effect:
        d["effect"] = effect
    if condition:
        d["condition"] = condition
    if outcome:
        d["outcome"] = outcome
    if guard:
        d["loop_guard"] = guard
    return d


def once(hint):
    return {"hint_after": 1, "max": 2, "hint": hint, "locked_note": "该选项已用尽（仅首次有效）"}


NODES = [
    # ================================ 第一幕 ================================
    {"id": "Node_1_1", "narrative": "Day 1 04:35，警报惊醒。NORA 授予你观察者权限。", "choices": [
        C("接受授权，问清规则", "Node_1_2", effect={"bond": 5}, outcome="你接过了审计权限。"),
        C("质疑 NORA 后接受", "Node_1_2", effect={"bond": -5, "clue_a": 2}, outcome="NORA 的回答滴水不漏。"),
        C("拒绝授权，独立调查", "Node_1_2", effect={}, outcome="你没有接权限牌。"),
    ]},
    {"id": "Node_1_2", "narrative": "06:00 指挥舱。双倒计时公布，派系初现。", "choices": [
        C("先去现场看尸体", "Node_1_3", effect={"bond": 2}),
        C("先去问沈棠", "Node_1_5", effect={"bond": 1}),
        C("先确认氧气", "Node_1_6", effect={"bond": 1}),
    ]},
    {"id": "Node_1_3", "narrative": "实验舱现场：内部反锁的密室、真空、空针管。", "choices": [
        C("接受密室结论", "Node_1_4", effect={"clue_a": 10}, outcome="门禁记录显示裴延深夜删过记录。"),
        C("强查原始门锁日志", "Node_1_7", effect={"bond": -3}, condition={"bond_min": 5}),
        C("查针管与领药记录", "Node_1_4", effect={"clue_a": 5, "clue_c": 3}),
    ]},
    {"id": "Node_1_4", "narrative": "医疗舱。纪岚给出官方结论：真空窒息。", "choices": [
        C("接受官方结论", "Node_1_10", effect={"clue_a": 5}),
        C("追问还有没有别的发现", "Node_1_9", effect={"bond": -1}, condition={"bond_min": 1}),
        C("诈她：死者像自己用了药", "Node_1_9", effect={"clue_c": 3, "bond": -2}, outcome="纪岚失态露馅。"),
    ]},
    {"id": "Node_1_5", "narrative": "通讯舱。沈棠反复说：死者还在说话。", "choices": [
        C("追问你听到了什么", "Node_1_8", effect={"sanity": -5, "bond": -2, "clue_b": 5},
          condition={"bond_min": 1}, outcome="她提到了不该存在的脉冲。"),
        C("安抚她，先记录", "Node_1_2", effect={"bond": 2}, guard=once("安抚过一次，再安抚不再加信任。")),
        C("追向天线区", "Node_1_2", effect={"sanity": -10}, guard=once("理智不足以再追。")),
    ]},
    {"id": "Node_1_6", "narrative": "生命维持区。氧气损耗异常，童野说是风暴损耗。", "choices": [
        C("查库存记录", "Node_1_10", effect={"clue_c": 3, "bond": -1}, outcome="有 7% 氧气对不上。"),
        C("相信童野", "Node_1_10", effect={"bond": 2}),
    ]},
    {"id": "Node_1_7", "narrative": "强查门锁日志：0.7 秒空隙 + 过度修复痕。", "choices": [
        C("强制调取原始数据", "Node_1_4", effect={"clue_b": 10, "bond": -8}, outcome="0.7 秒，又是 0.7 秒。"),
        C("迂回找陈戍问门锁机制", "Node_1_4", effect={"clue_b": 3}),
    ]},
    {"id": "Node_1_8", "narrative": "通讯日志：一条记录被删，备份被过度修复。", "choices": [
        C("要求看 NORA 备份", "Node_1_10", effect={"clue_b": 8, "bond": -3}, outcome="修复痕里藏着 0.7 秒。"),
        C("帮沈棠隐瞒", "Node_1_10", effect={"bond": 3, "clue_b": 3}),
    ]},
    {"id": "Node_1_9", "narrative": "尸检追问：死者细胞没有完全死透。", "choices": [
        C("答应保密", "Node_1_10", effect={"clue_c": 12, "bond": 2}, outcome="这是意识分离的残留。"),
        C("拒绝保密，公开", "Node_1_10", effect={"clue_c": 12, "bond": -5}),
    ]},
    {"id": "Node_1_10", "narrative": "证据梳理：表面证据已指向裴延。", "choices": [
        C("指认裴延", "Node_1_11", effect={"bond": -5}, condition={"clue_min": 15, "clue_max": 24}),
        C("继续深挖", "Node_1_13", condition={"clue_min": 25}),
        C("继续深挖（证据不足，先回现场）", "Node_1_2", effect={"bond": -2}, condition={"clue_max": 24},
          guard=once("回现场翻过一次，没有新发现。")),
        C("找裴延对质", "Node_1_10", effect={"clue_a": 5}, condition={"bond_min": 3},
          guard=once("已对质过，得不到更多。")),
        C("找裴延对质（他戒备你）", "Node_1_2", effect={"bond": -1}, condition={"bond_max": 2}),
    ]},
    {"id": "Node_1_11", "narrative": "你指认裴延。他短暂辩解后认罪。", "choices": [
        C("接受裁决", "Node_End_2", outcome="真相被永久掩盖。"),
        C("最后一刻反悔", "Node_1_13", effect={"clue_a": 2}, condition={"clue_min": 15}),
    ]},
    {"id": "Node_1_13", "narrative": "你串起三次 0.7 秒：证据是被精心布置的。", "choices": [
        C("独自继续调查", "Node_1_14", effect={"clue_c": 5}),
        C("告诉纪岚", "Node_1_14", effect={"bond": 3, "clue_c": 3}),
        C("试探 NORA", "Node_1_14", effect={"bond": -2, "clue_c": 2}),
    ]},
    {"id": "Node_1_14", "narrative": "Day 1 结束，你进入修整。", "choices": [
        C("进入第二幕", "Node_2_1"),
    ]},

    # ================================ 第二幕 ================================
    {"id": "Node_2_1", "narrative": "Day 2 00:00，第二次信号风暴。", "choices": [
        C("救沈棠", "Node_2_2", effect={"bond": 2}),
        C("救童野", "Node_2_3", effect={"bond": 2}),
        C("找白烬", "Node_2_4", effect={"bond": -2}),
        C("留在安全区观察", "Node_2_5", effect={"clue_a": 3}),
    ]},
    {"id": "Node_2_2", "narrative": "沈棠濒临覆盖，一会儿哭一会儿用我们说话。", "choices": [
        C("追问我们是谁", "Node_2_5", effect={"sanity": -5, "bond": 3, "clue_b": 5}),
        C("注射镇静剂", "Node_2_5", effect={"sanity": 5, "bond": -3}),
        C("只记录不介入", "Node_2_5", effect={"clue_a": 3}),
    ]},
    {"id": "Node_2_3", "narrative": "童野私藏的备用氧气罐暴露。", "choices": [
        C("当众揭发", "Node_2_5", effect={"bond": -5}),
        C("帮他隐瞒", "Node_2_5", effect={"bond": 4}),
        C("私下问清用途", "Node_2_5", effect={"bond": 3, "clue_c": 3}, outcome="他提到了种子库。"),
    ]},
    {"id": "Node_2_4", "narrative": "白烬试探：逃生舱到底能坐几个人？", "choices": [
        C("与他结盟", "Node_2_5", effect={"bond": -4, "key": True}, outcome="他把密钥交到你手里。"),
        C("当面拒绝", "Node_2_5", effect={"bond": 3}),
        C("不动声色套话", "Node_2_5", effect={"bond": -2, "clue_a": 2}),
    ]},
    {"id": "Node_2_5", "narrative": "风暴平息。一名 NPC 死亡——死的是谁，取决于此前的选择。", "choices": [
        C("调查死因", "Node_2_6", effect={"clue_a": 3}),
        C("先安抚众人", "Node_2_6", effect={"bond": 1, "sanity": 5}),
        C("质问某人", "Node_2_6", effect={"bond": -2}),
    ]},
    {"id": "Node_2_6", "narrative": "派系撕裂，投票处决机制启动。", "choices": [
        C("支持处决裴延", "Node_2_7", effect={"bond": -5}),
        C("反对并拖延", "Node_2_7", effect={"bond": 3}),
        C("弃权观察", "Node_2_7", effect={"clue_a": 2}),
    ]},
    {"id": "Node_2_7", "narrative": "指向裴延的证据太完整了，完整到像摆好的。", "choices": [
        C("接受证据链", "Node_2_8", effect={"clue_a": 5}),
        C("质疑为什么这么完美", "Node_2_9", effect={"clue_b": 8}),
        C("先不表态", "Node_2_8", effect={"clue_a": 2}),
    ]},
    {"id": "Node_2_8", "narrative": "与裴延对质。提到女儿时，他第一次露了破绽。", "choices": [
        C("提他的女儿", "Node_2_10", effect={"bond": 4, "clue_a": 5}, outcome="他没有杀人，只是去盗数据。"),
        C("逼他认罪", "Node_2_10", effect={"bond": -4}),
        C("冷眼观察", "Node_2_10", effect={"clue_a": 3}),
    ]},
    {"id": "Node_2_9", "narrative": "你把 0.7 秒与假死迹象串起来：死者可能未死。", "choices": [
        C("独自深挖", "Node_2_10", effect={"clue_c": 5}),
        C("告诉纪岚", "Node_2_10", effect={"bond": 3, "clue_c": 3}),
        C("试探 NORA", "Node_2_10", effect={"bond": -2, "clue_c": 2}),
    ]},
    {"id": "Node_2_10", "narrative": "陈戍攥着后门权限码；纪岚讲起导师旧案。", "choices": [
        C("接过陈戍的后门", "Node_2_11", effect={"bond": 3, "clue_b": 3}),
        C("听纪岚讲完旧案", "Node_2_11", effect={"bond": 4, "clue_c": 5}),
        C("两不相帮", "Node_2_11", effect={"clue_a": 2}),
    ]},
    {"id": "Node_2_11", "narrative": "Day 2 结束，离倒计时只剩一天。", "choices": [
        C("进入第三幕", "Node_3_1"),
    ]},

    # ================================ 第三幕 ================================
    {"id": "Node_3_1", "narrative": "Day 3 凌晨。24 小时内重启推进器，否则净舱。", "choices": [
        C("主导重启推进器", "Node_3_2"),
        C("主导指认异常体", "Node_3_5"),
        C("继续深挖真相", "Node_3_6", condition={"clue_min": 40}),
        C("只记录，不干预", "Node_3_9"),
    ]},
    {"id": "Node_3_2", "narrative": "争取多数授权重启推进器。", "choices": [
        C("用诚意争取授权", "Node_3_4"),
        C("用交易换取授权", "Node_3_4", effect={"bond": -3}),
        C("放弃合作，改指认", "Node_3_5"),
    ]},
    {"id": "Node_3_3", "narrative": "SAN 濒危：你看见本不该存在的影像，听见死者说话。", "choices": [
        C("挣扎清醒", "Node_1_2", effect={"sanity": 15, "bond": -2},
          guard={"hint_after": 1, "max": 3, "hint": "你一次次从幻觉中挣扎出来。", "locked_note": "理智已到极限。"}),
        C("沉沦下去", "Node_End_5"),
    ]},
    {"id": "Node_3_4", "narrative": "终局枢纽：授权是否成功，取决于人心与证据。", "choices": [
        C("授权成功·返航", "Node_End_2", condition={"bond_min": 0, "clue_max": 39}),
        C("授权成功·返航前查真相", "Node_3_6", condition={"bond_min": 0, "clue_min": 40}),
        C("与白烬独走", "Node_End_3", condition={"key": True, "bond_max": -5}),
        C("授权失败·净舱", "Node_End_4", condition={"bond_max": -1}),
    ]},
    {"id": "Node_3_5", "narrative": "你向 NORA 提交指认。指认谁，就是谁死。", "choices": [
        C("指认裴延", "Node_3_4", effect={"bond": -5}),
        C("指认沈棠", "Node_End_5", condition={"clue_max": 9}),
        C("指认沈棠（你看穿她是回声体）", "Node_3_6", condition={"clue_min": 10}),
        C("指认死者林溯", "Node_3_6"),
    ]},
    {"id": "Node_3_6", "narrative": "林溯现身：假死、NORA 合谋、回声体已混入。", "choices": [
        C("相信林溯，联手逼回声体现形", "Node_3_7"),
        C("怀疑林溯，与 NORA 联手", "Node_3_8"),
        C("都不信，要求当众摊牌", "Node_3_7", effect={"clue_c": 5}),
    ]},
    {"id": "Node_3_7", "narrative": "最终摊牌：用死亡抉择逼回声体暴露。", "choices": [
        C("牺牲一名 NPC 逼现形", "Node_End_1", condition={"clue_min": 60, "bond_min": 5}),
        C("强行摊牌（准备不足）", "Node_End_5", condition={"clue_max": 59}),
        C("犹豫不决", "Node_End_5"),
        C("自己顶上被牺牲的位置", "Node_3_10"),
    ]},
    {"id": "Node_3_8", "narrative": "你把决定权交给 NORA。", "choices": [
        C("完全交权（信任已崩）", "Node_End_4", condition={"bond_max": -15}),
        C("完全交权", "Node_3_2", effect={"bond": -5}, condition={"bond_min": -14},
          guard=once("已经交过一次权。")),
        C("有限授权", "Node_3_7", effect={"bond": -3}),
    ]},
    {"id": "Node_3_9", "narrative": "你只记录，不指认、不授权、不交易。", "choices": [
        C("接受这个意外结局", "Node_End_8", condition={"clue_min": 40, "bond_min": -8, "bond_max": 8}),
        C("最后时刻出手", "Node_3_2", guard=once("只此一次。")),
    ]},
    {"id": "Node_3_10", "narrative": "两个秘密的交汇：种子库，与你自己的身份。", "choices": [
        C("与童野保住种子库", "Node_End_6", condition={"bond_min": 8, "clue_min": 30}),
        C("面对自己的身份", "Node_End_7", condition={"clue_min": 60}),
    ]},

    # ================================ 结局 ================================
    {"id": "Node_End_1", "narrative": "【真名】你当众揭穿一切，林溯为阻断广播牺牲。代价沉重，但真相大白。", "choices": []},
    {"id": "Node_End_2", "narrative": "【沉默的幸存者】你们活着返航。真相被永久掩盖，回声体就坐在返航舱里。", "choices": []},
    {"id": "Node_End_3", "narrative": "【与虎谋皮】你与白烬独走。舱内读数：够一个人到家。", "choices": []},
    {"id": "Node_End_4", "narrative": "【净舱】联合授权失败，NORA 清空了所有舱室。", "choices": []},
    {"id": "Node_End_5", "narrative": "【回声】你被回声体收割。最后一刻你听懂：那是收割完成的回执。", "choices": []},
    {"id": "Node_End_6", "narrative": "【种子】种子舱发射出去。数百年后，它在一颗陌生行星发芽。", "choices": []},
    {"id": "Node_End_7", "narrative": "【零】你才是被植入的回声体。你按下自己的终止键。", "choices": []},
    {"id": "Node_End_8", "narrative": "【观测者】你不干预，净舱无法触发。众人放下猜忌，一起找到生路。", "choices": []},
]


def main():
    os.makedirs(OUT, exist_ok=True)
    for n in NODES:
        fn = n["id"].lower() + ".json"
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as fh:
            json.dump(n, fh, ensure_ascii=False, indent=2)
    print(f"written {len(NODES)} nodes -> {OUT}")


if __name__ == "__main__":
    main()
