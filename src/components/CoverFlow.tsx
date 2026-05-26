import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'

interface Game {
  id: string
  title: string
  cover: string
  bg: string
  type: string
  romUrl: string
  core?: string
}

interface CoverFlowProps {
  games: Game[]
  selectedIndex: number
  theme: 'wii' | 'nes' | 'switch'
  respectAspect?: boolean
  reflectionBlur?: number
  onSelect: (index: number) => void
  onLaunch: (game: Game) => void
}

export default function CoverFlow({ games, selectedIndex, theme, respectAspect, reflectionBlur = 4, onSelect, onLaunch }: CoverFlowProps) {
  const getLayout = (index: number) => {
    const diff = index - selectedIndex
    const absDiff = Math.abs(diff)
    const isActive = diff === 0
    
    let x = 0, rotateY = 0, z = 0, scale = 1, opacity = 1

    if (theme === 'wii') {
      if (isActive) {
        x = 0; rotateY = 0; z = 150; scale = 1.15; opacity = 1
      } else {
        const side = Math.sign(diff)
        x = side * (180 + absDiff * 45)
        rotateY = side * -70
        z = -absDiff * 80 - 40
        scale = 0.85
        opacity = Math.max(0, 1 - absDiff * 0.15)
      }
    } else if (theme === 'nes') {
      if (isActive) {
        x = 0; rotateY = 0; z = 100; scale = 1; opacity = 1
      } else {
        const side = Math.sign(diff)
        x = side * (320 + absDiff * 20)
        rotateY = 0
        z = -absDiff * 50
        scale = 0.9
        opacity = Math.max(0, 1 - absDiff * 0.3)
      }
    } else if (theme === 'switch') {
      if (isActive) {
        x = 0; rotateY = 0; z = 50; scale = 1; opacity = 1
      } else {
        const side = Math.sign(diff)
        x = side * (340 + absDiff * 10)
        rotateY = 0
        z = 0
        scale = 0.75
        opacity = Math.max(0.3, 1 - absDiff * 0.2)
      }
    }

    return { x, rotateY, z, scale, opacity }
  }

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center perspective-1000 overflow-visible -translate-y-12">
      {games.map((game, i) => {
        const layout = getLayout(i)
        const isActive = i === selectedIndex

        return (
          <motion.div
            key={game.id}
            className={`absolute cursor-pointer will-change-transform flex items-center justify-center ${
              respectAspect ? 'h-[420px]' : 'w-[300px] h-[420px]'
            }`}
            initial={false}
            animate={layout}
            transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.8 }}
            style={{ 
              zIndex: 100 - Math.abs(i - selectedIndex),
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden"
            }}
            onClick={() => isActive ? onLaunch(game) : onSelect(i)}
          >
            {/* Active Title Indicator */}
            {isActive && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute -top-24 left-0 right-0 flex justify-center pointer-events-none"
                style={{ transform: "translateZ(50px)" }}
              >
                <div className="flex flex-col items-center gap-1 group pointer-events-auto cursor-pointer">
                  <span className={`font-extrabold whitespace-nowrap ${
                    theme === 'nes' 
                      ? "text-red-500 font-pixel text-6xl drop-shadow-[4px_4px_0_rgba(0,0,0,1)]" 
                      : "text-white text-7xl drop-shadow-lg"
                  }`}>
                    {game.title.charAt(0).toUpperCase()}
                  </span>
                  <div className="px-2 py-0.5 bg-white/10 backdrop-blur-md rounded text-[10px] font-bold tracking-widest text-white/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    FILTER BY {game.title.charAt(0).toUpperCase()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Game Cover Wrapper */}
            <div className={`relative h-full group ${
              respectAspect ? 'w-full' : 'w-full'
            } ${
              theme === 'nes' ? 'border-4 border-gray-400 bg-black p-1' : 'rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
            }`}>
              <img 
                src={game.cover} 
                alt={game.title}
                className={`h-full ${
                  respectAspect ? 'w-auto object-contain' : 'w-full object-cover'
                } ${
                  theme === 'nes' ? '' : 'rounded-md border-2 border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]'
                }`}
                style={theme === 'wii' ? {
                  WebkitBoxReflect: `below 4px linear-gradient(transparent 50%, rgba(0,0,0,0.6))`,
                  filter: `drop-shadow(0 10px 20px rgba(0,0,0,0.5))`
                } : {}}
                referrerPolicy="no-referrer"
              />
              
              {/* Reflection Blur Layer - overlaps the reflection to blur it */}
              {theme === 'wii' && (
                <div 
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    top: '98%',
                    height: '35%',
                    backdropFilter: `blur(${reflectionBlur}px)`,
                    WebkitBackdropFilter: `blur(${reflectionBlur}px)`,
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 80%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 80%)',
                  }}
                />
              )}
              
              {/* Active Highlight Selection Box */}
              {isActive && theme === 'wii' && (
                <motion.div 
                  layoutId="activeHighlight"
                  className="absolute inset-0 rounded-lg border-2 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
              {isActive && theme === 'switch' && (
                <motion.div 
                  layoutId="activeHighlight"
                  className="absolute inset-0 rounded-md border-4 border-[#00d7c0] shadow-[0_0_20px_rgba(0,215,192,0.5)]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
              {isActive && theme === 'nes' && (
                <motion.div 
                  layoutId="activeHighlight"
                  className="absolute -inset-2 border-4 border-red-500 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}