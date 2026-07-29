import { LayoutDashboard, Globe, MessageSquare, User } from 'lucide-react';

const TABS = [
  { id: 'dashboard', icon: LayoutDashboard, label: '儀表板' },
  { id: 'globe', icon: Globe, label: '地球' },
  { id: 'chat', icon: MessageSquare, label: '聊天' },
  { id: 'profile', icon: User, label: '個人' },
];

export default function MobileNav({ activeTab, onTabChange, unreadChat }) {
  return (
    <nav className="mobile-nav">
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`mobile-nav-btn${activeTab === id ? ' active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          <Icon size={22} />
          <span>{label}</span>
          {id === 'chat' && unreadChat > 0 && (
            <span className="mobile-nav-badge">{unreadChat}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
