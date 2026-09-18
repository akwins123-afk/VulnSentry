"use client";

import React from "react";

interface AvatarProps {
  type: "orchestrator" | "shield" | "healer" | "context" | "tracer" | "user";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
}

export default function AgentAvatar({
  type,
  size = "md",
  className = "",
  showStatus = true,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  };

  const statusDotSizes = {
    sm: "w-2 h-2 bottom-0 right-0",
    md: "w-2.5 h-2.5 bottom-0 right-0",
    lg: "w-3 h-3 bottom-0.5 right-0.5",
    xl: "w-3.5 h-3.5 bottom-0.5 right-0.5",
  };

  switch (type) {
    case "orchestrator":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#00c968] via-[#059669] to-[#047857] p-0.5 shadow-md shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#032e1e] flex items-center justify-center overflow-hidden relative">
              {/* Glowing grid & visor */}
              <svg className="w-3/4 h-3/4 text-[#00c968]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="15" rx="3" stroke="currentColor" fill="#064e3b" fillOpacity="0.4" />
                <path d="M7 11h10M9 8h6M8 15h8" stroke="currentColor" strokeLinecap="round" />
                <circle cx="8" cy="11" r="1.2" fill="#34d399" />
                <circle cx="16" cy="11" r="1.2" fill="#34d399" />
                <path d="M12 2v2M8 2h8" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-[#00c968]/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-[#00c968] ring-2 ring-white animate-pulse`}></span>
          )}
        </div>
      );

    case "shield":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#2e1c03] flex items-center justify-center overflow-hidden relative">
              <svg className="w-3/4 h-3/4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.25 4.6-1.1 8-6 8-11.25V6l-8-4z" fill="#78350f" fillOpacity="0.5" />
                <path d="M9 12l2 2 4-4" stroke="#fef3c7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
                <circle cx="12" cy="12" r="7" stroke="currentColor" strokeDasharray="2 2" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-amber-400/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-amber-400 ring-2 ring-white`}></span>
          )}
        </div>
      );

    case "healer":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-0.5 shadow-md shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#042824] flex items-center justify-center overflow-hidden relative">
              <svg className="w-3/4 h-3/4 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12a8 8 0 0114.93-4M20 12a8 8 0 01-14.93 4" strokeLinecap="round" />
                <path d="M19 4v4h-4M5 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" fill="#2dd4bf" fillOpacity="0.6" stroke="#5eead4" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-400/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-emerald-400 ring-2 ring-white`}></span>
          )}
        </div>
      );

    case "context":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-purple-400 via-fuchsia-500 to-indigo-700 p-0.5 shadow-md shadow-purple-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#220738] flex items-center justify-center overflow-hidden relative">
              <svg className="w-3/4 h-3/4 text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 011.32-4.24A2.5 2.5 0 019.5 2z" fill="#581c87" fillOpacity="0.4" />
                <path d="M14.5 2A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-1.32-4.24A2.5 2.5 0 0014.5 2z" fill="#581c87" fillOpacity="0.4" />
                <circle cx="9" cy="8" r="1" fill="#e9d5ff" />
                <circle cx="15" cy="8" r="1" fill="#e9d5ff" />
                <circle cx="8" cy="14" r="1" fill="#e9d5ff" />
                <circle cx="16" cy="14" r="1" fill="#e9d5ff" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-purple-400/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-purple-400 ring-2 ring-white`}></span>
          )}
        </div>
      );

    case "tracer":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-700 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#032338] flex items-center justify-center overflow-hidden relative">
              <svg className="w-3/4 h-3/4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" fill="#082f49" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" fill="#082f49" />
                <rect x="8.5" y="14" width="7" height="7" rx="1.5" stroke="currentColor" fill="#082f49" />
                <path d="M6.5 10v2a2 2 0 002 2h7a2 2 0 002-2v-2M12 14v-2" stroke="currentColor" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-400/20 to-transparent pointer-events-none"></div>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-cyan-400 ring-2 ring-white`}></span>
          )}
        </div>
      );

    case "user":
      return (
        <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-700 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#101735] flex items-center justify-center overflow-hidden relative">
              <span className="text-white font-bold text-xs tracking-wider">JJ</span>
            </div>
          </div>
          {showStatus && (
            <span className={`absolute ${statusDotSizes[size]} rounded-full bg-indigo-400 ring-2 ring-white`}></span>
          )}
        </div>
      );

    default:
      return null;
  }
}
