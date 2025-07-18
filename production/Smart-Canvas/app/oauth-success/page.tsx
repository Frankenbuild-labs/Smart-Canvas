'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthSuccessPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth connection...');
  const router = useRouter();

  useEffect(() => {
    // Check if this is an OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`OAuth Error: ${error}`);
      return;
    }

    if (code) {
      setStatus('success');
      setMessage('Authentication successful! You can close this window.');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        window.close();
      }, 3000);
    } else {
      setStatus('success');
      setMessage('Authentication successful! You can close this window.');
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    }
  }, []);

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-white mb-2">Processing...</h1>
            <p className="text-white/70">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-green-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Success!</h1>
            <p className="text-white/70 mb-6">{message}</p>
            <button
              onClick={handleGoBack}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back to App
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
            <p className="text-white/70 mb-6">{message}</p>
            <button
              onClick={handleGoBack}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Go Back to App
            </button>
          </>
        )}
      </div>
    </div>
  );
}
