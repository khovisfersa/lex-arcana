/**
 * System Data Models for Lex Arcana.
 * These replace the deprecated template.json (deprecated in Foundry v14, removed in v16).
 */
const fields = foundry.data.fields;

const VIRTUTES = ['coordinatio', 'auctoritas', 'ratio', 'vigor', 'ingenium', 'sensibilitas'];
const PERITIAE = ['deBello', 'deCorpore', 'deMagia', 'deNatura', 'deScientia', 'deSocietate'];

/**
 * A NumberField which never fails validation because of a malformed legacy value:
 * blank or non numeric input falls back to the field's initial value.
 */
class LooseNumberField extends fields.NumberField
{
    constructor(options = {}, context = {})
    {
        super({required: true, nullable: false, ...options}, context);
    }

    /** @override */
    _cast(value)
    {
        if (typeof value === 'string') value = value.trim().replace(',', '.');
        if (value === '' || value === null) return this.initial;
        const n = Number(value);
        return Number.isFinite(n) ? n : this.initial;
    }
}

const num = (initial = 0, options = {}) => new LooseNumberField({initial, ...options});
const str = (initial = '') => new fields.StringField({required: true, blank: true, initial});
const bool = (initial = false) => new fields.BooleanField({initial});
const html = () => new fields.HTMLField({required: true, blank: true, initial: ''});

/** Convert an object with numeric keys (legacy storage of arrays) into a real array. */
function toArray(value)
{
    if (Array.isArray(value)) return value;
    if (value && (typeof value === 'object')) return Object.values(value);
    return [];
}

/* -------------------------------------------- */
/*  Actors                                      */
/* -------------------------------------------- */

function resourceField(value, max)
{
    return new fields.SchemaField({
        min: num(0),
        value: num(value),
        max: num(max)
    });
}

class LexArcanaActorBase extends foundry.abstract.TypeDataModel
{
    static defineSchema()
    {
        return {
            biography: html(),
            attributes: new fields.SchemaField({
                hitPoints: resourceField(10, 40),
                pietas: resourceField(10, 50),
                npc: bool(true)
            }),
            fateRoll: bool(true),
            treated: bool(false)
        };
    }

    /** @override */
    static migrateData(source)
    {
        // Very old actors stored the fate roll flag as "FateDice"
        if (source.fateRoll === undefined && source.FateDice !== undefined)
        {
            source.fateRoll = !!source.FateDice;
        }
        return super.migrateData(source);
    }
}

export class CustosData extends LexArcanaActorBase
{
    static defineSchema()
    {
        const schema = super.defineSchema();

        schema.virtutes = new fields.SchemaField(VIRTUTES.reduce((obj, key) =>
        {
            obj[key] = new fields.SchemaField({
                value: num(3),
                defaultRoll: str('d3')
            });
            return obj;
        }, {}));

        schema.peritiae = new fields.SchemaField(PERITIAE.reduce((obj, key) =>
        {
            obj[key] = new fields.SchemaField({
                value: num(6),
                specialties: new fields.ArrayField(new fields.SchemaField({
                    name: str(''),
                    defaultRoll: str(''),
                    modifier: num(0),
                    itemClass: str('')
                })),
                defaultRoll: str('d6'),
                exp_multiplier: num(1),
                spent_exp: num(0)
            });
            return obj;
        }, {}));

        // human template
        schema.age = num(19);
        schema.gender = str('n/a');
        schema.languages = str('');
        schema.encumbrance = num(0);

        // custos specific
        schema.provinceId = num(0);
        schema.office = str('explorer');
        schema.rank = str('gregarius');
        schema.experience = num(0);
        schema.mosArcanorum = new fields.SchemaField({exp_multiplier: num(1), spent_exp: num(0)});
        schema.paxDeorum = new fields.SchemaField({exp_multiplier: num(1), spent_exp: num(0)});
        return schema;
    }

    /** @override */
    static migrateData(source)
    {
        // Specialties used to be stored as objects keyed by index
        for (const key of PERITIAE)
        {
            const peritia = source.peritiae?.[key];
            if (peritia && ('specialties' in peritia) && !Array.isArray(peritia.specialties))
            {
                peritia.specialties = toArray(peritia.specialties);
            }
        }
        return super.migrateData(source);
    }

    /** @override */
    prepareDerivedData()
    {
        // Encumbrance is the sum of all carried (not dropped) items
        const items = this.parent?.items;
        if (items)
        {
            this.encumbrance = items.reduce((total, item) =>
            {
                if (item.system?.dropped) return total;
                return total + (Number(item.system?.encumbrance) || 0);
            }, 0);
        }
    }
}

class NPCBaseData extends LexArcanaActorBase
{
    static defineSchema()
    {
        const schema = super.defineSchema();
        const stringList = (initial) => new fields.ArrayField(new fields.StringField({blank: true}), {initial});
        schema.diceValue = num(4);
        schema.size = num(1);
        schema.hitPoints = num(4);
        schema.oneDice = stringList(['Damage', 'Sensibilitas']);
        schema.twoDice = stringList(['DeBello', 'DeCorpore']);
        schema.threeDice = stringList(['HitPoints']);
        return schema;
    }

    /** @override */
    static migrateData(source)
    {
        for (const key of ['oneDice', 'twoDice', 'threeDice'])
        {
            if ((key in source) && !Array.isArray(source[key])) source[key] = toArray(source[key]);
        }
        return super.migrateData(source);
    }
}

export class NPCData extends NPCBaseData {}

export class CreatureData extends NPCBaseData
{
    static defineSchema()
    {
        const schema = super.defineSchema();
        schema.degreeOfDanger = num(1);
        schema.information = new fields.SchemaField({
            degree1: html(),
            degree2: html(),
            degree3: html()
        });
        return schema;
    }
}

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

class LexArcanaItemBase extends foundry.abstract.TypeDataModel
{
    static defineSchema()
    {
        return {description: html()};
    }
}

function physicalFields()
{
    return {
        encumbrance: num(0),
        active: bool(false),
        dropped: bool(false),
        actionType: new fields.StringField({required: false, nullable: true, blank: true, initial: null}),
        class: str('')
    };
}

function weaponFields()
{
    return {
        damage: num(3),
        difficulty: num(3),
        feat: str('')
    };
}

export class ProvinceData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {
            ...super.defineSchema(),
            languages: str(''),
            peritiaeModifiers: new fields.SchemaField(PERITIAE.reduce((obj, key) =>
            {
                obj[key] = new fields.SchemaField({value: num(0)});
                return obj;
            }, {}))
        };
    }
}

export class MeleeWeaponData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {...super.defineSchema(), ...physicalFields(), ...weaponFields(), peritia: str('deBello')};
    }
}

export class RangedWeaponData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {...super.defineSchema(), ...physicalFields(), ...weaponFields(), range: str('short'), peritia: str('deBello')};
    }
}

export class ArmorData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {...super.defineSchema(), ...physicalFields(), protection: num(3)};
    }
}

export class ShieldData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {...super.defineSchema(), ...physicalFields(), parry: num(3)};
    }
}

export class IndigamentumData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {...super.defineSchema(), cost: num(6), requirement: html(), used: bool(false)};
    }
}

export class RitualData extends LexArcanaItemBase
{
    static defineSchema()
    {
        return {
            ...super.defineSchema(),
            cost: num(6),
            disciplines: new fields.ArrayField(new fields.SchemaField({
                name: str('precognition'),
                difficultyThreshold: num(6)
            })),
            duration: str('short'),
            peritia: str('deMagia')
        };
    }

    /** @override */
    static migrateData(source)
    {
        if (('disciplines' in source) && !Array.isArray(source.disciplines)) source.disciplines = toArray(source.disciplines);
        if (typeof source.duration === 'string') source.duration = source.duration.toLowerCase();
        return super.migrateData(source);
    }
}

export class TalentData extends LexArcanaItemBase {}
export class SpecialAbilityData extends LexArcanaItemBase {}
export class MagicalPowerData extends LexArcanaItemBase {}

/**
 * Register all data models in CONFIG.
 */
export function registerDataModels()
{
    Object.assign(CONFIG.Actor.dataModels, {
        custos: CustosData,
        npc: NPCData,
        creature: CreatureData
    });
    Object.assign(CONFIG.Item.dataModels, {
        province: ProvinceData,
        meleeWeapon: MeleeWeaponData,
        rangedWeapon: RangedWeaponData,
        armor: ArmorData,
        shield: ShieldData,
        indigamentum: IndigamentumData,
        ritual: RitualData,
        talent: TalentData,
        specialAbility: SpecialAbilityData,
        magicalPower: MagicalPowerData
    });
}
