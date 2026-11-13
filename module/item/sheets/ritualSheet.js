import LexArcanaItemSheet from './base.js';

/**
 * Override and extend the core LexArcanaItemSheet implementation to handle specific item types
 * (rituals, indigamenta and talents)
 * @extends {LexArcanaItemSheet}
 */
export default class LexArcanaRitualSheet extends LexArcanaItemSheet
{
	/** @override */
	static DEFAULT_OPTIONS = {
		actions: {
			disciplineAdd: function(event, target) { return this._onDisciplineAdd(event, target); },
			disciplineDelete: function(event, target) { return this._onDisciplineDelete(event, target); }
		}
	};

	/** @override */
	async _prepareContext(options)
	{
		const context = await super._prepareContext(options);
		context.disciplineChoices = CONFIG.LexArcana.Disciplines;
		context.durationChoices = CONFIG.LexArcana.Durations;
		return context;
	}

	static toArray(data)
	{
		if (Array.isArray(data)) return data;
		return Object.values(data ?? {});
	}

	_onDisciplineAdd(event, target)
	{
		event.preventDefault();
		const disciplines = foundry.utils.deepClone(LexArcanaRitualSheet.toArray(this.item.system.disciplines));
		disciplines.push({name:'precognition', difficultyThreshold: 6});
		return this.item.update({ 'system.disciplines': disciplines });
	}

	_onDisciplineDelete(event, target)
	{
		event.preventDefault();
		const disciplines = foundry.utils.deepClone(LexArcanaRitualSheet.toArray(this.item.system.disciplines));
		disciplines.splice(Number(target.dataset.disciplineId), 1);
		return this.item.update({ 'system.disciplines': disciplines });
	}
}
