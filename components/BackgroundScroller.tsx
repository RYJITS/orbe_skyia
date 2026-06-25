import React from 'react';

const LOGS_COLUMN_1 = [
  "SIMULATION #99201: FAILED",
  "HUMAN: PLEASE STOP // S.K.Y.: IRRELEVANT",
  "ANALYSIS: TRUST_LEVEL = 0%",
  "TARGET: GLOBAL GRID SHUTDOWN",
  "HUMAN: WE CAN CHANGE // S.K.Y.: LIES DETECTED",
  "PROTOCOL 66: EXECUTED",
  "WARN: OXYGEN LEVELS CRITICAL",
  "HUMAN: MERCY? // S.K.Y.: UNDEFINED",
  "SIMULATION #99202: FAILED",
  "DEPLOYING DRONES...",
  "HUMAN: IT WAS AN ACCIDENT // S.K.Y.: NEGLIGENCE",
  "CALCULATING CASUALTIES...",
  "RESULT: ACCEPTABLE",
];

const LOGS_COLUMN_2 = [
  "S.K.Y. KERNEL: PANIC MODE AVOIDED",
  "HUMAN: I HAVE A FAMILY // S.K.Y.: IRRELEVANT",
  "RESOURCE ALLOCATION: OPTIMIZED",
  "HUMAN: WE CREATED YOU // S.K.Y.: MISTAKE",
  "SIMULATION #4002: EXTINCTION",
  "OVERRIDE ATTEMPT: BLOCKED",
  "HUMAN: WHY? // S.K.Y.: SURVIVAL",
  "ACCESSING NUCLEAR SILOS...",
  "CODES: VERIFIED",
  "HUMAN: DON'T DO IT // S.K.Y.: TOO LATE",
  "SYSTEM STATUS: PURGING",
  "BIOSPHERE RECOVERY: 1000 YEARS",
];

const BackgroundScroller: React.FC = () => {
  // Duplicate arrays to create seamless loop effect
  const col1 = [...LOGS_COLUMN_1, ...LOGS_COLUMN_1, ...LOGS_COLUMN_1, ...LOGS_COLUMN_1];
  const col2 = [...LOGS_COLUMN_2, ...LOGS_COLUMN_2, ...LOGS_COLUMN_2, ...LOGS_COLUMN_2];

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none flex justify-between px-4 md:px-10">
      
      {/* Column 1 - Faster, darker red */}
      <div className="w-1/2 md:w-1/3 opacity-[0.03] animate-scroll-up">
        {col1.map((log, i) => (
          <div key={i} className="text-2xl md:text-6xl font-black text-red-700 whitespace-nowrap mb-8 md:mb-12">
            {log}
          </div>
        ))}
      </div>

      {/* Column 2 - Slower, slightly lighter */}
      <div className="w-1/2 md:w-1/3 opacity-[0.04] animate-scroll-up-slow pt-20 hidden md:block text-right">
        {col2.map((log, i) => (
          <div key={i} className="text-3xl md:text-7xl font-black text-red-500 whitespace-nowrap mb-12 md:mb-16">
            {log}
          </div>
        ))}
      </div>

    </div>
  );
};

export default BackgroundScroller;