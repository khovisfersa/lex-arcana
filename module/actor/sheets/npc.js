import LexArcanaActorSheet from "./base.js";
import { LexArcana } from '../../config.js';
import {LexArcanaDice} from '../../dice.js';

const { DialogV2 } = foundry.applications.api;

/**
 * An Actor sheet for NPC type actors.
 * Extends the base LexArcanaActorSheet class.
 * @type {LexArcanaActorSheet}
 */
export default class LexArcanaNPCActorSheet extends LexArcanaActorSheet
{
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: [LexArcana.ActorType.npc],
		position: {width: 720, height: 680},
		actions: {
			addAbility: function(event, target) { return this._onAddAbility(event, target); },
			deleteAbility: function(event, target) { return this._onDeleteAbility(event, target); }
		}
	};

	/** Item types which cannot be dropped on this sheet */
	static PROHIBITED_ITEM_TYPES = ["province", "indigamentum", "talent", "ritual"];

	/** @override */
	async _prepareContext(options)
	{
		// Basic data
		const data = await super._prepareContext(options);
		data.items = [];
		data.specialAbilities = [];
		data.magicalPowers = [];
		for (let i of data.actor.items)
		{
			switch (i.type)
			{
				case 'meleeWeapon':
				case 'rangedWeapon':
				case 'armor':
				case 'shield':
					data.items.push(i);
					break;
				case 'specialAbility':
					data.specialAbilities.push(i);
					break;
				case 'magicalPower':
					data.magicalPowers.push(i);
					break;
				default:
					break;
			}
		}
		return data;
	}

	/* -------------------------------------------- */
	/*                  Events                     */
	/* -------------------------------------------- */

    /**
     * Handle click on add ability buttons
     * @private
     */
    _onAddAbility(event, target)
    {
        event.preventDefault();
        return this.addAbility(target.dataset.diceclass);
    }

    /**
     * Handle click on delete ability buttons
     * @private
     */
	async _onDeleteAbility(event, target)
	{
		event.preventDefault();
		const dataSet = target.dataset;
		if (await this._confirm("LexArcana.ConfirmSpecialityDeletion"))
		{
			return this.actor.removeNPCAbility(dataSet.diceclass, dataSet.abilityid);
		}
	}

	/**
	 * Handle click on dialog abilities
	 * @private
	 */
	async _onRollDialog(event, target)
	{
		event.preventDefault();
		const dataSet = target.dataset;
		const diceClass = dataSet.diceclass;
		const rollname = dataSet.rollname ?? '';
		const actorName = dataSet.actorname ?? this.actor.name;
		const hasFateRoll = this.hasFateRoll();
		let numDice = 1;
		switch(diceClass)
		{
			case "twoDice": numDice+=1; break;
			case "threeDice": numDice+=2; break;
			case "oneDice":
			default:
			break;
		}
		const numFaces = numDice * (Number(this.actor.system.diceValue) || 0);
		const button = LexArcanaActorSheet._diceButton(numDice, numFaces, false);
		button.default = true;
		button.callback = (ev, btn) =>
		{
			if (LexArcanaDice.ComputeNumDices(numDice, numFaces) < numDice) return;
			const difficultyThreshold = parseInt(btn.form.elements['difficulty-threshold'].value) || 0;
			return this.actor.rollND(numDice, numFaces, hasFateRoll, difficultyThreshold, LexArcanaDice.EXPRESSIONTYPE.BALANCED, actorName+": "+rollname);
		};
		const htmlContent = `
							 <div class="form-group">
								 <label>${game.i18n.localize(CONFIG.LexArcana.RollDifficultyThreshold)}</label> <input type='number' name="difficulty-threshold" value="6"/>
							 </div>`;

		return LexArcanaActorSheet._rollDialog({
			window: {title: rollname || this.actor.name},
			content: htmlContent,
			buttons: [button]
		});
	}

	/* -------------------------------------------- */
	/*                  Dialogs                     */
	/* -------------------------------------------- */

	/**
	 * Prompt for adding an ability
	 * @param {String}diceClass     The class of dice (e.g. 'oneDice')
	 */
	async addAbility(_diceClass)
	{
		const name = await DialogV2.prompt({
			window: {title: game.i18n.format('LexArcana.AddAbilityPromptTitle', {peritiaName: game.i18n.localize(_diceClass)})},
			classes: ['LexArcana', 'themed', 'theme-light'],
			content: `<div class='form-group'><input type='text' name='ability-label' autofocus/></div>`,
			ok: {
				label: 'LexArcana.ActionAdd',
				callback: (event, button) => button.form.elements['ability-label'].value
			},
			rejectClose: false
		});
		if (name) return this.actor.addNPCAbility(_diceClass, name);
	}

	/* -------------------------------------------- */
	/*  Overrides
	/* -------------------------------------------- */

	/** @override */
	async _onDropItem(event, item)
	{
		if(this.constructor.PROHIBITED_ITEM_TYPES.includes(item?.type))
		{
			return null;
		}
		return super._onDropItem(event, item);
	}
}
