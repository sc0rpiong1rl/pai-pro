import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * True once the element has intersected the viewport at least once, then
 * stays true (thumbnails don't need to unload after loading). Also fires
 * correctly for elements inside a `display:none` ancestor — they report
 * no intersection until the ancestor becomes visible, which is what lets
 * a CSS-hidden tab's video grid defer loading until the tab is actually
 * shown instead of on initial mount.
 */
export function useInView<T extends Element>(
  rootMargin = '200px',
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return [ref, inView]
}
