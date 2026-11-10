import React from 'react';
import '../styles/PoDListItem.css';

function PoDListItem({
  pod,
  isLoading,
  selectedYear,
  birthday,
  positionIndex,
  totalCount,
  prevYear,
  nextYear,
  onSelectYear,
  onPrefetchYear,
}) {
  if (isLoading || !pod) {
    const fallbackDate = birthday
      ? `${selectedYear}-${String(birthday.month).padStart(2, '0')}-${String(
          birthday.day
        ).padStart(2, '0')}`
      : `${selectedYear}`;

    return (
      <article className='PoDListItem PoDListItem--skeleton' aria-busy='true'>
        <div className='PoDListItem-stage-column'>
          <div className='PoDListItem-stage PoDListItem-stage--loading'>
            <span className='PoDListItem-loading-label instrument-badge'>
              ACQUIRING TELEMETRY // {fallbackDate}
            </span>
          </div>
        </div>
        <div className='PoDListItem-plaque'>
          <div className='PoDListItem-plaque-header'>
            <span className='PoDListItem-date instrument-badge'>
              {fallbackDate} // LOADING ARCHIVE
            </span>
            <h2 className='PoDListItem-title'>
              Retrieving NASA observation for {selectedYear}…
            </h2>
          </div>
          <p className='PoDListItem-explanation PoDListItem-explanation--muted'>
            Connecting to NASA Science astronomy archives to fetch high-resolution
            imagery and astronomer field notes.
          </p>
        </div>
      </article>
    );
  }

  const renderMedia = () => {
    if (pod.mediaType === 'video' && pod.videoUrl) {
      return (
        <div className='PoDListItem-video-wrapper'>
          <video
            key={pod.videoUrl}
            controls
            preload='metadata'
            poster={pod.posterUrl || undefined}
          >
            <source src={pod.videoUrl} type='video/mp4' />
          </video>
        </div>
      );
    }

    if (pod.mediaType === 'iframe' && pod.iframeUrl) {
      return (
        <div className='PoDListItem-video-wrapper'>
          <iframe
            key={pod.iframeUrl}
            src={pod.iframeUrl}
            title={pod.title}
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen
          />
        </div>
      );
    }

    if (pod.imageUrl) {
      return (
        <div className='PoDListItem-image-wrapper'>
          <img
            src={pod.imageUrl}
            alt={pod.alt || pod.title}
            decoding='async'
            fetchPriority='high'
          />
        </div>
      );
    }

    return (
      <div className='PoDListItem-stage--empty instrument-badge'>
        MEDIA PREVIEW UNAVAILABLE // VIEW ON NASA ARCHIVE BELOW
      </div>
    );
  };

  const mediaBadgeLabel =
    pod.mediaType === 'iframe'
      ? 'INTERACTIVE / VIDEO'
      : pod.mediaType.toUpperCase();

  return (
    <article className='PoDListItem'>
      <div className='PoDListItem-stage-column'>
        <div className='PoDListItem-stage'>{renderMedia()}</div>

        <div className='PoDListItem-stage-footer'>
          <div className='PoDListItem-credit-group'>
            <span className='PoDListItem-media-badge instrument-badge'>
              {mediaBadgeLabel}
            </span>
            {pod.credit && (
              <span className='PoDListItem-credit'>
                Credit: {pod.credit}
              </span>
            )}
          </div>

          {pod.permalink && (
            <div className='PoDListItem-links'>
              <a
                href={pod.permalink}
                target='_blank'
                rel='noreferrer'
                className='PoDListItem-ext-link instrument-badge'
              >
                NASA ARCHIVE ↗
              </a>
            </div>
          )}
        </div>
      </div>

      <div className='PoDListItem-plaque'>
        <div className='PoDListItem-plaque-header'>
          <span className='PoDListItem-date instrument-badge'>
            {pod.date} // YEAR {positionIndex} OF {totalCount}
          </span>
          <h2 className='PoDListItem-title'>{pod.title}</h2>
        </div>

        <div className='PoDListItem-prose-container'>
          <p className='PoDListItem-explanation'>{pod.explanation}</p>
        </div>

        <div className='PoDListItem-plaque-footer'>
          <button
            type='button'
            className='PoDListItem-nav-btn instrument-badge'
            disabled={prevYear === null}
            onMouseEnter={() => prevYear && onPrefetchYear?.(prevYear)}
            onFocus={() => prevYear && onPrefetchYear?.(prevYear)}
            onClick={() => prevYear !== null && onSelectYear(prevYear)}
          >
            ← {prevYear ? `${prevYear} OBSERVATION` : 'NEWEST'}
          </button>

          <span className='PoDListItem-key-hint instrument-badge'>
            ← / → KEYS
          </span>

          <button
            type='button'
            className='PoDListItem-nav-btn instrument-badge'
            disabled={nextYear === null}
            onMouseEnter={() => nextYear && onPrefetchYear?.(nextYear)}
            onFocus={() => nextYear && onPrefetchYear?.(nextYear)}
            onClick={() => nextYear !== null && onSelectYear(nextYear)}
          >
            {nextYear ? `${nextYear} OBSERVATION` : 'OLDEST'} →
          </button>
        </div>
      </div>
    </article>
  );
}

export default PoDListItem;
