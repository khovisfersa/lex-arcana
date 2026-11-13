import {System} from '../../config.js';
import { LexArcanaDice } from "../../dice.js";
import { LexArcanaSheetMixin, escapeHTML } from "../../sheets.js";

const { HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Extend the ActorSheetV2 class to support system-specific logic and functionality.
 * This sheet is an Abstract layer which is not used directly.
 * @extends {ActorSheetV2}
 */
export default class LexArcanaActorSheet extends LexArcanaSheetMixin(HandlebarsApplicationMixin(ActorSheetV2))
{
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['LexArcana', 'sheet', 'actor', 'themed', 'theme-light'],
        position: {width: 720, height: 680},
        window: {resizable: true},
        form: {submitOnChange: true, closeOnSubmit: false},
        actions: {
            rollDialog: function(event, target) { return this._onRollDialog(event, target); },
            addSpecialty: function(event, target) { return this._onAddSpecialty(event, target); },
            deleteSpecialty: function(event, target) { return this._onDeleteSpecialty(event, target); },
            itemEdit: function(event, target) { return this._onEditClick(event, target); },
            itemDelete: function(event, target) { return this._onDeleteClick(event, target); },
            itemEquip: function(event, target) { return this._onEquipClick(event, target); },
            itemDrop: function(event, target) { return this._onDropClick(event, target); },
            damageRoll: function(event, target) { return this._onDamageRollClick(event, target); },
            armorRoll: function(event, target) { return this._onArmorRollClick(event, target); }
        }
    };

    /** @override */
    static PARTS = {
        sheet: {template: ''}
    };

    /** @override */
    _configureRenderParts(options)
    {
        const parts = super._configureRenderParts(options);
        let template = System.Path + `/templates/actors/${this.actor.type}-sheet.html`;
        if (!game.user.isGM && this.actor.limited) template = System.Path + "/templates/actors/limited-sheet.html";
        parts.sheet = {...parts.sheet, template, scrollable: ['.sheet-body']};
        return parts;
    }

    /** @override */
    async _prepareContext(options)
    {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        // A plain copy of the prepared actor data (including derived values such as encumbrance)
        const actorData = actor.toObject(false);
        actorData.items = actor.items.contents
            .slice()
            .sort((a, b) => (a.sort || 0) - (b.sort || 0))
            .map(i => i.toObject(false));
        Object.assign(context, {
            actor: actorData,
            owner: actor.isOwner,
            limited: actor.limited,
            options: this.options,
            cssClass: this.isEditable ? 'editable' : 'locked',
            isCharacter: !actor.system.attributes?.npc,
            isNPC: !!actor.system.attributes?.npc,
            isGM: game.user.isGM,
            config: CONFIG.LexArcana,
            enriched: {
                biography: await this._enrich(actor.system.biography)
            }
        });
        return context;
    }

	/* -------------------------------------------- */
	/*                 Accessors                    */
	/* -------------------------------------------- */

	hasFateRoll()
	{
		return !!this.actor.system.fateRoll;
	}

    /** Retrieve an owned item from the data-id (or data-item-id) of the clicked element */
    _getItemFromTarget(target)
    {
        const id = target.dataset.id ?? target.closest('[data-item-id]')?.dataset.itemId;
        return this.actor.items.get(id);
    }

    /* -------------------------------------------- */
    /*                  Dialogs                     */
    /* -------------------------------------------- */

    /**
     * Prompt for adding a specialty
     * @param {String}peritiaeId     The peritiae id (e.g. 'deBello')
     */
    async addPeritiaeSpecialty(peritiaeId)
    {
      const label = CONFIG.LexArcana.Peritia[peritiaeId];
      const htmlContent = `
        <div class='form grid-layout2'>
            <div class='grid-layout2-area1'>${game.i18n.localize('LexArcana.InputLabelName')}:&nbsp;<input type='text' name='specialty-label' autofocus/></div>
            <div class='grid-layout2-area2'>${game.i18n.localize('LexArcana.InputLabelModifier')}:&nbsp;<input type='number' name='specialty-modifier' value='0'/></div>
        </div>`;
      const result = await DialogV2.prompt({
        window: {title: game.i18n.format('LexArcana.AddPeritiaeSpecialtyPromptTitle', {peritiaName: game.i18n.localize(label)})},
        classes: ['LexArcana', 'themed', 'theme-light'],
        content: htmlContent,
        ok: {
          label: 'LexArcana.ActionAdd',
          callback: (event, button) => ({
            name: button.form.elements['specialty-label'].value,
            modifier: Number(button.form.elements['specialty-modifier'].value) || 0
          })
        },
        rejectClose: false
      });
      if (result?.name) return this.actor.addPeritiaSpecialty(peritiaeId, result.name, result.modifier);
    }

    /**
     * Ask a yes / no confirmation
     * @param {string} contentKey   The localization key of the question
     */
    async _confirm(contentKey)
    {
        return DialogV2.confirm({
            window: {title: game.i18n.localize("LexArcana.Confirm")},
            classes: ['LexArcana', 'themed', 'theme-light'],
            content: `<p>${game.i18n.localize(contentKey)}</p>`,
            rejectClose: false
        });
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Handle click on add Peritiae buttons
     * @private
     */
    _onAddSpecialty(event, target)
    {
        event.preventDefault();
        return this.addPeritiaeSpecialty(target.dataset.peritiaid);
    }

    /**
     * Handle click on delete Peritiae buttons
     * @private
     */
    async _onDeleteSpecialty(event, target)
    {
        event.preventDefault();
        const dataSet = target.dataset;
        if (await this._confirm("LexArcana.ConfirmSpecialityDeletion"))
        {
            return this.actor.removePeritiaSpecialty(dataSet.peritiaid, dataSet.specialtyid);
        }
    }

	_onEditClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		return item?.sheet.render(true);
	}

	async _onDeleteClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		if (!item) return;
		if (await this._confirm("LexArcana.ConfirmItemDeletion"))
		{
			return this.actor.deleteEmbeddedDocuments("Item", [item.id]);
		}
	}

	_onEquipClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		return item?.update({ 'system.active': !item.system.active, 'system.dropped': false });
	}

	_onDropClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		return item?.update({ 'system.dropped': !item.system.dropped, 'system.active': false });
	}

	_onDamageRollClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		if (!item) return;
		return LexArcanaDice.Roll(1, item.system.damage, LexArcanaDice.EXPRESSIONTYPE.BALANCED, 0, this.hasFateRoll(), item.name, this.actor);
	}

	_onArmorRollClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		if (!item) return;
		const actorName = target.dataset.actorname ?? this.actor.name;
		return LexArcanaDice.Roll(1, item.system.protection, LexArcanaDice.EXPRESSIONTYPE.BALANCED, 0, this.hasFateRoll(), actorName+": "+item.name, this.actor);
	}

    /* -------------------------------------------- */

    /**
     * Build the configuration of a 1d / 2d / 3d roll button for DialogV2
     * @param {number} _numDice
     * @param {number} _numFaces
     * @param {boolean} _showUnbalanced
     */
    static _diceButton(_numDice, _numFaces, _showUnbalanced = true)
    {
        const disabled = _numDice > 1 && LexArcanaDice.ComputeNumDices(_numDice, _numFaces) < _numDice;
        let tooltip = '';
        if (!disabled)
        {
            const balanced = LexArcanaDice.ComputeExpression(_numDice, _numFaces, LexArcanaDice.EXPRESSIONTYPE.BALANCED).expression;
            if (_numDice === 1) tooltip = `<p>${balanced}</p>`;
            else
            {
                tooltip = `<p>${game.i18n.localize(CONFIG.LexArcana.RollBalanced)} ${balanced}</p>`;
                if (_showUnbalanced)
                {
                    const unbalanced = LexArcanaDice.ComputeExpression(_numDice, _numFaces, LexArcanaDice.EXPRESSIONTYPE.UNBALANCED).expression;
                    tooltip += `<p>${game.i18n.localize(CONFIG.LexArcana.RollUnbalanced)} ${unbalanced}</p>`;
                }
            }
        }
        return {
            action: `roll${_numDice}d`,
            label: `${_numDice}D`,
            icon: `roll${_numDice}d-icon`,
            class: `lexarcana-dice-button${disabled ? ' disabled' : ''}`,
            disabled,
            tooltip
        };
    }

    /**
     * Render a roll dialog with tooltips on the dice buttons
     * @param {object} config   DialogV2 configuration
     */
    static async _rollDialog(config)
    {
        const tooltips = {};
        for (const b of config.buttons)
        {
            if (b.tooltip) tooltips[b.action] = b.tooltip;
            delete b.tooltip;
        }
        return DialogV2.wait({
            classes: ['LexArcana', 'lexarcana-roll-dialog', 'themed', 'theme-light'],
            position: {width: 400},
            rejectClose: false,
            render: (event, dialog) =>
            {
                const element = dialog.element ?? dialog;
                for (const [action, tooltip] of Object.entries(tooltips))
                {
                    const button = element.querySelector(`button[data-action="${action}"]`);
                    if (button) button.dataset.tooltip = tooltip;
                }
            },
            ...config
        });
    }

    /**
     * Handle click on dialog specialty or peritia
     * @param {Event} event   The triggering click event
     * @private
     */
    async _onRollDialog(event, target)
    {
        event.preventDefault();
        const dataSet = target.dataset;
        const actor = this.actor;
        const config = {};
		const hasFateRoll = this.hasFateRoll();
        const actorName = dataSet.actorname ?? actor.name;

        if(dataSet.virtuteid!==undefined)
        {
            const virtute = actor.system.virtutes[dataSet.virtuteid];
            config.title = game.i18n.localize(CONFIG.LexArcana.Virtutes[dataSet.virtuteid]);
            config.defaultRoll = virtute.defaultRoll || '1d6';
			config.numFaces = Number(virtute.value);
			config.callbackCustomRoll = (_expression) => actor.setVirtuteDefaultRoll(dataSet.virtuteid, _expression);
        }
        else if(dataSet.specialtyid!==undefined)
        {
            const peritiaNameLoc = game.i18n.localize(CONFIG.LexArcana.Peritia[dataSet.peritiaid]);
            const specialty = actor.getSpecialty(dataSet.peritiaid, dataSet.specialtyid);
            if (!specialty) return;
            config.defaultRoll = specialty.defaultRoll || "1d6";
            config.title = peritiaNameLoc+" :: "+specialty.name;
			config.numFaces = actor.getSpecialtyScore(dataSet.peritiaid, dataSet.specialtyid);
			config.callbackCustomRoll = (_expression) => actor.setPeritiaSpecialtyDefaultRoll(dataSet.peritiaid, dataSet.specialtyid, _expression);
        }
        else
        {
            const peritiaNameLoc = game.i18n.localize(CONFIG.LexArcana.Peritia[dataSet.peritiaid]);
            const peritia = actor.system.peritiae[dataSet.peritiaid];
            if (!peritia) return;
            config.defaultRoll = peritia.defaultRoll;
            config.title = peritiaNameLoc;
			config.numFaces = actor.getPeritiaScore(dataSet.peritiaid);
			config.callbackCustomRoll = (_expression) => actor.setPeritiaDefaultRoll(dataSet.peritiaid, _expression);
        }

		const readInputs = (form) => ({
			expressionType: form.elements['expression-type'].checked ? LexArcanaDice.EXPRESSIONTYPE.BALANCED : LexArcanaDice.EXPRESSIONTYPE.UNBALANCED,
			customExpression: String(form.elements['custom-roll'].value ?? '').trim(),
			difficultyThreshold: parseInt(form.elements['difficulty-threshold'].value) || 0
		});

        const expressionTypePrompt = game.i18n.localize('LexArcana.DiceExpressionBalancedPrompt');
        const htmlContent = `<div class="form-group">
                                <label>${expressionTypePrompt}</label> <input type='checkbox' name='expression-type'/>
                            </div>
                            <div class="form-group">
                                <label>${game.i18n.localize(CONFIG.LexArcana.RollCustomInput)}</label> <input type='text' name="custom-roll" value="${escapeHTML(config.defaultRoll ?? '')}"/>
                            </div>
                            <div class="form-group">
								<label>${game.i18n.localize(CONFIG.LexArcana.RollDifficultyThreshold)}</label> <input type='number' name="difficulty-threshold" value="6"/>
                            </div>`;

        const diceButtons = [1, 2, 3].map(n =>
        {
            const button = LexArcanaActorSheet._diceButton(n, config.numFaces);
            button.callback = (ev, btn) =>
            {
                if (LexArcanaDice.ComputeNumDices(n, config.numFaces) < n) return;
                const inputs = readInputs(btn.form);
                return actor.rollND(n, config.numFaces, hasFateRoll, inputs.difficultyThreshold, inputs.expressionType, actorName+": "+config.title);
            };
            return button;
        });

        return LexArcanaActorSheet._rollDialog({
            window: {title: config.title},
            content: htmlContent,
            buttons: [
                {
                    action: 'customroll',
                    label: 'LexArcana.RollCustomInput',
                    icon: 'rollcustom-icon',
                    class: 'lexarcana-dice-button',
                    callback: async (ev, btn) =>
                    {
                        const inputs = readInputs(btn.form);
                        await config.callbackCustomRoll(inputs.customExpression);
                        return actor.rollCustom(inputs.customExpression, hasFateRoll, inputs.difficultyThreshold, config.title);
                    }
                },
                ...diceButtons
            ]
        });
    }
}
