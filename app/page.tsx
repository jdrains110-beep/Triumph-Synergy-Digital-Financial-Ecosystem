import { redirect } from 'next/navigation';

export default function RootPage() {
  // Server-side redirect to chat
  redirect('/chat');
}

    </main>
  );
}
