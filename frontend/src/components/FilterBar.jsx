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
  { value: 'POS', label: 'Positive', icon: Smile, color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'NEU', label: 'Neutral', icon: Meh, color: 'text-amber-400 bg-amber-500/10' },
  { value: 'NEG', label: 'Negative', icon: Frown, color: 'text-rose-400 bg-rose-500/10' },
];

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' },
  { value: 'REVIEWED', label: 'Reviewed', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'ACTIONED', label: 'Actioned', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
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
    <div ref={containerRef} className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
          <Filter className="h-4 w-4 text-indigo-400" />
          <span>Filter Feedback</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors border border-rose-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear all filters</span>
          </button>
        )}
      </div>

      {/* Filter Options Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
        {/* Channel Multi-Select Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-gray-400 mb-1">Channel</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedChannels.length > 0
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-medium'
                : 'bg-gray-950/60 border-gray-800 text-gray-300 hover:border-gray-700'
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
            <div className="absolute z-50 mt-1.5 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 space-y-1 text-xs">
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-left text-gray-300 transition-colors"
                  >
                    <span>{CHANNEL_LABELS[ch] || ch}</span>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sentiment Multi-Select Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-gray-400 mb-1">Sentiment</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'sentiment' ? null : 'sentiment')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedSentiments.length > 0
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-medium'
                : 'bg-gray-950/60 border-gray-800 text-gray-300 hover:border-gray-700'
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
            <div className="absolute z-50 mt-1.5 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 space-y-1 text-xs">
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-left text-gray-300 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <IconComponent className={`h-3.5 w-3.5 ${s.color.split(' ')[0]}`} />
                      <span>{s.label}</span>
                    </div>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Multi-Select Dropdown */}
        <div className="relative">
          <label className="block text-[11px] font-medium text-gray-400 mb-1">Status</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-xl border transition-all ${
              selectedStatuses.length > 0
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-medium'
                : 'bg-gray-950/60 border-gray-800 text-gray-300 hover:border-gray-700'
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
            <div className="absolute z-50 mt-1.5 w-52 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 space-y-1 text-xs">
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
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-left text-gray-300 transition-colors"
                  >
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${st.color}`}>
                      {st.label}
                    </span>
                    {isChecked && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Single-Select Dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">Theme</label>
          <select
            value={selectedThemeId}
            onChange={(e) => onFilterChange('themeId', e.target.value)}
            className={`w-full text-xs px-3 py-2 rounded-xl border transition-all outline-none ${
              selectedThemeId
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-medium'
                : 'bg-gray-950/60 border-gray-800 text-gray-300 focus:border-indigo-500/50'
            }`}
          >
            <option value="" className="bg-gray-900 text-gray-300">
              All Themes
            </option>
            {availableThemes.map((theme) => (
              <option key={theme.id} value={theme.id} className="bg-gray-900 text-gray-300">
                {theme.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Picker (From - To) */}
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">Date Range</label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              className="bg-gray-950/60 border border-gray-800 text-gray-300 text-[11px] px-2 py-1.5 rounded-xl focus:border-indigo-500/50 outline-none"
              title="From Date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              className="bg-gray-950/60 border border-gray-800 text-gray-300 text-[11px] px-2 py-1.5 rounded-xl focus:border-indigo-500/50 outline-none"
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-gray-800/60">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            Active:
          </span>

          {selectedChannels.map((ch) => (
            <span
              key={ch}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
            >
              <span>Channel: {CHANNEL_LABELS[ch] || ch}</span>
              <button
                type="button"
                onClick={() =>
                  toggleMultiSelect('channel', selectedChannels, ch)
                }
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedSentiments.map((st) => (
            <span
              key={st}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30"
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
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedStatuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30"
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
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedTheme && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              <Tag className="h-3 w-3 mr-0.5 text-emerald-400" />
              <span>Theme: {selectedTheme.name}</span>
              <button
                type="button"
                onClick={() => onFilterChange('themeId', '')}
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              <Calendar className="h-3 w-3 mr-0.5 text-cyan-400" />
              <span>
                Date: {dateFrom || '...'} to {dateTo || '...'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFilterChange('dateFrom', '');
                  onFilterChange('dateTo', '');
                }}
                className="hover:text-white"
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
