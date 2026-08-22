/**
 * BGM + SFX：仅音频文件（OGG）播放
 */

/**
 * 装饰性音效随机（音高抖动）用真实随机：模块加载时捕获，
 * 不受录像回放 withSeededRng 的全局 Math.random 替换影响。
 */
const SFX_RANDOM = Math.random.bind(Math);

/** 音频文件映射：musicId → OGG 文件路径 */
export const AUDIO_FILE_MAP = {
  s1_mid: 'assets/bgm/押っ開かれた火蓋 ～ Slow Starter.ogg',
  s1_boss: 'assets/bgm/真夏の妖精の夢.ogg',
  s2_mid: 'assets/bgm/押っ開かれた火蓋 ～ Slow Starter.ogg',
  s2_boss: 'assets/bgm/イントゥ・バックドア.ogg',
  s3_mid: 'assets/bgm/プレステ・ジョアンの黄金境.ogg',
  s3_boss: 'assets/bgm/どうせなら命を賭けて謎を解け.ogg',
  // 巡查姬章节 music id 为 'patrol'（见 s_patrol faceDefaults）
  patrol: 'assets/bgm/妖怪裏参道.ogg',
  a4_mid: 'assets/bgm/Dr.レイテンシーの眠れなくなる瞳.ogg',
  a4_boss: 'assets/bgm/摘苹果.ogg',
  a5_mid: 'assets/bgm/進まねばならぬ道.ogg',
  a5_boss: 'assets/bgm/天空のグリニッジ.ogg',
  a6_mid: 'assets/bgm/振り向かない黄泉の道.ogg',
  a6_boss: 'assets/bgm/最後の一人は慣れてるから　〜 Stone Goddess.ogg',
  b4_mid: 'assets/bgm/小鳥達の黒羽焚き.ogg',
  b4_boss: 'assets/bgm/弹舌.ogg',
  b5_mid: 'assets/bgm/記憶の深海に沈む少女.ogg',
  b5_boss: 'assets/bgm/二枚貝の上のハルシネーション.ogg',
  b6_mid: 'assets/bgm/逸脱者達の無礙光 ～ Kingdom of Nothingness..ogg',
  b6_boss: 'assets/bgm/秘匿されたフォーシーズンズ.ogg',
  ex_mid: 'assets/bgm/妖怪裏参道.ogg',
  ex_boss: 'assets/bgm/輝く針の小人族　～ Little Princess.ogg',
};

/**
 * 循环内播放位置纯函数：now 相对 startT 的偏移按 dur 取模回绕 ∈ [0, dur)。
 * 数据异常（非有限值 / dur≤0）返回 null。musicPosition 与 seekMusic 共用。
 * @param {number} now
 * @param {number} startT
 * @param {number} dur
 * @returns {number|null}
 */
export function wrapMusicPos(now, startT, dur) {
  if (!Number.isFinite(now) || !Number.isFinite(startT) || !Number.isFinite(dur) || !(dur > 0)) return null;
  const pos = (now - startT) % dur;
  if (!Number.isFinite(pos)) return null;
  return pos < 0 ? pos + dur : pos;
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicVolume = 1;
    this._musicBaseGain = 0.48;
    this.currentId = null;

    this._audioSourceNode = null;
    this._audioBufferCache = new Map();
    this._audioBufferLoading = new Map();
    /** 当前曲目开始播放的 ctx 时间（musicPosition/seekMusic 用） */
    this._musicStartT = 0;
    /** 当前曲目 AudioBuffer 与其时长（seekMusic 用；stopMusic 时清空 buffer） */
    this._musicBuf = null;
    this._musicBufDur = 0;
  }

  _musicTargetGain() {
    return Math.max(1e-4, this._musicBaseGain * Math.max(0, Math.min(1, this.musicVolume)));
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, Number(v) || 0));
    if (!this.ctx || !this.musicGain || !this.currentId) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this._musicTargetGain(), t);
  }

  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -18;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 2.8;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.2;

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.comp.connect(this.master);
    this.master.connect(this.ctx.destination);

    this._wireMusicBus();

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.4;
    this.sfxGain.connect(this.comp);
  }

  _wireMusicBus() {
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._musicTargetGain();
    this.musicGain.connect(this.comp);

    const delay = this.ctx.createDelay(1);
    delay.delayTime.value = 0.22;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.2;
    const dsend = this.ctx.createGain();
    dsend.gain.value = 0.15;
    const dlp = this.ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 3200;
    this.musicGain.connect(dsend);
    dsend.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(dlp);
    dlp.connect(this.comp);
  }

  /**
   * 将预载 decode 的 AudioBuffer 写入缓存（path 与 AUDIO_FILE_MAP 值一致）
   * @param {string} path
   * @param {AudioBuffer} buf
   */
  cacheAudioBuffer(path, buf) {
    if (path && buf) this._audioBufferCache.set(path, buf);
  }

  async loadAudioBuffer(musicId) {
    const path = AUDIO_FILE_MAP[musicId];
    if (!path) return null;
    if (this._audioBufferCache.has(path)) return this._audioBufferCache.get(path);
    if (this._audioBufferLoading.has(path)) return this._audioBufferLoading.get(path);

    const p = (async () => {
      await this.ensure();
      // 路径含日文/全角符号时用分段 encode，避免部分环境 fetch 失败
      const url = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Audio file load fail: ${path}`);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await this.ctx.decodeAudioData(arrayBuf.slice(0));
      this._audioBufferCache.set(path, audioBuf);
      return audioBuf;
    })();
    this._audioBufferLoading.set(path, p);
    try {
      return await p;
    } finally {
      this._audioBufferLoading.delete(path);
    }
  }

  /**
   * 用户手势后调用：resume AudioContext，并对预载失败的曲目补 decode。
   * 移动端常见 boot 时 context suspended 导致预载静默失败。
   */
  async unlockAndRetryPreload() {
    await this.ensure();
    const missing = [];
    for (const path of Object.values(AUDIO_FILE_MAP)) {
      if (path && !this._audioBufferCache.has(path)) missing.push(path);
    }
    if (!missing.length) return;
    await Promise.all(missing.map(async (path) => {
      try {
        const url = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
        const res = await fetch(url);
        if (!res.ok) return;
        const arrayBuf = await res.arrayBuffer();
        const decoded = await this.ctx.decodeAudioData(arrayBuf.slice(0));
        this.cacheAudioBuffer(path, decoded);
      } catch (_) { /* 单曲失败不阻塞 */ }
    }));
  }

  stopMusic(fade = 0.4) {
    if (!this.ctx) return;

    if (this._audioSourceNode) {
      try { this._audioSourceNode.stop(); } catch (_) {}
      this._audioSourceNode.disconnect();
      this._audioSourceNode = null;
    }

    if (this.musicGain) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(Math.max(1e-4, this.musicGain.gain.value), t);
      this.musicGain.gain.linearRampToValueAtTime(1e-4, t + fade);
    }
    this.currentId = null;
    this._musicBuf = null;
  }

  async playTrack(id) {
    if (!this.enabled) return;
    await this.ensure();
    const musicId = id || 's1_mid';
    if (this.currentId === musicId) return;

    if (!AUDIO_FILE_MAP[musicId]) return;

    this.stopMusic(0.25);

    let audioBuf;
    try {
      audioBuf = await this.loadAudioBuffer(musicId);
    } catch (e) {
      console.warn(`[audio] failed to load '${musicId}'`, e);
      return;
    }
    if (!audioBuf) return;

    this.currentId = musicId;
    this._musicBuf = audioBuf;
    this._musicBufDur = audioBuf.duration;

    const now = this.ctx.currentTime;
    this._musicStartT = now;
    try { this.musicGain.disconnect(); } catch (_) {}
    this._wireMusicBus();
    this.musicGain.gain.setValueAtTime(1e-4, now);
    this.musicGain.gain.linearRampToValueAtTime(this._musicTargetGain(), now + 0.6);

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuf;
    src.loop = true;
    src.connect(this.musicGain);
    src.start(now);
    this._audioSourceNode = src;
  }

  /**
   * 当前曲目在循环内的播放位置（秒）；无曲目 / 无 context / 数据异常返回 null。
   * Nomiss 模式章首记录进章位置，被弹重开当前章时回带用。
   */
  musicPosition() {
    if (!this.ctx || !this._audioSourceNode || !this._musicBufDur) return null;
    return wrapMusicPos(this.ctx.currentTime, this._musicStartT, this._musicBufDur);
  }

  /**
   * 无缝把当前曲目回带到 offset（秒）继续播放（loop 取模）。
   * 曲目不变（currentId 不变），仅重接 source；增益按 playTrack 同款 0.6s ramp。
   * 非 Nomiss 场景也可用于任意 BGM 回带。
   */
  seekMusic(offset) {
    if (!this.enabled || !this.ctx) return;
    if (!this._audioSourceNode || !this._musicBuf || !(this._musicBufDur > 0)) return;
    const o = Number(offset);
    if (!Number.isFinite(o)) return;
    let clamped = ((o % this._musicBufDur) + this._musicBufDur) % this._musicBufDur;
    // 防御钳制：src.start(when, offset) 要求 offset ∈ [0, dur)；
    // 公式本身保证 ∈[0,dur)，此处兜底避免浮点/实现差异把 offset 推到 dur
    if (!(clamped < this._musicBufDur)) clamped = 0;

    // 停掉当前 source（不淡出增益；短淡入由下方 ramp 负责）
    try { this._audioSourceNode.stop(); } catch (_) {}
    this._audioSourceNode.disconnect();
    this._audioSourceNode = null;

    // 重接 music bus（playTrack 同款）
    const now = this.ctx.currentTime;
    try { this.musicGain.disconnect(); } catch (_) {}
    this._wireMusicBus();
    this.musicGain.gain.setValueAtTime(1e-4, now);
    this.musicGain.gain.linearRampToValueAtTime(this._musicTargetGain(), now + 0.6);

    const src = this.ctx.createBufferSource();
    src.buffer = this._musicBuf;
    src.loop = true;
    src.connect(this.musicGain);
    src.start(this.ctx.currentTime, clamped);
    this._audioSourceNode = src;
    this._musicStartT = this.ctx.currentTime - clamped;
  }

  async sfx(type) {
    if (!this.enabled) return;
    await this.ensure();
    const t = this.ctx.currentTime;
    const blip = (f, d, v, typ = 'square') => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = typ;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(1e-4, t + d);
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + d + 0.02);
    };
    const arp = (freqs, typ, step, gain, rampDur, stopGap) => {
      freqs.forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = typ;
        o.frequency.value = f;
        const tt = t + i * step;
        g.gain.setValueAtTime(gain, tt);
        g.gain.exponentialRampToValueAtTime(1e-4, tt + rampDur);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(tt);
        o.stop(tt + stopGap);
      });
    };
    if (type === 'shot') blip(880 + SFX_RANDOM() * 200, 0.04, 0.04);
    else if (type === 'bomb') {
      blip(120, 0.35, 0.12, 'sawtooth');
      blip(80, 0.4, 0.08, 'sine');
    } else if (type === 'hit') blip(200, 0.08, 0.05);
    else if (type === 'graze') {
      // 轻脆「擦」：短高音 + 轻微泛音，比旧版更可听
      blip(1680 + SFX_RANDOM() * 220, 0.045, 0.045, 'sine');
      blip(2400 + SFX_RANDOM() * 180, 0.03, 0.02, 'triangle');
    }
    else if (type === 'dead') {
      blip(400, 0.25, 0.09, 'sawtooth');
      blip(200, 0.3, 0.08, 'sawtooth');
    } else if (type === 'item') {
      blip(660, 0.09, 0.05, 'sine');
      blip(990, 0.11, 0.045, 'sine');
    } else if (type === 'ok') {
      blip(523, 0.08, 0.05);
      blip(784, 0.1, 0.05);
    } else if (type === 'extend') {
      arp([523, 659, 784, 1046], 'sine', 0.06, 0.06, 0.18, 0.2);
    } else if (type === 'cancel') blip(300, 0.1, 0.04);
    else if (type === 'letter') {
      arp([523, 659, 784, 1046], 'triangle', 0.07, 0.05, 0.14, 0.16);
    }
  }
}

export function trackForStage(stageId, isBoss) {
  const map = {
    1: ['s1_mid', 's1_boss'],
    2: ['s2_mid', 's2_boss'],
    3: ['s3_mid', 's3_boss'],
    patrol: ['patrol', 'patrol'],
    A4: ['a4_mid', 'a4_boss'],
    A5: ['a5_mid', 'a5_boss'],
    A6: ['a6_mid', 'a6_boss'],
    B4: ['b4_mid', 'b4_boss'],
    B5: ['b5_mid', 'b5_boss'],
    B6: ['b6_mid', 'b6_boss'],
    EX: ['ex_mid', 'ex_boss'],
  };
  const pair = map[stageId] || map[1];
  return isBoss ? pair[1] : pair[0];
}
