import { ArrowRight, CalendarClock, Search, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { STATUS_TEMPLATES, TEMPLATE_CATEGORIES } from '../data/templates';
import type { ContactGroup, StatusTemplate, TemplateCategory } from '../types';

interface TemplatesViewProps {
  groups: ContactGroup[];
  selectedGroupIds: string[];
  onApplyTemplate: (
    template: StatusTemplate,
    options: {
      applySuggestedGroups: boolean;
      openSchedule: boolean;
      generateAiBackdrop?: boolean;
    }
  ) => void;
}

export function TemplatesView({
  groups,
  selectedGroupIds,
  onApplyTemplate,
}: TemplatesViewProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [keepCurrentGroups, setKeepCurrentGroups] = useState(false);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return STATUS_TEMPLATES.filter((tpl) => {
      const matchesCat =
        activeCategory === 'All' || tpl.category === activeCategory;
      const matchesQuery =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.message.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  const currentGroupNames = groups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => g.name);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search birthday, holiday, or greeting templates..."
              aria-label="Search status templates"
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepCurrentGroups}
              onChange={(e) => setKeepCurrentGroups(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            />
            <span>
              Keep my current selection (
              {currentGroupNames.length > 0
                ? currentGroupNames.join(', ')
                : 'none'}
              )
            </span>
          </label>
        </div>

        <div
          role="group"
          aria-label="Template occasion categories"
          className="flex flex-wrap items-center gap-1.5"
        >
          {TEMPLATE_CATEGORIES.map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={active}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center space-y-3">
          <div className="text-sm font-medium text-slate-900">
            No templates match "{searchQuery}"
          </div>
          <p className="text-xs text-slate-500">
            Try clearing your search or switching back to all occasion categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('All');
            }}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTemplates.map((tpl) => (
            <article
              key={tpl.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div>
                <div
                  className="px-5 py-6 text-white min-h-[132px] flex items-center"
                  style={{ backgroundColor: tpl.bgColorHex }}
                >
                  <p
                    className={`text-sm leading-relaxed font-medium ${
                      tpl.fontStyle === 'serif'
                        ? 'font-serif'
                        : tpl.fontStyle === 'mono'
                          ? 'font-mono text-xs'
                          : 'font-display'
                    }`}
                  >
                    "{tpl.message}"
                  </p>
                </div>

                <div className="p-5 space-y-1.5">
                  <div className="text-xs text-slate-500">
                    {tpl.category} · Suggested: {tpl.suggestedGroupNames.join(', ')}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {tpl.title}
                  </h3>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyTemplate(tpl, {
                        applySuggestedGroups: !keepCurrentGroups,
                        openSchedule: false,
                      })
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors whitespace-nowrap"
                  >
                    <span>Use Template</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onApplyTemplate(tpl, {
                        applySuggestedGroups: !keepCurrentGroups,
                        openSchedule: true,
                      })
                    }
                    aria-label={`Schedule ${tpl.title}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Schedule</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onApplyTemplate(tpl, {
                      applySuggestedGroups: !keepCurrentGroups,
                      openSchedule: false,
                      generateAiBackdrop: true,
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-colors whitespace-nowrap"
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Use with AI Background</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
