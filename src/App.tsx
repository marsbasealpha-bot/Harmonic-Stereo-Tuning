import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  RefreshCw,
  Plus, 
  ArrowLeft, 
  Download,
  Volume2,
  Activity,
  Hand,
  X,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

// --- Types ---
interface ChannelState {
  frequency: number;
  volume: number;
  active: boolean;
}

interface AudioChannels {
  left: ChannelState;
  right: ChannelState;
}

// --- Components ---

const Knob = ({ 
  label, 
  value, 
  onChange, 
  type = 'volume', 
  side = 'left',
  min = 0,
  max = 100
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
  type?: 'volume' | 'frequency';
  side?: 'left' | 'right';
  min?: number;
  max?: number;
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastAngleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!knobRef.current) return 0;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI;
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = lastTimeRef.current ? now - lastTimeRef.current : 16;
    lastTimeRef.current = now;

    const angle = calculateAngle(clientX, clientY);
    
    if (lastAngleRef.current !== null) {
      let diff = angle - lastAngleRef.current;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (type === 'volume') {
        const step = diff / 2; // Sensitivity
        const newVal = Math.max(min, Math.min(max, value + step));
        onChange(Math.round(newVal));
      } else {
        // Dynamic sensitivity based on angular velocity
        const angularVelocity = Math.abs(diff) / Math.max(1, dt); // degrees per ms
        
        const logMin = Math.log(5);
        const logMax = Math.log(25000);
        const t = (Math.log(value) - logMin) / (logMax - logMin);
        
        // Base sensitivity
        let p = 0.30 - (0.30 - 0.05) * Math.max(0, Math.min(1, t));
        
        // Apply speed factor: 0.5 deg/ms is a moderate turn
        // Slower turns (<0.5) reduce sensitivity for fine tuning
        // Faster turns (>0.5) increase sensitivity for rapid sweeping
        const speedFactor = Math.max(0.1, Math.min(8, angularVelocity * 2));
        p *= speedFactor;

        // Boost sensitivity for low frequencies (< 100Hz) to reduce revolutions needed
        if (value < 100) {
          const boost = (1 - (value / 100)) * 1.2; 
          p += boost;
        }

        const newVal = value * Math.pow(1 + p, diff / 360);
        onChange(Math.round(Math.max(5, Math.min(25000, newVal))));
      }
    }
    lastAngleRef.current = angle;
  }, [isDragging, value, onChange, type, min, max]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onUp = () => {
      setIsDragging(false);
      lastAngleRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, handleMove]);

  // Visual rotation based on value
  const rotation = type === 'volume' 
    ? (value / max) * 270 - 135 
    : ((Math.log(value) - Math.log(5)) / (Math.log(25000) - Math.log(5))) * 270 - 135;

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        ref={knobRef}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer select-none touch-none group shadow-2xl"
        onMouseDown={(e) => { 
          setIsDragging(true); 
          lastAngleRef.current = calculateAngle(e.clientX, e.clientY);
          lastTimeRef.current = performance.now();
        }}
        onTouchStart={(e) => { 
          setIsDragging(true); 
          lastAngleRef.current = calculateAngle(e.touches[0].clientX, e.touches[0].clientY);
          lastTimeRef.current = performance.now();
        }}
      >
        {/* Inner shadow/depth */}
        <div className="absolute inset-2 rounded-full border border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent" />
        
        <div className={`absolute top-4 data-label ${side === 'left' ? 'text-cyan-400/80' : 'text-red-500/80'}`}>
          {side === 'left' ? 'Left' : 'Right'}
        </div>
        
        <div className="text-white font-bold text-xl sm:text-2xl mt-2 tracking-tighter flex items-baseline">
          {value}<span className="text-[10px] font-serif italic opacity-50 ml-1">{type === 'frequency' ? 'Hz' : '%'}</span>
        </div>

        <motion.div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          animate={{ rotate: rotation }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="knob-indicator -translate-y-[46px] sm:-translate-y-[54px]" />
        </motion.div>
        
        {/* Outer glow on drag */}
        {isDragging && (
          <div className="absolute inset-0 rounded-full border border-[#ff9d00]/30 shadow-[0_0_30px_rgba(255,157,0,0.15)] animate-pulse" />
        )}
      </div>
      <span className="data-label opacity-50">{label}</span>
    </div>
  );
};

export default function App() {
  // --- Refs ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const toneAnalyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const starfieldRef = useRef<HTMLCanvasElement | null>(null);
  
  // Music Nodes
  const musicGainsRef = useRef<{ left: GainNode | null; right: GainNode | null }>({ left: null, right: null });
  
  // Tone Nodes
  const toneMasterGainRef = useRef<GainNode | null>(null);
  const toneChannelsRef = useRef<{ 
    left: { osc: OscillatorNode | null; gain: GainNode | null }; 
    right: { osc: OscillatorNode | null; gain: GainNode | null };
  }>({
    left: { osc: null, gain: null },
    right: { osc: null, gain: null }
  });

  // --- State ---
  const [audioSrc, setAudioSrc] = useState(() => {
    const saved = localStorage.getItem('harmonic_last_src');
    // Sanitize: Blob URLs are not persistent across sessions
    if (saved && saved.startsWith('blob:')) {
      localStorage.removeItem('harmonic_last_src');
      localStorage.removeItem('harmonic_last_name');
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
    }
    return saved || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
  });
  const [fileName, setFileName] = useState(() => {
    return localStorage.getItem('harmonic_last_name') || 'Default: Harmonic Ambient';
  });
  const [isLooping, setIsLooping] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [musicVolume, setMusicVolume] = useState({ left: 50, right: 50 });
  const [toneState, setToneState] = useState<AudioChannels>({
    left: { frequency: 112, volume: 50, active: false },
    right: { frequency: 110, volume: 50, active: false }
  });
  const [toneMasterVolume, setToneMasterVolume] = useState(50);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Detect Standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(isStandaloneMode);
  }, []);

  const currentUrl = process.env.APP_URL || window.location.origin;
  const installUrl = `${currentUrl}${currentUrl.endsWith('/') ? '' : '/'}?install=true`;

  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isTonePlaying, setIsTonePlaying] = useState(false);

  useEffect(() => {
    // Autosave song info (only if it's a persistent URL, not a blob)
    if (audioSrc && !audioSrc.startsWith('blob:')) {
      localStorage.setItem('harmonic_last_src', audioSrc);
      localStorage.setItem('harmonic_last_name', fileName);
    }
  }, [audioSrc, fileName]);

  // --- Audio Logic ---
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Music Routing
    const musicSplitter = ctx.createChannelSplitter(2);
    const musicMerger = ctx.createChannelMerger(2);
    const musicLeftGain = ctx.createGain();
    const musicRightGain = ctx.createGain();
    musicGainsRef.current = { left: musicLeftGain, right: musicRightGain };

    if (audioElementRef.current) {
      const source = ctx.createMediaElementSource(audioElementRef.current);
      
      // If mono, connect to both gain nodes. If stereo, use splitter.
      // We check channelCount which is set by the audio element.
      if (audioElementRef.current.mozChannels === 1 || source.channelCount === 1) {
        source.connect(musicLeftGain);
        source.connect(musicRightGain);
      } else {
        source.connect(musicSplitter);
        musicSplitter.connect(musicLeftGain, 0);
        musicSplitter.connect(musicRightGain, 1);
      }
      
      musicLeftGain.connect(musicMerger, 0, 0);
      musicRightGain.connect(musicMerger, 0, 1);

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      musicMerger.connect(analyser);
      musicMerger.connect(ctx.destination);
    }

    // Tone Routing
    const toneMasterGain = ctx.createGain();
    toneMasterGainRef.current = toneMasterGain;
    
    const toneAnalyser = ctx.createAnalyser();
    toneAnalyser.fftSize = 1024; // Higher resolution for tone wave
    toneAnalyserRef.current = toneAnalyser;
    
    toneMasterGain.connect(toneAnalyser);
    toneAnalyser.connect(ctx.destination);
    toneMasterGain.gain.setValueAtTime(toneMasterVolume / 100, ctx.currentTime);

    ['left', 'right'].forEach((side) => {
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      panner.pan.value = side === 'left' ? -1 : 1;
      gain.connect(panner);
      panner.connect(toneMasterGain);
      toneChannelsRef.current[side as 'left' | 'right'].gain = gain;
    });

    drawWaveform();
    drawToneWaveform();
  }, [toneMasterVolume]);

  const drawToneWaveform = () => {
    if (!toneAnalyserRef.current || !toneCanvasRef.current) return;
    const ctx = toneCanvasRef.current.getContext('2d');
    if (!ctx) return;

    const bufferLength = toneAnalyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      requestAnimationFrame(render);
      if (!toneCanvasRef.current || !ctx) return;

      toneAnalyserRef.current!.getByteTimeDomainData(dataArray);
      
      // Check for activity
      const hasActivity = dataArray.some(v => v !== 128);
      setIsTonePlaying(hasActivity);

      // Clear with slight fade
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, toneCanvasRef.current.width, toneCanvasRef.current.height);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#ff9d00'; // Match tone panel accent
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 157, 0, 0.5)';
      ctx.beginPath();

      const sliceWidth = toneCanvasRef.current.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * toneCanvasRef.current.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(toneCanvasRef.current.width, toneCanvasRef.current.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset for performance
    };
    render();
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      requestAnimationFrame(render);
      if (!canvasRef.current || !ctx) return;

      analyserRef.current!.getByteTimeDomainData(dataArray);
      
      // Check for activity
      const hasActivity = dataArray.some(v => v !== 128);
      setIsMusicPlaying(hasActivity);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
      ctx.beginPath();

      const sliceWidth = canvasRef.current.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvasRef.current.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
      ctx.stroke();
    };
    render();
  };

  const toggleTone = (side: 'left' | 'right', play: boolean) => {
    initAudio();
    const ctx = audioCtxRef.current!;
    const ch = toneChannelsRef.current[side];
    const state = toneState[side];

    if (play && !ch.osc) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(state.frequency, ctx.currentTime);
      osc.connect(ch.gain!);
      osc.start();
      ch.osc = osc;
      setToneState(prev => ({ ...prev, [side]: { ...prev[side], active: true } }));
    } else if (!play && ch.osc) {
      ch.osc.stop();
      ch.osc.disconnect();
      ch.osc = null;
      setToneState(prev => ({ ...prev, [side]: { ...prev[side], active: false } }));
    }
  };

  // --- Effects ---
  useEffect(() => {
    // Starfield Animation
    if (!starfieldRef.current) return;
    const canvas = starfieldRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars = Array.from({ length: 400 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * width,
    }));

    const animate = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      stars.forEach(s => {
        s.z -= 0.5;
        if (s.z <= 0) s.z = width;
        const x = (s.x - width / 2) * (width / s.z);
        const y = (s.y - height / 2) * (width / s.z);
        const cx = width / 2 + x;
        const cy = height / 2 + y;
        if (cx > 0 && cx < width && cy > 0 && cy < height) {
          const size = (1 - s.z / width) * 2;
          ctx.fillRect(cx, cy, size, size);
        }
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Sync Music Gains
    if (musicGainsRef.current.left) {
      musicGainsRef.current.left.gain.setTargetAtTime(musicVolume.left / 100, audioCtxRef.current!.currentTime, 0.05);
    }
    if (musicGainsRef.current.right) {
      musicGainsRef.current.right.gain.setTargetAtTime(musicVolume.right / 100, audioCtxRef.current!.currentTime, 0.05);
    }
  }, [musicVolume]);

  useEffect(() => {
    // Sync Tone Master Gain
    if (toneMasterGainRef.current) {
      toneMasterGainRef.current.gain.setTargetAtTime(toneMasterVolume / 100, audioCtxRef.current!.currentTime, 0.05);
    }
  }, [toneMasterVolume]);

  useEffect(() => {
    // Sync Playback Rate
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    // Sync Individual Tone Frequencies
    ['left', 'right'].forEach((side) => {
      const ch = toneChannelsRef.current[side as 'left' | 'right'];
      if (ch.osc) {
        ch.osc.frequency.setTargetAtTime(toneState[side as 'left' | 'right'].frequency, audioCtxRef.current!.currentTime, 0.05);
      }
    });
  }, [toneState]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setIsPwaInstallable(true);
      
      // If we arrived via install link, trigger immediately
      if (window.location.search.includes('install=true')) {
        setShowMobileModal(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleLoadedMetadata = () => {
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = playbackRate;
    }
  };

  const handleAudioError = () => {
    // If the current source failed, fallback to default
    if (audioSrc !== "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3") {
      setAudioSrc("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
      setFileName('Default: Harmonic Ambient');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If it's a text file or .url file, try to read it as a link
    if (file.type === 'text/plain' || file.name.endsWith('.url') || file.name.endsWith('.webloc')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        // Simple regex to find a URL in the text
        const urlMatch = content.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
          setAudioSrc(urlMatch[0]);
          setFileName(file.name.replace(/\.[^/.]+$/, ""));
        }
      };
      reader.readAsText(file);
      return;
    }

    if (audioElementRef.current) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setFileName(file.name);
    }
  };

  const handleUrlLoad = () => {
    setShowUrlModal(true);
  };

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      setIsPwaInstallable(false);
    }
    deferredPromptRef.current = null;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center py-12 px-4 font-sans selection:bg-[#ff9d00]/30 overflow-hidden">
      <canvas ref={starfieldRef} className="fixed inset-0 -z-10 opacity-40" />
      
      <audio 
        key={audioSrc}
        ref={audioElementRef} 
        crossOrigin="anonymous" 
        src={audioSrc}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleAudioError}
        loop={isLooping}
      />

      <div className="w-full max-w-[500px] flex flex-col gap-8">
        
        <header className="flex justify-between items-center border-b border-white/5 pb-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="data-label text-[8px] opacity-80">Acoustic Precision Interface</span>
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[6px] font-bold text-white/30 uppercase tracking-widest">
                v{process.env.APP_VERSION || '1.0.0'}
              </span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
              Harmonic <span className="text-[#ff9d00] font-serif italic lowercase font-normal tracking-normal">stereo</span> Tuning
            </h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowMobileModal(true)}
              className="btn-icon w-12 h-12"
              title="Welcome"
            >
              <Hand size={20} />
            </button>
          </div>
        </header>

        {/* --- Playback & Gain Panel --- */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="data-label">Playback Engine</span>
              {isMusicPlaying && (
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[7px] font-bold text-cyan-400 uppercase tracking-widest"
                >
                  Active
                </motion.div>
              )}
            </div>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
              <div className="w-1 h-1 rounded-full bg-red-500/20" />
              <div className="w-1 h-1 rounded-full bg-red-500/20" />
            </div>
          </div>

          <div className="border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden bg-black/60">
            <div className="flex justify-between items-center mb-4">
              <span className="data-label text-[9px] opacity-80">Oscilloscope Output</span>
              <div className="mono-value opacity-100">{fileName}</div>
            </div>
            <div className="h-[1px] bg-white/5 mb-6" />
            <canvas ref={canvasRef} width={400} height={80} className="w-full h-[80px]" />
            <input type="file" id="audio-input" hidden onChange={handleFileChange} accept="audio/*,video/*,text/plain,.url,.webloc" />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={handleUrlLoad}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all border border-white/10 group"
                title="Load URL"
              >
                <ExternalLink size={14} />
                <span className="data-label text-[8px] opacity-100 tracking-[0.1em]">Load URL</span>
              </button>
              <button 
                onClick={() => document.getElementById('audio-input')?.click()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all border border-white/10 group"
                title="Upload File"
              >
                <Plus size={14} />
                <span className="data-label text-[8px] opacity-100 tracking-[0.1em]">Upload File</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-10">
            <button 
              onClick={() => { audioElementRef.current?.pause(); if(audioElementRef.current) audioElementRef.current.currentTime = 0; }}
              className="btn-icon group"
            >
              <Square size={18} className="group-hover:fill-current" />
            </button>
            <button 
              onClick={() => { 
                initAudio(); 
                if (audioElementRef.current) {
                  audioElementRef.current.playbackRate = playbackRate;
                  audioElementRef.current.play(); 
                }
              }}
              className="btn-primary group"
            >
              <Play size={20} className="group-hover:fill-current" />
            </button>
            <button 
              onClick={() => audioElementRef.current?.pause()}
              className="btn-icon group"
            >
              <Pause size={20} className="group-hover:fill-current" />
            </button>
            <button 
              onClick={() => setIsLooping(!isLooping)}
              className={`btn-icon ${isLooping ? 'bg-[#ff9d00]/10 border-[#ff9d00]/30 text-[#ff9d00] shadow-[0_0_20px_rgba(255,157,0,0.1)]' : ''}`}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-3 mb-10">
            <div className="flex justify-between items-center">
              <span className="data-label text-[9px]">Playback Velocity</span>
              <span className="mono-value text-[#ff9d00] font-bold">{playbackRate.toFixed(2)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.05"
              className="w-full" 
              value={playbackRate} 
              onChange={(e) => setPlaybackRate(Number(e.target.value))} 
            />
          </div>

          <div className="flex justify-between items-center mb-10">
            <span className="data-label">Stereo Gain Matrix</span>
            <Volume2 size={14} className="text-white/20" />
          </div>
          <div className="flex justify-around items-center relative">
            <Knob 
              label="Channel A" 
              side="left" 
              value={musicVolume.left} 
              onChange={(v) => setMusicVolume(p => ({ ...p, left: v }))} 
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-10 pointer-events-none">
              <div className="w-[1px] h-16 bg-white" />
              <span className="data-label my-2">Stereo</span>
              <div className="w-[1px] h-16 bg-white" />
            </div>
            <Knob 
              label="Channel B" 
              side="right" 
              value={musicVolume.right} 
              onChange={(v) => setMusicVolume(p => ({ ...p, right: v }))} 
            />
          </div>
        </motion.section>

        {/* --- Frequency Panel --- */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <span className="data-label">Harmonic Generator</span>
              {isTonePlaying && (
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-1.5 py-0.5 rounded bg-[#ff9d00]/10 border border-[#ff9d00]/30 text-[7px] font-bold text-[#ff9d00] uppercase tracking-widest"
                >
                  Emitting
                </motion.div>
              )}
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => { toggleTone('left', false); toggleTone('right', false); }}
                className="btn-icon w-10 h-10"
                title="Kill Signal"
              >
                <Square size={14} />
              </button>
              <button 
                onClick={() => { toggleTone('left', true); toggleTone('right', true); }}
                className="btn-primary w-10 h-10"
                title="Initiate Signal"
              >
                <Play size={14} />
              </button>
            </div>
          </div>

          <div className="border border-[#ff9d00]/20 rounded-2xl p-6 mb-10 relative overflow-hidden bg-black/60 h-[120px] flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2 z-10">
              <span className="data-label text-[9px]">Frequency Monitor</span>
              <Activity size={12} className="text-[#ff9d00]/40" />
            </div>
            <canvas ref={toneCanvasRef} width={400} height={100} className="w-full h-full" />
          </div>

          <div className="flex flex-col gap-3 mb-12">
            <div className="flex justify-between items-center">
              <span className="data-label text-[9px]">Signal Amplitude</span>
              <span className="mono-value text-[#ff9d00] font-bold">{toneMasterVolume}%</span>
            </div>
            <input 
              type="range" 
              className="w-full" 
              value={toneMasterVolume} 
              onChange={(e) => setToneMasterVolume(Number(e.target.value))} 
            />
          </div>

          <div className="flex justify-around items-center mb-8 relative">
            <Knob 
              label="L-Oscillator" 
              side="left" 
              type="frequency"
              value={toneState.left.frequency} 
              onChange={(v) => setToneState(p => ({ ...p, left: { ...p.left, frequency: v } }))} 
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-10 pointer-events-none">
              <div className="w-[1px] h-16 bg-white" />
              <span className="data-label my-2">Harmonic</span>
              <div className="w-[1px] h-16 bg-white" />
            </div>
            <Knob 
              label="R-Oscillator" 
              side="right" 
              type="frequency"
              value={toneState.right.frequency} 
              onChange={(v) => setToneState(p => ({ ...p, right: { ...p.right, frequency: v } }))} 
            />
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => {
                setToneState({
                  left: { frequency: 112, volume: 50, active: toneState.left.active },
                  right: { frequency: 110, volume: 50, active: toneState.right.active }
                });
                setMusicVolume({ left: 50, right: 50 });
                setToneMasterVolume(50);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              <RefreshCw size={12} /> Calibrate Frequencies
            </button>
          </div>
        </motion.section>

        <footer className="text-center pb-12">
          <p className="data-label text-[8px] opacity-40 uppercase tracking-[0.2em]">
            © 2026 HARMONIC STEREO TUNING • RED INDIAN PRODUCTIONS
          </p>
          <p className="data-label text-[7px] opacity-20 uppercase tracking-[0.1em] mt-2">
            Version {process.env.APP_VERSION || '1.0.0'} • Last Updated: 2026-03-08
          </p>
        </footer>
      </div>

      {/* --- URL Input Modal --- */}
      <AnimatePresence>
        {showUrlModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-sm relative"
            >
              <button 
                onClick={() => setShowUrlModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Load Audio URL</h2>
                <p className="text-sm text-white/60">Enter the direct URL to an audio file.</p>
              </div>

              <input 
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white mb-6 focus:outline-none focus:border-[#ff9d00]"
              />

              <button 
                onClick={() => {
                  if (urlInput && audioElementRef.current) {
                    setAudioSrc(urlInput);
                    const name = urlInput.split('/').pop() || 'Remote Stream';
                    setFileName(name);
                    setShowUrlModal(false);
                    setUrlInput('');
                  }
                }}
                className="w-full py-3 rounded-xl bg-[#ff9d00] text-black font-bold text-center flex items-center justify-center gap-2 hover:bg-[#ffb333] transition-colors"
              >
                LOAD URL
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Mobile Test Modal --- */}
      <AnimatePresence>
        {showMobileModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel w-full max-w-sm relative"
            >
              <button 
                onClick={() => setShowMobileModal(false)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-[#ff9d00]/10 text-[#ff9d00] mb-4">
                  <Hand size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Welcome</h2>
                <p className="text-sm text-white/60">Scan this QR code to open the app on your mobile device and install it.</p>
                {window.self !== window.top && (
                  <p className="text-[10px] text-[#ff9d00] mt-2 font-bold uppercase tracking-wider">
                    Note: Open in new tab to install
                  </p>
                )}
              </div>

              <div className="bg-white p-4 rounded-2xl flex justify-center mb-6">
                <QRCodeSVG value={installUrl} size={200} level="H" />
              </div>

              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2 overflow-hidden">
                  <span className="text-[10px] font-mono text-white/40 truncate">{installUrl}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(installUrl);
                    }}
                    className="text-[10px] font-bold text-[#ff9d00] hover:underline shrink-0"
                  >
                    COPY
                  </button>
                </div>
                
                {isStandalone ? (
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-center text-sm font-bold">
                    App is already installed
                  </div>
                ) : isIOS ? (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/80 text-center text-xs space-y-2">
                    <p className="font-bold text-[#ff9d00]">iOS Installation:</p>
                    <p>1. Tap the <span className="font-bold">Share</span> button in Safari</p>
                    <p>2. Scroll down and tap <span className="font-bold">"Add to Home Screen"</span></p>
                  </div>
                ) : isPwaInstallable ? (
                  <button 
                    onClick={handleInstall}
                    className="w-full py-3 rounded-xl bg-[#ff9d00] text-black font-bold text-center flex items-center justify-center gap-2 hover:bg-[#ffb333] transition-colors shadow-[0_0_30px_rgba(255,157,0,0.3)]"
                  >
                    INSTALL APP NOW <Download size={16} />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <a 
                      href={installUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-center flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                    >
                      OPEN IN NEW TAB <ExternalLink size={16} />
                    </a>
                    <p className="text-[10px] text-white/40 text-center">
                      Installation is only available when opened directly in a browser tab.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
