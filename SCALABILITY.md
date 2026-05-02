# Skalierbarkeits-Analyse

## Szenario: 10.000 Benutzer, 100 gleichzeitig aktiv

### 📊 Performance-Profile

#### SQLite WAL-Mode Limits
- **Concurrent Reads:** Praktisch unbegrenzt
- **Writes:** ~5.000-15.000 Transaktionen/Sekunde (SSD)
- **Read Performance:** ~100.000 Queries/Sekunde
- **Max DB Size:** Theoretisch 281 TB, praktisch ~100 GB empfohlen

#### Optimierungen implementiert
```bash
journal_mode = WAL          # Write-Ahead Logging
synchronous = NORMAL        # Balanced safety/speed
cache_size = 64MB          # In-memory cache
mmap_size = 256MB          # Memory-mapped I/O
temp_store = MEMORY        # Temp tables in RAM
```

### ✅ Aktuelle Konfiguration (optimiert)

| Ressource | Limit | Default | Anpassbar via |
|-----------|-------|---------|---------------|
| Rate Limit | 300 req/min | 300 | `RATE_LIMIT_MAX` |
| Pastes/Session | 100 | 100 | `MAX_PASTES_PER_SESSION` |
| Concurrent Exports | 3 | 3 | `MAX_CONCURRENT_EXPORTS` |
| Body Size | 5 MB | 5 MB | `bodyLimit` in Code |
| Markdown Size | 1 MB | 1 MB | Validierung |

### 🎯 Performance bei verschiedenen Last-Szenarien

#### Szenario 1: Light Usage (Normal)
**100 User, primär Lesen**
- Editor-Updates: 2 req/sec/user = 200 req/sec
- DB Queries: ~400 reads/sec
- **Status:** ✅ Kein Problem

**Server-Anforderungen:**
- CPU: 2 Cores
- RAM: 2 GB
- Disk: 20 IOPS ausreichend

#### Szenario 2: Medium Usage
**100 User, 20% aktiv editieren**
- Reads: 200 req/sec
- Writes: 20 saves/sec
- DB Load: ~500 queries/sec
- **Status:** ✅ Gut

**Server-Anforderungen:**
- CPU: 2-4 Cores
- RAM: 4 GB
- Disk: 100 IOPS (SSD empfohlen)

#### Szenario 3: Heavy Usage
**100 User, alle aktiv editieren + 5 Exports**
- Reads: 300 req/sec
- Writes: 100 saves/sec
- Exports: 5 gleichzeitig (Queue!)
- **Status:** ⚠️ Grenzbereich

**Server-Anforderungen:**
- CPU: 4-8 Cores (LaTeX ist CPU-intensiv)
- RAM: 8 GB (5 Exports × 500MB = 2.5GB + OS + Cache)
- Disk: SSD mit >500 IOPS

**Export-Queue verhindert OOM:**
```javascript
// Max 3 gleichzeitige Exports (konfigurierbar)
MAX_CONCURRENT_EXPORTS=3
```

#### Szenario 4: Shared IP / NAT (Firmen-Netzwerk)
**100 User hinter 1 IP-Adresse**

❌ **OHNE Session-basiertes Rate Limiting:**
- Alle 100 User teilen sich 100 req/min Limit
- = 1 req/min pro User → unusable!

✅ **MIT Session-basiertem Rate Limiting (implementiert):**
```javascript
keyGenerator: (req) => req.sessionId || req.ip
```
- Jeder User: 300 req/min
- = 5 req/sec → funktioniert

### 🔴 Harte Grenzen (SQLite-Limits)

#### Write-Contention
**Problem:** Nur 1 Write-Transaction gleichzeitig

**Impact-Rechnung:**
- 100 User speichern alle gleichzeitig
- SQLite: ~10.000 writes/sec (SSD)
- Queue-Time: 100 ÷ 10.000 = 0.01 sec = **10ms** ✅ OK

**Wann wird es kritisch?**
- \>500 gleichzeitige Writes/sec
- Dann entstehen spürbare Queues (>100ms)

**Lösung:** PostgreSQL ab 1.000+ concurrent users

#### Disk I/O
**Engpass:** Export PDF/DOCX schreibt temp files

**Mitigation:**
- Export-Queue (max 3 concurrent)
- `tmpdir` auf RAM-Disk mounten:
```bash
# /etc/fstab
tmpfs /tmp tmpfs size=2G,mode=1777 0 0
```

### 📈 Skalierungs-Roadmap

#### Phase 1: Bis 500 concurrent users ✅ AKTUELL
**Setup:** Single Server + SQLite + optimierte Config
- Server: 4 CPU, 8GB RAM, SSD
- Kosten: ~20-40 €/Monat (VPS)
- **Status:** Production-Ready

#### Phase 2: 500-2.000 concurrent users
**Upgrades notwendig:**
1. **PostgreSQL statt SQLite**
   - Bessere Concurrent Write-Performance
   - Connection Pooling
   - Migration: betterqlite3 → pg
   
2. **Redis für Sessions**
   - Session-State aus DB raus
   - Erlaubt horizontale Skalierung
   
3. **Dedicated Export-Worker**
   - Pandoc-Exports in separaten Prozess/Container
   - Message Queue (Redis/RabbitMQ)

**Server:** 8 CPU, 16GB RAM  
**Kosten:** ~80-120 €/Monat

#### Phase 3: >2.000 concurrent users
**Architektur:** Multi-Server + Load Balancer

```
                    ┌─────────────┐
                    │   Nginx LB  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
   │ API #1  │        │ API #2  │       │ API #3  │
   └────┬────┘        └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │ PostgreSQL  │
                    │  (Primary)  │
                    └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   Replicas  │
                    └─────────────┘
```

**Komponenten:**
- Load Balancer (nginx)
- 3+ API-Server (Fastify)
- PostgreSQL Primary + Replicas
- Redis Cluster (Sessions)
- S3/MinIO (Export-Cache)
- Separate Export-Worker

**Kosten:** 300-500 €/Monat

### 🎬 Monitoring-Empfehlungen

**Kritische Metriken:**

```javascript
// Prometheus/Grafana Dashboards
- API Response Time (p50, p95, p99)
- DB Query Time
- Active Sessions
- Export Queue Length
- SQLite WAL checkpoint lag
- Disk I/O wait
- Memory usage per Export
```

**Alerts:**
- Response time >500ms (p95)
- Export queue >10
- Disk >80% full
- Memory >85%
- Error rate >1%

### 🔧 Quick Tuning Guide

#### Problem: Exports langsam/OOM
```bash
# Reduziere concurrent exports
MAX_CONCURRENT_EXPORTS=2

# Nutze tmpfs (RAM-Disk)
mount -t tmpfs -o size=2G tmpfs /tmp
```

#### Problem: Viele NAT-User werden rate-limited
```bash
# Erhöhe Session-Limit
RATE_LIMIT_MAX=500
```

#### Problem: SQLite-Locks bei vielen Writes
```bash
# Checke WAL-Checkpoints
sqlite3 data.sqlite "PRAGMA wal_checkpoint(TRUNCATE);"

# Erhöhe Cache
# In db.js: cache_size = -128000 (128MB)
```

#### Problem: Langsame Queries
```sql
-- Analysiere Query-Performance
EXPLAIN QUERY PLAN 
SELECT id FROM pastes WHERE session_id = ? ORDER BY updated_at DESC LIMIT 50;

-- Checke Index-Nutzung
.schema pastes
```

### 💡 Kostenoptimierung

**Budget-Setup für 100+ concurrent users:**

| Provider | Specs | Preis/Monat | Max Users |
|----------|-------|-------------|-----------|
| Hetzner CX21 | 2 vCPU, 4GB | 5,83 € | ~100 |
| Hetzner CPX31 | 4 vCPU, 8GB | 16,50 € | ~500 |
| Hetzner CCX33 | 8 vCPU, 32GB | 50,40 € | ~2000 |

**Traffic:**
- Avg Request: ~50 KB (mit Markdown)
- 100 Users × 1000 req/Tag = 5 GB/Tag = 150 GB/Monat
- Hetzner: 20 TB inkl. ✅

### 🎯 Zusammenfassung

**Aktuelle Config handelt problemlos:**
- ✅ 10.000 total users
- ✅ 100 gleichzeitig aktiv (normal usage)
- ✅ 50 gleichzeitig aktiv (heavy editing)
- ⚠️ 20 gleichzeitige Exports (via Queue begrenzt)

**Breaking Points:**
- \>500 concurrent active writers → PostgreSQL empfohlen
- \>50 Exports/Min → Dedizierte Export-Worker
- \>2.000 concurrent users → Multi-Server-Setup

**Kosten für 100 concurrent:** 5-20 €/Monat (VPS)  
**Kosten für 500 concurrent:** 40-80 €/Monat  
**Kosten für 2000+ concurrent:** 300-500 €/Monat (Multi-Server)
