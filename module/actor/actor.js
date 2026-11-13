import {LexArcana} from '../config.js';
import {LexArcanaDice} from '../dice.js';
import {LexArcanaUtils} from '../utils.js';

/**
 * Extend the base Actor class to implement additional system-specific logic.
 */
export default class LexArcanaActor extends Actor
{
    /* -------------------------------------------- */
    /*                  Accessors                   */
    /* -------------------------------------------- */

    /**
     * The province item of this actor, if any
     * @type {Item|null}
     */
    get province()
    {
        return this.items.find(i => i.type === LexArcana.ItemType.province) ?? null;
    }

	getPeritiaScore(_peritiaId)
	{
		const baseValue = Number(this.system.peritiae[_peritiaId].value);
		const province = this.province;
		const provinceValue = province !== null ? Number(province.system.peritiaeModifiers?.[_peritiaId]?.value ?? 0) : 0;
		return baseValue + provinceValue;
	}

    getSpecialty(peritiaId, speName)
    {
        return this.getSpecialties(peritiaId).find(item => item.name===speName);
    }
    getSpecialties(peritiaId)
    {
        let specialties = this.system.peritiae?.[peritiaId]?.specialties ?? [];
        return LexArcanaUtils.ObjectToArray(specialties);
    }
	getSpecialtyScore(_peritiaId, _specialtyId)
	{
        const specialty = this.getSpecialty(_peritiaId, _specialtyId);
        return this.getPeritiaScore(_peritiaId)+Number(specialty?.modifier ?? 0);
	}
	// --------------------------------------------
    getAbilities(diceClass)
    {
        let abilities = this.system[diceClass] ?? [];
        return LexArcanaUtils.ObjectToArray(abilities);
    }

    /* -------------------------------------------- */
    /*                  Manipulators                */
    /* -------------------------------------------- */
    async setVirtuteDefaultRoll(virtuteId, newExpression)
    {
        await this.update({[`system.virtutes.${virtuteId}.defaultRoll`]: newExpression });
    }
    async setPeritiaDefaultRoll(peritiaId, newExpression)
    {
        await this.update({[`system.peritiae.${peritiaId}.defaultRoll`]: newExpression });
    }
    async addPeritiaSpecialty(peritiaId, name, modifier)
    {
        const currentSpecialties = foundry.utils.deepClone(this.getSpecialties(peritiaId));
        await this.update({[`system.peritiae.${peritiaId}.specialties`]: [...currentSpecialties, { 'name':name, 'defaultRoll': '', 'modifier': modifier }] });
    }
    async removePeritiaSpecialty(peritiaId, key)
    {
        const currentSpecialties = foundry.utils.deepClone(this.getSpecialties(peritiaId)).filter(item => item.name!==key);
        await this.update({[`system.peritiae.${peritiaId}.specialties`]: [...currentSpecialties] });
    }
    async setPeritiaSpecialtyDefaultRoll(peritiaId, key, newExpression)
    {
        const currentSpecialties = foundry.utils.deepClone(this.getSpecialties(peritiaId));
        const idx = currentSpecialties.findIndex(item => item.name===key);
        if(currentSpecialties[idx]!==undefined)
        {
            currentSpecialties[idx].defaultRoll = newExpression;
            await this.update({[`system.peritiae.${peritiaId}.specialties`]: [...currentSpecialties] });
        }
    }

	// -----------------------------------------------------------------

    async addNPCAbility(_diceClass, _name)
    {
        const currentAbilities = foundry.utils.deepClone(this.getAbilities(_diceClass));
        await this.update({[`system.${_diceClass}`]: [...currentAbilities, _name] });
    }
    async removeNPCAbility(_diceClass, _abilityid)
    {
        const currentSpecialties = foundry.utils.deepClone(this.getAbilities(_diceClass)).filter((element, index) => element!==_abilityid);
        await this.update({[`system.${_diceClass}`]: [...currentSpecialties] });
    }

    /* -------------------------------------------- */
    /*                  Roll Dices                  */
    /* -------------------------------------------- */

	rollCustom(expression, _hasFateRoll, _difficultyThreshold = 6, info='')
	{
        return LexArcanaDice.RollExpression(expression, _difficultyThreshold, _hasFateRoll, info, this);
    }

    rollND(_numDice, _numFaces, _hasFateRoll, _difficultyThreshold = 6, _expressionType = LexArcanaDice.EXPRESSIONTYPE.BALANCED, _info='')
    {
        return LexArcanaDice.Roll(_numDice, _numFaces, _expressionType, _difficultyThreshold, _hasFateRoll, _info, this);
    }

	rollDeBello(_hasFateRoll, _specialtyName = '', _info = '')
	{
		const score = _specialtyName ? this.getSpecialtyScore('deBello', _specialtyName) : this.getPeritiaScore('deBello');
        return LexArcanaDice.RollFlat(Math.min(3, parseInt(score/6)+1), score, LexArcanaDice.EXPRESSIONTYPE.BALANCED, _hasFateRoll, _info, this);
	}

	async combatTurn()
	{
		const targetActor = Array.from(game.user.targets)[0]?.actor;
		if(!targetActor) return;
		const selfRoll = await this.rollDeBello(this.system.fateRoll, '');
		const otherRoll = await targetActor.rollDeBello(targetActor.system.fateRoll, '');
		const message =
		{
			speaker: ChatMessage.getSpeaker({actor: this}),
			content: '<div class="CombatAction"><h1>Combat</h1>'
		};
		message.content += '<p>Combat diff : ('+selfRoll.result+'-'+otherRoll.result+') = '+(selfRoll.result-otherRoll.result)+'</p>';
		message.content += '</div>';
		return ChatMessage.create(message);
	}
}
