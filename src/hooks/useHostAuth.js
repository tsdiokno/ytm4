import { useState, useEffect } from 'react';

const HOST_STORAGE_KEY = 'crowdq_host_authenticated';
const DEFAULT_HOST_PASSWORD = '12345';

export function useHostAuth(notify) {
  const [isHost, setIsHost] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Restore host session from localStorage if saved
  useEffect(() => {
    const saved = localStorage.getItem(HOST_STORAGE_KEY);
    if (saved === 'true') {
      setIsHost(true);
    }
  }, []);

  const loginAsHost = (enteredPassword) => {
    if (enteredPassword.trim() === DEFAULT_HOST_PASSWORD) {
      setIsHost(true);
      localStorage.setItem(HOST_STORAGE_KEY, 'true');
      setIsModalOpen(false);
      notify?.('Host mode unlocked! 🎧 Central playback controls are active.', 'success');
      return true;
    } else {
      notify?.('Incorrect host password', 'error');
      return false;
    }
  };

  const logoutHost = () => {
    setIsHost(false);
    localStorage.removeItem(HOST_STORAGE_KEY);
    notify?.('Exited host mode. Switched to Guest View.', 'info');
  };

  const openAuthModal = () => setIsModalOpen(true);
  const closeAuthModal = () => setIsModalOpen(false);

  return {
    isHost,
    isModalOpen,
    openAuthModal,
    closeAuthModal,
    loginAsHost,
    logoutHost,
  };
}
