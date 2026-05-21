Scriptname ERA_AH_Inbox extends Quest

; ──────────────────────────────────────────────────────────────────────────────
;  ERA Auction House — In-Game Bridge (auto-delivery + escrow on post)
;
;  Polls JSON files written by the ERA Launcher every few seconds:
;
;    inbox.json        - items to give the player    (launcher  -> game)
;    confirmed.json    - delivery IDs handed out     (game      -> launcher)
;    outbox.json       - items to remove from player (launcher  -> game)
;    removed.json      - removal IDs completed       (game      -> launcher)
;    removal_failed.json - removals that couldn't    (game      -> launcher)
;                          run (item missing etc.)
;
;  All files live under
;    Data/SKSE/Plugins/StorageUtilData/ERA-AH/
;
;  REQUIRES:
;    - SKSE
;    - PapyrusUtil SE  (Nexus #13048)
; ──────────────────────────────────────────────────────────────────────────────

Float Property PollIntervalSeconds = 5.0 Auto
Bool  Property VerboseHeartbeat     = False Auto  ; when true, every tick prints a notification

; ─── Hover-to-sell hotkey config ─────────────────────────────────────────────
; Default key is F4 (DirectInput scancode 62). See
; https://www.creationkit.com/index.php?title=Input_Script for the full table.
; Set EnableHotkey to False to disable the inventory hotkey entirely.
Bool Property EnableHotkey = True Auto
Int  Property HotkeyDxCode = 62   Auto

String _InboxPath
String _ConfirmedPath
String _OutboxPath
String _RemovedPath
String _RemovalFailedPath
String _CatalogPath
String _PendingListingsPath
Int    _TickCount

Event OnInit()
    InitPaths()
    RegisterForSingleUpdate(PollIntervalSeconds)
    If EnableHotkey
        RegisterForKey(HotkeyDxCode)
        Debug.Trace("[ERA-AH] OnInit: registered hover-to-sell hotkey (DxCode=" + HotkeyDxCode + ")")
    EndIf
    Debug.Notification("ERA Auction House: bridge enabled (v3 — escrow+delivery+hotkey).")
    Debug.Trace("[ERA-AH] OnInit: ready, poll=" + PollIntervalSeconds + "s")
EndEvent

Function InitPaths()
    _InboxPath            = "../ERA-AH/inbox"
    _ConfirmedPath        = "../ERA-AH/confirmed"
    _OutboxPath           = "../ERA-AH/outbox"
    _RemovedPath          = "../ERA-AH/removed"
    _RemovalFailedPath    = "../ERA-AH/removal_failed"
    _CatalogPath          = "../ERA-AH/catalog"
    _PendingListingsPath  = "../ERA-AH/pending_listings"
EndFunction

Event OnUpdate()
    If _InboxPath == ""
        InitPaths()
    EndIf
    _TickCount += 1

    ; Re-register the hover-to-sell hotkey every tick. RegisterForKey is
    ; idempotent and this is the only reliable way to recover after a save
    ; reload — Quests do not fire OnPlayerLoadGame and OnInit only runs once
    ; per ESP lifetime. The cost is negligible (one native call every 5s).
    If EnableHotkey
        RegisterForKey(HotkeyDxCode)
    EndIf

    ; Always log a tick trace so we can confirm OnUpdate is firing.
    Debug.Trace("[ERA-AH] tick " + _TickCount + " begin")
    Int inboxCount  = ProcessInbox()
    Int outboxCount = ProcessOutbox()
    Debug.Trace("[ERA-AH] tick " + _TickCount + " end inbox=" + inboxCount + " outbox=" + outboxCount)

    If VerboseHeartbeat
        Debug.Notification("[ERA-AH] tick " + _TickCount + " (inbox=" + inboxCount + " outbox=" + outboxCount + ")")
    EndIf

    RegisterForSingleUpdate(PollIntervalSeconds)
EndEvent

; ─── INBOX: items the AH owes the player ──────────────────────────────────────
Int Function ProcessInbox()
    ; JsonUtil caches files in memory; without an explicit reload Papyrus
    ; never sees entries the launcher wrote after the game started. Reload
    ; the confirm-file too so previously-consumed IDs aren't replayed.
    JsonUtil.Unload(_InboxPath, False)
    JsonUtil.Unload(_ConfirmedPath, False)
    JsonUtil.Load(_InboxPath)
    JsonUtil.Load(_ConfirmedPath)
    Int count = JsonUtil.PathCount(_InboxPath, ".items")
    If count <= 0
        Return 0
    EndIf

    Actor playerRef = Game.GetPlayer()
    Int idx = 0
    Int processed = 0
    While idx < count
        String base = ".items[" + idx + "]"
        Int deliveryId = JsonUtil.GetPathIntValue(_InboxPath, base + ".id")
        String plugin  = JsonUtil.GetPathStringValue(_InboxPath, base + ".plugin")
        String formStr = JsonUtil.GetPathStringValue(_InboxPath, base + ".formId")
        Int qty        = JsonUtil.GetPathIntValue(_InboxPath, base + ".count")
        String name    = JsonUtil.GetPathStringValue(_InboxPath, base + ".name")

        If qty <= 0
            qty = 1
        EndIf

        Form item = ResolveCatalogForm(plugin, formStr)
        If item
            playerRef.AddItem(item, qty, false)
            Debug.Notification("Auction House: received " + qty + "x " + name)
            Debug.Trace("[ERA-AH] inbox: gave " + qty + "x " + name + " (" + plugin + ":" + formStr + ") delivery=" + deliveryId)
        Else
            Debug.Trace("[ERA-AH] inbox: could not resolve " + plugin + ":" + formStr)
        EndIf

        Int[] one = new Int[1]
        one[0] = deliveryId
        ; SetPathIntArray would overwrite .ids on every iteration so only the
        ; last delivery ever made it into confirmed.json. Use an indexed path
        ; write to append by position. PathCount returns -1 when the file is
        ; empty so we clamp to 0.
        Int confIdx = JsonUtil.PathCount(_ConfirmedPath, ".ids")
        If confIdx < 0
            confIdx = 0
        EndIf
        JsonUtil.SetPathIntValue(_ConfirmedPath, ".ids[" + confIdx + "]", deliveryId)
        idx += 1
        processed += 1
    EndWhile

    If processed > 0
        JsonUtil.Save(_ConfirmedPath, true)
    EndIf
    Return processed
EndFunction

; ─── OUTBOX: items the player owes the AH (escrow on post / etc.) ─────────────
Int Function ProcessOutbox()
    ; Force a reload so launcher-written removals are visible to JsonUtil.
    ; Also reload the write-files so we don't replay IDs the launcher already
    ; consumed (it clears .ids / .failures after each successful POST).
    JsonUtil.Unload(_OutboxPath, False)
    JsonUtil.Unload(_RemovedPath, False)
    JsonUtil.Unload(_RemovalFailedPath, False)
    JsonUtil.Load(_OutboxPath)
    JsonUtil.Load(_RemovedPath)
    JsonUtil.Load(_RemovalFailedPath)
    Int count = JsonUtil.PathCount(_OutboxPath, ".items")
    Debug.Trace("[ERA-AH] outbox: PathCount=" + count + " path=" + _OutboxPath)
    If count <= 0
        Return 0
    EndIf

    Actor playerRef = Game.GetPlayer()
    Int idx = 0
    Int confirmed = 0
    Int failed = 0
    While idx < count
        String base = ".items[" + idx + "]"
        Int removalId = JsonUtil.GetPathIntValue(_OutboxPath, base + ".id")
        String plugin = JsonUtil.GetPathStringValue(_OutboxPath, base + ".plugin")
        String formStr = JsonUtil.GetPathStringValue(_OutboxPath, base + ".formId")
        Int qty       = JsonUtil.GetPathIntValue(_OutboxPath, base + ".count")
        String name   = JsonUtil.GetPathStringValue(_OutboxPath, base + ".name")

        If qty <= 0
            qty = 1
        EndIf

        Form item = ResolveCatalogForm(plugin, formStr)
        Bool ok = False
        String reason = ""
        If item
            Int have = playerRef.GetItemCount(item)
            If have >= qty
                playerRef.RemoveItem(item, qty, true, None)
                ok = True
                Debug.Notification("Auction House: escrowed " + qty + "x " + name)
                Debug.Trace("[ERA-AH] outbox: removed " + qty + "x " + name + " removal=" + removalId)
            Else
                reason = "missing"
                Debug.Trace("[ERA-AH] outbox: player only has " + have + " of " + name + " (need " + qty + ") removal=" + removalId)
            EndIf
        Else
            reason = "unresolved-form"
            Debug.Trace("[ERA-AH] outbox: could not resolve " + plugin + ":" + formStr)
        EndIf

        If ok
            ; Append by index — SetPathIntArray overwrote .ids on every loop
            ; iteration so only the last removal ever reached the launcher.
            Int rmIdx = JsonUtil.PathCount(_RemovedPath, ".ids")
            If rmIdx < 0
                rmIdx = 0
            EndIf
            JsonUtil.SetPathIntValue(_RemovedPath, ".ids[" + rmIdx + "]", removalId)
            confirmed += 1
        Else
            ; Append failure record { id, reason } to .failures
            Int failIdx = JsonUtil.PathCount(_RemovalFailedPath, ".failures")
            If failIdx < 0
                failIdx = 0
            EndIf
            String fbase = ".failures[" + failIdx + "]"
            JsonUtil.SetPathIntValue(_RemovalFailedPath, fbase + ".id", removalId)
            JsonUtil.SetPathStringValue(_RemovalFailedPath, fbase + ".reason", reason)
            failed += 1
            Debug.Notification("Auction House: could not escrow " + name + " (" + reason + ") — refunding deposit")
        EndIf

        idx += 1
    EndWhile

    If confirmed > 0
        JsonUtil.Save(_RemovedPath, true)
    EndIf
    If failed > 0
        JsonUtil.Save(_RemovalFailedPath, true)
    EndIf
    Return confirmed + failed
EndFunction

; Resolve a catalog (plugin, formId) pair to a Form.
; Some STR clients return null from Game.GetFormFromFile() even for valid
; vanilla refs, so fall back to Game.GetForm() with the load-order byte
; baked in. Skyrim.esm is always modIndex 0x00 at runtime, so the runtime
; FormID equals the base id (e.g. 0x00012EB7 for Iron Sword).
Form Function ResolveCatalogForm(String plugin, String formIdHex)
    Int baseId = HexToInt(formIdHex)
    Debug.Trace("[ERA-AH] resolve: plugin=" + plugin + " formIdHex=" + formIdHex + " baseId=" + baseId)

    ; Attempt 1: standard GetFormFromFile.
    Form item = Game.GetFormFromFile(baseId, plugin)
    If item
        Debug.Trace("[ERA-AH] resolve: hit via GetFormFromFile")
        Return item
    EndIf

    ; Attempt 2: Skyrim.esm forms live at runtime modIndex 0x00 so the local
    ; formID equals the runtime formID — try Game.GetForm with the local id.
    If plugin == "Skyrim.esm"
        item = Game.GetForm(baseId)
        If item
            Debug.Trace("[ERA-AH] resolve: hit via GetForm(local)")
            Return item
        EndIf
    EndIf

    ; Attempt 3: Some VMs (incl. STR's modified VM) need the fully-qualified
    ; runtime formID. Skyrim.esm forms start with 0x00xxxxxx (modIndex 0) so
    ; the full formID equals the local id again. Try it explicitly.
    item = Game.GetForm(baseId)
    If item
        Debug.Trace("[ERA-AH] resolve: hit via GetForm(full)")
        Return item
    EndIf

    Debug.Trace("[ERA-AH] resolve: ALL FALLBACKS FAILED for " + plugin + ":" + formIdHex)
    Return None
EndFunction

; Convert "012EB7" hex string to integer
Int Function HexToInt(String hex)
    If hex == ""
        Return 0
    EndIf
    Int result = 0
    Int i = 0
    Int len = StringUtil.GetLength(hex)
    While i < len
        String c = StringUtil.Substring(hex, i, 1)
        Int v = -1
        If c == "0"
            v = 0
        ElseIf c == "1"
            v = 1
        ElseIf c == "2"
            v = 2
        ElseIf c == "3"
            v = 3
        ElseIf c == "4"
            v = 4
        ElseIf c == "5"
            v = 5
        ElseIf c == "6"
            v = 6
        ElseIf c == "7"
            v = 7
        ElseIf c == "8"
            v = 8
        ElseIf c == "9"
            v = 9
        ElseIf c == "a" || c == "A"
            v = 10
        ElseIf c == "b" || c == "B"
            v = 11
        ElseIf c == "c" || c == "C"
            v = 12
        ElseIf c == "d" || c == "D"
            v = 13
        ElseIf c == "e" || c == "E"
            v = 14
        ElseIf c == "f" || c == "F"
            v = 15
        EndIf
        If v < 0
            Return result
        EndIf
        result = (result * 16) + v
        i += 1
    EndWhile
    Return result
EndFunction

; ─── HOVER-TO-SELL ────────────────────────────────────────────────────────────
; Hotkey-triggered flow: while the player has InventoryMenu open and an item
; highlighted, pressing HotkeyDxCode looks the item up in catalog.json,
; prompts for a min bid (and optional buyout) via UIExtensions, then writes a
; pending_listings.json entry the launcher will POST to /ah/sell.

Event OnKeyDown(Int keyCode)
    If !EnableHotkey
        Return
    EndIf
    If keyCode != HotkeyDxCode
        Return
    EndIf
    Debug.Trace("[ERA-AH] hotkey pressed (dxCode=" + keyCode + ")")
    If !UI.IsMenuOpen("InventoryMenu")
        Debug.Notification("AH: open Inventory and hover an item before pressing the hotkey.")
        Return
    EndIf
    QueueSelectedForPricing()
EndEvent

; Capture the highlighted inventory item and hand it to the launcher for
; pricing. We deliberately do NOT call UIExtensions or Input.TapKey from
; inside the OnKeyDown stack — both have caused CTDs on the STR-modified
; Papyrus VM. Instead, write a "needsPricing" entry to pending_listings.json
; and let the launcher show a React modal for min bid + buyout, then submit
; to the sidecar. The pricing flow is now entirely out-of-game.
Function QueueSelectedForPricing()
    If _CatalogPath == ""
        InitPaths()
    EndIf

    String name = UI.GetString("InventoryMenu", "_root.Menu_mc.inventoryLists.itemList.selectedEntry.text")
    If name == ""
        Debug.Notification("AH: no item selected.")
        Return
    EndIf

    ; Strip a trailing " (N)" quantity suffix some menus append, e.g. "Iron Sword (3)"
    Int parenIdx = StringUtil.Find(name, " (")
    If parenIdx > 0
        name = StringUtil.Substring(name, 0, parenIdx)
    EndIf

    Int count = JsonUtil.PathCount(_CatalogPath, ".items")
    If count <= 0
        Debug.Notification("AH: catalog missing. Reinstall the AH mod from the launcher.")
        Debug.Trace("[ERA-AH] hotkey: catalog.json empty or missing")
        Return
    EndIf

    Int found = -1
    Int i = 0
    While i < count && found < 0
        String candidate = JsonUtil.GetPathStringValue(_CatalogPath, ".items[" + i + "].name")
        If candidate == name
            found = i
        EndIf
        i += 1
    EndWhile

    If found < 0
        Debug.Notification("AH: '" + name + "' not in catalog. Use chat: 'ah sell " + name + " <minBid>'.")
        Return
    EndIf

    String plugin = JsonUtil.GetPathStringValue(_CatalogPath, ".items[" + found + "].plugin")
    String formId = JsonUtil.GetPathStringValue(_CatalogPath, ".items[" + found + "].formId")

    ; Append a needs-pricing entry to pending_listings.json. The launcher's
    ; ah-poller will see needsPricing=1 + minBid=0 and surface a modal in the
    ; AH page (instead of forwarding to /ah/sell). Once the player submits the
    ; price the launcher rewrites the same entry with prices set and the next
    ; poll tick forwards it normally.
    Int listIdx = JsonUtil.PathCount(_PendingListingsPath, ".items")
    If listIdx < 0
        listIdx = 0
    EndIf
    Int reqId = Utility.RandomInt(100000, 999999)
    String base = ".items[" + listIdx + "]"
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".id",            reqId)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".name",          name)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".plugin",        plugin)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".formId",        formId)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".count",         1)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".minBid",        0)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".buyout",        0)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".needsPricing",  1)
    JsonUtil.Save(_PendingListingsPath, true)

    Debug.Notification("AH: " + name + " sent to launcher — set price in the Auction House window.")
    Debug.Trace("[ERA-AH] hotkey: queued for launcher pricing req=" + reqId + " " + plugin + ":" + formId)
EndFunction
