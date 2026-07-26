import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 22050;
const OUTPUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/assets/audio");
let randomState = 7819301;

function random() {
  randomState = (randomState * 16807) % 2147483647;
  return (randomState - 1) / 2147483646;
}

function envelope(time, duration, attack = 0.01, release = 0.2) {
  const fadeIn = Math.min(1, time / attack);
  const fadeOut = Math.min(1, (duration - time) / release);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

function normalize(samples, peak = 0.82) {
  let maximum = 0;
  for (const sample of samples) maximum = Math.max(maximum, Math.abs(sample));
  if (maximum === 0) return samples;
  const scale = peak / maximum;
  return samples.map((sample) => sample * scale);
}

function makeSamples(duration, generator) {
  const length = Math.floor(duration * SAMPLE_RATE);
  const samples = new Float64Array(length);
  for (let index = 0; index < length; index += 1) {
    samples[index] = generator(index / SAMPLE_RATE, index, length);
  }
  return normalize(samples);
}

function encodeWav(samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
}

function loopFade(samples, seconds = 0.35) {
  const count = Math.min(Math.floor(seconds * SAMPLE_RATE), Math.floor(samples.length / 2));
  for (let index = 0; index < count; index += 1) {
    const mix = index / count;
    const start = samples[index];
    const end = samples[samples.length - count + index];
    const blended = start * mix + end * (1 - mix);
    samples[index] = blended;
    samples[samples.length - count + index] = blended;
  }
  return samples;
}

function villageAmbience() {
  let brown = 0;
  const samples = makeSamples(10, (time) => {
    brown = brown * 0.988 + (random() * 2 - 1) * 0.012;
    const breeze = 0.55 + Math.sin(time * Math.PI * 0.22) * 0.2;
    const distantHum = Math.sin(Math.PI * 2 * 46 * time) * 0.02;
    return brown * breeze * 0.72 + distantHum;
  });
  return loopFade(samples);
}

function birdAmbience() {
  const chirps = [
    [0.75, 0.42, 1650, 2480],
    [2.65, 0.32, 2050, 2900],
    [4.7, 0.46, 1500, 2350],
    [7.25, 0.35, 2200, 3050],
    [8.7, 0.38, 1800, 2700],
  ];
  const samples = makeSamples(10, (time) => {
    let value = 0;
    for (const [start, duration, from, to] of chirps) {
      const local = time - start;
      if (local < 0 || local > duration) continue;
      const progress = local / duration;
      const frequency = from + (to - from) * progress + Math.sin(local * 55) * 95;
      const env = Math.sin(Math.PI * progress) ** 1.7;
      value += Math.sin(Math.PI * 2 * frequency * local) * env * 0.48;
      value += Math.sin(Math.PI * 4 * frequency * local) * env * 0.08;
    }
    return value;
  });
  return loopFade(samples, 0.12);
}

function hoofStep() {
  return makeSamples(0.24, (time) => {
    const decay = Math.exp(-time * 19);
    const thump = Math.sin(Math.PI * 2 * 82 * time) * decay * 0.8;
    const dirt = (random() * 2 - 1) * Math.exp(-time * 28) * 0.35;
    return (thump + dirt) * envelope(time, 0.24, 0.004, 0.08);
  });
}

function bullBell() {
  return makeSamples(1.35, (time) => {
    const decay = Math.exp(-time * 3.2);
    const strike = Math.exp(-time * 35) * (random() * 2 - 1) * 0.35;
    return (
      Math.sin(Math.PI * 2 * 620 * time) * 0.42
      + Math.sin(Math.PI * 2 * 927 * time) * 0.3
      + Math.sin(Math.PI * 2 * 1285 * time) * 0.2
      + Math.sin(Math.PI * 2 * 1760 * time) * 0.1
    ) * decay + strike;
  });
}

function cartWheels() {
  let brown = 0;
  const samples = makeSamples(4, (time) => {
    brown = brown * 0.96 + (random() * 2 - 1) * 0.04;
    const rotation = Math.max(0, Math.sin(Math.PI * 2 * 2.2 * time)) ** 12;
    const axle = Math.sin(Math.PI * 2 * 63 * time) * 0.08;
    return brown * 0.2 + rotation * (0.23 + axle);
  });
  return loopFade(samples, 0.25);
}

function cartCreak() {
  return makeSamples(1.2, (time) => {
    const progress = time / 1.2;
    const frequency = 360 - progress * 190 + Math.sin(time * 19) * 28;
    const creak = Math.sin(Math.PI * 2 * frequency * time + Math.sin(time * 14) * 1.8);
    const woodEnvelope = Math.sin(Math.PI * progress) ** 1.4;
    const knockOne = Math.exp(-Math.abs(time - 0.12) * 55) * Math.sin(Math.PI * 2 * 105 * time);
    const knockTwo = Math.exp(-Math.abs(time - 0.92) * 48) * Math.sin(Math.PI * 2 * 82 * time);
    return creak * woodEnvelope * 0.48 + knockOne * 0.3 + knockTwo * 0.24;
  });
}

const assets = {
  "village-ambience.wav": villageAmbience(),
  "birds.wav": birdAmbience(),
  "bull-hoof.wav": hoofStep(),
  "bull-bell.wav": bullBell(),
  "cart-wheels.wav": cartWheels(),
  "cart-creak.wav": cartCreak(),
};

await mkdir(OUTPUT_DIR, { recursive: true });
for (const [filename, samples] of Object.entries(assets)) {
  await writeFile(resolve(OUTPUT_DIR, filename), encodeWav(samples));
  console.log(`Generated ${filename}`);
}
