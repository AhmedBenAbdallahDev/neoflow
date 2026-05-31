import { LayoutGroup, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

type Theme = 'wii' | 'nes' | 'switch'

const COVER_WIDTH = 258
const COVER_HEIGHT = 420
const loadedCoverUrls = new Set<string>()

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
  theme: Theme
  respectAspect?: boolean
  reflectionBlur?: number
  onSelect: (index: number) => void
  onLaunch: (game: Game) => void
}

function CoverPlaceholder({ theme }: { theme: Theme }) {
  let accentClass = 'bg-blue-400/45'
  if (theme === 'switch') {
    accentClass = 'bg-[#00d7c0]/50'
  } else if (theme === 'nes') {
    accentClass = 'bg-red-500/45'
  }

  return (
    <div className={`absolute inset-0 overflow-hidden ${theme === 'nes' ? 'bg-black' : 'rounded-md bg-[#161616]'}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.035)_42%,rgba(0,0,0,0.22))]" />
      <div className="absolute inset-3 rounded-md border border-white/10" />
      <div className="absolute left-1/2 top-[29%] h-14 w-14 -translate-x-1/2 rounded-full bg-white/10" />
      <div
        className="absolute left-[17%] right-[17%] bottom-[28%] h-20 bg-white/[0.075]"
        style={{ clipPath: 'polygon(0 86%, 32% 34%, 52% 64%, 76% 14%, 100% 86%)' }}
      />
      <div className="absolute bottom-[18%] left-[21%] right-[21%] h-2 rounded-full bg-white/10" />
      <div className={`absolute bottom-[14%] left-[34%] right-[34%] h-1.5 rounded-full ${accentClass}`} />
    </div>
  )
}

function GameCard({ game, theme, respectAspect, reflectionBlur, fadeDelay }: {
  game: Game
  theme: Theme
  respectAspect?: boolean
  reflectionBlur: number
  fadeDelay: number
}) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [isLoaded, setIsLoaded] = useState(() => loadedCoverUrls.has(game.cover))
  const [hasError, setHasError] = useState(false)
  const showCover = isLoaded && !hasError

  useEffect(() => {
    setIsLoaded(loadedCoverUrls.has(game.cover))
    setHasError(false)
  }, [game.cover])

  const markCoverReady = useCallback((image: HTMLImageElement | null) => {
    if (!image || image.naturalWidth === 0) {
      setHasError(true)
      return
    }

    const finish = () => {
      if (imageRef.current !== image) return
      loadedCoverUrls.add(game.cover)
      setIsLoaded(true)
    }

    if (image.decode) {
      image.decode().then(finish).catch(finish)
      return
    }

    finish()
  }, [game.cover])

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth > 0) {
      markCoverReady(image)
    }
  }, [game.cover, markCoverReady])

  return (
    <div className={`relative h-full w-full group ${
      theme === 'nes' ? 'border-4 border-gray-400 bg-black p-1' : 'rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
    }`}>
      <CoverPlaceholder theme={theme} />

      {/* Blurred reflection layer */}
      {theme === 'wii' && (
        <div
          className="absolute pointer-events-none overflow-hidden"
          style={{
            top: '100%',
            left: 0,
            right: 0,
            height: '100%',
            opacity: 0.4,
          }}
        >
          <img
            src={game.cover}
            alt=""
            aria-hidden="true"
            className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${showCover ? 'opacity-100' : 'opacity-0'}`}
            style={{
              filter: `blur(${reflectionBlur}px)`,
              transform: 'scaleY(-1)',
              transitionDelay: `${fadeDelay}ms`,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 45%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 45%)',
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Main cover image */}
      <img 
        ref={imageRef}
        src={game.cover} 
        alt={game.title}
        onLoad={(event) => markCoverReady(event.currentTarget)}
        onError={() => {
          setHasError(true)
          setIsLoaded(false)
        }}
        decoding="async"
        className={`relative h-full w-full transition-[opacity,transform] duration-700 ease-out ${
          showCover ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.985]'
        } ${
          respectAspect ? 'object-cover' : 'object-fill'
        } ${
          theme === 'nes' ? '' : 'rounded-md border-2 border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]'
        }`}
        style={{
          ...(theme === 'wii' ? { filter: `drop-shadow(0 10px 20px rgba(0,0,0,0.5))` } : {}),
          transitionDelay: `${fadeDelay}ms`,
        }}
        referrerPolicy="no-referrer"
      />
    </div>
  )
}

function ActiveSelectionBorder({ theme }: { theme: Theme }) {
  if (theme === 'wii') {
    return (
      <div className="absolute inset-0 z-20 rounded-lg border-2 border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.2)] pointer-events-none" />
    )
  }

  if (theme === 'switch') {
    return (
      <div className="absolute inset-0 z-20 rounded-md border-4 border-[#00d7c0] shadow-[0_0_20px_rgba(0,215,192,0.5)] pointer-events-none" />
    )
  }

  return (
    <div className="absolute -inset-2 z-20 border-4 border-red-500 pointer-events-none" />
  )
}

export default function CoverFlow({ games, selectedIndex, theme, respectAspect, reflectionBlur = 4, onSelect, onLaunch }: CoverFlowProps) {
  const previousSelectedIndexRef = useRef(selectedIndex)
  const getLayout = (index: number, anchorIndex = selectedIndex) => {
    const diff = index - anchorIndex
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
  const previousSelectedIndex = previousSelectedIndexRef.current
  const previousActiveLayout = getLayout(previousSelectedIndex, previousSelectedIndex)
  const incomingLayout = getLayout(selectedIndex, previousSelectedIndex)
  const activeLayout = getLayout(selectedIndex, selectedIndex)
  const selectionDelta = selectedIndex - previousSelectedIndex
  const leadDirection = Math.sign(selectionDelta)
  const borderLeadX = leadDirection * (
    theme === 'switch'
      ? 72
      : theme === 'wii'
        ? 56
        : 64
  )
  const borderLeadRotation = theme === 'wii' ? incomingLayout.rotateY * 0.14 : 0

  useEffect(() => {
    previousSelectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  return (
    <div className="relative w-full h-[600px] flex items-center justify-center perspective-1000 overflow-visible -translate-y-12">
      <LayoutGroup id="coverflow-active-highlight">
        {games.map((game, i) => {
          const layout = getLayout(i)
          const isActive = i === selectedIndex

          return (
            <motion.div
              key={game.id}
              className="absolute cursor-pointer will-change-transform flex items-center justify-center"
              initial={false}
              animate={layout}
              transition={{ type: "spring", stiffness: 250, damping: 25, mass: 0.8 }}
              style={{ 
                zIndex: 100 - Math.abs(i - selectedIndex),
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                width: COVER_WIDTH,
                height: COVER_HEIGHT
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
              <GameCard
                game={game}
                theme={theme}
                respectAspect={respectAspect}
                reflectionBlur={reflectionBlur}
                fadeDelay={Math.min(Math.abs(i - selectedIndex) * 70, 210)}
              />
            </motion.div>
          )
        })}

        {games[selectedIndex] && (
          <motion.div
            key={`${theme}-${previousSelectedIndex}-${selectedIndex}`}
            className="absolute pointer-events-none will-change-transform"
            initial={previousActiveLayout}
            animate={{
              x: [previousActiveLayout.x, previousActiveLayout.x, borderLeadX, activeLayout.x],
              rotateY: [previousActiveLayout.rotateY, previousActiveLayout.rotateY, borderLeadRotation, activeLayout.rotateY],
              z: [previousActiveLayout.z, previousActiveLayout.z, previousActiveLayout.z, activeLayout.z],
              scale: [previousActiveLayout.scale, previousActiveLayout.scale, previousActiveLayout.scale, activeLayout.scale],
              opacity: [1, 1, 1, 1],
            }}
            transition={{
              duration: 0.42,
              ease: 'easeInOut',
              times: [0, 0.16, 0.58, 1],
            }}
            style={{
              zIndex: 200,
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden',
              width: COVER_WIDTH,
              height: COVER_HEIGHT,
            }}
          >
            <ActiveSelectionBorder theme={theme} />
          </motion.div>
        )}
      </LayoutGroup>
    </div>
  )
}
