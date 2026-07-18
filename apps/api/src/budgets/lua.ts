/**
 * Atomic budget reservation / adjustment Lua scripts.
 *
 * Counters store spent micro-dollars. Reservation INCRBYs the estimate up-front;
 * settle adjusts by (actual - estimate); release subtracts the estimate.
 */

/**
 * KEYS = counter keys
 * ARGV[1] = estimate (integer)
 * ARGV[2] = hardBlock (1|0)
 * ARGV[3..] = limit per key (-1 = unlimited / skip check)
 *
 * Returns:
 *   1 = reserved
 *   0 = budget_exceeded (hardBlock and would exceed)
 */
export const RESERVE_LUA = `
local estimate = tonumber(ARGV[1])
local hardBlock = tonumber(ARGV[2])
local n = #KEYS

for i = 1, n do
  local limit = tonumber(ARGV[2 + i])
  if limit ~= nil and limit >= 0 then
    local spent = tonumber(redis.call('GET', KEYS[i]) or '0') or 0
    if spent + estimate > limit and hardBlock == 1 then
      return 0
    end
  end
end

for i = 1, n do
  redis.call('INCRBY', KEYS[i], estimate)
end
return 1
`;

/**
 * KEYS = counter keys
 * ARGV[1] = delta (integer, may be negative)
 */
export const ADJUST_LUA = `
local delta = tonumber(ARGV[1])
for i = 1, #KEYS do
  local next = (tonumber(redis.call('GET', KEYS[i]) or '0') or 0) + delta
  if next < 0 then next = 0 end
  redis.call('SET', KEYS[i], next)
end
return 1
`;
