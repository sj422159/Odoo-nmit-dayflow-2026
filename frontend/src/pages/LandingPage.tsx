import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '@/components/landing/Navbar'
import HeroSection from '@/components/landing/HeroSection'
import ClientLogos from '@/components/landing/ClientLogos'
import ProductSuite from '@/components/landing/ProductSuite'
import AgenticAI from '@/components/landing/AgenticAI'
import Industries from '@/components/landing/Industries'
import WhyZimyo from '@/components/landing/WhyZimyo'
import ROICalculator from '@/components/landing/ROICalculator'
import Testimonials from '@/components/landing/Testimonials'
import CTABanner from '@/components/landing/CTABanner'
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
      <ClientLogos />
      <ProductSuite onOpenDemo={() => openDemoModal()} />
      <AgenticAI />
      <Industries />
      <WhyZimyo />
      <ROICalculator onOpenDemo={() => openDemoModal()} />
      <Testimonials />
      <CTABanner onOpenDemo={() => openDemoModal()} />
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
