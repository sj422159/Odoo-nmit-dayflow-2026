import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { api, tokens } from '@/api/client'
import type { ChatChannelOut } from '@/api/types'

export function HeaderChatButton() {
  const [totalUnread, setTotalUnread] = useState(0)

  const fetchUnread = async () => {
    if (!tokens.access()) return
    try {
      const channels = await api.get<ChatChannelOut[]>('/chat/channels')
      const count = channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0)
      setTotalUnread(count)
    } catch {
      // Ignore background fetch errors
    }
  }


  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 15000)

    const handleNewMsg = () => fetchUnread()
    window.addEventListener('dayflow:chat-event', handleNewMsg)

    return () => {
      clearInterval(interval)
      window.removeEventListener('dayflow:chat-event', handleNewMsg)
    }
  }, [])

  return (
    <Link
      to="/chat"
      title="Messages & Announcements"
      className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-ink-600 shadow-2xs hover:bg-slate-50 transition-colors"
    >
      <MessageSquare className="h-4 w-4 text-flow-600" />
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-bounce">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </Link>
  )
}
