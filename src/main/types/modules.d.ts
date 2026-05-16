declare module 'win-version-info' {
  interface VersionInfo {
    [key: string]: string | undefined
    ProductVersion?: string
    FileVersion?: string
  }
  function winVersionInfo(filePath: string): VersionInfo
  export default winVersionInfo
  export = winVersionInfo
}

declare module '7zip-bin' {
  export const path7za: string
  export const path7x: string
}

declare module 'node-7z' {
  import { EventEmitter } from 'node:events'
  type Opts = Record<string, unknown>
  export function extractFull(archive: string, dest: string, opts?: Opts): EventEmitter
  export function list(archive: string, opts?: Opts): EventEmitter
  export function add(archive: string, src: string | string[], opts?: Opts): EventEmitter
}
