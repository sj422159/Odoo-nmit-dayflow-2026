import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import AgenticAI from '@/components/landing/AgenticAI'
import WhyZimyo from '@/components/landing/WhyZimyo'
import ROICalculator from '@/components/landing/ROICalculator'
import Testimonials from '@/components/landing/Testimonials'
import Footer from '@/components/landing/Footer'
import DemoModal from '@/components/landing/DemoModal'
import ChatWidget from '@/components/landing/ChatWidget'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [prefillEmail, setPrefillEmail] = useState('')

  const openDemoModal = (email = '') => {
    setPrefillEmail(email)
    setIsDemoModalOpen(true)
  }

  const closeDemoModal = () => {
    setIsDemoModalOpen(false)
    setPrefillEmail('')
  }

  const handleLoginClick = () => {
    navigate('/signin')
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500 selection:text-white">
      <Navbar onOpenDemo={() => openDemoModal()} onLogin={handleLoginClick} />
      <HeroSection onOpenDemo={openDemoModal} />
      <AgenticAI />
      <WhyZimyo />
      <ROICalculator onOpenDemo={() => openDemoModal()} />
      <Testimonials />
      <Footer />
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={closeDemoModal}
        prefillEmail={prefillEmail}
      />
      <ChatWidget />
    </div>
  )
}
