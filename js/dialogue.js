/** 剧情对话数据 */

export function getDialogues(playerId) {
  const me = playerId === 'shama' ? '誓约沙玛' : '饮泉思源';
  const partner = playerId === 'shama' ? '饮泉思源' : '誓约沙玛';

  return {
    s1_boss: [
      { name: '爱丽丝', text: '……检测到未授权编辑会话。两位是从哪条重定向链闯进来的？' },
      { name: me, text: '爱丽丝？OTTOWikiProject 的日常正在失真——我们来找原因。' },
      { name: '爱丽丝', text: '组织……是啊。页面还在，可引用正在蒸发。' },
      { name: '爱丽丝', text: '若你们真有探寻真相的执念，就先通过我的编辑程序测试吧。' },
      { name: '爱丽丝', text: 'Letter Card 展开——请证明你们不是又一次破坏性编辑。' },
    ],
    s2_boss: [
      { name: 'Icebin', text: '日志峰值异常。高强度编辑活动……来源锁定。' },
      { name: me, text: 'Icebin，我们没有恶意。只是想弄清 OTTOWiki 为何沉寂。' },
      { name: 'Icebin', text: '冷静陈述：你们的探索会给濒临崩溃的系统增加运算负荷。' },
      { name: 'Icebin', text: '启动编译防火墙。通过校验，或被回滚。' },
    ],
    s3_boss: [
      { name: '大宗关不是·互然雏', text: '边界守护者在此。再往前，数据流已经彻底分化。' },
      { name: me, text: '左边是门构皮蒂娅，右边是善雅乡……对吗？' },
      { name: '大宗关不是·互然雏', text: '左侧通往商业化冰冷的门构皮蒂娅；右侧通往混沌无序的善雅乡。' },
      { name: '大宗关不是·互然雏', text: '打碎我的主防火墙，才配拥有选择道路的权利。' },
    ],
    patrol: [
      { name: '全域巡查姬·404', text: '警告。检测到立场摇摆不定。' },
      { name: '全域巡查姬·404', text: '既未归附 A 线商业协议，亦未签署 B 线混沌条款。' },
      { name: '全域巡查姬·404', text: '判定：破坏性编辑。启动全站锁定流程。' },
      { name: me, text: '等等，我们只是——' },
      { name: '全域巡查姬·404', text: '404。解释不被受理。' },
    ],
    patrol_win: [
      { name: '全域巡查姬·404', text: '……校验失败。巡查进程崩溃。' },
      { name: '系统', text: '左右传送门已开启。请手动选择进入 A 线（门构皮蒂娅）或 B 线（善雅乡）。' },
    ],
    a4: [
      { name: '门百梁', text: '您好～欢迎光临门构皮蒂娅预入口！本通道需购买「方尖碑通行券」哦。' },
      { name: me, text: '……我们不买。' },
      { name: '门百梁', text: '啊您看这款限时特惠，买一送零，绝对超值！不买的话就只能——开战了呢☆' },
    ],
    a4_win: [
      { name: '门百梁', text: '行吧行吧，客服也认输……您请通行。欢迎下次光临（虽然大概不会有下次）。' },
    ],
    a4_lose: [
      { name: '门百梁', text: '欢迎您再次光临～方尖碑永远为您亮着价签！' },
    ],
    a5: [
      { name: partner, text: `……${me}？你怎么也在这里？` },
      { name: me, text: '我还想问你。门构皮蒂娅这条线，你也跟下来了？' },
      { name: partner, text: '闲谈就到这。说真的——这次探索的「战功」，你打算怎么分？' },
      { name: me, text: '……你认真的？' },
      { name: partner, text: '认真。编辑者之间的署名权，可是维基伦理的核心。' },
      { name: me, text: '那就用弹幕说话。' },
    ],
    a5_end: [
      { name: partner, text: '……好了好了，玩过火了。继续前进才是主要目标。' },
      { name: me, text: '哼。但我刚才那波编辑，确实漂亮。' },
    ],
    a6: [
      { name: '一美个', text: '哎呀～真的来了。我还以为 OTTOWiki 已经没人惦记了呢。' },
      { name: me, text: '一美个。你被逐出之后，隐患并没有消失。' },
      { name: '一美个', text: '隐患？我只是在任职期间……稍微多留了几行注释而已嘛。' },
      { name: '一美个', text: '你们来找真相？真相就是——大家都不想好好维护词条啦。' },
      { name: me, text: '少转移话题。你的真实目的是什么？' },
      { name: '一美个', text: '……那就一边打，一边听我说吧。' },
    ],
    a6_last: [
      { name: '一美个', text: '好了，不装了。我想建一个「哈机密乐园」——' },
      { name: '一美个', text: '让所有编辑都变成只会点赞的玩具。维基？谁在乎啊。' },
      { name: me, text: '……到此为止。' },
    ],
    b4: [
      { name: '赌人时尚', text: '站住，铁皮编辑者，，，' },
      { name: '赌人时尚', text: '善雅乡入口，必须被我狠狠创击一次以洗涤灵魂，，，' },
      { name: me, text: '拒绝。' },
      { name: '赌人时尚', text: '独轮创车启动——创死你是哲学，，，' },
    ],
    b4_win: [
      { name: '赌人时尚', text: '失算，竟然没能创死你，，，侧身，滚进去吧，，，' },
    ],
    b4_lose: [
      { name: '赌人时尚', text: '无能狂怒的铁皮人，注定被创成肉饼，，，' },
    ],
    b5: [
      { name: '棍电噢哆', text: '这波怎么说？你是什么素质，跑来打扰世界第一中单清修？' },
      { name: me, text: 'OTTOWikiProject 成这样，你要不要解释一下？' },
      { name: '棍电噢哆', text: '不可抗力。癌症晚期用户。这波不怪我，怎么说。' },
      { name: me, text: '嘴硬也改不了逃避现实。' },
      { name: '棍电噢哆', text: '……这也太急了。行，来打。' },
    ],
    b5_win: [
      { name: '棍电噢哆', text: '这波是队友的问题，不怪我。道路给你，傲娇归我。' },
    ],
    b5_lose: [
      { name: '棍电噢哆', text: '看到了没有？这就是世界第一的实力，怎么说！' },
    ],
    b6: [
      { name: '拉斯特神炫', text: '哦？还有编辑者爬到王座前。有趣。' },
      { name: me, text: '是你毁了 OTTOWikiProject。' },
      { name: '拉斯特神炫', text: '没错。自从我尝透炫妈的温度与味道——你们的词条就像废塔。' },
      { name: me, text: '荒谬。立刻停止。' },
      { name: '拉斯特神炫', text: '停止？神不需要停止。开战吧。' },
    ],
    b6_last: [
      { name: '拉斯特神炫', text: '听好了——我要用炫妈的香气覆盖整个维基世界。' },
      { name: '拉斯特神炫', text: 'OTTOWiki 将改造成只有炫狗和防御塔的绝对帝国！' },
      { name: me, text: '……最后的 Letter Card。结束这一切。' },
    ],
    // Extra 现网仅引用：ex_open / ex_van / ex_last（旧多阶段 ex_p2…ex_p5 无章节挂载，已删）
    ex_open: [
      { name: '系统', text: '警告：检测到 OTTOWiki 词条被批量键政覆写。来源锁定——van♂。' },
      { name: me, text: '键政……灌进百科？这比欠费还离谱。' },
      { name: 'van♂分身', text: '先从外围草稿污染起。表态、站队、转发——编辑者会自己完成剩下的。' },
      { name: me, text: '立刻停止对词条的污染。' },
      { name: 'van♂分身', text: 'Letter Card 展开——先证明你们不是又一批水军。' },
    ],
    ex_van: [
      { name: 'van♂', text: '终于到终局了。OTTOWiki 将被改写成键政圣经的注释本。' },
      { name: me, text: 'van♂……收手。词条不属于任何政见。' },
      { name: 'van♂', text: '不。词条属于会喊得最响的人。开战吧。' },
    ],
    ex_last: [
      { name: 'van♂', text: '最终覆写协议启动——全站重定向至「正确立场」。' },
      { name: me, text: '最后的 Letter。把键政赶出维基。' },
      { name: 'van♂', text: '那就让弹幕投票决定谁留下！' },
    ],
  };
}

/** 结局故事（对话行；name 用 旁白/系统/角色） */
export function getEndingDialogue(which, playerId) {
  const me = playerId === 'shama' ? '誓约沙玛' : '饮泉思源';
  const partner = playerId === 'shama' ? '饮泉思源' : '誓约沙玛';

  if (which === 'A') {
    return [
      { name: '旁白', text: '结局A · 不倒闭的真理' },
      { name: '旁白', text: '在一阵剧烈的弹幕爆炸中，「一美个」的「哈机密乐园」彻底崩溃。' },
      { name: '旁白', text: '他被「铬」自动运行的系统清理大师判定为「垃圾」，直接拖入回收站。' },
      { name: me, text: '……结束了。去主控制台看看吧。' },
      { name: partner, text: '嗯。真相应该就在那里。' },
      { name: '旁白', text: '两人来到数据主控制台前，试图寻找拯救维基的终极奥秘。' },
      { name: '系统', text: '您的服务器由于欠费 5 美元已暂停解析，请及时续费。' },
      { name: me, text: '……就这？' },
      { name: '旁白', text: '门构皮蒂娅靠算法广告永不倒闭；而 OTTOWikiProject 急转直下，只是因为创始人忘了给服务器续费——所有人看到的都是 502 Gateway Error。' },
      { name: me, text: '一美个掉的零钱包里……正好五张一美元。' },
      { name: '旁白', text: '叮。OTTOWikiProject 重新上线。' },
      { name: '旁白', text: '爱丽丝、Icebin、大宗关收到恢复邮件，编辑者陆续回归。' },
      { name: partner, text: '维基的危机，原来只是五美元的距离。' },
      { name: me, text: '……下次记得续费。' },
    ];
  }

  if (which === 'EX') {
    return [
      { name: '旁白', text: 'Extra 结局 · 清出键政' },
      { name: '旁白', text: 'van♂ 的最终覆写协议在弹幕中崩溃，键政模板被逐条回滚。' },
      { name: 'van♂', text: '……站队……表态……怎么会失败……' },
      { name: me, text: '因为百科要的是可核对的事实，不是嗓门。' },
      { name: partner, text: '把「政见」从词条里拆出去吧。讨论区有讨论区的地方。' },
      { name: '系统', text: '已执行：批量撤销键政覆写 · 恢复中性表述 · 锁定敏感重定向。' },
      { name: '旁白', text: 'OTTOWiki 的页面重新变得无聊、克制、可引用——这正是维基该有的样子。' },
      { name: me, text: '下次再灌，就再打回去。' },
    ];
  }

  return [
    { name: '旁白', text: '结局B · 散去的幻影' },
    { name: '旁白', text: '「拉斯特神炫」的结界在弹幕冲击下瓦解。' },
    { name: '拉斯特神炫', text: '炫妈……我的炫妈……' },
    { name: '旁白', text: '他跌落防空洞，宝瓶摔得粉碎。' },
    { name: me, text: '这味道是……？' },
    { name: '旁白', text: '传说中让神炫黑化的「炫妈味道」弥漫开来——其实只是福州特产虾油混杂大量清凉薄荷风油精的刺激气味。' },
    { name: partner, text: '……这要是倒灌进主机房……' },
    { name: '旁白', text: '高浓度气味顺着散热风扇倒灌进 OTTOWikiProject 主机房，化作物理级防盗防火墙。' },
    { name: '旁白', text: '任何恶意破坏者打开网页都会被熏得泪流满面，不得不关闭页面。' },
    { name: me, text: '恶意破坏……就这样停了？' },
    { name: partner, text: '虽然以后编辑大概都得戴防毒面具……' },
    { name: '旁白', text: '但大家都赞美着这来之不易的和平。' },
  ];
}

/** 兼容旧引用：纯文本拼接 */
export const ENDING_A = getEndingDialogue('A', 'yinquan').map((l) => l.text).join('\n');
export const ENDING_B = getEndingDialogue('B', 'yinquan').map((l) => l.text).join('\n');
