/** 剧情对话数据 */

export function getDialogues(playerId) {
  const me = playerId === 'shama' ? '誓约沙玛' : '饮泉思源';
  const partner = playerId === 'shama' ? '饮泉思源' : '誓约沙玛';

  return {
    s1_boss: [
      { name: '爱丽丝', text: '杀头' },
      { name: me, text: '？' },
      { name: '爱丽丝', text: '杀头。' },
      { name: me, text: '？' },
      { name: '爱丽丝', text: '杀头' },
      { name: '爱丽丝', text: '杀头' },
    ],
    s2_boss: [
      { name: 'Icebin', text: `我找的不是${partner}吗` },
      { name: 'Icebin', text: '你出来干什么' },
      { name: me, text: '你要找的不是Resolver吗' },
      { name: me, text: '我就是啊' },
      { name: 'Icebin', text: '你够了' },
      { name: 'Icebin', text: '我无法忍受你的行为' },
    ],
    s3_boss: [
      { name: '大宗关不是·互然雏', text: '666你们玩上连缘了' },
      { name: me, text: '左边是门构皮蒂娅，右边是善雅乡……对吗？' },
      { name: '大宗关不是·互然雏', text: '还真是' },
      { name: '大宗关不是·互然雏', text: 'I want to 和你' },
      { name: '大宗关不是·互然雏', text: 'pvp' },
      { name: me, text: 'okokcumingcuming' },
    ],
    patrol: [
    // blkf姉貴=壹隻憂鬱臺灣烏龜blkf=骯髒變態囓齒blkf兄=尋釁兄貴
      { name: 'blkf姉貴', text: '飛八分錢幹飛馬' },
      { name: '壹隻憂鬱臺灣烏龜blkf', text: '乾的飛馬笑哈哈' },
      { name: '骯髒變態囓齒blkf兄', text: '飛八分鐘驚坐起' },
      { name: me, text: '飛馬已經把碧璽' },
      { name: '尋釁兄貴', text: '我缺的白粥這一塊誰給我補啊' },
    ],
    patrol_win: [
      { name: '系统', text: '左右传送门已开启。请手动选择进入 A 线（门构皮蒂娅）或 B 线（善雅乡）。' },
    ],
    patrol_lose: [
      { name: '系统', text: 'fvv' },
    ],
    a4: [
      { name: '门百梁', text: '您好～欢迎光临门构皮蒂娅入口！本通道需购买页面下方广告的「方尖碑」哦。' },
      { name: me, text: '……我们不买。' },
      { name: '门百梁', text: '肏你妈比不爆金币。再叫给你vector扬了。' },
    ],
    a4_win: [
      { name: '门百梁', text: '2025年12月27日 (六) 11:27 棍牧典 留言 贡献 封禁已封禁露家鸡 留言 贡献，到期时间为不限期（停用账号创建、​停用电子邮件） （无礼的行为、攻击/骚扰他人：​撤销露家鸡超管并永久封禁账号的公告 今天 11:28 • 62浏览 • OB25153 封禁原因： 1.私自建设若干小团体以对其他站员进行舆论压制 2.作为管理层在网站群内发癫时与管理层产生矛盾，并试图用舆论攻击管理层，影响恶劣 3.配合其他网站对本站进行“挖墙脚”行为，并引发其他网站与本网站的敌对情绪，影响极其恶劣） （解封 | 更改封禁）' },
    ],
    a4_lose: [
      { name: '门百梁', text: '人生自古谁无死？' },
    ],
    a5: [
      { name: '饮泉思源', text: `……誓约沙玛？你怎么也在这里？` },
      { name: '誓约沙玛', text: '我还想问你。' },
      { name: '饮泉思源', text: '你妈。' },
      { name: '誓约沙玛', text: '...！？' },
      { name: '饮泉思源', text: '罗布乐思小鸡鸡。' },
      { name: '誓约沙玛', text: '不许骂人！赶紧道歉！' },
    ],
    a6: [
      { name: '一美个', text: 'Nbfbf？' },
      { name: me, text: '@一美个 你的__是干什么用的' },
      { name: '一美个', text: '我就写了几个爱耄tv。这也要封？' },
      { name: '一美个', text: '爱丽丝牢内关我爱耄什么事' },
      { name: me, text: '你究竟想何出怎样的意味？' },
      { name: me, text: '恭喜你获得蛆王标识🐛<a href="https://wiki.ottohub.cn">去佩戴</a>' },
    ],
    a6_last: [
      { name: '一美个', text: '好了，不装了。我要建一个「哈机密乐园」——让所有编辑都将其转向哈基米维基。' },
      { name: '一美个', text: 'als进局子？谁在乎啊。流量——那才是真相。' },
    ],
    b4: [
      { name: '赌人时尚', text: '站住，后现代的野蛮编辑者，，，' },
      { name: '赌人时尚', text: '善雅乡入口，必须被我狠狠创击一次以洗涤灵魂，，，' },
      { name: me, text: '谢绝。' },
      { name: '赌人时尚', text: '愚昧即开明\n毁灭即创造\n奴役即解放，，，' },
    ],
    b4_win: [
      { name: '赌人时尚', text: '失算，滚进去吧，，，' },
    ],
    b4_lose: [
      { name: '赌人时尚', text: '无能狂怒，注定被创成肉饼，，，' },
    ],
    b5: [
      { name: '棍电噢哆', text: '这波怎么说？你是什么素质？' },
      { name: me, text: 'OTTOWiki成这样，你要不要解释一下？' },
      { name: '棍电噢哆', text: '不可抗力。癌症晚期用户。这把是不是你的问题，怎么说。' },
    ],
    b5_win: [
      { name: '棍电噢哆', text: '这波是队友的问题，不怪我。' },
    ],
    b5_lose: [
      { name: '棍电噢哆', text: '看到了没有？这就是世界第一的含金量' },
    ],
    b6: [
      { name: '拉斯特神炫', text: '哦？还有编辑者爬到王座前。有趣。' },
      { name: me, text: '哪来的抽取？' },
      { name: '拉斯特神炫', text: '没错。自从我尝透炫妈的温度与味道——' },
      { name: '拉斯特神炫', text: 'OTTOWiki那种８bc真的可以我说' },
      { name: me, text: '一种可以蓄电的面制品你知道吗' },
    ],
    b6_last: [
      { name: '拉斯特神炫', text: '听好了——我要用炫妈的香气覆盖整个维基世界。' },
      { name: '拉斯特神炫', text: 'OTTOWiki 将改造成只有炫狗和防御塔的绝对帝国！' },
      { name: me, text: '(描述认可并且在未来将会执行的目的的动作)' },
    ],
    ex_open: [
      { name: '系统', text: '警告：检测到 OTTOWiki 词条被批量键政覆写。来源锁定——van♂。' },
      { name: me, text: '我操恶俗啊' },
      { name: 'van♂分身', text: 'ow是日本人研发的新型鸦片，日本人一个你比肥不肥就能直接让你绝不认输然后Abuse1并且Van：代码 Macho gang：你中专填哪个专业的代码 Van：未成年目标 午餐是南大门 你已被管理员禁言 一刀一刀燃烧刀 一只小莲蓬鸭 广东省汕头市金平区 你能不能更精确点 【动画表情】' },
    ],
    ex_van: [
      { name: 'van♂', text: '终于到终局了。OTTOWiki 将被改写成键政圣经的注释本。' },
      { name: 'van♂', text: '词条属于会喊得最响的人' },
    ],
    ex_last: [
      { name: me, text: '把键政赶出维基。' },
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
      { name: '系统', text: ' 2025年7月19日 (六) 13:20 OctoberSama 留言 贡献 封禁将一*个 留言 贡献的封禁设置更改为持续时间至不限期 （停用账号创建、​停用电子邮件、​不能编辑自己的讨论页） （参见OTTOWiki:永久封禁用户） （解封 | 更改封禁）' },
      { name: '旁白', text: '「一美个」被「铬」大师判定为「垃圾内容」，拖入回收站并清空。' },
      { name: me, text: '……结束了。去主控制台看看吧。' },
      { name: partner, text: '嗯。真相应该就在那里。' },
      { name: '旁白', text: '两人来到数据主控制台前，试图寻找拯救维基的终极奥秘。' },
      { name: '旁白', text: '门构皮蒂娅靠算法广告永不倒闭；而 OTTOWiki 急转直下，只是因为创始人忘了给服务器续费' },
      { name: me, text: '等等，一*个ip怎么是海外vps' },
      { name: partner, text: '哇多麼好的機會啊' },
      { name: "旁白", text: '...' },
      { name: "系统", text: 'Linux Yihuagemeima 7.1.5-x64v3-xanmod1 #0~20260725.g2fb7a62 SMP PREEMPT_DYNAMIC Sat Jul 25 19:43:16 UTC x86_64\nLast login: Tue Aug 11 17:29:43 2026 from 1.1.1.1\nroot@Yihuagemeima:~#' },
      { name: me, text: ',成功拿下免费vps' },
    ];
  }

  if (which === 'EX') {
    return [
      { name: '旁白', text: 'Extra 结局 · 清出键政' },
      { name: '旁白', text: '2025年6月15日 (日) 11:53 OctoberSama 留言 贡献 封禁已封禁VAN莲蓬 留言 贡献，到期时间为不限期（停用账号创建、​停用电子邮件、​不能编辑自己的讨论页） （滥用多个账号进行破坏、扰乱视听、创建敏感条目、大量发送垃圾评论、编写无关内容） （解封 | 更改封禁）' },
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
