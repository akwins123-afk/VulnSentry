"use client";

import React from "react";

export type AgentAvatarType =
  | "orchestrator"
  | "shield"
  | "healer"
  | "context"
  | "tracer"
  | "datadog"
  | "pentester"
  | "architect"
  | "compliance"
  | "rbac"
  | "user"
  | "custom";

interface AvatarProps {
  type: AgentAvatarType;
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
}

export default function AgentAvatar({
  type,
  label,
  size = "md",
  className = "",
  showStatus = true,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-7 h-7 p-1",
    md: "w-9 h-9 p-1.5",
    lg: "w-11 h-11 p-2",
    xl: "w-14 h-14 p-2.5",
  };

  const statusDotSizes = {
    sm: "w-2 h-2 -bottom-0.5 -right-0.5",
    md: "w-2.5 h-2.5 -bottom-0.5 -right-0.5",
    lg: "w-3 h-3 bottom-0 right-0",
    xl: "w-3.5 h-3.5 bottom-0 right-0",
  };

  // STRICTLY BLACK AND WHITE / MONOCHROME AESTHETIC
  // Crisp black line art on pristine white card with subtle precision border
  const style = {
    bg: "bg-white hover:bg-slate-50",
    border: "border-slate-300 hover:border-slate-400 shadow-2xs",
    icon: "text-slate-900", // Pure black stroke
    dot: "bg-slate-900",    // Solid black status indicator
  };

  // Render authentic vector line art corresponding to the reference sheet in pure black & white
  const renderIcon = () => {
    switch (type) {
      case "orchestrator":
        // Reference Icon 2: Padlock with circular dashed orbit and connection nodes
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Outer dotted orbit */}
            <circle cx="12" cy="12" r="9.5" strokeDasharray="2 2" />
            {/* Orbit nodes */}
            <circle cx="12" cy="2.5" r="1.1" fill="currentColor" />
            <circle cx="21.5" cy="12" r="1.1" fill="currentColor" />
            <circle cx="12" cy="21.5" r="1.1" fill="currentColor" />
            <circle cx="2.5" cy="12" r="1.1" fill="currentColor" />
            {/* Inner solid orbit */}
            <circle cx="12" cy="12" r="6.5" />
            {/* Central Padlock */}
            <path d="M10 10V8a2 2 0 014 0v2" />
            <rect x="9" y="10" width="6" height="5" rx="1" />
            <circle cx="12" cy="12.5" r="0.7" fill="currentColor" />
          </svg>
        );

      case "shield":
        // Reference Icon 3: Shield with hatched diagonal pattern and caution triangle
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 5.5v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5v-6L12 2z" />
            {/* Left diagonal hatch lines */}
            <line x1="6.5" y1="8" x2="9" y2="10.5" />
            <line x1="6" y1="11" x2="9.5" y2="14.5" />
            <line x1="7" y1="14" x2="9.5" y2="16.5" />
            {/* Right caution triangle */}
            <polygon points="14.5,8 19,16 10,16" />
            <line x1="14.5" y1="10.5" x2="14.5" y2="13" />
            <circle cx="14.5" cy="14.5" r="0.6" fill="currentColor" />
          </svg>
        );

      case "healer":
        // Reference Icon 6: Shield with two interlocking mechanical gears inside
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 5.5v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5v-6L12 2z" />
            {/* Gear 1 */}
            <circle cx="10" cy="11.5" r="2.5" />
            <path d="M10 7.5v1M10 14.5v1M6.5 11.5h1M13.5 11.5h1" />
            {/* Gear 2 */}
            <circle cx="14" cy="12.5" r="2" />
            <path d="M14 9.5v1M14 15.5v-1M11 12.5h1M17 12.5h-1" />
          </svg>
        );

      case "context":
        // Reference Icon 8: Document being shredded behind a security shield
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Document sheet */}
            <path d="M4 3h7l4 4v5H4V3z" />
            {/* Shredder strips coming down */}
            <line x1="5" y1="13" x2="5" y2="21" />
            <line x1="7.5" y1="13" x2="7.5" y2="19" />
            <line x1="10" y1="13" x2="10" y2="21" />
            <line x1="12.5" y1="13" x2="12.5" y2="18" />
            {/* Shield overlay on right */}
            <path d="M17 8l-3.5 1.5v3c0 2.5 1.8 4.8 3.5 5.5 1.7-.7 3.5-3 3.5-5.5v-3L17 8z" />
            <line x1="15.5" y1="11.5" x2="18.5" y2="11.5" />
          </svg>
        );

      case "tracer":
        // Reference Icon 12: Shield with square microchip CPU & bus pinouts
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 5.5v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5v-6L12 2z" />
            {/* Center Microchip CPU */}
            <rect x="9" y="8.5" width="6" height="6" rx="0.5" />
            <line x1="10.5" y1="10" x2="13.5" y2="13" />
            {/* Pinouts */}
            <line x1="10.5" y1="6.5" x2="10.5" y2="8.5" />
            <line x1="13.5" y1="6.5" x2="13.5" y2="8.5" />
            <line x1="10.5" y1="14.5" x2="10.5" y2="16.5" />
            <line x1="13.5" y1="14.5" x2="13.5" y2="16.5" />
            <line x1="7" y1="10" x2="9" y2="10" />
            <line x1="7" y1="13" x2="9" y2="13" />
            <line x1="15" y1="10" x2="17" y2="10" />
            <line x1="15" y1="13" x2="17" y2="13" />
          </svg>
        );

      case "datadog":
        // Reference Icon 15: Globe with ethernet connector & shield in pure black & white
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Globe */}
            <circle cx="11.5" cy="11.5" r="8.5" />
            <ellipse cx="11.5" cy="11.5" rx="4" ry="8.5" />
            <line x1="3" y1="11.5" x2="20" y2="11.5" />
            {/* Ethernet cable box in center */}
            <rect x="8.5" y="9.5" width="6" height="4" rx="0.5" fill="white" stroke="currentColor" />
            <line x1="10" y1="11.5" x2="10" y2="13.5" />
            <line x1="11.5" y1="11.5" x2="11.5" y2="13.5" />
            <line x1="13" y1="11.5" x2="13" y2="13.5" />
            {/* Lower-right shield */}
            <path d="M19 14l-2.5 1v2c0 1.8 1.2 3.5 2.5 4 1.3-.5 2.5-2.2 2.5-4v-2L19 14z" fill="white" stroke="currentColor" />
          </svg>
        );

      case "pentester":
        // Reference Icon 7: Shield with circuit sensor nodes
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4l-5 2.5v4c0 3.5 2.5 7 5 8 2.5-1 5-4.5 5-8v-4L12 4z" />
            {/* Horizontal hatch */}
            <line x1="9" y1="8.5" x2="15" y2="8.5" />
            <line x1="8.5" y1="11" x2="15.5" y2="11" />
            <line x1="9.5" y1="13.5" x2="14.5" y2="13.5" />
            {/* Circuit arms with terminal nodes */}
            <line x1="7" y1="8" x2="4.5" y2="6.5" />
            <circle cx="3.5" cy="6" r="1.1" fill="currentColor" />
            <line x1="7" y1="13" x2="4" y2="14.5" />
            <circle cx="3" cy="15" r="1.1" fill="currentColor" />
            <line x1="17" y1="8" x2="19.5" y2="6.5" />
            <circle cx="20.5" cy="6" r="1.1" fill="currentColor" />
            <line x1="17" y1="13" x2="20" y2="14.5" />
            <circle cx="21" cy="15" r="1.1" fill="currentColor" />
          </svg>
        );

      case "architect":
        // Reference Icon 4: Microchip key with binary stream on left
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Binary stream lines on left */}
            <line x1="2" y1="6" x2="6" y2="6" />
            <line x1="2" y1="8.5" x2="5" y2="8.5" />
            <line x1="2" y1="11" x2="6" y2="11" />
            <line x1="2" y1="13.5" x2="5" y2="13.5" />
            <line x1="2" y1="16" x2="6" y2="16" />
            {/* Key shaft */}
            <line x1="14" y1="3" x2="14" y2="13" />
            {/* Key teeth */}
            <line x1="14" y1="4.5" x2="17" y2="4.5" />
            <line x1="14" y1="7" x2="16" y2="7" />
            <line x1="14" y1="9.5" x2="17.5" y2="9.5" />
            {/* Microchip base */}
            <rect x="11" y="13" width="6" height="6" rx="1" />
            <circle cx="14" cy="16" r="1" fill="currentColor" />
            <line x1="12.5" y1="19" x2="12.5" y2="21" />
            <line x1="15.5" y1="19" x2="15.5" y2="21" />
          </svg>
        );

      case "compliance":
        // Reference Icon 14: Quartered crosshatch shield
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 5.5v6c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5v-6L12 2z" />
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="4" y1="11.5" x2="20" y2="11.5" />
            {/* Diagonal crosshatch in top-left & bottom-right */}
            <line x1="6" y1="7" x2="10" y2="11" />
            <line x1="8" y1="5.5" x2="12" y2="9.5" />
            <line x1="13" y1="14" x2="17" y2="18" />
            <line x1="15" y1="12.5" x2="19" y2="16.5" />
          </svg>
        );

      case "rbac":
        // Reference Icon 10: Padlock with password dashes **** _
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 9V6a4 4 0 018 0v3" />
            <rect x="4.5" y="9" width="15" height="10" rx="2" />
            {/* Asterisks for password dots */}
            <line x1="7" y1="14" x2="9" y2="14" />
            <line x1="8" y1="13" x2="8" y2="15" />
            <line x1="10.5" y1="14" x2="12.5" y2="14" />
            <line x1="11.5" y1="13" x2="11.5" y2="15" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="15" y1="13" x2="15" y2="15" />
            {/* Trailing cursor dash */}
            <line x1="17.5" y1="15" x2="19" y2="15" strokeWidth="2" />
          </svg>
        );

      case "user":
        // Reference Icon 5: Speech balloon with padlock
        return (
          <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.5 8.5 0 01-8.5 8.5c-1.5 0-2.9-.4-4.2-1L3 20.5l1.5-4.3A8.5 8.5 0 1121 11.5z" />
            <path d="M10.5 10.5V9a1.5 1.5 0 013 0v1.5" />
            <rect x="9.5" y="10.5" width="5" height="4" rx="0.8" />
            <circle cx="12" cy="12.5" r="0.6" fill="currentColor" />
          </svg>
        );

      case "custom":
      default:
        const initials = (label || "AI").slice(0, 2).toUpperCase();
        return (
          <div className="w-full h-full flex items-center justify-center font-bold font-mono text-xs text-slate-900">
            {initials}
          </div>
        );
    }
  };

  return (
    <div
      className={`relative shrink-0 ${sizeClasses[size]} ${style.bg} ${style.border} ${style.icon} border rounded-2xl flex items-center justify-center transition-all ${className}`}
    >
      {renderIcon()}
      {showStatus && (
        <span
          className={`absolute ${statusDotSizes[size]} rounded-full ${style.dot} ring-2 ring-white`}
        ></span>
      )}
    </div>
  );
}
