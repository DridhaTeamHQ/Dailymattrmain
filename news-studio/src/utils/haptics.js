// Haptic feedback utility for mobile devices

/**
 * Check if haptics are supported
 */
export const isHapticsSupported = () => {
  return 'vibrate' in navigator || 'mozVibrate' in navigator || 'webkitVibrate' in navigator;
};

/**
 * Trigger haptic feedback
 * @param {string} type - Type of haptic feedback ('light', 'medium', 'heavy', 'success', 'warning', 'error')
 */
export const triggerHaptic = (type = 'light') => {
  if (!isHapticsSupported()) return;

  const patterns = {
    light: [10],           // Quick tap
    medium: [20],          // Medium tap
    heavy: [30],           // Strong tap
    success: [10, 50, 10], // Double tap
    warning: [20, 100, 20], // Double medium tap
    error: [30, 100, 30],  // Double strong tap
    selection: [5],        // Very light tap for selection
    impact: [15],          // Impact feedback
    notification: [10, 50, 10, 50, 10], // Triple tap for notifications
  };

  const pattern = patterns[type] || patterns.light;

  // Try different vendor prefixes
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  } else if (navigator.mozVibrate) {
    navigator.mozVibrate(pattern);
  } else if (navigator.webkitVibrate) {
    navigator.webkitVibrate(pattern);
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancelHaptic = () => {
  if (!isHapticsSupported()) return;
  
  if (navigator.vibrate) {
    navigator.vibrate(0);
  } else if (navigator.mozVibrate) {
    navigator.mozVibrate(0);
  } else if (navigator.webkitVibrate) {
    navigator.webkitVibrate(0);
  }
};

