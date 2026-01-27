'use client'

import { useState, useEffect, useRef, useLayoutEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

const SUPABASE_STORAGE_URL = 'https://rpjmsncjnhtnjnycabys.supabase.co/storage/v1/object/public/Profilbilder'

const TEAM_MEMBERS = [
  {
    id: 'andreas',
    name: 'Andreas Jennische',
    firstName: 'Andreas',
    role: 'Nyhetschef',
    image: `${SUPABASE_STORAGE_URL}/andreas-jennische.png`
  },
  {
    id: 'johann',
    name: 'Johann Bernövall',
    firstName: 'Johann',
    role: 'Reporter',
    image: `${SUPABASE_STORAGE_URL}/johann-bernovall.png`
  },
  {
    id: 'jenny',
    name: 'Jenny Kjellén',
    firstName: 'Jenny',
    role: 'Reporter',
    image: `${SUPABASE_STORAGE_URL}/jenny-kjellen.png`
  },
  {
    id: 'camilla',
    name: 'Camilla Bergman',
    firstName: 'Camilla',
    role: 'Chefredaktör',
    image: `${SUPABASE_STORAGE_URL}/camilla-bergman.png`
  },
  {
    id: 'diana',
    name: 'Diana Demin',
    firstName: 'Diana',
    role: 'CMO',
    image: `${SUPABASE_STORAGE_URL}/diana-demin.png`
  },
  {
    id: 'sandra',
    name: 'Sandra Norberg',
    firstName: 'Sandra',
    role: 'Kommersiell chef',
    image: `${SUPABASE_STORAGE_URL}/sandra-norberg.png`
  },
  {
    id: 'christian',
    name: 'Christian von Essen',
    firstName: 'Christian',
    role: 'Redaktör',
    image: `${SUPABASE_STORAGE_URL}/christian-von-essen.png`
  },
  {
    id: 'isak',
    name: 'Isak Skogstad',
    firstName: 'Isak',
    role: 'Produkt',
    image: `${SUPABASE_STORAGE_URL}/Isak%20Skogstad.png`
  }
]

const ScrambleText = ({ text, active }: { text: string; active: boolean }) => {
  const [display, setDisplay] = useState(text)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$"

  useEffect(() => {
    if (!active) { setDisplay(text); return }
    let iteration = 0
    const interval = setInterval(() => {
      setDisplay(text.split("").map((letter, index) => {
        if (index < iteration) return text[index]
        return chars[Math.floor(Math.random() * chars.length)]
      }).join(""))
      if (iteration >= text.length) clearInterval(interval)
      iteration += 1 / 3
    }, 30)
    return () => clearInterval(interval)
  }, [active, text])

  return <span className="font-body tracking-wide">{display}</span>
}

function LoginContent() {
  const [mounted, setMounted] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<typeof TEAM_MEMBERS[0] | null>(null)
  const [hoveredProfileId, setHoveredProfileId] = useState<string | null>(null)
  const [heroRect, setHeroRect] = useState<DOMRect | null>(null)
  const [loginState, setLoginState] = useState<'idle' | 'loading' | 'success'>('idle')

  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  useEffect(() => {
    setMounted(true)
    const updateTheme = () => {
      const date = new Date()
      const minutes = date.getHours() * 60 + date.getMinutes()
      const t = minutes / 1440
      const brightness = (1 - Math.cos(t * 2 * Math.PI)) / 2
      const lerp = (s: number, e: number, a: number) => Math.round(s + (e - s) * a)

      const bgVal = lerp(5, 230, brightness)
      const textVal = lerp(255, 26, brightness)
      const spotVal = lerp(255, 0, brightness)
      const blobOp = 0.6 - (0.3 * brightness)

      document.documentElement.style.setProperty('--bg-dynamic', `rgb(${bgVal}, ${bgVal}, ${bgVal})`)
      document.documentElement.style.setProperty('--text-dynamic', `rgb(${textVal}, ${textVal}, ${textVal})`)
      document.documentElement.style.setProperty('--spotlight-color', `rgba(${spotVal}, ${spotVal}, ${spotVal}, 0.04)`)
      document.documentElement.style.setProperty('--blob-opacity', blobOp.toString())
    }

    updateTheme()
    const interval = setInterval(updateTheme, 60000)

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      clearInterval(interval)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const handleProfileClick = (profile: typeof TEAM_MEMBERS[0], e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHeroRect(rect)
    setSelectedProfile(profile)
  }

  const handleLogin = async () => {
    setLoginState('loading')
    const result = await signIn('slack', { redirect: false, callbackUrl })
    if (result?.ok) {
      setLoginState('success')
      setTimeout(() => window.location.href = callbackUrl, 800)
    } else {
      setLoginState('idle')
    }
  }

  const getPositionStyle = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      '--x': `${Math.cos(angle) * 30}vw`,
      '--y': `${Math.sin(angle) * 22}vh`,
      '--x-mob': `${Math.cos(angle) * 38}vw`,
      '--y-mob': `${Math.sin(angle) * 28}vh`,
    } as React.CSSProperties
  }

  const isImploding = selectedProfile !== null

  return (
    <>
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="liquid">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" />
            <feGaussianBlur stdDeviation="1" />
          </filter>
        </defs>
      </svg>

      <div className="h-[100dvh] w-full relative flex flex-col items-center justify-center overflow-hidden bg-[var(--bg-dynamic)] text-[var(--text-dynamic)]">

        {/* Liquid background blobs */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ filter: 'url(#liquid)', opacity: 'var(--blob-opacity)' }}>
          <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-blue-600/20 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-purple-600/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-5s' }} />
        </div>

        {/* Spotlight overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-[2]"
          style={{ background: 'radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), var(--spotlight-color), transparent 40%)' }}
        />

        {/* Logo */}
        <div className={`relative z-10 pointer-events-none transition-all duration-1000 ${isImploding || loginState === 'success' ? 'opacity-0 translate-y-[-50px]' : 'opacity-100'}`}>
          <h1
            className="tracking-tighter flex flex-col items-center leading-[0.85] select-none font-black"
            style={{
              fontSize: 'clamp(3rem, 10vw, 8rem)',
              textShadow: '0 0 40px rgba(125,125,125,0.1), 4px 4px 0px rgba(0,0,0,0.1)'
            }}
          >
            <span className={`transition-transform duration-700 delay-100 ${mounted ? 'translate-y-0' : 'translate-y-[100%]'}`}>LOOP</span>
            <span className={`transition-transform duration-700 delay-200 ${mounted ? 'translate-y-0' : 'translate-y-[100%]'}`}>DESK</span>
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm backdrop-blur-sm">
            {error === 'AccessDenied' ? 'Du har inte behörighet att logga in.' : 'Ett fel uppstod vid inloggning.'}
          </div>
        )}

        {/* Team member profiles in circle */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="relative w-full h-full">
            {TEAM_MEMBERS.map((member, index) => {
              const posStyles = getPositionStyle(index, TEAM_MEMBERS.length)
              const isSelected = selectedProfile?.id === member.id
              const isBlurred = hoveredProfileId && hoveredProfileId !== member.id

              if (selectedProfile && !isSelected) return null
              if (isSelected) return null

              return (
                <button
                  key={member.id}
                  onClick={(e) => handleProfileClick(member, e)}
                  onMouseEnter={() => setHoveredProfileId(member.id)}
                  onMouseLeave={() => setHoveredProfileId(null)}
                  className={`
                    absolute group outline-none pointer-events-auto cursor-pointer
                    transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    ${isBlurred ? 'opacity-20 blur-sm scale-90' : 'opacity-100 blur-0 scale-100'}
                    ${mounted ? 'opacity-100' : 'opacity-0'}
                  `}
                  style={{
                    ...posStyles,
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + var(--x-mob)), calc(-50% + var(--y-mob)))`,
                    transitionDelay: `${index * 50}ms`,
                  }}
                >
                  <div className="relative w-[16vw] h-[16vw] md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full transition-transform duration-300 ease-out group-hover:scale-110 group-active:scale-95 ring-1 ring-black/10 group-hover:ring-current bg-black/5 overflow-hidden">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                      loading="eager"
                    />
                  </div>

                  <div className={`
                    absolute top-full mt-4 left-1/2 -translate-x-1/2 text-center pointer-events-none w-40
                    transition-all duration-300
                    ${hoveredProfileId === member.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
                  `}>
                    <div
                      className="inline-block backdrop-blur-md px-3 py-1 rounded-full border text-xs"
                      style={{
                        backgroundColor: 'rgba(125,125,125,0.1)',
                        borderColor: 'rgba(125,125,125,0.2)'
                      }}
                    >
                      <ScrambleText text={member.firstName} active={hoveredProfileId === member.id} />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedProfile && heroRect && (
          <LoginModal
            profile={selectedProfile}
            heroRect={heroRect}
            onClose={() => setSelectedProfile(null)}
            onLogin={handleLogin}
            loginState={loginState}
          />
        )}
      </div>
    </>
  )
}

interface LoginModalProps {
  profile: typeof TEAM_MEMBERS[0]
  heroRect: DOMRect
  onClose: () => void
  onLogin: () => void
  loginState: 'idle' | 'loading' | 'success'
}

const LoginModal = ({ profile, heroRect, onClose, onLogin, loginState }: LoginModalProps) => {
  const [animateIn, setAnimateIn] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (imgRef.current && heroRect) {
      const startX = heroRect.left + heroRect.width/2 - window.innerWidth/2
      const startY = heroRect.top + heroRect.height/2 - window.innerHeight/2

      imgRef.current.style.transform = `translate(${startX}px, ${startY}px) scale(0.3)`
      imgRef.current.style.transition = 'none'
      imgRef.current.offsetHeight

      requestAnimationFrame(() => {
        if (imgRef.current) {
          imgRef.current.style.transition = 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
          imgRef.current.style.transform = loginState === 'success'
            ? 'scale(50)'
            : 'translate(0, 0) scale(1)'
        }
      })
    }
    setAnimateIn(true)
  }, [heroRect, loginState])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 10) return 'God morgon'
    if (hour < 18) return 'Hej'
    return 'God kväll'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-xl transition-opacity duration-500"
        style={{ backgroundColor: 'var(--bg-dynamic)', opacity: 0.85 }}
        onClick={loginState !== 'loading' ? onClose : undefined}
      />

      <div className="relative flex flex-col items-center w-full max-w-sm pointer-events-none">
        <div
          ref={imgRef}
          className="relative w-32 h-32 mb-8 rounded-full shadow-2xl overflow-hidden ring-4 ring-current z-20"
        >
          <img
            src={profile.image}
            alt={profile.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <div className={`flex flex-col items-center transition-all duration-500 pointer-events-auto ${loginState === 'success' ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <h2 className={`font-body font-bold text-4xl mb-2 transition-all duration-500 delay-100 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {getGreeting()}, {profile.firstName}
          </h2>
          <p className={`text-sm mb-12 font-body opacity-60 transition-all duration-500 delay-200 ${animateIn ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {profile.role}
          </p>

          <button
            onClick={onLogin}
            disabled={loginState === 'loading'}
            className={`
              relative group overflow-hidden rounded-full font-medium transition-all duration-500 ease-out
              ${loginState === 'loading' ? 'w-12 h-12 text-transparent' : 'w-64 h-14 hover:scale-105 active:scale-95'}
            `}
            style={{
              backgroundColor: 'var(--text-dynamic)',
              color: 'var(--bg-dynamic)'
            }}
          >
            <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 font-slack font-black text-lg tracking-wide ${loginState === 'loading' ? 'opacity-0' : 'opacity-100'}`}>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
              </svg>
              Logga in
            </span>
            {loginState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={loginState !== 'idle'}
            className={`mt-6 text-xs font-mono hover:opacity-100 transition-opacity ${animateIn ? 'opacity-60' : 'opacity-0'}`}
          >
            AVBRYT
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="h-[100dvh] w-full flex items-center justify-center bg-[var(--bg-dynamic)]">
        <div className="animate-pulse font-black text-4xl opacity-20">LOOPDESK</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
