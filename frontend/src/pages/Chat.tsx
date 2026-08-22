import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCheck,
  Megaphone,
  MessageSquare,
  Search,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react'

import Swal from 'sweetalert2'
import { api } from '@/api/client'
import type { ChatChannelOut, ChatMessageCreate, ChatMessageOut } from '@/api/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/PageHeader'
import { Button, Card, EmptyState, Input, Pill, Select, Skeleton } from '@/components/ui/Primitives'
import { fmtDate, initials, titleCase } from '@/lib/format'

const DEPARTMENTS = ['ALL', 'Engineering', 'Design', 'Human Resources', 'Sales', 'Finance', 'Operations']

export default function Chat() {
  const { session, isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedChannel = searchParams.get('channel')

  const [channels, setChannels] = useState<ChatChannelOut[]>([])
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelOut | null>(null)
  const [messages, setMessages] = useState<ChatMessageOut[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  // Form Composer States
  const [inputText, setInputText] = useState('')
  const [msgType, setMsgType] = useState<'DIRECT' | 'ANNOUNCEMENT'>('DIRECT')
  const [targetDept, setTargetDept] = useState('ALL')

  const chatBottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // Load Channels
  const loadChannels = useCallback(async () => {
    try {
      const data = await api.get<ChatChannelOut[]>('/chat/channels')
      setChannels(data)
      setLoadingChannels(false)

      if (!selectedChannel) {
        if (requestedChannel) {
          const match = data.find((c) => c.id === requestedChannel)
          if (match) setSelectedChannel(match)
          else if (data.length) setSelectedChannel(data[0])
        } else if (data.length) {
          setSelectedChannel(data[0])
        }
      }
    } catch {
      setLoadingChannels(false)
    }
  }, [requestedChannel, selectedChannel])

  // Load Messages for Active Channel
  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true)
    try {
      const msgs = await api.get<ChatMessageOut[]>(`/chat/messages/${channelId}`)
      setMessages(msgs)
      setLoadingMessages(false)
      scrollToBottom()

      // Mark channel read on server and update local state without recursive event dispatch
      await api.post(`/chat/read/${channelId}`)
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, unread_count: 0 } : c)),
      )
    } catch {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  useEffect(() => {
    if (selectedChannel) {
      loadMessages(selectedChannel.id)
      setSearchParams({ channel: selectedChannel.id }, { replace: true })
    }
  }, [selectedChannel, loadMessages, setSearchParams])

  // Controlled 10-second background refresh interval for chat & announcements
  useEffect(() => {
    const interval = setInterval(() => {
      loadChannels()
      if (selectedChannel) {
        api.get<ChatMessageOut[]>(`/chat/messages/${selectedChannel.id}`).then((msgs) => {
          setMessages(msgs)
        }).catch(() => {})
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [loadChannels, selectedChannel])


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !selectedChannel) return

    setSending(true)
    try {
      const isAnnounce = msgType === 'ANNOUNCEMENT' && isAdmin

      const payload: ChatMessageCreate = {
        message_type: isAnnounce ? 'ANNOUNCEMENT' : 'DIRECT',
        content: inputText.trim(),
        recipient_type: isAnnounce ? 'ALL' : selectedChannel.contact_type,
        recipient_id: isAnnounce ? null : selectedChannel.contact_id,
        target_department: isAnnounce && targetDept !== 'ALL' ? targetDept : null,
      }

      await api.post<ChatMessageOut>('/chat/messages', payload)
      setInputText('')
      setSending(false)

      Swal.fire({
        icon: 'success',
        title: isAnnounce ? 'Announcement Broadcasted!' : 'Message Sent',
        text: isAnnounce ? 'Sent to all targeted employee notifications & chat feeds.' : 'Delivered directly to contact.',
        timer: 1800,
        showConfirmButton: false,
      })

      // Refresh stream & channel unread badges
      loadChannels()
      loadMessages(selectedChannel.id)
    } catch (err) {
      setSending(false)
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send',
        text: 'Something went wrong delivering your message. Try again.',
        confirmButtonColor: '#0284c7',
      })
    }
  }

  const filteredChannels = channels.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.subtitle && c.subtitle.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <>
      <PageHeader
        title="Messages & Announcements"
        description="Private 1-on-1 conversations with HR & broad company updates."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[22rem_1fr] lg:items-start min-h-[38rem]">
        {/* Left Column: Channels & Contacts Sidebar */}
        <Card className="flex flex-col h-[38rem] overflow-hidden">
          <div className="p-4 border-b border-slate-150 bg-slate-50/70 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-away pointer-events-none" />
              <Input
                placeholder="Search messages & HR contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {loadingChannels ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredChannels.length === 0 ? (
              <EmptyState title="No contacts found" description="No channels matching your search term." />
            ) : (
              filteredChannels.map((channel) => {
                const isActive = selectedChannel?.id === channel.id
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-flow-50/90 text-flow-900 border border-flow-200/80 shadow-xs'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {/* Avatar / Icon */}
                    <div className="relative shrink-0 mt-0.5">
                      {channel.is_announcement ? (
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 font-bold shadow-2xs border border-amber-200">
                          <Megaphone className="h-5 w-5" />
                        </span>
                      ) : channel.avatar_url ? (
                        <img
                          src={channel.avatar_url}
                          alt={channel.title}
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-150"
                        />
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 font-bold text-slate-700 text-sm ring-2 ring-slate-150">
                          {initials(channel.title)}
                        </span>
                      )}
                    </div>

                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-ink truncate flex items-center gap-1">
                          {channel.title}
                          {channel.role === 'HR_ADMIN' && (
                            <Shield className="h-3 w-3 text-flow-600 shrink-0" />
                          )}
                        </p>

                        {channel.last_message_at && (
                          <span className="text-[10px] text-away shrink-0">
                            {fmtDate(channel.last_message_at, 'HH:mm')}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-away truncate mt-0.5 font-medium">{channel.last_message}</p>

                      <div className="flex items-center gap-2 mt-1">
                        {channel.subtitle && (
                          <span className="text-[10px] font-semibold text-slate-500 truncate">{channel.subtitle}</span>
                        )}
                        {channel.unread_count > 0 && (
                          <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-flow-600 px-1 text-[10px] font-bold text-white shadow-xs">
                            {channel.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>

        {/* Right Column: Chat Conversation Stream & Composer */}
        <Card className="flex flex-col h-[38rem] overflow-hidden">
          {selectedChannel ? (
            <>
              {/* Active Conversation Header */}
              <div className="flex items-center justify-between border-b border-slate-150 px-6 py-3.5 bg-slate-50/80">
                <div className="flex items-center gap-3">
                  {selectedChannel.is_announcement ? (
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700 shadow-xs border border-amber-200">
                      <Megaphone className="h-5 w-5" />
                    </span>
                  ) : selectedChannel.avatar_url ? (
                    <img
                      src={selectedChannel.avatar_url}
                      alt={selectedChannel.title}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-flow-100"
                    />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-flow-50 text-flow-700 font-bold text-sm ring-2 ring-flow-100">
                      {initials(selectedChannel.title)}
                    </span>
                  )}
                  <div>
                    <h3 className="font-bold text-ink text-sm flex items-center gap-1.5">
                      {selectedChannel.title}
                      {selectedChannel.is_announcement ? (
                        <Pill tone="bg-amber-100 text-amber-800">Broadcast Channel</Pill>
                      ) : (
                        <Pill tone="bg-slate-150 text-ink-600">{titleCase(selectedChannel.role)}</Pill>
                      )}
                    </h3>
                    <p className="text-xs text-away mt-0.5">{selectedChannel.subtitle || 'Active Conversation'}</p>
                  </div>
                </div>
              </div>

              {/* Message Feed Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {loadingMessages ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-16 w-2/3 ml-auto" />
                    <Skeleton className="h-16 w-3/4" />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    title="No messages yet"
                    description={
                      selectedChannel.is_announcement
                        ? 'HR Officers have not published any announcements.'
                        : 'Send a private message to start the conversation.'
                    }
                    icon={<MessageSquare className="h-8 w-8 text-away" />}
                  />
                ) : (
                  messages.map((msg) => {
                    const currentUserId = session?.user?.id ?? null
                    const isSelf = msg.sender_id === currentUserId
                    const isAnnounce = msg.message_type === 'ANNOUNCEMENT'

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isSelf ? 'items-end ml-auto' : 'items-start mr-auto'} space-y-1 max-w-[80%]`}
                      >
                        <div className={`flex items-center gap-1.5 text-[11px] text-away px-1 font-medium ${isSelf ? 'justify-end' : 'justify-start'}`}>
                          <span className="font-semibold text-slate-700">{isSelf ? 'You' : msg.sender_name}</span>
                          <span>·</span>
                          <span>{fmtDate(msg.created_at, 'HH:mm')}</span>
                        </div>

                        <div
                          className={`rounded-2xl p-3.5 shadow-xs space-y-1.5 transition-all ${
                            isAnnounce
                              ? 'bg-amber-50/95 border border-amber-200 text-amber-950 rounded-tl-xs'
                              : isSelf
                              ? 'bg-emerald-600 text-white font-medium shadow-emerald-600/10 rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                          }`}
                        >
                          {isAnnounce && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider pb-1 border-b border-amber-200/60">
                              <Megaphone className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>HR Announcement</span>
                              {msg.target_department && (
                                <Pill tone="bg-amber-200/70 text-amber-900">{msg.target_department}</Pill>
                              )}
                            </div>
                          )}

                          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                          <div className={`flex items-center justify-end text-[10px] pt-0.5 ${isSelf ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {msg.is_read ? (
                              <span className={`flex items-center gap-1 font-semibold ${isSelf ? 'text-emerald-200' : 'text-emerald-600'}`}>
                                <CheckCheck className="h-3.5 w-3.5" /> Read
                              </span>
                            ) : (
                              <span>Sent</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })

                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Message Composer Footer */}
              <form onSubmit={handleSend} className="p-4 border-t border-slate-150 bg-white space-y-3">
                {/* HR Mode Switcher (Direct vs Announcement) */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-flow-600" /> Mode:
                      </span>
                      <button
                        type="button"
                        onClick={() => setMsgType('DIRECT')}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          msgType === 'DIRECT'
                            ? 'bg-flow-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        💬 Direct Message
                      </button>
                      <button
                        type="button"
                        onClick={() => setMsgType('ANNOUNCEMENT')}
                        className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                          msgType === 'ANNOUNCEMENT'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        📢 HR Announcement
                      </button>
                    </div>

                    {msgType === 'ANNOUNCEMENT' && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600">Target Dept:</span>
                        <Select
                          value={targetDept}
                          onChange={(e) => setTargetDept(e.target.value)}
                          className="py-1 text-xs w-36"
                        >
                          {DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      msgType === 'ANNOUNCEMENT'
                        ? 'Type company announcement to broadcast to all notifications & feeds...'
                        : `Message ${selectedChannel.title}...`
                    }
                    className="text-xs py-2.5 flex-1"
                    required
                  />
                  <Button
                    type="submit"
                    loading={sending}
                    className={`flex items-center gap-1.5 text-xs font-bold shadow-xs px-5 py-2.5 ${
                      msgType === 'ANNOUNCEMENT' ? 'bg-amber-600 hover:bg-amber-700' : ''
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span>{msgType === 'ANNOUNCEMENT' ? 'Broadcast' : 'Send'}</span>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <EmptyState
              title="Select a contact"
              description="Choose a conversation from the left to start messaging."
              icon={<MessageSquare className="h-10 w-10 text-away" />}
            />
          )}
        </Card>
      </div>
    </>
  )
}
