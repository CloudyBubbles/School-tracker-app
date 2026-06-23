"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";

const PageEnter = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <motion.div
      ref={ref}
      initial={{ rotateY: 8, opacity: 0, x: 12 }}
      animate={{ rotateY: 0, opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
      style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
    >
      {children}
    </motion.div>
  )
);

PageEnter.displayName = "PageEnter";
export default PageEnter;
