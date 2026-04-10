import React from "react";

interface TerminalWindowProps {
  title?: string;
  children: React.ReactNode;
  width?: number;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  title = "Terminal",
  children,
  width = 860,
}) => {
  return (
    <div
      style={{
        width,
        background: "#1a1b26",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.3)",
        border: "1px solid #2d2d3d",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          background: "#252535",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid #2d2d3d",
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
        <span
          style={{
            marginLeft: "auto",
            marginRight: "auto",
            color: "#555577",
            fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {title}
        </span>
      </div>
      {/* Content area */}
      <div
        style={{
          padding: "24px 28px",
          fontFamily: '"SF Mono", "Fira Code", "Courier New", monospace',
          fontSize: 16,
          lineHeight: 1.7,
          color: "#e6edf3",
          whiteSpace: "pre",
        }}
      >
        {children}
      </div>
    </div>
  );
};
