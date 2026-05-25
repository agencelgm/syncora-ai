import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Sticky header for child screens with a visible Back button.
 * Usage: <StickyHeader title="Mon écran" />
 * Props:
 *  - title: string
 *  - onBack?: () => void  (defaults to navigate(-1))
 *  - right?: ReactNode    (optional right-side action)
 */
export default function StickyHeader({ title, onBack, right }) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div
      className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border -mx-4 px-4"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-14">
        <button
          onClick={handleBack}
          aria-label="Retour"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-foreground"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-base font-semibold text-foreground truncate px-2">{title}</h1>
        <div className="min-w-[44px] min-h-[44px] flex items-center justify-end">
          {right}
        </div>
      </div>
    </div>
  );
}