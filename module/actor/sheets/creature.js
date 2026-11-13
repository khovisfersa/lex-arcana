import LexArcanaNPCActorSheet from "./npc.js";
import { LexArcana } from '../../config.js';

/**
 * An Actor sheet for creature type actors.
 * Extends the LexArcanaNPCActorSheet class.
 * @type {LexArcanaNPCActorSheet}
 */
export default class LexArcanaCreatureActorSheet extends LexArcanaNPCActorSheet
{
	/** @override */
	static DEFAULT_OPTIONS = {
		classes: [LexArcana.ActorType.creature],
		position: {width: 720, height: 680}
	};

	/** @override */
	async _prepareContext(options)
	{
		const data = await super._prepareContext(options);
		const information = this.actor.system.information ?? {};
		data.enriched.degree1 = await this._enrich(information.degree1);
		data.enriched.degree2 = await this._enrich(information.degree2);
		data.enriched.degree3 = await this._enrich(information.degree3);
		return data;
	}
}
