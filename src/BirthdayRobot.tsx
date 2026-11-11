/* eslint-disable */
// Birthday Robot — the clay robot in a tuxedo, holding a gift box that
// opens on cue, with heart eyes. Adapted from an Originkit component.
// Changes from the original: scanner eyes (a light sweeps the visor every
// few seconds and runs fast while `alert` is on), an eye flash on `alert`,
// and a `transparent` mode that drops the cyclorama so only the robot and
// its soft floor shadow draw over the page.

"use client"

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"

/* ------------------------------------------------------------ defaults */

const REF_W = 1200
const REF_H = 900
const REF_ASPECT = REF_W / REF_H

const DEFAULT_BACKGROUND = {
    top: "#909EA9",
    bottom: "#CCD0D3",
    shadow: "#2E4D6A",
    shadowDepth: 100,
}

const DEFAULT_COLORS = {
    clay: "#FFC2A1",
    visor: "#2E3747",
    eyes: "#C4F7EC",
}

const DEFAULT_OUTFIT = {
    tux: "#1C1B21",
    lapel: "#34323C",
    shirt: "#F7F5F2",
    shoe: "#141318",
    pocket: "#F28DB2",
    wrap: "#F48FB4",
    gold: "#D9AE55",
    heart: "#FF5C93",
    dressA: "#FF8DB8",
    clayA: "#FBE3EA",
    bowA: "#FFFFFF",
    dressB: "#B89CF2",
    clayB: "#ECE3FA",
    bowB: "#E2B862",
}

const DEFAULT_PLACEMENT = { x: 0, y: 0, angle: 0, tilt: 0 }

const DEFAULT_RESPONSE = {
    track: "page" as "page" | "frame",
    headTurn: 7,
    eyeTravel: 6,
    followSpeed: 6,
    hop: 6,
}

const DEFAULT_ADVANCED = {
    cameraDistance: 30,
    sunAngle: 90,
    sunElevation: 25,
    sunStrength: 1,
    skyStrength: 1,
    shadowSoftness: 6,
    occlusion: 1,
    eyeGlow: 0.6,
    gradientCurve: 1.3,
}

const DEFAULTS = {
    walk: true,
    walkSpeed: 5,
    wave: true,
    scale: 100,
    animate: false,
    delay: 0.2,
    glance: 5,
    blink: true,
    scanner: true,
    scanEvery: 4,
    transparent: false,
    alert: false,
}

/* -------------------------------------------------------- fixed values */

const CAM_Y = 3.33
const FRAME_UNITS = REF_H / 100
const ROLL_CY = 2.95 - CAM_Y
const HEAD_Y = 4.08
const PIVOT_Y = 2.55
const LOOK_Z = 7
const BODY_SHARE = 0.28
const HEAD_ROLL = -0.16
const EYE_X = 0.62
const EYE_UP = 0.46
const EYE_DOWN = 0.2
const BLINK_S = 0.17
const HOP_CROUCH = 0.09
const HOP_AIR = 0.46
const LAND_S = 0.55
const JOY_S = 0.95
const DROP_S = 0.62
const DROP_FROM = 9.5
const STRIDE = 0.62
const STEP_LIFT = 0.17
const WADDLE = 0.075
const BOB = 0.05
const ARM_SWING = 0.5
const WALK_TURN = 0.5
const WALK_MARGIN = 3.05
const WALK_START = 0.6
const ARM_REST = 0.28
const WAVE_UP = 0.35
const WAVE_HOLD = 1.5
const WAVE_DOWN = 0.4
const WAVE_RAISE = 2.0
const WAVE_SWAY = 0.3
const WAVE_HZ = 2.3
// Scanner: one calm top-to-bottom sweep (s), and the quick sweeps that
// repeat while `alert` is on.
const SCAN_S = 1.1
const SCAN_FAST = 0.55
// Entrance: how far off it starts (scene units) and how long the walk in takes.
const APPROACH_FROM = 40
// Dancing: beats per minute, matched to the page's music.
const DANCE_BPM = 112
// Friends: side offset, depth, scale, and the height they drop from (scene units).
const FRIEND_X = 4.2
const FRIEND_Z = -1.8
const FRIEND_S = 0.78
const FRIEND_FROM = 16
// Holding the gift: arms tucked in and forward.
const HOLD_RAISE = -0.12
const HOLD_SWING = 1.15
const APPROACH_S = 4.4

const SKY = [0.456, 0.52, 0.541]
const SKY_UP = [0.03, 0.019, 0.011]
const SKY_SIDE = [0.01, 0.052, 0.081]
const SKY_AWAY = [-0.151, -0.124, -0.087]
const SUN = [0.293, 0.227, 0.17]

const DPR_CAP = 2
const PIXEL_BUDGET = 2.6e6
const LEVELS = [1, 0.85, 0.72, 0.6]

/* --------------------------------------------------------------- types */

export interface ClayRobotBackground {
    top?: string
    bottom?: string
    shadow?: string
    shadowDepth?: number
}

export interface ClayRobotColors {
    clay?: string
    visor?: string
    /** The eyes and the scanner light. */
    eyes?: string
}

export interface ClayRobotPlacement {
    x?: number
    y?: number
    angle?: number
    tilt?: number
}

export interface ClayRobotResponse {
    track?: "page" | "frame"
    headTurn?: number
    eyeTravel?: number
    followSpeed?: number
    hop?: number
}

export interface ClayRobotAdvanced {
    cameraDistance?: number
    sunAngle?: number
    sunElevation?: number
    sunStrength?: number
    skyStrength?: number
    shadowSoftness?: number
    occlusion?: number
    eyeGlow?: number
    gradientCurve?: number
}

export interface BirthdayOutfit {
    tux?: string
    lapel?: string
    shirt?: string
    shoe?: string
    pocket?: string
    wrap?: string
    gold?: string
    heart?: string
    dressA?: string
    clayA?: string
    bowA?: string
    dressB?: string
    clayB?: string
    bowB?: string
}

export interface ClayRobotProps {
    /** Colours of the tuxedo, the gift and the heart eyes. */
    outfit?: BirthdayOutfit
    /** Holding a gift box. */
    gift?: boolean
    /** Turn true to pop the lid off. */
    giftOpen?: boolean
    /** Heart eyes on. */
    heart?: boolean
    /** Change this number to make it wink. */
    winkKey?: number
    /** Wink when tapped (off when the page decides). */
    tapWink?: boolean
    /** Seconds after landing before the first wink. */
    winkDelay?: number
    /** Wave hello right after landing. */
    waveOnLand?: boolean
    /** Wave when a pointer arrives after a while away. */
    pointerWave?: boolean
    /** Turn true to make the gift box vanish (poof). */
    giftGone?: boolean
    /** Dance on the beat while true. */
    dancing?: boolean
    /** Change this number to make it laugh. */
    laughKey?: number
    /** Tempo the dance follows, beats per minute. */
    danceBpm?: number
    /** Two friends drop in beside him (true), or wave and hop away (false). */
    friends?: boolean
    /** "walk": starts far off and walks up to the screen, then winks and waves. */
    entrance?: "walk" | "drop" | "none"
    /** How far above the floor the drop starts, scene units. */
    dropFrom?: number
    /** Change this number to play the entrance again. */
    playKey?: number
    /** Called once the robot has arrived and winked. */
    onArrive?: () => void
    background?: ClayRobotBackground
    colors?: ClayRobotColors
    scale?: number
    placement?: ClayRobotPlacement
    animate?: boolean
    delay?: number
    response?: ClayRobotResponse
    glance?: number
    walk?: boolean
    walkSpeed?: number
    wave?: boolean
    blink?: boolean
    /** A light sweeps down the visor now and then. */
    scanner?: boolean
    /** Average seconds between scanner sweeps. */
    scanEvery?: number
    /** Draw only the robot and its shadow; the page shows through. */
    transparent?: boolean
    /** Eyes flash and the scanner runs fast while true. */
    alert?: boolean
    advanced?: ClayRobotAdvanced
    className?: string
    style?: CSSProperties
}

/* ------------------------------------------------------------- colours */

const colorCache = new Map<string, [number, number, number]>()

function toRGB(input: string | undefined, fallback: string): [number, number, number] {
    const key = input || fallback
    const hit = colorCache.get(key)
    if (hit) return hit
    let s = key.trim()
    const v = /^var\([^,]+,\s*(.+)\)$/.exec(s)
    if (v) s = v[1].trim()
    let out: [number, number, number] | null = null
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s)
    if (hex) {
        let h = hex[1]
        if (h.length === 3 || h.length === 4)
            h = h
                .slice(0, 3)
                .split("")
                .map((c) => c + c)
                .join("")
        out = [
            parseInt(h.slice(0, 2), 16) / 255,
            parseInt(h.slice(2, 4), 16) / 255,
            parseInt(h.slice(4, 6), 16) / 255,
        ]
    } else {
        const m = /rgba?\(([^)]+)\)/i.exec(s)
        if (m) {
            const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat)
            if (p.length >= 3) out = [p[0] / 255, p[1] / 255, p[2] / 255]
        }
    }
    if (!out) out = key === fallback ? [0.5, 0.5, 0.5] : toRGB(fallback, fallback)
    colorCache.set(key, out)
    return out
}

const lin = (c: number) => Math.pow(c, 2.2)
const CLAY_LIN = [0xee, 0xef, 0xeb].map((c) => lin(c / 255))

/* ------------------------------------------------------------- shaders */

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uRes;
uniform float uS;
uniform vec2 uOff;
uniform vec2 uRoll;
uniform float uD;
uniform mat3 uW2S;
uniform float uScale;
uniform float uHop;
uniform vec2 uSq;
uniform mat3 uBody;
uniform mat3 uHead;
uniform vec4 uEye;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uSky;
uniform vec3 uSkyUp;
uniform vec3 uSkySide;
uniform vec3 uSkyAway;
uniform float uSoft;
uniform float uAO;
uniform vec3 uBgTop;
uniform vec3 uBgBot;
uniform float uCurve;
uniform vec3 uShadowCol;
uniform float uShDepth;
uniform vec3 uClay;
uniform vec3 uVisor;
uniform vec3 uEyeCol;
uniform float uGlow;
uniform float uWalkX;
uniform float uWalkZ;   // approach from afar, scene units (negative = far)
uniform float uWink;   // 0..1, one eye closes into a smile
uniform vec2 uFeet;
uniform vec4 uArms;
uniform vec2 uArmExt;
uniform vec4 uBodyBox;
uniform int uSamples;
uniform vec2 uScan;        // sweep position 0..1 (top to bottom), strength
uniform float uFlash;      // 0..1 eye flash
uniform float uTransparent;
uniform vec3 uTux;         // linear albedos, relative to the fitted clay
uniform vec3 uLapel;
uniform vec3 uShirt;
uniform vec3 uShoe;
uniform vec3 uPocket;
uniform vec3 uWrap;
uniform vec3 uGold;
uniform float uGift;       // box scale: 1 held, 0 gone
uniform float uGiftOpen;   // 1 = lid off, box hollow
uniform vec4 uLid;         // x shift, lift, tilt, scale
uniform vec2 uHeart;       // amount 0..1, pulse scale
uniform vec3 uHeartCol;    // sRGB
uniform vec4 uFriends;     // on, left lift, right lift, wave 0..1
uniform vec3 uFriendPos;   // side offset, depth offset, scale (scene units)
uniform vec4 uFArms;       // friends' waving arms: left raise/swing, right raise/swing
uniform vec3 uDressA;      // friend A (left): dress, helmet, bow
uniform vec3 uClayA;
uniform vec3 uBowA;
uniform vec3 uDressB;      // friend B (right)
uniform vec3 uClayB;
uniform vec3 uBowB;

// 1 while the field is being evaluated for one of the friends.
float gFriend = 0.0;

out vec4 fragColor;

#define CAM_Y ${CAM_Y.toFixed(3)}
#define FRAME_UNITS ${FRAME_UNITS.toFixed(3)}
#define ROLL_CY ${ROLL_CY.toFixed(3)}
#define HEAD_C vec3(0.0, ${HEAD_Y.toFixed(3)}, 0.0)
#define PIVOT vec3(0.0, ${PIVOT_Y.toFixed(3)}, 0.0)

float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}
float smax(float a, float b, float k) { return -smin(-a, -b, k); }

float sdRR(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdRBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}
float sdEll(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
    p.x = abs(p.x);
    return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}
float sdEll2(vec2 p, vec2 r) {
    float k0 = length(p / r);
    float k1 = max(length(p / (r * r)), 1e-4);
    return k0 * (k0 - 1.0) / k1;
}
float extrude(float d2, float z, float hz, float re) {
    vec2 w = vec2(d2 + re, abs(z) - hz + re);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - re;
}


vec2 head(vec3 p, bool fine) {
    float sh = extrude(sdEll2(p.xy, vec2(2.5, 2.3)), p.z, 0.95, 0.8);
    vec2 v = p.xy - vec2(0.0, -0.1);
    sh = smax(sh, -extrude(sdEll2(v, vec2(2.02, 1.8)), p.z - 0.95, 0.3, 0.05), 0.16);
    vec3 e = vec3(abs(p.x) - 2.6, p.y, p.z + 0.05);
    vec2 we = vec2(length(e.yz) - 0.42, abs(e.x) - 0.06);
    float ear = min(max(we.x, we.y), 0.0) + length(max(we, 0.0)) - 0.2;
    sh = smin(sh, ear, 0.05);
    if (!fine) return vec2(sh, 1.0);
    vec2 res0 = vec2(sh, 1.0);
    if (gFriend > 0.5) {
        // A bow sitting to one side on top of the helmet.
        vec3 b = p - vec3(0.8, 2.12, 0.3);
        float cb = cos(0.45), sb = sin(0.45);
        b.xy = mat2(cb, -sb, sb, cb) * b.xy;
        vec3 bl = b;
        bl.x = abs(bl.x);
        bl.xy -= vec2(0.45, 0.07);
        bl.xy = mat2(0.955, 0.296, -0.296, 0.955) * bl.xy;
        float bow = smin(sdEll(bl, vec3(0.5, 0.32, 0.2)), sdEll(b, vec3(0.17, 0.17, 0.17)), 0.05);
        if (bow < res0.x) res0 = vec2(bow, 10.0);
    }
    vec2 n = v / vec2(1.98, 1.76);
    float sz = p.z - 0.62 + 0.12 * dot(n, n);
    float scr = extrude(sdEll2(v, vec2(1.98, 1.76)), sz, 0.34, 0.17) * 0.9;
    return res0.x < scr ? res0 : vec2(scr, 2.0);
}

#define SHOULDER vec3(1.017, 1.62, 0.05)

vec3 armLocal(vec3 p, out float ext) {
    vec2 arm = p.x > 0.0 ? uArms.zw : uArms.xy;
    ext = p.x > 0.0 ? uArmExt.y : uArmExt.x;
    if (gFriend > 0.5 && uFriends.w > 0.0) {
        arm = mix(arm, p.x > 0.0 ? uFArms.zw : uFArms.xy, uFriends.w);
        ext = mix(ext, 0.8, uFriends.w);
    }
    vec3 a = p;
    a.x = abs(a.x);
    a -= SHOULDER;
    float c1 = cos(arm.y), s1 = sin(arm.y);
    a.yz = mat2(c1, s1, -s1, c1) * a.yz;
    float c2 = cos(arm.x), s2 = sin(arm.x);
    a.xy = vec2(a.x * c2 + a.y * s2, -a.x * s2 + a.y * c2);
    a.y += 0.3 + 0.5 * ext;
    return a;
}
vec3 armR(float ext) { return vec3(0.24 - 0.03 * ext, 0.37 + 0.5 * ext, 0.25 - 0.03 * ext); }

float body(vec3 p) {
    float lift = mix(uFeet.x, uFeet.y, smoothstep(-0.3, 0.3, p.x));
    vec3 q = p;
    q.y -= lift * (1.0 - smoothstep(0.0, 1.0, q.y));
    float d = sdRBox(q - vec3(0.0, 1.05, 0.0), vec3(0.99, 1.05, 0.72), 0.5);
    vec2 ta = vec2(abs(q.x), q.y + 0.06);
    float tri = max(dot(ta, vec2(0.33, 0.944)) - 0.3 * 0.944, -ta.y);
    d = smax(d, -max(tri, abs(q.z) - 1.4), 0.17);
    d *= 1.0 - 1.1 * max(uFeet.x, uFeet.y);
    if (gFriend > 0.5) {
        // A skirt flaring out from the waist to just above the feet.
        float r = mix(1.0, 1.4, smoothstep(1.2, 0.3, q.y));
        float sk = (length(q.xz / vec2(1.0, 0.8)) - r) * 0.72;
        sk = max(sk, max(q.y - 1.25, 0.3 - q.y));
        d = smin(d, sk, 0.12);
    }

    float ext;
    vec3 a = armLocal(p, ext);
    return smin(d, sdEll(a, armR(ext)), 0.06);
}

vec3 toBody(vec3 ps) {
    vec3 pr = ps;
    pr.x -= uWalkX;
    pr.z -= uWalkZ;
    pr.y -= uHop;
    pr /= vec3(uSq.x, uSq.y, uSq.x);
    return uBody * pr;
}
vec3 toHead(vec3 pr) { return uHead * (pr - PIVOT) + PIVOT - HEAD_C; }

#define GIFT_C vec3(0.0, 1.0, 1.1)
#define GIFT_B vec3(0.66, 0.46, 0.42)

vec3 lidLocal(vec3 p) {
    vec3 l = p - GIFT_C - vec3(uLid.x, GIFT_B.y + 0.09 + uLid.y, 0.0);
    float c = cos(uLid.z), s = sin(uLid.z);
    l.xy = mat2(c, s, -s, c) * l.xy;
    return l;
}

/* Body plus what it wears and holds: bow tie (9), box (6), lid (8), bow (7). */
vec2 bodyAll(vec3 p) {
    vec2 r = vec2(body(p), 3.0);
    if (gFriend > 0.5) return r;
    vec3 t = p - vec3(0.0, 1.64, 0.74);
    vec3 tt = t;
    tt.x = abs(tt.x);
    float wing = sdEll(tt - vec3(0.15, 0.0, 0.0), vec3(0.15, 0.1, 0.06));
    float knot = sdEll(t, vec3(0.06, 0.07, 0.065));
    float bt = smin(wing, knot, 0.03);
    if (bt < r.x) r = vec2(bt, 9.0);
    if (uGift > 0.01) {
        vec3 q = (p - GIFT_C) / uGift;
        float bx = sdRBox(q, GIFT_B, 0.05) * uGift;
        if (uGiftOpen > 0.5)
            bx = max(bx, -sdBox(q - vec3(0.0, 0.25, 0.0), vec3(GIFT_B.x - 0.07, GIFT_B.y, GIFT_B.z - 0.07)) * uGift);
        if (bx < r.x) r = vec2(bx, 6.0);
        if (uLid.w > 0.001) {
            vec3 l = lidLocal(p) / uLid.w;
            float ld = sdRBox(l, vec3(GIFT_B.x + 0.05, 0.1, GIFT_B.z + 0.05), 0.04) * uLid.w;
            vec3 bw = l - vec3(0.0, 0.17, 0.0);
            vec3 bl = bw;
            bl.x = abs(bl.x);
            bl.xy -= vec2(0.19, 0.06);
            bl.xy = mat2(0.94, -0.34, 0.34, 0.94) * bl.xy;
            float loops = sdEll(bl, vec3(0.2, 0.12, 0.09));
            float kn = sdEll(bw, vec3(0.08, 0.08, 0.08));
            float bow = smin(loops, kn, 0.03) * uLid.w;
            if (ld < r.x) r = vec2(ld, 8.0);
            if (bow < r.x) r = vec2(bow, 7.0);
        }
    }
    return r;
}

#define HEAD_B vec3(2.9, 2.75, 1.0)
#define BODY_C vec3(0.0, uBodyBox.x, 0.0)
#define BODY_B uBodyBox.yzw
#define REACH 1.5

vec2 robotD(vec3 ps, bool fine) {
    float kq = min(uSq.x, uSq.y);
    vec3 pr = toBody(ps);
    vec3 ph = toHead(pr);
    float bh = sdBox(ph, HEAD_B) * kq;
    float bb = sdBox(pr - BODY_C, BODY_B) * kq;
    float far = min(bh, bb);
    if (far > REACH) return vec2(far, 1.0);
    vec2 res = vec2(1e5, 1.0);
    if (bh < bb) {
        res = head(ph, fine);
        res.x *= kq;
        if (bb < res.x) {
            vec2 bd = bodyAll(pr);
            bd.x *= kq;
            if (bd.x < res.x) res = bd;
        }
    } else {
        res = bodyAll(pr);
        res.x *= kq;
        if (bh < res.x) {
            vec2 h = head(ph, fine);
            h.x *= kq;
            if (h.x < res.x) res = h;
        }
    }
    return res;
}

/* Friend i (0 left, 1 right) in the robot's own scene frame: placed beside
   and behind him, smaller, lifted when dropping in or hopping out, and
   mirrored so she dances his moves the other way round. */
vec3 friendLocal(vec3 ps, float i) {
    float side = i < 0.5 ? -1.0 : 1.0;
    float lift = i < 0.5 ? uFriends.y : uFriends.z;
    vec3 q = (ps - vec3(side * uFriendPos.x, lift, uFriendPos.y)) / uFriendPos.z;
    q.x = -q.x;
    return q;
}

vec2 sceneD(vec3 ps, bool fine) {
    gFriend = 0.0;
    vec2 r = robotD(ps, fine);
    if (uFriends.x > 0.5) {
        for (int i = 0; i < 2; i++) {
            vec3 q = friendLocal(ps, float(i));
            float bnd = sdBox(q - vec3(0.0, 3.3, 0.0), vec3(3.6, 3.8, 2.4)) * uFriendPos.z;
            if (bnd > r.x) continue;
            gFriend = 1.0;
            vec2 f = robotD(q, fine);
            gFriend = 0.0;
            f.x *= uFriendPos.z;
            if (f.x < r.x) r = vec2(f.x, f.y + (i == 0 ? 20.0 : 40.0));
        }
    }
    return r;
}

float mapD(vec3 p) { return sceneD(uW2S * p, true).x * uScale; }
float mapC(vec3 p) { return sceneD(uW2S * p, false).x * uScale; }

vec3 calcN(vec3 p, float d0, float e) {
    return normalize(vec3(
        mapD(p + vec3(e, 0.0, 0.0)),
        mapD(p + vec3(0.0, e, 0.0)),
        mapD(p + vec3(0.0, 0.0, e))) - d0);
}

vec2 boxT(vec3 ro, vec3 rd) {
    vec3 o = uW2S * ro;
    vec3 d = uW2S * rd;
    vec3 inv = 1.0 / d;
    vec3 t0 = (uBoxMin - o) * inv;
    vec3 t1 = (uBoxMax - o) * inv;
    vec3 lo = min(t0, t1), hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

vec2 slab(vec3 o, vec3 d, vec3 c, vec3 b) {
    vec3 inv = 1.0 / d;
    vec3 t0 = (c - b - o) * inv;
    vec3 t1 = (c + b - o) * inv;
    vec3 lo = min(t0, t1), hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}
vec2 spanWith(vec2 s, vec2 b) {
    return b.y > max(b.x, 0.0) ? vec2(min(s.x, b.x), max(s.y, b.y)) : s;
}

float softShadow(vec3 ro, vec3 rd) {
    vec2 bt = boxT(ro, rd);
    if (bt.y <= max(bt.x, 0.0)) return 1.0;
    float t = max(bt.x, 0.03 * uScale);
    float res = 1.0;
    for (int i = 0; i < 20; i++) {
        float h = mapC(ro + rd * t);
        res = min(res, uSoft * h / t);
        t += clamp(h, 0.04 * uScale, 0.8 * uScale);
        if (res < 0.003 || t > bt.y) break;
    }
    res = clamp(res, 0.0, 1.0);
    return res * res * (3.0 - 2.0 * res);
}

float calcAO(vec3 p, vec3 n) {
    float occ = 0.0, sc = 1.0;
    for (int i = 0; i < 5; i++) {
        float h = (0.03 + 0.14 * float(i)) * uScale;
        occ += (h - mapD(p + n * h)) * sc;
        sc *= 0.72;
    }
    return mix(0.3, 1.0, clamp(1.0 - uAO * 1.5 * occ / uScale, 0.0, 1.0));
}

float skyVis(vec3 p, vec3 n) {
    vec3 dir = normalize(n + vec3(0.0, 1.0, 0.0));
    float occ = 0.0;
    for (int i = 0; i < 3; i++) {
        float h = (0.4 + 0.5 * float(i)) * uScale;
        occ += clamp(1.0 - mapC(p + dir * h) / h, 0.0, 1.0);
    }
    return 1.0 - uAO * 0.5 * occ / 3.0;
}

// A heart, tip at the origin, lobes up (after Inigo Quilez).
float dot2(vec2 v) { return dot(v, v); }
float sdHeart(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
    return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float eyeSD(vec2 p) {
    vec2 q = p - vec2(uEye.x, -0.5 + uEye.y);
    float wk = q.x > 0.0 ? uWink : 0.0;
    q.x = abs(q.x) - 0.5;
    float hy = max(0.4 * uEye.z, 0.03);
    float rect = sdRR(q, vec2(0.39, hy), min(0.13, hy));
    float arc = sdArc(q + vec2(0.0, 0.15), vec2(0.906, 0.423), 0.28, 0.07);
    float base = mix(rect, arc, max(uEye.w, wk));
    if (gFriend > 0.5) {
        // Three lashes curling up and out from the top of each eye.
        float l1 = sdSeg(q, vec2(0.06, hy - 0.02), vec2(0.12, hy + 0.17)) - 0.04;
        float l2 = sdSeg(q, vec2(0.2, hy - 0.02), vec2(0.3, hy + 0.15)) - 0.04;
        float l3 = sdSeg(q, vec2(0.32, hy - 0.04), vec2(0.46, hy + 0.09)) - 0.04;
        return min(base, min(l1, min(l2, l3)));
    }
    if (uHeart.x < 0.001) return base;
    float sz = 0.66 * uHeart.y;
    float hd = sdHeart(q / sz + vec2(0.0, 0.52)) * sz;
    hd = mix(hd, arc, wk);               // a heart can wink too
    return mix(base, hd, uHeart.x);
}

vec3 tuxAlb(vec3 pb, float eW) {
    float ext;
    vec3 a = armLocal(pb, ext);
    vec3 r = armR(ext);
    if (sdEll(a, r) < 0.03) {
        float u = -a.y / r.y;              // along the arm, 1 at the tip
        if (u > 0.62) return uClay;        // hand
        if (u > 0.46) return uShirt;       // cuff
        return uTux;
    }
    if (pb.y < 0.16) return uShoe;
    float front = smoothstep(0.4, 0.62, pb.z);
    // Shirt in a V that closes at the jacket button.
    float hw = clamp((pb.y - 1.12) / 0.83, 0.0, 1.0) * 0.46;
    float dV = abs(pb.x) - hw;
    if (front > 0.5 && dV < 0.0 && pb.y > 1.12) {
        float st = min(length(pb.xy - vec2(0.0, 1.44)), length(pb.xy - vec2(0.0, 1.28))) - 0.035;
        return mix(uShirt, uTux, 1.0 - smoothstep(-eW, eW, st));
    }
    vec3 c = uTux;
    float lap = front * (1.0 - smoothstep(0.11 - eW, 0.11 + eW, dV)) * step(1.05, pb.y);
    c = mix(c, uLapel, lap);
    float bt = length(pb.xy - vec2(0.0, 1.03)) - 0.05;
    c = mix(c, uLapel, front * (1.0 - smoothstep(-eW, eW, bt)));
    c *= 1.0 - 0.45 * exp(-pow((pb.y - 0.52) / 0.025, 2.0)) * front;
    // Pocket square on the wearer's left breast.
    vec2 ps = pb.xy - vec2(0.56, 1.6);
    float tri = max(-ps.y - 0.03, abs(ps.x) + ps.y * 0.9 - 0.11);
    c = mix(c, uPocket, front * (1.0 - smoothstep(-eW, eW, tri)));
    return c;
}

vec3 wrapAlb(vec3 q, bool inside, float eW) {
    float rb = min(abs(q.x), abs(q.z)) - 0.075;
    vec3 c = mix(uWrap, uGold, 1.0 - smoothstep(-eW, eW, rb));
    if (inside) c = uWrap * 0.55;
    return c;
}

vec3 friendAlb(float id, float fi, vec3 pb, float eW) {
    vec3 dress = fi < 0.5 ? uDressA : uDressB;
    vec3 clay = fi < 0.5 ? uClayA : uClayB;
    if (id > 9.5) return fi < 0.5 ? uBowA : uBowB;
    if (id > 2.5) {
        float ext;
        vec3 a = armLocal(pb, ext);
        vec3 r = armR(ext);
        if (sdEll(a, r) < 0.03) return -a.y / r.y > 0.62 ? clay : dress;
        if (pb.y < 0.24) return uShirt;                       // white shoes
        float hem = 1.0 - smoothstep(0.06 - eW, 0.06 + eW, abs(pb.y - 0.36));
        float belt = 1.0 - smoothstep(0.05 - eW, 0.05 + eW, abs(pb.y - 1.2));
        return mix(dress, uShirt, max(hem, belt) * 0.85);
    }
    return clay;
}

vec3 outfitAlb(float id, vec3 pb, vec3 ph, vec3 nh, float eW) {
    if (id > 8.5) return uLapel;                               // bow tie
    if (id > 7.5) return wrapAlb(lidLocal(pb) / max(uLid.w, 0.001), false, eW);
    if (id > 6.5) return uGold;                                // bow
    if (id > 5.5) {
        vec3 q = (pb - GIFT_C) / max(uGift, 0.01);
        bool inside = uGiftOpen > 0.5 && abs(q.x) < GIFT_B.x - 0.06 && abs(q.z) < GIFT_B.z - 0.06;
        return wrapAlb(q, inside, eW);
    }
    if (id > 2.5) return tuxAlb(pb, eW);
    return uClay;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec3 ro = vec3(0.0, CAM_Y, uD);
    float pxk = FRAME_UNITS / (uS * uD);
    vec3 os = uW2S * ro;
    vec3 sqv = vec3(uSq.x, uSq.y, uSq.x);
    vec3 ob = uBody * ((os - vec3(uWalkX, uHop, uWalkZ)) / sqv);
    vec3 ohd = uHead * (ob - PIVOT) + PIVOT - HEAD_C;
    float kq = min(uSq.x, uSq.y);
    bool clear = uTransparent > 0.5;

    float v = 1.0 - gl_FragCoord.y / uRes.y;
    vec3 bg = mix(uBgTop, uBgBot, 1.0 - pow(1.0 - v, uCurve));
    vec4 bgA = vec4(bg, clear ? 0.0 : 1.0);

    // Samples carry straight colour + coverage; they are summed
    // premultiplied, so transparent edges blend correctly.
    vec4 acc = vec4(0.0);
    float cnt = 0.0;
    bool edge = false;
    vec4 colC = bgA, colO = bgA;
    bool hitC = false, haveO = false;
    float idC = 0.0, tWarm = 0.0;
    for (int s = 0; s < uSamples; s++) {
        if (s > 0 && !edge) break;
        float a = 0.4636 + float(s - 1) * 1.5708;
        vec2 off = s == 0 ? vec2(0.0) : 0.395 * vec2(cos(a), sin(a));
        vec2 fc = gl_FragCoord.xy + off - 0.5 * uRes - uOff;
        vec2 q = fc / uS * FRAME_UNITS - vec2(0.0, ROLL_CY);
        q = mat2(uRoll.x, uRoll.y, -uRoll.y, uRoll.x) * q + vec2(0.0, ROLL_CY);
        vec3 rd = normalize(vec3(q, -uD));
        float tf = rd.y < 0.0 ? -ro.y / rd.y : 1e9;

        vec3 ds = uW2S * rd;
        vec3 db = uBody * (ds / sqv);
        vec2 span = vec2(1e9, -1e9);
        span = spanWith(span, slab(ohd, uHead * db, vec3(0.0), HEAD_B + 0.02));
        span = spanWith(span, slab(ob, db, BODY_C, BODY_B + 0.02));
        if (uFriends.x > 0.5) span = spanWith(span, boxT(ro, rd));
        bool hit = false;
        float t = max(max(span.x, 0.0), tWarm);
        float tEnd = min(span.y, tf);
        float hitAt = s == 0 ? 0.25 : 0.4;
        int steps = s == 0 ? 96 : 40;
        float rmin = 1e9, near = 1e9, prevR = 1e9;
        vec2 hitD = vec2(0.0, 1.0);
        if (tEnd > t) {
            float w = 1.4, lastD = 0.0, step = 0.0;
            for (int i = 0; i < 96; i++) {
                if (i >= steps) break;
                vec2 dd = sceneD(uW2S * (ro + rd * t), true);
                float d = dd.x * uScale;
                bool fail = w > 1.0 && d + lastD < step;
                if (fail) {
                    step -= w * step;
                    w = 1.0;
                } else {
                    float fp = pxk * t;
                    if (d < hitAt * fp) { hit = true; hitD = vec2(d, dd.y); break; }
                    float r = d / fp;
                    if (s == 0 && r < 1.5 && rmin >= 1.5) tWarm = t;
                    rmin = min(rmin, r);
                    if (r > prevR) near = min(near, prevR);
                    prevR = r;
                    step = d * w;
                }
                lastD = d;
                t += step;
                if (t > tEnd) break;
            }
            if (s == 0 && hit && rmin >= 1.5) tWarm = t;
        }

        bool same = s > 0 && hit == hitC && (!hit || abs(hitD.y - idC) < 0.5);
        vec4 col = same ? colC : colO;
        if (s == 0 || (!same && !haveO)) {
            vec3 rgb = bg;
            float alpha = bgA.a;
            vec3 n = vec3(0.0, 1.0, 0.0);
            vec3 p = ro + rd * t;
            vec3 pf = ro + rd * min(tf, 1e4);
            float ao = 1.0;
            float ndl = 0.0;
            if (hit) {
                n = calcN(p, hitD.x, max(pxk * t * 0.5, 0.0015 * uScale));
                ao = calcAO(p, n) * skyVis(p, n);
                ndl = dot(n, uSun);
            }
            bool wantSh = hit ? ndl > 0.03 : tf < 1e8;
            float sh = wantSh ? softShadow(hit ? p + n * 0.01 * uScale : pf, uSun) : (hit ? 0.0 : 1.0);
            if (hit) sh = mix(1.0, sh, uShDepth);

            if (hit) {
                float id = hitD.y;
                float fi = id > 39.5 ? 1.0 : 0.0;
                bool isF = id > 19.5;
                if (isF) id -= id > 39.5 ? 40.0 : 20.0;
                vec3 sp = uW2S * p;
                if (isF) sp = friendLocal(sp, fi);
                gFriend = isF ? 1.0 : 0.0;
                vec3 pbh = toBody(sp);
                vec3 phh = toHead(pbh);
                float eWh = 0.75 * pxk * t / (uScale * kq * (isF ? uFriendPos.z : 1.0));
                vec3 nh = normalize(uHead * (uBody * (uW2S * n)));
                vec3 alb = (id > 1.5 && id < 2.5) ? uVisor : (isF ? friendAlb(id, fi, pbh, eWh) : outfitAlb(id, pbh, phh, nh, eWh));
                vec2 sxz = normalize(uSun.xz + 1e-5);
                float side = dot(n.xz, sxz);
                vec3 lit = (uSky + uSkyUp * n.y + uSkySide * max(side, 0.0) + uSkyAway * max(-side, 0.0)) * ao
                         + uSunCol * max(ndl, 0.0) * sh;
                rgb = pow(max(alb * lit, 0.0), vec3(1.0 / 2.2));
                alpha = 1.0;
                if (!isF && id > 5.5 && id < 8.5) {
                    // The gift is glossy like the balloons: richer colour, a
                    // soft studio light from the upper front for highlights,
                    // a bright rim, and gold that shines warm.
                    vec3 v = -rd;
                    float goldAmt = 1.0 - smoothstep(0.0, 0.08, distance(alb, uGold));
                    rgb = mix(rgb, mix(vec3(1.0, 0.38, 0.64), vec3(0.98, 0.76, 0.32), goldAmt), 0.32);
                    vec3 key = normalize(vec3(-0.35, 0.8, 0.5));
                    float sp1 = pow(max(dot(n, normalize(key + v)), 0.0), mix(90.0, 30.0, goldAmt));
                    float sp2 = pow(max(dot(n, normalize(uSun + v)), 0.0), mix(110.0, 45.0, goldAmt)) * sh;
                    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
                    vec3 goldS = vec3(1.0, 0.88, 0.55);
                    rgb += mix(vec3(0.9), goldS * 1.4, goldAmt) * (0.85 * sp1 + 0.6 * sp2);
                    rgb += mix(vec3(1.0, 0.8, 0.9) * 0.25, goldS * 0.5, goldAmt) * fres;
                    // a soft sheen band across the front, like light on foil
                    float band = exp(-pow((dot(n, normalize(vec3(0.5, 0.6, 0.62))) - 0.86) / 0.06, 2.0));
                    rgb += mix(vec3(0.18), goldS * 0.35, goldAmt) * band;
                }
                if (id > 1.5 && id < 2.5) {
                    vec3 ph = phh;
                    float eW = eWh;
                    float front = smoothstep(0.3, 0.5, ph.z);
                    vec2 sv = ph.xy - vec2(0.0, -0.1);
                    float inScr = 1.0 - smoothstep(-0.12, 0.0, sdEll2(sv, vec2(1.98, 1.76)));

                    // Scanner: a thin bright line sweeping top to bottom,
                    // with a fading wake above it.
                    float ly = -0.1 + 1.6 * (1.0 - 2.0 * uScan.x);
                    float dy = ph.y - ly;
                    float lw = max(0.035, eW);
                    float line = exp(-(dy * dy) / (lw * lw));
                    float wake = dy > 0.0 ? exp(-dy * 3.2) : 0.0;
                    float scan = uScan.y * front * inScr;
                    rgb += uEyeCol * scan * (0.9 * line + 0.22 * wake);
                    rgb += uEyeCol * 0.07 * uFlash * front * inScr;

                    // Eyes, brightened where the line crosses them and
                    // while flashing.
                    float eD = eyeSD(ph.xy);
                    float eye = 1.0 - smoothstep(-eW, eW, eD);
                    float halo = uGlow * (1.0 + 2.5 * uFlash) * exp(-max(eD, 0.0) * 7.0) * (1.0 - eye);
                    vec3 eyeC = isF ? uEyeCol : mix(uEyeCol, uHeartCol, uHeart.x);
                    rgb += eyeC * halo * 0.35 * front;
                    float pass = uScan.y * exp(-(dy * dy) / 0.06);
                    vec3 ec = mix(eyeC, vec3(1.0), clamp(0.55 * pass + 0.5 * uFlash, 0.0, 0.85));
                    rgb = mix(rgb, ec, eye * front);
                }
                gFriend = 0.0;
                if (s == 0) edge = near < 1.5 || dot(n, -rd) < 0.3;
            } else {
                if (tf < 1e8) {
                    vec3 fs = uW2S * pf;
                    vec3 m = clamp(fs, uBoxMin, uBoxMax);
                    if (distance(fs.xz, m.xz) < 0.6) {
                        float h = 0.3 * uScale;
                        sh *= mix(0.55, 1.0, clamp(mapD(pf + vec3(0.0, h, 0.0)) / h, 0.0, 1.0));
                    }
                    float shade = (1.0 - sh) * uShDepth;
                    if (clear) {
                        rgb = uShadowCol;
                        alpha = shade;
                    } else {
                        rgb = mix(uShadowCol, bg, 1.0 - shade);
                    }
                }
                if (s == 0) {
                    if (tf <= span.y) rmin = min(rmin, mapD(pf) / (pxk * tf));
                    edge = rmin < 1.5;
                }
            }
            col = vec4(rgb, alpha);
            if (s == 0) {
                colC = col;
                hitC = hit;
                idC = hitD.y;
            } else {
                colO = col;
                haveO = true;
            }
        }
        acc += vec4(col.rgb * col.a, col.a);
        cnt += 1.0;
    }
    acc /= cnt;
    float dn = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    fragColor = vec4(acc.rgb + dn * acc.a, acc.a);
}
`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type)
    if (!sh) return null
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[ClayRobot]", gl.getShaderInfoLog(sh))
        gl.deleteShader(sh)
        return null
    }
    return sh
}

/* --------------------------------------------------------------- maths */

type M3 = Float32Array
function rotX(a: number, o: M3): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    o[0] = 1; o[1] = 0; o[2] = 0
    o[3] = 0; o[4] = c; o[5] = -s
    o[6] = 0; o[7] = s; o[8] = c
    return o
}
function rotY(a: number, o: M3): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    o[0] = c; o[1] = 0; o[2] = s
    o[3] = 0; o[4] = 1; o[5] = 0
    o[6] = -s; o[7] = 0; o[8] = c
    return o
}
function rotZ(a: number, o: M3): M3 {
    const c = Math.cos(a), s = Math.sin(a)
    o[0] = c; o[1] = -s; o[2] = 0
    o[3] = s; o[4] = c; o[5] = 0
    o[6] = 0; o[7] = 0; o[8] = 1
    return o
}
function mul3(a: M3, b: M3, out: M3) {
    for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
            out[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]
}

interface Spring {
    x: number
    v: number
}
function stepSpring(s: Spring, target: number, T: number, dt: number) {
    const w = 5.8 / Math.max(T, 0.02)
    let left = dt
    while (left > 0) {
        const h = Math.min(left, 0.004)
        const a = w * w * (target - s.x) - 2 * w * s.v
        s.v += a * h
        s.x += s.v * h
        left -= h
    }
}
const springBusy = (s: Spring, target: number) =>
    Math.abs(s.x - target) > 1e-4 || Math.abs(s.v) > 1e-3

function makeRandom(seed: number) {
    let a = seed >>> 0
    return () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function hopPose(h: number, height: number): { lift: number; squash: number; done: boolean } {
    if (h < HOP_CROUCH) {
        return { lift: 0, squash: 0.13 * Math.sin((Math.PI / 2) * (h / HOP_CROUCH)), done: false }
    }
    const a = h - HOP_CROUCH
    if (a < HOP_AIR) {
        const u = a / HOP_AIR
        return { lift: 4 * height * u * (1 - u), squash: -0.09 * (1 - 2 * u) * (1 - 2 * u) + 0.13 * Math.max(0, 1 - a / 0.06), done: false }
    }
    return landPose(a - HOP_AIR)
}
/** Landing from the entrance drop: squat into the floor, hold a beat,
 *  then push up into a small stretch and settle. */
function crouchPose(l: number): { squash: number; done: boolean } {
    if (l > 0.95) return { squash: 0, done: true }
    if (l < 0.07) return { squash: 0.34 * (l / 0.07), done: false }
    if (l < 0.22) return { squash: 0.34, done: false }
    const u = (l - 0.22) / 0.73
    return { squash: 0.34 * Math.exp(-u * 4.5) * Math.cos(u * 8.5), done: false }
}
interface DancePose {
    lift: number; squash: number; roll: number; yaw: number; bob: number; tilt: number; slide: number
    footL: number; footR: number; armL: number; armR: number; swingL: number; swingR: number; extL: number; extR: number
}
/** One dance move, `b` beats into its eight. */
function dancePose(move: number, b: number): DancePose {
    const ph = b * Math.PI
    const sn = Math.sin(ph)
    const ease = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t) }
    const base: DancePose = {
        lift: 0.16 * Math.abs(sn), squash: 0.06 * Math.cos(2 * ph), roll: 0.1 * sn, yaw: 0, bob: 0.1 * Math.sin(2 * ph),
        tilt: 0.18 * sn, slide: 0, footL: 0.1 * Math.max(0, sn), footR: 0.1 * Math.max(0, -sn),
        armL: ARM_REST, armR: ARM_REST, swingL: 0, swingR: 0, extL: 0, extR: 0,
    }
    if (move === 0) {
        // Pumps: one arm out at a time, a side-to-side sway.
        const l = Math.max(0, sn), r = Math.max(0, -sn)
        return { ...base, yaw: 0.3 * Math.sin(ph * 0.5), armL: ARM_REST + 1.45 * l, armR: ARM_REST + 1.45 * r,
            swingL: 0.3 * sn, swingR: -0.3 * sn, extL: 0.75 * l, extR: 0.75 * r }
    }
    if (move === 1) {
        // Wide wings: both arms out, waving up and down in turn; a twist.
        const w = Math.sin(2 * ph)
        return { ...base, yaw: 0.42 * sn, armL: 1.55 + 0.4 * w, armR: 1.55 - 0.4 * w, extL: 0.85, extR: 0.85 }
    }
    if (move === 2) {
        // Shimmy slide: a step left for two beats, right for two, shoulders
        // shaking fast, arms half out.
        const sl = Math.sin(ph * 0.5)
        const shake = Math.sin(ph * 4)
        return { ...base, slide: 0.55 * sl, roll: 0.07 * shake, yaw: 0.12 * shake, lift: 0.06 * Math.abs(sn),
            footL: 0.12 * Math.max(0, sl), footR: 0.12 * Math.max(0, -sl),
            armL: 0.95 + 0.15 * shake, armR: 0.95 - 0.15 * shake, swingL: 0.5, swingR: 0.5, extL: 0.4, extR: 0.4 }
    }
    if (move === 3) {
        // Spin: a full turn one way over a bar, back the other way over the next.
        const t = b < 4 ? ease(b / 4) : 1 - ease((b - 4) / 4)
        return { ...base, yaw: Math.PI * 2 * t, roll: 0.04 * sn, armL: 1.3, armR: 1.3, extL: 0.6, extR: 0.6,
            bob: 0.06 * Math.sin(2 * ph), tilt: 0 }
    }
    // Hops: a jump on every other beat with arms thrown up, a squash on landing.
    const h = (b % 2) / 2
    const air = h < 0.6 ? Math.sin((h / 0.6) * Math.PI) : 0
    const land = h >= 0.6 ? Math.sin(((h - 0.6) / 0.4) * Math.PI) : 0
    return { ...base, lift: 0.55 * air, squash: 0.14 * land - 0.06 * air, roll: 0.05 * sn, footL: 0, footR: 0,
        armL: ARM_REST + 1.9 * air, armR: ARM_REST + 1.9 * air, extL: 0.8 * air, extR: 0.8 * air, bob: -0.1 * air }
}

function landPose(l: number): { lift: number; squash: number; done: boolean } {
    if (l > LAND_S) return { lift: 0, squash: 0, done: true }
    const env = Math.exp(-l * 7) * (1 - l / LAND_S)
    return { lift: 0, squash: 0.16 * env * Math.cos(l * 19), done: false }
}

/* ----------------------------------------------------------- component */

export default function BirthdayRobot({
    outfit,
    gift = false,
    giftOpen = false,
    heart = false,
    winkKey = 0,
    tapWink = true,
    winkDelay = 0.12,
    waveOnLand = false,
    pointerWave = true,
    giftGone = false,
    dancing = false,
    laughKey = 0,
    danceBpm = DANCE_BPM,
    friends = false,
    entrance = "none",
    dropFrom = DROP_FROM,
    playKey = 0,
    onArrive,
    background,
    colors,
    scale = DEFAULTS.scale,
    placement,
    animate = DEFAULTS.animate,
    delay = DEFAULTS.delay,
    response,
    walk = DEFAULTS.walk,
    walkSpeed = DEFAULTS.walkSpeed,
    wave = DEFAULTS.wave,
    glance = DEFAULTS.glance,
    blink = DEFAULTS.blink,
    scanner = DEFAULTS.scanner,
    scanEvery = DEFAULTS.scanEvery,
    transparent = DEFAULTS.transparent,
    alert = DEFAULTS.alert,
    advanced,
    className,
    style,
}: ClayRobotProps) {
    const bgc = { ...DEFAULT_BACKGROUND, ...background }
    const col = { ...DEFAULT_COLORS, ...colors }
    const place = { ...DEFAULT_PLACEMENT, ...placement }
    const resp = { ...DEFAULT_RESPONSE, ...response }
    const adv = { ...DEFAULT_ADVANCED, ...advanced }
    const fit = { ...DEFAULT_OUTFIT, ...outfit }

    const hostRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [failed, setFailed] = useState(false)

    const live = {
        bgc, col, place, resp, adv, scale, animate, delay, walk, walkSpeed, wave, glance, blink,
        scanner, scanEvery, transparent, alert, outfit: fit, entrance, playKey, dropFrom,
        gift, giftOpen, heart, winkKey, tapWink, winkDelay, waveOnLand, pointerWave, giftGone, dancing, laughKey, danceBpm, friends,
    }
    const propsRef = useRef(live)
    propsRef.current = live
    const arriveRef = useRef(onArrive)
    arriveRef.current = onArrive
    const wakeRef = useRef<() => void>(() => {})
    const propKey = JSON.stringify(live)
    useEffect(() => {
        wakeRef.current()
    }, [propKey])

    useEffect(() => {
        const host = hostRef.current
        const canvas = canvasRef.current
        if (!host || !canvas) return

        let disposed = false
        let raf = 0
        let gl: WebGL2RenderingContext | null = null
        let program: WebGLProgram | null = null
        let buffer: WebGLBuffer | null = null
        let vao: WebGLVertexArrayObject | null = null
        const uni: Record<string, WebGLUniformLocation | null> = {}
        let timerExt: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null
        const queries: { q: WebGLQuery; level: number }[] = []

        let layoutW = 1
        let layoutH = 1
        let shown = 1
        let needResize = true

        let onScreen = true
        let pageVisible = true
        let reduceMotion = false

        let ptrX = 0
        let ptrY = 0
        let ptrNew = false
        let ptrInFrame = false
        let ptrInPage = false
        let ptrSeen = false
        let touchUntil = 0
        let scrolled = false
        let ptrU = 0.5
        let ptrV = 0.5

        const yaw: Spring = { x: 0, v: 0 }
        const pitch: Spring = { x: 0, v: 0 }
        const bodyYaw: Spring = { x: 0, v: 0 }
        const eyeX: Spring = { x: 0, v: 0 }
        const eyeY: Spring = { x: 0, v: 0 }
        const flash: Spring = { x: 0, v: 0 }
        let tYaw = 0, tPitch = 0, tEyeX = 0, tEyeY = 0
        let clock = 0
        let hopAt = -1
        let joyAt = -1
        let blinkAt = -1
        let nextBlink = 2.2
        let nextGlance = 1.6
        let glanceYaw = 0
        let glancePitch = 0
        let dropAt = -1
        let dropDone = false
        let walkX = 0
        let walkV = 0
        let walkGoal = 0
        let gait = 0
        let walkAmt = 0
        let ptrFloorX = 0
        let lastActive = -1e9
        let wasActive = false
        let waveAt = -1
        let waveSide = 1
        let greet = false
        // Scanner: when the current sweep began, how long it lasts, and
        // when the next idle sweep is due.
        let scanAt = -1
        let scanDur = SCAN_S
        let nextScan = 2.5
        let alertWas = false
        // Entrance and wink.
        let walkZ = 0
        let approachAt = -1
        let approachV = 0
        let lastPlay: number | null = null
        let winkAt = -1
        let waveDue = -1
        // Gift, hearts, wink requests.
        let openAt = -1
        let openWas = false
        let lastWinkKey: number | null = null
        const heartS: Spring = { x: 0, v: 0 }
        let goneAt = -1
        let goneWas = false
        let danceAt = -1
        let danceAmt = 0
        let laughAt = -1
        let friendsIn = -1
        let friendsOut = -1
        let friendsWas = false
        let lastLaugh: number | null = null
        const rand = makeRandom(0x5eed)

        const gaps = new Float64Array(15)
        const sortBuf = new Float64Array(15)
        let gapN = 0
        let lastTick = 0
        let lastDraw = 0
        let every = 1
        let ticksSince = 0
        let dirty = true
        let wasBusy = false
        let level = 0
        let slowFor = 0
        let goodFor = 0
        let climbedAt = -1
        const banUntil = [0, 0, 0, 0]
        let lateEma = 1
        let gpuEma = 0
        let drawn = 0
        let rectCheck = 0

        const mHead = new Float32Array(9)
        const mBody = new Float32Array(9)
        const mW2S = new Float32Array(9)
        const tmp = new Float32Array(9)
        const tA = new Float32Array(9)
        const tB = new Float32Array(9)

        function init(): boolean {
            const ctx = canvas!.getContext("webgl2", {
                alpha: true,
                premultipliedAlpha: true,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: "low-power",
                preserveDrawingBuffer: false,
            }) as WebGL2RenderingContext | null
            if (!ctx) return false
            gl = ctx
            const vs = compile(gl, gl.VERTEX_SHADER, VERT)
            const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
            if (!vs || !fs) return false
            const prog = gl.createProgram()
            if (!prog) return false
            gl.attachShader(prog, vs)
            gl.attachShader(prog, fs)
            gl.bindAttribLocation(prog, 0, "aPos")
            gl.linkProgram(prog)
            gl.deleteShader(vs)
            gl.deleteShader(fs)
            if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
            program = prog
            gl.useProgram(prog)
            vao = gl.createVertexArray()
            gl.bindVertexArray(vao)
            buffer = gl.createBuffer()
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
            gl.enableVertexAttribArray(0)
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
            const names = [
                "uRes", "uS", "uOff", "uRoll", "uD", "uW2S", "uScale", "uHop", "uSq",
                "uBody", "uHead", "uEye", "uBoxMin", "uBoxMax", "uSun", "uSunCol", "uSky",
                "uSkyUp", "uSkySide", "uSkyAway", "uSoft", "uAO", "uBgTop", "uBgBot", "uCurve", "uShadowCol", "uShDepth", "uClay",
                "uVisor", "uEyeCol", "uGlow", "uSamples", "uWalkX", "uFeet", "uArms", "uArmExt", "uBodyBox",
                "uScan", "uFlash", "uTransparent", "uWalkZ", "uWink",
                "uFriends", "uFriendPos", "uFArms", "uDressA", "uClayA", "uBowA", "uDressB", "uClayB", "uBowB", "uTux", "uLapel", "uShirt", "uShoe", "uPocket", "uWrap", "uGold", "uGift", "uGiftOpen", "uLid", "uHeart", "uHeartCol",
            ]
            for (const n of names) uni[n] = gl.getUniformLocation(prog, n)
            timerExt = gl.getExtension("EXT_disjoint_timer_query_webgl2") as typeof timerExt
            queries.length = 0
            needResize = true
            dirty = true
            return true
        }

        function applySize() {
            if (!gl) return
            const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
            let k = dpr * Math.min(Math.max(shown, 1), 2)
            const area = layoutW * layoutH * k * k
            if (area > PIXEL_BUDGET) k *= Math.sqrt(PIXEL_BUDGET / area)
            k *= LEVELS[level]
            const w = Math.max(1, Math.round(layoutW * k))
            const h = Math.max(1, Math.round(layoutH * k))
            if (canvas!.width !== w || canvas!.height !== h) {
                canvas!.width = w
                canvas!.height = h
            }
            gl.viewport(0, 0, w, h)
            needResize = false
        }

        function measureShown() {
            const r = host!.getBoundingClientRect()
            if (layoutW > 0 && r.width > 0) {
                const s = r.width / layoutW
                if (Math.abs(s - shown) / shown > 0.05) {
                    shown = s
                    needResize = true
                    dirty = true
                }
            }
            return r
        }

        function aimAt(u: number, v: number) {
            const p = propsRef.current
            const W = layoutW, H = layoutH
            const S = Math.min(H, W / REF_ASPECT)
            const ang = (p.place.angle * Math.PI) / 180
            const fx = u * W - W / 2 - (p.place.x / 100) * W
            const fy = H / 2 - v * H + (p.place.y / 100) * H
            let qx = (fx / S) * FRAME_UNITS
            let qy = (fy / S) * FRAME_UNITS - ROLL_CY
            const c = Math.cos(ang), s = Math.sin(ang)
            const rx = c * qx - s * qy
            const ry = s * qx + c * qy + ROLL_CY
            qx = rx
            qy = ry
            ptrFloorX = qx / (p.scale / 100)
            const D = p.adv.cameraDistance
            const len = Math.hypot(qx, qy, D)
            const dx = qx / len, dy = qy / len, dz = -D / len
            const tt = (LOOK_Z - D) / dz
            let Tx = dx * tt, Ty = CAM_Y + dy * tt, Tz = D + dz * tt
            const k = p.scale / 100
            Tx /= k; Ty /= k; Tz /= k
            const tl = (-p.place.tilt * Math.PI) / 180
            const ct = Math.cos(tl), st = Math.sin(tl)
            const sy = ct * Ty + st * Tz
            const sz = -st * Ty + ct * Tz
            const ox = Tx - walkX, oy = sy - HEAD_Y, oz = sz
            const yawRaw = Math.atan2(ox, Math.max(oz, 0.5))
            const pitchRaw = Math.atan2(oy, Math.hypot(ox, oz))
            setAim(yawRaw, pitchRaw)
        }

        function setAim(yawRaw: number, pitchRaw: number) {
            const p = propsRef.current
            const maxYaw = (p.resp.headTurn / 10) * 0.87
            const maxPitch = maxYaw * 0.55
            tYaw = maxYaw > 0 ? maxYaw * Math.tanh(yawRaw / maxYaw) : 0
            tPitch = maxPitch > 0 ? maxPitch * Math.tanh(pitchRaw / maxPitch) : 0
            const et = p.resp.eyeTravel / 10
            tEyeX = et * EYE_X * Math.tanh(yawRaw / 0.55)
            const py = Math.tanh(pitchRaw / 0.4)
            tEyeY = et * (py > 0 ? EYE_UP : EYE_DOWN) * py
        }

        function walkRange(out: number[]) {
            const p = propsRef.current
            const W = layoutW, H = layoutH
            const S = Math.min(H, W / REF_ASPECT)
            const k = p.scale / 100
            const off = (p.place.x / 100) * W
            const lo = (((-W / 2 - off) / S) * FRAME_UNITS) / k + WALK_MARGIN
            const hi = (((W / 2 - off) / S) * FRAME_UNITS) / k - WALK_MARGIN
            out[0] = lo > hi ? (lo + hi) / 2 : lo
            out[1] = lo > hi ? (lo + hi) / 2 : hi
        }
        const range = [0, 0]

        function startWave(side: number) {
            const p = propsRef.current
            if (!p.wave || reduceMotion || waveAt >= 0) return
            waveAt = clock
            waveSide = side >= 0 ? 1 : -1
        }

        function waveUp(w: number): number {
            const ease = (x: number) => x * x * (3 - 2 * x)
            if (w < WAVE_UP) return ease(w / WAVE_UP)
            if (w < WAVE_UP + WAVE_HOLD) return 1
            if (w < WAVE_UP + WAVE_HOLD + WAVE_DOWN) return 1 - ease((w - WAVE_UP - WAVE_HOLD) / WAVE_DOWN)
            return 0
        }

        function draw() {
            if (!gl || !program) return
            const p = propsRef.current
            if (needResize) applySize()
            const W = canvas!.width, H = canvas!.height
            const bs = W / layoutW
            const S = Math.min(layoutH, layoutW / REF_ASPECT) * bs

            let lift = 0
            let squash = 0
            let landSq = 0
            if (dropAt >= 0 && !dropDone) {
                const d = clock - dropAt
                const from = Math.max(1, p.dropFrom)
                // Same pull of gravity whatever the height.
                const fall = DROP_S * Math.sqrt(from / DROP_FROM)
                if (d < 0) lift = from
                else if (d < fall) {
                    const u = d / fall
                    lift = from * (1 - u * u)
                    squash = -0.1 * u
                } else if (p.entrance === "drop") {
                    const cp = crouchPose(d - fall)
                    squash = cp.squash
                    landSq = Math.max(0, cp.squash)
                    if (cp.done) {
                        dropDone = true
                        if (p.winkDelay >= 0) winkAt = clock + p.winkDelay
                        if (p.waveOnLand) waveDue = clock + 0.1
                        try { arriveRef.current?.() } catch {}
                    }
                } else {
                    const lp = landPose(d - fall)
                    squash = lp.squash
                    if (lp.done) dropDone = true
                }
            }
            const hopH = (p.resp.hop / 10) * 1.6
            if (hopAt >= 0) {
                const hp = hopPose(clock - hopAt, hopH)
                lift += hp.lift
                squash += hp.squash
                if (hp.done) hopAt = -1
            }
            let joy = 0
            if (joyAt >= 0) {
                const j = clock - joyAt
                joy = j < 0.08 ? j / 0.08 : j < JOY_S ? 1 : Math.max(0, 1 - (j - JOY_S) / 0.15)
                if (j > JOY_S + 0.15) joyAt = -1
            }
            const gs = Math.sin(gait)
            lift += walkAmt * BOB * Math.abs(gs)
            let roll = -walkAmt * WADDLE * gs
            let liftL = walkAmt * STEP_LIFT * Math.max(0, gs)
            let liftR = walkAmt * STEP_LIFT * Math.max(0, -gs)
            // Arms swing out to catch the landing.
            let armL = ARM_REST + 1.6 * landSq, armR = ARM_REST + 1.6 * landSq
            let swingL = walkAmt * ARM_SWING * gs
            let swingR = -swingL
            // Gift scale: a small swell, then gone.
            let giftS = p.gift ? 1 : 0
            if (p.gift && goneAt >= 0) {
                const g = (clock - goneAt) / 0.32
                giftS = g < 0.3 ? 1 + 0.15 * (g / 0.3) : Math.max(0, 1.15 * (1 - (g - 0.3) / 0.7))
            }
            if (giftS > 0.5) {
                // Hands round the box.
                armL = armR = HOLD_RAISE + 0.6 * landSq
                swingL = swingR = HOLD_SWING
            }
            let extL = 0, extR = 0
            if (waveAt >= 0) {
                const w = clock - waveAt
                const up = waveUp(w)
                const sway = WAVE_SWAY * up * up * Math.sin((w - WAVE_UP) * Math.PI * 2 * WAVE_HZ)
                const raise = ARM_REST + (WAVE_RAISE - ARM_REST) * up + sway
                if (waveSide > 0) {
                    armR = raise
                    swingR *= 1 - up
                    extR = up
                } else {
                    armL = raise
                    swingL *= 1 - up
                    extL = up
                }
                joy = Math.max(joy, up)
                if (w > WAVE_UP + WAVE_HOLD + WAVE_DOWN) waveAt = -1
            }

            // Dance: five moves, two bars each, in a loop. Each move eases in
            // over its first beat from the pose the last one ended on.
            let danceYaw = 0, headBob = 0, headTilt = 0, slide = 0
            if (danceAmt > 0.001) {
                const a = Math.min(1, danceAmt)
                const beat = ((clock - danceAt) * Math.max(40, p.danceBpm)) / 60
                const move = Math.floor(beat / 8)
                const local = beat - move * 8
                const cur = dancePose(move % 5, local)
                const prev = dancePose((move + 4) % 5, 8)
                const w = move === 0 ? 1 : Math.min(1, local)
                const k = w * w * (3 - 2 * w)
                const pick = (x: number, y: number) => (x + (y - x) * k) * a
                const blend = (base: number, x: number, y: number) => base + (x + (y - x) * k - base) * a
                lift += Math.max(0, pick(prev.lift, cur.lift))
                squash += pick(prev.squash, cur.squash)
                roll += pick(prev.roll, cur.roll)
                danceYaw = pick(prev.yaw, cur.yaw)
                headBob = pick(prev.bob, cur.bob)
                headTilt = pick(prev.tilt, cur.tilt)
                slide = pick(prev.slide, cur.slide)
                liftL += Math.max(0, pick(prev.footL, cur.footL))
                liftR += Math.max(0, pick(prev.footR, cur.footR))
                armL = blend(armL, prev.armL, cur.armL)
                armR = blend(armR, prev.armR, cur.armR)
                swingL = blend(swingL, prev.swingL, cur.swingL)
                swingR = blend(swingR, prev.swingR, cur.swingR)
                extL = Math.max(extL, pick(prev.extL, cur.extL))
                extR = Math.max(extR, pick(prev.extR, cur.extR))
            }
            // Laugh: happy eyes and a few quick giggle bounces.
            if (laughAt >= 0) {
                const l = clock - laughAt
                if (l > 1.5) laughAt = -1
                else {
                    const fade = 1 - l / 1.5
                    lift += 0.12 * Math.abs(Math.sin(l * 15)) * fade
                    roll += 0.06 * Math.sin(l * 15) * fade
                    headBob += 0.12 * Math.abs(Math.sin(l * 15)) * fade
                    joy = Math.max(joy, l < 1.3 ? 1 : (1.5 - l) / 0.2)
                }
            }

            let open = 1
            if (blinkAt >= 0) {
                const b = (clock - blinkAt) / BLINK_S
                if (b >= 1) blinkAt = -1
                else open = 1 - 0.94 * Math.sin(Math.PI * b)
            }
            if (dropAt >= 0 && !dropDone && clock - dropAt < DROP_S * Math.sqrt(Math.max(1, p.dropFrom) / DROP_FROM) + 0.08) open = 0.12

            // Lid: pops, flips up and off, then shrinks away.
            let lidX = 0, lidY = 0, lidT = 0, lidS = 1
            if (openAt >= 0) {
                const o = clock - openAt
                const e = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
                lidY = 0.25 * e(o / 0.1) + 1.5 * e((o - 0.08) / 0.55)
                lidX = 0.7 * e((o - 0.08) / 0.6)
                lidT = -0.9 * e((o - 0.05) / 0.6)
                lidS = 1 - e((o - 0.55) / 0.35)
            }

            let wink = 0
            if (winkAt >= 0) {
                const w = clock - winkAt
                if (w >= 0) {
                    if (w < 0.08) wink = w / 0.08
                    else if (w < 0.55) wink = 1
                    else if (w < 0.68) wink = 1 - (w - 0.55) / 0.13
                    else winkAt = -1
                }
            }

            let scanPos = 0, scanAmt = 0
            if (scanAt >= 0) {
                const u = (clock - scanAt) / scanDur
                if (u >= 0 && u <= 1) {
                    scanPos = u
                    scanAmt = Math.sqrt(Math.sin(Math.PI * u))
                }
            }

            const k = p.scale / 100
            const tilt = (-p.place.tilt * Math.PI) / 180
            rotX(tilt, mW2S)
            for (let i = 0; i < 9; i++) mW2S[i] /= k
            const hy = yaw.x - bodyYaw.x + 0.35 * headTilt
            mul3(rotY(hy, tA), rotX(-pitch.x - headBob, tB), tmp)
            mul3(tmp, rotZ(HEAD_ROLL * hy, tA), mHead)
            mul3(rotY(bodyYaw.x + danceYaw, tA), rotZ(roll + 0.6 * headTilt * 0, tB), mBody)

            const az = (p.adv.sunAngle * Math.PI) / 180
            const el = (p.adv.sunElevation * Math.PI) / 180
            const sunX = Math.sin(az) * Math.cos(el)
            const sunY = Math.sin(el)
            const sunZ = Math.cos(az) * Math.cos(el)

            const bgTop = toRGB(p.bgc.top, DEFAULT_BACKGROUND.top)
            const bgBot = toRGB(p.bgc.bottom, DEFAULT_BACKGROUND.bottom)
            const shc = toRGB(p.bgc.shadow, DEFAULT_BACKGROUND.shadow)
            const clay = toRGB(p.col.clay, DEFAULT_COLORS.clay)
            const visor = toRGB(p.col.visor, DEFAULT_COLORS.visor)
            const eyes = toRGB(p.col.eyes, DEFAULT_COLORS.eyes)
            const ss = p.adv.sunStrength
            const sk = p.adv.skyStrength

            const g = gl
            g.useProgram(program)
            g.uniform2f(uni.uRes, W, H)
            g.uniform1f(uni.uS, S)
            g.uniform2f(uni.uOff, (p.place.x / 100) * W, (-p.place.y / 100) * H)
            const ang = (p.place.angle * Math.PI) / 180
            g.uniform2f(uni.uRoll, Math.cos(ang), Math.sin(ang))
            g.uniform1f(uni.uD, p.adv.cameraDistance)
            g.uniformMatrix3fv(uni.uW2S, false, mW2S)
            g.uniform1f(uni.uScale, k)
            g.uniform1f(uni.uHop, lift)
            const sq = Math.max(-0.3, Math.min(0.4, squash))
            g.uniform2f(uni.uSq, 1 + sq * 0.5, 1 - sq)
            g.uniformMatrix3fv(uni.uBody, false, mBody)
            g.uniformMatrix3fv(uni.uHead, false, mHead)
            g.uniform4f(uni.uEye, eyeX.x, eyeY.x, open, joy)
            const fx = friendsIn >= 0 ? FRIEND_X + 3.3 * FRIEND_S + 0.6 : 3.25
            g.uniform3f(uni.uBoxMin, walkX - fx - Math.abs(slide), -0.05, walkZ - 2.7 + (friendsIn >= 0 ? FRIEND_Z : 0))
            g.uniform3f(uni.uBoxMax, walkX + fx + Math.abs(slide), 6.75 + Math.max(lift, friendsIn >= 0 ? FRIEND_FROM * 2 : 0) + Math.max(0, -sq) * 6, walkZ + 2.7)
            g.uniform3f(uni.uSun, sunX, sunY, sunZ)
            g.uniform3f(uni.uSunCol, SUN[0] * ss, SUN[1] * ss, SUN[2] * ss)
            g.uniform3f(uni.uSky, SKY[0] * sk, SKY[1] * sk, SKY[2] * sk)
            g.uniform3f(uni.uSkyUp, SKY_UP[0] * sk, SKY_UP[1] * sk, SKY_UP[2] * sk)
            g.uniform3f(uni.uSkySide, SKY_SIDE[0] * sk, SKY_SIDE[1] * sk, SKY_SIDE[2] * sk)
            g.uniform3f(uni.uSkyAway, SKY_AWAY[0] * sk, SKY_AWAY[1] * sk, SKY_AWAY[2] * sk)
            g.uniform1f(uni.uSoft, p.adv.shadowSoftness)
            g.uniform1f(uni.uAO, p.adv.occlusion)
            g.uniform3f(uni.uBgTop, bgTop[0], bgTop[1], bgTop[2])
            g.uniform3f(uni.uBgBot, bgBot[0], bgBot[1], bgBot[2])
            g.uniform1f(uni.uCurve, p.adv.gradientCurve)
            g.uniform3f(uni.uShadowCol, shc[0], shc[1], shc[2])
            const shDepth = p.bgc.shadowDepth ?? DEFAULT_BACKGROUND.shadowDepth
            g.uniform1f(uni.uShDepth, Math.max(0, Math.min(100, shDepth)) / 100)
            g.uniform3f(uni.uClay, lin(clay[0]) / CLAY_LIN[0], lin(clay[1]) / CLAY_LIN[1], lin(clay[2]) / CLAY_LIN[2])
            g.uniform3f(uni.uVisor, lin(visor[0]) / CLAY_LIN[0], lin(visor[1]) / CLAY_LIN[1], lin(visor[2]) / CLAY_LIN[2])
            g.uniform3f(uni.uEyeCol, eyes[0], eyes[1], eyes[2])
            g.uniform1f(uni.uGlow, p.adv.eyeGlow)
            g.uniform1f(uni.uWalkX, walkX + slide)
            g.uniform1f(uni.uWalkZ, walkZ)
            g.uniform1f(uni.uWink, wink)
            g.uniform2f(uni.uFeet, liftL, liftR)
            g.uniform4f(uni.uArms, armL, swingL, armR, swingR)
            g.uniform2f(uni.uArmExt, extL, extR)
            if (extL + extR > 0) g.uniform4f(uni.uBodyBox, 1.48, 3.0, 1.55, 0.9)
            else if (giftS > 0.01) g.uniform4f(uni.uBodyBox, 1.45, 1.75, 1.55, 1.6)
            else g.uniform4f(uni.uBodyBox, 1.05, 1.45, 1.12, 0.85)
            g.uniform1i(uni.uSamples, 5)
            g.uniform2f(uni.uScan, scanPos, scanAmt)
            g.uniform1f(uni.uFlash, Math.max(0, Math.min(1, flash.x)))
            g.uniform1f(uni.uTransparent, p.transparent ? 1 : 0)
            g.uniform1f(uni.uGift, giftS)
            // Friends: drop in one after the other; at the end, wave, then hop off the top.
            let fOn = 0, fL = 0, fR = 0, fWave = 0
            if (friendsIn >= 0) {
                fOn = 1
                const drop = (d: number) => (d < 0 ? FRIEND_FROM : d < 0.62 ? FRIEND_FROM * (1 - (d / 0.62) ** 2) : 0)
                fL = drop(clock - friendsIn)
                fR = drop(clock - friendsIn - 0.18)
                if (friendsOut >= 0) {
                    const fo = clock - friendsOut
                    fWave = Math.min(1, fo / 0.2)
                    const hop = (d: number) => (d < 0 ? 0 : FRIEND_FROM * 1.4 * d * d)
                    fL += hop(fo - 1.0)
                    fR += hop(fo - 1.12)
                    if (fo > 2.4) { friendsIn = -1; friendsOut = -1; fOn = 0 }
                }
            }
            const fw = Math.sin(clock * 13)
            g.uniform4f(uni.uFriends, fOn, fL, fR, fWave)
            g.uniform3f(uni.uFriendPos, FRIEND_X, FRIEND_Z, FRIEND_S)
            g.uniform4f(uni.uFArms, 2.0 + 0.35 * fw, 0, 2.0 - 0.35 * fw, 0)
            g.uniform1f(uni.uGiftOpen, openAt >= 0 ? 1 : 0)
            g.uniform4f(uni.uLid, lidX, lidY, lidT, Math.max(0, lidS))
            const hk = Math.max(0, Math.min(1, heartS.x))
            g.uniform2f(uni.uHeart, hk, 1 + 0.08 * Math.sin(clock * 5.5) * hk)
            const rel = (c: [number, number, number]): [number, number, number] =>
                [lin(c[0]) / CLAY_LIN[0], lin(c[1]) / CLAY_LIN[1], lin(c[2]) / CLAY_LIN[2]]
            const o = p.outfit
            g.uniform3fv(uni.uTux, rel(toRGB(o.tux, DEFAULT_OUTFIT.tux)))
            g.uniform3fv(uni.uLapel, rel(toRGB(o.lapel, DEFAULT_OUTFIT.lapel)))
            g.uniform3fv(uni.uShirt, rel(toRGB(o.shirt, DEFAULT_OUTFIT.shirt)))
            g.uniform3fv(uni.uShoe, rel(toRGB(o.shoe, DEFAULT_OUTFIT.shoe)))
            g.uniform3fv(uni.uPocket, rel(toRGB(o.pocket, DEFAULT_OUTFIT.pocket)))
            g.uniform3fv(uni.uWrap, rel(toRGB(o.wrap, DEFAULT_OUTFIT.wrap)))
            g.uniform3fv(uni.uGold, rel(toRGB(o.gold, DEFAULT_OUTFIT.gold)))
            g.uniform3fv(uni.uHeartCol, toRGB(o.heart, DEFAULT_OUTFIT.heart))
            g.uniform3fv(uni.uDressA, rel(toRGB(o.dressA, DEFAULT_OUTFIT.dressA)))
            g.uniform3fv(uni.uClayA, rel(toRGB(o.clayA, DEFAULT_OUTFIT.clayA)))
            g.uniform3fv(uni.uBowA, rel(toRGB(o.bowA, DEFAULT_OUTFIT.bowA)))
            g.uniform3fv(uni.uDressB, rel(toRGB(o.dressB, DEFAULT_OUTFIT.dressB)))
            g.uniform3fv(uni.uClayB, rel(toRGB(o.clayB, DEFAULT_OUTFIT.clayB)))
            g.uniform3fv(uni.uBowB, rel(toRGB(o.bowB, DEFAULT_OUTFIT.bowB)))

            let query: WebGLQuery | null = null
            if (timerExt && queries.length < 4) {
                query = g.createQuery()
                if (query) g.beginQuery(timerExt.TIME_ELAPSED_EXT, query)
            }
            g.drawArrays(g.TRIANGLES, 0, 3)
            if (query && timerExt) {
                g.endQuery(timerExt.TIME_ELAPSED_EXT)
                queries.push({ q: query, level })
            }
            drawn++
        }

        function pollTimer(): number {
            if (!gl || !timerExt || !queries.length) return -1
            const head = queries[0]
            if (!gl.getQueryParameter(head.q, gl.QUERY_RESULT_AVAILABLE)) return -1
            const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT)
            const ns = gl.getQueryParameter(head.q, gl.QUERY_RESULT) as number
            gl.deleteQuery(head.q)
            queries.shift()
            if (disjoint || head.level !== level) return -1
            return ns / 1e6
        }

        function judge(frameMs: number, interval: number, dt: number) {
            if (drawn < 30) return
            const now = clock
            const budget = Math.min(interval, 16.7)
            const g = pollTimer()
            if (g >= 0) gpuEma = gpuEma ? gpuEma * 0.85 + g * 0.15 : g
            lateEma = lateEma * 0.85 + (frameMs / interval) * 0.15
            const slow = timerExt && gpuEma > 0 ? gpuEma > 0.9 * budget : lateEma > 1.3
            const good = timerExt && gpuEma > 0 ? gpuEma < 0.5 * budget : lateEma < 1.08
            if (slow) {
                slowFor += dt
                goodFor = 0
            } else if (good) {
                goodFor += dt
                slowFor = 0
            } else {
                slowFor = 0
                goodFor = 0
            }
            if (slowFor > 0.5 && level < LEVELS.length - 1) {
                if (climbedAt >= 0 && now - climbedAt < 3) banUntil[level] = now + 30
                level++
                climbedAt = -1
                slowFor = 0
                needResize = true
                gpuEma = 0
            } else if (goodFor > 4 && level > 0 && now > banUntil[level - 1]) {
                level--
                climbedAt = now
                goodFor = 0
                needResize = true
                gpuEma = 0
            }
        }

        function wake() {
            if (!dirty) ticksSince = every
            dirty = true
        }
        wakeRef.current = wake

        function loop(now: number) {
            if (disposed) return
            raf = requestAnimationFrame(loop)
            const tickGap = lastTick ? now - lastTick : 16.7
            lastTick = now
            if (!onScreen || !pageVisible) {
                lastDraw = 0
                return
            }
            if (tickGap > 2 && tickGap < 100) {
                gaps[gapN % 15] = tickGap
                gapN++
            }
            const n = Math.min(gapN, 15)
            let period = 16.7
            if (n >= 5) {
                for (let i = 0; i < n; i++) sortBuf[i] = gaps[i]
                const sub = sortBuf.subarray(0, n).sort()
                period = sub[n >> 1]
            }
            const x = 16.7 / period
            if (x < every - 0.1 || x >= every + 1.1) every = Math.max(1, Math.floor(x + 0.1))
            const gpuTicks = gpuEma > 0 ? Math.ceil((gpuEma * 1.1) / period) : 1
            const pace = Math.max(every, gpuTicks)
            ticksSince++

            const p = propsRef.current
            const dt = Math.min(tickGap / 1000, 0.05)
            clock += dt
            const rm = reduceMotion

            if (dropAt < 0 && !dropDone) {
                if (p.animate && !rm) {
                    dropAt = clock + Math.max(0, p.delay)
                    greet = true
                } else dropDone = true
            }
            if (greet && dropDone) {
                greet = false
                startWave(ptrSeen ? ptrFloorX - walkX : 1)
            }

            if (p.entrance === "drop" && p.playKey !== lastPlay) {
                dropAt = clock + (lastPlay === null ? Math.max(0, p.delay) : 0.3)
                dropDone = false
                lastPlay = p.playKey
                heartS.x = 0
                heartS.v = 0
                goneAt = -1
                danceAt = -1
                danceAmt = 0
                laughAt = -1
                friendsIn = -1
                friendsOut = -1
                hopAt = -1
                winkAt = -1
                waveAt = -1
                dirty = true
            }
            if (p.entrance === "walk" && p.playKey !== lastPlay) {
                approachAt = clock + (lastPlay === null ? Math.max(0, p.delay) : 0.35)
                lastPlay = p.playKey
                walkZ = -APPROACH_FROM
                approachV = 0
                waveAt = -1
                winkAt = -1
                waveDue = -1
                dirty = true
            }
            if (p.friends && !friendsWas) { friendsIn = clock; friendsOut = -1 }
            if (!p.friends && friendsWas && friendsIn >= 0) friendsOut = clock
            friendsWas = p.friends
            if (p.giftGone && !goneWas) goneAt = clock
            if (!p.giftGone) goneAt = -1
            goneWas = p.giftGone
            if (p.dancing && danceAt < 0) danceAt = clock
            if (!p.dancing && danceAmt < 0.01) danceAt = -1
            if (p.laughKey !== lastLaugh) {
                if (lastLaugh !== null) laughAt = clock
                lastLaugh = p.laughKey
            }
            if (p.giftOpen && !openWas) openAt = clock
            if (!p.giftOpen) openAt = -1
            openWas = p.giftOpen
            if (p.winkKey !== lastWinkKey) {
                if (lastWinkKey !== null) winkAt = clock
                lastWinkKey = p.winkKey
            }
            if (waveDue >= 0 && clock >= waveDue) {
                waveDue = -1
                startWave(1)
            }

            const active =
                p.resp.track === "frame" ? ptrInFrame || clock < touchUntil : ptrInPage || clock < touchUntil
            if ((ptrNew || scrolled) && ptrSeen) {
                const r = measureShown()
                if (r.width > 0 && r.height > 0) {
                    ptrU = (ptrX - r.left) / r.width
                    ptrV = (ptrY - r.top) / r.height
                }
                ptrNew = false
                scrolled = false
            }
            if (approachAt >= 0) {
                setAim(0, 0.04)
            } else if (active && ptrSeen) {
                aimAt(ptrU, ptrV)
                nextGlance = clock + 2.5
                if (p.pointerWave && !wasActive && clock - lastActive > 3 && dropDone) startWave(ptrFloorX - walkX)
                lastActive = clock
            } else if (p.glance > 0 && !rm) {
                if (clock >= nextGlance) {
                    const home = rand() < 0.3
                    glanceYaw = home ? 0 : (rand() * 2 - 1) * 0.5
                    glancePitch = home ? 0 : (rand() * 1.1 - 0.4) * 0.3
                    nextGlance = clock + (1.4 + rand() * 2.6) * (10 / (4 + p.glance * 1.2))
                }
                setAim(glanceYaw, glancePitch)
            } else {
                setAim(0, 0)
            }

            wasActive = active && ptrSeen

            if (p.walk && !rm && dropDone) {
                walkRange(range)
                let want = walkGoal
                if (active && ptrSeen) want = ptrFloorX
                else if (clock - lastActive > 4) want = 0
                want = Math.min(range[1], Math.max(range[0], want))
                const walking = Math.abs(walkV) > 0.05
                if (waveAt >= 0) walkGoal = walkX
                else if (walking || Math.abs(want - walkX) > WALK_START) walkGoal = want
            } else {
                walkGoal = 0
                if (!p.walk || rm) {
                    walkX = 0
                    walkV = 0
                    walkAmt = 0
                }
            }
            const faceT = tYaw * BODY_SHARE + Math.sign(walkV) * WALK_TURN * walkAmt

            if (p.blink && !rm) {
                if (blinkAt < 0 && clock >= nextBlink) {
                    blinkAt = clock
                    nextBlink = clock + (rand() < 0.2 ? 0.28 : 2.2 + rand() * 3.6)
                }
            } else {
                blinkAt = -1
            }

            // Scanner: a calm sweep every few seconds; quick repeating
            // sweeps while alert. Reduced motion keeps only the flash.
            const alertOn = !!p.alert
            if (alertOn && !alertWas && p.scanner && !rm) {
                scanAt = clock
                scanDur = SCAN_FAST
            }
            alertWas = alertOn
            if (p.scanner && !rm && dropDone) {
                if (scanAt >= 0 && clock - scanAt > scanDur) {
                    if (alertOn) {
                        scanAt = clock
                        scanDur = SCAN_FAST
                    } else {
                        scanAt = -1
                        nextScan = clock + Math.max(0.5, p.scanEvery) * (0.7 + 0.6 * rand())
                    }
                }
                if (scanAt < 0 && clock >= nextScan) {
                    scanAt = clock
                    scanDur = SCAN_S
                }
            } else {
                scanAt = -1
            }
            const flashT = alertOn ? 1 : 0

            const busy =
                dirty ||
                springBusy(yaw, tYaw) ||
                springBusy(pitch, tPitch) ||
                springBusy(bodyYaw, faceT) ||
                Math.abs(walkGoal - walkX) > 1e-3 ||
                Math.abs(walkV) > 1e-3 ||
                walkAmt > 1e-3 ||
                waveAt >= 0 ||
                springBusy(eyeX, tEyeX) ||
                springBusy(eyeY, tEyeY) ||
                springBusy(flash, flashT) ||
                approachAt >= 0 ||
                winkAt >= 0 ||
                (openAt >= 0 && clock - openAt < 1.0) ||
                springBusy(heartS, p.heart ? 1 : 0) ||
                p.dancing || danceAmt > 0.001 ||
                laughAt >= 0 ||
                friendsIn >= 0 ||
                (goneAt >= 0 && clock - goneAt < 0.4) ||
                heartS.x > 0.01 ||
                waveDue >= 0 ||
                scanAt >= 0 ||
                hopAt >= 0 ||
                joyAt >= 0 ||
                blinkAt >= 0 ||
                (dropAt >= 0 && !dropDone)

            if (!busy) {
                wasBusy = false
                lastDraw = 0
                return
            }
            if (ticksSince < pace && wasBusy) return
            ticksSince = 0

            const sdt = lastDraw ? Math.min((now - lastDraw) / 1000, 0.05) : 1 / 60
            const T = 0.5 - (p.resp.followSpeed / 10) * 0.42
            if (rm) {
                yaw.x = tYaw; pitch.x = tPitch; bodyYaw.x = faceT
                eyeX.x = tEyeX; eyeY.x = tEyeY; flash.x = flashT; heartS.x = p.heart ? 1 : 0
                yaw.v = pitch.v = bodyYaw.v = eyeX.v = eyeY.v = flash.v = 0
            } else {
                stepSpring(yaw, tYaw, T, sdt)
                stepSpring(pitch, tPitch, T, sdt)
                stepSpring(bodyYaw, faceT, T * 1.7, sdt)
                stepSpring(eyeX, tEyeX, T * 0.45, sdt)
                stepSpring(eyeY, tEyeY, T * 0.45, sdt)
                stepSpring(flash, flashT, 0.22, sdt)
                stepSpring(heartS, p.heart ? 1 : 0, 0.35, sdt)
                danceAmt += ((p.dancing ? 1 : 0) - danceAmt) * Math.min(1, sdt * 5)
                if (!p.dancing && danceAmt < 0.002) danceAmt = 0
            }

            // Entrance: ease out of a brisk walk; the gait follows the
            // distance covered (capped, so far off it doesn't scurry).
            approachV = 0
            if (approachAt >= 0) {
                const u = (clock - approachAt) / APPROACH_S
                if (u >= 1) {
                    walkZ = 0
                    approachAt = -1
                    winkAt = clock + 0.15
                    waveDue = clock + 1.0
                    try { arriveRef.current?.() } catch {}
                } else if (u >= 0) {
                    const z = -APPROACH_FROM * Math.pow(1 - u, 1.7)
                    approachV = sdt > 0 ? (z - walkZ) / sdt : 0
                    walkZ = z
                    gait += Math.min((Math.abs(approachV) * Math.PI) / STRIDE, 15) * sdt
                }
            }

            {
                const vmax = 0.6 + p.walkSpeed * 0.25
                let left = sdt
                while (left > 0) {
                    const h = Math.min(left, 0.004)
                    const err = walkGoal - walkX
                    const vd = Math.max(-vmax, Math.min(vmax, err * 2.5))
                    walkV += (vd - walkV) * Math.min(1, h * 6)
                    walkX += walkV * h
                    gait += (Math.abs(walkV) * h * Math.PI) / STRIDE
                    const amt = Math.min(1, Math.max(Math.abs(walkV), Math.abs(approachV) * 0.6) / 0.35)
                    walkAmt += (amt - walkAmt) * Math.min(1, h * 8)
                    left -= h
                }
                if (Math.abs(walkGoal - walkX) < 0.01 && Math.abs(walkV) < 0.01 && approachV === 0 && walkAmt < 0.01) {
                    walkX = walkGoal
                    walkV = 0
                    walkAmt = 0
                }
                gait %= Math.PI * 2
            }

            if (++rectCheck >= 30) {
                rectCheck = 0
                measureShown()
            }
            draw()
            dirty = false
            const interval = pace * period
            if (lastDraw && wasBusy) judge(now - lastDraw, interval, sdt)
            lastDraw = now
            wasBusy = true
        }

        if (!init()) {
            setFailed(true)
            return
        }

        const ro =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver((entries) => {
                      const e = entries[0]
                      if (!e) return
                      layoutW = Math.max(1, e.contentRect.width)
                      layoutH = Math.max(1, e.contentRect.height)
                      measureShown()
                      needResize = true
                      wake()
                  })
                : null
        if (ro) ro.observe(host)
        layoutW = Math.max(1, host.clientWidth)
        layoutH = Math.max(1, host.clientHeight)

        const io =
            typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(
                      (entries) => {
                          const e = entries[entries.length - 1]
                          onScreen = e.isIntersecting
                          if (onScreen) wake()
                      },
                      { rootMargin: "64px" }
                  )
                : null
        if (io) io.observe(host)

        const onVisibility = () => {
            pageVisible = document.visibilityState !== "hidden"
            if (pageVisible) wake()
        }
        document.addEventListener("visibilitychange", onVisibility)

        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        reduceMotion = mq.matches
        const onMQ = (ev: MediaQueryListEvent) => {
            reduceMotion = ev.matches
            wake()
        }
        mq.addEventListener("change", onMQ)

        const record = (e: PointerEvent) => {
            if (e.clientX === ptrX && e.clientY === ptrY && ptrSeen) return
            ptrX = e.clientX
            ptrY = e.clientY
            ptrSeen = true
            ptrNew = true
            if (e.pointerType === "touch") touchUntil = clock + 1.5
        }
        const onWinMove = (e: PointerEvent) => {
            ptrInPage = true
            record(e)
        }
        const onDocLeave = (e: MouseEvent) => {
            if (!e.relatedTarget) ptrInPage = false
        }
        const onBlur = () => {
            ptrInPage = false
            ptrInFrame = false
        }
        const onEnter = (e: PointerEvent) => {
            ptrInFrame = true
            record(e)
        }
        const onLeave = () => {
            ptrInFrame = false
        }
        const onDown = (e: PointerEvent) => {
            ptrInFrame = true
            ptrInPage = true
            record(e)
            if (e.pointerType === "touch") touchUntil = clock + 1.5
            const p = propsRef.current
            if (dropAt >= 0 && !dropDone) return
            if (approachAt >= 0) return
            if (p.tapWink) {
                winkAt = clock
                wake()
            }
            if (reduceMotion || p.resp.hop <= 0) return
            const h = hopAt >= 0 ? clock - hopAt : 1e9
            if (h > HOP_CROUCH + HOP_AIR) hopAt = clock
        }
        const onScroll = () => {
            scrolled = true
        }
        window.addEventListener("pointermove", onWinMove, { passive: true })
        document.addEventListener("mouseout", onDocLeave)
        window.addEventListener("blur", onBlur)
        window.addEventListener("scroll", onScroll, { passive: true, capture: true })
        host.addEventListener("pointerenter", onEnter)
        host.addEventListener("pointerleave", onLeave)
        host.addEventListener("pointerdown", onDown)

        const onLost = (ev: Event) => {
            ev.preventDefault()
            cancelAnimationFrame(raf)
            gl = null
            program = null
        }
        const onRestored = () => {
            if (disposed) return
            lastTick = 0
            lastDraw = 0
            if (init()) raf = requestAnimationFrame(loop)
            else setFailed(true)
        }
        canvas.addEventListener("webglcontextlost", onLost)
        canvas.addEventListener("webglcontextrestored", onRestored)

        raf = requestAnimationFrame(loop)

        return () => {
            disposed = true
            wakeRef.current = () => {}
            cancelAnimationFrame(raf)
            if (ro) ro.disconnect()
            if (io) io.disconnect()
            document.removeEventListener("visibilitychange", onVisibility)
            mq.removeEventListener("change", onMQ)
            window.removeEventListener("pointermove", onWinMove)
            document.removeEventListener("mouseout", onDocLeave)
            window.removeEventListener("blur", onBlur)
            window.removeEventListener("scroll", onScroll, { capture: true })
            host.removeEventListener("pointerenter", onEnter)
            host.removeEventListener("pointerleave", onLeave)
            host.removeEventListener("pointerdown", onDown)
            canvas.removeEventListener("webglcontextlost", onLost)
            canvas.removeEventListener("webglcontextrestored", onRestored)
            if (gl) {
                for (const q of queries) gl.deleteQuery(q.q)
                if (buffer) gl.deleteBuffer(buffer)
                if (vao) gl.deleteVertexArray(vao)
                if (program) gl.deleteProgram(program)
            }
        }
    }, [])

    let bgCss = "transparent"
    if (!transparent) {
        const curve = adv.gradientCurve
        const stops = [0, 0.25, 0.5, 0.75, 1]
            .map((v) => {
                const a = toRGB(bgc.top, DEFAULT_BACKGROUND.top)
                const b = toRGB(bgc.bottom, DEFAULT_BACKGROUND.bottom)
                const f = 1 - Math.pow(1 - v, curve)
                const c = a.map((x, i) => Math.round((x + (b[i] - x) * f) * 255))
                return `rgb(${c[0]},${c[1]},${c[2]}) ${v * 100}%`
            })
            .join(", ")
        bgCss = `linear-gradient(180deg, ${stops})`
    }

    return (
        <div
            ref={hostRef}
            className={className}
            role="img"
            aria-label="A clay robot in a tuxedo holding a birthday gift"
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                aspectRatio: `${REF_W} / ${REF_H}`,
                overflow: "hidden",
                background: bgCss,
                touchAction: "pan-y",
                cursor: resp.hop > 0 ? "pointer" : "default",
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
                ...style,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: failed ? "none" : "block",
                }}
            />
        </div>
    )
}
