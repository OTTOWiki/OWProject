/**
 * BGM：参考文件夹 MIDI × 干净电子音色
 * （去掉失真箱体链，恢复方波/三角/正弦叠层）
 */

const m2f = (m) => 440 * 2 ** ((m - 69) / 12);

/** 关卡 music id → JSON 文件 id */
export const MUSIC_FILE_MAP = {
  s1_mid: 'th08_05',
  s1_boss: 'th08_09',
  s2_mid: 'th08_16',
  s2_boss: 'th08_10',
  s3_mid: 'th12_08',
  s3_boss: 'th08_15',
  patrol: 'th10_11',
  a4_mid: 'th10_10',
  a4_boss: 'th10_13',
  a5_mid: 'th11_09',
  a5_boss: 'th11_15',
  a6_mid: 'th08_18',
  a6_boss: 'th08_15',
  b4_mid: 'th12_08',
  b4_boss: 'th08_10',
  b5_mid: 'th11_09',
  b5_boss: 'th10_13',
  b6_mid: 'th08_18',
  b6_boss: 'th11_15',
  ex_mid: 'th08_18',
  ex_boss: 'th11_15',
  default: 'th08_05',
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    /** 用户音乐音量 0–1（默认 1 = 100%） */
    this.musicVolume = 1;
    /** BGM bus 基准增益（再乘 musicVolume） */
    this._musicBaseGain = 0.48;
    this.currentId = null;
    this._timer = null;
    this._notes = null;
    this._cursor = 0;
    this._loopDur = 0;
    this._origin = 0;
    this._loopIndex = 0;
    this._ahead = 0.28;
    this._cache = new Map();
    this._loading = new Map();
  }

  /** 当前应输出的 BGM 增益 */
  _musicTargetGain() {
    return Math.max(1e-4, this._musicBaseGain * Math.max(0, Math.min(1, this.musicVolume)));
  }

  /**
   * 设置音乐音量（0–1）。可在播放中即时生效。
   * @param {number} v
   */
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

    // 轻延迟（电子空间感）
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

  async loadSoundfonts() {
    await this.ensure();
    return this.loadTrackData('s1_mid');
  }

  async loadMidiNotes() {
    return this.loadTrackData('s1_mid');
  }

  fileIdFor(musicId) {
    return MUSIC_FILE_MAP[musicId] || MUSIC_FILE_MAP.default;
  }

  /**
   * 将已解析的 MIDI JSON 写入缓存（供启动预载复用，避免二次 fetch）
   * @param {string} fileId assets/midi 文件名（无扩展名）
   * @param {object} data
   */
  cacheMidiData(fileId, data) {
    if (!fileId || !data || this._cache.has(fileId)) {
      return this._cache.get(fileId) || null;
    }
    const notes = data.notes || [];
    let end = data.duration || 0;
    if (!end) {
      for (const n of notes) end = Math.max(end, n.t + n.d);
    }
    const pack = {
      fileId,
      notes,
      duration: Math.max(20, end + 0.6),
      source: data.source || fileId,
    };
    this._cache.set(fileId, pack);
    return pack;
  }

  async loadTrackData(musicId) {
    const fileId = this.fileIdFor(musicId);
    if (this._cache.has(fileId)) return this._cache.get(fileId);
    if (this._loading.has(fileId)) return this._loading.get(fileId);

    const p = (async () => {
      const url = `assets/midi/${fileId}.json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`MIDI JSON load fail: ${url}`);
      const data = await res.json();
      const pack = this.cacheMidiData(fileId, data);
      console.info(`[audio] ${fileId}: ${pack.notes.length} notes, ${pack.duration.toFixed(1)}s`);
      return pack;
    })();
    this._loading.set(fileId, p);
    try {
      return await p;
    } finally {
      this._loading.delete(fileId);
    }
  }

  stopMusic(fade = 0.4) {
    if (!this.ctx) return;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this.musicGain) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(Math.max(1e-4, this.musicGain.gain.value), t);
      this.musicGain.gain.linearRampToValueAtTime(1e-4, t + fade);
    }
    this.currentId = null;
    this._notes = null;
    this._cursor = 0;
    this._loopIndex = 0;
  }

  async playTrack(id) {
    if (!this.enabled) return;
    await this.ensure();
    const musicId = id || 's1_mid';
    if (this.currentId === musicId) return;

    let pack;
    try {
      pack = await this.loadTrackData(musicId);
    } catch (e) {
      console.error(e);
      pack = await this.loadTrackData('s1_mid');
    }

    this.stopMusic(0.25);
    this.currentId = musicId;
    this._notes = pack.notes;
    this._loopDur = pack.duration;
    this._cursor = 0;
    this._loopIndex = 0;

    const now = this.ctx.currentTime;
    try {
      this.musicGain.disconnect();
    } catch {}
    this._wireMusicBus();
    this.musicGain.gain.setValueAtTime(1e-4, now);
    this.musicGain.gain.linearRampToValueAtTime(this._musicTargetGain(), now + 0.6);

    this._origin = now + 0.12;
    this._timer = setInterval(() => this._scheduler(), 18);
    this._prefetchNeighbors(musicId);
  }

  _prefetchNeighbors(musicId) {
    const ids = Object.keys(MUSIC_FILE_MAP);
    const i = ids.indexOf(musicId);
    for (const id of [ids[i + 1], ids[i + 2], 's1_boss'].filter(Boolean)) {
      this.loadTrackData(id).catch(() => {});
    }
  }

  _scheduler() {
    if (!this._notes || !this.currentId) return;
    const now = this.ctx.currentTime;
    const look = now + this._ahead;

    while (this._cursor < this._notes.length) {
      const n = this._notes[this._cursor];
      const when = this._origin + this._loopIndex * this._loopDur + n.t;
      if (when > look) break;
      if (when + n.d > now - 0.04) {
        this._playNote(when, n.n, n.d, (n.v || 80) / 127);
      }
      this._cursor++;
    }

    if (this._cursor >= this._notes.length) {
      const loopEnd = this._origin + (this._loopIndex + 1) * this._loopDur;
      if (now + this._ahead >= loopEnd - 0.05) {
        this._loopIndex++;
        this._cursor = 0;
      }
    }
  }

  /**
   * 干净电子音色：
   * 低音 sine+triangle；中高音 square+triangle+sine 八度
   */
  _playNote(time, midi, dur, vel = 0.6) {
    const ctx = this.ctx;
    const freq = m2f(midi);
    const isBass = midi < 52;

    const out = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(isBass ? 1000 : midi >= 72 ? 4500 : 3000, time);
    filt.Q.value = 0.7;

    if (isBass) {
      this._osc(time, freq, dur, 'sine', 0.38 * vel, out);
      this._osc(time, freq, dur, 'triangle', 0.16 * vel, out);
    } else {
      this._osc(time, freq, dur, 'square', 0.14 * vel, out);
      this._osc(time, freq, dur, 'triangle', 0.22 * vel, out);
      this._osc(time, freq * 2, dur * 0.8, 'sine', 0.07 * vel, out);
    }

    const peak = 0.55 * Math.min(1, vel + 0.12);
    out.gain.setValueAtTime(1e-4, time);
    out.gain.linearRampToValueAtTime(peak, time + 0.012);
    out.gain.linearRampToValueAtTime(peak * 0.72, time + Math.min(0.1, dur * 0.28));
    out.gain.setValueAtTime(peak * 0.55, time + Math.max(0.05, dur - 0.07));
    out.gain.exponentialRampToValueAtTime(1e-4, time + dur + 0.05);

    out.connect(filt);
    filt.connect(this.musicGain);
  }

  _osc(time, freq, dur, type, gain, dest) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    g.gain.value = gain;
    osc.connect(g);
    g.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.08);
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
    if (type === 'shot') blip(880 + Math.random() * 200, 0.04, 0.04);
    else if (type === 'bomb') {
      blip(120, 0.35, 0.12, 'sawtooth');
      blip(80, 0.4, 0.08, 'sine');
    } else if (type === 'hit') blip(200, 0.08, 0.05);
    else if (type === 'graze') blip(1400 + Math.random() * 400, 0.03, 0.025, 'sine');
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
      [523, 659, 784, 1046].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const tt = t + i * 0.06;
        g.gain.setValueAtTime(0.06, tt);
        g.gain.exponentialRampToValueAtTime(1e-4, tt + 0.18);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(tt);
        o.stop(tt + 0.2);
      });
    } else if (type === 'cancel') blip(300, 0.1, 0.04);
    else if (type === 'letter') {
      [523, 659, 784, 1046].forEach((f, i) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        const tt = t + i * 0.07;
        g.gain.setValueAtTime(0.05, tt);
        g.gain.exponentialRampToValueAtTime(1e-4, tt + 0.14);
        o.connect(g);
        g.connect(this.sfxGain);
        o.start(tt);
        o.stop(tt + 0.16);
      });
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

export const TRACKS = Object.fromEntries(
  Object.keys(MUSIC_FILE_MAP).map((k) => [k, true])
);
