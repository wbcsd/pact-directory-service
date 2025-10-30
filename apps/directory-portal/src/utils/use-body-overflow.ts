import { useEffect } from 'react';

function useBodyOverflow(hidden: boolean) {
  useEffect(() => {
    if (hidden) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'scroll';
    }

    // Cleanup function to restore overflow when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [hidden]);
}

export default useBodyOverflow;