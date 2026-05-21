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

String _InboxPath
String _ConfirmedPath
String _OutboxPath
String _RemovedPath
String _RemovalFailedPath
Int    _TickCount

Event OnInit()
    InitPaths()
    RegisterForSingleUpdate(PollIntervalSeconds)
    Debug.Notification("ERA Auction House: bridge enabled (v2 — escrow+delivery).")
    Debug.Trace("[ERA-AH] OnInit: ready, poll=" + PollIntervalSeconds + "s")
EndEvent

Function InitPaths()
    _InboxPath         = "../ERA-AH/inbox"
    _ConfirmedPath     = "../ERA-AH/confirmed"
    _OutboxPath        = "../ERA-AH/outbox"
    _RemovedPath       = "../ERA-AH/removed"
    _RemovalFailedPath = "../ERA-AH/removal_failed"
EndFunction

Event OnUpdate()
    If _InboxPath == ""
        InitPaths()
    EndIf
    _TickCount += 1

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

        Form item = Game.GetFormFromFile(HexToInt(formStr), plugin)
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

        Form item = Game.GetFormFromFile(HexToInt(formStr), plugin)
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
