import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { app } from 'electron'
import type { Track, Playlist } from '../shared'

// Resolve WASM file path
function getWasmPath(): string {
  try {
    return require.resolve('sql.js/dist/sql-wasm.wasm')
  } catch {
    // Fallback: relative to node_modules
    return join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  }
}

let db: SqlJsDatabase
let dbPath: string

function save(): void {
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

// Helper: run a query and return rows as objects
function queryAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as initSqlJs.BindParams)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// Helper: run a query and return first row
function queryOne(sql: string, params: unknown[] = []): Record<string, unknown> | undefined {
  return queryAll(sql, params)[0]
}

// Helper: run a statement (INSERT/UPDATE/DELETE)
function run(sql: string, params: unknown[] = []): void {
  db.run(sql, params as initSqlJs.BindParams)
}

export async function initDatabase(): Promise<void> {
  const wasmPath = getWasmPath()
  const wasmBinary = readFileSync(wasmPath)
  const SQL = await initSqlJs({ wasmBinary })

  // DB file location: userData is always writable
  const dbDir = app.getPath('userData')
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

  dbPath = join(dbDir, 'hoplayer.db')
  console.log('[DB] Opening database at:', dbPath)

  if (existsSync(dbPath)) {
    const buffer = readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // Create tables
  db.run('PRAGMA foreign_keys = ON')

  db.run(`
    CREATE TABLE IF NOT EXISTS kv (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      artist    TEXT NOT NULL,
      album     TEXT NOT NULL,
      duration  REAL NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      format    TEXT NOT NULL DEFAULT 'audio'
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      track_id    TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      position    INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, track_id)
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS scan_paths (
      path TEXT PRIMARY KEY
    )
  `)

  // Migrate: add new columns if they don't exist
  const migrate = (sql: string) => { try { db.run(sql) } catch { /* column already exists */ } }
  migrate('ALTER TABLE tracks ADD COLUMN genre TEXT DEFAULT ""')
  migrate('ALTER TABLE tracks ADD COLUMN year INTEGER DEFAULT 0')
  migrate('ALTER TABLE tracks ADD COLUMN track_number INTEGER DEFAULT 0')
  migrate('ALTER TABLE tracks ADD COLUMN bitrate INTEGER DEFAULT 0')
  migrate('ALTER TABLE tracks ADD COLUMN play_count INTEGER DEFAULT 0')
  migrate('ALTER TABLE tracks ADD COLUMN last_played INTEGER DEFAULT 0')

  save()

  // Migrate from electron-store if DB is fresh
  const count = queryOne('SELECT COUNT(*) AS n FROM kv') as { n: number } | undefined
  if (!count || count.n === 0) {
    try {
      const Store = require('electron-store')
      const old = new Store()
      const oldPaths = old.get('scanPaths', []) as string[]
      const oldTracks = old.get('libraryTracks', []) as Track[]
      const oldPlaylists = old.get('playlists', []) as Playlist[]

      if (oldPaths.length || oldTracks.length || oldPlaylists.length) {
        console.log('[DB] Migrating from electron-store:', oldPaths.length, 'paths,', oldTracks.length, 'tracks,', oldPlaylists.length, 'playlists')
        for (const p of oldPaths) dbApi.addScanPath(p)
        for (const t of oldTracks) dbApi.upsertTrack(t)
        for (const pl of oldPlaylists) {
          dbApi.createPlaylist(pl)
          for (let i = 0; i < pl.trackIds.length; i++) {
            dbApi.addTrackToPlaylist(pl.id, pl.trackIds[i], i)
          }
        }
      }
    } catch {
      // No old data — skip migration
    }
  }
}

// ── Database API ────────────────────────────────────────────────────────────

export const dbApi = {
  // KV store
  getValue(key: string): unknown | null {
    const row = queryOne('SELECT value FROM kv WHERE key = ?', [key])
    return row ? JSON.parse(row.value as string) : null
  },

  setValue(key: string, value: unknown): void {
    run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, JSON.stringify(value)])
    save()
  },

  // Scan paths
  getScanPaths(): string[] {
    return queryAll('SELECT path FROM scan_paths').map(r => r.path as string)
  },

  addScanPath(path: string): void {
    run('INSERT OR IGNORE INTO scan_paths (path) VALUES (?)', [path])
    save()
  },

  removeScanPath(path: string): void {
    run('DELETE FROM scan_paths WHERE path = ?', [path])
    save()
  },

  // Tracks
  getAllTracks(): Track[] {
    return queryAll('SELECT * FROM tracks ORDER BY rowid').map(r => ({
      id: r.id as string,
      title: r.title as string,
      artist: r.artist as string,
      album: r.album as string,
      duration: r.duration as number,
      filePath: r.file_path as string,
      format: r.format as 'audio' | 'video',
      genre: (r.genre as string) || undefined,
      year: (r.year as number) || undefined,
      trackNumber: (r.track_number as number) || undefined,
      bitrate: (r.bitrate as number) || undefined,
      playCount: (r.play_count as number) || 0,
      lastPlayed: (r.last_played as number) || undefined
    }))
  },

  upsertTrack(track: Track): void {
    run(
      'INSERT OR REPLACE INTO tracks (id, title, artist, album, duration, file_path, format, genre, year, track_number, bitrate, play_count, last_played) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [track.id, track.title, track.artist, track.album, track.duration, track.filePath, track.format, track.genre || '', track.year || 0, track.trackNumber || 0, track.bitrate || 0, track.playCount || 0, track.lastPlayed || 0]
    )
    save()
  },

  removeTrack(id: string): void {
    run('DELETE FROM tracks WHERE id = ?', [id])
    save()
  },

  incrementPlayCount(id: string): void {
    run('UPDATE tracks SET play_count = play_count + 1, last_played = ? WHERE id = ?', [Date.now(), id])
    save()
  },

  // Playlists
  getAllPlaylists(): Playlist[] {
    const playlists = queryAll('SELECT * FROM playlists ORDER BY created_at')
    return playlists.map(p => ({
      id: p.id as string,
      name: p.name as string,
      trackIds: queryAll('SELECT track_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position', [p.id]).map(r => r.track_id as string),
      createdAt: p.created_at as number,
      updatedAt: p.updated_at as number
    }))
  },

  createPlaylist(playlist: Playlist): void {
    run('INSERT INTO playlists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      playlist.id, playlist.name, playlist.createdAt, playlist.updatedAt
    ])
    save()
  },

  deletePlaylist(id: string): void {
    run('DELETE FROM playlists WHERE id = ?', [id])
    save()
  },

  renamePlaylist(id: string, name: string, updatedAt: number): void {
    run('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', [name, updatedAt, id])
    save()
  },

  addTrackToPlaylist(playlistId: string, trackId: string, position: number): void {
    run('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)', [playlistId, trackId, position])
    save()
  },

  removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    run('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', [playlistId, trackId])
    save()
  },

  reorderPlaylist(playlistId: string, trackIds: string[]): void {
    for (let i = 0; i < trackIds.length; i++) {
      run('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?', [i, playlistId, trackIds[i]])
    }
    save()
  }
}
