Scriptname ERA_AH_Inbox extends Quest

; ──────────────────────────────────────────────────────────────────────────────
;  ERA Auction House — In-Game Auto-Delivery
;
;  Polls a JSON file written by the ERA Launcher every few seconds.
;  For each pending delivery, calls Game.AddItem on the player using the
;  FormID + plugin reported by the server, then writes a confirmation file
;  the launcher posts back to mark the delivery claimed.
;
;  REQUIRES:
;    - SKSE (Skyrim Script Extender)
;    - PapyrusUtil SE  (https://www.nexusmods.com/skyrimspecialedition/mods/13048)
;
;  FILE PROTOCOL (in <SkyrimDataFolder>/SKSE/Plugins/ERA-AH/):
;    inbox.json      - written by launcher, read by this script
;    confirmed.json  - written by this script, read by launcher
;
;  inbox.json schema:
;    { "items": [ { "id": 12, "plugin": "Skyrim.esm", "formId": "012EB7",
;                    "name": "Iron Sword", "count": 1 }, ... ] }
;
;  confirmed.json schema:
;    { "ids": [ 12, 13, 14 ] }
; ──────────────────────────────────────────────────────────────────────────────

Float Property PollIntervalSeconds = 5.0 Auto

String _InboxPath
String _ConfirmedPath

Event OnInit()
    _InboxPath     = "../ERA-AH/inbox"      ; PapyrusUtil resolves under Data/SKSE/Plugins/StorageUtilData/
    _ConfirmedPath = "../ERA-AH/confirmed"
    RegisterForSingleUpdate(PollIntervalSeconds)
    Debug.Notification("ERA Auction House: auto-delivery enabled.")
EndEvent

Event OnUpdate()
    ; OnInit fires only on first load; we also re-arm here so polling restarts after any save/load.
    If _InboxPath == ""
        _InboxPath     = "../ERA-AH/inbox"
        _ConfirmedPath = "../ERA-AH/confirmed"
    EndIf
    ProcessInbox()
    RegisterForSingleUpdate(PollIntervalSeconds)
EndEvent

Function ProcessInbox()
    ; PapyrusUtil's JsonUtil.PathLoadFile gives nothing back, use array path access
    Int count = JsonUtil.PathCount(_InboxPath, ".items")
    If count <= 0
        Return
    EndIf

    Actor playerRef = Game.GetPlayer()
    Int idx = 0
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
        Else
            Debug.Trace("[ERA-AH] Could not resolve " + plugin + ":" + formStr)
        EndIf

        ; Append this deliveryId to confirmed.json's .ids array.
        Int[] one = new Int[1]
        one[0] = deliveryId
        JsonUtil.SetPathIntArray(_ConfirmedPath, ".ids", one, true)
        idx += 1
    EndWhile

    If count > 0
        JsonUtil.Save(_ConfirmedPath, true)
    EndIf
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
