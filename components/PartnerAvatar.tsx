import React, { useRef, useEffect } from 'react';
import { PartnerMood } from '../types';

interface PartnerAvatarProps {
  imageSrc: string | null;
  videoSrc: string | null;
  mood: PartnerMood;
  isTalking: boolean;
  isPaused: boolean;
}

const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ imageSrc, videoSrc, mood, isTalking, isPaused }) => {
  const fallbackImage = "https://picsum.photos/400/400"; // Fallback if no upload
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Auto-play prevented", e));
      }
    }
  }, [isPaused]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 shadow-2xl">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60 z-10 pointer-events-none"></div>
      
      {/* The Partner Image or Video */}
      <div className={`relative w-full h-full transition-all duration-500 ease-in-out ${!videoSrc && 'avatar-breathe'}`}>
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            autoPlay={!isPaused}
          />
        ) : (
          <img 
            src={imageSrc || fallbackImage} 
            alt="Study Partner" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Mood Overlay / Status Bubble */}
      <div className="absolute bottom-6 right-6 z-20">
        <div className={`
          px-4 py-2 rounded-full backdrop-blur-md border border-white/10 text-white text-sm font-medium shadow-lg
          transition-all duration-300
          ${isTalking ? 'bg-sky-500/80 scale-110' : 'bg-slate-800/80'}
          ${isPaused ? 'opacity-50 grayscale' : ''}
        `}>
          {isPaused ? 'Paused' : (isTalking ? 'Speaking...' : (mood === PartnerMood.THINKING ? 'Thinking...' : 'Listening'))}
        </div>
      </div>

      {/* Breathing glow effect when talking */}
      {isTalking && !isPaused && (
        <div className="absolute inset-0 z-0 pointer-events-none shadow-[inset_0_0_50px_rgba(56,189,248,0.3)]"></div>
      )}
      
      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center backdrop-blur-sm">
           <div className="bg-slate-900/90 border border-slate-700 px-6 py-3 rounded-full text-white font-bold shadow-2xl">
              SESSION PAUSED
           </div>
        </div>
      )}
    </div>
  );
};

export default PartnerAvatar;