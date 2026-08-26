import { useEffect, useRef, useState } from "react";

export const useScrollAnimation = (threshold = 0.1, rootMargin = "0px") => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect after first trigger for performance
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin]);

  return [ref, isVisible];
};

export const useStaggeredAnimation = (itemCount, delay = 100) => {
  const [visibleItems, setVisibleItems] = useState(new Set());
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  useEffect(() => {
    if (triggerAnimation) {
      const timeouts = [];

      for (let i = 0; i < itemCount; i++) {
        const timeout = setTimeout(() => {
          setVisibleItems((prev) => new Set([...prev, i]));
        }, i * delay);

        timeouts.push(timeout);
      }

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }
  }, [triggerAnimation, itemCount, delay]);

  return [visibleItems, setTriggerAnimation];
};
