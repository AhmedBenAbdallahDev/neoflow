import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Monitor, 
  Settings, 
  Gamepad2, 
  Clock, 
  Search, 
  Type, 
  Info,
  ChevronLeft,
  ChevronRight,
  Upload,
  AlertTriangle,
  Wifi,
  Battery,
  X
} from 'lucide-react'
import CoverFlow from './components/CoverFlow'
import NostalgistPlayer from './components/NostalgistPlayer'
import { searchGame, getGameArt, IMAGE_BASE_URL, isApiConfigured } from './services/gamesDb'

interface Game {
  id: string
  title: string
  cover: string
  bg: string
  type: string
  romUrl: string
  core?: string
  platform?: string
  genre?: string
  fileSize?: string
}

type Theme = 'wii' | 'nes' | 'switch'

export default function App() {
  const [games, setGames] = useState<Game[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('retroflow-theme') as Theme) || 'wii')
  const [respectAspect, setRespectAspect] = useState(() => localStorage.getItem('retroflow-respect-aspect') === 'true')
  const [reflectionBlur, setReflectionBlur] = useState(() => {
    const stored = localStorage.getItem('retroflow-reflection-blur')
    return stored !== null ? Number(stored) : 4
  })
  const [activeGame, setActiveGame] = useState<Game | null>(null)
  const [showNotice, setShowNotice] = useState(!localStorage.getItem('retroflow-notice-hidden'))

  useEffect(() => {
    localStorage.setItem('retroflow-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('retroflow-respect-aspect', String(respectAspect))
  }, [respectAspect])

  useEffect(() => {
    localStorage.setItem('retroflow-reflection-blur', String(reflectionBlur))
  }, [reflectionBlur])
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Function to enrich game data using TheGamesDB (only if API key is configured)
  const enrichGameData = async (basicGames: any[]) => {
    if (!isApiConfigured()) {
      console.log('TheGamesDB API key not configured. Skipping enrichment.')
      return
    }
    setLoading(true)
    const enriched = await Promise.all(basicGames.map(async (game) => {
      try {
        const searchResults = await searchGame(game.title)
        if (searchResults && searchResults.length > 0) {
          const matched = searchResults[0]
          const images = await getGameArt(matched.id)
          
          // Find a boxart and a fanart/background
          const boxart = images.find((img: any) => img.type === 'boxart' && img.side === 'front')
          const fanart = images.find((img: any) => img.type === 'fanart') || images.find((img: any) => img.type === 'screenshot')

          return {
            ...game,
            platform: matched.platform || game.platform,
            genre: matched.genres ? matched.genres.join(', ') : game.genre,
            cover: boxart ? `${IMAGE_BASE_URL}${boxart.filename}` : game.cover,
            bg: fanart ? `${IMAGE_BASE_URL}${fanart.filename}` : game.bg,
            dbId: matched.id
          }
        }
      } catch (err) {
        console.warn(`Could not enrich ${game.title}`, err)
      }
      return game
    }))
    setGames(enriched)
    setLoading(false)
  }

  // Load demo data from the bundled rom-set.json
  const loadDummyData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/rom-set.json')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setGames(data)
          setSelectedIndex(0)
        }
      }
    } catch (err) {
      console.error("Failed to load demo data", err)
    }
    setLoading(false)
  }

  // Load external romset with external URLs for testing
  const loadExternalRomset = async () => {
    setLoading(true)
    try {
      const response = await fetch('/external-romset.json')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setGames(data)
          setSelectedIndex(0)
        }
      }
    } catch (err) {
      console.error("Failed to load external romset", err)
    }
    setLoading(false)
  }

  // Auto-load JSON on startup
  useEffect(() => {
    const loadDefaultGames = async () => {
      try {
        const response = await fetch('/rom-set.json')
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            setGames(data)
          }
        }
      } catch (err) {
        console.log("No default rom-set.json found at root")
      }
    }
    loadDefaultGames()
  }, [])

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        if (Array.isArray(data)) {
          setGames(data)
          setSelectedIndex(0)
        }
      } catch (err) {
        alert("Invalid JSON file")
      }
    }
    reader.readAsText(file)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeGame) return

    if (e.key === 'ArrowLeft') {
      setSelectedIndex(prev => prev === 0 ? games.length - 1 : prev - 1)
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex(prev => (prev + 1) % games.length)
    } else if (e.key === 'Enter' && games[selectedIndex]) {
      setActiveGame(games[selectedIndex])
    }
  }, [games, selectedIndex, activeGame])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const currentInfo = games[selectedIndex]

  return (
    <div className={`relative w-full h-screen overflow-hidden selection:bg-transparent transition-colors duration-500 ${
      theme === 'nes' ? "bg-[#1a1a1a] font-pixel text-white" : 
      theme === 'switch' ? "bg-[#2b2b2b] font-sans text-white" : 
      "bg-black font-sans text-white"
    }`}>
      {/* Background Image */}
      <AnimatePresence mode="popLayout">
        <motion.img
          key={currentInfo?.id || 'default-bg'}
          src={currentInfo?.bg || 'https://images.alphacoders.com/264/264426.jpg'}
          alt="background"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: theme === 'wii' ? 0.4 : theme === 'switch' ? 0.15 : 0.2 
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`absolute inset-0 w-full h-full object-cover scale-110 ${
            theme === 'nes' ? "blur-md grayscale contrast-150" : 
            theme === 'switch' ? "blur-[80px]" : 
            "blur-xl"
          }`}
        />
      </AnimatePresence>

      {/* Overlays */}
      <div className={`absolute inset-0 ${
        theme === 'wii' ? "bg-gradient-to-b from-blue-900/40 via-black/20 to-black/90" : 
        theme === 'nes' ? "bg-black/60" : 
        "bg-gradient-to-b from-transparent to-[#2b2b2b]"
      }`} />

      {theme === 'wii' && (
        <div 
          className="absolute bottom-0 w-full h-[40vh] bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none" 
          style={{ transform: "perspective(1000px) rotateX(60deg)", transformOrigin: "bottom" }}
        />
      )}

      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-start z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
              theme === 'nes' ? "bg-red-600" : theme === 'switch' ? "bg-[#e60012]" : "bg-transparent"
            }`}>
              <img src="/icon.png" className={`w-full h-full object-contain ${theme !== 'switch' && theme !== 'wii' ? '' : 'brightness-0 invert p-2'}`} alt="NeoFlow" />
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${theme === 'nes' ? 'font-pixel text-xl' : ''}`}>
              NEOFLOW <span className="text-gray-400 text-sm font-semibold lowercase tracking-wide">alpha</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Battery className="w-6 h-6 text-gray-400" />
            <span className="text-gray-400 text-sm font-medium">71%</span>
          </div>
          <div className="flex items-center">
            <button className="w-9 h-9 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center">
              <Wifi className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="text-right font-medium ml-6">
            <div className="text-white text-base">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex flex-col items-center justify-center h-full pt-20">
        <AnimatePresence mode="wait">
          {games.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 max-w-md text-center p-8 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
            >
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                 <Gamepad2 className="w-12 h-12 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">No Games Found</h2>
                <p className="text-gray-400">Your library is empty. Import a JSON file containing your ROM set to get started.</p>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                <Upload className="w-5 h-5" /> Import Game JSON
              </button>
              <button 
                onClick={loadDummyData}
                className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors underline underline-offset-2 mt-2"
              >
                load demo data
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="carousel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <CoverFlow 
                games={games}
                selectedIndex={selectedIndex}
                theme={theme}
                respectAspect={respectAspect}
                reflectionBlur={reflectionBlur}
                onSelect={setSelectedIndex}
                onLaunch={(game) => setActiveGame(game)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      {games.length > 0 && (
        <footer className="absolute bottom-0 w-full p-12 pb-8 flex flex-col gap-6 z-50">
          <AnimatePresence mode="wait">
            {currentInfo && (
              <motion.div
                key={currentInfo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded tracking-wider flex items-center justify-center leading-none ${
                      theme === 'nes' ? "bg-red-600 text-white text-xs font-pixel" :
                      theme === 'switch' ? "bg-[#e60012] text-white text-xs font-bold rounded-sm" :
                      "bg-white/20 backdrop-blur-md text-sm font-bold"
                    }`}>
                      {currentInfo.type}
                    </span>
                    <h2 className={`leading-none ${
                      theme === 'nes' ? "text-xl text-red-500 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] font-pixel" :
                      theme === 'switch' ? "text-3xl font-extrabold tracking-tight" :
                      "text-4xl font-bold tracking-tight"
                    }`}>
                      {currentInfo.title}
                    </h2>
                  </div>
                  <div className="flex gap-6 items-center mt-3 flex-wrap">
                    <span className="text-sm uppercase font-medium text-white/50 tracking-widest flex items-center gap-1.5">
                      <Monitor className="w-4 h-4" /> {currentInfo.platform || 'Retro System'}
                    </span>
                    <span className="text-sm uppercase font-medium text-white/50 tracking-widest flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4" /> {currentInfo.genre || 'Classic'}
                    </span>
                    <span className="text-sm uppercase font-medium text-white/50 tracking-widest flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {currentInfo.fileSize || 'N/A'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-end border-t border-white/10 pt-6">
            <div className="flex gap-10">
              {/* Handheld/Gamepad Guides */}
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-[10px] font-bold">A</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-sans">Launch</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full border-2 border-white/20 flex items-center justify-center text-[10px] font-bold">B</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-sans">Back</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-4 rounded-full border-2 border-white/20 flex items-center justify-center text-[8px] font-extrabold">D-PAD</div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 font-sans">Browse</span>
                </div>
              </div>

              <div className="w-[1px] h-6 bg-white/10 self-center" />

              {/* Desktop Interactive Buttons */}
              <div className="flex gap-6">
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
                >
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center font-bold text-xs ring-1 ring-white/10 group-hover:bg-blue-600 group-hover:ring-blue-500 transition-all">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Settings</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
                >
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center font-bold text-xs ring-1 ring-white/10 group-hover:bg-green-600 group-hover:ring-green-500 transition-all">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Swap JSON</span>
                </button>
              </div>
            </div>
            
            <button className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Search className="w-4 h-4" /> Filter Library
            </button>
          </div>
        </footer>
      )}

      {/* Notice Modal */}
      <AnimatePresence>
        {showNotice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-lg shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <h2 className="text-2xl font-bold">Important Notice</h2>
              </div>
              
              <div className="space-y-4 text-gray-300 mb-8 leading-relaxed">
                <p>This tool is strictly designed for playing <strong>open-source</strong> and <strong>homebrew</strong> games.</p>
                <p>You are <strong>not allowed</strong> to use illegal, copyrighted ROMs with this software. By continuing, you agree to comply with all copyright laws and take full responsibility for the files you load.</p>
              </div>

              <div className="flex items-center justify-between gap-6">
                 <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      onChange={(e) => {
                        if(e.target.checked) localStorage.setItem('retroflow-notice-hidden', 'true')
                        else localStorage.removeItem('retroflow-notice-hidden')
                      }}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Don't show this again</span>
                 </label>
                 <button 
                  onClick={() => setShowNotice(false)}
                  className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all hover:scale-105"
                 >
                   I Understand & Agree
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-2xl flex items-center justify-end"
            onClick={() => setShowSettings(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-[400px] h-full bg-gray-900/90 border-l border-white/10 p-8 shadow-2xl flex flex-col gap-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-6">
                {isApiConfigured() && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Library Tools</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => enrichGameData(games)}
                      disabled={loading || games.length === 0}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${loading ? 'opacity-50 cursor-not-allowed' : 'bg-green-600/20 border-green-500 text-white hover:bg-green-600/30'}`}
                    >
                      <span className="font-bold">{loading ? 'Fetching Metadata...' : 'Scan with TheGamesDB'}</span>
                      <Search className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
                )}
                
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Debug Tools</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={loadExternalRomset}
                      className="p-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 transition-all text-xs"
                    >
                      Load External Romset (Test URLs)
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Cover Layout</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setRespectAspect(!respectAspect)}
                      className={`p-4 w-full rounded-xl border transition-all flex items-center justify-between ${respectAspect ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold">Respect Image Aspect</span>
                        <span className="text-[10px] opacity-60">Prevents cropping/stretching</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${respectAspect ? 'bg-blue-500' : 'bg-gray-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${respectAspect ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-400">Reflection Blur</span>
                        <span className="text-xs font-mono text-blue-500">{reflectionBlur}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="20" 
                        value={reflectionBlur}
                        onChange={(e) => setReflectionBlur(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Visual Theme</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => setTheme('wii')}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${theme === 'wii' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <span className="font-bold">Wii Station</span>
                      {theme === 'wii' && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                    </button>
                    <button 
                      onClick={() => setTheme('nes')}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${theme === 'nes' ? 'bg-red-600/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <span className="font-bold font-pixel text-xs">NES Classic</span>
                      {theme === 'nes' && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                    </button>
                    <button 
                      onClick={() => setTheme('switch')}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between ${theme === 'switch' ? 'bg-[#e60012]/20 border-[#e60012] text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                    >
                      <span className="font-bold">Switch OLED</span>
                      {theme === 'switch' && <div className="w-2 h-2 rounded-full bg-[#e60012] shadow-[0_0_10px_rgba(230,0,18,0.5)]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">About RetroFlow</h3>
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Software Version</span>
                      <span className="font-bold">v2.4.0-source</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Kernel Status</span>
                      <span className="text-green-500 font-bold uppercase text-[10px]">Optimal</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-white/10">
                <p className="text-[10px] text-gray-500 leading-relaxed uppercase tracking-tighter">
                  Powered by Nostalgist.js & React. Licensed for open-source homebrew use only.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emulator Player */}
      <AnimatePresence>
        {activeGame && (
          <NostalgistPlayer 
            romUrl={activeGame.romUrl}
            core={activeGame.type.toLowerCase()}
            gameName={activeGame.title}
            onClose={() => setActiveGame(null)}
          />
        )}
      </AnimatePresence>

      {/* Hidden File Input for JSON Swapping */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        className="hidden" 
      />
    </div>
  )
}