import {
  BookText,
  Clock,
  Layers,
  Menu,
  MessageSquareShare,
  RotateCcw,
  Users,
  X,
} from 'lucide-react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  templateCount: number;
  groupCount: number;
  contactCount: number;
  scheduledCount: number;
  activeStatusCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
  onResetDemoData: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  templateCount,
  groupCount,
  contactCount,
  scheduledCount,
  activeStatusCount,
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
  onResetDemoData,
}: SidebarProps) {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    count?: number;
    icon: typeof MessageSquareShare;
  }> = [
    { id: 'studio', label: 'Status Studio', icon: MessageSquareShare },
    { id: 'templates', label: 'Template Library', count: templateCount, icon: BookText },
    { id: 'groups', label: 'Contact Groups', count: groupCount, icon: Layers },
    { id: 'contacts', label: 'Contacts Directory', count: contactCount, icon: Users },
    {
      id: 'history',
      label: 'Schedule & History',
      count: scheduledCount + activeStatusCount,
      icon: Clock,
    },
  ];

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-white border-r border-slate-200">
      <div>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CircleStatus
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? 'text-teal-700' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-teal-700 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 p-4 space-y-3">
        <div className="text-xs text-slate-500 leading-relaxed">
          <div className="font-medium text-slate-700">Audience Summary</div>
          <div className="mt-1 tabular-nums">
            {contactCount} contacts · {groupCount} groups · {scheduledCount} scheduled
          </div>
        </div>
        <button
          type="button"
          onClick={onResetDemoData}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset Sample Data</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}
