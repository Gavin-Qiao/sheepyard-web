import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Background } from '../components/Background';
import { ChevronRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.5,
    },
  },
};

const charVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 1.2,
      ease: "easeOut",
    },
  },
} as const;

const Login: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const promptText = "Are you a Sheep?";

  const handleReveal = () => {
    setShowLogin(true);
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <Background>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">

        {/* Main Prompt */}
        <motion.h1
          className="text-4xl md:text-6xl font-light tracking-widest text-ink mb-12 select-none cursor-pointer"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onClick={handleReveal}
        >
          {promptText.split("").map((char, index) => (
            <motion.span key={index} variants={charVariants} className="inline-block">
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.h1>

        {/* Interaction Area */}
        <div className="h-24 flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
                {!showLogin ? (
                    <motion.button
                        key="reveal-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 2.5, duration: 1 } }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReveal}
                        className="text-jade-600 border border-jade-300 px-6 py-2 rounded-full hover:bg-jade-50 transition-colors font-sans text-sm tracking-widest uppercase"
                    >
                        Yes
                    </motion.button>
                ) : (
                    <motion.div
                        key="login-area"
                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.8 }}
                    >
                        <button
                            onClick={handleLogin}
                            className="group relative inline-flex items-center justify-center overflow-hidden rounded-md bg-ink px-8 py-3 font-medium text-paper shadow-2xl transition duration-300 hover:bg-jade-700 hover:shadow-jade-200/50"
                        >
                            <span className="mr-2">Login with Discord</span>
                            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-jade-600 to-ink opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3, duration: 2 }}
            className="absolute bottom-8 text-jade-400 text-xs font-sans tracking-[0.2em] opacity-50"
        >
            EST. 2024
        </motion.div>

      </div>
    </Background>
  );
};

export default Login;
