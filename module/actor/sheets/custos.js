import LexArcanaActorSheet from "./base.js";
import { LexArcana } from '../../config.js';
import { LexArcanaUtils } from '../../utils.js';

/**
 * An Actor sheet for player character type actors.
 * Extends the base LexArcanaActorSheet class.
 * @type {LexArcanaActorSheet}
 */
export default class LexArcanaCustosActorSheet extends LexArcanaActorSheet
{
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: [LexArcana.ActorType.custos],
		position: {width: 720, height: 680},
		actions: {
			useIndigamentum: function(event, target) { return this._onIndigatamentaClick(event, target); }
		}
	};

	/** @override */
	async _prepareContext(options)
	{
		// Basic data
		const data = await super._prepareContext(options);
		// Iterate through items, allocating to containers
		data.items = [];
		data.indigamenta = [];
		data.rituals = [];
		data.talents = [];
		data.province = null;
		const experience = Number(this.actor.system.experience) || 0;
		for (let i of data.actor.items)
		{
			switch (i.type)
			{
				case 'province':
					data.province = i;
					break;
				case 'meleeWeapon':
				case 'rangedWeapon':
				case 'armor':
				case 'shield':
					data.items.push(i);
					break;
				case 'indigamentum':
					data.indigamenta.push(i);
					break;
				case 'ritual':
					data.rituals.push(i);
					break;
				case 'talent':
					data.talents.push(i);
					break;
				default:
					break;
			}
		}

        // Ability Scores
        for ( let [k, v] of Object.entries(data.actor.system.virtutes))
        {
            v.label = CONFIG.LexArcana.Virtutes[k];
        }
        for ( let [k, v] of Object.entries(data.actor.system.peritiae))
        {
            v.label = CONFIG.LexArcana.Peritia[k];
            v.baseValue = parseInt(v.value) || 0;
			v.provinceValue = data.province !== null ? (Number(data.province.system.peritiaeModifiers?.[k]?.value) || 0) : 0;
            v.finalValue = v.baseValue + v.provinceValue;
			v.total_exp = experience * v.exp_multiplier;
			v.remaining_exp = v.total_exp - v.spent_exp;
        }
		const system = data.actor.system;
		system.mosArcanorum.total_exp = experience * system.mosArcanorum.exp_multiplier;
		system.mosArcanorum.remaining_exp = system.mosArcanorum.total_exp - system.mosArcanorum.spent_exp;
		system.paxDeorum.total_exp = experience * system.paxDeorum.exp_multiplier;
		system.paxDeorum.remaining_exp = system.paxDeorum.total_exp - system.paxDeorum.spent_exp;

		data.itemClasses = LexArcanaUtils.getItemClasses(this.actor);
		data.itemClassChoices = data.itemClasses.reduce((obj, c) => { obj[c] = c; return obj; }, {});

		return data;
	}

	/* -------------------------------------------- */
	/*  Events
	/* -------------------------------------------- */

	async _onIndigatamentaClick(event, target)
	{
		event.preventDefault();
		const item = this._getItemFromTarget(target);
		if (!item) return;
		if (item.system.used){
			ui.notifications.error(game.i18n.localize('LexArcana.AlreadyUsedMessage'), {permanent: true});
			return;
		}
		let final_pietas=this.actor.system.attributes.pietas.value-item.system.cost
		if (final_pietas < 0){
			ui.notifications.error(game.i18n.localize('LexArcana.NotEnougPietas'), {permanent: true});
			return;
		}
		ui.notifications.info(game.i18n.localize('LexArcana.SpendPietas')+" "+item.system.cost+" Pietas.", {permanent: true});
		await this.actor.update ({ 'system.attributes.pietas.value': final_pietas });
		await item.update ({ 'system.used': true });
		let info=item.name+" ("+item.system.cost+" Pietas)"
		const message =
		{
			speaker: ChatMessage.getSpeaker({actor: this.actor}),
			content: '<div class="LexArcanaRoll"><h1>'+info+'</h1>'+item.system.description+'<hr>'+item.system.requirement+'</div>'
		};
		return ChatMessage.create(message);
	}

	/* -------------------------------------------- */
	/*  Overrides
	/* -------------------------------------------- */

	/** @override */
	async _onDropItem(event, item)
	{
		if(item?.type==='province' && this.actor.isOwner && item.parent?.uuid !== this.actor.uuid)
		{
			// Only one province per custos: remove the current one(s)
			const itemIds = this.actor.items.filter(i => i.type === 'province').map(i => i.id);
			if (itemIds.length) await this.actor.deleteEmbeddedDocuments('Item', itemIds);
		}
		return super._onDropItem(event, item);
	}
}
