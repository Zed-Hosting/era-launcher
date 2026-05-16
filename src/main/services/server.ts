import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import toml from '@iarna/toml'
import type { ServerConfig } from '@shared/types'
import { exists } from './fs-util'

export class ServerController extends EventEmitter {
  private proc: ChildProcess | undefined
  private exePath: string | undefined

  isRunning(): boolean {
    return !!this.proc && this.proc.exitCode === null
  }

  async start(serverExePath: string, cwd: string): Promise<void> {
    if (this.isRunning()) throw new Error('Server already running.')
    if (!(await exists(serverExePath))) throw new Error(`Server exe not found: ${serverExePath}`)
    this.exePath = serverExePath
    const proc = spawn(serverExePath, [], { cwd, windowsHide: true })
    this.proc = proc
    proc.stdout?.on('data', (d) => this.emit('log', 'stdout', d.toString()))
    proc.stderr?.on('data', (d) => this.emit('log', 'stderr', d.toString()))
    proc.on('exit', (code) => {
      this.emit('exit', code)
      this.proc = undefined
    })
  }

  async stop(): Promise<void> {
    if (!this.proc) return
    this.proc.kill()
  }
}

/** Read STServer.toml. Returns a typed view + any extras (lossless on save). */
export async function loadServerConfig(tomlPath: string): Promise<ServerConfig> {
  const text = await fs.readFile(tomlPath, 'utf8')
  const parsed = toml.parse(text) as Record<string, any>
  // STR's TOML has sections like [GameServer]. Flatten common keys but keep extras.
  const gs = (parsed['GameServer'] as Record<string, any>) ?? {}
  const cfg: ServerConfig = {
    name: String(gs['name'] ?? 'STR Server'),
    port: Number(gs['port'] ?? 10578),
    maxPlayers: Number(gs['maxPlayers'] ?? gs['max_players'] ?? 8),
    password: gs['password'] ? String(gs['password']) : undefined,
    adminPassword: gs['adminPassword'] ? String(gs['adminPassword']) : undefined,
    motd: gs['motd'] ? String(gs['motd']) : undefined,
    extras: parsed
  }
  return cfg
}

export async function saveServerConfig(tomlPath: string, cfg: ServerConfig): Promise<void> {
  // Preserve unknown sections by writing back over the parsed extras.
  const out: Record<string, any> = cfg.extras ? { ...cfg.extras } : {}
  out['GameServer'] = {
    ...(out['GameServer'] ?? {}),
    name: cfg.name,
    port: cfg.port,
    maxPlayers: cfg.maxPlayers,
    ...(cfg.password ? { password: cfg.password } : {}),
    ...(cfg.adminPassword ? { adminPassword: cfg.adminPassword } : {}),
    ...(cfg.motd ? { motd: cfg.motd } : {})
  }
  await fs.writeFile(tomlPath, toml.stringify(out as any), 'utf8')
}

/** Locate STServer.toml relative to the server exe. */
export function serverTomlPath(serverDir: string): string {
  return path.join(serverDir, 'STServer.toml')
}
