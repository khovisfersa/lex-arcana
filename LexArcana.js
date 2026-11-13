/**
 * The Lex Arcana game system for Foundry Virtual Tabletop
 * Author: pierre.plans@gmail.com, Lysoun, Milo115b
 * Software License: MIT LICENSE
 * Compatible with Foundry VTT v13 and v14.
 */

// Import Modules
import {System} from './module/config.js';
import {LexArcana} from './module/config.js';
import {registerSystemSettings} from './module/settings.js';
import {preloadHandlebarsTemplates} from './module/templates.js';
import {registerDataModels} from './module/data/models.js';

// Import Documents
import LexArcanaActor from './module/actor/actor.js';
import LexArcanaItem from './module/item/item.js';

// Import Applications
import LexArcanaCustosActorSheet from './module/actor/sheets/custos.js';
import LexArcanaNPCActorSheet from './module/actor/sheets/npc.js';
import LexArcanaCreatureActorSheet from './module/actor/sheets/creature.js';
import LexArcanaItemSheet from './module/item/sheets/base.js';
import LexArcanaProvinceSheet from './module/item/sheets/provinceSheet.js';
import LexArcanaRitualSheet from './module/item/sheets/ritualSheet.js';
import LexArcanaSpecialAbilitySheet from './module/item/sheets/specialAbilitySheet.js';
import LexArcanaMagicalPowerSheet from './module/item/sheets/magicalPowerSheet.js';

// Import Helpers
import * as dice from './module/dice.js';
import * as migrations from './module/migration.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once('init', function ()
{
    console.log(`${System.Code} | Initializing the ${System.Name} Game System\n`);

    // Create a namespace within the game global
    game.lexArcana = {
        applications:
            {
                LexArcanaCustosActorSheet,
                LexArcanaNPCActorSheet,
                LexArcanaCreatureActorSheet,
                LexArcanaItemSheet,
                LexArcanaProvinceSheet,
                LexArcanaRitualSheet,
                LexArcanaSpecialAbilitySheet,
                LexArcanaMagicalPowerSheet
            },
        config: LexArcana,
        dice: dice,
        documents:
            {
                LexArcanaActor,
                LexArcanaItem
            },
        migrations: migrations
    };
    // Backward compatibility with the old namespace
    game.lexArcana.entities = game.lexArcana.documents;

    // Record Configuration Values
    CONFIG.LexArcana = LexArcana;
    CONFIG.Actor.documentClass = LexArcanaActor;
    CONFIG.Item.documentClass = LexArcanaItem;
    CONFIG.time.roundTime = 6;
    registerDataModels();

    // Register System Settings
    registerSystemSettings();

    // Initiative
    CONFIG.Combat.initiative = {formula: '1d20', decimals: 0};

    // Register sheet application classes
    const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
    const registerActorSheet = (cls, types, label) =>
        DocumentSheetConfig.registerSheet(Actor, System.Code, cls, {types, makeDefault: true, label});
    const registerItemSheet = (cls, types, label) =>
        DocumentSheetConfig.registerSheet(Item, System.Code, cls, {types, makeDefault: true, label});

    // Remove the deprecated core V1 sheets (if any) so they are not offered to users
    try { DocumentSheetConfig.unregisterSheet(Actor, 'core', foundry.appv1.sheets.ActorSheet); } catch(err) {}
    try { DocumentSheetConfig.unregisterSheet(Item, 'core', foundry.appv1.sheets.ItemSheet); } catch(err) {}

    registerActorSheet(LexArcanaCustosActorSheet, [LexArcana.ActorType.custos], 'LexArcana.SheetClassCustos');
    registerActorSheet(LexArcanaNPCActorSheet, [LexArcana.ActorType.npc], 'LexArcana.SheetClassNPC');
    registerActorSheet(LexArcanaCreatureActorSheet, [LexArcana.ActorType.creature], 'LexArcana.SheetClassCreature');

    registerItemSheet(LexArcanaItemSheet, [
        LexArcana.ItemType.meleeWeapon,
        LexArcana.ItemType.rangedWeapon,
        LexArcana.ItemType.armor,
        LexArcana.ItemType.shield
    ], 'LexArcana.SheetClassItem');
    registerItemSheet(LexArcanaProvinceSheet, [LexArcana.ItemType.province], 'LexArcana.SheetClassProvince');
    registerItemSheet(LexArcanaRitualSheet,
        [LexArcana.ItemType.indigamentum, LexArcana.ItemType.ritual, LexArcana.ItemType.talent],
        'LexArcana.SheetClassRitual');
    registerItemSheet(LexArcanaSpecialAbilitySheet, [LexArcana.ItemType.specialAbility], 'LexArcana.SheetClassSpecialAbility');
    registerItemSheet(LexArcanaMagicalPowerSheet, [LexArcana.ItemType.magicalPower], 'LexArcana.SheetClassMagicalPower');

	// handle bars helpers
	// if equal
	Handlebars.registerHelper('ife', function (v1, v2, options) {
		if (v1 === v2) return options.fn(this);
		else return options.inverse(this);
	});
	// if not equal
	Handlebars.registerHelper('ifne', function (v1, v2, options) {
		if (v1 !== v2) return options.fn(this);
		else return options.inverse(this);
	});

    // Preload Handlebars Templates
    preloadHandlebarsTemplates();

    // Slowing down pings
    const pingStyles = CONFIG.Canvas?.pings?.styles;
    if (pingStyles)
    {
        for (const style of ['pulse', 'alert', 'arrow'])
        {
            if (pingStyles[style]) pingStyles[style].duration = 2000;
        }
    }
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once('setup', function()
{
    // Localize CONFIG objects once up-front
    const toLocalize = ['Virtutes', 'Peritia'];

    // Localize and sort CONFIG objects
    for ( let o of toLocalize )
    {
        CONFIG.LexArcana[o] = Object.entries(CONFIG.LexArcana[o]).reduce((obj, e) => {
            obj[e[0]] = game.i18n.localize(e[1]);
            return obj;
        }, {});
    }
});

/**
 * Custom pause image (GamePause is an ApplicationV2 since Foundry v13)
 */
function customizePause()
{
    const pause = document.getElementById('pause');
    if (!pause) return;
    const img = pause.querySelector('img');
    if (img)
    {
        img.src = `${System.Path}/styles/images/pause.svg`;
        img.classList.add('fa-spin', 'pause-image');
    }
    pause.querySelector('figcaption')?.classList.add('pause-lex');
}
Hooks.on('renderGamePause', customizePause);
Hooks.on('renderPause', customizePause);


/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once('ready', function ()
{
    if (!game.user.isGM) return;
    const currentVersion = game.settings.get(System.Code, 'systemMigrationVersion');
    const needsMigration = !currentVersion || foundry.utils.isNewerVersion(migrations.NEEDS_MIGRATION_VERSION, currentVersion);
    if (!needsMigration) return;
    migrations.migrateWorld();
});
