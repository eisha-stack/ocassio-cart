import { ChatWindow } from '@/components/chat/chat-window';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-bg p-4 sm:p-8">
      <ChatWindow />
    </main>
  );
}
