#!/usr/bin/env node
/* eslint-disable no-console */
// Build ERA-AH.esp directly: a minimal Skyrim SE plugin with a single Quest
// record (ERA_AH_AutoDeliveryQuest) that attaches the ERA_AH_Inbox Papyrus
// script via VMAD. No Creation Kit, no SSEEdit, no Skyrim.esm dependency.
//
// Output: era-ah-mod/dist/ERA-AH.esp
//
// Refs:
//   https://en.uesp.net/wiki/Skyrim_Mod:File_Format
//   https://en.uesp.net/wiki/Skyrim_Mod:File_Format/QUST
//   https://en.uesp.net/wiki/Skyrim_Mod:File_Format/Plugins/VMAD_Field

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Byte helpers ────────────────────────────────────────────────────────────
const concat = (...parts) => Buffer.concat(parts.map(p => Buffer.isBuffer(p) ? p : Buffer.from(p)))

function u8(n)  { const b = Buffer.alloc(1); b.writeUInt8(n & 0xff, 0); return b }
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n & 0xffff, 0); return b }
function i16(n) { const b = Buffer.alloc(2); b.writeInt16LE(n, 0); return b }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b }
function i32(n) { const b = Buffer.alloc(4); b.writeInt32LE(n, 0); return b }
function f32(n) { const b = Buffer.alloc(4); b.writeFloatLE(n, 0); return b }

// 4-byte ASCII tag
function tag(s) { if (s.length !== 4) throw new Error('tag must be 4'); return Buffer.from(s, 'ascii') }

// Null-terminated ASCII string (zstring)
function zstr(s) { return concat(Buffer.from(s, 'ascii'), Buffer.alloc(1)) }

// Length-prefixed UTF-8 string (wstring16): uint16 length + chars (no null)
function wstr(s) {
  const buf = Buffer.from(s, 'utf8')
  return concat(u16(buf.length), buf)
}

// Subrecord: <type><uint16 size><data>
function sub(type, data) {
  if (data.length > 0xffff) throw new Error(`subrecord ${type} too big: ${data.length}`)
  return concat(tag(type), u16(data.length), data)
}

// Record: <type><uint32 dataSize><flags><formId><vc><formVersion><vc2><data>
function record(type, formId, data, { formVersion = 44, flags = 0 } = {}) {
  return concat(
    tag(type),
    u32(data.length),
    u32(flags),
    u32(formId),
    u32(0),           // VC info (timestamp/lastUser/currentUser)
    u16(formVersion),
    u16(0),           // VC2 / unknown
    data
  )
}

// Group: <"GRUP"><uint32 totalSize><label><int32 groupType><vc><misc><children>
function group(label, groupType, children) {
  const totalSize = 24 + children.length
  return concat(
    tag('GRUP'),
    u32(totalSize),
    Buffer.isBuffer(label) ? label : Buffer.from(label, 'ascii').slice(0, 4),
    i32(groupType),
    u32(0),  // VC
    u32(0)   // unused
  ).then ? null : concat(
    tag('GRUP'),
    u32(totalSize),
    Buffer.isBuffer(label) ? label : Buffer.from(label, 'ascii').slice(0, 4),
    i32(groupType),
    u32(0),
    u32(0),
    children
  )
}

// ─── Build VMAD (script attachment) ──────────────────────────────────────────
// Skyrim SE format: version=5, objFormat=2
//   uint16 version
//   uint16 objFormat
//   uint16 scriptCount
//     per script:
//       wstring16 name
//       uint8     status (0=local, 1=inherited, 3=removed)
//       uint16    propCount
//       (no properties)
// QUST-specific suffix:
//   uint8  fragmentFlags
//   wstring16 fragmentFileName
//   uint16 fragmentCount
//   uint16 aliasCount
function buildVmad(scriptName) {
  return concat(
    i16(5),                 // VMAD version
    i16(2),                 // Object format
    u16(1),                 // Script count
      wstr(scriptName),     //   name
      u8(0),                //   status = Local
      u16(0),               //   propertyCount = 0
    // QUST tail
    u8(0),                  // fragmentFlags = 0 (no script fragments)
    wstr(''),               // fragmentFileName empty
    i16(0),                 // fragmentCount
    i16(0),                 // aliasCount
  )
}

// ─── Build the QUST record ───────────────────────────────────────────────────
// DNAM: 12 bytes — flags(u16) priority(u8) unused(u8) questType(u32) questFormVersion(u32)
// (formVersion 44+ uses extended DNAM)
function buildDnam() {
  return concat(
    u16(0x0001),  // Flags: bit 0 = Start Game Enabled
    u8(50),       // Priority
    u8(0),        // Unused
    i32(0),       // Quest Type: 0 = None
    u32(0)        // Quest Form Version (set by CK, 0 OK for new)
  )
}

function buildQust(formId, edid, fullName, scriptName) {
  // Subrecord order taken from CK output: EDID, VMAD, FULL, DNAM
  const data = concat(
    sub('EDID', zstr(edid)),
    sub('VMAD', buildVmad(scriptName)),
    sub('FULL', zstr(fullName)),
    sub('DNAM', buildDnam()),
  )
  return record('QUST', formId, data)
}

// ─── Build TES4 header ───────────────────────────────────────────────────────
// HEDR (12 bytes): version float, numRecords int32, nextObjectID uint32
function buildTes4(numRecords, nextObjectId) {
  const hedr = concat(
    f32(1.7),            // Version
    i32(numRecords),     // Total record count (excluding TES4 itself)
    u32(nextObjectId)    // Next available object ID (we used 0x800; next free = 0x801)
  )
  const data = concat(
    sub('HEDR', hedr),
    sub('CNAM', zstr('ERA Launcher'))
    // No MAST subrecords: we don't reference any other plugin's forms.
  )
  return record('TES4', 0, data, { formVersion: 44 })
}

// ─── Assemble file ───────────────────────────────────────────────────────────
// FormID 0x00000800: load-order index 0 (overridden at load), object index 0x800
const QUST_FORMID = 0x00000800
const NEXT_OBJECT_ID = 0x00000801

const qstRecord = buildQust(QUST_FORMID, 'ERA_AH_AutoDeliveryQuest', 'ERA Auction House', 'ERA_AH_Inbox')
const qstGroup  = group('QUST', 0, qstRecord)
const tes4      = buildTes4(/* numRecords */ 1, NEXT_OBJECT_ID)

const espBuffer = concat(tes4, qstGroup)

const outDir = resolve(__dirname, '..', 'dist')
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'ERA-AH.esp')
writeFileSync(outPath, espBuffer)

console.log(`Built ${outPath} (${espBuffer.length} bytes)`)
