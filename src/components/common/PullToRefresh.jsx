import { useState, useRef } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);

  const onTouchStart = (e) => {
    // Only start if scrolled to top
    if (window.scrollY > 0) return;
    const scrollContainer = e.currentTarget.closest('.overflow-y-auto');
    if (scrollContainer && scrollContainer.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    active.current = true;
  };

  const onTouchMove = (e) => {
    if (!active.current || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      // Dampened pull
      const damped = Math.min(MAX_PULL, dy * 0.5);
      setPull(damped);
    }
  };

  const onTouchEnd = async () => {
    if (!active.current) return;
    active.current = false;
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const ready = pull >= THRESHOLD;

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden text-muted-foreground transition-all"
        style={{ height: pull, opacity: pull / THRESHOLD }}
      >
        {refreshing ? (
          <Loader2 size={18} className="animate-spin text-gold" />
        ) : (
          <ArrowDown
            size={18}
            className={`transition-transform ${ready ? 'rotate-180 text-gold' : ''}`}
          />
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
