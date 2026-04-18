export const landingViewport = {
  once: true,
  amount: 0.2,
};

const landingEase = [0.22, 1, 0.36, 1];

export function staggerChildren(stagger = 0.14, delayChildren = 0) {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: stagger,
        delayChildren,
      },
    },
  };
}

export function fadeUp(distance = 28, delay = 0) {
  return {
    hidden: { opacity: 0, y: distance },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay,
        ease: landingEase,
      },
    },
  };
}

export function slideIn(direction = "right", distance = 40, delay = 0) {
  const offset = direction === "left" ? -distance : distance;

  return {
    hidden: { opacity: 0, x: offset },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.75,
        delay,
        ease: landingEase,
      },
    },
  };
}

export function softScale(delay = 0) {
  return {
    hidden: { opacity: 0, scale: 0.96, y: 24 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.75,
        delay,
        ease: landingEase,
      },
    },
  };
}

export const floatingAnimation = {
  y: [0, -12, 0],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

export const floatingAnimationReverse = {
  y: [0, 10, 0],
  transition: {
    duration: 7,
    repeat: Infinity,
    ease: "easeInOut",
    delay: 0.4,
  },
};
