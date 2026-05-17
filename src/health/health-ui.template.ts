import * as os from 'os';

export function getHtmlDashboard(data: any): string {
  const isHealthy = data.status === 'ok';
  const dbStatus = data.info.prisma.status;
  const dbLatency = data.info.prisma.durationMs;
  const redisStatus = data.info.redis.status;
  const redisHost = data.info.redis.host;
  const redisPort = data.info.redis.port;
  const memoryStatus = data.info.memory_heap.status;
  const heapUsedBytes = data.info.memory_heap.used;
  const heapLimitBytes = data.info.memory_heap.limit;
  
  const heapUsedMb = Math.round((heapUsedBytes / 1024 / 1024) * 100) / 100;
  const heapLimitMb = Math.round((heapLimitBytes / 1024 / 1024) * 100) / 100;
  const memoryPercentage = Math.min(Math.round((heapUsedMb / heapLimitMb) * 100), 100);
  
  // Mask DB URL
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@db:5432/payments?schema=public';
  const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':******@').split('?')[0];

  // Platforms
  const nodeVersion = process.version;
  const platform = process.platform;
  const cpuArch = process.arch;
  const cpuCores = os.cpus().length;
  const totalMem = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 10) / 10;
  const freeMem = Math.round((os.freemem() / 1024 / 1024 / 1024) * 10) / 10;
  const uptimeSec = Math.floor(process.uptime());
  const pid = process.pid;

  // Payment integrations
  const stripeConfigured = process.env.STRIPE_SECRET_KEY ? 'Activo' : 'Sin Configurar';
  const paypalConfigured = process.env.PAYPAL_CLIENT_ID ? 'Activo' : 'Sin Configurar';
  const paypalEnv = process.env.PAYPAL_ENVIRONMENT || 'sandbox';

  const healthJson = JSON.stringify(data, null, 2);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Middleware de Pagos - Panel de Salud</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #070913;
      --bg-secondary: #0c0f1d;
      --card-bg: rgba(15, 20, 38, 0.65);
      --card-border: rgba(255, 255, 255, 0.05);
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      
      --accent-success: #10b981;
      --accent-success-glow: rgba(16, 185, 129, 0.18);
      --accent-danger: #ef4444;
      --accent-danger-glow: rgba(239, 68, 68, 0.18);
      --accent-warning: #f59e0b;
      --accent-warning-glow: rgba(245, 158, 11, 0.18);
      
      --accent-cyan: #06b6d4;
      --accent-violet: #8b5cf6;
      --accent-blue: #3b82f6;
      --accent-purple: #a855f7;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-primary);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(30, 41, 59, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 50%);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
      position: relative;
      padding-bottom: 3rem;
    }

    /* Ambient Blur Blobs */
    .glow-blob {
      position: absolute;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
      filter: blur(130px);
      opacity: 0.12;
      transition: all 1.5s ease;
    }
    .blob-violet {
      background: var(--accent-violet);
      top: -100px;
      right: -50px;
      animation: float-slow 25s infinite alternate;
    }
    .blob-cyan {
      background: var(--accent-cyan);
      bottom: 100px;
      left: -100px;
      animation: float-slow 30s infinite alternate-reverse;
    }

    @keyframes float-slow {
      0% { transform: translate(0, 0) scale(1); }
      50% { transform: translate(60px, 40px) scale(1.08); }
      100% { transform: translate(-30px, -20px) scale(0.95); }
    }

    .container {
      max-width: 1300px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      position: relative;
      z-index: 10;
    }

    /* Navigation Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2.5rem;
      padding: 1.25rem 2rem;
      background: rgba(12, 15, 29, 0.45);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .logo-icon {
      width: 2.5rem;
      height: 2.5rem;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-violet));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      box-shadow: 0 0 15px rgba(6, 182, 212, 0.35);
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 1px;
    }

    .system-status-indicator {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.45rem 1rem;
      border-radius: 30px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-success);
      box-shadow: 0 0 8px var(--accent-success);
      animation: pulse-simple 1.5s infinite;
    }

    @keyframes pulse-simple {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Main Grid Layout */
    .grid-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    @media (max-width: 1024px) {
      .grid-cards {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 640px) {
      .grid-cards {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.6rem;
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: transparent;
      transition: all 0.3s ease;
    }

    .card-status-up::before { background: linear-gradient(90deg, var(--accent-success), var(--accent-cyan)); }
    .card-status-down::before { background: linear-gradient(90deg, var(--accent-danger), var(--accent-warning)); }

    /* Overall Status Card (Span 2) */
    .overall-status {
      grid-column: span 2;
      min-height: 190px;
    }
    @media (max-width: 640px) {
      .overall-status {
        grid-column: span 1;
      }
    }

    .status-tag {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-tag-up {
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-success);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .status-tag-down {
      background: rgba(239, 68, 68, 0.12);
      color: var(--accent-danger);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .status-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .status-card-body {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .pulse-ring-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pulse-ring {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid var(--accent-success);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-success);
      box-shadow: 0 0 15px var(--accent-success-glow);
      animation: pulse-glow-green 2s infinite;
    }

    .pulse-ring.offline {
      border-color: var(--accent-danger);
      background: rgba(239, 68, 68, 0.1);
      color: var(--accent-danger);
      box-shadow: 0 0 15px var(--accent-danger-glow);
      animation: pulse-glow-red 2s infinite;
    }

    @keyframes pulse-glow-green {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
      70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    @keyframes pulse-glow-red {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
      70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    .status-text-title {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .status-text-desc {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    /* Core Metrics Cards */
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1.25rem;
    }

    .card-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .card-icon {
      font-size: 1.25rem;
      color: var(--text-muted);
    }

    .card-main-val {
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      line-height: 1.2;
      margin-bottom: 0.4rem;
    }

    .db-latency-value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent-cyan);
      font-size: 1.2rem;
      font-weight: 600;
    }

    .card-footer-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    /* Gauge Progress Bar for Memory */
    .progress-container {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      overflow: hidden;
      margin: 0.6rem 0;
    }

    .progress-bar {
      height: 100%;
      width: ${memoryPercentage}%;
      background: linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-violet) 100%);
      border-radius: 10px;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .memory-vals {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Layout: Columns for details and settings */
    .secondary-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
    }

    @media (max-width: 900px) {
      .secondary-layout {
        grid-template-columns: 1fr;
      }
    }

    .panel {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 1.75rem;
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
    }

    .panel-title {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 0.85rem;
    }

    .panel-title-icon {
      color: var(--accent-cyan);
    }

    /* Table styling for System Info */
    .metrics-table {
      width: 100%;
      border-collapse: collapse;
    }

    .metrics-table tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    .metrics-table tr:last-child {
      border-bottom: none;
    }

    .metrics-table td {
      padding: 0.75rem 0;
      font-size: 0.88rem;
    }

    .metrics-table td.label-cell {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .metrics-table td.val-cell {
      text-align: right;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-primary);
    }

    /* Integration stats cards */
    .gateways-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 480px) {
      .gateways-grid {
        grid-template-columns: 1fr;
      }
    }

    .gateway-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.2s ease;
    }

    .gateway-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.07);
    }

    .gw-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .gw-name {
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }

    .gw-badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
      background: rgba(6, 182, 212, 0.1);
      color: var(--accent-cyan);
      border: 1px solid rgba(6, 182, 212, 0.15);
    }

    .gw-val {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
      margin-top: 0.25rem;
    }

    /* Swagger panel button link */
    .swagger-btn-box {
      margin-top: 1.5rem;
      text-align: center;
    }

    /* Control Panel & Terminal JSON viewer */
    .console-panel {
      background: #05070e;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
    }

    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.1rem 1.6rem;
      background: rgba(255, 255, 255, 0.01);
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }

    @media (max-width: 600px) {
      .console-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
    }

    .console-title-group {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .console-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent-cyan);
      box-shadow: 0 0 6px var(--accent-cyan);
    }

    .console-title {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--text-primary);
    }

    .console-actions {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    @media (max-width: 600px) {
      .console-actions {
        width: 100%;
        justify-content: space-between;
      }
    }

    /* Toggle Switch */
    .switch-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      cursor: pointer;
      user-select: none;
    }

    .switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(255, 255, 255, 0.07);
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 34px;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: #e5e7eb;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--accent-cyan);
    }

    input:checked + .slider:before {
      transform: translateX(18px);
      background-color: #ffffff;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
      color: white;
      border: none;
      padding: 0.55rem 1.15rem;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Outfit', sans-serif;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.2);
    }

    .btn:hover {
      transform: translateY(-1.5px);
      box-shadow: 0 6px 18px rgba(6, 182, 212, 0.35);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: var(--text-primary);
      box-shadow: none;
      text-decoration: none;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: none;
    }

    .spin {
      animation: spin-rot 0.8s linear infinite;
    }

    @keyframes spin-rot {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Terminal Console Body */
    .console-body {
      padding: 1.5rem;
      background: #030408;
      max-height: 380px;
      overflow-y: auto;
      position: relative;
    }

    .console-body pre {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      line-height: 1.6;
      color: #a5b4fc;
    }

    .copy-btn {
      position: absolute;
      top: 1rem;
      right: 1.25rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 6px;
      padding: 0.35rem 0.65rem;
      font-size: 0.72rem;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    }

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.07);
      color: white;
      border-color: rgba(255, 255, 255, 0.1);
    }

    /* Telemetry indicators */
    .telemetry-row {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .telemetry-item {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .tel-label {
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .tel-val {
      font-size: 0.85rem;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: var(--accent-cyan);
    }

    svg.svg-icon {
      width: 1.1em;
      height: 1.1em;
      fill: currentColor;
      display: inline-block;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="glow-blob blob-violet"></div>
  <div class="glow-blob blob-cyan"></div>

  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand">
        <div class="logo-icon">MP</div>
        <div>
          <h1 class="brand-title">Universal Payments Middleware</h1>
          <div class="brand-subtitle">Consola de Salud e Infraestructura</div>
        </div>
      </div>
      <div class="system-status-indicator">
        <span class="live-dot"></span>
        <span style="color: var(--text-secondary); font-weight: 500;">MONITOR ACTIVO</span>
      </div>
    </header>

    <!-- Main Grid Cards -->
    <div class="grid-cards">
      <!-- Card 1: Overall Status -->
      <div id="overall-card" class="card ${isHealthy ? 'card-status-up' : 'card-status-down'} overall-status">
        <div class="status-card-header">
          <span class="card-label">Estado Global del Sistema</span>
          <span id="main-badge" class="status-tag ${isHealthy ? 'status-tag-up' : 'status-tag-down'}">${isHealthy ? 'ONLINE' : 'DEGRADADO'}</span>
        </div>
        <div class="status-card-body">
          <div class="pulse-ring-container">
            <div id="main-pulse" class="pulse-ring ${isHealthy ? '' : 'offline'}">
              <svg class="svg-icon" viewBox="0 0 24 24" style="width: 24px; height: 24px;">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
          <div>
            <h2 id="main-status-text" class="status-text-title">${isHealthy ? 'SISTEMA OPERATIVO' : 'SISTEMA CON ALERTAS'}</h2>
            <p class="status-text-desc">Todos los servicios críticos integrados se encuentran monitoreados.</p>
          </div>
        </div>
      </div>

      <!-- Card 2: Database Status -->
      <div id="db-card" class="card ${dbStatus === 'up' ? 'card-status-up' : 'card-status-down'}">
        <div class="card-top">
          <span class="card-label">Base de Datos</span>
          <span id="db-dot" class="live-dot" style="background-color: ${dbStatus === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)'}; box-shadow: 0 0 8px ${dbStatus === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)'}"></span>
        </div>
        <div>
          <div class="card-main-val">PostgreSQL</div>
          <div class="db-latency-value" id="db-latency">${dbLatency}ms <span style="font-size: 0.75rem; color: var(--text-muted);">de latencia</span></div>
        </div>
        <div class="card-footer-info" title="${maskedDbUrl}">
          <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 4.02 2 6.5v11c0 2.48 4.48 4.5 10 4.5s10-2.02 10-4.5v-11C22 4.02 17.52 2 12 2zm0 18c-4.41 0-8-1.57-8-3.5V14.6c1.94 1.15 4.8 1.9 8 1.9s6.06-.75 8-1.9v1.9c0 1.93-3.59 3.5-8 3.5zm0-4.5c-4.41 0-8-1.57-8-3.5v-2.1c1.94 1.15 4.8 1.9 8 1.9s6.06-.75 8-1.9v2.1c0 1.93-3.59 3.5-8 3.5zm0-4.5c-4.41 0-8-1.57-8-3.5S7.59 3 12 3s8 1.57 8 3.5-3.59 3.5-8 3.5z"/></svg>
          <span id="db-address">${maskedDbUrl}</span>
        </div>
      </div>

      <!-- Card 3: Redis Status -->
      <div id="redis-card" class="card ${redisStatus === 'up' ? 'card-status-up' : 'card-status-down'}">
        <div class="card-top">
          <span class="card-label">Redis & BullMQ</span>
          <span id="redis-dot" class="live-dot" style="background-color: ${redisStatus === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)'}; box-shadow: 0 0 8px ${redisStatus === 'up' ? 'var(--accent-success)' : 'var(--accent-danger)'}"></span>
        </div>
        <div>
          <div class="card-main-val">Redis Broker</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Cola de Webhooks Activa</div>
        </div>
        <div class="card-footer-info">
          <svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>
          <span id="redis-address">${redisHost}:${redisPort}</span>
        </div>
      </div>

      <!-- Card 4: Memory Usage -->
      <div id="mem-card" class="card ${memoryStatus === 'up' ? 'card-status-up' : 'card-status-down'}">
        <div class="card-top">
          <span class="card-label">Memoria Heap (Node)</span>
          <span class="status-tag status-tag-up" id="heap-pct-val" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.15); color: var(--accent-violet); font-family: 'JetBrains Mono', monospace;">${memoryPercentage}%</span>
        </div>
        <div>
          <div class="progress-container">
            <div id="heap-bar" class="progress-bar"></div>
          </div>
          <div class="memory-vals">
            <span id="heap-used-val">${heapUsedMb} MB</span>
            <span style="color: var(--text-muted);">límite ${heapLimitMb} MB</span>
          </div>
        </div>
        <div class="card-footer-info">
          <svg class="svg-icon" viewBox="0 0 24 24"><path d="M9 16h6v-6H9v6zm3-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-1.57-8-3.5V14.6c1.94 1.15 4.8 1.9 8 1.9s6.06-.75 8-1.9v1.9c0 1.93-3.59 3.5-8 3.5z"/></svg>
          <span>Asignación Dinámica Activa</span>
        </div>
      </div>
    </div>

    <!-- Secondary details & Payment integrations -->
    <div class="secondary-layout">
      <!-- Left Panel: Infrastructure metrics -->
      <div class="panel">
        <h3 class="panel-title">
          <svg class="svg-icon panel-title-icon" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          Infraestructura y Sistema Host
        </h3>
        <table class="metrics-table">
          <tr>
            <td class="label-cell">Plataforma Operativa</td>
            <td class="val-cell" id="platform-val">${platform} (${cpuArch})</td>
          </tr>
          <tr>
            <td class="label-cell">Procesadores Lógicos</td>
            <td class="val-cell" id="cores-val">${cpuCores} Cores</td>
          </tr>
          <tr>
            <td class="label-cell">Memoria del Sistema</td>
            <td class="val-cell" id="sysmem-val">${freeMem} GB libres / ${totalMem} GB totales</td>
          </tr>
          <tr>
            <td class="label-cell">Versión de Node.js</td>
            <td class="val-cell" id="node-val">${nodeVersion}</td>
          </tr>
          <tr>
            <td class="label-cell">Process ID (PID)</td>
            <td class="val-cell" id="pid-val">${pid}</td>
          </tr>
          <tr>
            <td class="label-cell">Tiempo Activo del Middleware</td>
            <td class="val-cell" id="uptime-val" style="color: var(--accent-cyan); font-weight: bold;">Cargando...</td>
          </tr>
        </table>
      </div>

      <!-- Right Panel: Payment Gateways -->
      <div class="panel">
        <h3 class="panel-title">
          <svg class="svg-icon panel-title-icon" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
          Pasarelas de Pago e Integraciones
        </h3>
        <div class="gateways-grid">
          <div class="gateway-card">
            <div class="gw-header">
              <span class="gw-name" style="color: #635bff;">Stripe Gateway</span>
              <span class="gw-badge">${stripeConfigured}</span>
            </div>
            <div class="gw-val">Eventos de Webhooks</div>
          </div>
          <div class="gateway-card">
            <div class="gw-header">
              <span class="gw-name" style="color: #003087;">PayPal Gateway</span>
              <span class="gw-badge" style="background: rgba(168, 85, 247, 0.1); color: var(--accent-purple); border-color: rgba(168, 85, 247, 0.15);">${paypalConfigured}</span>
            </div>
            <div class="gw-val">Entorno: ${paypalEnv}</div>
          </div>
        </div>
        
        <div class="swagger-btn-box">
          <a href="/api" target="_blank" class="btn btn-secondary" style="width: 100%; display: flex; justify-content: center; align-items: center;">
            <svg class="svg-icon" viewBox="0 0 24 24" style="margin-right: 0.5rem;"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
            Explorar Documentación de la API (Swagger UI)
          </a>
        </div>
      </div>
    </div>

    <!-- Console Panel (JSON payload) -->
    <div class="console-panel">
      <div class="console-header">
        <div class="console-title-group">
          <div class="console-indicator"></div>
          <span class="console-title">Respuesta de Telemetría JSON</span>
        </div>
        <div class="console-actions">
          <div class="telemetry-row">
            <div class="telemetry-item">
              <span class="tel-label">Tiempo de Respuesta</span>
              <span class="tel-val" id="latency-counter">0ms</span>
            </div>
          </div>
          
          <div class="switch-group">
            <span>Auto-Refresh (3s)</span>
            <label class="switch">
              <input type="checkbox" id="auto-refresh" checked>
              <span class="slider"></span>
            </label>
          </div>

          <button class="btn" id="scan-btn">
            <svg id="refresh-icon" class="svg-icon" viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            Escanear
          </button>
        </div>
      </div>
      <div class="console-body">
        <button class="copy-btn" id="copy-btn">Copiar JSON</button>
        <pre><code class="json-code" id="json-output">${healthJson}</code></pre>
      </div>
    </div>
  </div>

  <script>
    // Real-time ticking Uptime counter
    let initialUptime = ${uptimeSec};
    let currentUptimeSeconds = Math.floor(initialUptime);

    function formatUptime(secs) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      return h + 'h ' + m + 'm ' + s + 's';
    }

    document.getElementById('uptime-val').innerText = formatUptime(currentUptimeSeconds);

    const uptimeTicker = setInterval(() => {
      currentUptimeSeconds++;
      document.getElementById('uptime-val').innerText = formatUptime(currentUptimeSeconds);
    }, 1000);

    // Refresh control variables
    const autoRefreshCheckbox = document.getElementById('auto-refresh');
    const scanBtn = document.getElementById('scan-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const latencyCounter = document.getElementById('latency-counter');
    const copyBtn = document.getElementById('copy-btn');
    let autoRefreshInterval = null;

    // Clipboard copy functionality
    copyBtn.addEventListener('click', () => {
      const text = document.getElementById('json-output').innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.innerText = '¡Copiado!';
        setTimeout(() => { copyBtn.innerText = 'Copiar JSON'; }, 2000);
      });
    });

    // Fetch call
    async function performCheck() {
      const startTime = Date.now();
      refreshIcon.classList.add('spin');
      scanBtn.disabled = true;
      
      try {
        const response = await fetch(window.location.pathname, {
          headers: {
            'Accept': 'application/json'
          }
        });
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        latencyCounter.innerText = duration + 'ms';
        updateDashboard(data);
      } catch (error) {
        console.error('Error fetching health status:', error);
      } finally {
        refreshIcon.classList.remove('spin');
        scanBtn.disabled = false;
      }
    }

    function updateDashboard(data) {
      const isHealthy = data.status === 'ok';
      
      // Update Overall status card
      const mainBadge = document.getElementById('main-badge');
      const mainStatusText = document.getElementById('main-status-text');
      const mainPulse = document.getElementById('main-pulse');
      const overallCard = document.getElementById('overall-card');
      
      if (isHealthy) {
        mainStatusText.innerText = 'SISTEMA OPERATIVO';
        mainBadge.innerText = 'ONLINE';
        mainBadge.className = 'status-tag status-tag-up';
        mainPulse.className = 'pulse-ring';
        overallCard.className = 'card card-status-up overall-status';
      } else {
        mainStatusText.innerText = 'SISTEMA CON ALERTAS';
        mainBadge.innerText = 'DEGRADADO';
        mainBadge.className = 'status-tag status-tag-down';
        mainPulse.className = 'pulse-ring offline';
        overallCard.className = 'card card-status-down overall-status';
      }
      
      // Update Prisma / DB
      const dbStatus = data.info.prisma.status;
      const dbStatusText = document.getElementById('db-latency');
      const dbDot = document.getElementById('db-dot');
      const dbCard = document.getElementById('db-card');
      
      dbStatusText.innerHTML = data.info.prisma.durationMs + 'ms <span style="font-size: 0.75rem; color: var(--text-muted);">de latencia</span>';
      
      if (dbStatus === 'up') {
        dbDot.style.backgroundColor = 'var(--accent-success)';
        dbDot.style.boxShadow = '0 0 8px var(--accent-success)';
        dbCard.className = 'card card-status-up';
      } else {
        dbDot.style.backgroundColor = 'var(--accent-danger)';
        dbDot.style.boxShadow = '0 0 8px var(--accent-danger)';
        dbCard.className = 'card card-status-down';
      }
      
      // Update Redis
      const redisStatus = data.info.redis.status;
      const redisDot = document.getElementById('redis-dot');
      const redisCard = document.getElementById('redis-card');
      
      if (redisStatus === 'up') {
        redisDot.style.backgroundColor = 'var(--accent-success)';
        redisDot.style.boxShadow = '0 0 8px var(--accent-success)';
        redisCard.className = 'card card-status-up';
      } else {
        redisDot.style.backgroundColor = 'var(--accent-danger)';
        redisDot.style.boxShadow = '0 0 8px var(--accent-danger)';
        redisCard.className = 'card card-status-down';
      }
      
      // Update Memory
      const heapUsed = data.info.memory_heap.used;
      const heapLimit = data.info.memory_heap.limit;
      const heapUsedMb = Math.round((heapUsed / 1024 / 1024) * 100) / 100;
      const heapLimitMb = Math.round((heapLimit / 1024 / 1024) * 100) / 100;
      const percentage = Math.min(Math.round((heapUsedMb / heapLimitMb) * 100), 100);
      
      document.getElementById('heap-used-val').innerText = heapUsedMb + ' MB';
      document.getElementById('heap-pct-val').innerText = percentage + '%';
      
      const bar = document.getElementById('heap-bar');
      bar.style.width = percentage + '%';
      
      const memCard = document.getElementById('mem-card');
      if (data.info.memory_heap.status === 'up') {
        memCard.className = 'card card-status-up';
      } else {
        memCard.className = 'card card-status-down';
      }
      
      // Update RAW JSON Console
      document.getElementById('json-output').innerText = JSON.stringify(data, null, 2);
    }

    // Set up auto-refresh
    function startAutoRefresh() {
      if (autoRefreshInterval) clearInterval(autoRefreshInterval);
      autoRefreshInterval = setInterval(() => {
        performCheck();
      }, 3000);
    }

    function stopAutoRefresh() {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    }

    autoRefreshCheckbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });

    scanBtn.addEventListener('click', performCheck);

    // Initial setup and trigger
    startAutoRefresh();
    performCheck();
  </script>
</body>
</html>`;
}
