# Daily AI - Modern Design System

## Visual Aesthetic: "Calm Productivity"

A clean, minimalist interface designed for focus and clarity. The design emphasizes subtle depth, smooth interactions, and excellent readability while maintaining a professional yet approachable feel.

## Color Palette

### Light Mode (Primary)
```css
:root {
  /* Primary Colors */
  --primary: #3B82F6;          /* Modern blue - CTAs, active states */
  --primary-light: #DBEAFE;    /* Light blue - backgrounds, hover states */
  --primary-dark: #1E40AF;     /* Dark blue - pressed states, emphasis */

  /* Neutral Colors */
  --neutral-50: #FAFAF9;       /* App background, lightest surfaces */
  --neutral-100: #F5F5F4;      /* Card backgrounds, secondary surfaces */
  --neutral-200: #E7E5E4;      /* Borders, dividers */
  --neutral-400: #A8A29E;      /* Placeholder text, disabled states */
  --neutral-600: #57534E;      /* Secondary text */
  --neutral-900: #1C1917;      /* Primary text, headings */

  /* Semantic Colors */
  --success: #10B981;          /* Completed tasks, positive actions */
  --warning: #F59E0B;          /* Time crunch, important warnings */
  --error: #EF4444;            /* Overdue tasks, destructive actions */
  --info: #6366F1;             /* Information, dependencies */

  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.12);
  --shadow-xl: 0 20px 60px rgba(0, 0, 0, 0.1);
}
```

### Dark Mode
> **Note**: Dark mode functionality is planned for **future development** and not included in the MVP implementation. The app will launch with light mode only.

## Typography System

### Font Stack
```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}
```

### Type Scale
```css
:root {
  --text-xs: 0.75rem;     /* 12px - timestamps, metadata */
  --text-sm: 0.875rem;    /* 14px - body text, descriptions */
  --text-base: 1rem;      /* 16px - primary body text */
  --text-lg: 1.125rem;    /* 18px - task names, important labels */
  --text-xl: 1.25rem;     /* 20px - section headings */
  --text-2xl: 1.5rem;     /* 24px - page titles */
  --text-3xl: 1.875rem;   /* 30px - main headlines */

  /* Font Weights */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

## Spacing System

```css
:root {
  --space-1: 0.25rem;     /* 4px */
  --space-2: 0.5rem;      /* 8px */
  --space-3: 0.75rem;     /* 12px */
  --space-4: 1rem;        /* 16px */
  --space-5: 1.25rem;     /* 20px */
  --space-6: 1.5rem;      /* 24px */
  --space-8: 2rem;        /* 32px */
  --space-10: 2.5rem;     /* 40px */
  --space-12: 3rem;       /* 48px */
  --space-16: 4rem;       /* 64px */
  --space-20: 5rem;       /* 80px */

  /* Border Radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-full: 9999px;  /* Fully rounded */
}
```

## Component Styles

### Buttons
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: none;
  outline: none;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  padding: var(--space-3) var(--space-6);
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.btn-secondary {
  background: var(--neutral-100);
  color: var(--neutral-900);
  border: 1px solid var(--neutral-200);
  padding: var(--space-3) var(--space-6);
}

.btn-secondary:hover {
  background: var(--neutral-50);
  border-color: var(--neutral-400);
}

/* Floating Action Button (Mobile) */
.fab {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: white;
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 50;
}

.fab:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}
```

### Form Elements
```css
.input {
  width: 100%;
  background: var(--neutral-50);
  border: 2px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-base);
  color: var(--neutral-900);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  outline: none;
}

.input::placeholder {
  color: var(--neutral-400);
}

.label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-600);
  margin-bottom: var(--space-2);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}
```

### Cards and Containers
```css
.card {
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-6);
  }
}
```

### Modals
```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-6);
}

@media (max-width: 767px) {
  .modal {
    position: fixed;
    inset: 0;
    border-radius: 0;
    max-width: none;
    max-height: none;
  }
}
```

## Timeline-Specific Styles

### Task Blocks
```css
.task-block {
  background: linear-gradient(145deg, #FFFFFF 0%, var(--neutral-50) 100%);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.task-block:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.task-block.completed {
  opacity: 0.7;
  background: linear-gradient(145deg, var(--success) 5%, #FFFFFF 5%);
}

.task-block.overdue {
  background: linear-gradient(145deg, var(--error) 5%, #FEF2F2 5%);
  border-color: var(--error);
}

.task-block.in-progress {
  border-color: var(--primary);
  background: linear-gradient(145deg, var(--primary) 5%, var(--primary-light) 5%);
}

.task-name {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--neutral-900);
  margin-bottom: var(--space-1);
}

.task-time {
  font-size: var(--text-xs);
  color: var(--neutral-600);
  font-family: var(--font-mono);
}
```

### Timeline Grid
```css
.timeline-grid {
  position: relative;
  background: var(--neutral-50);
}

.hour-marker {
  border-top: 1px solid var(--neutral-200);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  color: var(--neutral-400);
  font-family: var(--font-mono);
  background: var(--neutral-50);
}

.time-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--error) 0%, #F97316 100%);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  z-index: 10;
  border-radius: var(--radius-full);
}

.time-indicator::before {
  content: '';
  position: absolute;
  left: -4px;
  top: -4px;
  width: 10px;
  height: 10px;
  background: var(--error);
  border-radius: var(--radius-full);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.sleep-block {
  background: linear-gradient(135deg, var(--neutral-100) 0%, var(--neutral-200) 100%);
  position: relative;
  overflow: hidden;
}

.sleep-block::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0, 0, 0, 0.02) 10px,
    rgba(0, 0, 0, 0.02) 20px
  );
}
```

## Animations and Transitions

### Task Completion Animation
```css
@keyframes taskComplete {
  0% { 
    transform: scale(1); 
  }
  50% { 
    transform: scale(1.05); 
    background: var(--success);
  }
  100% { 
    transform: scale(1); 
    opacity: 0.7;
  }
}

.task-block.completing {
  animation: taskComplete 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Loading States
```css
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--neutral-200) 25%,
    var(--neutral-100) 50%,
    var(--neutral-200) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

### Hover Effects
```css
.interactive {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.interactive:active {
  transform: translateY(0);
  transition-duration: 0.1s;
}
```

## Responsive Breakpoints

```css
/* Mobile First Approach */
.mobile-only {
  display: block;
}

.tablet-up {
  display: none;
}

.desktop-up {
  display: none;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
  
  .tablet-up {
    display: block;
  }
}

@media (min-width: 1024px) {
  .desktop-up {
    display: block;
  }
}
```

## Dark Mode Implementation
> **Note**: Dark mode toggle and theming functionality planned for **future development** - not included in MVP.

## Accessibility Features

```css
/* Focus styles */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --neutral-200: #000000;
    --neutral-600: #000000;
    --neutral-900: #000000;
  }
  
  [data-theme="dark"] {
    --neutral-200: #FFFFFF;
    --neutral-600: #FFFFFF;
    --neutral-900: #FFFFFF;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Implementation Notes

1. **CSS Custom Properties**: Use CSS variables for all colors, spacing, and typography to enable easy theming
2. **Mobile-First**: Build styles for mobile first, then enhance for larger screens
3. **Performance**: Use `transform` and `opacity` for animations to ensure smooth 60fps performance
4. **Accessibility**: Ensure all interactive elements have proper focus states and meet WCAG guidelines
5. **Browser Support**: Test across modern browsers, use fallbacks for older browsers if needed
6. **Icon Integration**: Use consistent icon library (Phosphor Icons recommended) with proper sizing