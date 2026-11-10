/*
 * Chronological Observatory Controller: Archive Hydration & State Machine
 * ---------------------------------------------------------------------------
 * Coordinates reactive Month/Day dial selection, synchronous cache hydration,
 * two-stage dial-settle network batching, and predictive neighbor preloading.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Banner from './components/Banner';
import BirthdayForm from './components/BirthdayForm';
import PoDList from './components/PoDList';
import RateLimitError from './components/RateLimitError';
import {
  fetchApodByDate,
  getCachedApodByDate,
  getValidApodYears,
  preloadApodImage,
} from './api/apod';
import './App.css';

const THEME_STORAGE_KEY = 'nasa-apod-theme';

function getInitialTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

function buildInitialStateForDate(month, day, preferredYear = null) {
  const validYears = getValidApodYears(month, day);
  const initialMap = {};
  for (const year of validYears) {
    const cached = getCachedApodByDate(year, month, day);
    initialMap[year] = cached !== undefined ? cached : 'loading';
  }

  // Preserve the user's currently selected year across date dial changes if
  // that year exists for the new date; otherwise select the newest valid year.
  const canKeepPreferred =
    preferredYear !== null &&
    validYears.includes(preferredYear) &&
    initialMap[preferredYear] !== 'unavailable';

  const initialSelected = canKeepPreferred
    ? preferredYear
    : validYears.find((y) => initialMap[y] !== 'unavailable') ||
      validYears[0] ||
      null;

  return { validYears, initialMap, initialSelected };
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [birthday, setBirthday] = useState(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, day: today.getDate() };
  });

  const [years, setYears] = useState(
    () => buildInitialStateForDate(birthday.month, birthday.day).validYears
  );
  const [podsByYear, setPodsByYear] = useState(
    () => buildInitialStateForDate(birthday.month, birthday.day).initialMap
  );
  const [selectedYear, setSelectedYear] = useState(
    () => buildInitialStateForDate(birthday.month, birthday.day).initialSelected
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const selectedYearRef = useRef(selectedYear);
  selectedYearRef.current = selectedYear;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.removeAttribute('data-archetype');
    root.removeAttribute('data-typography');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors in private browsing contexts.
    }
  }, [theme]);

  // WHY: Two-step dial edits (Month -> Day) fire back-to-back state changes.
  // Hydrating cached records on Frame 0, fetching the active year + immediate
  // neighbors at 60ms, and deferring the remaining ~29 years by 300ms prevents
  // an intermediate Month selection from saturating the browser connection pool.
  useEffect(() => {
    if (!birthday) return undefined;

    let isCancelled = false;
    let priorityTimerId = null;
    let backgroundTimerId = null;

    const { validYears, initialMap, initialSelected } =
      buildInitialStateForDate(
        birthday.month,
        birthday.day,
        selectedYearRef.current
      );

    setYears(validYears);
    setPodsByYear(initialMap);
    setSelectedYear(initialSelected);
    setErrorMessage(null);

    if (validYears.length === 0) {
      return undefined;
    }

    const activeIdx = Math.max(0, validYears.indexOf(initialSelected));
    const priorityCandidates = [
      validYears[activeIdx],
      validYears[activeIdx + 1],
      validYears[activeIdx - 1],
    ].filter(Boolean);

    for (const y of priorityCandidates) {
      const entry = initialMap[y];
      if (entry && typeof entry === 'object' && entry.imageUrl) {
        preloadApodImage(entry.imageUrl);
      }
    }

    const uncachedPriority = priorityCandidates.filter(
      (y) => initialMap[y] === 'loading'
    );
    const uncachedRemaining = validYears.filter(
      (y) => initialMap[y] === 'loading' && !uncachedPriority.includes(y)
    );

    if (uncachedPriority.length === 0 && uncachedRemaining.length === 0) {
      return undefined;
    }

    const fetchBatch = async (batchYears, shouldPreloadImages = false) => {
      const results = await Promise.all(
        batchYears.map(async (year) => {
          try {
            const record = await fetchApodByDate(
              year,
              birthday.month,
              birthday.day
            );
            if (shouldPreloadImages && record?.imageUrl) {
              preloadApodImage(record.imageUrl);
            }
            return [year, record || 'unavailable'];
          } catch (error) {
            console.error(error);
            return [year, 'unavailable'];
          }
        })
      );

      if (isCancelled) return [];

      setPodsByYear((prev) => {
        const next = { ...prev };
        for (const [year, val] of results) {
          next[year] = val;
        }
        return next;
      });

      return results;
    };

    priorityTimerId = window.setTimeout(async () => {
      if (isCancelled) return;

      const priorityResults =
        uncachedPriority.length > 0
          ? await fetchBatch(uncachedPriority, true)
          : [];
      if (isCancelled) return;

      backgroundTimerId = window.setTimeout(async () => {
        if (isCancelled) return;

        const waveSize = 8;
        let totalResolved =
          validYears.filter(
            (y) => initialMap[y] && typeof initialMap[y] === 'object'
          ).length +
          priorityResults.filter(([, val]) => typeof val === 'object').length;

        for (let i = 0; i < uncachedRemaining.length; i += waveSize) {
          if (isCancelled) return;
          const wave = uncachedRemaining.slice(i, i + waveSize);
          const waveResults = await fetchBatch(wave, false);
          totalResolved += waveResults.filter(
            ([, val]) => typeof val === 'object'
          ).length;
        }

        if (!isCancelled && totalResolved === 0) {
          setErrorMessage(
            'Unable to retrieve NASA Astronomy Picture of the Day records for that date. Please verify your connection and try again.'
          );
        }
      }, 300);
    }, 60);

    return () => {
      isCancelled = true;
      if (priorityTimerId !== null) window.clearTimeout(priorityTimerId);
      if (backgroundTimerId !== null) window.clearTimeout(backgroundTimerId);
    };
  }, [birthday, retryCount]);

  // WHY: Preload `year +- 1` and `year + 2` whenever `selectedYear` shifts so
  // sequential arrow-key or button stepping hits warmed browser image caches.
  useEffect(() => {
    if (!birthday || !selectedYear || years.length === 0) return;

    const idx = years.indexOf(selectedYear);
    const windowYears = [
      selectedYear,
      idx > 0 ? years[idx - 1] : null,
      idx >= 0 && idx < years.length - 1 ? years[idx + 1] : null,
      idx >= 0 && idx < years.length - 2 ? years[idx + 2] : null,
    ].filter(Boolean);

    for (const y of windowYears) {
      const entry = podsByYear[y];
      if (entry && typeof entry === 'object' && entry.imageUrl) {
        preloadApodImage(entry.imageUrl);
      } else if (!entry || entry === 'loading') {
        fetchApodByDate(y, birthday.month, birthday.day)
          .then((record) => {
            if (record?.imageUrl) {
              preloadApodImage(record.imageUrl);
            }
            setPodsByYear((prev) =>
              prev[y] === 'loading'
                ? { ...prev, [y]: record || 'unavailable' }
                : prev
            );
          })
          .catch(() => {});
      }
    }
  }, [selectedYear, birthday, years, podsByYear]);

  const handlePrefetchYear = useCallback(
    (year) => {
      if (!birthday || !year) return;
      const existing = getCachedApodByDate(year, birthday.month, birthday.day);
      if (existing && typeof existing === 'object') {
        if (existing.imageUrl) {
          preloadApodImage(existing.imageUrl);
        }
        return;
      }
      fetchApodByDate(year, birthday.month, birthday.day)
        .then((record) => {
          if (record?.imageUrl) {
            preloadApodImage(record.imageUrl);
          }
          setPodsByYear((prev) =>
            prev[year] === 'loading'
              ? { ...prev, [year]: record || 'unavailable' }
              : prev
          );
        })
        .catch(() => {});
    },
    [birthday]
  );

  const handleDateChange = useCallback((month, day) => {
    const nextMonth = Number(month);
    const nextDay = Number(day);
    setBirthday((prev) => {
      if (prev && prev.month === nextMonth && prev.day === nextDay) {
        return prev;
      }
      return { month: nextMonth, day: nextDay };
    });
  }, []);

  const handleSelectToday = useCallback(() => {
    const current = new Date();
    const todayMonth = current.getMonth() + 1;
    const todayDay = current.getDate();
    const todayYears = getValidApodYears(todayMonth, todayDay, current);
    const newestYear = todayYears[0] || current.getFullYear();

    // WHY: Sync `selectedYearRef` before `setBirthday` runs so the hydration
    // effect anchors on `newestYear` instead of retaining an older browsed year.
    selectedYearRef.current = newestYear;
    setSelectedYear(newestYear);
    setBirthday((prev) => {
      if (prev && prev.month === todayMonth && prev.day === todayDay) {
        return prev;
      }
      return { month: todayMonth, day: todayDay };
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const hydratedCount = years.filter(
    (y) => podsByYear[y] && podsByYear[y] !== 'loading'
  ).length;

  return (
    <div className='App'>
      <div className='App-control-deck'>
        <Banner
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <BirthdayForm
          birthday={birthday}
          selectedYear={selectedYear}
          latestYear={years[0] ?? null}
          onDateChange={handleDateChange}
          onSelectToday={handleSelectToday}
        />
      </div>

      {errorMessage ? (
        <RateLimitError
          message={errorMessage}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      ) : (
        <PoDList
          years={years}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
          onPrefetchYear={handlePrefetchYear}
          podsByYear={podsByYear}
          birthday={birthday}
          hydratedCount={hydratedCount}
        />
      )}
    </div>
  );
}

export default App;
