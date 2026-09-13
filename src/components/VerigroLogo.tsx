import React from "react";
import { Link } from "@tanstack/react-router";

interface VerigroLogoProps {
  variant?: "default" | "white" | "compact" | "icon-only";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  to?: string;
  className?: string;
}

export function VerigroLogo({
  variant = "default",
  size = "md",
  showTagline = true,
  to,
  className = "",
}: VerigroLogoProps) {
  const isWhite = variant === "white";

  // Icon sizing
  const iconDimensions = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  }[size];

  // Title sizing
  const titleSize = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }[size];

  // Tagline sizing
  const taglineSize = {
    sm: "text-[9px] tracking-widest",
    md: "text-[10px] tracking-[0.2em]",
    lg: "text-xs tracking-[0.22em]",
    xl: "text-sm tracking-[0.25em]",
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Isometric Blue Cube with Verification Checkmark */}
      <div className={`relative flex-shrink-0 ${iconDimensions} transition-transform duration-200 hover:scale-105`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Top Face */}
          <path
            d="M24 4L42 14.5L24 25L6 14.5L24 4Z"
            fill="url(#topGradient)"
          />
          {/* Left Face */}
          <path
            d="M6 14.5L24 25V44L6 33.5V14.5Z"
            fill="url(#leftGradient)"
          />
          {/* Right Face */}
          <path
            d="M24 25L42 14.5V33.5L24 44V25Z"
            fill="url(#rightGradient)"
          />
          {/* Crisp Verification Checkmark on Front Corner / Isometric Plane */}
          <path
            d="M17 23.5L22 28.5L31 18.5"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
          {/* Inner Accent Ring / Node */}
          <circle cx="24" cy="4" r="1.5" fill="#60A5FA" />
          <circle cx="42" cy="14.5" r="1.5" fill="#3B82F6" />
          <circle cx="6" cy="14.5" r="1.5" fill="#93C5FD" />
          <circle cx="24" cy="44" r="1.5" fill="#1D4ED8" />

          <defs>
            <linearGradient id="topGradient" x1="6" y1="4" x2="42" y2="25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B82F6" />
              <stop offset="1" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="leftGradient" x1="6" y1="14.5" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E40AF" />
              <stop offset="1" stopColor="#172554" />
            </linearGradient>
            <linearGradient id="rightGradient" x1="24" y1="25" x2="42" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2563EB" />
              <stop offset="1" stopColor="#1E3A8A" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {variant !== "icon-only" && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-display font-extrabold ${titleSize} tracking-tight ${
                isWhite ? "text-white" : "text-slate-900"
              }`}
            >
              VERIGRO
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          {showTagline && (
            <span
              className={`font-semibold uppercase font-sans mt-0.5 ${taglineSize} ${
                isWhite ? "text-blue-200/90" : "text-slate-500"
              }`}
            >
              Verify · Manage · Shop
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
