import {System} from '../../config.js';
import { LexArcanaSheetMixin } from "../../sheets.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Override and extend the core ItemSheetV2 implementation to handle specific item types
 * @extends {ItemSheetV2}
 */
export default class LexArcanaItemSheet extends LexArcanaSheetMixin(HandlebarsApplicationMixin(ItemSheetV2))
{
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['LexArcana', 'sheet', 'item', 'themed', 'theme-light'],
        position: {width: 560, height: 400},
        window: {resizable: true},
        form: {submitOnChange: true, closeOnSubmit: false}
    };

    /** @override */
    static PARTS = {
        sheet: {template: ''}
    };

    /** @override */
    _configureRenderParts(options)
    {
        const parts = super._configureRenderParts(options);
        parts.sheet = {...parts.sheet, template: `${System.Path}/templates/items/${this.item.type}.html`, scrollable: ['.sheet-body']};
        return parts;
    }

    /** @override */
    async _prepareContext(options)
    {
        const context = await super._prepareContext(options);
        const item = this.item;
        Object.assign(context, {
            item: item.toObject(false),
            owner: item.isOwner,
            isGM: game.user.isGM,
            limited: item.limited,
            options: this.options,
            cssClass: this.isEditable ? 'editable' : 'locked',
            config: CONFIG.LexArcana,
            enriched: {
                description: await this._enrich(item.system.description),
                requirement: await this._enrich(item.system.requirement)
            }
        });
        context.object = context.item.system;
        return context;
    }
}
