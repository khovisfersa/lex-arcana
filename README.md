# Lex Arcana for Foundry VTT v13 / v14 (fork)

> **This is a fork.** It is a port of the original **Lex Arcana** game system
> ([Foundry-VTT-Lex-Arcana/foundryvtt-lexarcana](https://github.com/Foundry-VTT-Lex-Arcana/foundryvtt-lexarcana)),
> created by **Draedrus (Pierre-Marie Plans), Lysoun, Milo115b, ForjaSalvaje and ParvusDomus**
> (see [CONTRIBUTORS.md](CONTRIBUTORS.md)). All credit for the system, its design and its artwork goes to them.
>
> The original system targets Foundry VTT v10/v11. This fork, maintained by
> [khovisfersa](https://github.com/khovisfersa), only adapts it to run on **Foundry VTT v13 and v14**;
> the game rules are unchanged.
>
> Manifest URL for this fork:
> `https://raw.githubusercontent.com/khovisfersa/lex-arcana/master/system.json`

This project is not official and hence is supported neither by Foundry VTT &trade; nor by Lex Arcana &trade;.

# Rolls
Due to the nature of Lex Arcana rolls, in order to avoid decision time for players we cut the rolls in five distinct possibilities
## The custom roll
You get to decide the composition of your roll for this ability
## The 1,2,3 dices roll
The system will compute the expression for the roll closest to the ability stats and using 1,2 or 3 dices
## 1,2,3 dices balanced and unbalanced
We added a balanced/unbalanced mode that will allow you to chose to either use similar dices or very different dices
The system in unbalanced mode will try to find the greatest dice that will fit you wish (ability & number of dices) then if needed, he will try to fill the next dices with the rest of the points available.
The balanced mode works the same, but the system will try to keep the dices almost with the same number of faces.

Example: for a roll of 18 of Ingenium
Balanced mode with 3 dices: 3d6
Unbalanced mode with 3 dices: 1d12+1d3+1d3

# to come
* Adding item classes to items and association for 'de Bello' Peritia specialties

# Versions
## 0.3.0 (fork: Imperium visual theme)
* New visual theme inspired by Ancient Rome: marble, Pompeian red, Tyrian purple and gold, Greek key bands, Trajan lettering
* Redesigned actor headers (gilded medallion portrait with golden laurels, engraved name, resource cartouches)
* Virtutes / Peritiae shown as tablets with values in golden coins; restyled tabs, item lists, item sheets, dialogs
* Roll chat cards with banner header, highlighted result and degree of success seals

## 0.2.0 (fork: Foundry v13 / v14 port)
* Requires Foundry VTT v13 or later (verified on v14)
* Replaced the deprecated `template.json` by Data Models declared in `system.json` (`documentTypes`); legacy data is migrated automatically
* Rewrote all actor and item sheets with ApplicationV2 (`ActorSheetV2` / `ItemSheetV2`) and dialogs with `DialogV2`
* Rolls are now asynchronous and attached to chat messages (`rolls`), using the v14 message mode when available
* Rich text editors use the `<prose-mirror>` element; `{{#select}}` replaced by `{{selectOptions}}`
* CSS scoped to the system windows (the old global reset broke the v13+ interface)
* Encumbrance is now computed from carried items instead of being written on every sheet render
* Fixed: item class selector of De Bello specialties, ritual disciplines on owned items, `rollDeBello` / `combatTurn`
* Fixed: fate roll threshold of custom expressions with several dice of the same kind (e.g. 2d6 now explodes on 12)
* Added `TYPES.*` localization keys (en, es)

# 0.1.1
* reworked template.json again, going towards the stable version of this, sorry about it
* fixed the three dice issue with the human NPCs sheet
* added localization for the missing entries in this very sheet
* added NPCs sheets
* added Creatures sheets
* fixed various bugs
* now peritiae are computed based on province affected

## 0.1.0
* reworked the whole data
* added a sheet for human NPCs, prepared the ground for the fantastical creatures

## 0.0.8
* several fixes, v9 migration

## 0.0.7
* Various fixes for invetory tab
* Various fixes for ritual tab
* Fixed Degrees of Success being shifter of one

## 0.0.6
* Fixed tooltips localization
* Fixed default values for custom rolls
* Added degrees of succes in usual rolls
* Localizations various fixes
* Overhaul of the inventory
* Changed dices icons
* Added difficulty threshold to rolls dialogs
* Refactored the roll dialog code for better maintenance
* Various UI fixes from Forja

## 0.0.5
* Added tooltips for rolls
* Grid set to 2m instead of 10
* Fixed crash on opening provinces sheet
* Fixed Spanish accents
* Changed font to Trajan instead of Herculanum

## 0.0.4
* Fixed crash on opening rituals/indigamenta sheets

## 0.0.3
* Complete rolling API overhaul
* Design overhaul

## 0.0.2
* Fixed custom rolls - spotted architecture weird things, gotta improve this in later versions
* Fixed rituals/indigamenta issues
* Fixed CSS issues
* Compatibility with Foundry VTT v9.0

## Prior 0.0.1
Alpha version, Custos character sheet base, items base and rituals/indigamenta not working

# Credits
