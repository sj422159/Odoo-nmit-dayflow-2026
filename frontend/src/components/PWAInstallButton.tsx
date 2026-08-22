import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import Swal from 'sweetalert2'

export function PWAInstallButton({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'card' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setDeferredPrompt(null)
      }
    } else {
      // Guide instructions for Chrome, Edge, Safari iOS
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      Swal.fire({
        icon: 'info',
        title: 'Install Dayflow PWA App',
        html: isiOS
          ? `<div class="text-left text-xs space-y-2 mt-2 font-medium text-slate-700">
              <p><b>To install on iOS / Safari:</b></p>
              <ol class="list-decimal pl-4 space-y-1">
                <li>Tap the <b>Share</b> button in Safari navigation bar.</li>
                <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
              </ol>
             </div>`
          : `<div class="text-left text-xs space-y-2 mt-2 font-medium text-slate-700">
              <p><b>To install on Desktop / Android Chrome / Edge:</b></p>
              <ol class="list-decimal pl-4 space-y-1">
                <li>Click the <b>Install Icon (⊕)</b> in your browser address bar.</li>
                <li>Or open browser menu (<b>⋮</b> or <b>⋯</b>) and click <b>Install Dayflow...</b></li>
              </ol>
             </div>`,
        confirmButtonColor: '#0284c7',
        confirmButtonText: 'Got it!',
      })
    }
  }

  if (isInstalled) return null

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex w-full items-center gap-2.5 rounded-xl bg-flow-600/90 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-flow-600 transition-all mb-2"
      >
        <Smartphone className="h-4 w-4" />
        <span>Install App</span>
      </button>
    )
  }

  if (variant === 'card') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-flow-200 bg-flow-50/70 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-flow-600 text-white font-bold shadow-xs">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-ink text-xs">Install Dayflow PWA</p>
            <p className="text-[11px] text-away">Use Dayflow as a desktop or mobile app with offline support.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 rounded-xl bg-flow-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-flow-700 transition-colors shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Install Now</span>
        </button>
      </div>
    )
  }

  // Header variant
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      title="Install Dayflow PWA App"
      className="hidden sm:flex items-center gap-1.5 rounded-xl border border-flow-300 bg-flow-50 px-3 py-1.5 text-xs font-bold text-flow-700 shadow-2xs hover:bg-flow-100 transition-colors"
    >
      <Download className="h-3.5 w-3.5 text-flow-600" />
      <span>Install App</span>
    </button>
  )
}
