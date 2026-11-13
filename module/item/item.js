import {LexArcana} from '../config.js';

/**
 * Override and extend the basic :class:`Item` implementation
 */
export default class LexArcanaItem extends Item
{

    /* -------------------------------------------- */
    /*  Item Properties                             */
    /* -------------------------------------------- */

    /**
     * Does the Item implement an attack roll as part of its usage
     * @type {boolean}
     */
    get isWeapon()
    {
        return this.type === LexArcana.ItemType.meleeWeapon || this.type === LexArcana.ItemType.rangedWeapon;
    }

    /* -------------------------------------------- */

    /**
     * Is this item a versatile weapon
     * @type {boolean}
     */
    get isVersatile()
    {
        return !!(this.isWeapon && ["versatile"].includes(this.system.feat));
    }
}
