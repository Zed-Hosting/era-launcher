-- ERA Auction House — STR Server Script
-- Drop this file + json.lua into: <STR server>/resources/era-ah/
-- Manifest entry: { "FolderName": "era-ah", "EntryPoint": "ah.lua" }

-- Use dofile() with absolute path — bypasses package.path entirely
local json = dofile("/home/container/resources/era-ah/json.lua")

-- Singleton references (colon syntax required by STR's sol2 bindings)
local playerMgr  = PlayerManager:get()
local gameServer = GameServer:get()

local queueIn  = "/home/container/queue/in/"
local queueOut = "/home/container/queue/out/"

-- Ensure queue directories exist
os.execute("mkdir -p /home/container/queue/in /home/container/queue/out")

-- Pending responses: reqId -> connectionId
local pending = {}

-- Find a player by their character entity ID (used in onChatMessage)
local function getPlayerByEntity(entityId)
    local players = playerMgr:GetAllPlayers()
    for _, player in pairs(players) do
        -- Try GetId() first (numeric), then GetCharacter() (entity handle)
        local ok1, pid = pcall(function() return player:GetId() end)
        local ok2, cid = pcall(function() return player:GetCharacter() end)
        if (ok1 and pid == entityId) or (ok2 and cid == entityId) then
            return player
        end
    end
    return nil
end

-- ── Helpers ──────────────────────────────────────────────────────────────────

local function sendCommand(connId, cmd)
    local reqId = tostring(math.floor(os.time() * 1000)) .. tostring(math.random(10000, 99999))
    local f = io.open(queueIn .. reqId .. ".json", "w")
    if not f then
        gameServer:SendChatMessage(connId, "[AH] Error: cannot write to queue. Is the sidecar running?")
        return nil
    end
    f:write(json.encode(cmd))
    f:close()
    pending[reqId] = connId
    return reqId
end

local function flushResponses()
    for reqId, connId in pairs(pending) do
        local path = queueOut .. reqId .. ".json"
        local f = io.open(path, "r")
        if f then
            local data = f:read("*a")
            f:close()
            os.remove(path)
            pending[reqId] = nil

            local ok, resp = pcall(json.decode, data)
            if ok and resp then
                gameServer:SendChatMessage(connId, resp.message or "")
                if resp.broadcast and resp.broadcast ~= "" then
                    gameServer:SendGlobalChatMessage(resp.broadcast)
                end
            end
        end
    end
end

-- ── Command parser ────────────────────────────────────────────────────────────

local COMMANDS = {
    -- /ah  (no subcommand) — show help
    ["help"] = function(connId, user, args)
        local lines = {
            "── ERA Auction House ── (type without /)",
            "ah list [search]       — Browse listings",
            "ah detail <id>         — View listing details + bid history",
            "ah sell <item> <minBid> [buyout] [hours]",
            "ah bid <id> <amount>   — Place a bid",
            "ah buyout <id>         — Buy immediately at buyout price",
            "ah cancel <id>         — Cancel your listing (deposit forfeited)",
            "ah mylistings          — Your active/recent listings",
            "ah mybids              — Your active bids",
            "ah mailbox             — Check pending deliveries",
            "ah claim <id>          — Claim a mailbox delivery",
            "ah balance             — Your gold balance",
            "ah whoami              — Show your AH username (paste into launcher Settings)",
            "ah ping                — Diagnostic: queue a 1-Septim test delivery",
        }
        gameServer:SendChatMessage(connId, table.concat(lines, "\n"))
    end,

    ["list"] = function(connId, user, args)
        -- args: [search terms...]
        local search = #args > 0 and table.concat(args, " ") or nil
        sendCommand(connId, { type="list", user=user, search=search, page=0 })
    end,

    ["detail"] = function(connId, user, args)
        local id = tonumber(args[1])
        if not id then gameServer:SendChatMessage(connId, "Usage: /ah detail <id>") return end
        sendCommand(connId, { type="detail", user=user, listingId=id })
    end,

    ["sell"] = function(connId, user, args)
        -- /ah sell <item name> <minBid> [buyout] [hours]
        -- We parse from the right: optional last two numeric args
        if #args < 2 then
            gameServer:SendChatMessage(connId, "Usage: /ah sell <item name> <minBid> [buyout] [hours]")
            return
        end

        local durationHours, buyoutPrice, minBid
        local nameEnd = #args

        -- Peel off trailing numbers
        if tonumber(args[nameEnd]) and nameEnd > 2 then
            local v = tonumber(args[nameEnd])
            -- Heuristic: if < 100 it's hours, otherwise price
            if v <= 72 and tonumber(args[nameEnd - 1]) then
                durationHours = v
                nameEnd = nameEnd - 1
            end
        end
        if nameEnd >= 3 and tonumber(args[nameEnd]) then
            buyoutPrice = math.floor(tonumber(args[nameEnd]))
            nameEnd = nameEnd - 1
        end
        minBid = math.floor(tonumber(args[nameEnd]) or 0)
        if minBid <= 0 then
            gameServer:SendChatMessage(connId, "Usage: /ah sell <item name> <minBid> [buyout] [hours]")
            return
        end
        local itemName = table.concat(args, " ", 1, nameEnd - 1)
        if itemName == "" then
            gameServer:SendChatMessage(connId, "Usage: /ah sell <item name> <minBid> [buyout] [hours]")
            return
        end

        sendCommand(connId, {
            type="sell", user=user,
            itemName=itemName, quantity=1,
            minBid=minBid, buyoutPrice=buyoutPrice,
            durationHours=durationHours
        })
    end,

    ["bid"] = function(connId, user, args)
        local id  = tonumber(args[1])
        local amt = tonumber(args[2])
        if not id or not amt then
            gameServer:SendChatMessage(connId, "Usage: /ah bid <id> <amount>")
            return
        end
        sendCommand(connId, { type="bid", user=user, listingId=math.floor(id), amount=math.floor(amt) })
    end,

    ["buyout"] = function(connId, user, args)
        local id = tonumber(args[1])
        if not id then gameServer:SendChatMessage(connId, "Usage: /ah buyout <id>") return end
        sendCommand(connId, { type="buyout", user=user, listingId=math.floor(id) })
    end,

    ["cancel"] = function(connId, user, args)
        local id = tonumber(args[1])
        if not id then gameServer:SendChatMessage(connId, "Usage: /ah cancel <id>") return end
        sendCommand(connId, { type="cancel", user=user, listingId=math.floor(id) })
    end,

    ["mylistings"] = function(connId, user, args)
        sendCommand(connId, { type="mylistings", user=user })
    end,

    ["mybids"] = function(connId, user, args)
        sendCommand(connId, { type="mybids", user=user })
    end,

    ["mailbox"] = function(connId, user, args)
        sendCommand(connId, { type="mailbox", user=user })
    end,

    ["claim"] = function(connId, user, args)
        local id = tonumber(args[1])
        if not id then gameServer:SendChatMessage(connId, "Usage: /ah claim <id>") return end
        sendCommand(connId, { type="claim", user=user, deliveryId=math.floor(id) })
    end,

    ["balance"] = function(connId, user, args)
        sendCommand(connId, { type="balance", user=user })
    end,

    ["ping"] = function(connId, user, args)
        sendCommand(connId, { type="ping", user=user })
    end,

    ["whoami"] = function(connId, user, args)
        -- Resolved entirely in lua so it works even if the sidecar is down.
        gameServer:SendChatMessage(connId,
            "[AH] Your AH username is: " .. tostring(user) .. "\n" ..
            "Open the launcher → Settings → AH Username and paste this EXACTLY " ..
            "(case-sensitive). Without a matching launcher, deliveries and " ..
            "hover-to-sell will not work.")
    end,
}

-- ── Event handlers ────────────────────────────────────────────────────────────

addEventHandler("onPlayerJoin", function(connectionId)
    local player = playerMgr:GetByConnectionId(connectionId)
    if not player then return end
    local user = player:GetUsername()
    sendCommand(connectionId, { type="register", user=user })
end)

addEventHandler("onChatMessage", function(senderEntity, message)
    -- STR client intercepts slash-prefixed messages server-side; they never arrive here.
    -- Players type "ah <cmd>" (no slash). We cancel the event so it doesn't show in chat.
    if not message:match("^ah%s") and message ~= "ah" then return end

    -- Cancel event FIRST so the message is never broadcast to other players
    cancelEvent("ah_command")

    local player = getPlayerByEntity(senderEntity)
    if not player then return end

    local connId = player:GetConnectionId()
    local user   = player:GetUsername()

    -- Match ah <subcommand> [args...] (slash already stripped by STR)
    local sub, rest = message:match("^ah%s+(%S+)%s*(.*)")
    if not sub then
        -- bare "ah" → show help
        COMMANDS["help"](connId, user, {})
        return
    end

    sub = sub:lower()
    local handler = COMMANDS[sub]
    if not handler then
        gameServer:SendChatMessage(connId, "Unknown AH command. Type /ah for help.")
        return
    end

    -- Split remaining args
    local args = {}
    for w in rest:gmatch("%S+") do args[#args+1] = w end

    handler(connId, user, args)
end)

addEventHandler("onUpdate", function(delta)
    flushResponses()
end)

print("[AH] ERA Auction House script loaded.")
