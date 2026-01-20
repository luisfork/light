/**
 * Light — Motion & Physics Utilities
 *
 * Design System Reference: Motion & Animation
 * Implements spring physics and timing functions as defined in the design system.
 *
 * Key Principles:
 * - No linear transitions
 * - Purpose over polish — Animation must serve comprehension, not decoration
 * - Respect reduced motion preferences
 * - No perpetual animations
 */

/**
 * Timing function presets from the design system
 */
export const Easing = {
  /** Standard ease — most UI transitions */
  standard: 'cubic-bezier(0.28, 0.11, 0.32, 1)',
  /** Ease in — menus, scrims, curtains */
  in: 'cubic-bezier(0.4, 0, 0.6, 1)',
  /** Ease out — elements exiting/disappearing */
  out: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Badge/utility easing */
  utility: 'cubic-bezier(0.25, 0.1, 0.3, 1)',
} as const;

/**
 * Duration presets from the design system (in milliseconds)
 */
export const Duration = {
  /** Micro-interactions (hover states) */
  instant: 100,
  /** UI feedback (button press) */
  fast: 200,
  /** Global nav and keylines */
  standard: 240,
  /** Menu open/close, scrims */
  normal: 320,
  /** Page-level transitions */
  slow: 500,
  /** Complex orchestrated animations */
  glacial: 1000,
} as const;

/**
 * Spring physics configuration
 */
export interface SpringConfig {
  /** Stiffness of the spring (default: 100) */
  stiffness: number;
  /** Damping ratio (default: 10) */
  damping: number;
  /** Mass of the object (default: 1) */
  mass: number;
  /** Initial velocity (default: 0) */
  velocity: number;
}

/**
 * Default spring configuration for UI interactions
 */
export const defaultSpringConfig: SpringConfig = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocity: 0,
};

/**
 * Spring preset configurations
 */
export const SpringPresets = {
  /** Quick, snappy response for buttons and small elements */
  snappy: { stiffness: 300, damping: 20, mass: 1, velocity: 0 },
  /** Gentle, smooth motion for larger elements */
  gentle: { stiffness: 120, damping: 14, mass: 1, velocity: 0 },
  /** Bouncy motion with overshoot */
  bouncy: { stiffness: 180, damping: 12, mass: 1, velocity: 0 },
  /** Slow, deliberate motion for page transitions */
  slow: { stiffness: 80, damping: 20, mass: 1, velocity: 0 },
} as const;

/**
 * Checks if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calculates the position at time t using spring physics
 *
 * @param t - Time in seconds
 * @param from - Starting value
 * @param to - Target value
 * @param config - Spring configuration
 * @returns The interpolated value
 */
export function springPosition(
  t: number,
  from: number,
  to: number,
  config: Partial<SpringConfig> = {}
): number {
  const { stiffness, damping, mass, velocity } = {
    ...defaultSpringConfig,
    ...config,
  };

  const displacement = from - to;
  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    // Underdamped
    const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
    const envelope = Math.exp(-zeta * omega0 * t);
    const sinComponent = Math.sin(omegaD * t);
    const cosComponent = Math.cos(omegaD * t);

    return (
      to +
      envelope *
        (displacement * cosComponent +
          ((zeta * omega0 * displacement + velocity) / omegaD) * sinComponent)
    );
  } else if (zeta === 1) {
    // Critically damped
    const envelope = Math.exp(-omega0 * t);
    return to + envelope * (displacement + (velocity + omega0 * displacement) * t);
  } else {
    // Overdamped
    const s1 = -omega0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const s2 = -omega0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const c2 = (velocity - s1 * displacement) / (s2 - s1);
    const c1 = displacement - c2;

    return to + c1 * Math.exp(s1 * t) + c2 * Math.exp(s2 * t);
  }
}

/**
 * Checks if the spring animation has settled
 *
 * @param current - Current value
 * @param target - Target value
 * @param threshold - Settlement threshold (default: 0.01)
 * @returns Whether the animation has settled
 */
export function isSpringSettled(
  current: number,
  target: number,
  threshold = 0.01
): boolean {
  return Math.abs(current - target) < threshold;
}

/**
 * Creates a CSS transition string using design system values
 *
 * @param properties - CSS properties to transition
 * @param duration - Duration preset key
 * @param easing - Easing preset key
 * @returns CSS transition string
 */
export function createTransition(
  properties: string | string[],
  duration: keyof typeof Duration = 'standard',
  easing: keyof typeof Easing = 'standard'
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  const durationMs = Duration[duration];
  const easingValue = Easing[easing];

  return props.map((prop) => `${prop} ${durationMs}ms ${easingValue}`).join(', ');
}

/**
 * Animates an element using spring physics with requestAnimationFrame
 *
 * @param element - DOM element to animate
 * @param property - CSS property to animate
 * @param from - Starting value
 * @param to - Target value
 * @param config - Spring configuration
 * @param unit - CSS unit (default: 'px')
 * @returns Promise that resolves when animation completes
 */
export function animateSpring(
  element: HTMLElement,
  property: string,
  from: number,
  to: number,
  config: Partial<SpringConfig> = {},
  unit = 'px'
): Promise<void> {
  return new Promise((resolve) => {
    // Skip animation if reduced motion is preferred
    if (prefersReducedMotion()) {
      element.style.setProperty(property, `${to}${unit}`);
      resolve();
      return;
    }

    const startTime = performance.now();
    const fullConfig = { ...defaultSpringConfig, ...config };

    function animate(currentTime: number) {
      const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
      const position = springPosition(elapsed, from, to, fullConfig);

      element.style.setProperty(property, `${position}${unit}`);

      if (isSpringSettled(position, to)) {
        element.style.setProperty(property, `${to}${unit}`);
        resolve();
      } else {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  });
}

/**
 * Applies staggered animation delays to a list of elements
 *
 * @param elements - NodeList or array of elements
 * @param baseDelay - Base delay in ms (default: 260)
 * @param stagger - Stagger increment in ms (default: 20)
 */
export function applyStaggeredDelay(
  elements: NodeListOf<HTMLElement> | HTMLElement[],
  baseDelay = 260,
  stagger = 20
): void {
  const elementsArray = Array.from(elements);
  elementsArray.forEach((element, index) => {
    element.style.setProperty('--item-index', String(index));
    element.style.transitionDelay = `${baseDelay + index * stagger}ms`;
  });
}

/**
 * Sets up an Intersection Observer for scroll-triggered animations
 *
 * @param selector - CSS selector for elements to observe
 * @param visibleClass - Class to add when visible (default: 'is-visible')
 * @param options - IntersectionObserver options
 */
export function setupScrollReveal(
  selector: string,
  visibleClass = 'is-visible',
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '0px 0px -100px 0px',
    threshold: 0.1,
    ...options,
  };

  const observer = new IntersectionObserver((entries) => {
    // Skip if reduced motion is preferred
    if (prefersReducedMotion()) {
      entries.forEach((entry) => {
        entry.target.classList.add(visibleClass);
      });
      return;
    }

    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add(visibleClass);
        // Optionally unobserve after revealing
        // observer.unobserve(entry.target);
      }
    });
  }, defaultOptions);

  document.querySelectorAll(selector).forEach((element) => {
    observer.observe(element);
  });

  return observer;
}

/**
 * Creates a debounced version of a function
 *
 * @param func - Function to debounce
 * @param wait - Debounce delay in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled version of a function
 *
 * @param func - Function to throttle
 * @param limit - Throttle limit in ms
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
