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

    Int inboxCount  = ProcessInbox()
    Int outboxCount = ProcessOutbox()

    If VerboseHeartbeat
        Debug.Notification("[ERA-AH] tick " + _TickCount + " (inbox=" + inboxCount + " outbox=" + outboxCount + ")")
    ElseIf inboxCount > 0 || outboxCount > 0
        Debug.Trace("[ERA-AH] tick " + _TickCount + " processed inbox=" + inboxCount + " outbox=" + outboxCount)
    EndIf

    RegisterForSingleUpdate(PollIntervalSeconds)
EndEvent

; ─── INBOX: items the AH owes the player ──────────────────────────────────────
Int Function ProcessInbox()
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
        JsonUtil.SetPathIntArray(_ConfirmedPath, ".ids", one, true)
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
    Int count = JsonUtil.PathCount(_OutboxPath, ".items")
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
            Int[] one = new Int[1]
            one[0] = removalId
            JsonUtil.SetPathIntArray(_RemovedPath, ".ids", one, true)
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
    Form item = Game.GetFormFromFile(baseId, plugin)
    If item
        Return item
    EndIf
    ; Fallback: only safe for full master files at fixed indices. Skyrim.esm
    ; is always at runtime modIndex 0x00; Update/Dawnguard/Hearthfire/
    ; Dragonborn shift depending on load order so we can't assume those.
    If plugin == "Skyrim.esm"
        Return Game.GetForm(baseId)
    EndIf
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
        If      c == "0"; v = 0
        ElseIf  c == "1"; v = 1
        ElseIf  c == "2"; v = 2
        ElseIf  c == "3"; v = 3
        ElseIf  c == "4"; v = 4
        ElseIf  c == "5"; v = 5
        ElseIf  c == "6"; v = 6
        ElseIf  c == "7"; v = 7
        ElseIf  c == "8"; v = 8
        ElseIf  c == "9"; v = 9
        ElseIf  c == "a" || c == "A"; v = 10
        ElseIf  c == "b" || c == "B"; v = 11
        ElseIf  c == "c" || c == "C"; v = 12
        ElseIf  c == "d" || c == "D"; v = 13
        ElseIf  c == "e" || c == "E"; v = 14
        ElseIf  c == "f" || c == "F"; v = 15
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
    ; Always notify so a tester can confirm the hotkey is wired, even if the
    ; inventory menu isn't currently open.
    Debug.Trace("[ERA-AH] hotkey pressed (dxCode=" + keyCode + ")")
    If !UI.IsMenuOpen("InventoryMenu")
        Debug.Notification("AH: open Inventory and hover an item before pressing the hotkey.")
        Return
    EndIf
    TrySellSelected()
EndEvent

Function TrySellSelected()
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

    ; Best-effort ownership hint: if we CAN resolve the form, log the count.
    ; We do NOT block the listing on this check anymore: STR's modified VM
    ; sometimes can't resolve Game.GetFormFromFile() even for vanilla forms,
    ; and we don't want to refuse a legit sale because of a script-side quirk.
    ; The sidecar will validate ownership when the listing is finalised.
    Form item = ResolveCatalogForm(plugin, formId)
    If item
        Int have = Game.GetPlayer().GetItemCount(item)
        Debug.Trace("[ERA-AH] hotkey: '" + name + "' resolved (" + plugin + ":" + formId + ") have=" + have)
    Else
        Debug.Trace("[ERA-AH] hotkey: '" + name + "' could not be resolved client-side (" + plugin + ":" + formId + ") -- proceeding anyway")
    EndIf

    ; Prompt for min bid.
    UIExtensions.InitMenu("UITextEntryMenu")
    UIExtensions.SetMenuPropertyString("UITextEntryMenu", "instructionText", "AH min bid for " + name + " (gold):")
    UIExtensions.OpenMenu("UITextEntryMenu")
    String minBidStr = UIExtensions.GetMenuResultString("UITextEntryMenu")
    Int minBid = minBidStr as Int
    If minBidStr == "" || minBid <= 0
        Debug.Notification("AH: cancelled (min bid required).")
        Return
    EndIf

    ; Prompt for optional buyout.
    UIExtensions.InitMenu("UITextEntryMenu")
    UIExtensions.SetMenuPropertyString("UITextEntryMenu", "instructionText", "Optional buyout price (blank to skip):")
    UIExtensions.OpenMenu("UITextEntryMenu")
    String buyoutStr = UIExtensions.GetMenuResultString("UITextEntryMenu")
    Int buyout = 0
    If buyoutStr != ""
        buyout = buyoutStr as Int
        If buyout < minBid
            Debug.Notification("AH: buyout must be >= min bid; ignoring.")
            buyout = 0
        EndIf
    EndIf

    ; Append to pending_listings.json
    Int listIdx = JsonUtil.PathCount(_PendingListingsPath, ".items")
    If listIdx < 0
        listIdx = 0
    EndIf
    Int reqId = Utility.RandomInt(100000, 999999)
    String base = ".items[" + listIdx + "]"
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".id",     reqId)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".name",   name)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".plugin", plugin)
    JsonUtil.SetPathStringValue(_PendingListingsPath, base + ".formId", formId)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".count",  1)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".minBid", minBid)
    JsonUtil.SetPathIntValue(_PendingListingsPath,    base + ".buyout", buyout)
    JsonUtil.Save(_PendingListingsPath, true)

    Debug.Notification("AH: " + name + " queued @ " + minBid + "g (buyout " + buyout + "g). Item will be escrowed shortly.")
    Debug.Trace("[ERA-AH] hotkey: queued listing req=" + reqId + " " + plugin + ":" + formId + " minBid=" + minBid + " buyout=" + buyout)
EndFunction
