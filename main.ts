// Tiny stack VM (make.fun ISA v1): one run answers all 40 instances in /input.
// Node 22, plain JS (no TS-only syntax), stdlib only, deterministic, no clock/env reads
// beyond the two input/output dir vars the starter defines.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Run one program; returns [stdoutBytes (Uint8Array view), exitCode].
function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cs = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0;
  let ip = 0;
  let pc = 0;
  let st = 0;
  const done = (exit) => [out.slice(0, ol), exit];
  for (;;) {
    if (st === 1000000) return done(10); // step limit
    if (pc < 0 || pc >= n) return done(9); // pc outside program
    const op = p[pc];
    // Immediate length: PUSH8=1, PUSH32=4, JMP/JZ/JNZ/CALL=2, else 0.
    const imm = op === 1 ? 1 : op === 2 ? 4 : op >= 48 && op <= 51 ? 2 : 0;
    if (imm && pc + imm >= n) return done(9); // immediate cut off by end
    st++;
    switch (op) {
      case 0: return done(0); // HALT
      case 1: // PUSH8 (sign-extended)
        if (sp === 256) return done(3);
        D[sp++] = (p[pc + 1] << 24) >> 24; pc += 2; break;
      case 2: // PUSH32 (little-endian)
        if (sp === 256) return done(3);
        D[sp++] = p[pc + 1] | (p[pc + 2] << 8) | (p[pc + 3] << 16) | (p[pc + 4] << 24); pc += 5; break;
      case 3: // POP
        if (sp < 1) return done(2);
        sp--; pc++; break;
      case 4: // DUP
        if (sp < 1) return done(2);
        if (sp === 256) return done(3);
        D[sp] = D[sp - 1]; sp++; pc++; break;
      case 5: { // SWAP
        if (sp < 2) return done(2);
        const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; pc++; break;
      }
      case 6: // OVER
        if (sp < 2) return done(2);
        if (sp === 256) return done(3);
        D[sp] = D[sp - 2]; sp++; pc++; break;
      case 7: { // ROT (a b c -- b c a)
        if (sp < 3) return done(2);
        const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; pc++; break;
      }
      case 23: // NEG
        if (sp < 1) return done(2);
        D[sp - 1] = (-D[sp - 1]) | 0; pc++; break;
      case 27: // NOT
        if (sp < 1) return done(2);
        D[sp - 1] = ~D[sp - 1]; pc++; break;
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        if (sp < 2) return done(2);
        const b = D[sp - 1];
        const a = D[sp - 2];
        let r;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) {
          if (b === 0) return done(4);
          r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        } else if (op === 20) {
          if (b === 0) return done(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 21) {
          if (b === 0) return done(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 22) {
          if (b === 0) return done(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU
        sp -= 2; D[sp++] = r; pc++; break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ
        const rel = ((p[pc + 1] | (p[pc + 2] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 48) {
          if (sp < 1) return done(2);
          const v = D[--sp];
          take = op === 49 ? v === 0 : v !== 0;
        }
        pc = take ? pc + 3 + rel : pc + 3; break;
      }
      case 51: // CALL (unsigned 16-bit target)
        if (cs === 64) return done(7);
        C[cs++] = pc + 3;
        pc = p[pc + 1] | (p[pc + 2] << 8); break;
      case 52: // RET
        if (cs === 0) return done(8);
        pc = C[--cs]; break;
      case 64: { // LOAD
        if (sp < 1) return done(2);
        const addr = D[sp - 1];
        if (addr < 0 || addr > 255) return done(6);
        D[sp - 1] = M[addr]; pc++; break;
      }
      case 65: { // STORE (v addr --)
        if (sp < 2) return done(2);
        const addr = D[sp - 1];
        if (addr < 0 || addr > 255) return done(6);
        M[addr] = D[sp - 2]; sp -= 2; pc++; break;
      }
      case 80: { // PRINT (decimal ASCII, no newline)
        if (sp < 1) return done(2);
        const v = D[sp - 1];
        const neg = v < 0;
        let u = neg ? -v : v;
        let d = u < 10 ? 1 : u < 100 ? 2 : u < 1000 ? 3 : u < 10000 ? 4 : u < 100000 ? 5
          : u < 1000000 ? 6 : u < 10000000 ? 7 : u < 100000000 ? 8 : u < 1000000000 ? 9 : 10;
        if (neg) d++;
        if (ol + d > 65536) return done(11); // writes 0 bytes, keeps prior output
        sp--;
        let i = ol + d;
        do { out[--i] = 48 + (u % 10); u = (u / 10) | 0; } while (u > 0);
        if (neg) out[ol] = 45;
        ol += d; pc++; break;
      }
      case 81: // PUTC
        if (sp < 1) return done(2);
        if (ol + 1 > 65536) return done(11);
        out[ol++] = D[--sp] & 255; pc++; break;
      case 82: // IN (-1 when exhausted)
        if (sp === 256) return done(3);
        D[sp++] = ip < inp.length ? inp[ip++] : -1; pc++; break;
      case 83: // EXIT (low byte)
        if (sp < 1) return done(2);
        return done(D[--sp] & 255);
      default: return done(5); // unknown opcode
    }
  }
}

for (const id of readdirSync(I).sort()) {
  const prog = readFileSync(join(I, id, 'program.bin'));
  const inp = readFileSync(join(I, id, 'input.bin'));
  const [stdout, exit] = run(prog, inp);
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), stdout);
  writeFileSync(join(O, id, 'exit.txt'), String(exit) + '\n');
}
