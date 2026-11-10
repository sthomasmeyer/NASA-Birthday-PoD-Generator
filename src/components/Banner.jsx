import React from 'react';
import '../styles/Banner.css';

function SunIcon() {
  return (
    <svg
      className='Banner-theme-icon'
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <circle cx='12' cy='12' r='4.5' />
      <line x1='12' y1='2' x2='12' y2='4.5' />
      <line x1='12' y1='19.5' x2='12' y2='22' />
      <line x1='4.93' y1='4.93' x2='6.7' y2='6.7' />
      <line x1='17.3' y1='17.3' x2='19.07' y2='19.07' />
      <line x1='2' y1='12' x2='4.5' y2='12' />
      <line x1='19.5' y1='12' x2='22' y2='12' />
      <line x1='4.93' y1='19.07' x2='6.7' y2='17.3' />
      <line x1='17.3' y1='6.7' x2='19.07' y2='4.93' />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className='Banner-theme-icon'
      width='14'
      height='14'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' />
    </svg>
  );
}

const Banner = ({ theme, onToggleTheme }) => {
  return (
    <header className='Banner'>
      <div className='Banner-identity'>
        <div className='Banner-eyebrow instrument-badge'>
          <span className='Banner-signal-dot' aria-hidden='true' />
          <span>NASA // APOD CHRONOLOGICAL OBSERVATORY</span>
        </div>
        <h1 className='Banner-title'>Astronomy Picture of the Day</h1>
      </div>

      <div className='Banner-controls'>
        <button
          type='button'
          className='Banner-theme-toggle instrument-badge'
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          <span>{theme === 'dark' ? 'DARK' : 'LIGHT'}</span>
        </button>
      </div>
    </header>
  );
};

export default Banner;
