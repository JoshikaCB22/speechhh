/**
 * Records audio and returns a WAV blob.
 * Uses MediaRecorder with proper chunk collection + WAV re-encoding via Web Audio API.
 */

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  });

  // Pick best supported mime type
  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', '']
    .find(t => !t || MediaRecorder.isTypeSupported(t));

  const options = mimeType ? { mimeType } : {};
  const mr = new MediaRecorder(stream, options);
  const chunks = [];

  mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  mr.start(100);

  const stop = () => new Promise(resolve => {
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });

      // Re-encode to WAV via Web Audio API for reliable Whisper input
      try {
        const arrayBuf = await blob.arrayBuffer();
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const decoded = await audioCtx.decodeAudioData(arrayBuf);
        audioCtx.close();

        // Resample to 16kHz mono
        const TARGET_SR = 16000;
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_SR), TARGET_SR);
        const src = offlineCtx.createBufferSource();
        src.buffer = decoded;
        src.connect(offlineCtx.destination);
        src.start(0);
        const rendered = await offlineCtx.startRendering();
        const pcm = rendered.getChannelData(0);
        const wavBlob = pcmToWav(pcm, TARGET_SR);
        console.log(`WAV encoded: ${wavBlob.size} bytes, duration=${decoded.duration.toFixed(2)}s`);
        resolve(wavBlob);
      } catch (e) {
        console.warn('WAV re-encode failed, sending raw blob:', e);
        resolve(blob);
      }
    };
    mr.stop();
  });

  return { stop };
}

function pcmToWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const write = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };

  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    off += 2;
  }
  return new Blob([buf], { type: 'audio/wav' });
}
