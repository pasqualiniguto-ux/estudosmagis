import { useRef, useState, useCallback, useEffect } from 'react';

export type AmbientSoundType = 'none' | 'white' | 'brown' | 'pink' | 'rain';

const SOUND_LABELS: Record<AmbientSoundType, string> = {
  none: 'Sem som',
  white: 'Ruído branco',
  brown: 'Ruído marrom',
  pink: 'Ruído rosa',
  rain: 'Chuva',
};

export { SOUND_LABELS };

export function useAmbientSound() {
  const [activeSound, setActiveSound] = useState<AmbientSoundType>('none');
  const [volume, setVolume] = useState(0.3);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | AudioNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const stop = useCallback(() => {
    try {
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      gainRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
  }, []);

  const play = useCallback((type: AmbientSoundType) => {
    stop();
    if (type === 'none') {
      setActiveSound('none');
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;
    gain.connect(ctx.destination);

    const bufferSize = 4096;

    if (type === 'white') {
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      processor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      };
      processor.connect(gain);
      processorRef.current = processor;
      sourceRef.current = processor;
    } else if (type === 'brown') {
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      let lastOut = 0;
      processor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          output[i] = lastOut * 3.5;
        }
      };
      processor.connect(gain);
      processorRef.current = processor;
      sourceRef.current = processor;
    } else if (type === 'pink') {
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      processor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      };
      processor.connect(gain);
      processorRef.current = processor;
      sourceRef.current = processor;
    } else if (type === 'rain') {
      // Rain = filtered noise with gentle modulation
      const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
      let lastOut = 0;
      let modPhase = 0;
      processor.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < output.length; i++) {
          const white = Math.random() * 2 - 1;
          // Brown-ish base
          lastOut = (lastOut + 0.03 * white) / 1.03;
          // Subtle amplitude modulation for rain patter
          modPhase += 0.0001;
          const mod = 0.7 + 0.3 * Math.sin(modPhase * 6.28 * 0.2) * Math.sin(modPhase * 6.28 * 1.7);
          // Add some crackle
          const crackle = Math.random() > 0.997 ? (Math.random() * 0.3) : 0;
          output[i] = (lastOut * 3.0 * mod + crackle);
        }
      };
      processor.connect(gain);
      processorRef.current = processor;
      sourceRef.current = processor;
    }

    setActiveSound(type);
  }, [stop, volume]);

  // Update volume in real-time
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { activeSound, play, stop, volume, setVolume };
}
