import { ChatWindow } from '@/components/chat/chat-window';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">OccasioCart</h1>
      <ChatWindow />
    </main>
  );
}
