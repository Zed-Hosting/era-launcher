# ERA Auction House — In-Game Auto-Delivery Mod

This Skyrim mod (.esp + Papyrus scripts) lets bought AH items appear directly in the player's inventory, no manual trading required.

## How it works

```
ERA Launcher  →  inbox.json  →  Papyrus script  →  Game.AddItem(player)
                                       ↓
                              confirmed.json
                                       ↓
                              ERA Launcher  →  POST /ah/inbox/confirm
```

1. The ERA Launcher polls the AH sidecar every 5 seconds for pending item deliveries
2. It writes new deliveries to `inbox.json` in the Skyrim Data folder
3. The Papyrus script (`ERA_AH_Inbox`) polls that file in-game, adds items to the player's inventory using `Game.GetFormFromFile + AddItem`, and writes confirmation IDs to `confirmed.json`
4. The launcher reads `confirmed.json` and posts confirmations back to mark each delivery as claimed

## Requirements (player-side)

- **SKSE** — Skyrim Script Extender (already required by Skyrim Together Reborn)
- **PapyrusUtil SE** — JSON file I/O for Papyrus scripts
  - Nexus: https://www.nexusmods.com/skyrimspecialedition/mods/13048

## Building the mod (one-time, by you)

1. Install the Creation Kit (free via Steam or Bethesda Launcher)
2. Open `era-ah-mod/Source/Scripts/ERA_AH_Inbox.psc` in any text editor
3. In the Creation Kit:
   - Create a new plugin: `ERA-AH.esp`
   - Create a new Quest record: `ERA_AH_AutoDeliveryQuest`
     - Flags: **Start Game Enabled**, **Run Once = OFF**
     - Priority: 50
   - Attach script `ERA_AH_Inbox` to the quest
4. Save the plugin as `ERA-AH.esp`
5. Compile Papyrus: Creation Kit → Gameplay → Papyrus Script Manager → select script → Compile
6. The compiled `ERA_AH_Inbox.pex` goes in `Data/Scripts/`

## Installer files (what ships to players)

Pack into a single ZIP:
```
Data/
├── ERA-AH.esp
├── Scripts/
│   └── ERA_AH_Inbox.pex
└── SKSE/
    └── Plugins/
        └── StorageUtilData/
            └── ERA-AH/
                ├── inbox.json       (empty: {"items":[]})
                └── confirmed.json   (empty: {"ids":[]})
```

The ERA Launcher will install this automatically and ensure both JSON files exist.

## Item FormID lookup

The sidecar uses `ah-sidecar/data/items.json` to map item names typed in `ah sell` to FormIDs. To add an item to the auto-delivery system, append an entry:

```json
{
  "your item name": { "plugin": "Skyrim.esm", "formId": "012EB7" }
}
```

If a listing has no known FormID (item not in `items.json`), it falls back to the manual-claim mailbox flow. Players will see the item in `ah mailbox` but the launcher won't push it via Papyrus.
