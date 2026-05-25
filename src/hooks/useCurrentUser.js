import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Cache global pour éviter de re-fetch user à chaque montage de composant
let cachedUser = null;
let pending = null;

export async function getCurrentUser() {
  if (cachedUser) return cachedUser;
  if (pending) return pending;
  pending = base44.auth.me().then(u => {
    cachedUser = u;
    pending = null;
    return u;
  }).catch(() => {
    pending = null;
    return null;
  });
  return pending;
}

export default function useCurrentUser() {
  const [user, setUser] = useState(cachedUser);

  useEffect(() => {
    let mounted = true;
    getCurrentUser().then(u => {
      if (mounted) setUser(u);
    });
    return () => { mounted = false; };
  }, []);

  return user;
}