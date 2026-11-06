const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

/**
 * Safe FFmpeg helpers. All commands run through execFile with argument arrays
 * (never a shell), and user/AI-provided text reaches FFmpeg only via text files
 * read by drawtext with expansion disabled.
 */
const run = (bin, args, timeoutMs = 10 * 60 * 1000) => new Promise((resolve, reject) => {
  execFile(bin, args, { timeout: timeoutMs, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      err.message = `${bin} failed: ${String(stderr || err.message).split('\n').slice(-6).join(' ')}`;
      return reject(err);
    }
    resolve({ stdout, stderr });
  });
});

let ffmpegChecked = null;
const ffmpegAvailable = async () => {
  if (ffmpegChecked !== null) return ffmpegChecked;
  try {
    await run('ffmpeg', ['-version'], 10000);
    await run('ffprobe', ['-version'], 10000);
    ffmpegChecked = true;
  } catch (e) {
    ffmpegChecked = false;
  }
  return ffmpegChecked;
};

const probeDuration = async (file) => {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], 60000);
  const d = parseFloat(String(stdout).trim());
  if (!Number.isFinite(d)) throw new Error('Could not read video duration');
  return d;
};

const makeTempDir = () => fsp.mkdtemp(path.join(os.tmpdir(), 'rr-'));

/** Transcodes any input video to web-friendly H.264/AAC MP4, max 720x1280, with fast start. */
const transcodeToMp4 = async (input, output) => {
  await run('ffmpeg', [
    '-y', '-i', input,
    '-vf', 'scale=w=720:h=1280:force_original_aspect_ratio=decrease:force_divisible_by=2',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-movflags', '+faststart', output
  ]);
};

const extractThumbnail = async (input, output, atSeconds = 1) => {
  await run('ffmpeg', ['-y', '-ss', String(atSeconds), '-i', input, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', output], 120000);
};

const FONT_CANDIDATES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf'
];
const fontFile = () => FONT_CANDIDATES.find((f) => fs.existsSync(f)) || null;

const wrap = (text, maxChars) => {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length <= maxChars) line = (line + ' ' + w).trim();
    else { if (line) lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.join('\n');
};

const BG = {
  'indigo-dark': '0x1E1B4B', 'slate-gradient': '0x0F172A', 'emerald-glow': '0x064E3B',
  'crimson-deep': '0x450A0A', 'violet-pulsar': '0x2E1065'
};

/** Escapes a filesystem path for use inside an FFmpeg filter option value. */
const filterPath = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");

/**
 * Renders one 720x1280 scene clip with title + caption text and the given audio (or silence).
 */
const renderScene = async ({ scene, audioPath, durationSeconds, workDir, index }) => {
  const titleFile = path.join(workDir, `title_${index}.txt`);
  const bodyFile = path.join(workDir, `body_${index}.txt`);
  await fsp.writeFile(titleFile, wrap(scene.title, 22));
  await fsp.writeFile(bodyFile, wrap(scene.dialogue, 30));
  const font = fontFile();
  const fontOpt = font ? `:fontfile='${filterPath(font)}'` : '';
  const color = BG[scene.backgroundStyle] || BG['indigo-dark'];

  const vf = [
    `drawtext=textfile='${filterPath(titleFile)}':expansion=none${fontOpt}:fontcolor=white:fontsize=52:line_spacing=12:x=(w-text_w)/2:y=(h-text_h)/2.6`,
    `drawtext=textfile='${filterPath(bodyFile)}':expansion=none${fontOpt}:fontcolor=0xE0E7FF:fontsize=30:line_spacing=14:x=(w-text_w)/2:y=h*0.68`
  ].join(',');

  const out = path.join(workDir, `scene_${index}.mp4`);
  const args = ['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=720x1280:r=30:d=${durationSeconds}`];
  if (audioPath) args.push('-i', audioPath);
  else args.push('-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=44100:d=${durationSeconds}`);
  args.push('-vf', vf, '-map', '0:v', '-map', '1:a', '-t', String(durationSeconds),
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '44100', '-ac', '2', out);
  await run('ffmpeg', args);
  return out;
};

const concatClips = async (clips, output, workDir) => {
  const list = path.join(workDir, 'concat.txt');
  await fsp.writeFile(list, clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]);
};

/** Converts raw 16-bit PCM (as returned by Gemini TTS) into an AAC/M4A file. */
const pcmToAudio = async (pcmPath, output, sampleRate = 24000) => {
  await run('ffmpeg', ['-y', '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', pcmPath, '-c:a', 'aac', '-ar', '44100', '-ac', '2', output]);
};

module.exports = {
  ffmpegAvailable, probeDuration, transcodeToMp4, extractThumbnail, renderScene, concatClips, pcmToAudio, makeTempDir, run
};
