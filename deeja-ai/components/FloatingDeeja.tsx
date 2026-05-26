"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

export default function FloatingDeeja() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="relative">
          {/* Glow */}
          <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-60 rounded-full" />

          {/* Avatar */}
          <motion.img
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            src="/deeja/deeja.png"
            className="relative w-24"
          />
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scale: 0.9,
            }}
            className="fixed bottom-36 right-6 w-[360px] h-[520px] bg-black/80 border border-cyan-400/20 backdrop-blur-xl rounded-3xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src="/deeja/deeja.png"
                  className="w-12"
                />

                <div>
                  <h2 className="font-bold text-white">
                    Deeja.ai
                  </h2>

                  <p className="text-xs text-cyan-400">
                    AI Assistant Online
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400"
              >
                <X />
              </button>
            </div>

            {/* Messages */}
            <div className="p-4 text-white">
              Hello ✨ I'm Deeja
            </div>

            {/* Input */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Ask Deeja..."
                  className="flex-1 h-12 rounded-2xl bg-white/10 px-4 text-white outline-none"
                />

                <button className="w-12 h-12 rounded-2xl bg-cyan-400 flex items-center justify-center">
                  <MessageCircle className="text-black w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
