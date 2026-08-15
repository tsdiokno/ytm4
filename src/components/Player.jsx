import React, { useEffect, useRef } from 'react';

const PLAYER_ELEMENT_ID = 'yt-player-mount';

export const Player = React.memo(function Player({ isHost, onInitPlayer }) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isHost && !initializedRef.current) {
      initializedRef.current = true;
      // Pass the string ID so YT.Player attaches reliably
      onInitPlayer(PLAYER_ELEMENT_ID);
    }
  }, [isHost, onInitPlayer]);

  return (
    /*
     * Always render this container — never conditionally unmount it.
     * YT.Player replaces the #yt-player-mount div with an <iframe> in-place.
     * Unmounting would destroy the iframe and break the player instance.
     * We hide it via CSS when the user is not the host.
     */
    <div className={`w-full max-w-3xl mx-auto mb-6 ${isHost ? 'block' : 'hidden'}`}>
      <div className="bg-zinc-900 border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl p-2.5 sm:p-3">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
          {/* Named anchor for YT.Player — never touched by React after mount */}
          <div id={PLAYER_ELEMENT_ID} className="w-full h-full" />

          {/* Transparent click-shield so the app's host controls own all interactions */}
          <div className="absolute inset-0 z-10 cursor-default" />
        </div>
      </div>
    </div>
  );
});
