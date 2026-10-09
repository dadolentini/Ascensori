import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
export default function useEditorialMotion(route: string, reduced: boolean) {
  useEffect(() => {
    if (route !== '/' || reduced) return;
    const context = gsap.context(() => {
      gsap.fromTo('.closing-section h2', { y: 30 }, { y: 0, ease: 'none',
        scrollTrigger: { trigger: '.closing-section', start: 'top 95%', end: 'top 45%', scrub: true } });
      gsap.fromTo('.closing-section .outline-button', { y: 18 }, { y: 0, ease: 'none',
        scrollTrigger: { trigger: '.closing-section', start: 'top 80%', end: 'top 30%', scrub: true } });
    });
    return () => context.revert();
  }, [route, reduced]);
}
