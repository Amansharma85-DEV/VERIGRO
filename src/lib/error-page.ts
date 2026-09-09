export function renderErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Server Error — NIRIKSHAN</title>
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #0f172a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 1.5rem;
      box-sizing: border-box;
    }
    .card {
      max-width: 440px;
      padding: 2.5rem 2rem;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 1.5rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 20px 50px -20px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 1.75rem;
      margin: 0 0 0.75rem 0;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p {
      color: #94a3b8;
      font-size: 0.925rem;
      line-height: 1.6;
      margin: 0 0 1.75rem 0;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      background: linear-script(135deg, #10b981, #06b6d4);
      background: #0ea5e9;
      color: #0f172a;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 0.75rem;
      text-decoration: none;
      transition: opacity 0.2s ease;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">500 Server Error</div>
    <h1>Kuch takneeki gadbad ho gayi</h1>
    <p>Server par request process karne me dikkat aayi. Kripya page reload karein ya thodi der baad dobara koshish karein.</p>
    <a href="/" class="btn">Home Par Jaayein</a>
  </div>
</body>
</html>`;
}
