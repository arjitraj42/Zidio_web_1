'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  Check,
  Calendar,
  Tag,
  Smile,
  Meh,
  Frown,
  Inbox,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

const SENTIMENT_OPTIONS = [
  { value: 'POS', label: 'Positive', icon: Smile, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  { value: 'NEU', label: 'Neutral', icon: Meh, color: 'text-amber-700 bg-amber-50 border-amber-100' },
  { value: 'NEG', label: 'Negative', icon: Frown, color: 'text-rose-700 bg-rose-50 border-rose-100' },
];

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New', color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  { value: 'REVIEWED', label: 'Reviewed', color: 'text-amber-700 bg-amber-50 border-amber-100' },
  { value: 'ACTIONED', label: 'Actioned', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
];

const CHANNEL_LABELS = {
  support_ticket: 'Support Ticket',
  app_review: 'App Review',
  nps_survey: 'NPS Survey',
  sales_note: 'Sales Note',
  community_post: 'Community Post',
};

export function FilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  availableChannels = [],
  availableThemes = [],
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  // Format channel list for dropdown
  const allChannels = Array.from(new Set([...Object.keys(CHANNEL_LABELS), ...availableChannels]));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedChannels = filters.channel ? filters.channel.split(',').filter(Boolean) : [];
  const selectedSentiments = filters.sentiment ? filters.sentiment.split(',').filter(Boolean) : [];
  const selectedStatuses = filters.status ? filters.status.split(',').filter(Boolean) : [];
  const selectedThemeId = filters.themeId || '';
  const dateFrom = filters.dateFrom || '';
  const dateTo = filters.dateTo || '';

  const toggleMultiSelect = (key, currentList, value) => {
    let updated;
    if (currentList.includes(value)) {
      updated = currentList.filter((item) => item !== value);
    } else {
      updated = [...currentList, value];
    }
    onFilterChange(key, updated.join(','));
  };

  // Determine active filter counts
  const hasActiveFilters =
    selectedChannels.length > 0 ||
    selectedSentiments.length > 0 ||
    selectedStatuses.length > 0 ||
    Boolean(selectedThemeId) ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const selectedTheme = availableThemes.find((t) => t.id === selectedThemeId);

  return (
    <div ref={containerRef} className="relative z-20 bg-white border border-gray-200/80 rounded-2xl p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-indigo-500" />
          <span>Filter Feedback</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear all filters</span>
          </button>
        )}
      </div>

      {/* Filter Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3">
        {/* Channel Multi-Select Dropdown */}
        <div className="relative sm:col-span-1 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Channel</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedChannels.length > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/50 hover:border-gray-300'
            }`}
          >
            <span className="truncate">
              {selectedChannels.length === 0
                ? 'All Channels'
                : `${selectedChannels.length} Selected`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 ml-2 text-gray-400" />
          </button>

          {openDropdown === 'channel' && (
            <div className="absolute z-50 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 text-xs">
              <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">
                Select Channels
              </div>
              {allChannels.map((ch) => {
                const isChecked = selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleMultiSelect('channel', selectedChannels, ch)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-700 transition-colors"
                  >
                    <span>{CHANNEL_LABELS[ch] || ch}</span>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sentiment Multi-Select Dropdown */}
        <div className="relative sm:col-span-1 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Sentiment</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'sentiment' ? null : 'sentiment')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedSentiments.length > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/50 hover:border-gray-300'
            }`}
          >
            <span className="truncate">
              {selectedSentiments.length === 0
                ? 'All Sentiments'
                : `${selectedSentiments.length} Selected`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 ml-2 text-gray-400" />
          </button>

          {openDropdown === 'sentiment' && (
            <div className="absolute z-50 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 text-xs">
              <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">
                Select Sentiment
              </div>
              {SENTIMENT_OPTIONS.map((s) => {
                const isChecked = selectedSentiments.includes(s.value);
                const IconComponent = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleMultiSelect('sentiment', selectedSentiments, s.value)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`h-3.5 w-3.5 ${s.color.split(' ')[0]}`} />
                      <span>{s.label}</span>
                    </div>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Multi-Select Dropdown */}
        <div className="relative sm:col-span-1 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Status</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedStatuses.length > 0
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/50 hover:border-gray-300'
            }`}
          >
            <span className="truncate">
              {selectedStatuses.length === 0
                ? 'All Statuses'
                : `${selectedStatuses.length} Selected`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 ml-2 text-gray-400" />
          </button>

          {openDropdown === 'status' && (
            <div className="absolute z-50 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 text-xs">
              <div className="text-[10px] text-gray-400 font-semibold px-2 py-1 uppercase tracking-wider">
                Select Status
              </div>
              {STATUS_OPTIONS.map((st) => {
                const isChecked = selectedStatuses.includes(st.value);
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => toggleMultiSelect('status', selectedStatuses, st.value)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-700 transition-colors"
                  >
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${st.color}`}>
                      {st.label}
                    </span>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Single-Select Dropdown */}
        <div className="relative sm:col-span-1 lg:col-span-2">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Theme</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'theme' ? null : 'theme')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedThemeId
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100/50 hover:border-gray-300'
            }`}
          >
            <span className="truncate">
              {(() => {
                const matchedTheme = availableThemes.find((t) => t.id === selectedThemeId);
                return matchedTheme ? matchedTheme.name : 'All Themes';
              })()}
            </span>
            <ChevronDown className="h-3.5 w-3.5 ml-2 text-gray-400" />
          </button>

          {openDropdown === 'theme' && (
            <div className="absolute z-50 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 text-xs max-h-60 overflow-y-auto custom-scrollbar">
              <button
                type="button"
                onClick={() => {
                  onFilterChange('themeId', '');
                  setOpenDropdown(null);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-755 transition-colors"
              >
                <span>All Themes</span>
                {!selectedThemeId && <Check className="h-3.5 w-3.5 text-indigo-600" />}
              </button>
              {availableThemes.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onFilterChange('themeId', theme.id);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-left text-gray-755 transition-colors"
                  >
                    <span>{theme.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Date Range Picker (From - To) */}
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">Date Range</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch (err) {
                  console.warn('showPicker was blocked by the browser:', err);
                }
              }}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-xl focus:border-indigo-500 outline-none w-full cursor-pointer"
              title="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch (err) {
                  console.warn('showPicker was blocked by the browser:', err);
                }
              }}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-xs px-3 py-2 rounded-xl focus:border-indigo-500 outline-none w-full cursor-pointer"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-gray-100">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Active:
          </span>

          {selectedChannels.map((ch) => (
            <span
              key={ch}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
            >
              <span>Channel: {CHANNEL_LABELS[ch] || ch}</span>
              <button
                type="button"
                onClick={() =>
                  toggleMultiSelect('channel', selectedChannels, ch)
                }
                className="hover:text-indigo-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedSentiments.map((st) => (
            <span
              key={st}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100"
            >
              <span>
                Sentiment:{' '}
                {SENTIMENT_OPTIONS.find((s) => s.value === st)?.label || st}
              </span>
              <button
                type="button"
                onClick={() =>
                  toggleMultiSelect('sentiment', selectedSentiments, st)
                }
                className="hover:text-amber-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedStatuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100"
            >
              <span>
                Status:{' '}
                {STATUS_OPTIONS.find((s) => s.value === st)?.label || st}
              </span>
              <button
                type="button"
                onClick={() =>
                  toggleMultiSelect('status', selectedStatuses, st)
                }
                className="hover:text-purple-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedTheme && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-100">
              <Tag className="h-3 w-3 mr-0.5 text-emerald-600" />
              <span>Theme: {selectedTheme.name}</span>
              <button
                type="button"
                onClick={() => onFilterChange('themeId', '')}
                className="hover:text-emerald-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-100">
              <Calendar className="h-3 w-3 mr-0.5 text-cyan-600" />
              <span>
                Date: {dateFrom || '...'} to {dateTo || '...'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFilterChange('dateFrom', '');
                  onFilterChange('dateTo', '');
                }}
                className="hover:text-cyan-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

