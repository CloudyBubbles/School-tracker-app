export default function PageStack() {
  return (
    <div style={{ position: "relative", width: "100%", height: "20px" }}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "6px",
          right: "6px",
          height: "18px",
          background: "var(--parchment-edge)",
          borderRadius: "0 0 3px 3px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "3px",
          left: "3px",
          right: "3px",
          height: "18px",
          background: "var(--parchment-dark)",
          borderRadius: "0 0 3px 3px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "6px",
          left: 0,
          right: 0,
          height: "18px",
          background: "var(--parchment)",
          borderRadius: "0 0 3px 3px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
        }}
      />
    </div>
  );
}
