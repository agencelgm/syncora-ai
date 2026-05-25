import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, CheckSquare, Target, BookOpen, MessageCircle, Settings } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: "Aujourd'hui" },
  { path: '/tasks', icon: CheckSquare, label: 'Tâches' },
  { path: '/objectives', icon: Target, label: 'Objectifs' },
  { path: '/coach', icon: MessageCircle, label: 'Coach IA' },
  { path: '/settings', icon: Settings, label: 'Profil' },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path} className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200">
                <Icon
                  size={20}
                  className={isActive ? 'text-gold' : 'text-muted-foreground'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-gold' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}