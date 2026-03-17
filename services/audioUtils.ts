export async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Gemini returns raw PCM at 24kHz (usually) or the requested rate.
  // The SDK/Model default for Audio output is typically 24000Hz.
  const sampleRate = 24000;
  const numChannels = 1;
  
  // Convert Uint8Array bytes to Float32 for AudioBuffer
  const int16View = new Int16Array(bytes.buffer);
  const float32Data = new Float32Array(int16View.length);
  for (let i = 0; i < int16View.length; i++) {
    float32Data[i] = int16View[i] / 32768.0;
  }

  const buffer = audioContext.createBuffer(numChannels, float32Data.length, sampleRate);
  buffer.copyToChannel(float32Data, 0);
  
  return buffer;
}
