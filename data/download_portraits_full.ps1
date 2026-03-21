$heroes = @(
  "abaddon","abyssal_underlord","alchemist","ancient_apparition","antimage",
  "arc_warden","axe","bane","batrider","beastmaster","bloodseeker","bounty_hunter",
  "brewmaster","bristleback","broodmother","centaur","chaos_knight","chen","clinkz",
  "crystal_maiden","dark_seer","dark_willow","dawnbreaker","dazzle","death_prophet",
  "disruptor","doom_bringer","dragon_knight","drow_ranger","earth_spirit","earthshaker",
  "elder_titan","ember_spirit","enchantress","enigma","faceless_void","furion",
  "grimstroke","gyrocopter","hoodwink","huskar","invoker","jakiro","juggernaut",
  "keeper_of_the_light","kez","kunkka","largo","legion_commander","leshrac","lich",
  "life_stealer","lina","lion","lone_druid","luna","lycan","magnataur","marci","mars",
  "medusa","meepo","mirana","monkey_king","morphling","muerta","naga_siren","necrolyte",
  "nevermore","night_stalker","nyx_assassin","obsidian_destroyer","ogre_magi",
  "omniknight","oracle","pangolier","phantom_assassin","phantom_lancer","phoenix",
  "primal_beast","puck","pudge","pugna","queenofpain","rattletrap","razor","riki",
  "ringmaster","rubick","sand_king","shadow_demon","shadow_shaman","shredder",
  "silencer","skeleton_king","skywrath_mage","slardar","slark","snapfire","sniper",
  "spectre","spirit_breaker","storm_spirit","sven","techies","templar_assassin",
  "terrorblade","tidehunter","tinker","tiny","treant","troll_warlord","tusk",
  "undying","ursa","vengefulspirit","venomancer","viper","visage","void_spirit",
  "warlock","weaver","windrunner","winter_wyvern","wisp","witch_doctor","zuus"
)

$outDir = "C:\Users\edsel\OneDrive\Desktop\Development Folder\Dota2DraftStructure\dota2draftanalyzer\public\hero_portraits"
New-Item -ItemType Directory -Force $outDir | Out-Null

$base = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes"
$failed = @()

foreach ($hero in $heroes) {
  $dest = "$outDir\$hero.png"
  if (Test-Path $dest) { Write-Host "SKIP $hero"; continue }
  $url = "$base/${hero}_full.png"
  try {
    Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -ErrorAction Stop
    Write-Host "OK   $hero"
  } catch {
    Write-Host "FAIL $hero"
    $failed += $hero
  }
}

Write-Host ""
Write-Host "=== Done. Failed: $($failed.Count) ==="
if ($failed.Count -gt 0) { Write-Host ($failed -join ", ") }
