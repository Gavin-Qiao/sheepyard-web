import React from 'react';
import { motion } from 'framer-motion';

export const Background: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-paper text-ink font-serif overflow-hidden relative">
      {/* Background Gradient/Fog */}
      <div className="absolute inset-0 bg-mystic-gradient opacity-80 z-0 pointer-events-none" />

      {/* Floating Elements (Subtle Mist/Clouds) */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none opacity-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-jade-100 rounded-full blur-[100px] mix-blend-multiply opacity-50 animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-mist rounded-full blur-[120px] mix-blend-multiply opacity-50" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
