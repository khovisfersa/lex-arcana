import {System} from './config.js';

/**
 * The last system version which requires a data migration.
 * 0.2.0: move from template.json to Data Models (Foundry v13/v14). Legacy data shapes
 * (specialties stored as objects, "FateDice" flag, capitalized ritual durations...) are
 * converted on the fly by the DataModels' migrateData(), this migration persists them.
 */
export const NEEDS_MIGRATION_VERSION = "0.2.0";

/**
 * Persist the cleaned/migrated system data of a document.
 * @param {ClientDocument} doc
 * @param {object} [options]
 */
async function persistSystemData(doc, options = {})
{
    const system = doc.toObject().system;
    return doc.update({system}, {recursive: false, diff: false, render: false, ...options});
}

/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function ()
{
    const version = game.system.version;
    ui.notifications.info(`Applying ${System.Name} System Migration for version ${version}. Please be patient and do not close your game or shut down your server.`, {permanent: true});

    // Migrate World Actors (and their owned items)
    for (const actor of game.actors)
    {
        await migrateActor(actor);
    }

    // Migrate World Items
    for (const item of game.items)
    {
        try
        {
            await persistSystemData(item);
        }
        catch (err)
        {
            err.message = `Failed ${System.Code} system migration for Item ${item.name}: ${err.message}`;
            console.error(err);
        }
    }

    // Migrate World Compendium Packs
    for (const pack of game.packs)
    {
        if (pack.metadata.packageType !== 'world') continue;
        if (!['Actor', 'Item'].includes(pack.documentName)) continue;
        await migrateCompendium(pack);
    }

    // Set the migration as complete
    await game.settings.set(System.Code, 'systemMigrationVersion', version);
    ui.notifications.info(`${System.Code} System Migration to version ${version} completed!`, {permanent: true});
};

/**
 * Migrate an actor and its owned items
 * @param {Actor} actor
 */
async function migrateActor(actor)
{
    try
    {
        await persistSystemData(actor);
        const itemUpdates = actor.items.map(i => ({_id: i.id, system: i.toObject().system}));
        if (itemUpdates.length)
        {
            await actor.updateEmbeddedDocuments('Item', itemUpdates, {recursive: false, diff: false, render: false});
        }
    }
    catch (err)
    {
        err.message = `Failed ${System.Code} system migration for Actor ${actor.name}: ${err.message}`;
        console.error(err);
    }
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Documents within a single Compendium pack
 * @param {CompendiumCollection} pack
 * @return {Promise}
 */
export const migrateCompendium = async function (pack)
{
    const documentName = pack.documentName;
    if (!['Actor', 'Item'].includes(documentName)) return;

    // Unlock the pack for editing
    const wasLocked = pack.locked;
    await pack.configure({locked: false});

    const documents = await pack.getDocuments();
    for (const doc of documents)
    {
        try
        {
            if (documentName === 'Actor') await migrateActor(doc);
            else await persistSystemData(doc);
        }
        catch (err)
        {
            err.message = `Failed ${System.Code} system migration for ${doc.name} in pack ${pack.collection}: ${err.message}`;
            console.error(err);
        }
    }

    // Apply the original locked status for the pack
    await pack.configure({locked: wasLocked});
    console.log(`Migrated all ${documentName} documents from Compendium ${pack.collection}`);
};
