import { useEffect, useRef, useState } from 'react'
import { Nostalgist } from 'nostalgist'
import { X, Loader2 } from 'lucide-react'

interface NostalgistPlayerProps {
  romUrl: string
  core: string
  gameName: string
  onClose: () => void
}

export default function NostalgistPlayer({ romUrl, core, gameName, onClose }: NostalgistPlayerProps) {
  const containerRef = useRef<HTMLCanvasElement>(null)
  const nostalgistRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    
    async function init() {
      if (!containerRef.current) return
      
      try {
        setLoading(true)
        setError(null)
        
        const finalUrl = romUrl.startsWith('http') 
          ? `https://corsproxy.io/?${encodeURIComponent(romUrl)}` 
          : romUrl

        const nostalgist = await Nostalgist.launch({
          core: core === 'nes' ? 'fceumm' : core === 'snes' ? 'snes9x' : core,
          rom: finalUrl,
          element: containerRef.current,
        })
        
        if (active) {
          nostalgistRef.current = nostalgist
          setLoading(false)
        } else {
          nostalgist.exit({ removeCanvas: false })
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load emulator core or ROM.')
        setLoading(false)
      }
    }

    init()

    return () => {
      active = false
      if (nostalgistRef.current) {
        nostalgistRef.current.exit({ removeCanvas: false })
      }
    }
  }, [romUrl, core])

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="absolute top-4 right-4 z-[310] flex gap-2">
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-white">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="font-medium">Loading {gameName}...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 bg-red-500/10 p-6 rounded-lg border border-red-500/20 max-w-md text-center">
            <h3 className="text-xl font-bold mb-2">Error</h3>
            <p>{error}</p>
            <button 
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        <canvas ref={containerRef} className="max-h-full max-w-full object-contain" id="canvas" />
      </div>

      <footer className="p-4 bg-gray-900/50 backdrop-blur-md flex justify-between items-center text-xs text-gray-400">
        <div>Playing: <span className="text-white font-bold">{gameName}</span> ({core.toUpperCase()})</div>
        <div>Press F to toggle fullscreen • Esc to exit</div>
      </footer>
    </div>
  )
}