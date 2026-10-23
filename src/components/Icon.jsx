// Iconos de trazo (24 × 24) dibujados a mano: heredan el color del texto (currentColor)
// y se escalan con el tamaño de letra del botón que los contiene.
const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  back: <path d="M15 18l-6-6 6-6" />,
  next: <path d="M9 6l6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  edit:<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />,
  flame: (
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.2 2.2-5.3 3.6-7.6.4 1.5 1.2 2.6 2.2 3.1.2-2.9 1.5-5.4 3.6-7.4.4 3 3.6 5.6 3.6 10.1 0 4.4-2.8 7.9-6.5 7.9z" />
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 9a2 2 0 0 1 2-2h2l1.5-2h5L16 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M20 15l-4.5-4.5L7 19" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  chart: <path d="M6 20V11M12 20V5M18 20v-7" />,
  home: <path d="M4 11l8-6.5 8 6.5M6.5 9.5V19h11V9.5M10 19v-5h4v5" />,
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3.5M9 20h6l-.5-3.5h-5z" />
  ),
  plate: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M11 4l1.8 4.7L17.5 10.5l-4.7 1.8L11 17l-1.8-4.7L4.5 10.5l4.7-1.8z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" />
    </>
  ),
};

// El logo de MacroSnap, el mismo dibujo que el icono de la app: el anillo de proteína casi
// cerrado (violeta) con el centro dorado del objetivo. Lleva sus propios colores.
export function Logo({ className = "" }) {
  return (
    <svg className={`logo-mark ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-ring" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aea3ff" />
          <stop offset="1" stopColor="#6a55f0" />
        </linearGradient>
      </defs>
      <path
        d="M12 4A8 8 0 1 1 5.07 8"
        fill="none"
        stroke="url(#logo-ring)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="#fbbf24" />
    </svg>
  );
}

export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={`ico ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
