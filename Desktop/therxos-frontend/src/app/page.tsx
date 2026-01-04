'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard (which will redirect to login if not authenticated)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14b8a6] mx-auto"></div>
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
