import React, { useEffect, useRef, useState } from 'react';
import PoDListItem from './PoDListItem';
import '../styles/PoDList.css';

const MONTH_NAMES = [
  '',
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

function PlayIcon() {
  return (
    <svg
      className='PoDList-contact-play-icon'
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
    >
      <polygon points='6 4 20 12 6 20 6 4' />
    </svg>
  );
}

function PoDList({
  years,
  selectedYear,
  onSelectYear,
  onPrefetchYear,
  podsByYear,
  birthday,
  hydratedCount,
}) {
  const [viewMode, setViewMode] = useState('deck');
  const scrubberRef = useRef(null);
  const yearButtonRefs = useRef({});

  const availableYears = years.filter(
    (year) => podsByYear[year] !== 'unavailable'
  );
  const currentIndex = availableYears.indexOf(selectedYear);
  const prevYear =
    currentIndex > 0 ? availableYears[currentIndex - 1] : null;
  const nextYear =
    currentIndex >= 0 && currentIndex < availableYears.length - 1
      ? availableYears[currentIndex + 1]
      : null;

  useEffect(() => {
    const activeButton = yearButtonRefs.current[selectedYear];
    if (activeButton && typeof activeButton.scrollIntoView === 'function') {
      const prefersReduced =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      activeButton.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
        container: 'nearest',
      });
    }
  }, [selectedYear]);

  useEffect(() => {
    if (viewMode !== 'deck' || availableYears.length === 0) return undefined;

    const handleKeyDown = (event) => {
      if (
        event.repeat ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }

      if (scrubberRef.current?.contains(event.target)) {
        return;
      }

      const path =
        typeof event.composedPath === 'function' ? event.composedPath() : [];
      const isEditable = path.some((node) => {
        if (!node || !node.tagName) return false;
        const tag = node.tagName;
        return (
          tag === 'SELECT' ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          node.isContentEditable
        );
      });
      if (isEditable) return;

      if (event.key === 'ArrowLeft' && prevYear !== null) {
        event.preventDefault();
        onSelectYear(prevYear);
      } else if (event.key === 'ArrowRight' && nextYear !== null) {
        event.preventDefault();
        onSelectYear(nextYear);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, availableYears.length, prevYear, nextYear, onSelectYear]);

  const handleScrubberKeyDown = (event) => {
    if (viewMode !== 'deck' || availableYears.length === 0) return;

    let targetYear = null;
    if (event.key === 'ArrowLeft') {
      const idx = currentIndex >= 0 ? currentIndex : 0;
      targetYear =
        availableYears[(idx - 1 + availableYears.length) % availableYears.length];
    } else if (event.key === 'ArrowRight') {
      const idx = currentIndex >= 0 ? currentIndex : 0;
      targetYear = availableYears[(idx + 1) % availableYears.length];
    } else if (event.key === 'Home') {
      targetYear = availableYears[0];
    } else if (event.key === 'End') {
      targetYear = availableYears[availableYears.length - 1];
    }

    if (targetYear === null) return;
    event.preventDefault();
    onPrefetchYear?.(targetYear);
    onSelectYear(targetYear);
    yearButtonRefs.current[targetYear]?.focus();
  };

  if (!birthday || years.length === 0) {
    return null;
  }

  const activeEntry = podsByYear[selectedYear];
  const monthLabel = MONTH_NAMES[birthday.month] || '';
  const dayLabel = String(birthday.day).padStart(2, '0');
  const positionIndex =
    currentIndex >= 0
      ? String(currentIndex + 1).padStart(2, '0')
      : '01';
  const totalCount = String(availableYears.length).padStart(2, '0');

  const renderContactMedia = (record, isReady) => {
    if (!isReady) {
      return (
        <div className='PoDList-contact-placeholder instrument-badge'>
          SYNCING...
        </div>
      );
    }

    const thumbSrc = record.thumbUrl || record.posterUrl || record.imageUrl;
    if (thumbSrc) {
      return (
        <>
          <img
            src={thumbSrc}
            alt={record.alt || record.title}
            loading='lazy'
            decoding='async'
          />
          {record.mediaType !== 'image' && (
            <span className='PoDList-contact-play' aria-hidden='true'>
              <PlayIcon />
            </span>
          )}
        </>
      );
    }

    if (record.mediaType === 'video' && record.videoUrl) {
      // WHY: Appending `#t=0.5` forces `<video preload="metadata">` to seek
      // 0.5s in and paint an actual frame instead of an empty black box when
      // NASA provides no static poster image for an MP4 entry.
      return (
        <>
          <video
            src={`${record.videoUrl}#t=0.5`}
            preload='metadata'
            muted
            playsInline
          />
          <span className='PoDList-contact-play' aria-hidden='true'>
            <PlayIcon />
          </span>
        </>
      );
    }

    return (
      <div className='PoDList-contact-placeholder instrument-badge'>
        {record.mediaType !== 'image' ? (
          <span className='PoDList-contact-play PoDList-contact-play--static'>
            <PlayIcon />
          </span>
        ) : (
          'ARCHIVE ENTRY'
        )}
      </div>
    );
  };

  return (
    <div className='PoDList'>
      <p className='visually-hidden' aria-live='polite'>
        Showing {monthLabel} {dayLabel}, {selectedYear} — observation{' '}
        {positionIndex} of {totalCount}
      </p>
      <div className='PoDList-nav-panel'>
        <div className='PoDList-toolbar'>
          <div className='PoDList-readout instrument-badge'>
            <span className='PoDList-readout-primary'>
              OBSERVATION {positionIndex} / {totalCount}
            </span>
            <span className='PoDList-readout-sep' aria-hidden='true'>
              //
            </span>
            <span className='PoDList-readout-date'>
              {monthLabel} {dayLabel}, {selectedYear}
            </span>
            {hydratedCount < years.length && (
              <span className='PoDList-sync-pill'>
                HYDRATING {hydratedCount}/{years.length}
              </span>
            )}
          </div>

          <div className='PoDList-toolbar-Right'>
            <div
              className='PoDList-view-toggle instrument-badge'
              role='group'
              aria-label='Display Mode'
            >
              <button
                type='button'
                aria-pressed={viewMode === 'deck'}
                className={`PoDList-view-btn ${
                  viewMode === 'deck' ? 'is-active' : ''
                }`}
                onClick={() => setViewMode('deck')}
              >
                OBSERVATORY
              </button>
              <button
                type='button'
                aria-pressed={viewMode === 'grid'}
                className={`PoDList-view-btn ${
                  viewMode === 'grid' ? 'is-active' : ''
                }`}
                onClick={() => setViewMode('grid')}
              >
                CONTACT SHEET
              </button>
            </div>

            {viewMode === 'deck' && (
              <div className='PoDList-stepper'>
                <button
                  type='button'
                  className='PoDList-step-btn instrument-badge'
                  disabled={prevYear === null}
                  onMouseEnter={() => prevYear && onPrefetchYear?.(prevYear)}
                  onFocus={() => prevYear && onPrefetchYear?.(prevYear)}
                  onClick={() => prevYear !== null && onSelectYear(prevYear)}
                  title={
                    prevYear
                      ? `Newer observation (${prevYear}) - Left Arrow`
                      : 'At newest observation'
                  }
                >
                  <span>← {prevYear || 'NEWER'}</span>
                </button>
                <button
                  type='button'
                  className='PoDList-step-btn instrument-badge'
                  disabled={nextYear === null}
                  onMouseEnter={() => nextYear && onPrefetchYear?.(nextYear)}
                  onFocus={() => nextYear && onPrefetchYear?.(nextYear)}
                  onClick={() => nextYear !== null && onSelectYear(nextYear)}
                  title={
                    nextYear
                      ? `Older observation (${nextYear}) - Right Arrow`
                      : 'At oldest observation'
                  }
                >
                  <span>{nextYear || 'OLDER'} →</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          ref={scrubberRef}
          className='PoDList-scrubber'
          role={viewMode === 'deck' ? 'tablist' : 'group'}
          aria-label='Observation Years'
          onKeyDown={handleScrubberKeyDown}
        >
          {availableYears.map((year, idx) => {
            const isActiveYear =
              year === selectedYear ||
              (currentIndex < 0 && idx === 0);
            const isSelected = isActiveYear && viewMode === 'deck';
            const record = podsByYear[year];
            const isReady = record && typeof record === 'object';

            return (
              <button
                key={year}
                id={`year-tab-${year}`}
                ref={(el) => {
                  yearButtonRefs.current[year] = el;
                }}
                type='button'
                role={viewMode === 'deck' ? 'tab' : undefined}
                aria-selected={viewMode === 'deck' ? isSelected : undefined}
                aria-pressed={
                  viewMode === 'grid' ? year === selectedYear : undefined
                }
                tabIndex={
                  viewMode === 'deck' ? (isSelected ? 0 : -1) : undefined
                }
                className={`PoDList-year-key instrument-badge ${
                  isSelected ? 'is-selected' : ''
                } ${isReady ? 'is-ready' : 'is-pending'}`}
                onMouseEnter={() => onPrefetchYear?.(year)}
                onFocus={() => onPrefetchYear?.(year)}
                onClick={() => {
                  onSelectYear(year);
                  if (viewMode !== 'deck') {
                    setViewMode('deck');
                  }
                }}
              >
                <span className='PoDList-year-num'>{year}</span>
                <span
                  className='PoDList-year-dot'
                  aria-hidden='true'
                />
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'deck' ? (
        <div
          role='tabpanel'
          tabIndex={0}
          aria-labelledby={
            availableYears.length > 0
              ? `year-tab-${
                  currentIndex >= 0 ? selectedYear : availableYears[0]
                }`
              : undefined
          }
        >
          <PoDListItem
            pod={
              activeEntry && typeof activeEntry === 'object' ? activeEntry : null
            }
            isLoading={!activeEntry || activeEntry === 'loading'}
            selectedYear={selectedYear}
            birthday={birthday}
            positionIndex={positionIndex}
            totalCount={totalCount}
            prevYear={prevYear}
            nextYear={nextYear}
            onSelectYear={onSelectYear}
            onPrefetchYear={onPrefetchYear}
          />
        </div>
      ) : (
        <div className='PoDList-contact-grid'>
          {availableYears.map((year) => {
            const record = podsByYear[year];
            const isReady = record && typeof record === 'object';

            return (
              <button
                key={year}
                type='button'
                className={`PoDList-contact-card ${
                  year === selectedYear ? 'is-selected' : ''
                }`}
                onMouseEnter={() => onPrefetchYear?.(year)}
                onFocus={() => onPrefetchYear?.(year)}
                onClick={() => {
                  onSelectYear(year);
                  setViewMode('deck');
                }}
              >
                <div className='PoDList-contact-media'>
                  {renderContactMedia(record, isReady)}
                  <span className='PoDList-contact-year instrument-badge'>
                    {year}
                  </span>
                  {isReady && record.mediaType !== 'image' && (
                    <span className='PoDList-contact-badge instrument-badge'>
                      VIDEO
                    </span>
                  )}
                </div>
                <div className='PoDList-contact-meta'>
                  <span className='PoDList-contact-date instrument-badge'>
                    {isReady ? record.date : `${year}`}
                  </span>
                  <h2 className='PoDList-contact-title'>
                    {isReady ? record.title : 'Loading observation...'}
                  </h2>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PoDList;
