import { useCallback, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import BirthdayRobot from "./BirthdayRobot"

// Same camera numbers as the robot, so the page can find his head and the box.
const CAM_Y = 3.33
const FRAME_UNITS = 9
const REF_ASPECT = 4 / 3
const CAM_D = 30
const HEAD_TOP = 6.4  // top of the helmet, scene units
const HALF_W = 2.9    // half width across the ears
const GIFT = { x: 0.7, y0: 0.5, y1: 1.6, z: 1.1 }

type Line = { t: string; cls: string }
const WISH: Line[] = [
  { t: "كل عام وأنتِ بخير", cls: "hello" },
  { t: "يا رنيم", cls: "name" },
  { t: "سنة حلوة مثلك", cls: "thanks" },
]
// Original jokes: a setup, a beat, then the punchline while he laughs.
const JOKES: { q: string; a: string }[] = [
  { q: "قالوا: جيب لها هدية تشبهها", a: "دوّرت ودوّرت وما لقيت شي بهالحلاوة" },
]
// Your own song: put the audio file next to index.html with this name and
// it plays instead of the built-in beat. Set its tempo so the dance keeps
// time, where in the song to start (seconds), and how long to dance.
const SONG = { src: "song.mp3", bpm: 120, start: 43.27, seconds: 27 }
const BEAT_BPM = 112
const BEAT_DANCE_S = (64 * 60) / BEAT_BPM // sixteen bars at the built-in tempo

const PINK = "#FF5C9E", GOLD = "#E8B84A", PEARL = "#FFF1F5", ROSE = "#F4A79D", WHITE = "#FFF6F0"
const CONFETTI = [PINK, GOLD, "#FFB3D1", ROSE, WHITE, "#D93B7E", "#F6D27A"]
// light, base, rim, letter
const BALLOON_INK: Record<string, [string, string, string, string]> = {
  [PINK]: ["#FFC2DA", PINK, "#C8306F", "#FFFFFF"],
  [GOLD]: ["#FFF3C4", GOLD, "#A8761A", "#FFFFFF"],
  [PEARL]: ["#FFFFFF", PEARL, "#E7BFCD", "#C9963A"],
  [ROSE]: ["#FFE3DD", ROSE, "#C46F64", "#FFFFFF"],
}

type Layout = { W: number; H: number; S: number; k: number; placeY: number }
function measure(): Layout {
  const W = window.innerWidth, H = window.innerHeight
  const S = Math.min(H, W / REF_ASPECT)
  const k = Math.min((0.44 * H * FRAME_UNITS) / (HEAD_TOP * S), (0.8 * W * FRAME_UNITS) / (2 * HALF_W * S))
  const placeY = ((0.34 * H - (CAM_Y * S) / FRAME_UNITS) / H) * 100
  return { W, H, S, k, placeY }
}
// With the friends on stage the camera pulls back to fit all three.
const GROUP_HALF_W = 4.2 + 3.0 * 0.78
function groupScale(l: Layout) {
  return Math.min(l.k, (0.47 * l.W * FRAME_UNITS) / (GROUP_HALF_W * l.S))
}
/** World point (scene units × scale) to CSS pixels. */
function project(l: Layout, X: number, Y: number, Z: number) {
  const f = CAM_D / (CAM_D - Z * l.k)
  return {
    x: l.W / 2 + ((X * l.k * f) / FRAME_UNITS) * l.S,
    y: l.H / 2 - (((Y * l.k - CAM_Y) * f) / FRAME_UNITS) * l.S + (l.placeY / 100) * l.H,
  }
}

/* ------------------------------------------------------------ music */

function createMusic() {
  const BPM = 112, S16 = 60 / BPM / 4
  const prog = [[48, 64, 67, 72], [45, 64, 69, 72], [41, 65, 69, 72], [43, 62, 67, 71]]
  const arp = [1, 2, 3, 2, 1, 2, 3, 3, 1, 2, 3, 2, 3, 2, 1, 2]
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let noise: AudioBuffer | null = null
  let timer = 0, next = 0, step = 0, playing = false, level = 0.55, muted = false
  let silent: HTMLAudioElement | null = null
  let songData: ArrayBuffer | null = null, songBuf: AudioBuffer | null = null, songNode: AudioBufferSourceNode | null = null
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  const env = (g: GainNode, t: number, peak: number, dec: number) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec)
  }
  const tone = (type: OscillatorType, f: number, t: number, peak: number, dec: number, cut = 6000) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain(), lp = ctx!.createBiquadFilter()
    o.type = type; o.frequency.setValueAtTime(f, t); lp.type = "lowpass"; lp.frequency.value = cut
    o.connect(lp); lp.connect(g); g.connect(master!); env(g, t, peak, dec); o.start(t); o.stop(t + dec + 0.05)
  }
  const hit = (t: number, f: number, q: number, peak: number, dec: number, type: BiquadFilterType) => {
    const s = ctx!.createBufferSource(), bp = ctx!.createBiquadFilter(), g = ctx!.createGain()
    s.buffer = noise; bp.type = type; bp.frequency.value = f; bp.Q.value = q
    s.connect(bp); bp.connect(g); g.connect(master!); env(g, t, peak, dec); s.start(t); s.stop(t + dec + 0.05)
  }
  const kick = (t: number) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain()
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14)
    o.connect(g); g.connect(master!); env(g, t, 0.9, 0.28); o.start(t); o.stop(t + 0.3)
  }
  const playStep = (s: number, t: number) => {
    const pos = s % 16, ch = prog[Math.floor(s / 16) % 4]
    if (pos === 0 || pos === 8 || (pos === 10 && Math.floor(s / 16) % 2 === 1)) kick(t)
    if (pos === 4 || pos === 12) hit(t, 1800, 0.8, 0.45, 0.16, "bandpass")
    if (pos % 2 === 0) hit(t, 8000, 0.7, pos % 4 === 2 ? 0.14 : 0.07, 0.05, "highpass")
    if ([0, 3, 6, 8, 11, 14].includes(pos)) tone("square", hz(ch[0] + (pos === 6 || pos === 14 ? 12 : 0)), t, 0.16, 0.22, 700)
    if (pos % 2 === 0 || pos === 7 || pos === 15) tone("triangle", hz(ch[arp[pos]]), t, 0.22, 0.25, 4000)
    if (pos === 0) for (const m of ch.slice(1)) tone("sine", hz(m), t, 0.06, S16 * 14, 2500)
  }
  const pump = () => {
    if (!ctx) return
    while (next < ctx.currentTime + 0.12) { playStep(step, next); next += S16; step++ }
  }
  const out = () => (muted || !playing ? 0.0001 : level)
  const ramp = () => { if (ctx && master) master.gain.setTargetAtTime(out(), ctx.currentTime, 0.12) }
  // Fetch the song early; decode once sound is unlocked.
  fetch(SONG.src).then((r) => (r.ok ? r.arrayBuffer() : null)).then((d) => { songData = d; decode() }).catch(() => {})
  const decode = () => {
    if (!ctx || !songData || songBuf) return
    const d = songData; songData = null
    ctx.decodeAudioData(d).then((b) => { songBuf = b }).catch(() => {})
  }
  return {
    hasSong: () => !!songBuf,
    /** Call inside a tap: browsers only allow sound after one. */
    unlock() {
      // iPhone: let page sound play even with the silent switch on, and wake
      // the audio session with a moment of silence played inside the tap.
      try { (navigator as any).audioSession && ((navigator as any).audioSession.type = "playback") } catch {}
      if (!silent) {
        const n = 4410, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf)
        const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
        w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true)
        v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 44100, true); v.setUint32(28, 88200, true)
        v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true)
        silent = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })))
        silent.setAttribute("playsinline", "")
      }
      silent.play().catch(() => {})
      if (ctx) { ctx.resume(); return }
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      master = ctx.createGain(); master.gain.value = 0.0001
      const comp = ctx.createDynamicsCompressor()
      master.connect(comp); comp.connect(ctx.destination)
      noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
      const d = noise.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      ctx.resume()
      decode()
    },
    start() {
      if (!ctx || playing) return
      playing = true
      if (songBuf) {
        songNode = ctx.createBufferSource(); songNode.buffer = songBuf; songNode.connect(master!)
        const at = Math.min(Math.max(0, SONG.start), Math.max(0, songBuf.duration - 1))
        songNode.start(ctx.currentTime + 0.05, at)
      } else {
        step = 0; next = ctx.currentTime + 0.06
        timer = window.setInterval(pump, 25); pump()
      }
      ramp()
    },
    stop(fade = 0.5) {
      if (!ctx || !playing) return
      playing = false
      if (master) master.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3)
      const n = songNode; songNode = null
      window.setTimeout(() => { if (!playing) window.clearInterval(timer); try { n?.stop() } catch {} }, fade * 1000 + 300)
    },
    level(v: number) { level = v; ramp() },
    mute(m: boolean) { muted = m; ramp() },
  }
}
const music = createMusic()
for (const ev of ["touchend", "click", "keydown"]) document.addEventListener(ev, () => music.unlock(), { passive: true })

/* ------------------------------------------------ confetti + balloons */

type Bit = { x: number; y: number; vx: number; vy: number; r: number; vr: number; w: number; h: number; c: string; life: number }
type Balloon = { ch: string; c: string; slot: number; y: number; state: "rise" | "float" | "gone"; t: number; pop: number }

function useScene(front: React.RefObject<HTMLCanvasElement>, back: React.RefObject<HTMLCanvasElement>) {
  const api = useRef({
    burst: (_x: number, _y: number, _n: number, _up: number, _cols?: string[]) => {},
    hitBalloon: (_x: number, _y: number) => false,
    popAll: () => {},
  })
  useEffect(() => {
    const fc = front.current!, bc = back.current!
    const fx = fc.getContext("2d")!, bx = bc.getContext("2d")!
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let W = 0, H = 0, dpr = 1
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      for (const c of [fc, bc]) { c.width = W * dpr; c.height = H * dpr }
    }
    size()
    window.addEventListener("resize", size)

    const bits: Bit[] = []
    const burst = (x: number, y: number, n: number, up: number, cols = CONFETTI) => {
      const m = reduce ? Math.ceil(n / 3) : n
      for (let i = 0; i < m; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9
        const sp = up * (0.45 + Math.random() * 0.75)
        bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
          w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0], life: 0 })
      }
    }

    const letters = ["R", "O", "R", "O"]
    const colors = [PINK, GOLD, PEARL, ROSE]
    const balloons: Balloon[] = letters.map((ch, i) => ({ ch, c: colors[i], slot: i, y: 0, state: "rise", t: -0.25 * i, pop: 0 }))
    const geo = (b: Balloon, time: number) => {
      const r = Math.min(W * 0.085, 48)
      const xs = [0.17, 0.39, 0.61, 0.83]
      const homeY = H * 0.13 + (b.slot % 2) * r * 0.5
      const x = W * xs[b.slot] + Math.sin(time * 0.9 + b.slot * 1.7) * r * 0.18
      const bob = Math.sin(time * 1.3 + b.slot) * r * 0.12
      return { r, x, homeY, y: b.y + bob }
    }
    balloons.forEach((b) => { b.y = H + 200 })

    const popOne = (b: Balloon, back = 2.6) => {
      const g = geo(b, now)
      b.state = "gone"; b.t = 2.6 - back
      burst(g.x, g.y, 26, 6, [b.c, b.c, WHITE, GOLD])
    }
    // Every balloon pops in quick succession; they drift back up a while later.
    const popAll = () => {
      balloons.forEach((b, i) => window.setTimeout(() => { if (b.state !== "gone") popOne(b, 7 + i * 0.4) }, i * 110))
    }
    const hitBalloon = (x: number, y: number) => {
      for (const b of balloons) {
        if (b.state === "gone") continue
        const g = geo(b, now)
        if ((x - g.x) ** 2 / (g.r * 1.1) ** 2 + (y - g.y) ** 2 / (g.r * 1.3) ** 2 < 1) {
          popOne(b)
          return true
        }
      }
      return false
    }
    api.current = { burst, hitBalloon, popAll }

    let now = 0, last = performance.now(), raf = 0
    const drawBalloon = (b: Balloon) => {
      const g = geo(b, now)
      const { r, x, y } = g
      const [light, base, rim, ink] = BALLOON_INK[b.c]
      // string
      bx.strokeStyle = "rgba(150, 90, 110, 0.5)"; bx.lineWidth = 1.2
      bx.beginPath(); bx.moveTo(x, y + r * 1.22)
      bx.bezierCurveTo(x - r * 0.3, y + r * 1.8, x + r * 0.3, y + r * 2.3, x - r * 0.1, y + r * 2.9); bx.stroke()
      // knot
      bx.fillStyle = rim
      bx.beginPath(); bx.moveTo(x, y + r * 1.1); bx.lineTo(x - r * 0.14, y + r * 1.3); bx.lineTo(x + r * 0.14, y + r * 1.3); bx.fill()
      // body: lit from the upper left, darker at the rim
      const gr = bx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.05, x - r * 0.1, y - r * 0.1, r * 1.35)
      gr.addColorStop(0, light); gr.addColorStop(0.35, base); gr.addColorStop(0.85, base); gr.addColorStop(1, rim)
      bx.fillStyle = gr
      bx.beginPath(); bx.ellipse(x, y, r, r * 1.16, 0, 0, Math.PI * 2); bx.fill()
      // metallic band on the gold and rose balloons
      if (b.c === GOLD || b.c === ROSE) {
        const mg = bx.createLinearGradient(x - r, y - r, x + r, y + r)
        mg.addColorStop(0.0, "rgba(255,255,255,0)"); mg.addColorStop(0.45, "rgba(255,255,255,0.35)"); mg.addColorStop(0.55, "rgba(255,255,255,0)")
        bx.fillStyle = mg
        bx.beginPath(); bx.ellipse(x, y, r, r * 1.16, 0, 0, Math.PI * 2); bx.fill()
      }
      // specular highlight
      bx.save(); bx.translate(x - r * 0.42, y - r * 0.5); bx.rotate(-0.6)
      bx.fillStyle = "rgba(255,255,255,0.7)"
      bx.beginPath(); bx.ellipse(0, 0, r * 0.13, r * 0.26, 0, 0, Math.PI * 2); bx.fill()
      bx.restore()
      // letter
      bx.font = `700 ${Math.round(r * 0.95)}px Alexandria, system-ui, sans-serif`
      bx.textAlign = "center"; bx.textBaseline = "middle"
      bx.fillStyle = "rgba(0,0,0,0.12)"; bx.fillText(b.ch, x + 1, y + r * 0.04 + 2)
      bx.fillStyle = ink; bx.fillText(b.ch, x, y + r * 0.04)
    }
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t; now += dt
      bx.setTransform(dpr, 0, 0, dpr, 0, 0); bx.clearRect(0, 0, W, H)
      for (const b of balloons) {
        const g = geo(b, now)
        if (b.state === "rise") {
          b.t += dt
          if (b.t > 0) b.y += (g.homeY - b.y) * Math.min(1, dt * 1.6)
          if (Math.abs(b.y - g.homeY) < 1) b.state = "float"
        } else if (b.state === "float") b.y = g.homeY
        else if (b.state === "gone") {
          b.t += dt
          if (b.t > 2.6) { b.state = "rise"; b.t = 0; b.y = H + g.r * 3 }
        }
        if (b.state !== "gone") drawBalloon(b)
      }
      fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, W, H)
      for (let i = bits.length - 1; i >= 0; i--) {
        const p = bits[i]
        p.life += dt; p.vy += 22 * dt; p.vx *= 0.985; p.vy *= 0.985
        p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.r += p.vr * dt
        if (p.y > H + 40 || p.life > 5) { bits.splice(i, 1); continue }
        fx.save(); fx.translate(p.x, p.y); fx.rotate(p.r)
        fx.globalAlpha = Math.min(1, 4.5 - p.life)
        fx.fillStyle = p.c; fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.7)) + 1)
        fx.restore()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size) }
  }, [])
  return api
}

/* ------------------------------------------------------------ club */

type ClubState = { on: boolean; l: Layout; bpm: number; beat0: number }

/** The party: the room dims, a mirror ball turns, coloured beams sweep and
 *  a stage with bulb lights sits under the dancers, all pulsing on the beat. */
function useClub(canvas: React.RefObject<HTMLCanvasElement>, state: React.MutableRefObject<ClubState>) {
  useEffect(() => {
    const c = canvas.current!
    const g = c.getContext("2d")!
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let W = 0, H = 0, dpr = 1, raf = 0, amt = 0, last = performance.now()
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      c.width = W * dpr; c.height = H * dpr
    }
    size()
    window.addEventListener("resize", size)
    const BEAMS = ["255, 92, 158", "246, 210, 122", "184, 156, 242", "255, 255, 255", "255, 120, 190"]
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random() * 0.75, p: Math.random() * 6, s: 0.6 + Math.random() * 1.4 }))
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t
      const st = state.current
      amt += ((st.on ? 1 : 0) - amt) * Math.min(1, dt * (st.on ? 2.5 : 1.8))
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      if (amt > 0.002) {
        const time = t / 1000
        const beat = Math.max(0, ((t - st.beat0) / 1000) * (st.bpm / 60))
        const kick = reduce ? 0 : Math.pow(1 - (beat - Math.floor(beat)), 3)
        const bar = Math.floor(beat)
        // Room
        const room = g.createLinearGradient(0, 0, 0, H)
        room.addColorStop(0, `rgba(22, 8, 34, ${0.93 * amt})`)
        room.addColorStop(0.7, `rgba(46, 14, 52, ${0.88 * amt})`)
        room.addColorStop(1, `rgba(70, 20, 60, ${0.85 * amt})`)
        g.fillStyle = room; g.fillRect(0, 0, W, H)
        g.globalCompositeOperation = "lighter"
        // Sparkles thrown by the mirror ball
        for (const s of stars) {
          const a = Math.max(0, Math.sin(time * 3 + s.p)) * amt
          g.fillStyle = `rgba(255, 240, 250, ${0.8 * a})`
          g.beginPath(); g.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); g.fill()
        }
        // Beams from above, sweeping, swapping colour each beat
        const n = W < 600 ? 4 : 5
        for (let i = 0; i < n; i++) {
          const x0 = (W * (i + 0.5)) / n
          const ang = Math.sin(time * (0.7 + i * 0.13) + i * 1.9) * 0.55
          const len = H * 1.15
          const spread = 0.13 + 0.03 * kick
          const col = BEAMS[(i + bar) % BEAMS.length]
          const gr = g.createLinearGradient(x0, 0, x0 + Math.sin(ang) * len, Math.cos(ang) * len)
          gr.addColorStop(0, `rgba(${col}, ${(0.42 + 0.25 * kick) * amt})`)
          gr.addColorStop(1, `rgba(${col}, 0)`)
          g.fillStyle = gr
          g.beginPath(); g.moveTo(x0, -10)
          g.lineTo(x0 + Math.sin(ang - spread) * len, Math.cos(ang - spread) * len)
          g.lineTo(x0 + Math.sin(ang + spread) * len, Math.cos(ang + spread) * len)
          g.closePath(); g.fill()
        }
        g.globalCompositeOperation = "source-over"
        // Mirror ball
        const bx = W / 2, by = Math.max(46, H * 0.07), br = Math.min(30, W * 0.075)
        g.strokeStyle = `rgba(220, 200, 230, ${0.7 * amt})`; g.lineWidth = 1.5
        g.beginPath(); g.moveTo(bx, 0); g.lineTo(bx, by - br); g.stroke()
        const ball = g.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br)
        ball.addColorStop(0, `rgba(255, 255, 255, ${amt})`); ball.addColorStop(1, `rgba(150, 130, 170, ${amt})`)
        g.fillStyle = ball; g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.fill()
        g.save(); g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2); g.clip()
        const rot = (time * 0.8) % 1
        for (let row = -3; row <= 3; row++) {
          for (let col = 0; col < 10; col++) {
            const u = ((col / 10 + rot) % 1) * Math.PI
            const tx = bx - Math.cos(u) * br * Math.cos(row / 3.4)
            const ty = by + (row / 3.4) * br
            const lit = (Math.sin(u * 3 + row + time * 4) + 1) / 2
            g.fillStyle = `rgba(255, ${Math.round(200 + 55 * lit)}, ${Math.round(235 + 20 * lit)}, ${(0.25 + 0.6 * lit) * amt})`
            g.fillRect(tx - 2.2, ty - 2.2, 4.4, 4.4)
          }
        }
        g.restore()
        // Stage: a dark oval platform under the dancers, gold rim, bulbs on its face.
        const L = st.l
        const half = 7.4, front = 2.4, backZ = -4.6, depth = 1.0
        const zc = (backZ + front) / 2, zr = (front - backZ) / 2
        const at = (a: number, y: number) => project(L, Math.cos(a) * half, y, zc + Math.sin(a) * zr)
        // face: the front half of the rim, dropped by the stage depth
        g.fillStyle = `rgba(30, 12, 36, ${amt})`
        g.beginPath()
        for (let i = 0; i <= 24; i++) { const p = at(Math.PI * (i / 24), 0); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y) }
        for (let i = 24; i >= 0; i--) { const p = at(Math.PI * (i / 24), -depth); g.lineTo(p.x, p.y) }
        g.closePath(); g.fill()
        // top
        const mid = project(L, 0, 0, zc)
        const tg = g.createRadialGradient(mid.x, mid.y, 10, mid.x, mid.y, W * 0.7)
        tg.addColorStop(0, `rgba(120, 40, 100, ${amt})`); tg.addColorStop(1, `rgba(52, 20, 60, ${amt})`)
        g.fillStyle = tg
        g.beginPath()
        for (let i = 0; i <= 48; i++) { const p = at((i / 48) * Math.PI * 2, 0); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y) }
        g.closePath(); g.fill()
        g.strokeStyle = `rgba(246, 210, 122, ${0.85 * amt})`; g.lineWidth = 2; g.stroke()
        g.globalCompositeOperation = "lighter"
        // coloured pools of light on the stage
        for (let i = 0; i < 3; i++) {
          const p = project(L, Math.sin(time * 0.9 + i * 2.1) * half * 0.6, 0, -1 + Math.cos(time * 0.7 + i) * 1.2)
          const col = BEAMS[(i + bar) % BEAMS.length]
          const rw = W * 0.18
          g.save(); g.translate(p.x, p.y); g.scale(1, 0.28)
          const pg = g.createRadialGradient(0, 0, 0, 0, 0, rw)
          pg.addColorStop(0, `rgba(${col}, ${0.35 * amt})`); pg.addColorStop(1, `rgba(${col}, 0)`)
          g.fillStyle = pg; g.beginPath(); g.arc(0, 0, rw, 0, Math.PI * 2); g.fill(); g.restore()
        }
        // bulbs along the face, chasing on the beat
        const rr = Math.max(2, Math.min(4, W / 130))
        for (let i = 0; i <= 26; i++) {
          const p = at(Math.PI * (i / 26), -depth * 0.45)
          const on = (i + bar) % 2 === 0
          const glow = (on ? 0.55 + 0.45 * kick : 0.25) * amt
          const col = on ? "255, 210, 140" : "255, 110, 180"
          const hal = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 4)
          hal.addColorStop(0, `rgba(${col}, ${glow})`); hal.addColorStop(1, `rgba(${col}, 0)`)
          g.fillStyle = hal; g.beginPath(); g.arc(p.x, p.y, rr * 4, 0, Math.PI * 2); g.fill()
          g.fillStyle = `rgba(255, 250, 240, ${glow})`; g.beginPath(); g.arc(p.x, p.y, rr, 0, Math.PI * 2); g.fill()
        }
        g.globalCompositeOperation = "source-over"
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", size) }
  }, [])
}

/* ------------------------------------------------------- the bubble */

function Bubble({ lines, show, keep, onDone }: { lines: Line[]; show: boolean; keep: number; onDone?: () => void }) {
  const words = lines.map((w) => w.t.split(" "))
  const total = words.reduce((n, l) => n + l.length, 0)
  const [n, setN] = useState(0)
  const key = lines.map((l) => l.t).join("|")
  useEffect(() => {
    if (!show) { setN(0); return }
    let i = Math.min(keep, total)
    setN(i)
    const id = window.setInterval(() => {
      i++; setN(i)
      if (i >= total) { window.clearInterval(id); if (onDone) window.setTimeout(onDone, 350) }
    }, 230)
    return () => window.clearInterval(id)
  }, [show, key])
  let seen = 0
  return (
    <div className={"bubble" + (show ? " on" : "")} role="status" aria-live="polite" dir="rtl" lang="ar">
      {lines.map((w, li) => (
        <p key={li} className={w.cls}>
          {words[li].map((word, wi) => {
            const idx = seen++
            return <span key={wi} className={idx < n ? "w in" : "w"}>{word}{wi < words[li].length - 1 ? " " : ""}</span>
          })}
        </p>
      ))}
    </div>
  )
}

function SoundIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>}
    </svg>
  )
}

/* ------------------------------------------------------------- page */

function App() {
  const [l, setL] = useState(measure)
  useEffect(() => {
    const on = () => setL(measure())
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  const [group, setGroup] = useState(false)
  const [zk, setZk] = useState(l.k)
  const zkRef = useRef(l.k)
  useEffect(() => {
    const target = group ? groupScale(l) : l.k
    const from = zkRef.current
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const u = Math.min(1, (t - t0) / 800)
      const e = u * u * (3 - 2 * u)
      zkRef.current = from + (target - from) * e
      setZk(zkRef.current)
      if (u < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [group, l])
  const lz: Layout = { ...l, k: zk }
  const front = useRef<HTMLCanvasElement>(null)
  const back = useRef<HTMLCanvasElement>(null)
  const scene = useScene(front, back)
  const clubCanvas = useRef<HTMLCanvasElement>(null)
  const club = useRef<ClubState>({ on: false, l: lz, bpm: BEAT_BPM, beat0: 0 })
  club.current.l = lz
  useClub(clubCanvas, club)

  const [play, setPlay] = useState(0)
  const [landed, setLanded] = useState(false)
  const [hint, setHint] = useState(false)
  const [open, setOpen] = useState(false)
  const [heart, setHeart] = useState(false)
  const [gone, setGone] = useState(false)
  const [dancing, setDancing] = useState(false)
  const [wink, setWink] = useState(0)
  const [laugh, setLaugh] = useState(0)
  const [bubble, setBubble] = useState<{ lines: Line[]; keep: number; show: boolean }>({ lines: WISH, keep: 0, show: false })
  const [extras, setExtras] = useState(false)
  const [sound, setSound] = useState(false)
  const [muted, setMuted] = useState(false)
  const joke = useRef(0)
  const lastTap = useRef(0)
  const tapTimer = useRef(0)
  const flashTimer = useRef(0)
  const [heartFlash, setHeartFlash] = useState(false)
  const opened = useRef(false)
  const timers = useRef<number[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  const clearLater = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const onArrive = useCallback(() => {
    setLanded(true)
    later(() => { if (!opened.current) setHint(true) }, 4000) // he waves now, winks on his own at 4 s; the hint comes with it
  }, [])

  const [bpm, setBpm] = useState(BEAT_BPM)
  const [friends, setFriends] = useState(false)
  // The camera pulls back, the music and the dance start on the same beat,
  // and the two friends drop in beside him.
  const dance = () => {
    setExtras(false)
    setBubble((b) => ({ ...b, show: false }))
    setHeart(true)
    setGroup(true)
    later(() => {
      const song = music.hasSong()
      setBpm(song ? SONG.bpm : BEAT_BPM)
      music.level(song ? 0.9 : 0.6)
      music.start()
      setSound(true)
      club.current.bpm = song ? SONG.bpm : BEAT_BPM
      club.current.beat0 = performance.now() + 50
      club.current.on = true
      setDancing(true)
      setFriends(true)
      later(() => {
        setDancing(false)
        setFriends(false)               // they wave, then hop away
        club.current.on = false
        if (song) music.stop(1.2)
        else music.level(0.28)
        later(() => setGroup(false), 2600)
        later(tellJoke, 3500)
      }, (song ? SONG.seconds : BEAT_DANCE_S) * 1000)
    }, 700)
  }

  const tellJoke = () => {
    const j = JOKES[joke.current % JOKES.length]
    joke.current++
    setExtras(false)
    setHeart(false)
    const q: Line = { t: j.q, cls: "joke" }
    setBubble({ lines: [q], keep: 0, show: true })
    const words = j.q.split(" ").length
    later(() => {
      setBubble({ lines: [q, { t: j.a, cls: "punch" }], keep: words, show: true })
      later(() => {
        setLaugh((n) => n + 1)
        later(() => { setHeart(true); setExtras(true) }, 1600)
        later(() => setWink((w) => w + 1), 2300)   // a heart-eyed wink to finish
        later(() => {
          setBubble((b) => ({ ...b, show: false }))
          for (let i = 0; i < 6; i++) later(() => scene.current.burst(window.innerWidth * (0.1 + 0.16 * i), -10, 14, 2, CONFETTI), i * 140)
        }, 3800)
        later(() => setHeart(false), 5600)
      }, j.a.split(" ").length * 230 + 150)
    }, words * 230 + 1100)
  }

  // After the wish: hearts, then the box poofs and the party starts.
  const afterWish = () => {
    setHeart(true)
    later(() => {
      setGone(true)
      const c = project(lz, 0, (GIFT.y0 + GIFT.y1) / 2, GIFT.z)
      scene.current.burst(c.x, c.y, 70, 7)
      later(dance, 500)
    }, 2200)
  }

  const openGift = () => {
    if (open || !landed) return
    opened.current = true
    music.unlock()
    setOpen(true); setHint(false)
    setBubble({ lines: WISH, keep: 0, show: true })
    scene.current.popAll()
    const top = project(lz, 0, GIFT.y1, GIFT.z)
    later(() => scene.current.burst(top.x, top.y, 150, 11), 120)
  }

  const replay = () => {
    clearLater()
    opened.current = false
    music.stop(); setSound(false)
    setLanded(false); setHint(false); setOpen(false); setHeart(false); setGone(false); setDancing(false); setExtras(false)
    setFriends(false); setGroup(false)
    club.current.on = false
    setBubble({ lines: WISH, keep: 0, show: false })
    setPlay((p) => p + 1)
  }

  const onTap = (e: React.PointerEvent) => {
    const x = e.clientX, y = e.clientY
    const a = project(lz, -GIFT.x, GIFT.y1, GIFT.z), b = project(lz, GIFT.x, GIFT.y0, GIFT.z)
    const pad = 18
    if (landed && !open && x > a.x - pad && x < b.x + pad && y > a.y - pad * 2 && y < b.y + pad) { openGift(); return }
    const h0 = project(lz, -HALF_W, HEAD_TOP, 0), h1 = project(lz, HALF_W, 0, 0)
    if (landed && x > h0.x && x < h1.x && y > h0.y && y < h1.y) {
      // One tap winks; a quick second tap turns his eyes to hearts for a moment.
      const now = performance.now()
      if (now - lastTap.current < 320) {
        lastTap.current = 0
        window.clearTimeout(tapTimer.current)
        window.clearTimeout(flashTimer.current)
        setHeartFlash(true)
        flashTimer.current = window.setTimeout(() => setHeartFlash(false), 1600)
      } else {
        lastTap.current = now
        tapTimer.current = window.setTimeout(() => setWink((w) => w + 1), 260)
      }
      return
    }
    scene.current.hitBalloon(x, y)
  }

  const headTop = project(lz, 0, HEAD_TOP, 0).y
  const groupHead = project({ ...l, k: groupScale(l) }, 0, HEAD_TOP, 0).y
  const balloonsBottom = l.H * 0.13 + Math.min(l.W * 0.085, 48) * 3.2
  const bannerY = (balloonsBottom + groupHead) / 2
  const feet = project(lz, 0, 0, 0).y

  return (
    <main className="stage" onPointerDown={onTap}>
      <canvas ref={clubCanvas} className="layer" aria-hidden="true" />
      <canvas ref={back} className="layer" aria-hidden="true" />
      <BirthdayRobot
        transparent
        entrance="drop"
        dropFrom={26}
        playKey={play}
        onArrive={onArrive}
        delay={1.2}
        winkDelay={-1}
        tapWink={false}
        winkKey={wink}
        laughKey={laugh}
        gift
        giftOpen={open}
        giftGone={gone}
        dancing={dancing}
        danceBpm={bpm}
        friends={friends}
        heart={heart || heartFlash}
        walk={false}
        wave
        waveOnLand
        pointerWave={false}
        scanner={false}
        scale={zk * 100}
        placement={{ x: 0, y: l.placeY }}
        colors={{ clay: "#F4E6E4", visor: "#16131A", eyes: "#FFFFFF" }}
        outfit={{ wrap: "#FF6FA8", pocket: "#F28DB2", gold: "#E8B84A", heart: "#FF5C93" }}
        background={{ shadow: dancing ? "#12060F" : "#8A5A6A", shadowDepth: dancing ? 55 : 40 }}
        advanced={{ eyeGlow: dancing ? 0.9 : 0.6, skyStrength: dancing ? 0.8 : 1, sunStrength: dancing ? 1.15 : 1 }}
        response={{ track: "page", headTurn: 5, eyeTravel: 6, followSpeed: 5, hop: 0 }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", aspectRatio: "auto", background: "transparent" }}
      />
      <canvas ref={front} className="layer front" aria-hidden="true" />
      <div className="bubble-wrap" style={{ height: Math.max(0, headTop - 10) }}>
        <Bubble lines={bubble.lines} keep={bubble.keep} show={bubble.show} onDone={bubble.lines === WISH ? afterWish : undefined} />
      </div>
      <div className={"banner" + (group && dancing ? " on" : "")} style={{ top: bannerY }} dir="ltr" lang="en" aria-hidden={!(group && dancing)}>
        {"Happy Birthday".split("").map((ch, i) => (
          <span key={i} className={ch === " " ? "gap" : ""}
            style={{ ["--i" as any]: i, ["--r" as any]: `${((i * 37) % 11) - 5}deg` }}>{ch === " " ? "\u00a0" : ch}</span>
        ))}
      </div>
      <button type="button" className={"hint" + (hint ? " on" : "")} style={{ top: feet + 14 }} onPointerDown={(e) => { e.stopPropagation(); openGift() }}>
        افتحي الهدية
      </button>
      <button type="button" id="sound" className={"sound" + (sound ? " on" : "")} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
        onPointerDown={(e) => e.stopPropagation()} onClick={() => { music.unlock(); music.mute(!muted); setMuted(!muted) }}>
        <SoundIcon off={muted} />
      </button>
      <button type="button" id="replay" className={"replay" + (extras ? " on" : "")} onPointerDown={(e) => e.stopPropagation()} onClick={replay}>
        أعيدي المفاجأة
      </button>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
