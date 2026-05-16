// src/queue.js — File-based command queue between STR Lua script and sidecar

import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'
import { handleCommand } from './commands.js'

const QUEUE_IN  = process.env.AH_QUEUE_IN  ?? './queue/in'
const QUEUE_OUT = process.env.AH_QUEUE_OUT ?? './queue/out'

export function initQueue() {
  fs.mkdirSync(QUEUE_IN,  { recursive: true })
  fs.mkdirSync(QUEUE_OUT, { recursive: true })

  chokidar.watch(QUEUE_IN, { ignoreInitial: false, awaitWriteFinish: { stabilityThreshold: 50 } })
    .on('add', async (filePath) => {
      const reqId = path.basename(filePath, '.json')
      let cmd
      try {
        cmd = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        fs.unlinkSync(filePath)
      } catch {
        return // corrupted file, skip
      }

      const result = await handleCommand(cmd)
      const outPath = path.join(QUEUE_OUT, `${reqId}.json`)
      fs.writeFileSync(outPath, JSON.stringify(result))
    })

  console.log(`[AH] Queue watching ${path.resolve(QUEUE_IN)}`)
}
